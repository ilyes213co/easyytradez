import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdminClient();

    // 1. Vérifier si l'utilisateur possède des boutiques
    const { count: storeCount, error: storeErr } = await admin
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (storeErr) {
      console.warn("Error checking store ownership:", storeErr);
    }

    if (storeCount && storeCount > 0) {
      return NextResponse.json({
        role: "owner",
        isOwner: true,
        isMember: false,
        ownerId: user.id,
      });
    }

    // 2. Si aucune boutique possédée, vérifier s'il est membre actif d'une équipe
    const userEmail = (user.email || "").toLowerCase().trim();
    const { data: memberships, error: memberErr } = await admin
      .from("store_members")
      .select("id, owner_id, role, is_active, status")
      .or(`user_id.eq.${user.id},email.eq.${userEmail},user_email.eq.${userEmail}`);

    if (memberErr) {
      console.warn("Error checking store memberships:", memberErr);
    }

    const activeMember = (memberships || []).find(
      (m: any) => m.is_active !== false && (m.status === "active" || m.status === "invited" || !m.status)
    );

    if (activeMember) {
      return NextResponse.json({
        role: "member",
        isOwner: false,
        isMember: true,
        ownerId: activeMember.owner_id,
        memberId: activeMember.id,
        memberRole: activeMember.role || "support",
      });
    }

    // 3. Nouvel utilisateur sans boutique ni équipe = compte propriétaire standard
    return NextResponse.json({
      role: "owner",
      isOwner: true,
      isMember: false,
      ownerId: user.id,
    });
  } catch (err: any) {
    console.error("Error in /api/user/role:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
