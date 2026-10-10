import { getAdminClient } from "./api-auth";

export interface PlanLimits {
  plan: "free" | "pro" | "business";
  planName: string;
  isActive: boolean;
  storesLimit: number; // 1 for free, 5 for pro, -1 for business (unlimited)
  productsLimit: number; // 10 for free, -1 for pro/business (unlimited)
  canUseTeam: boolean; // only business
  canUseCustomDomain: boolean; // pro & business
  canUseAiUnlimited: boolean; // pro & business
}

export const PLAN_CONFIGS: Record<string, PlanLimits> = {
  free: {
    plan: "free",
    planName: "Gratuit",
    isActive: true,
    storesLimit: 1,
    productsLimit: 10,
    canUseTeam: false,
    canUseCustomDomain: false,
    canUseAiUnlimited: false,
  },
  pro: {
    plan: "pro",
    planName: "Pro",
    isActive: true,
    storesLimit: 5,
    productsLimit: -1,
    canUseTeam: false,
    canUseCustomDomain: true,
    canUseAiUnlimited: true,
  },
  business: {
    plan: "business",
    planName: "Business",
    isActive: true,
    storesLimit: -1,
    productsLimit: -1,
    canUseTeam: true,
    canUseCustomDomain: true,
    canUseAiUnlimited: true,
  },
};

export function getEffectivePlan(
  plan?: string | null,
  expiresAt?: string | null
): PlanLimits {
  let cleanPlan = (plan || "free").toLowerCase().trim();
  if (cleanPlan !== "free" && expiresAt) {
    try {
      const expDate = new Date(expiresAt);
      if (!isNaN(expDate.getTime()) && expDate.getTime() < Date.now()) {
        cleanPlan = "free"; // Plan expiré, rétrogradation automatique
      }
    } catch {
      // Ignorer si format invalide
    }
  }

  const found = PLAN_CONFIGS[cleanPlan];
  return found ?? PLAN_CONFIGS.free!;
}

export async function getUserPlan(
  userId: string,
  adminClient = getAdminClient()
): Promise<PlanLimits> {
  try {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", userId)
      .single();

    return getEffectivePlan(profile?.plan, profile?.plan_expires_at);
  } catch (err) {
    console.warn("getUserPlan fallback to free:", err);
    return PLAN_CONFIGS.free!;
  }
}
