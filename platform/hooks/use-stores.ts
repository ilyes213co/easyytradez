import { useQuery } from "@tanstack/react-query";
import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

export const STORES_QUERY_KEY = ["stores-list-all"] as const;

export function useStores() {
  return useQuery<Store[]>({
    queryKey: STORES_QUERY_KEY,
    queryFn: async () => {
      const list = await storesApi.getAll(true);
      if (!Array.isArray(list)) return [];
      return [...list].sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    staleTime: 60 * 1000, // 60 secondes de cache partagé entre toutes les pages
    gcTime: 5 * 60 * 1000,
  });
}
