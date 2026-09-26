
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "@/types/supabase.generated";

export type { Json } from "@/types/supabase.generated";
export type Database = GeneratedDatabase;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PaymentSettings = {
  cod_enabled?: boolean;
  baridimob_enabled?: boolean;
  baridimob_rip?: string;
  baridimob_name?: string;
  stripe_enabled?: boolean;
  stripe_public_key?: string;
};

export type Store = Database["public"]["Tables"]["stores"]["Row"] & {
  whatsapp_number?: string | null;
  custom_domain?: string | null;
  facebook_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  payment_settings?: PaymentSettings | null;
};

export type ProductVariant = {
  id: string;
  name: string;
  price?: number;
  stock?: number;
  sku?: string;
};

export type ProductUpsell = {
  product_id: string;
  name?: string;
  price?: number;
  discount_price?: number;
  image?: string;
};

export type Product = Omit<Database["public"]["Tables"]["products"]["Row"], "images"> & {
  images: string[];
  stock?: number;
  compare_price?: number | null;
  tags: string[];
  sku?: string | null;
  variants?: ProductVariant[] | null;
  upsells?: ProductUpsell[] | null;
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

export type StoreMember = {
  id: string;
  store_id: string;
  user_email: string;
  role: "admin" | "manager" | "viewer";
  status: "active" | "invited";
  created_at: string;
};

export function isValidSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host.includes("your-project") || host === "placeholder.supabase.co") return false;
    // Catch common typos like .coy or missing dots
    if (host.endsWith(".coy") || !host.includes(".")) return false;
    // If it's a Supabase cloud domain, ensure it ends with .supabase.co
    if (host.includes("supabase") && !host.endsWith(".supabase.co") && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function extractSupabaseRef(url?: string): string | null {
  if (!isValidSupabaseUrl(url)) return null;
  try {
    const host = new URL(url!.trim()).hostname;
    const parts = host.split(".");
    const part = parts[0];
    return parts.length >= 3 && part ? part : null;
  } catch {
    return null;
  }
}

export function purgeStaleAuthSessions(currentRef?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && (key.endsWith("-auth-token") || key.endsWith("-auth-token-code-verifier"))) {
        // If currentRef is provided, remove any tokens not matching currentRef
        if (!currentRef || !key.startsWith(`sb-${currentRef}-`)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => {
      console.warn(`[StoreGen Auth] Purged stale auth token key from storage: ${k}`);
      window.localStorage.removeItem(k);
    });
  } catch (err) {
    console.error("[StoreGen Auth] Failed to purge storage keys:", err);
  }
}

// This file has no next/headers import, so it is safe in client components.
let _browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (_browserClient) return _browserClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const isConfigValid = isValidSupabaseUrl(rawUrl) && Boolean(rawKey);
  const activeRef = isConfigValid ? extractSupabaseRef(rawUrl) : null;

  if (typeof window !== "undefined") {
    if (!isConfigValid) {
      console.warn(
        "[StoreGen] ⚠️ Configuration Supabase invalide ou manquante. " +
        "Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans platform/.env.local."
      );
      // Clean all stale Supabase session tokens to prevent retry loops on unconfigured environments
      purgeStaleAuthSessions(null);
    } else if (activeRef) {
      // Clean any tokens belonging to other projects (e.g. old or paused project IDs)
      purgeStaleAuthSessions(activeRef);
    }
  }

  const url = isConfigValid ? rawUrl! : "https://placeholder.supabase.co";
  const key = isConfigValid ? rawKey! : "placeholder-anon-key";

  // @supabase/ssr runtime works, but its current d.ts can infer `never` schema.
  // Cast to SupabaseClient<Database> to keep strict typed `.from(...)` calls.
  _browserClient = createBrowserClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: isConfigValid,
      detectSessionInUrl: true,
    },
  }) as unknown as SupabaseClient<Database>;

  return _browserClient;
}

export function createClient() {
  return getSupabaseBrowserClient();
}
