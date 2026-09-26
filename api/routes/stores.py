from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user, get_supabase, check_store_owner
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
        "custom_domain": payload.custom_domain,
        "facebook_pixel_id": payload.facebook_pixel_id,
        "tiktok_pixel_id": payload.tiktok_pixel_id,
        "payment_settings": payload.payment_settings or {
            "cod_enabled": True,
            "baridimob_enabled": False,
            "baridimob_rip": "",
            "baridimob_name": "",
            "stripe_enabled": False,
        },
    }

    try:
        from db_resilience import safe_insert
        result = await run_query(
            lambda: safe_insert("stores", store_data, supabase),
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
    # Vérifier ownership via shared guard
    await check_store_owner(store_id, user.id)

    update_data = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }

    from db_resilience import safe_update
    result = safe_update("stores", update_data, "id", store_id, supabase)
    if not result or not result.data:
        # If no fields changed or empty update
        store_res = supabase.table("stores").select("*").eq("id", store_id).single().execute()
        return store_res.data
    return result.data[0]


@router.delete("/{store_id}")
async def delete_store(
    store_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    # Vérifier ownership via shared guard
    await check_store_owner(store_id, user.id)

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
