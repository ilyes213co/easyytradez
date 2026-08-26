import { getSupabaseServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Store, Product } from "@/lib/supabase";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}

// ─── Store header ─────────────────────────────────────────────────────────────

function StoreHeader({ store }: { store: Store }) {
  return (
    <div className="relative">
      {/* Cover */}
      <div className="h-44 sm:h-60 bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden">
        {store.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.cover_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Store identity */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12 pb-5 border-b border-stone-200">
          {/* Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white shrink-0">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-3xl font-bold text-stone-400">
                {store.name[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {store.name}
            </h1>
            {store.description && (
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">{store.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {store.city && (
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {store.city}
                </span>
              )}
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Contacter
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category filter bar ──────────────────────────────────────────────────────

function CategoryBar({ categories, active, slug }: {
  categories: string[]; active?: string; slug: string;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <Link
        href={`/${slug}`}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border ${
          !active
            ? "bg-stone-900 text-white border-stone-900"
            : "text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700 bg-white"
        }`}
      >
        Tout
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat}
          href={`/${slug}?category=${encodeURIComponent(cat)}`}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all border ${
            active === cat
              ? "bg-stone-900 text-white border-stone-900"
              : "text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700 bg-white"
          }`}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, slug }: { product: Product; slug: string }) {
  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.compare_price!) * 100)
    : 0;

  return (
    <Link href={`/${slug}/${product.slug}`} className="group block">
      <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        {/* Image */}
        <div className="aspect-square bg-stone-50 overflow-hidden relative">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-stone-200">
              📦
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && (
              <span className="rounded-lg bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                -{discountPct}%
              </span>
            )}
            {product.stock === 0 && (
              <span className="rounded-lg bg-stone-800/80 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white">
                Épuisé
              </span>
            )}
          </div>
          {/* Image count */}
          {product.images.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-lg bg-black/40 backdrop-blur-sm px-1.5 py-0.5 text-xs text-white/80">
              +{product.images.length - 1}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2 group-hover:text-stone-900 transition-colors">
            {product.name}
          </p>
          {product.category && (
            <p className="text-xs text-stone-400 mt-0.5">{product.category}</p>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-bold text-stone-900">
              {product.price.toLocaleString("fr-DZ")} DZD
            </span>
            {hasDiscount && (
              <span className="text-xs text-stone-400 line-through">
                {product.compare_price?.toLocaleString("fr-DZ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StorePage({ params, searchParams }: PageProps) {
  const { slug }       = await params;
  const { category }   = await searchParams;
  const supabase       = await getSupabaseServerClient();

  // Load store
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  // Load active products
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data: products } = await query;
  const allProducts = products ?? [];

  // Extract unique categories
  const { data: allCats } = await supabase
    .from("products")
    .select("category")
    .eq("store_id", store.id)
    .eq("status", "active")
    .not("category", "is", null);

  const categories = [...new Set((allCats ?? []).map((p) => p.category).filter(Boolean))] as string[];

  return (
    <>
      {/* Store header */}
      <StoreHeader store={store} />

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Category filters */}
        {categories.length > 0 && (
          <CategoryBar categories={categories} active={category} slug={slug} />
        )}

        {/* Products */}
        {allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-3">🛍️</span>
            <p className="text-stone-500 font-medium">
              {category ? `Aucun produit dans "${category}"` : "Aucun produit disponible"}
            </p>
            {category && (
              <Link href={`/${slug}`} className="mt-3 text-sm text-stone-400 hover:text-stone-600 underline">
                Voir tous les produits
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400">
              {allProducts.length} produit{allProducts.length !== 1 ? "s" : ""}
              {category ? ` dans "${category}"` : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {allProducts.map((product) => (
                <ProductCard key={product.id} product={product} slug={slug} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-stone-100 py-6 text-center">
        <p className="text-xs text-stone-300">
          Propulsé par{" "}
          <span className="font-semibold text-stone-400">Marchand</span>
        </p>
      </footer>
    </>
  );
}
