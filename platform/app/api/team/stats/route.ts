import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdminClient();

    // 1. Charger toutes les boutiques/funnels du propriétaire
    const { data: stores, error: storesErr } = await admin
      .from("stores")
      .select("id, name, type")
      .eq("owner_id", user.id);

    if (storesErr) {
      return NextResponse.json({ detail: storesErr.message }, { status: 500 });
    }

    const storeIds = (stores || []).map((s) => s.id);

    // 2. Charger les membres de l'équipe
    const { data: members, error: membersErr } = await admin
      .from("store_members")
      .select("id, owner_id, store_id, email, user_email, role, status, is_active, user_id, last_assigned_at, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (membersErr) {
      return NextResponse.json({ detail: membersErr.message }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        success: true,
        stats: [],
        summary: {
          totalPending: 0,
          totalAssigned: 0,
          activeAgents: 0,
          totalConfirmed: 0,
        },
      });
    }

    // 3. Charger toutes les commandes de ces boutiques
    let orders: any[] = [];
    if (storeIds.length > 0) {
      const { data: ordersData, error: ordersErr } = await admin
        .from("orders")
        .select("id, status, assigned_to, assigned_at, confirmed_by, confirmed_at, total_amount, store_id, created_at")
        .in("store_id", storeIds);

      if (ordersErr) {
        return NextResponse.json({ detail: ordersErr.message }, { status: 500 });
      }
      orders = ordersData || [];
    }

    // 4. Calculer les statistiques par employé
    const memberStats = members.map((m) => {
      const memberOrders = orders.filter(
        (o) => (m.user_id && o.assigned_to === m.user_id) || o.assigned_to === m.id
      );

      const totalAssigned = memberOrders.length;
      const pendingCalls = memberOrders.filter((o) =>
        ["pending", "no_answer", "callback"].includes(o.status)
      ).length;
      const confirmed = memberOrders.filter((o) =>
        ["confirmed", "shipped", "delivered"].includes(o.status)
      ).length;
      const cancelled = memberOrders.filter((o) =>
        ["cancelled", "unreachable", "wrong_number"].includes(o.status)
      ).length;
      const postponed = memberOrders.filter((o) => o.status === "postponed").length;

      const confirmationRate = totalAssigned > 0 ? Math.round((confirmed / totalAssigned) * 100) : 0;
      const cancellationRate = totalAssigned > 0 ? Math.round((cancelled / totalAssigned) * 100) : 0;

      return {
        id: m.id,
        user_id: m.user_id,
        email: m.email || m.user_email || "Employé",
        role: m.role || "manager",
        is_active: m.is_active !== false,
        last_assigned_at: m.last_assigned_at,
        created_at: m.created_at,
        total_assigned: totalAssigned,
        pending_calls: pendingCalls,
        confirmed,
        cancelled,
        postponed,
        confirmation_rate: confirmationRate,
        cancellation_rate: cancellationRate,
        is_top_performer: false,
      };
    });

    // 5. Attribuer le statut Top Performer au leader
    const sorted = [...memberStats].sort((a, b) => {
      if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
      return b.confirmation_rate - a.confirmation_rate;
    });

    const leader = sorted[0];
    if (leader && leader.confirmed > 0) {
      const target = memberStats.find((s) => s.id === leader.id);
      if (target) target.is_top_performer = true;
    }

    const totalPending = orders.filter((o) => o.status === "pending").length;
    const totalAssigned = memberStats.reduce((sum, m) => sum + m.total_assigned, 0);
    const totalConfirmed = memberStats.reduce((sum, m) => sum + m.confirmed, 0);
    const activeAgents = memberStats.filter((m) => m.is_active).length;

    return NextResponse.json({
      success: true,
      stats: memberStats,
      summary: {
        totalPending,
        totalAssigned,
        activeAgents,
        totalConfirmed,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/team/stats:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
