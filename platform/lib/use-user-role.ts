"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";

export interface UserRoleData {
  role: "owner" | "member" | "member_and_owner";
  isOwner: boolean;
  isMember: boolean;
  ownerId?: string | null;
  memberId?: string | null;
  memberRole?: string | null;
  hasPendingInvitations?: boolean;
  isLoading: boolean;
  refetch: () => void;
}

const DEFAULT_ROLE: UserRoleData = {
  role: "owner",
  isOwner: true,
  isMember: false,
  ownerId: null,
  memberId: null,
  memberRole: null,
  hasPendingInvitations: false,
  isLoading: false,
  refetch: () => {},
};

export function useUserRole(): UserRoleData {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_ROLE;
      try {
        const res = await fetch("/api/user/role");
        if (!res.ok) return DEFAULT_ROLE;
        return await res.json();
      } catch (err) {
        console.warn("Could not fetch user role:", err);
        return DEFAULT_ROLE;
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  if (isLoading || !data) {
    return {
      ...DEFAULT_ROLE,
      isLoading,
      refetch,
    };
  }

  return {
    role: data.role || "owner",
    isOwner: data.isOwner ?? true,
    isMember: data.isMember ?? false,
    ownerId: data.ownerId || null,
    memberId: data.memberId || null,
    memberRole: data.memberRole || null,
    hasPendingInvitations: Boolean(data.hasPendingInvitations),
    isLoading: false,
    refetch,
  };
}
