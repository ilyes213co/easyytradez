from fastapi import HTTPException, Header, Depends
from supabase import create_client, Client
import os
import logging

logger = logging.getLogger("storegen.auth")

# ─── Supabase admin client ─────────────────────────────────────────────────────

def get_supabase() -> Client:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("Supabase env vars not set")
    return create_client(url, key)

# ─── JWT auth dependency ───────────────────────────────────────────────────────

async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Extract and verify the Supabase JWT from the Authorization header.
    Returns the user dict on success, raises 401 on failure.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()

    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        return {"id": response.user.id, "email": response.user.email}
    except Exception as e:
        logger.warning(f"Auth failed: {e}")
        raise HTTPException(status_code=401, detail="Non authentifié")


async def get_current_user_optional(authorization: str = Header(default="")) -> dict | None:
    """Same as get_current_user but returns None instead of raising 401."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
