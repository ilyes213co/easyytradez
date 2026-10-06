from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
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

    store_type = getattr(payload, "type", None) or "boutique"
    raw_seo = getattr(payload, "seo_metadata", None)
    seo_metadata = dict(raw_seo) if isinstance(raw_seo, dict) else {}
    seo_metadata["type"] = store_type

    store_data = {
        "owner_id": user_id,
        "name": payload.name,
        "slug": slug,
        "description": payload.description,
        "primary_color": payload.primary_color or "#6366f1",
        "whatsapp_phone": payload.whatsapp_phone,
        "theme": payload.theme or "modern",
        "animation_style": payload.animation_style or "soft",
        "type": store_type,
        "status": "draft",
        "category": payload.category,
        "font_family": payload.font_family or "modern",
        "logo_url": payload.logo_url,
        "custom_domain": payload.custom_domain,
        "facebook_pixel_id": payload.facebook_pixel_id,
        "tiktok_pixel_id": payload.tiktok_pixel_id,
        "seo_metadata": seo_metadata,
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

        created_store = result.data[0]
        if not created_store.get("type"):
            created_store["type"] = store_type
        logger.info(f"Store created: {slug} (type: {created_store.get('type')}) for user {user_id}")
        return created_store

    except HTTPException:
        raise  # laisser passer les HTTPException déjà construites

    except Exception as e:
        error_str = str(e)
        logger.error(f"Unexpected error creating store: {error_str}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {error_str}")


@router.get("/", response_model=list[StoreResponse])
async def list_stores(
    type: Optional[Literal["boutique", "funnel"]] = None,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    def resolve_type(s: dict) -> str:
        return s.get("type") or (s.get("seo_metadata") or {}).get("type") or "boutique"

    try:
        query = (
            supabase.table("stores")
            .select("*")
            .eq("owner_id", user.id)
        )
        if type:
            query = query.eq("type", type)
        result = query.order("created_at", desc=True).execute()
        stores = result.data or []
        for s in stores:
            s["type"] = resolve_type(s)
        if type:
            stores = [s for s in stores if s.get("type") == type]
        return stores
    except Exception as exc:
        err_msg = str(exc)
        logger.warning(
            f"list_stores direct query error: {err_msg}, falling back to query without type column filter"
        )
        try:
            result = (
                supabase.table("stores")
                .select("*")
                .eq("owner_id", user.id)
                .order("created_at", desc=True)
                .execute()
            )
            stores = result.data or []
            for s in stores:
                s["type"] = resolve_type(s)
            if type:
                stores = [s for s in stores if s.get("type") == type]
            return stores
        except Exception as e2:
            logger.error(f"Fallback list_stores error: {e2}")
            raise HTTPException(status_code=500, detail=f"Erreur Supabase: {e2}")


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

    if "type" in update_data:
        try:
            existing = (
                supabase.table("stores")
                .select("seo_metadata")
                .eq("id", store_id)
                .single()
                .execute()
            )
            current_meta = (existing.data or {}).get("seo_metadata") or {}
            if not isinstance(current_meta, dict):
                current_meta = {}
            current_meta["type"] = update_data["type"]
            update_data["seo_metadata"] = current_meta
        except Exception as e:
            logger.warning(f"Could not sync type to seo_metadata: {e}")

    from db_resilience import safe_update
    result = safe_update("stores", update_data, "id", store_id, supabase)
    if not result or not result.data:
        # If no fields changed or empty update
        store_res = supabase.table("stores").select("*").eq("id", store_id).single().execute()
        res_store = store_res.data or {}
    else:
        res_store = result.data[0]

    if not res_store.get("type"):
        res_store["type"] = (res_store.get("seo_metadata") or {}).get("type") or "boutique"
    return res_store


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


class ThemeUpdate(BaseModel):
    theme: str

ALLOWED_THEMES = {
    'monochrome', 'blossom-lavender', 'phantom', 'playful-pumpkin', 'crimson',
    'natural', 'energetic', 'tuareg-indigo', 'neo-brutalist', 'luxe-noir'
}

@router.patch("/{store_id}/theme")
async def update_store_theme(
    store_id: str,
    payload: ThemeUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Met à jour le thème visuel d'une boutique (découplé des produits/catégories)."""
    await check_store_owner(store_id, user.id)
    theme = payload.theme.strip().lower()
    if theme not in ALLOWED_THEMES:
        raise HTTPException(
            status_code=400,
            detail=f"Thème '{payload.theme}' invalide. Thèmes autorisés: {', '.join(sorted(ALLOWED_THEMES))}"
        )

    res = supabase.table("stores").update({"theme": theme}).eq("id", store_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Impossible de mettre à jour le thème de la boutique")

    return {"message": "Thème mis à jour avec succès", "theme": theme, "store": res.data[0]}


class ContentPatchRequest(BaseModel):
    content_overrides: Dict[str, Any]


@router.patch("/{store_id}/content")
async def patch_store_content(
    store_id: str,
    payload: ContentPatchRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Met à jour atomiquement les surcharges de contenu (content_overrides).
    - Vérifie que l'utilisateur connecté est le propriétaire (check_store_owner).
    - Fusionne les champs JSONB (coalesce + ||) sans écraser les clés non mentionnées.
    - Supprime les clés dont la valeur envoyée est null (restauration de la valeur template).
    """
    await check_store_owner(store_id, user.id)

    patches = payload.content_overrides
    if not isinstance(patches, dict):
        raise HTTPException(
            status_code=400,
            detail="content_overrides doit être un objet JSON clé-valeur",
        )

    # 1. Tentative d'exécution atomique native PostgreSQL via la fonction RPC
    try:
        rpc_result = (
            supabase.rpc(
                "patch_store_content_overrides",
                {
                    "p_store_id": store_id,
                    "p_patches": patches,
                },
            )
            .execute()
        )
        if rpc_result.data is not None:
            return {
                "message": "Contenu mis à jour avec succès",
                "content_overrides": rpc_result.data,
            }
    except Exception as rpc_err:
        logger.warning(
            "RPC patch_store_content_overrides non disponible ou erreur (%s), fallback direct.",
            rpc_err,
        )

    # 2. Fallback direct (au cas où la RPC ne serait pas joignable)
    existing = (
        supabase.table("stores")
        .select("content_overrides")
        .eq("id", store_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")

    current_data = existing.data.get("content_overrides") or {}
    if not isinstance(current_data, dict):
        current_data = {}

    for key, val in patches.items():
        if val is None:
            current_data.pop(key, None)
        else:
            current_data[key] = val

    update_res = (
        supabase.table("stores")
        .update({"content_overrides": current_data})
        .eq("id", store_id)
        .execute()
    )
    if not update_res.data:
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la sauvegarde des modifications",
        )

    return {
        "message": "Contenu mis à jour avec succès",
        "content_overrides": update_res.data[0].get("content_overrides", {}),
    }



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
    store = result.data
    if not store.get("type"):
        store["type"] = (store.get("seo_metadata") or {}).get("type") or "boutique"
    return store


# ─── Shipping Rates (Tarifs de livraison personnalisés par boutique) ─────────

class ShippingRateUpdateRequest(BaseModel):
    price_home: Optional[int] = Field(None, ge=0, le=100000, description="Tarif livraison à domicile en DZD (>= 0)")
    price_desk: Optional[int] = Field(None, ge=0, le=100000, description="Tarif stop desk en DZD (>= 0)")


class ShippingRatesBulkUpdateRequest(BaseModel):
    price_home: Optional[int] = Field(None, ge=0, le=100000, description="Tarif global domicile à appliquer aux 58 wilayas")
    price_desk: Optional[int] = Field(None, ge=0, le=100000, description="Tarif global stop desk à appliquer aux 58 wilayas")


@router.get("/{store_id}/shipping-rates")
async def get_store_shipping_rates(
    store_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Retourne la liste des 58 tarifs de livraison pour la boutique spécifiée,
    avec le nom et code de chaque wilaya.
    """
    await check_store_owner(store_id, user.id)

    res = (
        supabase.table("shipping_rates")
        .select("store_id, wilaya_id, price_home, price_desk, eta, updated_at, wilayas(id, name)")
        .eq("store_id", store_id)
        .order("wilaya_id")
        .execute()
    )

    rates = []
    for r in (res.data or []):
        w_data = r.get("wilayas") or {}
        w_id = r["wilaya_id"]
        rates.append({
            "wilaya_id": w_id,
            "code": f"{w_id:02d}",
            "name": w_data.get("name") or f"Wilaya {w_id}",
            "price_home": r.get("price_home", 0),
            "price_desk": r.get("price_desk", 0),
            "eta": r.get("eta") or "2-4 j",
            "updated_at": r.get("updated_at"),
        })

    return rates


@router.patch("/{store_id}/shipping-rates/bulk")
async def update_store_shipping_rates_bulk(
    store_id: str,
    payload: ShippingRatesBulkUpdateRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Met à jour en masse les tarifs de TOUTES les wilayas d'une boutique en une seule requête SQL.
    - Couche 1 : Vérifie ownership (assert_store_owner)
    - Couche 2 : Protégé par RLS Postgres
    """
    await check_store_owner(store_id, user.id)

    update_fields = {}
    if payload.price_home is not None:
        update_fields["price_home"] = payload.price_home
    if payload.price_desk is not None:
        update_fields["price_desk"] = payload.price_desk

    if not update_fields:
        raise HTTPException(
            status_code=400,
            detail="Au moins un champ (price_home ou price_desk) doit être spécifié pour la mise à jour globale.",
        )

    from datetime import datetime, timezone
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = (
        supabase.table("shipping_rates")
        .update(update_fields)
        .eq("store_id", store_id)
        .execute()
    )

    rows_updated = len(res.data) if res.data else 0
    logger.info("Bulk shipping rates updated for store %s: %d rows updated with %s", store_id, rows_updated, update_fields)

    return {
        "message": f"Tarifs de livraison mis à jour avec succès pour {rows_updated} wilayas.",
        "rows_updated": rows_updated,
        "applied_rates": update_fields,
    }


@router.patch("/{store_id}/shipping-rates/{wilaya_id}")
async def update_store_shipping_rate(
    store_id: str,
    wilaya_id: int,
    payload: ShippingRateUpdateRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """
    Met à jour les tarifs de livraison d'une seule wilaya pour une boutique donnée.
    - Couche 1 : Vérifie ownership (assert_store_owner)
    - Couche 2 : Protégé par RLS Postgres
    """
    await check_store_owner(store_id, user.id)

    if wilaya_id < 1 or wilaya_id > 58:
        raise HTTPException(status_code=400, detail="Le numéro de wilaya doit être compris entre 1 et 58.")

    update_fields = {}
    if payload.price_home is not None:
        update_fields["price_home"] = payload.price_home
    if payload.price_desk is not None:
        update_fields["price_desk"] = payload.price_desk

    if not update_fields:
        raise HTTPException(
            status_code=400,
            detail="Au moins un champ (price_home ou price_desk) doit être spécifié.",
        )

    from datetime import datetime, timezone
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = (
        supabase.table("shipping_rates")
        .update(update_fields)
        .eq("store_id", store_id)
        .eq("wilaya_id", wilaya_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail=f"Ligne tarifaire introuvable pour la wilaya {wilaya_id} de cette boutique.",
        )

    logger.info("Shipping rate updated for store %s wilaya %d: %s", store_id, wilaya_id, update_fields)
    return {
        "message": f"Tarif mis à jour pour la wilaya {wilaya_id}.",
        "rate": res.data[0],
    }
