import { getAdminClient } from "@/lib/api-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DispatchResult {
  success: boolean;
  assigned_to?: string | null;
  member_id?: string;
  member_email?: string;
  workload?: number;
  assigned_at?: string;
  reason?: string;
  error?: string;
}

export interface RebalanceResult {
  success: boolean;
  rebalanced: number;
  total_pending?: number;
  members_count?: number;
  message?: string;
  error?: string;
}

/**
 * Assigne intelligemment une commande entrante à l'un des téléopérateurs/membres
 * de l'équipe globale du propriétaire du store/funnel (Least-Loaded + Round-Robin).
 */
export async function assignOrderSmartly(
  orderId: string,
  storeId: string,
  client?: SupabaseClient
): Promise<DispatchResult> {
  const supabase = client || getAdminClient();

  try {
    // 1. Récupérer le propriétaire du store
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, owner_id")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr || !store) {
      console.warn(`SmartDispatch: Store ${storeId} introuvable`, storeErr);
      return { success: false, reason: "store_not_found" };
    }

    const ownerId = store.owner_id;
    if (!ownerId) {
      return { success: false, reason: "no_owner_id" };
    }

    // 2. Récupérer tous les membres actifs de l'équipe du propriétaire
    let { data: members, error: memErr } = await supabase
      .from("store_members")
      .select("*")
      .eq("owner_id", ownerId);

    // Rétro-compatibilité : si aucun membre n'a owner_id, chercher par store_id
    if (!members || members.length === 0) {
      const { data: retroMembers } = await supabase
        .from("store_members")
        .select("*")
        .eq("store_id", storeId);
      members = retroMembers;
    }

    const activeMembers = (members || []).filter(
      (m: any) =>
        m.is_active !== false &&
        ["active", "invited", ""].includes(String(m.status || "").toLowerCase())
    );

    if (activeMembers.length === 0) {
      return { success: false, reason: "no_active_members" };
    }

    // 3. Récupérer tous les stores et funnels de ce propriétaire
    const { data: ownerStores } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", ownerId);

    const storeIds = (ownerStores || []).map((s: any) => s.id).filter(Boolean);
    if (!storeIds.includes(storeId)) {
      storeIds.push(storeId);
    }

    // 4. Calculer la charge de chaque membre (pending, no_answer, callback) sur l'ensemble des stores
    const workloads: Record<string, number> = {};
    for (const m of activeMembers) {
      const key = m.user_id || m.id;
      if (key) workloads[key] = 0;
    }

    try {
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id, assigned_to")
        .in("store_id", storeIds)
        .in("status", ["pending", "no_answer", "callback"])
        .not("assigned_to", "is", null);

      for (const ord of activeOrders || []) {
        const assigned = ord.assigned_to;
        if (!assigned) continue;
        if (workloads[assigned] !== undefined) {
          workloads[assigned] += 1;
        } else {
          for (const m of activeMembers) {
            if (m.user_id === assigned || m.id === assigned) {
              const k = m.user_id || m.id;
              if (k) workloads[k] = (workloads[k] || 0) + 1;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn("SmartDispatch TS: Erreur comptage charges actives:", e);
    }

    // 5. Sélection de l'employé : Least-Loaded puis Round-Robin sur last_assigned_at
    const sortedMembers = [...activeMembers].sort((a: any, b: any) => {
      const keyA = a.user_id || a.id;
      const keyB = b.user_id || b.id;
      const loadA = workloads[keyA] || 0;
      const loadB = workloads[keyB] || 0;

      if (loadA !== loadB) {
        return loadA - loadB;
      }

      const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
      const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
      return timeA - timeB;
    });

    const chosenMember = sortedMembers[0];
    const chosenId = chosenMember.user_id || chosenMember.id;
    const nowIso = new Date().toISOString();

    // 6. Sauvegarde de l'assignation sur la commande et mise à jour de last_assigned_at
    try {
      await supabase
        .from("orders")
        .update({
          assigned_to: chosenId,
          assigned_at: nowIso,
        })
        .eq("id", orderId);
    } catch (err) {
      console.warn("SmartDispatch TS: Erreur mise à jour order.assigned_to:", err);
    }

    try {
      await supabase
        .from("store_members")
        .update({
          last_assigned_at: nowIso,
        })
        .eq("id", chosenMember.id);
    } catch (err) {
      console.warn("SmartDispatch TS: Erreur mise à jour store_members.last_assigned_at:", err);
    }

    const assignedEmail = chosenMember.user_email || chosenMember.email || "collaborateur";

    return {
      success: true,
      assigned_to: chosenId,
      member_id: chosenMember.id,
      member_email: assignedEmail,
      workload: workloads[chosenId] || 0,
      assigned_at: nowIso,
    };
  } catch (err: any) {
    console.error("SmartDispatch TS Exception:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Ré-équilibre équitablement toutes les commandes 'pending' de tous les
 * Funnels et Boutiques d'un propriétaire entre tous ses employés actifs disponibles.
 */
export async function rebalanceOrders(
  ownerId: string,
  client?: SupabaseClient
): Promise<RebalanceResult> {
  const supabase = client || getAdminClient();

  try {
    // 1. Stores du propriétaire
    const { data: ownerStores } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", ownerId);

    const storeIds = (ownerStores || []).map((s: any) => s.id).filter(Boolean);
    if (!storeIds.length) {
      return { success: true, rebalanced: 0, message: "Aucune boutique trouvée" };
    }

    // 2. Membres actifs
    const { data: members } = await supabase
      .from("store_members")
      .select("*")
      .eq("owner_id", ownerId);

    const activeMembers = (members || []).filter(
      (m: any) =>
        m.is_active !== false &&
        ["active", "invited", ""].includes(String(m.status || "").toLowerCase())
    );

    if (!activeMembers.length) {
      return { success: false, rebalanced: 0, message: "Aucun employé actif disponible" };
    }

    // 3. Commandes 'pending'
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("id, store_id, assigned_to, created_at")
      .in("store_id", storeIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (!pendingOrders || !pendingOrders.length) {
      return { success: true, rebalanced: 0, message: "Aucune commande en attente" };
    }

    // 4. Initialisation des charges
    const workloads: Record<string, number> = {};
    for (const m of activeMembers) {
      const k = m.user_id || m.id;
      if (k) workloads[k] = 0;
    }

    try {
      const { data: inProgress } = await supabase
        .from("orders")
        .select("id, assigned_to")
        .in("store_id", storeIds)
        .in("status", ["no_answer", "callback"])
        .not("assigned_to", "is", null);

      for (const ord of inProgress || []) {
        const assigned = ord.assigned_to;
        if (!assigned) continue;
        if (workloads[assigned] !== undefined) {
          workloads[assigned] += 1;
        } else {
          for (const m of activeMembers) {
            if (m.user_id === assigned || m.id === assigned) {
              const k = m.user_id || m.id;
              if (k) workloads[k] = (workloads[k] || 0) + 1;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Rebalance TS: Erreur in-progress count:", e);
    }

    // 5. Redistribution
    let rebalancedCount = 0;
    const nowIso = new Date().toISOString();

    for (const order of pendingOrders) {
      const sorted = [...activeMembers].sort((a: any, b: any) => {
        const keyA = a.user_id || a.id;
        const keyB = b.user_id || b.id;
        const loadA = workloads[keyA] || 0;
        const loadB = workloads[keyB] || 0;

        if (loadA !== loadB) return loadA - loadB;

        const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
        const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
        return timeA - timeB;
      });

      const chosen = sorted[0];
      const chosenId = chosen.user_id || chosen.id;

      if (order.assigned_to !== chosenId) {
        try {
          await supabase
            .from("orders")
            .update({
              assigned_to: chosenId,
              assigned_at: nowIso,
            })
            .eq("id", order.id);
          rebalancedCount++;
        } catch (err) {
          console.warn(`Rebalance TS: Erreur assignation commande ${order.id}:`, err);
        }
      }

      workloads[chosenId] = (workloads[chosenId] || 0) + 1;
      chosen.last_assigned_at = nowIso;
      try {
        await supabase
          .from("store_members")
          .update({ last_assigned_at: nowIso })
          .eq("id", chosen.id);
      } catch (err) {
        // non-bloquant
      }
    }

    return {
      success: true,
      rebalanced: rebalancedCount,
      total_pending: pendingOrders.length,
      members_count: activeMembers.length,
    };
  } catch (err: any) {
    console.error("Rebalance TS Exception:", err);
    return { success: false, rebalanced: 0, error: err?.message || String(err) };
  }
}
