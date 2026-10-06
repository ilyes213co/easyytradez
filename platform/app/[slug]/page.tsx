import { getAdminClient } from "@/lib/api-auth";
import { notFound } from "next/navigation";
import type { Store as DbStore, Product as DbProduct } from "@/lib/supabase";
import ProductPage, { DEFAULT_WILAYAS } from "@/components/ProductPage";
import FunnelPage from "@/components/FunnelPage";
import type { Product as GenericProduct, Store as GenericStore, Wilaya } from "@/types/product";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams: Promise<{ category?: string }> | { category?: string };
}

export default async function StoreOrFunnelPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = resolvedParams?.slug;
  const category = resolvedSearchParams?.category;
  if (!slug) notFound();

  const supabase = getAdminClient();

  // Load store
  const { data: rawStore } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const store = rawStore as unknown as (DbStore & { type?: string }) | null;
  if (!store || store.status === "suspended") notFound();

  // Determine if this store is a single-product funnel or multi-product boutique
  const isFunnel =
    store.type === "funnel" ||
    (store as any).seo_metadata?.type === "funnel";

  // Load products
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .in("status", ["active", "published"])
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data: rawProducts } = await query;
  const products: GenericProduct[] = ((rawProducts ?? []) as any[]).map((p) => ({
    id: p.id,
    store_id: p.store_id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price ?? 0),
    original_price: p.compare_price ?? p.original_price ?? null,
    stock_quantity: Number(p.stock ?? p.stock_quantity ?? 0),
    images: Array.isArray(p.images)
      ? p.images.map((img: any) => (typeof img === "string" ? img : img?.url || "")).filter(Boolean)
      : [],
    options: p.options || [],
    category: p.category,
    is_featured: p.is_featured,
  }));

  // ─── CAS 1 : FUNNEL MONO-PRODUIT ─────────────────────────────────────────────
  if (isFunnel) {
    const starProduct = products[0];

    if (!starProduct) {
      return (
        <div className="pd-shell min-h-[70vh] flex flex-col items-center justify-center text-center py-24">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h1 className="text-2xl font-bold font-['Anton',Impact,sans-serif] uppercase mb-2">
            {store.name}
          </h1>
          <p className="text-sm text-[var(--muted)] max-w-md">
            Ce funnel de vente est actuellement en cours de préparation. Le produit principal sera bientôt disponible à la commande.
          </p>
        </div>
      );
    }

    const genericStore: GenericStore = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      theme: (store.theme as any) || "crimson",
      brand_accent: store.brand_accent,
      logo_url: store.logo_url,
      cover_url: store.cover_url,
      slogan: store.slogan,
      whatsapp_phone: store.whatsapp_phone || undefined,
      phone: (store as any).phone,
      city: store.city,
      type: (store as any).type,
      facebook_pixel_id: (store as any).facebook_pixel_id,
      content_overrides: (store as any).content_overrides || {},
    };

    // Load custom shipping rates for this store in real time
    const { data: rawRates } = await supabase
      .from("shipping_rates")
      .select("wilaya_id, price_home, price_desk, eta, wilayas(name)")
      .eq("store_id", store.id)
      .order("wilaya_id", { ascending: true });

    const storeWilayas: Wilaya[] = (rawRates && rawRates.length > 0)
      ? (rawRates as any[]).map((r) => ({
          id: r.wilaya_id,
          code: String(r.wilaya_id).padStart(2, "0"),
          name: r.wilayas?.name || `Wilaya ${r.wilaya_id}`,
          price_home: r.price_home,
          price_desk: r.price_desk,
          eta: r.eta || "2-4 j",
        }))
      : DEFAULT_WILAYAS;

    return (
      <FunnelPage
        store={genericStore}
        product={starProduct}
        theme={(store.theme as any) || "crimson"}
        wilayas={storeWilayas}
        storePixelId={(store as any).facebook_pixel_id}
        isEditable={false}
      />
    );
  }

  // ─── CAS 2 : BOUTIQUE MULTI-PRODUITS (CATALOGUE) ─────────────────────────────

  // Extract unique categories
  const { data: allCats } = await supabase
    .from("products")
    .select("category")
    .eq("store_id", store.id)
    .eq("status", "active")
    .not("category", "is", null);

  const categories = [
    ...new Set(((allCats ?? []) as any[]).map((p) => p.category).filter(Boolean)),
  ] as string[];

  const formatPriceDa = (amount: number) => {
    return new Intl.NumberFormat("fr-DZ").format(amount) + " DA";
  };

  return (
    <div className="storefront-wrapper min-h-screen" data-theme={store.theme || "crimson"}>
      {/* 1. Header Navigation */}
      <nav className="st-nav">
        <div className="st-nav__in">
          <Link href={`/${slug}`} className="st-nav__brand">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.logo_url} alt={store.name} className="h-8 object-contain" />
            ) : (
              store.name
            )}
          </Link>

          {categories.length > 0 && (
            <ul className="st-nav__links">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat}>
                  <Link href={`/${slug}?category=${encodeURIComponent(cat)}`}>{cat}</Link>
                </li>
              ))}
            </ul>
          )}

          <div className="st-nav__actions">
            {store.whatsapp_phone && (
              <a
                href={`https://wa.me/${store.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="st-nav__cart"
              >
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="st-hero">
        <div className="st-hero__in">
          <div>
            <p className="st-hero__kicker">Sélection officielle</p>
            <h1 className="st-hero__title">
              {store.description || "Des créations uniques pensées pour vous."}
            </h1>
            <p className="st-hero__sub">
              Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d&apos;Algérie.
            </p>
            <a href="#catalogue" className="st-hero__cta">
              Découvrir la collection
            </a>
          </div>

          <div className="st-hero__art">
            {store.cover_url || products[0]?.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.cover_url || products[0]?.images?.[0]}
                alt={store.name}
              />
            ) : (
              <svg viewBox="0 0 400 400" role="img" aria-label="Vitrine">
                <rect width="400" height="400" fill="var(--stage)" />
                <circle cx="200" cy="196" r="104" fill="var(--accent)" opacity="0.3" />
                <rect x="152" y="118" width="96" height="150" rx="10" fill="var(--accent)" />
              </svg>
            )}
          </div>
        </div>
      </header>

      {/* 3. Categories Row */}
      {categories.length > 0 && (
        <section className="st-cats">
          <div className="st-cats__in">
            <h2>Catégories</h2>
            <div className="st-cat-row">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/${slug}?category=${encodeURIComponent(cat)}`}
                  className="st-cat"
                >
                  <span className="st-cat__art">
                    <span className="text-xl font-bold text-[var(--accent)]">
                      {cat.slice(0, 2).toUpperCase()}
                    </span>
                  </span>
                  <span className="st-cat__label">{cat}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Products Grid */}
      <section id="catalogue" className="st-grid">
        <div className="st-grid__in">
          <div className="st-grid__head">
            <h2>{category ? `Rayon : ${category}` : "Nos Produits"}</h2>
            {category && (
              <Link href={`/${slug}`}>Tous les articles →</Link>
            )}
          </div>

          {products.length === 0 ? (
            <div className="py-16 text-center text-[var(--muted)]">
              <p className="text-sm">Aucun produit disponible dans ce rayon.</p>
              <Link href={`/${slug}`} className="text-xs text-[var(--accent)] underline mt-2 block">
                Voir tout le catalogue
              </Link>
            </div>
          ) : (
            <div className="st-cards">
              {products.map((p) => {
                const img = p.images?.[0];
                return (
                  <Link
                    key={p.id}
                    href={`/${slug}/${p.slug || p.id}`}
                    className="st-card"
                  >
                    <span className="st-card__art">
                      {p.category && (
                        <span className="st-card__cat">{p.category}</span>
                      )}
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={p.name} />
                      ) : (
                        <svg viewBox="0 0 400 400" role="img" aria-label={p.name}>
                          <rect width="400" height="400" fill="var(--stage)" />
                          <circle cx="200" cy="196" r="80" fill="var(--accent)" opacity="0.3" />
                        </svg>
                      )}
                    </span>
                    <span className="st-card__name">{p.name}</span>
                    <span className="st-card__price">{formatPriceDa(p.price)}</span>
                    {p.options && p.options.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap min-h-[20px] my-1">
                        {p.options.map((opt, oIdx) => {
                          if (opt.type === "swatch") {
                            return (
                              <div key={oIdx} className="flex items-center gap-1">
                                {opt.values?.slice(0, 5).map((v, vIdx) => (
                                  <span
                                    key={vIdx}
                                    title={v.label}
                                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-sm inline-block"
                                    style={{ backgroundColor: v.hex || "#3b82f6" }}
                                  />
                                ))}
                                {opt.values && opt.values.length > 5 && (
                                  <span className="text-[10px] text-[var(--muted)]">
                                    +{opt.values.length - 5}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          const labels = opt.values?.map((v) => v.label).filter(Boolean) || [];
                          if (labels.length === 0) return null;
                          return (
                            <span
                              key={oIdx}
                              className="text-[11px] text-[var(--muted)] bg-[var(--stage)] px-2 py-0.5 rounded-full"
                            >
                              {opt.name}: {labels.slice(0, 3).join(", ")}
                              {labels.length > 3 ? ` +${labels.length - 3}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <span className="pd-btn pd-btn--buy text-xs py-2 px-3 mt-1 text-center block">
                      Commander
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Trust Band */}
      <div className="st-band">
        <ul className="st-band__in">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="19" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            <span>
              <b>Paiement à la livraison.</b> Aucun paiement anticipé, vérification sur place.
            </span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h11v10H3z" />
              <path d="M14 9h4l3 3v4h-7z" />
              <circle cx="7" cy="18.5" r="1.7" />
              <circle cx="17.5" cy="18.5" r="1.7" />
            </svg>
            <span>
              <b>58 Wilayas livrées</b> à domicile ou en point relais (Stop Desk).
            </span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4.5V9h4.5" />
            </svg>
            <span>
              <b>Garantie satisfaction</b> et échange facile sous 7 jours.
            </span>
          </li>
        </ul>
      </div>

      {/* 6. Footer */}
      <footer className="pd-foot">
        <div className="pd-shell">
          {store.name} — Algérie 🇩🇿 · Commandes 7j/7 · Paiement sécurisé à la réception
        </div>
      </footer>
    </div>
  );
}
