import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { rebalanceOrders } from "@/lib/dispatcher";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const invitationId = body.invitation_id || body.id;
    const action = body.action; // "accept" | "reject"

    if (!invitationId) {
      return NextResponse.json({ detail: "invitation_id est requis" }, { status: 400 });
    }

    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { detail: "Action invalide. Doit être 'accept' ou 'reject'." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const userEmail = (user.email || "").toLowerCase().trim();

    // 1. Récupérer l'invitation
    const { data: invitation, error: fetchErr } = await admin
      .from("store_members")
      .select("*")
      .eq("id", invitationId)
      .maybeSingle();

    if (fetchErr || !invitation) {
      return NextResponse.json({ detail: "Invitation introuvable" }, { status: 404 });
    }

    // 2. Vérifier que l'invitation appartient bien à cet utilisateur
    const isOwnerOfInvite =
      invitation.user_id === user.id ||
      (invitation.email && invitation.email.toLowerCase().trim() === userEmail) ||
      (invitation.user_email && invitation.user_email.toLowerCase().trim() === userEmail);

    if (!isOwnerOfInvite) {
      return NextResponse.json(
        { detail: "Accès refusé. Cette invitation ne vous est pas destinée." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    if (action === "accept") {
      // 3. Accepter : passer status = 'active', is_active = true et relier user_id
      const { error: updateErr } = await admin
        .from("store_members")
        .update({
          status: "active",
          is_active: true,
          user_id: user.id,
          updated_at: nowIso,
        })
        .eq("id", invitationId);

      if (updateErr) {
        return NextResponse.json({ detail: updateErr.message }, { status: 500 });
      }

      // 4. Lancer immédiatement un rééquilibrage pour attribuer des commandes en attente
      let rebalanceInfo: any = null;
      if (invitation.owner_id) {
        try {
          rebalanceInfo = await rebalanceOrders(invitation.owner_id, admin);
        } catch (rebErr) {
          console.warn("Auto-rebalance on accept exception:", rebErr);
        }
      }

      return NextResponse.json({
        success: true,
        action: "accepted",
        message: "Bienvenue dans le Call Center ! Vos commandes attribuées sont prêtes.",
        rebalanced_count: rebalanceInfo?.rebalanced ?? 0,
      });
    } else {
      // 5. Refuser : passer status = 'inactive' et is_active = false
      const { error: updateErr } = await admin
        .from("store_members")
        .update({
          status: "inactive",
          is_active: false,
          updated_at: nowIso,
        })
        .eq("id", invitationId);

      if (updateErr) {
        return NextResponse.json({ detail: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "rejected",
        message: "Invitation refusée.",
      });
    }
  } catch (err: any) {
    console.error("POST /api/team/invitations/respond exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
