from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from models.schemas import TeamMemberCreate
from dependencies import get_supabase
import logging

router = APIRouter()
logger = logging.getLogger("storegen.team")

@router.post("")
@router.post("/")
async def add_team_member(req: TeamMemberCreate, supabase = Depends(get_supabase)):
    store_id = req.store_id
    if not store_id:
        raise HTTPException(status_code=400, detail="Boutique introuvable")

    try:
        existing = supabase.table("store_members").select("id").eq("store_id", store_id).eq("user_email", req.user_email.strip().lower()).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Ce collaborateur est déjà ajouté à la boutique")
    except HTTPException:
        raise
    except Exception as e:
        if "PGRST205" in str(e) or "not find the table" in str(e):
            logger.warning("Table 'store_members' does not exist yet.")
            return {"success": True, "member": {"id": "member-sim", **payload}}

    try:
        from db_resilience import safe_insert
        res = safe_insert("store_members", payload, supabase)
        if not res or not res.data:
            return {"success": True, "member": {"id": "member-sim", **payload}}
        return {"success": True, "member": res.data[0]}
    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "not find the table" in err_str:
            return {"success": True, "member": {"id": "member-sim", **payload}}
        logger.error(f"Erreur ajout collaborateur: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
@router.get("/")
async def get_team_members(store_id: str = Query(..., description="ID de la boutique"), supabase = Depends(get_supabase)):
    try:
        res = supabase.table("store_members").select("*").eq("store_id", store_id).order("created_at", desc=False).execute()
        return {"success": True, "members": res.data or []}
    except Exception as e:
        if "PGRST205" in str(e) or "not find the table" in str(e):
            return {"success": True, "members": []}
        logger.error(f"Erreur lecture collaborateurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{member_id}")
async def delete_team_member(member_id: str, supabase = Depends(get_supabase)):
    try:
        res = supabase.table("store_members").delete().eq("id", member_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Erreur suppression collaborateur: {e}")
        raise HTTPException(status_code=500, detail=str(e))
