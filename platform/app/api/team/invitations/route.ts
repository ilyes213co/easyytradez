import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdminClient();
    const userEmail = (user.email || "").toLowerCase().trim();

    // 1. Relier user_id si null sur les invitations existantes
    try {
      await admin
        .from("store_members")
        .update({ user_id: user.id })
        .is("user_id", null)
        .or(`email.eq.${userEmail},user_email.eq.${userEmail}`);
    } catch (_) {}

    // 2. Récupérer toutes les invitations en attente (status = 'invited')
    const { data: invitations, error } = await admin
      .from("store_members")
      .select("id, owner_id, store_id, role, status, is_active, created_at")
      .or(`user_id.eq.${user.id},email.eq.${userEmail},user_email.eq.${userEmail}`)
      .eq("status", "invited")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ success: true, invitations: [] });
    }

    // 3. Enrichir avec le profil du propriétaire (nom, email, boutique)
    const ownerIds = Array.from(new Set(invitations.map((i: any) => i.owner_id).filter(Boolean)));
    const storeIds = Array.from(new Set(invitations.map((i: any) => i.store_id).filter(Boolean)));

    const [profilesRes, storesRes] = await Promise.all([
      ownerIds.length > 0
        ? admin.from("profiles").select("id, full_name").in("id", ownerIds)
        : Promise.resolve({ data: [] }),
      storeIds.length > 0
        ? admin.from("stores").select("id, name, type").in("id", storeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const storesMap = new Map((storesRes.data || []).map((s: any) => [s.id, s]));

    // Récupérer les emails des propriétaires si nécessaire
    const ownerEmails = new Map<string, string>();
    for (const ownerId of ownerIds) {
      try {
        const { data: authOwner } = await admin.auth.admin.getUserById(ownerId);
        if (authOwner?.user?.email) {
          ownerEmails.set(ownerId, authOwner.user.email);
        }
      } catch (_) {}
    }

    const enriched = invitations.map((inv: any) => {
      const profile = profilesMap.get(inv.owner_id);
      const store = inv.store_id ? storesMap.get(inv.store_id) : null;
      const ownerEmail = ownerEmails.get(inv.owner_id) || "Propriétaire";
      const ownerName = profile?.full_name || ownerEmail.split("@")[0] || "Propriétaire";

      return {
        id: inv.id,
        owner_id: inv.owner_id,
        owner_name: ownerName,
        owner_email: ownerEmail,
        store_id: inv.store_id,
        store_name: store?.name || null,
        store_type: store?.type || "global",
        role: inv.role || "manager",
        status: inv.status,
        created_at: inv.created_at,
      };
    });

    return NextResponse.json({ success: true, invitations: enriched });
  } catch (err: any) {
    console.error("GET /api/team/invitations exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
