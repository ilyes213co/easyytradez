import { useState, useEffect } from "react";
import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

export async function getOwnedStores(): Promise<Store[]> {
  const stores = await storesApi.getAll();
  if (!Array.isArray(stores)) return [];
  // Sort newest first
  return [...stores].sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function resolveOwnedStore(preferredStoreId?: string | null): Promise<Store | null> {
  const stores = await getOwnedStores();
  if (!stores.length) return null;

  // 1. Explicit preference from caller
  if (preferredStoreId) {
    const preferred = stores.find((store) => store.id === preferredStoreId);
    if (preferred) return preferred;
  }

  // 2. From localStorage in client browser
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("active_store_id");
    if (saved) {
      const match = stores.find((store) => store.id === saved);
      if (match) return match;
    }
  }

  // 3. Fallback to newest store
  return stores[0] ?? null;
}

export function useCurrentStore() {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    resolveOwnedStore().then((st) => {
      if (mounted) {
        setCurrentStore(st);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { currentStore, loading, setCurrentStore };
}
