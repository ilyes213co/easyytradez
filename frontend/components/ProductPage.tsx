"use client";

import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import type { Product, Store, Wilaya, ThemeId, CreateOrderPayload } from "@/types/product";

// ─── 58 Wilayas d'Algérie par défaut si non fournies en props ───────────────
export const DEFAULT_WILAYAS: Wilaya[] = [
  { id: 1, name: "Adrar", price_home: 950, price_desk: 600, eta: "3-5 j" },
  { id: 2, name: "Chlef", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 3, name: "Laghouat", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 4, name: "Oum El Bouaghi", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 5, name: "Batna", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 6, name: "Béjaïa", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 7, name: "Biskra", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 8, name: "Béchar", price_home: 950, price_desk: 600, eta: "4-6 j" },
  { id: 9, name: "Blida", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 10, name: "Bouira", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 11, name: "Tamanrasset", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 12, name: "Tébessa", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 13, name: "Tlemcen", price_home: 550, price_desk: 300, eta: "48-72h" },
  { id: 14, name: "Tiaret", price_home: 600, price_desk: 350, eta: "48-72h" },
  { id: 15, name: "Tizi Ouzou", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 16, name: "Alger", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 17, name: "Djelfa", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 18, name: "Jijel", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 19, name: "Sétif", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 20, name: "Saïda", price_home: 550, price_desk: 300, eta: "48-72h" },
  { id: 21, name: "Skikda", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 22, name: "Sidi Bel Abbès", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 23, name: "Annaba", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 24, name: "Guelma", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 25, name: "Constantine", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 26, name: "Médéa", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 27, name: "Mostaganem", price_home: 450, price_desk: 280, eta: "24-48h" },
  { id: 28, name: "M'Sila", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 29, name: "Mascara", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 30, name: "Ouargla", price_home: 900, price_desk: 550, eta: "3-5 j" },
  { id: 31, name: "Oran", price_home: 400, price_desk: 250, eta: "24-48h" },
  { id: 32, name: "El Bayadh", price_home: 800, price_desk: 500, eta: "3-5 j" },
  { id: 33, name: "Illizi", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 34, name: "Bordj Bou Arreridj", price_home: 650, price_desk: 350, eta: "2-4 j" },
  { id: 35, name: "Boumerdès", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 36, name: "El Tarf", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 37, name: "Tindouf", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 38, name: "Tissemsilt", price_home: 650, price_desk: 350, eta: "48-72h" },
  { id: 39, name: "El Oued", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 40, name: "Khenchela", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 41, name: "Souk Ahras", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 42, name: "Tipaza", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 43, name: "Mila", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 44, name: "Aïn Defla", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 45, name: "Naâma", price_home: 800, price_desk: 500, eta: "3-5 j" },
  { id: 46, name: "Aïn Témouchent", price_home: 450, price_desk: 280, eta: "24-48h" },
  { id: 47, name: "Ghardaïa", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 48, name: "Relizane", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 49, name: "Timimoun", price_home: 1000, price_desk: 650, eta: "4-6 j" },
  { id: 50, name: "Bordj Badji Mokhtar", price_home: 1500, price_desk: 1000, eta: "6-8 j" },
  { id: 51, name: "Ouled Djellal", price_home: 800, price_desk: 450, eta: "3-5 j" },
  { id: 52, name: "Béni Abbès", price_home: 1000, price_desk: 650, eta: "4-6 j" },
  { id: 53, name: "In Salah", price_home: 1300, price_desk: 850, eta: "5-7 j" },
  { id: 54, name: "In Guezzam", price_home: 1500, price_desk: 1000, eta: "6-8 j" },
  { id: 55, name: "Touggourt", price_home: 900, price_desk: 550, eta: "3-5 j" },
  { id: 56, name: "Djanet", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 57, name: "El M'Ghair", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 58, name: "El Meniaa", price_home: 950, price_desk: 600, eta: "4-6 j" },
];

