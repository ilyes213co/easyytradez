"""
Module centralisé de contrôle des quotas et restrictions par plan (Feature Gating).
EasyTrade SaaS — Plans : Gratuit (Free), Pro, Business.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from typing import Literal, Optional, Set, Dict, Any
from fastapi import HTTPException
from dependencies import get_supabase

logger = logging.getLogger("storegen.plan_guard")

# Thèmes standards disponibles sur le plan Gratuit
FREE_THEMES: Set[str] = {
    "monochrome",
    "blossom-lavender",
    "crimson",
    "natural",
    "modern",      # alias rétrocompatible
    "minimalist",  # alias rétrocompatible
}

# Tous les thèmes autorisés dans la plateforme
ALL_THEMES: Set[str] = {
    "monochrome",
    "blossom-lavender",
    "phantom",
    "playful-pumpkin",
    "crimson",
    "natural",
    "energetic",
    "tuareg-indigo",
    "neo-brutalist",
    "luxe-noir",
    "modern",
    "luxury",
    "vibrant",
    "minimalist",
}


class PlanLimitException(HTTPException):
    """
    Exception levée lorsqu'une limite ou restriction de plan est enfreinte.
    Renvoie un code 403 avec un format JSON standardisé:
    {
        "detail": "PLAN_LIMIT_REACHED",
        "code": "PLAN_LIMIT_REACHED",
        "message": "...",
        "limit_type": "...",
        "current": ...,
        "limit": ...
    }
    """
    def __init__(
        self,
        message: str,
        limit_type: str = "general",
        current: int = 0,
        limit: int = 0,
    ):
        self.message = message
        self.limit_type = limit_type
        self.current = current
        self.limit = limit
        super().__init__(
            status_code=403,
            detail={
                "detail": "PLAN_LIMIT_REACHED",
                "code": "PLAN_LIMIT_REACHED",
                "message": message,
                "limit_type": limit_type,
                "current": current,
                "limit": limit,
            },
        )


@dataclass(frozen=True)
class PlanLimits:
    plan: Literal["free", "pro", "business"]
    plan_name: str
    stores_limit: int           # 1 pour free, 5 pour pro, -1 pour business (illimité)
    products_limit: int         # 10 pour free, -1 pour pro/business (illimité)
    can_use_team: bool          # uniquement business
    can_use_custom_domain: bool # pro & business
    can_use_ai_unlimited: bool  # pro & business (free = 1 essai)
    can_use_bulk_shipping: bool # pro & business (free = wilaya par wilaya uniquement)
    can_use_all_themes: bool    # pro & business (free = FREE_THEMES uniquement)


PLAN_CONFIGS: Dict[str, PlanLimits] = {
    "free": PlanLimits(
        plan="free",
        plan_name="Gratuit",
        stores_limit=1,
        products_limit=10,
        can_use_team=False,
        can_use_custom_domain=False,
        can_use_ai_unlimited=False,
        can_use_bulk_shipping=False,
        can_use_all_themes=False,
    ),
    "pro": PlanLimits(
        plan="pro",
        plan_name="Pro",
        stores_limit=5,
        products_limit=-1,
        can_use_team=False,
        can_use_custom_domain=True,
        can_use_ai_unlimited=True,
        can_use_bulk_shipping=True,
        can_use_all_themes=True,
    ),
    "business": PlanLimits(
        plan="business",
        plan_name="Business",
        stores_limit=-1,
        products_limit=-1,
        can_use_team=True,
        can_use_custom_domain=True,
        can_use_ai_unlimited=True,
        can_use_bulk_shipping=True,
        can_use_all_themes=True,
    ),
}


def parse_expiry_date(expires_at: Optional[str]) -> Optional[datetime]:
    """Parse une date ISO avec support de 'Z' ou sans fuseau."""
    if not expires_at:
        return None
    try:
        clean_str = str(expires_at).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception as e:
        logger.warning(f"Could not parse expiry date '{expires_at}': {e}")
        return None


def get_effective_plan(
    plan: Optional[str],
    plan_expires_at: Optional[str] = None,
) -> PlanLimits:
    """
    Détermine le plan effectif.
    Si le plan est Pro ou Business mais que plan_expires_at est dans le passé,
    l'utilisateur est automatiquement rétrogradé en plan 'free'.
    """
    clean_plan = (plan or "free").strip().lower()
    if clean_plan not in PLAN_CONFIGS:
        clean_plan = "free"

    if clean_plan != "free" and plan_expires_at:
        expiry_dt = parse_expiry_date(plan_expires_at)
        if expiry_dt and expiry_dt < datetime.now(timezone.utc):
            logger.info(f"Plan {clean_plan} expiré le {plan_expires_at} -> fallback 'free'")
            clean_plan = "free"

    return PLAN_CONFIGS[clean_plan]


def get_user_plan(user_id: str, supabase=None) -> PlanLimits:
    """Récupère le profil et calcule les limites applicables."""
    if supabase is None:
        supabase = get_supabase()

    try:
        res = (
            supabase.table("profiles")
            .select("plan, plan_expires_at")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if res.data:
            return get_effective_plan(res.data.get("plan"), res.data.get("plan_expires_at"))
    except Exception as e:
        logger.warning(f"get_user_plan fallback to free for user {user_id}: {e}")

    return PLAN_CONFIGS["free"]


# ─── Fonctions de garde (Guards) ──────────────────────────────────────────────

def check_store_creation_allowed(
    user_id: str,
    requested_theme: Optional[str] = None,
    supabase=None,
) -> PlanLimits:
    """
    Vérifie qu'un utilisateur a le droit de créer une nouvelle boutique :
    1. Quota de boutiques (1 pour Free, 5 pour Pro, illimité pour Business).
    2. Thème initial demandé (interdiction des thèmes premium pour Free).
    """
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)

    # 1. Vérification du quota de boutiques
    if plan_limits.stores_limit != -1:
        count_res = (
            supabase.table("stores")
            .select("id", count="exact")
            .eq("owner_id", user_id)
            .execute()
        )
        current_stores = count_res.count or 0
        if current_stores >= plan_limits.stores_limit:
            raise PlanLimitException(
                message=(
                    f"Limite atteinte : votre forfait {plan_limits.plan_name} vous permet "
                    f"de créer au maximum {plan_limits.stores_limit} boutique(s). "
                    f"Passez à un forfait supérieur pour débloquer plus de boutiques."
                ),
                limit_type="stores",
                current=current_stores,
                limit=plan_limits.stores_limit,
            )

    # 2. Vérification du thème initial
    if requested_theme:
        clean_theme = requested_theme.strip().lower()
        if not plan_limits.can_use_all_themes and clean_theme not in FREE_THEMES:
            raise PlanLimitException(
                message=(
                    f"Le thème '{clean_theme}' est réservé aux forfaits Pro et Business. "
                    f"Choisissez un thème standard (Monochrome, Blossom Lavender, Crimson, Natural) "
                    f"ou passez au forfait Pro."
                ),
                limit_type="theme",
                current=0,
                limit=0,
            )

    return plan_limits


def check_theme_allowed(
    user_id: str,
    theme: str,
    supabase=None,
) -> PlanLimits:
    """Vérifie si l'utilisateur a le droit d'appliquer ce thème à sa boutique."""
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)
    clean_theme = theme.strip().lower()

    if not plan_limits.can_use_all_themes and clean_theme not in FREE_THEMES:
        raise PlanLimitException(
            message=(
                f"Le thème '{clean_theme}' est un thème premium réservé aux forfaits Pro et Business. "
                f"Passez au forfait Pro pour débloquer tous les thèmes premium de la vitrine."
            ),
            limit_type="theme",
            current=0,
            limit=0,
        )

    return plan_limits


def check_product_creation_allowed(
    user_id: str,
    store_id: str,
    supabase=None,
) -> PlanLimits:
    """
    Vérifie qu'un utilisateur a le droit d'ajouter un produit dans sa boutique :
    - Free: max 10 produits par boutique.
    - Pro / Business: illimité.
    """
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)

    if plan_limits.products_limit != -1:
        count_res = (
            supabase.table("products")
            .select("id", count="exact")
            .eq("store_id", store_id)
            .execute()
        )
        current_products = count_res.count or 0
        if current_products >= plan_limits.products_limit:
            raise PlanLimitException(
                message=(
                    f"Limite de produits atteinte pour votre forfait {plan_limits.plan_name} "
                    f"(max: {plan_limits.products_limit} produits). Passez au forfait Pro ou Business "
                    f"pour ajouter des produits en illimité."
                ),
                limit_type="products",
                current=current_products,
                limit=plan_limits.products_limit,
            )

    return plan_limits


def check_ai_generation_allowed(
    user_id: str,
    store_id: str,
    supabase=None,
) -> PlanLimits:
    """
    Vérifie les droits de génération IA :
    - Pro & Business : Illimité.
    - Free : Limité à 1 essai max par compte utilisateur.
    """
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)
    if plan_limits.can_use_ai_unlimited:
        return plan_limits

    # Compte les générations réussies pour l'utilisateur
    completed_jobs = 0
    try:
        jobs_res = (
            supabase.table("generation_jobs")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .in_("status", ["completed", "completed_with_fallback"])
            .execute()
        )
        completed_jobs = jobs_res.count or 0
    except Exception as e:
        logger.warning(f"Could not count generation_jobs for {user_id}: {e}")

    # Vérifie également si l'une des boutiques de l'utilisateur a déjà été générée
    if completed_jobs == 0:
        try:
            stores_res = (
                supabase.table("stores")
                .select("id", count="exact")
                .eq("owner_id", user_id)
                .eq("status", "generated")
                .execute()
            )
            completed_jobs = stores_res.count or 0
        except Exception:
            pass

    if completed_jobs >= 1:
        raise PlanLimitException(
            message=(
                "La génération IA de descriptions et vitrines est réservée aux forfaits Pro et Business. "
                "Votre essai gratuit de 1 génération a déjà été utilisé. "
                "Passez au plan Pro pour débloquer la génération illimitée."
            ),
            limit_type="ai",
            current=completed_jobs,
            limit=1,
        )

    return plan_limits


def check_bulk_shipping_allowed(
    user_id: str,
    supabase=None,
) -> PlanLimits:
    """
    Vérifie le droit d'appliquer une modification en masse des tarifs de livraison (58 wilayas d'un coup).
    - Free : Modification unitaire seulement (wilaya par wilaya).
    - Pro & Business : Modification en masse autorisée.
    """
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)
    if not plan_limits.can_use_bulk_shipping:
        raise PlanLimitException(
            message=(
                "La modification en masse des tarifs de livraison (58 wilayas en un clic) "
                "est réservée aux forfaits Pro et Business. Vous pouvez configurer chaque wilaya "
                "individuellement ou passer au forfait Pro pour activer l'application globale."
            ),
            limit_type="shipping_bulk",
            current=0,
            limit=0,
        )

    return plan_limits


def check_team_management_allowed(
    user_id: str,
    supabase=None,
) -> PlanLimits:
    """
    Vérifie le droit de gérer des membres d'équipe :
    - Seul le forfait Business est autorisé.
    - Free et Pro : PlanLimitException(limit_type="team").
    """
    if supabase is None:
        supabase = get_supabase()

    plan_limits = get_user_plan(user_id, supabase)
    if not plan_limits.can_use_team:
        raise PlanLimitException(
            message=(
                "La gestion des collaborateurs et des membres d'équipe est une fonctionnalité "
                "exclusive au forfait Business. Passez au Pack Business pour inviter votre équipe !"
            ),
            limit_type="team",
            current=0,
            limit=0,
        )

    return plan_limits

