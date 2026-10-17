import { getAdminClient } from "./api-auth";
import { getEffectivePlan, PLAN_CONFIGS, type PlanLimits } from "./plan-limits";

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
