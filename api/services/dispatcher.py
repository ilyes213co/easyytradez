"""
Module de Smart Dispatch & Rééquilibrage d'Équipe COD (Algérie)
==============================================================
Règle Métier Fondamentale :
L'équipe d'un propriétaire opère au niveau GLOBAL (sur l'ensemble de ses
Funnels ET de ses Boutiques). Lorsqu'une commande arrive en statut 'pending',
elle est automatiquement assignée à l'employé le moins chargé (Least-Loaded)
avec départage Round-Robin sur la date de dernière attribution (last_assigned_at).
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from supabase import Client

logger = logging.getLogger("storegen.dispatcher")


def assign_order_smartly(
    order_id: str,
    store_id: str,
    supabase: Client,
) -> Dict[str, Any]:
    """
    Assigne intelligemment une commande entrante à l'un des téléopérateurs/membres
    de l'équipe globale du propriétaire du store/funnel.
    """
    if not order_id or not store_id or not supabase:
        return {"success": False, "reason": "missing_params"}

    try:
        # 1. Récupérer le propriétaire du store
        store_res = (
            supabase.table("stores")
            .select("id, owner_id")
            .eq("id", store_id)
            .maybe_single()
            .execute()
        )
        if not store_res.data:
            logger.warning(f"SmartDispatch: Store {store_id} introuvable")
            return {"success": False, "reason": "store_not_found"}

        owner_id = store_res.data.get("owner_id")
        if not owner_id:
            logger.warning(f"SmartDispatch: Store {store_id} sans owner_id")
            return {"success": False, "reason": "no_owner_id"}

        # 2. Récupérer tous les membres actifs de l'équipe de ce propriétaire
        members_res = (
            supabase.table("store_members")
            .select("*")
            .eq("owner_id", owner_id)
            .execute()
        )
        members = members_res.data or []

        # Rétro-compatibilité : si aucun membre n'a owner_id renseigné, chercher par store_id
        if not members:
            retro_res = (
                supabase.table("store_members")
                .select("*")
                .eq("store_id", store_id)
                .execute()
            )
            members = retro_res.data or []

        # Filtrer uniquement les membres actifs
        active_members: List[Dict[str, Any]] = [
            m for m in members
            if m.get("is_active") is not False
            and str(m.get("status", "")).lower() in ("active", "invited", "")
        ]

        if not active_members:
            logger.info(f"SmartDispatch: Aucun employé actif pour le propriétaire {owner_id}")
            return {"success": False, "reason": "no_active_members"}

        # 3. Récupérer tous les funnels et boutiques de ce propriétaire
        owner_stores_res = (
            supabase.table("stores")
            .select("id")
            .eq("owner_id", owner_id)
            .execute()
        )
        all_store_ids = [s["id"] for s in (owner_stores_res.data or []) if s.get("id")]
        if store_id not in all_store_ids:
            all_store_ids.append(store_id)

        # 4. Calculer la charge actuelle de chaque employé sur l'ENSEMBLE des stores du propriétaire
        # Statuts en attente de traitement : pending, no_answer, callback
        workloads: Dict[str, int] = {}
        for m in active_members:
            key = m.get("user_id") or m.get("id")
            if key:
                workloads[key] = 0

        try:
            active_orders_res = (
                supabase.table("orders")
                .select("id, assigned_to")
                .in_("store_id", all_store_ids)
                .in_("status", ["pending", "no_answer", "callback"])
                .not_.is_("assigned_to", "null")
                .execute()
            )
            for ord_row in (active_orders_res.data or []):
                assigned = ord_row.get("assigned_to")
                if not assigned:
                    continue
                if assigned in workloads:
                    workloads[assigned] += 1
                else:
                    for m in active_members:
                        if assigned in (m.get("user_id"), m.get("id")):
                            m_key = m.get("user_id") or m.get("id")
                            if m_key in workloads:
                                workloads[m_key] += 1
                            break
        except Exception as e:
            logger.warning(f"SmartDispatch: Erreur comptage charge active ({e}) - passage au Round-Robin pur")

        # 5. Sélection de l'employé : Least-Loaded puis Round-Robin sur last_assigned_at
        def sort_key(member: Dict[str, Any]):
            m_key = member.get("user_id") or member.get("id")
            load = workloads.get(m_key, 0)
            # Les timestamp ISO comparent bien alphabétiquement. "" passe avant tout.
            last_assigned = member.get("last_assigned_at") or ""
            return (load, last_assigned, member.get("created_at") or "")

        sorted_members = sorted(active_members, key=sort_key)
        chosen_member = sorted_members[0]
        chosen_id = chosen_member.get("user_id") or chosen_member.get("id")

        # 6. Mettre à jour la commande et la date de dernière attribution
        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("orders").update({
                "assigned_to": chosen_id,
                "assigned_at": now_iso,
            }).eq("id", order_id).execute()
        except Exception as e:
            logger.warning(f"SmartDispatch: Impossible de mettre à jour orders.assigned_to ({e})")

        try:
            supabase.table("store_members").update({
                "last_assigned_at": now_iso,
            }).eq("id", chosen_member.get("id")).execute()
        except Exception as e:
            logger.warning(f"SmartDispatch: Impossible de mettre à jour store_members.last_assigned_at ({e})")

        assigned_email = chosen_member.get("user_email") or chosen_member.get("email") or "collaborateur"
        logger.info(
            f"SmartDispatch: Commande {order_id} assignée à {assigned_email} "
            f"(Charge globale actuelle: {workloads.get(chosen_id, 0)})"
        )

        return {
            "success": True,
            "assigned_to": chosen_id,
            "member_id": chosen_member.get("id"),
            "member_email": assigned_email,
            "workload": workloads.get(chosen_id, 0),
            "assigned_at": now_iso,
        }

    except Exception as e:
        logger.error(f"SmartDispatch Exception: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


def rebalance_orders(
    owner_id: str,
    supabase: Client,
) -> Dict[str, Any]:
    """
    Ré-équilibre équitablement toutes les commandes 'pending' de tous les
    Funnels et Boutiques d'un propriétaire entre tous ses employés actifs disponibles.
    """
    if not owner_id or not supabase:
        return {"success": False, "reason": "missing_params"}

    try:
        # 1. Récupérer tous les funnels et boutiques du propriétaire
        owner_stores_res = (
            supabase.table("stores")
            .select("id")
            .eq("owner_id", owner_id)
            .execute()
        )
        store_ids = [s["id"] for s in (owner_stores_res.data or []) if s.get("id")]
        if not store_ids:
            return {"success": True, "rebalanced": 0, "message": "Aucune boutique trouvée"}

        # 2. Récupérer les membres actifs
        members_res = (
            supabase.table("store_members")
            .select("*")
            .eq("owner_id", owner_id)
            .execute()
        )
        members = members_res.data or []
        active_members: List[Dict[str, Any]] = [
            m for m in members
            if m.get("is_active") is not False
            and str(m.get("status", "")).lower() in ("active", "invited", "")
        ]

        if not active_members:
            return {"success": False, "rebalanced": 0, "message": "Aucun employé actif disponible"}

        # 3. Récupérer toutes les commandes 'pending'
        pending_orders_res = (
            supabase.table("orders")
            .select("id, store_id, assigned_to, created_at")
            .in_("store_id", store_ids)
            .eq("status", "pending")
            .order("created_at", desc=False)
            .execute()
        )
        pending_orders = pending_orders_res.data or []
        if not pending_orders:
            return {"success": True, "rebalanced": 0, "message": "Aucune commande en attente à rééquilibrer"}

        # 4. Charger la charge existante en cours ('no_answer', 'callback')
        workloads: Dict[str, int] = {}
        for m in active_members:
            m_key = m.get("user_id") or m.get("id")
            if m_key:
                workloads[m_key] = 0

        try:
            in_progress_res = (
                supabase.table("orders")
                .select("id, assigned_to")
                .in_("store_id", store_ids)
                .in_("status", ["no_answer", "callback"])
                .not_.is_("assigned_to", "null")
                .execute()
            )
            for ord_row in (in_progress_res.data or []):
                assigned = ord_row.get("assigned_to")
                if not assigned:
                    continue
                if assigned in workloads:
                    workloads[assigned] += 1
                else:
                    for m in active_members:
                        if assigned in (m.get("user_id"), m.get("id")):
                            m_key = m.get("user_id") or m.get("id")
                            if m_key in workloads:
                                workloads[m_key] += 1
                            break
        except Exception as e:
            logger.warning(f"Rebalance: Erreur comptage charges intermédiaires ({e})")

        # 5. Redistribuer les commandes 'pending' une par une au membre le moins chargé
        rebalanced_count = 0
        now_iso = datetime.now(timezone.utc).isoformat()

        for order in pending_orders:
            sorted_m = sorted(
                active_members,
                key=lambda m: (
                    workloads.get(m.get("user_id") or m.get("id"), 0),
                    m.get("last_assigned_at") or "",
                    m.get("created_at") or "",
                )
            )
            chosen = sorted_m[0]
            chosen_id = chosen.get("user_id") or chosen.get("id")

            if order.get("assigned_to") != chosen_id:
                try:
                    supabase.table("orders").update({
                        "assigned_to": chosen_id,
                        "assigned_at": now_iso,
                    }).eq("id", order["id"]).execute()
                    rebalanced_count += 1
                except Exception as e:
                    logger.warning(f"Rebalance: Erreur réassignation commande {order['id']}: {e}")

            workloads[chosen_id] = workloads.get(chosen_id, 0) + 1
            chosen["last_assigned_at"] = now_iso
            try:
                supabase.table("store_members").update({
                    "last_assigned_at": now_iso,
                }).eq("id", chosen.get("id")).execute()
            except Exception:
                pass

        logger.info(
            f"Rebalance: {rebalanced_count} commandes redistribuées entre {len(active_members)} employés pour {owner_id}"
        )

        return {
            "success": True,
            "rebalanced": rebalanced_count,
            "total_pending": len(pending_orders),
            "members_count": len(active_members),
            "final_workloads": workloads,
        }

    except Exception as e:
        logger.error(f"Rebalance Exception: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
