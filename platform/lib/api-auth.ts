import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "./supabase-server";

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getAuthUser(req: NextRequest) {
  // 1. Check Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const supabaseAnon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );
        const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
        if (user && !error) {
          return user;
        }
      } catch (err) {
        console.warn("api-auth: bearer token verification failed", err);
      }
    }
  }

  // 2. Check SSR cookies session
  try {
    const supabaseServer = await getSupabaseServerClient();
    const { data: { user }, error } = await supabaseServer.auth.getUser();
    if (user && !error) {
      return user;
    }
  } catch (err) {
    console.warn("api-auth: cookie session verification failed", err);
  }

  return null;
}

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getUniqueStoreSlug(baseName: string, adminClient = getAdminClient()): Promise<string> {
  const cleanBase = slugify(baseName) || "store";
  let slug = cleanBase;
  let counter = 1;

  while (true) {
    const { data } = await adminClient
      .from("stores")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) {
      return slug;
    }
    slug = `${cleanBase}-${counter}`;
    counter++;
  }
}

export async function verifyStoreOwner(storeId: string, userId: string, adminClient = getAdminClient()) {
  const { data: store, error } = await adminClient
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !store) {
    return { ok: false as const, status: 404, message: "Boutique introuvable", store: null };
  }

  if (store.owner_id !== userId) {
    return { ok: false as const, status: 403, message: "Accès refusé", store: null };
  }

  return { ok: true as const, status: 200, message: "OK", store };
}
