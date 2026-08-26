"""
Dépendances partagées FastAPI
— Client Supabase (service role)
— Vérification JWT Supabase (Bearer token)
"""

import os
from functools import lru_cache
from typing import Optional
from pathlib import Path

from supabase import create_client, Client
from fastapi import Header, HTTPException, Depends
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
# Load env from common local locations (first existing values win).
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / ".env.txt")
load_dotenv(BASE_DIR.parent / ".env.local")


# ─── Supabase client (service role) ──────────────────────────────────────────

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Missing Supabase env vars. Expected SUPABASE_SERVICE_KEY and one of "
            "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL."
        )
    return create_client(url, key)


# Alias utilisé dans certains modules (analytics, deploy...)
def get_supabase_client() -> Client:
    return get_supabase()


# ─── JWT verification ─────────────────────────────────────────────────────────

class UserInfo:
    """Simple wrapper pour exposer user.id comme attribut."""
    def __init__(self, user_id: str, email: str = ""):
        self.id    = user_id
        self.email = email


async def verify_token(
    authorization: Optional[str] = Header(None, description="Bearer <token>"),
) -> str:
    """
    Vérifie le JWT Supabase depuis le header Authorization.
    Retourne l'user_id (sub) si valide.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token manquant. Header: Authorization: Bearer <token>",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token vide")

    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        return user.id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erreur auth: {str(e)}")


async def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer <token>"),
) -> UserInfo:
    """
    Alias de verify_token — retourne un objet avec .id et .email
    Utilisé dans analytics.py, deploy.py, etc.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token manquant. Header: Authorization: Bearer <token>",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token vide")

    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        return UserInfo(user_id=user.id, email=getattr(user, "email", ""))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erreur auth: {str(e)}")


# ─── Store ownership guard ────────────────────────────────────────────────────

async def verify_store_owner(
    store_id: str,
    user_id:  str = Depends(verify_token),
) -> str:
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
    return user_id
