import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "@/types/supabase.generated";

export type { Json } from "@/types/supabase.generated";
export type Database = GeneratedDatabase;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Store = Database["public"]["Tables"]["stores"]["Row"] & {
  whatsapp_number?: string | null;
};
export type Product = Omit<Database["public"]["Tables"]["products"]["Row"], "images"> & {
  images: string[];
  stock?: number;
  compare_price?: number | null;
  tags: string[];
};
export type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  total: number;
  subtotal: number;
  shipping_address?: string | null;
};
export type DeliveryZone = Database["public"]["Tables"]["delivery_zones"]["Row"];
export type PushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type StoreAnalyticEvent = Database["public"]["Tables"]["store_analytics"]["Row"];
export type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"];

// This file has no next/headers import, so it is safe in client components.
let _browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (_browserClient) return _browserClient;
  // @supabase/ssr runtime works, but its current d.ts can infer `never` schema.
  // Cast to SupabaseClient<Database> to keep strict typed `.from(...)` calls.
  _browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as unknown as SupabaseClient<Database>;
  return _browserClient;
}

export function createClient() {
  return getSupabaseBrowserClient();
}
