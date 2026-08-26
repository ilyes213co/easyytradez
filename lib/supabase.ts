import { createBrowserClient } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

// ─── Database Types ───────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          whatsapp: string | null;
          avatar_url: string | null;
          role: "merchant" | "admin" | "customer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          whatsapp?: string | null;
          avatar_url?: string | null;
          role?: "merchant" | "admin" | "customer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          whatsapp?: string | null;
          avatar_url?: string | null;
          role?: "merchant" | "admin" | "customer";
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          currency: string;
          status: "active" | "inactive" | "suspended";
          whatsapp_number: string | null;
          address: string | null;
          city: string | null;
          country: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          currency?: string;
          status?: "active" | "inactive" | "suspended";
          whatsapp_number?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          currency?: string;
          status?: "active" | "inactive" | "suspended";
          whatsapp_number?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          compare_price: number | null;
          images: string[];
          category: string | null;
          tags: string[];
          stock: number;
          status: "active" | "draft" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          compare_price?: number | null;
          images?: string[];
          category?: string | null;
          tags?: string[];
          stock?: number;
          status?: "active" | "draft" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          compare_price?: number | null;
          images?: string[];
          category?: string | null;
          tags?: string[];
          stock?: number;
          status?: "active" | "draft" | "archived";
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          items: Json;
          subtotal: number;
          total: number;
          status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status: "pending" | "paid" | "refunded";
          shipping_address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          customer_email?: string | null;
          items: Json;
          subtotal: number;
          total: number;
          status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status?: "pending" | "paid" | "refunded";
          shipping_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          customer_name?: string;
          customer_phone?: string;
          customer_email?: string | null;
          items?: Json;
          subtotal?: number;
          total?: number;
          status?: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
          payment_status?: "pending" | "paid" | "refunded";
          shipping_address?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ─── Convenience type aliases ─────────────────────────────────────────────────

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];

// ─── Browser Client (singleton) ───────────────────────────────────────────────

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}

// ─── Server Client (per-request, uses cookies) ────────────────────────────────

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component – mutations are no-ops
          }
        },
      },
    }
  );
}

// ─── Server Client for Middleware (requires request/response) ─────────────────

export { createServerClient };
