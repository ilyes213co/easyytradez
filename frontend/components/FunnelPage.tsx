"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import Script from "next/script";
import type { Product, Store, Wilaya, ThemeId, CreateOrderPayload } from "@/types/product";
import { DEFAULT_WILAYAS, resolveImageUrl } from "@/components/ProductPage";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(amount)) + " DA";
}

export interface FunnelPageProps {
  product: Product;
  store: Store;
  theme?: ThemeId;
  wilayas?: Wilaya[];
  storePixelId?: string;
}

export default function FunnelPage({
  product,
  store,
  theme,
  wilayas = DEFAULT_WILAYAS,
  storePixelId,
}: FunnelPageProps) {
  const activeTheme = theme || store.theme || "crimson";
  const pixelId = storePixelId || store.facebook_pixel_id || "";

  // ─── Normalisation des images réelles (Supabase Storage / Cloudinary) ────────
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const images: string[] = useMemo(() => {
    return rawImages
      .map((img: any) => resolveImageUrl(img))
      .filter((url: string) => url.length > 0);
  }, [rawImages]);

  const hasImages = images.length > 0;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const currentImage = hasImages ? (images[selectedImageIndex] || images[0]) : null;

  // ─── Options dynamiques (swatch / chip) ───────────────────────────────────
  const initialOptions: Record<string, string> = useMemo(() => {
    const opts: Record<string, string> = {};
    if (product?.options && Array.isArray(product.options)) {
      product.options.forEach((opt) => {
        const firstAvail = opt.values.find((v) => v.available) || opt.values[0];
        if (firstAvail) opts[opt.name] = firstAvail.label;
      });
    }
    return opts;
  }, [product?.options]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialOptions);
  const [qty, setQty] = useState<number>(1);
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | "">("");
  const [shipMode, setShipMode] = useState<"domicile" | "stopdesk">("domicile");

  // Coordonnées client
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastOpen, setIsToastOpen] = useState<boolean>(false);
  const [orderDone, setOrderDone] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"desc" | "spec" | "ship">("desc");

  const orderFormRef = useRef<HTMLDivElement>(null);
  const wilayaSelectRef = useRef<HTMLSelectElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Tracking Pixel standardisé ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq && pixelId) {
      (window as any).fbq("track", "ViewContent", {
        content_name: product.name,
        content_ids: [product.id],
        content_type: "product",
        value: product.price,
        currency: "DZD",
      });
    }
  }, [pixelId, product]);

  const trackEvent = (eventName: string, data?: any) => {
    if (typeof window !== "undefined" && (window as any).fbq && pixelId) {
      (window as any).fbq("track", eventName, data);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setIsToastOpen(false);
    }, 3500);
  };

  // ─── Calcul en temps réel ─────────────────────────────────────────────────
  const selectedWilaya = wilayas.find((w) => w.id === Number(selectedWilayaId));
  const shippingCost = selectedWilaya
    ? shipMode === "domicile"
      ? selectedWilaya.price_home
      : selectedWilaya.price_desk
    : 0;

  const subtotal = (product?.price || 0) * qty;
  const total = subtotal + shippingCost;

  const discountPercent =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : 0;

  // ─── Action unique : Valider la commande ──────────────────────────────────
  const handleSingleCtaClick = () => {
    if (!selectedWilayaId) {
      orderFormRef.current?.scrollIntoView({ behavior: "smooth" });
      wilayaSelectRef.current?.focus();
      showToast("Veuillez sélectionner votre Wilaya de livraison.");
      return;
    }

    if (!customerName.trim()) {
      orderFormRef.current?.scrollIntoView({ behavior: "smooth" });
      nameInputRef.current?.focus();
      showToast("Veuillez renseigner votre nom complet.");
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      orderFormRef.current?.scrollIntoView({ behavior: "smooth" });
      phoneInputRef.current?.focus();
      showToast("Veuillez saisir un numéro de téléphone valide.");
      return;
    }

    submitOrder();
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    trackEvent("InitiateCheckout", {
      value: total,
      currency: "DZD",
      num_items: qty,
    });

    const payload: CreateOrderPayload = {
      product_id: product.id,
      options_selected: selectedOptions,
      qty,
      wilaya_id: Number(selectedWilayaId),
      ship_mode: shipMode,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim() || undefined,
      store_id: product.store_id,
    };

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const fallbackRes = await fetch(`${apiUrl}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!fallbackRes.ok) throw new Error("Échec de confirmation");
      }

      setOrderDone(true);
      trackEvent("Purchase", {
        value: total,
        currency: "DZD",
        content_name: product.name,
      });
      showToast("Commande confirmée ! Vous recevrez un appel pour valider la livraison.");
    } catch {
      showToast("Erreur lors de l'envoi. Veuillez réessayer ou vérifier votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inlineBrandingStyles: React.CSSProperties = {
    ...(store?.brand_accent
      ? ({
          "--accent": store.brand_accent,
          "--focus": store.brand_accent,
          "--accent-text": store.brand_accent,
          "--accent-soft": `color-mix(in srgb, ${store.brand_accent} 15%, transparent)`,
        } as any)
      : {}),
    ...(store?.logo_url ? ({ "--brand-logo": `url("${resolveImageUrl(store.logo_url)}")` } as any) : {}),
  };

  const productRating = (product as any).rating;
  const productReviewsCount = (product as any).reviews_count;

  return (
    <div className="pd-wrapper min-h-screen" data-theme={activeTheme} style={inlineBrandingStyles}>
      {/* ── Injection dynamique du Pixel si renseigné ── */}
      {pixelId && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* ── ANNOUNCEMENT BAR (affichée uniquement si le store a un slogan / annonce) ── */}
      {store.slogan && (
        <div className="bg-[var(--accent)] text-[var(--accent-ink)] py-2 text-center text-xs md:text-sm font-semibold tracking-wide px-4">
          {store.slogan}
        </div>
      )}

      {/* ── HEADER ZERO-DISTRACTION (AUCUN LIEN SORTANT VERS D'AUTRES PAGES) ── */}
      <header className="pd-top border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="pd-shell py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(store.logo_url)} alt={store.name} className="h-8 object-contain" />
            ) : (
              <span className="pd-brand text-lg font-bold">{store.name}</span>
            )}
          </div>
          {store.city && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[var(--accent-soft)] text-[var(--accent-text)]">
              {store.city} · Algérie
            </span>
          )}
        </div>
      </header>

      <main className="pd-shell py-8">
        <section className="pd-product">
          {/* ======================= GALERIE ======================= */}
          <div className="pd-gallery">
            <figure className="pd-stage relative overflow-hidden" style={{ minHeight: "340px" }}>
              {product.is_featured && <span className="pd-stage__flag">Meilleure Vente</span>}
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 980px) 100vw, 50vw"
                  priority
                  className="object-cover w-full h-full"
                  unoptimized={!currentImage.startsWith("http")}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[var(--muted)] p-6 text-center w-full h-full min-h-[300px]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 opacity-30 mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-xs font-medium opacity-60">Aucune photo pour ce produit</span>
                </div>
              )}
            </figure>
            {images.length > 1 && (
              <ul className="pd-thumbs">
                {images.map((img, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      className="pd-thumb relative overflow-hidden"
                      aria-current={selectedImageIndex === idx}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - aperçu ${idx + 1}`}
                        fill
                        sizes="70px"
                        className="object-cover w-full h-full"
                        unoptimized={!img.startsWith("http")}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ======================= BUY BOX / TUNNEL DIRECT ======================= */}
          <div className="pd-buybox">
            <p className="pd-vendor">{store.name}</p>
            <h1 className="pd-title">{product.name}</h1>

            {Boolean(productRating || productReviewsCount) && (
              <div className="pd-rating">
                <span className="pd-stars" aria-hidden="true">
                  {"★".repeat(Math.min(5, Math.max(1, Math.round(Number(productRating) || 5))))}
                </span>
                <span>
                  {productRating ? `${productRating}/5` : ""}
                  {productReviewsCount ? ` · ${productReviewsCount} avis clients vérifiés` : ""}
                </span>
              </div>
            )}

            <div className="pd-pricing">
              <strong className="pd-price">{formatMoney(product.price)}</strong>
              {product.original_price && product.original_price > product.price && (
                <s className="pd-was">{formatMoney(product.original_price)}</s>
              )}
              {discountPercent > 0 && <span className="pd-off">-{discountPercent}%</span>}
            </div>
            <p className="pd-taxnote">Payable en espèces à la livraison. Colis vérifiable à l&apos;arrivée.</p>

            {/* OPTIONS DU PRODUIT */}
            {product.options &&
              Array.isArray(product.options) &&
              product.options.map((opt) => (
                <div className="pd-field" key={opt.name}>
                  <p className="pd-label">
                    {opt.name} <span>{selectedOptions[opt.name] || ""}</span>
                  </p>
                  <div className="pd-opts" data-variant-group={opt.name}>
                    {opt.type === "swatch"
                      ? opt.values.map((val) => {
                          const isSelected = selectedOptions[opt.name] === val.label;
                          return (
                            <button
                              key={val.label}
                              type="button"
                              className="pd-swatch"
                              aria-pressed={isSelected}
                              aria-label={val.label}
                              title={val.label}
                              style={{ backgroundColor: val.hex || "#e4d9d8" }}
                              disabled={!val.available}
                              onClick={() => {
                                setSelectedOptions((prev) => ({ ...prev, [opt.name]: val.label }));
                                trackEvent("CustomizeProduct", { option: opt.name, value: val.label });
                              }}
                            />
                          );
                        })
                      : opt.values.map((val) => {
                          const isSelected = selectedOptions[opt.name] === val.label;
                          return (
                            <button
                              key={val.label}
                              type="button"
                              className="pd-chip"
                              aria-pressed={isSelected}
                              disabled={!val.available}
                              onClick={() => {
                                setSelectedOptions((prev) => ({ ...prev, [opt.name]: val.label }));
                                trackEvent("CustomizeProduct", { option: opt.name, value: val.label });
                              }}
                            >
                              {val.label}
                            </button>
                          );
                        })}
                  </div>
                </div>
              ))}

            {/* QUANTITÉ */}
            <div className="pd-field">
              <p className="pd-label">Quantité</p>
              <div className="pd-qtyrow">
                <div className="pd-qty">
                  <button type="button" aria-label="Diminuer" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    −
                  </button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    max={product.stock_quantity ?? 99}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1) setQty(v);
                    }}
                    aria-label="Quantité"
                  />
                  <button type="button" aria-label="Augmenter" onClick={() => setQty((q) => q + 1)}>
                    +
                  </button>
                </div>
                {product.stock_quantity !== undefined && product.stock_quantity !== null && (
                  <p className="pd-stock">
                    {product.stock_quantity > 0 ? (
                      <>
                        Stock disponible : <b>{product.stock_quantity} pièces</b>
                      </>
                    ) : (
                      <span style={{ color: "var(--low)" }}>Rupture de stock</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* FORMULAIRE DE COMMANDE RAPIDE COD INTÉGRÉ DIRECTEMENT */}
            <div ref={orderFormRef} className="pd-ship">
              <p className="pd-ship__head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h11v10H3z" />
                  <path d="M14 9h4l3 3v4h-7z" />
                  <circle cx="7" cy="18.5" r="1.7" />
                  <circle cx="17.5" cy="18.5" r="1.7" />
                </svg>
                Informations de livraison rapide
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="pd-label" htmlFor="funnel-name">
                    Nom et Prénom *
                  </label>
                  <input
                    id="funnel-name"
                    ref={nameInputRef}
                    type="text"
                    className="pd-select"
                    placeholder="Ex: Karim Hadj"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="pd-label" htmlFor="funnel-phone">
                    Numéro de Téléphone *
                  </label>
                  <input
                    id="funnel-phone"
                    ref={phoneInputRef}
                    type="tel"
                    className="pd-select"
                    placeholder="Ex: 0555 12 34 56"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="pd-label" htmlFor="funnel-wilaya">
                    Wilaya de livraison *
                  </label>
                  <select
                    id="funnel-wilaya"
                    ref={wilayaSelectRef}
                    className="pd-select"
                    value={selectedWilayaId}
                    onChange={(e) => setSelectedWilayaId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Sélectionnez votre Wilaya</option>
                    {wilayas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id} - {w.name} ({w.eta})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pd-modes">
                  <label className="pd-mode">
                    <input
                      type="radio"
                      name="ship-mode-funnel"
                      value="domicile"
                      checked={shipMode === "domicile"}
                      onChange={() => setShipMode("domicile")}
                    />
                    <span>
                      À domicile
                      <small>Livré chez vous</small>
                    </span>
                  </label>
                  <label className="pd-mode">
                    <input
                      type="radio"
                      name="ship-mode-funnel"
                      value="stopdesk"
                      checked={shipMode === "stopdesk"}
                      onChange={() => setShipMode("stopdesk")}
                    />
                    <span>
                      Stop desk
                      <small>Au bureau de livraison</small>
                    </span>
                  </label>
                </div>

                <div>
                  <label className="pd-label" htmlFor="funnel-address">
                    Adresse ou Commune (optionnel)
                  </label>
                  <input
                    id="funnel-address"
                    type="text"
                    className="pd-select"
                    placeholder="Ex: Bab El Oued, Rue Larbi Ben M'hidi"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* RÉCAPITULATIF CALCULÉ À LA VOLÉE */}
              <ul className="pd-sum">
                <li>
                  <span>Sous-total ({qty} article{qty > 1 ? "s" : ""})</span>
                  <span>{formatMoney(subtotal)}</span>
                </li>
                {selectedWilaya && (
                  <li>
                    <span>Frais de port ({selectedWilaya.name} · {selectedWilaya.eta})</span>
                    <span>{formatMoney(shippingCost)}</span>
                  </li>
                )}
                <li className="pd-sum__total">
                  <span>Total à payer à la réception</span>
                  <span>{formatMoney(total)}</span>
                </li>
              </ul>
            </div>

            {/* ── UNIQUE CTA VISIBLE ── */}
            <div className="pd-actions mt-4">
              {orderDone ? (
                <div className="p-4 bg-[var(--accent-soft)] text-[var(--accent-text)] rounded text-center font-bold">
                  ✓ Merci ! Votre commande a été enregistrée avec succès. Notre service client vous appellera sous peu.
                </div>
              ) : (
                <button
                  type="button"
                  className="pd-btn pd-btn--buy w-full text-base py-4"
                  disabled={isSubmitting}
                  onClick={handleSingleCtaClick}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="2.5" y="6" width="19" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  {isSubmitting ? "Validation en cours..." : "COMMANDER MAINTENANT (Paiement à la livraison)"}
                </button>
              )}
            </div>

            {/* RÉASSURANCE ACHAT */}
            <ul className="pd-trust mt-5">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
                </svg>
                <span>
                  <b>Paiement à la livraison garanti.</b> Ne payez rien d&apos;avance.
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
                  <b>58 wilayas couvertes</b> avec suivi de colis par SMS ou appel.
                </span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4.5V9h4.5" />
                </svg>
                <span>
                  <b>Vérification et échange sous 7 jours</b> sans tracas.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ======================= TABS DÉTAILS DU PRODUIT ======================= */}
        <section className="pd-details mt-10">
          <div className="pd-tabs" role="tablist">
            <button
              type="button"
              className="pd-tab"
              role="tab"
              aria-selected={activeTab === "desc"}
              onClick={() => setActiveTab("desc")}
            >
              Description détaillée
            </button>
            {product.specs && Object.keys(product.specs).length > 0 && (
              <button
                type="button"
                className="pd-tab"
                role="tab"
                aria-selected={activeTab === "spec"}
                onClick={() => setActiveTab("spec")}
              >
                Fiche technique
              </button>
            )}
            <button
              type="button"
              className="pd-tab"
              role="tab"
              aria-selected={activeTab === "ship"}
              onClick={() => setActiveTab("ship")}
            >
              Délais &amp; Expédition
            </button>
          </div>

          {activeTab === "desc" && (
            <div className="pd-panel" role="tabpanel">
              {product.description ? (
                <div className="whitespace-pre-line leading-relaxed">{product.description}</div>
              ) : (
                <p className="text-[var(--muted)]">Aucune description détaillée disponible pour ce produit.</p>
              )}
              {product.included_items && product.included_items.length > 0 && (
                <>
                  <h3>Inclus dans le pack :</h3>
                  <ul className="pd-list">
                    {product.included_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {activeTab === "spec" && product.specs && Object.keys(product.specs).length > 0 && (
            <div className="pd-panel" role="tabpanel">
              <table className="pd-specs">
                <tbody>
                  {Object.entries(product.specs).map(([key, val]) => (
                    <tr key={key}>
                      <th>{key}</th>
                      <td>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "ship" && (
            <div className="pd-panel" role="tabpanel">
              <p>
                Traitement prioritaire sous 24h ouvrées. Expédition via nos transporteurs agréés sur les 58 Wilayas d&apos;Algérie.
              </p>
              <h3>Procédure de réception :</h3>
              <ul className="pd-list">
                <li>Le livreur vous contacte par téléphone avant la présentation du colis.</li>
                <li>Vous vérifiez le colis et vous réglez en espèces au livreur.</li>
                <li>Garantie satisfait ou échangé sous 7 jours ouvrés.</li>
              </ul>
            </div>
          )}
        </section>
      </main>

      {/* ── FOOTER MINIMAL (PAS DE LIENS VERS D'AUTRES PAGES) ── */}
      <footer className="pd-foot border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)]">
        <div className="pd-shell">
          {store.name} {store.city ? `— ${store.city}` : ""} · Algérie 🇩🇿 · Commandes garanties · Paiement 100% à la livraison
        </div>
      </footer>

      {/* ── BARRE MOBILE STICKY AVEC LE CTA UNIQUE ── */}
      <div className="pd-stickybar" data-open="true">
        <div className="pd-stickybar__price">
          {formatMoney(total)}
          <small>paiement à la livraison</small>
        </div>
        <button type="button" className="pd-btn pd-btn--buy" onClick={handleSingleCtaClick}>
          Commander ({formatMoney(total)})
        </button>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      <div className="pd-toast" data-open={isToastOpen} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