export function resolveImageUrl(img: any): string {
  if (!img) return "";
  const rawUrl = typeof img === "string" ? img.trim() : typeof img?.url === "string" ? img.url.trim() : "";
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("/") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  // Supabase storage bucket relative path (e.g. "products/xyz.jpg" or "store-assets/...")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${rawUrl.replace(/^\/+/, "")}`;
  }
  return rawUrl;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(amount)) + " DA";
}

export interface ProductPageProps {
  product: Product;
  store: Store;
  theme?: ThemeId;
  wilayas?: Wilaya[];
}

export default function ProductPage({
  product,
  store,
  theme,
  wilayas = DEFAULT_WILAYAS,
}: ProductPageProps) {
  const activeTheme = theme || store.theme || "monochrome";

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

  // ─── État des options dynamiques ───────────────────────────────────────────
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

  // Formulaire client
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"desc" | "spec" | "ship">("desc");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastOpen, setIsToastOpen] = useState<boolean>(false);
  const [orderDone, setOrderDone] = useState<boolean>(false);

  const wilayaSelectRef = useRef<HTMLSelectElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setIsToastOpen(false);
    }, 3500);
  };

  // ─── Calcul à la volée ───────────────────────────────────────────────────────
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

  // ─── Gestion de la commande ──────────────────────────────────────────────────
  const handleOrderClick = () => {
    if (!selectedWilayaId) {
      if (wilayaSelectRef.current) {
        wilayaSelectRef.current.focus();
      }
      showToast("Choisissez votre wilaya pour confirmer la commande.");
      return;
    }

    if (!showOrderForm) {
      setShowOrderForm(true);
      setTimeout(() => nameInputRef.current?.focus(), 100);
      return;
    }

    if (!customerName.trim()) {
      showToast("Veuillez indiquer votre nom complet.");
      nameInputRef.current?.focus();
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      showToast("Veuillez indiquer un numéro de téléphone valide.");
      return;
    }

    submitOrder();
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
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
        if (!fallbackRes.ok) throw new Error("Échec de la commande");
      }

      setOrderDone(true);
      showToast("Commande enregistrée ! Nous vous appellerons pour confirmer.");
    } catch {
      showToast("Erreur lors de la validation. Veuillez réessayer ou commander par téléphone.");
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

  // Données de réputation (affichées uniquement si réelles)
  const productRating = (product as any).rating;
  const productReviewsCount = (product as any).reviews_count;

  return (
    <div className="pd-wrapper min-h-screen" data-theme={activeTheme} style={inlineBrandingStyles}>
      {/* ── HEADER ── */}
      <header className="pd-top">
        <div className="pd-top__in">
          <a className="pd-brand" href={`/${store.slug}`}>
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(store.logo_url)} alt={store.name} className="h-8 object-contain inline-block" />
            ) : (
              store.name
            )}
          </a>
          {store.slogan && <p className="pd-top__note">{store.slogan}</p>}
        </div>
      </header>

      <div className="pd-shell">
        {/* ── BREADCRUMBS ── */}
        <nav className="pd-crumbs" aria-label="Fil d'ariane">
          <a href={`/${store.slug}`}>{store.name}</a> / <span>{product.name}</span>
        </nav>

        {/* ── PRODUCT SECTION ── */}
        <section className="pd-product">
          {/* ======================= GALERIE ======================= */}
          <div className="pd-gallery">
            <figure className="pd-stage relative overflow-hidden" style={{ minHeight: "340px" }}>
              {product.is_featured && <span className="pd-stage__flag">Best-seller</span>}
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
                      aria-label={`${product.name} - vue ${idx + 1}`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - vue ${idx + 1}`}
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

          {/* ======================= BUY BOX ======================= */}
          <div className="pd-buybox">
            <p className="pd-vendor">{store.name}</p>
            <h1 className="pd-title">{product.name}</h1>

            {/* AVIS CLIENTS RÉELS (SI RENSEIGNÉS) */}
            {Boolean(productRating || productReviewsCount) && (
              <div className="pd-rating">
                <span className="pd-stars" aria-hidden="true">
                  {"★".repeat(Math.min(5, Math.max(1, Math.round(Number(productRating) || 5))))}
                </span>
                <span>
                  {productRating ? `${productRating}/5` : ""}
                  {productReviewsCount ? ` · ${productReviewsCount} avis vérifiés` : ""}
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
            <p className="pd-taxnote">Paiement en espèces à la livraison. Colis vérifiable à l&apos;arrivée.</p>

            {/* OPTIONS DYNAMIQUES DU PRODUIT */}
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
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [opt.name]: val.label,
                                }))
                              }
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
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [opt.name]: val.label,
                                }))
                              }
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
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
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
                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
                {product.stock_quantity !== undefined && product.stock_quantity !== null && (
                  <p className="pd-stock">
                    {product.stock_quantity > 0 ? (
                      <>
                        Il reste <b>{product.stock_quantity} pièces</b> en stock
                      </>
                    ) : (
                      <span style={{ color: "var(--low)" }}>Rupture de stock</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* LIVRAISON & TOTAL (BLOC COD) */}
            <div className="pd-ship">
              <p className="pd-ship__head">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h11v10H3z" />
                  <path d="M14 9h4l3 3v4h-7z" />
                  <circle cx="7" cy="18.5" r="1.7" />
                  <circle cx="17.5" cy="18.5" r="1.7" />
                </svg>
                Livraison &amp; total
              </p>

              <label className="pd-label" htmlFor="wilaya-select">
                Wilaya de livraison
              </label>
              <select
                id="wilaya-select"
                ref={wilayaSelectRef}
                className="pd-select"
                value={selectedWilayaId}
                onChange={(e) => setSelectedWilayaId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choisissez votre wilaya</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} - {w.name} ({w.eta})
                  </option>
                ))}
              </select>

              <div className="pd-modes">
                <label className="pd-mode">
                  <input
                    type="radio"
                    name="ship-mode"
                    value="domicile"
                    checked={shipMode === "domicile"}
                    onChange={() => setShipMode("domicile")}
                  />
                  <span>
                    À domicile
                    <small>Le livreur vous appelle</small>
                  </span>
                </label>
                <label className="pd-mode">
                  <input
                    type="radio"
                    name="ship-mode"
                    value="stopdesk"
                    checked={shipMode === "stopdesk"}
                    onChange={() => setShipMode("stopdesk")}
                  />
                  <span>
                    Stop desk
                    <small>Retrait au bureau de livraison</small>
                  </span>
                </label>
              </div>

              {/* COORDONNÉES CLIENT */}
              {showOrderForm && (
                <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
                  <div>
                    <label className="pd-label" style={{ marginBottom: "4px" }}>
                      Votre Nom &amp; Prénom *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      className="pd-select"
                      placeholder="Ex: Mohamed Benali"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="pd-label" style={{ marginBottom: "4px" }}>
                      Numéro de téléphone *
                    </label>
                    <input
                      type="tel"
                      className="pd-select"
                      placeholder="Ex: 0555 12 34 56"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="pd-label" style={{ marginBottom: "4px" }}>
                      Commune / Adresse de livraison (optionnel)
                    </label>
                    <input
                      type="text"
                      className="pd-select"
                      placeholder="Ex: Bab Ezzouar, Cité 5 Juillet"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* RÉSUMÉ FINANCIER */}
              <ul className="pd-sum">
                <li>
                  <span>Sous-total</span>
                  <span>{formatMoney(subtotal)}</span>
                </li>
                {selectedWilaya && (
                  <li>
                    <span>Livraison ({selectedWilaya.name} · {selectedWilaya.eta})</span>
                    <span>{formatMoney(shippingCost)}</span>
                  </li>
                )}
                <li className="pd-sum__total">
                  <span>À payer à la livraison</span>
                  <span>{formatMoney(total)}</span>
                </li>
              </ul>
            </div>

            {/* ACTIONS */}
            <div className="pd-actions">
              {orderDone ? (
                <div
                  style={{
                    padding: "16px",
                    background: "var(--accent-soft)",
                    color: "var(--accent-text)",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  ✓ Commande validée avec succès ! Notre équipe vous contactera sous peu.
                </div>
              ) : (
                <button
                  type="button"
                  className="pd-btn pd-btn--buy"
                  disabled={isSubmitting}
                  onClick={handleOrderClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2.5" y="6" width="19" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  {isSubmitting
                    ? "Enregistrement..."
                    : showOrderForm
                    ? "Confirmer la commande (Paiement à la livraison)"
                    : "Commander — paiement à la livraison"}
                </button>
              )}

              <button
                type="button"
                className="pd-btn pd-btn--cart"
                onClick={() => showToast("Article ajouté au panier.")}
              >
                Ajouter au panier
              </button>

              {(store.phone || store.whatsapp_phone) && (
                <a
                  className="pd-btn pd-btn--call"
                  href={`tel:${(store.phone || store.whatsapp_phone || "").replace(/\s+/g, "")}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 3h3.5l1.8 4.4-2.2 1.6a12 12 0 0 0 5.9 5.9l1.6-2.2L20 14.5V18a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.2 2 2 0 0 1 5 3z" />
                  </svg>
                  Commander par téléphone ({store.phone || store.whatsapp_phone})
                </a>
              )}
            </div>

            {/* RÉASSURANCE */}
            <ul className="pd-trust">
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
                </svg>
                <span>
                  <b>Paiement à la réception.</b> Aucun acompte, aucune carte bancaire requise.
                </span>
              </li>
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h11v10H3z" />
                  <path d="M14 9h4l3 3v4h-7z" />
                  <circle cx="7" cy="18.5" r="1.7" />
                  <circle cx="17.5" cy="18.5" r="1.7" />
                </svg>
                <span>
                  <b>58 wilayas livrées</b> rapidement par transporteur agréé.
                </span>
              </li>
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4.5V9h4.5" />
                </svg>
                <span>
                  <b>Vérification à la livraison.</b> Vous pouvez ouvrir votre colis devant le livreur.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ======================= DÉTAILS / ONGLETS ======================= */}
        <section className="pd-details">
          <div className="pd-tabs" role="tablist">
            <button
              type="button"
              className="pd-tab"
              role="tab"
              aria-selected={activeTab === "desc"}
              onClick={() => setActiveTab("desc")}
            >
              Description
            </button>
            {product.specs && Object.keys(product.specs).length > 0 && (
              <button
                type="button"
                className="pd-tab"
                role="tab"
                aria-selected={activeTab === "spec"}
                onClick={() => setActiveTab("spec")}
              >
                Caractéristiques
              </button>
            )}
            <button
              type="button"
              className="pd-tab"
              role="tab"
              aria-selected={activeTab === "ship"}
              onClick={() => setActiveTab("ship")}
            >
              Livraison &amp; retour
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
                  <h3>Ce qui est inclus</h3>
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
                Expédition sous 24 à 48 heures ouvrées. Le livreur vous appelle avant de passer : veillez
                à garder votre téléphone joignable.
              </p>
              <h3>Paiement &amp; Retours</h3>
              <ul className="pd-list">
                <li>Paiement 100% à la livraison (Cash on Delivery).</li>
                <li>Possibilité de refuser le colis sans frais si non conforme.</li>
                <li>Délai de rétractation de 7 jours après réception.</li>
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="pd-foot">
        <div className="pd-shell">
          {store.name} {store.city ? `— ${store.city}, Algérie` : "— Algérie"} · Commandes 7j/7 · Paiement à la livraison
        </div>
      </footer>

      {/* ── STICKY BAR MOBILE ── */}
      <div className="pd-stickybar" data-open="true">
        <p className="pd-stickybar__price">
          {formatMoney(total)}
          <small>paiement à la livraison</small>
        </p>
        <button type="button" className="pd-btn pd-btn--buy" onClick={handleOrderClick}>
          Commander
        </button>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      <div className="pd-toast" data-open={isToastOpen} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
