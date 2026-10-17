"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UserPlanData {
  plan: "free" | "pro" | "business";
  planName: string;
  isActive: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isFree: boolean;
  storesLimit: number;
  productsLimit: number;
  canUseTeam: boolean;
  canUseCustomDomain: boolean;
  canUseBulkShipping: boolean;
  canUseAllThemes: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  isLoading: boolean;
  refetch: () => void;
}

const DEFAULT_PLAN: UserPlanData = {
  plan: "free",
  planName: "Gratuit",
  isActive: true,
  isPro: false,
  isBusiness: false,
  isFree: true,
  storesLimit: 1,
  productsLimit: 10,
  canUseTeam: false,
  canUseCustomDomain: false,
  canUseBulkShipping: false,
  canUseAllThemes: false,
  expiresAt: null,
  daysRemaining: null,
  isLoading: false,
  refetch: () => {},
};

export function useUserPlan(): UserPlanData {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-plan-status"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/payment/status");
        return res.data;
      } catch (err) {
        console.warn("Could not fetch user plan status:", err);
        return null;
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading || !data) {
    return {
      ...DEFAULT_PLAN,
      isLoading,
      refetch,
    };
  }

  const rawPlan = (data.plan || "free").toLowerCase().trim();
  const plan: "free" | "pro" | "business" =
    rawPlan === "business" ? "business" : rawPlan === "pro" ? "pro" : "free";

  const isPro = plan === "pro" || plan === "business";
  const isBusiness = plan === "business";
  const isFree = plan === "free";

  return {
    plan,
    planName: data.plan_name || (isBusiness ? "Business" : isPro ? "Pro" : "Gratuit"),
    isActive: Boolean(data.is_active ?? true),
    isPro,
    isBusiness,
    isFree,
    storesLimit: data.stores_limit ?? (isBusiness ? -1 : isPro ? 5 : 1),
    productsLimit: data.products_limit ?? (isPro ? -1 : 10),
    canUseTeam: Boolean(data.can_use_team ?? isBusiness),
    canUseCustomDomain: Boolean(data.can_use_custom_domain ?? isPro),
    canUseBulkShipping: Boolean(data.can_use_bulk_shipping ?? isPro),
    canUseAllThemes: Boolean(data.can_use_all_themes ?? isPro),
    expiresAt: data.expires_at || null,
    daysRemaining: data.days_remaining ?? null,
    isLoading: false,
    refetch,
  };
}
