from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from models.schemas import TeamMemberCreate
from dependencies import get_supabase, get_current_user, check_store_owner
from plan_guard import check_team_management_allowed
import logging
import uuid
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger("storegen.team")


def is_missing_table_error(e: Exception) -> bool:
    err_str = str(e).lower()
    return (
        "pgrst205" in err_str
        or "42p01" in err_str
        or "could not find the table" in err_str
        or "relation \"store_members\" does not exist" in err_str
        or "relation 'store_members' does not exist" in err_str
        or "relation \"public.store_members\" does not exist" in err_str
    )


@router.post("")
@router.post("/")
async def add_team_member(
    req: TeamMemberCreate,
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    store_id = req.store_id
    if not store_id:
        raise HTTPException(status_code=400, detail="Boutique introuvable")

    # 1. Vérification de propriété du store
    check_store_owner(store_id, user.id, supabase)

    # 2. Protection de plan côté serveur : Business uniquement
    check_team_management_allowed(user_id=user.id, supabase=supabase)

    normalized_email = req.user_email.strip().lower()
    payload = {
        "id": str(uuid.uuid4()),
        "owner_id": user.id,
        "store_id": store_id,
        "user_email": normalized_email,
        "email": normalized_email,
        "role": req.role or "manager",
        "status": "invited",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        existing = (
            supabase.table("store_members")
            .select("id")
            .or_(f"owner_id.eq.{user.id},store_id.eq.{store_id}")
            .or_(f"user_email.eq.{normalized_email},email.eq.{normalized_email}")
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="Ce collaborateur est déjà invité ou membre de l'équipe")
    except HTTPException:
        raise
    except Exception as e:
        if is_missing_table_error(e):
            logger.warning("Table 'store_members' does not exist yet. Returning graceful fallback member.")
            return {"success": True, "member": payload, "simulated": True}
        logger.warning(f"Error checking existing member: {e}")

    try:
        from db_resilience import safe_insert
        res = safe_insert("store_members", payload, supabase)
        if not res or not res.data:
            return {"success": True, "member": payload}
        return {"success": True, "member": res.data[0]}
    except Exception as e:
        if is_missing_table_error(e):
            logger.warning("Table 'store_members' does not exist yet. Returning graceful fallback member.")
            return {"success": True, "member": payload, "simulated": True}
        logger.error(f"Erreur ajout collaborateur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
@router.get("/")
async def get_team_members(
    store_id: Optional[str] = Query(None, description="ID de la boutique"),
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    if store_id:
        check_store_owner(store_id, user.id, supabase)

    try:
        query = supabase.table("store_members").select("*")
        if store_id:
            query = query.or_(f"owner_id.eq.{user.id},store_id.eq.{store_id}")
        else:
            query = query.eq("owner_id", user.id)
        
        res = query.order("created_at", desc=False).execute()
        return {"success": True, "members": res.data or []}
    except Exception as e:
        if is_missing_table_error(e):
            logger.info("Table 'store_members' does not exist yet. Returning empty list.")
            return {"success": True, "members": []}
        logger.error(f"Erreur lecture collaborateurs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebalance")
async def trigger_rebalance_orders(
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Ré-équilibre les commandes en attente (pending) de tous les funnels
    et boutiques de ce propriétaire entre les employés actifs.
    """
    from services.dispatcher import rebalance_orders
    result = rebalance_orders(owner_id=user.id, supabase=supabase)
    return result


@router.get("/stats")
async def get_team_stats(
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Statistiques globales de performance de l'équipe pour le propriétaire.
    """
    try:
        # 1. Stores du propriétaire
        stores_res = supabase.table("stores").select("id").eq("owner_id", user.id).execute()
        store_ids = [s["id"] for s in (stores_res.data or [])]

        # 2. Membres
        members_res = supabase.table("store_members").select("*").eq("owner_id", user.id).execute()
        members = members_res.data or []

        if not members:
            return {
                "success": True,
                "stats": [],
                "summary": {"totalPending": 0, "totalAssigned": 0, "activeAgents": 0, "totalConfirmed": 0},
            }

        orders = []
        if store_ids:
            orders_res = supabase.table("orders").select("id, status, assigned_to").in_("store_id", store_ids).execute()
            orders = orders_res.data or []

        member_stats = []
        for m in members:
            m_orders = [o for o in orders if (m.get("user_id") and o.get("assigned_to") == m["user_id"]) or o.get("assigned_to") == m["id"]]
            total_assigned = len(m_orders)
            pending_calls = len([o for o in m_orders if o.get("status") in ["pending", "no_answer", "callback"]])
            confirmed = len([o for o in m_orders if o.get("status") in ["confirmed", "shipped", "delivered"]])
            cancelled = len([o for o in m_orders if o.get("status") in ["cancelled", "unreachable", "wrong_number"]])
            postponed = len([o for o in m_orders if o.get("status") == "postponed"])

            c_rate = round((confirmed / total_assigned) * 100) if total_assigned > 0 else 0
            x_rate = round((cancelled / total_assigned) * 100) if total_assigned > 0 else 0

            member_stats.append({
                "id": m["id"],
                "user_id": m.get("user_id"),
                "email": m.get("email") or m.get("user_email") or "Employé",
                "role": m.get("role") or "manager",
                "is_active": m.get("is_active") is not False,
                "last_assigned_at": m.get("last_assigned_at"),
                "created_at": m.get("created_at"),
                "total_assigned": total_assigned,
                "pending_calls": pending_calls,
                "confirmed": confirmed,
                "cancelled": cancelled,
                "postponed": postponed,
                "confirmation_rate": c_rate,
                "cancellation_rate": x_rate,
                "is_top_performer": False,
            })

        sorted_stats = sorted(member_stats, key=lambda x: (x["confirmed"], x["confirmation_rate"]), reverse=True)
        if sorted_stats and sorted_stats[0]["confirmed"] > 0:
            top_id = sorted_stats[0]["id"]
            for s in member_stats:
                if s["id"] == top_id:
                    s["is_top_performer"] = True
                    break

        total_pending = len([o for o in orders if o.get("status") == "pending"])
        total_assigned = sum(m["total_assigned"] for m in member_stats)
        total_confirmed = sum(m["confirmed"] for m in member_stats)
        active_agents = len([m for m in member_stats if m["is_active"]])

        return {
            "success": True,
            "stats": member_stats,
            "summary": {
                "totalPending": total_pending,
                "totalAssigned": total_assigned,
                "activeAgents": active_agents,
                "totalConfirmed": total_confirmed,
            },
        }
    except Exception as e:
        if is_missing_table_error(e):
            return {"success": True, "stats": [], "summary": {"totalPending": 0, "totalAssigned": 0, "activeAgents": 0, "totalConfirmed": 0}}
        logger.error(f"Erreur stats team: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{member_id}")
async def update_team_member(
    member_id: str,
    req: dict,
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    check_team_management_allowed(user_id=user.id, supabase=supabase)
    update_data = {}
    if "is_active" in req:
        update_data["is_active"] = bool(req["is_active"])
    if "role" in req:
        update_data["role"] = req["role"]

    try:
        res = (
            supabase.table("store_members")
            .update(update_data)
            .eq("id", member_id)
            .eq("owner_id", user.id)
            .execute()
        )
        return {"success": True, "member": res.data[0] if res.data else None}
    except Exception as e:
        logger.error(f"Erreur mise à jour collaborateur: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{member_id}")
async def delete_team_member(
    member_id: str,
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    # Protection de plan côté serveur : Business uniquement
    check_team_management_allowed(user_id=user.id, supabase=supabase)

    try:
        supabase.table("store_members").delete().eq("id", member_id).execute()
        return {"success": True}
    except Exception as e:
        if is_missing_table_error(e):
            return {"success": True}
        logger.error(f"Erreur suppression collaborateur: {e}")
        raise HTTPException(status_code=500, detail=str(e))

