from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user, get_supabase
from models.schemas import StoreCreate, StoreUpdate, StoreResponse
import re
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger("storegen.stores")


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


@router.post("/", response_model=StoreResponse)
async def create_store(
    payload: StoreCreate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    user_id = user.id
    async def run_query(executor, timeout_seconds: int = 20):
        try:
            return await asyncio.wait_for(asyncio.to_thread(executor), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail="Timeout serveur lors de la communication avec la base de données.",
            )

    base_slug = slugify(payload.name)
    slug = base_slug
    counter = 1
    while True:
        existing = await run_query(
            lambda: (
                supabase.table("stores")
                .select("id")
                .eq("slug", slug)
                .execute()
            ),
            timeout_seconds=15,
        )
        if not existing.data:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    store_data = {
        "owner_id": user_id,
        "name": payload.name,
        "slug": slug,
        "description": payload.description,
        "primary_color": payload.primary_color or "#6366f1",
        "whatsapp_phone": payload.whatsapp_phone,
        "theme": payload.theme or "modern",
        "animation_style": payload.animation_style or "soft",
        "status": "draft",
        "category": payload.category,
        "font_family": payload.font_family or "modern",
        "logo_url": payload.logo_url,
    }

    try:
        result = await run_query(
            lambda: supabase.table("stores").insert(store_data).execute(),
            timeout_seconds=30,
        )

        if hasattr(result, "error") and result.error:
            error_msg = result.error.get("message", "") if isinstance(result.error, dict) else str(result.error)
            logger.error(f"Supabase error creating store: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Erreur Supabase: {error_msg}")

        if not result.data:
            logger.error("Supabase returned empty data for insert")
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la boutique (data vide)")

        logger.info(f"Store created: {slug} for user {user_id}")
        return result.data[0]

    except HTTPException:
        raise  # laisser passer les HTTPException déjà construites

    except Exception as e:
        error_str = str(e)
        logger.error(f"Unexpected error creating store: {error_str}")
        if any(kw in error_str.lower() for kw in ["gratuit", "limité", "1 boutique", "p0001", "plan_limit"]):
            existing_store_id = None
            try:
                existing_store = (
                    supabase.table("stores")
                    .select("id")
                    .eq("owner_id", user_id)
                    .order("created_at")
                    .limit(1)
                    .execute()
                )
                if existing_store.data and len(existing_store.data) > 0:
                    existing_store_id = existing_store.data[0].get("id")
            except Exception:
                existing_store_id = None
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "STORE_QUOTA_EXCEEDED",
                    "message": "Votre plan gratuit est limité à 1 boutique. Passez au plan Pro pour en créer davantage.",
                    "existing_store_id": existing_store_id,
                }
            )
        raise HTTPException(status_code=500, detail=f"Erreur interne: {error_str}")


@router.get("/", response_model=list[StoreResponse])
async def list_stores(
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("stores")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []

@router.patch("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: str,
    payload: StoreUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Vérifier ownership
    existing = (
        supabase.table("stores")
        .select("id")
        .eq("id", store_id)
        .eq("owner_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")

    update_data = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }

    result = (
        supabase.table("stores")
        .update(update_data)
        .eq("id", store_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour")
    return result.data[0]


@router.delete("/{store_id}")
async def delete_store(
    store_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    existing = (
        supabase.table("stores")
        .select("id")
        .eq("id", store_id)
        .eq("owner_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")

    supabase.table("stores").delete().eq("id", store_id).execute()
    return {"message": "Boutique supprimée"}


# Route publique pour la vitrine (sans auth)
@router.get("/public/{slug}")
async def get_store_public(slug: str, supabase=Depends(get_supabase)):
    result = (
        supabase.table("stores")
        .select("*, products(*)")
        .eq("slug", slug)
        .eq("status", "published")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    return result.data


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    result = (
        supabase.table("stores")
        .select("*")
        .eq("id", store_id)
        .eq("owner_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    return result.data
