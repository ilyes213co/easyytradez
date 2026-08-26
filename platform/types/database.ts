// Compatibility layer for existing imports across the platform app.
export type {
  Database,
  Json,
  Profile,
  Store,
  Product,
  Order,
  StoreAnalyticEvent,
  GenerationJob,
} from "@/lib/supabase";

import type { Database } from "@/lib/supabase";

export type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];
export type StoreUpdate = Database["public"]["Tables"]["stores"]["Update"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
export type StoreAnalyticsInsert =
  Database["public"]["Tables"]["store_analytics"]["Insert"];
export type StoreAnalyticsUpdate =
  Database["public"]["Tables"]["store_analytics"]["Update"];
export type GenerationJobInsert =
  Database["public"]["Tables"]["generation_jobs"]["Insert"];
export type GenerationJobUpdate =
  Database["public"]["Tables"]["generation_jobs"]["Update"];
