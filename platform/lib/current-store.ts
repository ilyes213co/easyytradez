import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

export async function getOwnedStores(): Promise<Store[]> {
  return storesApi.getAll();
}

export async function resolveOwnedStore(preferredStoreId?: string | null): Promise<Store | null> {
  const stores = await getOwnedStores();
  if (!stores.length) return null;

  if (preferredStoreId) {
    const preferred = stores.find((store) => store.id === preferredStoreId);
    if (preferred) return preferred;
  }

  return stores[0] ?? null;
}
