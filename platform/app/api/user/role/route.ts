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

    // 1. Relier automatiquement user_id si une invitation correspond à cet email (laisse status intact)
    try {
      await admin
        .from("store_members")
        .update({ user_id: user.id })
        .is("user_id", null)
        .or(`email.eq.${userEmail},user_email.eq.${userEmail}`);
    } catch (linkErr) {
      console.warn("Error auto-linking user_id in store_members:", linkErr);
    }

    // 2. Récupérer toutes les adhésions de l'utilisateur
    const { data: memberships, error: memberErr } = await admin
      .from("store_members")
      .select("id, owner_id, role, is_active, status")
      .or(`user_id.eq.${user.id},email.eq.${userEmail},user_email.eq.${userEmail}`);

    if (memberErr) {
      console.warn("Error checking store memberships:", memberErr);
    }

    // Un membre n'est ACTIF que s'il a explicitement accepté l'invitation (status = 'active' et is_active = true)
    const activeMember = (memberships || []).find(
      (m: any) => m.is_active === true && String(m.status || "").toLowerCase() === "active"
    );

    const pendingInvites = (memberships || []).filter(
      (m: any) => String(m.status || "").toLowerCase() === "invited"
    );

    // 3. Vérifier si l'utilisateur possède des boutiques
    const { count: storeCount, error: storeErr } = await admin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (storeErr) {
      console.warn("Error checking store ownership:", storeErr);
    }

    const hasStores = Boolean(storeCount && storeCount > 0);

    // Cas 1 : Utilisateur confirmateur pur (sans boutique propre) avec adhésion acceptée
    if (activeMember && !hasStores) {
      return NextResponse.json({
        role: "member",
        isOwner: false,
        isMember: true,
        ownerId: activeMember.owner_id,
        memberId: activeMember.id,
        memberRole: activeMember.role || "support",
        hasPendingInvitations: pendingInvites.length > 0,
      });
    }

    // Cas 2 : Propriétaire ayant ses propres boutiques (et potentiellement membre actif d'un autre call center)
    if (hasStores) {
      return NextResponse.json({
        role: activeMember ? "member_and_owner" : "owner",
        isOwner: true,
        isMember: Boolean(activeMember),
        ownerId: user.id,
        memberId: activeMember?.id || null,
        memberRole: activeMember?.role || null,
        memberOwnerId: activeMember?.owner_id || null,
        hasPendingInvitations: pendingInvites.length > 0,
      });
    }

    // Cas 3 : Nouvel utilisateur sans boutique ni adhésion active
    return NextResponse.json({
      role: "owner",
      isOwner: true,
      isMember: false,
      ownerId: user.id,
      hasPendingInvitations: pendingInvites.length > 0,
    });
  } catch (err: any) {
    console.error("Error in /api/user/role:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
