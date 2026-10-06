// ─── SERVER ONLY ──────────────────────────────────────────────────────────────
// Ce fichier importe next/headers — NE JAMAIS importer depuis un Client Component.
// Usage uniquement dans : Server Components, Route Handlers, Server Actions.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  // Keep SSR cookie behavior, but force stable client typing to avoid `never`.
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookie mutations are no-ops here
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}

// Re-export for middleware
export { createServerClient } from "@supabase/ssr";
export const createServerSupabaseClient = getSupabaseServerClient;
