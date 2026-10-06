import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

export async function getOwnedStores(type?: "boutique" | "funnel"): Promise<Store[]> {
  return storesApi.getAll(type);
}

export async function resolveOwnedStore(
  preferredStoreId?: string | null,
  type?: "boutique" | "funnel"
): Promise<Store | null> {
  const stores = await getOwnedStores(type);
  if (!stores.length) return null;

  if (preferredStoreId) {
    const preferred = stores.find((store) => store.id === preferredStoreId);
    if (preferred) return preferred;
  }

  return stores[0] ?? null;
}
