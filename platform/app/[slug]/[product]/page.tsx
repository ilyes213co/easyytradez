import { getSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Store, Product } from "@/lib/supabase";
import Link from "next/link";
import { OrderForm } from "./OrderForm";
import { ProductGallery } from "@/components/ui/ProductGallery";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string; product: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, product: productSlug } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: store } = await supabase
    .from("stores").select("id, name").eq("slug", slug).single();

  const s = store as any;
  if (!s) return { title: "Produit introuvable" };

  const { data: product } = await supabase
    .from("products").select("name, description, images, price")
    .eq("store_id", s.id).eq("slug", productSlug).single();

  const p = product as any;
  if (!p) return { title: "Produit introuvable" };

  const firstImage = Array.isArray(p.images) && p.images[0]
    ? typeof p.images[0] === "string" ? p.images[0] : p.images[0].url
    : null;

  return {
    title: `${p.name} — ${s.name}`,
    description: p.description ?? `${p.name} à ${p.price?.toLocaleString()} DZD`,
    openGraph: {
      title: `${p.name} — ${s.name}`,
      description: p.description ?? undefined,
      images: firstImage ? [{ url: firstImage }] : [],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: PageProps) {
  const { slug, product: productSlug } = await params;
  const supabase = await getSupabaseServerClient();

  // Load store
  const { data: storeRaw } = await supabase
    .from("stores").select("*").eq("slug", slug).eq("status", "active").single();

  const store = storeRaw as unknown as Store | null;
  if (!store) notFound();

  // Load product
  const { data: productRaw } = await supabase
    .from("products").select("*")
    .eq("store_id", store.id)
    .eq("slug", productSlug)
    .eq("status", "active")
    .single();

  const rawP = productRaw as any;
  if (!rawP) notFound();

  const images: string[] = Array.isArray(rawP.images)
    ? rawP.images.map((img: any) => typeof img === "string" ? img : img?.url || "").filter(Boolean)
    : [];

  const product: Product = {
    ...rawP,
    images,
    price: Number(rawP.price ?? 0),
    compare_price: rawP.compare_price ?? rawP.original_price ?? null,
    stock: Number(rawP.stock ?? rawP.stock_quantity ?? 0),
    tags: Array.isArray(rawP.tags) ? rawP.tags : [],
  };

  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_price!) * 100)
    : 0;
  const outOfStock = (product.stock ?? 0) === 0;

  return (
    <>
      {/* Top nav */}
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Logo mini */}
          <Link href={`/${slug}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
                {store.name[0]}
              </div>
            )}
            <span className="text-sm font-semibold text-stone-700">{store.name}</span>
          </Link>

          <svg className="text-stone-300 mx-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm text-stone-400 truncate max-w-[200px]">{product.name}</span>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Left: Images ────────────────────────────────────────────── */}
          <div>
            <ProductGallery images={product.images} alt={product.name} />
          </div>

          {/* ── Right: Info + Form ──────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Category */}
            {product.category && (
              <Link
                href={`/${slug}?category=${encodeURIComponent(product.category)}`}
                className="inline-flex items-center rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500 hover:border-stone-400 transition-colors"
              >
                {product.category}
              </Link>
            )}

            {/* Name */}
            <h1
              className="text-2xl font-bold text-stone-900 leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-stone-900">
                {product.price.toLocaleString("fr-DZ")} DZD
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-stone-400 line-through">
                    {product.compare_price?.toLocaleString("fr-DZ")}
                  </span>
                  <span className="rounded-full bg-red-100 text-red-600 text-sm font-bold px-2.5 py-0.5">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${outOfStock ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`text-sm font-medium ${outOfStock ? "text-red-500" : "text-emerald-600"}`}>
                {outOfStock ? "Épuisé" : `En stock (${product.stock} disponible${product.stock !== 1 ? "s" : ""})`}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3">
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-stone-100" />

            {/* Order form (client component) */}
            <OrderForm
              product={product}
              store={store}
              disabled={outOfStock}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-stone-100 py-6 text-center">
        <p className="text-xs text-stone-300">
          Propulsé par <span className="font-semibold text-stone-400">Marchand</span>
        </p>
      </footer>
    </>
  );
}
