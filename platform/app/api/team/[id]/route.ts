import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { getUserPlan } from "@/lib/plan-limits-server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { id: memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ detail: "ID du membre requis" }, { status: 400 });
    }

    const admin = getAdminClient();
    const userPlan = await getUserPlan(user.id, admin);
    if (!userPlan.canUseTeam) {
      return NextResponse.json(
        {
          detail: "PLAN_LIMIT_REACHED",
          code: "PLAN_LIMIT_REACHED",
          message: "La modification des membres d'équipe est réservée au Pack Business.",
          limit_type: "team",
        },
        { status: 403 }
      );
    }

    const { error } = await admin
      .from("store_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.warn("Delete store_member error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/team/[id] error:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
