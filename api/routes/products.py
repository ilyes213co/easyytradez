"""
Routes /api/products — CRUD + réordonnancement
Auth JWT Supabase vérifiée sur chaque endpoint
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator, model_validator
from typing import Any
from enum import Enum

import logging
from dependencies import get_supabase, verify_token

router = APIRouter()
logger = logging.getLogger("storegen.products")

# ─── Schemas ──────────────────────────────────────────────────────────────────

class ProductStatus(str, Enum):
    ACTIVE   = "active"
    DRAFT    = "draft"
    ARCHIVED = "archived"


class ImageItem(BaseModel):
    url:       str
    public_id: Optional[str] = "img"
    width:     int = 0
    height:    int = 0


class ProductCreate(BaseModel):
    store_id:           str
    name:               Optional[str]   = None
    title:              Optional[str]   = None
    description:        Optional[str]   = None
    price:              float           = Field(..., gt=0)
    original_price:     Optional[float] = None
    category:           Optional[str]   = None
    stock_quantity:     int             = Field(default=0, ge=0)
    inventory_quantity: Optional[int]   = None
    position:           Optional[int]   = None
    images:             List[ImageItem] = Field(default_factory=list)
    is_featured:        bool            = False
    status:             ProductStatus   = ProductStatus.ACTIVE
    sku:                Optional[str]   = None
    variants:           List[dict]      = Field(default_factory=list)
    options:            List[dict]      = Field(default_factory=list)
    upsells:            List[dict]      = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("name") and data.get("title"):
                data["name"] = data["title"]
            if (data.get("stock_quantity") is None or data.get("stock_quantity") == 0) and data.get("inventory_quantity"):
                data["stock_quantity"] = data.get("inventory_quantity")
            raw_images = data.get("images")
            if isinstance(raw_images, list):
                normalized = []
                for item in raw_images:
                    if isinstance(item, str):
                        clean_url = item.strip()
                        if clean_url:
                            pid = clean_url.split("/")[-1].split("?")[0] or "img"
                            normalized.append({"url": clean_url, "public_id": pid})
                    elif isinstance(item, dict):
                        d = dict(item)
                        if not d.get("public_id") and d.get("url"):
                            d["public_id"] = str(d["url"]).split("/")[-1].split("?")[0] or "img"
                        normalized.append(d)
                    elif hasattr(item, "url"):
                        normalized.append(item)
                data["images"] = normalized
        return data


class ProductUpdate(BaseModel):
    name:           Optional[str]           = None
    description:    Optional[str]           = None
    price:          Optional[float]         = None
    original_price: Optional[float]         = None
    category:       Optional[str]           = None
    stock_quantity: Optional[int]           = None
    images:         Optional[List[ImageItem]] = None
    is_featured:    Optional[bool]          = None
    status:         Optional[ProductStatus] = None
    sku:            Optional[str]           = None
    variants:       Optional[List[dict]]    = None
    options:        Optional[List[dict]]    = None
    upsells:        Optional[List[dict]]    = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_images = data.get("images")
            if isinstance(raw_images, list):
                normalized = []
                for item in raw_images:
                    if isinstance(item, str):
                        clean_url = item.strip()
                        if clean_url:
                            pid = clean_url.split("/")[-1].split("?")[0] or "img"
                            normalized.append({"url": clean_url, "public_id": pid})
                    elif isinstance(item, dict):
                        d = dict(item)
                        if not d.get("public_id") and d.get("url"):
                            d["public_id"] = str(d["url"]).split("/")[-1].split("?")[0] or "img"
                        normalized.append(d)
                    elif hasattr(item, "url"):
                        normalized.append(item)
                data["images"] = normalized
        return data


class ReorderRequest(BaseModel):
    product_ids: List[str]


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def assert_store_owner(store_id: str, user_id: str):
    """Vérifie que l'utilisateur est bien propriétaire du store."""
    supabase = get_supabase()
    res = (
        supabase.table("stores")
        .select("owner_id")
        .eq("id", store_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    if res.data["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")


async def assert_product_owner(product_id: str, user_id: str) -> dict:
    """Vérifie que le produit appartient à une boutique de l'utilisateur."""
    supabase = get_supabase()
    res = (
        supabase.table("products")
        .select("*, stores(owner_id)")
        .eq("id", product_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if res.data["stores"]["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return res.data


# ─── GET /products?store_id=xxx ───────────────────────────────────────────────

@router.get("/")
async def list_products(
    store_id: str  = Query(..., description="ID de la boutique"),
    status:   Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search:   Optional[str] = Query(None),
    featured: Optional[bool] = Query(None),
    limit:    int = Query(20, ge=1, le=100),
    offset:   int = Query(0, ge=0),
    user_id:  str  = Depends(verify_token),
):
    """Retourne les produits d'une boutique avec filtres et pagination."""
    await assert_store_owner(store_id, user_id)

    supabase = get_supabase()
    query = (
        supabase.table("products")
        .select("*")
        .eq("store_id", store_id)
        .order("position", desc=False)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if category: query = query.eq("category", category)
    if featured is not None: query = query.eq("is_featured", featured)
    if search:   query = query.ilike("name", f"%{search}%")
    if status and status != "all":
        try:
            test_query = query.eq("status", status)
            res = test_query.execute()
        except Exception:
            res = query.execute()
    else:
        res = query.execute()

    items = res.data or []
    for item in items:
        if "status" not in item or not item.get("status"):
            item["status"] = "active"
    return items


# ─── POST /products ───────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_product(
    payload: ProductCreate,
    user_id: str = Depends(verify_token),
):
    """Crée un nouveau produit."""
    await assert_store_owner(payload.store_id, user_id)

    supabase = get_supabase()

    # Auto-position at end
    try:
        count_res = (
            supabase.table("products")
            .select("id", count="exact")
            .eq("store_id", payload.store_id)
            .execute()
        )
        position = count_res.count or 0
    except Exception:
        position = 0

    data = payload.dict()
    if not data.get("name") and data.get("title"):
        data["name"] = data["title"]
    data.pop("title", None)
    if not data.get("name"):
        data["name"] = "Produit sans titre"

    inv_qty = data.pop("inventory_quantity", None)
    current_stock = data.get("stock_quantity")
    if (current_stock is None or current_stock == 0) and inv_qty is not None:
        data["stock_quantity"] = inv_qty
    elif current_stock is None:
        data["stock_quantity"] = 0

    status_val = payload.status.value if hasattr(payload.status, "value") else str(payload.status)
    status_clean = str(status_val).lower().strip()
    if status_clean not in ("active", "draft", "archived"):
        status_clean = "active"
    data["status"] = status_clean

    data["images"] = [img.dict() if hasattr(img, "dict") else img for img in payload.images]
    data["position"] = position

    try:
        from db_resilience import safe_insert
        res = safe_insert("products", data, supabase)
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Error on product insert: {err_msg}")
        raise HTTPException(status_code=500, detail=f"Erreur Supabase: {err_msg}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la création du produit (data vide)")

    product = res.data[0]
    if "status" not in product or not product.get("status"):
        product["status"] = data["status"]
    return product


# ─── PATCH /products/:id ──────────────────────────────────────────────────────

# ─── PATCH /products/reorder ──────────────────────────────────────────────────

@router.patch("/reorder")
async def reorder_products(
    payload: ReorderRequest,
    user_id: str = Depends(verify_token),
):
    """Réordonne les produits en mettant à jour leur champ position."""
    if not payload.product_ids:
        raise HTTPException(status_code=400, detail="product_ids ne peut pas être vide")
    if len(payload.product_ids) != len(set(payload.product_ids)):
        seen: set[str] = set()
        for pid in payload.product_ids:
            if pid in seen:
                raise HTTPException(status_code=400, detail="product_ids contient des doublons")
            seen.add(pid)

    supabase = get_supabase()

    rows = (
        supabase.table("products")
        .select("store_id, stores(owner_id)")
        .in_("id", payload.product_ids)
        .execute()
    )
    products = rows.data or []
    if len(products) != len(payload.product_ids):
        raise HTTPException(status_code=404, detail="Un ou plusieurs produits sont introuvables")

    owners = set()
    for row in products:
        stores_data = row.get("stores")
        if isinstance(stores_data, dict) and stores_data.get("owner_id"):
            owners.add(stores_data["owner_id"])
        elif isinstance(stores_data, list) and stores_data and stores_data[0].get("owner_id"):
            owners.add(stores_data[0]["owner_id"])
    if owners != {user_id}:
        raise HTTPException(status_code=403, detail="Accès refusé")

    stores = {row["store_id"] for row in products}
    if len(stores) != 1:
        raise HTTPException(status_code=400, detail="Tous les produits doivent appartenir à la même boutique")

    # Batch update positions
    for idx, pid in enumerate(payload.product_ids):
        (
            supabase.table("products")
            .update({"position": idx, "updated_at": datetime.utcnow().isoformat()})
            .eq("id", pid)
            .execute()
        )

    return {"updated": len(payload.product_ids)}


# ─── PATCH & PUT /products/:id ────────────────────────────────────────────────

@router.patch("/{product_id}")
@router.put("/{product_id}")
async def update_product(
    product_id: str,
    payload:    ProductUpdate,
    user_id:    str = Depends(verify_token),
):
    """Met à jour un produit (champs partiels acceptés via PATCH ou PUT)."""
    await assert_product_owner(product_id, user_id)

    supabase = get_supabase()
    data = {k: v for k, v in payload.dict().items() if v is not None}

    if "images" in data:
        data["images"] = [img if isinstance(img, dict) else img.dict() for img in data["images"]]

    if not data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    data["updated_at"] = datetime.utcnow().isoformat()

    try:
        from db_resilience import safe_update
        res = safe_update("products", data, "id", product_id, supabase)
    except Exception as e:
        err_msg = str(e)
        if "status" in err_msg and "status" in data:
            data.pop("status", None)
            if not data or list(data.keys()) == ["updated_at"]:
                status_val = payload.status.value if hasattr(payload.status, "value") else str(payload.status)
                return {"id": product_id, "status": status_val or "active"}
            from db_resilience import safe_update
            res = safe_update("products", data, "id", product_id, supabase)
        else:
            raise HTTPException(status_code=500, detail=f"Erreur Supabase: {err_msg}")

    if not res or not res.data:
        raise HTTPException(status_code=500, detail="Erreur mise à jour")

    product = res.data[0]
    if "status" not in product or not product.get("status"):
        status_val = payload.status.value if hasattr(payload.status, "value") else str(payload.status)
        product["status"] = status_val or "active"
    return product


# ─── DELETE /products/:id ─────────────────────────────────────────────────────

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    user_id:    str = Depends(verify_token),
):
    """Supprime un produit et ses images Cloudinary."""
    product = await assert_product_owner(product_id, user_id)

    supabase = get_supabase()

    # 1. Delete from Supabase
    res = supabase.table("products").delete().eq("id", product_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")

    # 2. Delete images from Cloudinary (cascade)
    # We use the Cloudinary API directly from the upload service logic or via a helper
    import cloudinary.uploader
    for img in product.get("images", []):
        try:
            public_id = img.get("public_id")
            if public_id:
                result = cloudinary.uploader.destroy(public_id)
                if result.get("result") != "ok":
                    logger.warning(f"Cloudinary delete failed for {public_id}: {result.get('result')}")
        except Exception as e:
            logger.error(f"Error deleting image from Cloudinary {img.get('public_id')}: {e}")

    return {"success": True, "id": product_id}


# ─── GET /products/:id/public (vitrine, pas d'auth) ──────────────────────────

@router.get("/{product_id}/public")
async def get_product_public(product_id: str):
    """Retourne les infos publiques d'un produit (pour la vitrine)."""
    supabase = get_supabase()
    res = (
        supabase.table("products")
        .select("*, stores(name, slug, primary_color, whatsapp_phone, currency)")
        .eq("id", product_id)
        .eq("status", "active")
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return res.data
