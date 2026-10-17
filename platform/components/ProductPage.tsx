"use client";

import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import type { Product, Store, Wilaya, ThemeId, CreateOrderPayload } from "@/types/product";

import { DEFAULT_WILAYAS, resolveImageUrl } from "@/lib/wilayas";
import { getCommunesByWilayaId } from "@/lib/algeria-cities";
import { generateWhatsAppUrl, normalizeDzPhone, isValidStrictDzPhone } from "@/lib/utils";
import StoreTrackingPixels, { trackStorePurchase } from "@/components/analytics/StoreTrackingPixels";
export { DEFAULT_WILAYAS, resolveImageUrl };

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
  const [customerCommune, setCustomerCommune] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"desc" | "spec" | "ship">("desc");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastOpen, setIsToastOpen] = useState<boolean>(false);
  const [orderDone, setOrderDone] = useState<boolean>(false);

  const wilayaSelectRef = useRef<HTMLSelectElement>(null);
  const communeSelectRef = useRef<HTMLSelectElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastOpen(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setIsToastOpen(false);
    }, 3500);
  };

  // ─── Communes dynamiques selon la wilaya ─────────────────────────────────────
  const availableCommunes = useMemo(() => {
    return getCommunesByWilayaId(selectedWilayaId);
  }, [selectedWilayaId]);

  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : "";
    setSelectedWilayaId(val);
    setCustomerCommune("");
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
  const waNumber = store.whatsapp_phone || store.phone;

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
      showToast("Choisissez votre wilaya de livraison.");
      return;
    }

    if (!customerCommune.trim() && availableCommunes.length > 0) {
      if (communeSelectRef.current) {
        communeSelectRef.current.focus();
      }
      showToast("Choisissez votre commune de livraison.");
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

    if (!customerPhone.trim()) {
      showToast("Veuillez indiquer un numéro de téléphone.");
      phoneInputRef.current?.focus();
      return;
    }

    const cleanedPhone = normalizeDzPhone(customerPhone);
    const security = (store as any)?.settings?.security || {};

    if (security.strict_dz_phone !== false) {
      if (!isValidStrictDzPhone(cleanedPhone)) {
        showToast("Numéro algérien invalide (10 chiffres commençant par 05, 06 ou 07).");
        phoneInputRef.current?.focus();
        return;
      }
    } else if (cleanedPhone.length < 9) {
      showToast("Veuillez indiquer un numéro de téléphone valide.");
      phoneInputRef.current?.focus();
      return;
    }

    const blacklist = security.blacklist;
    if (Array.isArray(blacklist) && blacklist.length > 0) {
      const normalizedB = new Set(blacklist.map((b: string) => normalizeDzPhone(b)).filter(Boolean));
      if (normalizedB.has(cleanedPhone)) {
        showToast("Ce numéro de téléphone n'est pas autorisé à passer commande.");
        return;
      }
    }

    submitOrder();
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    const effectiveStoreId = store?.id || product.store_id;
    const cleanedPhone = normalizeDzPhone(customerPhone);

    const payload: CreateOrderPayload = {
      product_id: product.id,
      options_selected: selectedOptions,
      qty,
      wilaya_id: Number(selectedWilayaId),
      ship_mode: shipMode,
      customer_name: customerName.trim(),
      customer_phone: cleanedPhone || customerPhone.trim(),
      customer_commune: customerCommune.trim() || undefined,
      customer_address: customerAddress.trim() || undefined,
      store_id: effectiveStoreId,
    };

    try {
      // 1. Essayer la route Next.js locale /api/orders (même origine, zéro CORS)
      let res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      let resData = await res?.json().catch(() => null);

      if (res && (res.status === 400 || res.status === 403)) {
        showToast(resData?.error || resData?.detail || "Numéro ou commande non autorisé(e)");
        setIsSubmitting(false);
        return;
      }

      // 2. Si échoué ou non disponible, fallback vers l'API backend
      if (!res || !res.ok) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        res = await fetch(`${apiUrl}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);

        resData = await res?.json().catch(() => null);

        if (res && (res.status === 400 || res.status === 403)) {
          showToast(resData?.error || resData?.detail || "Commande refusée");
          setIsSubmitting(false);
          return;
        }

        if (!res || !res.ok) {
          throw new Error(resData?.error || resData?.detail || "Échec de confirmation de la commande");
        }
      }

      const finalOrderId = resData?.order_id || resData?.order?.id || "CMD-" + Date.now().toString().slice(-6);

      setOrderDone(true);

      // Track conversion across configured pixels (Meta, TikTok, Google Analytics)
      trackStorePurchase({
        total,
        orderId: finalOrderId,
        productName: product.name,
        currency: "DZD",
        facebookPixelId: store.facebook_pixel_id,
        tiktokPixelId: store.tiktok_pixel_id,
        googleAnalyticsId: store.google_analytics_id,
      });

      showToast("Commande enregistrée ! Nous vous appellerons pour confirmer.");
    } catch (err: any) {
      showToast(err?.message || "Erreur lors de la validation. Veuillez réessayer ou commander par téléphone.");
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
    <div
      className="pd-wrapper min-h-screen bg-[var(--bg)] text-[var(--text)]"
      data-theme={activeTheme}
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        ...inlineBrandingStyles,
      }}
    >
      {/* ── Tracking Pixels (Meta, TikTok, Google Analytics) ── */}
      <StoreTrackingPixels
        facebookPixelId={store.facebook_pixel_id}
        tiktokPixelId={store.tiktok_pixel_id}
        googleAnalyticsId={store.google_analytics_id}
      />
      {/* ── HEADER ── */}
      <header className="pd-top">
        <div className="pd-top__in">
          <a className="pd-brand" href={`/${store.slug}`}>
            {store.logo_url ? (
              <Image
                src={resolveImageUrl(store.logo_url)}
                alt={store.name}
                width={120}
                height={32}
                className="h-8 w-auto object-contain inline-block"
                unoptimized={!store.logo_url.startsWith("http")}
              />
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label className="pd-label" htmlFor="wilaya-select" style={{ marginBottom: "4px" }}>
                    Wilaya de livraison *
                  </label>
                  <select
                    id="wilaya-select"
                    ref={wilayaSelectRef}
                    className="pd-select"
                    value={selectedWilayaId}
                    onChange={handleWilayaChange}
                  >
                    <option value="">Choisissez votre wilaya</option>
                    {wilayas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id} - {w.name} ({w.eta})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="pd-label" htmlFor="commune-select" style={{ marginBottom: "4px" }}>
                    Commune *
                  </label>
                  <select
                    id="commune-select"
                    ref={communeSelectRef}
                    className="pd-select"
                    value={customerCommune}
                    onChange={(e) => setCustomerCommune(e.target.value)}
                    disabled={!selectedWilayaId}
                    style={!selectedWilayaId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
                  >
                    <option value="">
                      {!selectedWilayaId ? "Sélectionnez d'abord la wilaya" : "Choisissez votre commune"}
                    </option>
                    {availableCommunes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    <label className="pd-label" style={{ marginBottom: "4px" }}>
                      Adresse exacte / Rue / Cité <span style={{ opacity: 0.65, fontWeight: 400, textTransform: "none" }}>(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      className="pd-select"
                      placeholder="Ex: Cité 5 Juillet, Bâtiment B, N° 12"
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
                <div className="space-y-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ✓ Commande validée avec succès ! Notre équipe vous contactera sous peu.
                  </div>
                  {waNumber && (
                    <a
                      href={generateWhatsAppUrl(
                        waNumber,
                        `Bonjour ${store.name} ! 👋\nJe viens de commander "${product.name}" (${formatMoney(total)}).\nClient: ${customerName} - ${customerPhone}\nLivraison: ${selectedWilaya?.name || selectedWilayaId}${customerCommune ? ' (' + customerCommune + ')' : ''}\nMerci de confirmer ma commande !`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm rounded-xl transition-all shadow-md"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span>Confirmer ma commande sur WhatsApp</span>
                    </a>
                  )}
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

              {waNumber && !orderDone && (
                <a
                  className="pd-btn pd-btn--whatsapp flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-sm"
                  style={{ backgroundColor: "#25D366" }}
                  href={generateWhatsAppUrl(
                    waNumber,
                    `Bonjour ${store.name} ! 👋\nJe souhaite commander le produit :\n• ${product.name} (${formatMoney(product.price)})\n\nPouvez-vous me confirmer la disponibilité ?`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Commander via WhatsApp</span>
                </a>
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

      {/* ── FLOATING WHATSAPP FAB ── */}
      {waNumber && (
        <a
          href={generateWhatsAppUrl(
            waNumber,
            `Bonjour ${store.name} ! 👋\nJ'ai une question concernant le produit : ${product.name}`
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter sur WhatsApp"
          className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group font-medium text-sm"
        >
          <svg className="w-5 h-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="hidden sm:inline font-semibold">WhatsApp</span>
        </a>
      )}
    </div>
  );
}
