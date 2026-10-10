import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { getEffectivePlan, getUserPlan } from "@/lib/plan-limits";
import { PLANS_PRICING } from "@/lib/slickpay";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { detail: "Non authentifié" },
        { status: 401 }
      );
    }

    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, plan, plan_expires_at, created_at, updated_at")
      .eq("id", user.id)
      .single();

    const planLimits = await getUserPlan(user.id, admin);
    const expiresAt = profile?.plan_expires_at || null;
    let daysRemaining: number | null = null;
    let isActive = true;

    if (expiresAt) {
      try {
        const expDate = new Date(expiresAt);
        const now = new Date();
        const diffMs = expDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (diffMs < 0 && planLimits.plan !== "free") {
          isActive = false;
        }
      } catch (e) {
        console.warn("Date parsing error:", e);
      }
    }

    const planInfo = PLANS_PRICING[planLimits.plan] || PLANS_PRICING.free;

    return NextResponse.json({
      user_id: user.id,
      plan: planLimits.plan,
      plan_name: planLimits.planName,
      is_active: isActive,
      expires_at: expiresAt,
      days_remaining: daysRemaining,
      stores_limit: planLimits.storesLimit,
      products_limit: planLimits.productsLimit,
      can_use_team: planLimits.canUseTeam,
      can_use_custom_domain: planLimits.canUseCustomDomain,
    });
  } catch (err: any) {
    console.error("GET /api/payment/status error:", err);
    return NextResponse.json(
      { detail: err.message || "Erreur récupération statut abonnement" },
      { status: 500 }
    );
  }
}
