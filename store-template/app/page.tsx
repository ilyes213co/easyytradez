/**
 * Store Template — Preview page
 *
 * This page is used in two ways:
 * 1. Live preview in the dashboard (iframe at /preview?store_id=xxx)
 * 2. The base for the generated static HTML that gets deployed per store
 *
 * For deployed stores, the AI generates a standalone index.html
 * using the AIStoreGenerator — this template serves as the preview only.
 */

import { createClient } from "@supabase/supabase-js";
import type { Store, Product } from "./types";
import StoreShell from "../components/store/StoreShell";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getStoreData(storeId: string | null, slug: string | null) {
  if (!storeId && !slug) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const query = supabase.from("stores").select("*");
  const result = storeId
    ? await query.eq("id", storeId).single()
    : await query.eq("slug", slug!).eq("status", "published").single();

  if (result.error || !result.data) return null;

  const store = result.data as Store;
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .order("position");

  return { store, products: (products ?? []) as Product[] };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface SearchParams { store_id?: string; slug?: string; [key: string]: string | undefined }

export default async function StorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const storeId = searchParams.store_id ?? null;
  const slug    = searchParams.slug ?? null;
  const data    = await getStoreData(storeId, slug);

  if (!data) {
    return (
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"sans-serif",color:"#666" }}>
        <div style={{ textAlign:"center" }}>
          <h1 style={{ fontSize:"24px",marginBottom:"8px" }}>Boutique introuvable</h1>
          <p>Cette boutique n&apos;existe pas ou n&apos;est pas encore publiée.</p>
        </div>
      </div>
    );
  }

  return <StoreShell store={data.store} products={data.products} />;
}
