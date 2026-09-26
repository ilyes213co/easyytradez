"""
Routes /api/upload — Upload d'images vers Cloudinary
"""

import os
import io
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from PIL import Image as PILImage

from dependencies import verify_token, get_supabase

router = APIRouter()

# ─── Cloudinary config ────────────────────────────────────────────────────────

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True,
)

# The CLOUDINARY_UPLOAD_PRESET env var (in .env.local) is auto-loaded by the SDK
# and would be sent with every upload, causing "Upload preset not found" errors
# if the preset doesn't exist on the account. We don't use presets, so clear it.
try:
    cloudinary.config().upload_preset = None
except Exception:
    pass

# ─── Constants ────────────────────────────────────────────────────────────────

MAX_FILE_SIZE  = 10 * 1024 * 1024   # 10 MB
MAX_DIMENSION  = 1200               # px
WEBP_QUALITY   = 80
ALLOWED_TYPES  = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def compress_image(data: bytes, max_dim: int = MAX_DIMENSION, quality: int = WEBP_QUALITY) -> tuple[bytes, int, int]:
    """
    Redimensionne et compresse une image en WebP.
    Retourne (bytes, width, height).
    """
    img = PILImage.open(io.BytesIO(data))

    # Convert to RGB if necessary (e.g., PNG with alpha)
    if img.mode in ("RGBA", "P"):
        background = PILImage.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Resize if too large
    w, h = img.size
    if w > max_dim or h > max_dim:
        if w > h:
            new_w, new_h = max_dim, int(h * max_dim / w)
        else:
            new_w, new_h = int(w * max_dim / h), max_dim
        img = img.resize((new_w, new_h), PILImage.LANCZOS)

    final_w, final_h = img.size

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality, optimize=True)
    buf.seek(0)
    return buf.read(), final_w, final_h


def assert_store_owner(store_id: str, user_id: str) -> None:
    supabase = get_supabase()
    result = (
        supabase.table("stores")
        .select("owner_id")
        .eq("id", store_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    if result.data["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")


# ─── POST /upload/image ───────────────────────────────────────────────────────

@router.post("/image")
async def upload_image(
    file:     UploadFile = File(...),
    store_id: str        = Form(...),
    user_id:  str        = Depends(verify_token),
):
    """
    Upload une image vers Cloudinary.
    - Valide le type et la taille
    - Compresse (WebP, quality 80, max 1200px)
    - Retourne : url, public_id, width, height
    """

    assert_store_owner(store_id, user_id)

    # ── Validate ─────────────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Type de fichier non supporté : {file.content_type}. Utilisez JPG, PNG ou WEBP."
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({len(raw) // (1024*1024)} Mo). Maximum : 10 Mo."
        )

    # ── Compress ─────────────────────────────────────────────────────────────
    try:
        compressed, width, height = compress_image(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Impossible de traiter l'image : {str(e)}")

    # ── Upload to Cloudinary ──────────────────────────────────────────────────
    folder = f"marchand/{store_id}/products"
    try:
        file_obj = io.BytesIO(compressed)
        file_obj.name = "upload.webp"
        result = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type="image",
            transformation=[
                {'width': 1200, 'height': 1200, 'crop': "limit"},
                {'quality': "auto:good"}
            ],
            format="webp",
            overwrite=False,
            tags=[store_id, "product"],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur Cloudinary : {str(e)}")

    return JSONResponse(
        status_code=200,
        content={
            "url":       result["secure_url"],
            "public_id": result["public_id"],
            "width":     result.get("width",  width),
            "height":    result.get("height", height),
            "format":    result.get("format", "webp"),
            "bytes":     result.get("bytes",  len(compressed)),
        }
    )


# ─── DELETE /upload/image/:public_id ─────────────────────────────────────────

@router.delete("/image")
async def delete_image(
    public_id: str,
    user_id:   str = Depends(verify_token),
):
    """
    Supprime une image de Cloudinary par son public_id.
    Vérifie que le public_id appartient au dossier 'marchand/'.
    """
    # Security: only allow deletion within the marchand/ namespace
    if not public_id.startswith("marchand/"):
        raise HTTPException(status_code=403, detail="Accès refusé")
    parts = public_id.split("/")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="public_id invalide")
    store_id = parts[1]
    assert_store_owner(store_id, user_id)

    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur Cloudinary : {str(e)}")

    if result.get("result") != "ok":
        raise HTTPException(status_code=404, detail="Image introuvable dans Cloudinary")

    return {"deleted": public_id}


# ─── POST /upload/logo ────────────────────────────────────────────────────────

@router.post("/logo")
async def upload_logo(
    file:     UploadFile = File(...),
    store_id: str        = Form(...),
    user_id:  str        = Depends(verify_token),
):
    """
    Upload le logo d'une boutique (compressé à 400x400 max, PNG conservé).
    """
    assert_store_owner(store_id, user_id)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Type de fichier non supporté")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux")

    try:
        compressed, width, height = compress_image(raw, max_dim=400, quality=90)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        file_obj = io.BytesIO(compressed)
        file_obj.name = "logo.webp"
        result = cloudinary.uploader.upload(
            file_obj,
            public_id     = f"marchand/{store_id}/logo",
            resource_type = "image",
            format        = "webp",
            overwrite     = True,
            tags          = [store_id, "logo"],
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "url":       result["secure_url"],
        "public_id": result["public_id"],
        "width":     result.get("width",  width),
        "height":    result.get("height", height),
    }
