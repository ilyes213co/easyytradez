"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Product, Store } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Delivery ─────────────────────────────────────────────────────────────────

interface ShippingRateOption {
  wilaya_id: number;
  code: string;
  name: string;
  price_home: number;
  price_desk: number;
  eta: string;
}

interface OrderFormProps {
  product: Product;
  store: Store;
  disabled?: boolean;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  quantity: string;
  notes: string;
}

type Step = "form" | "success";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none transition-all focus:border-stone-400 focus:ring-2 focus:ring-stone-100";

const inputErrorClass =
  "w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">
      {children}
    </label>
  );
}

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessView({
  orderId,
  waLink,
  storeName,
  storeSlug,
}: {
  orderId: string;
  waLink: string;
  storeName: string;
  storeSlug: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl mx-auto">
        ✅
      </div>
      <div>
        <h3 className="font-bold text-stone-800 text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Commande enregistrée !
        </h3>
        <p className="text-sm text-stone-500 mt-1">
          Référence :{" "}
          <span className="font-mono font-semibold text-stone-700">
            #{orderId.slice(-6).toUpperCase()}
          </span>
        </p>
      </div>

      {/* WhatsApp CTA */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#25D366] hover:bg-[#20bd5a] py-3 text-sm font-bold text-white transition-all shadow-md shadow-emerald-200"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Confirmer via WhatsApp
      </a>

      <p className="text-xs text-stone-400">
        Un message pré-rempli sera envoyé à {storeName} pour confirmer votre commande.
      </p>

      <a
        href={`/${storeSlug}`}
        className="block text-xs text-stone-400 hover:text-stone-600 underline transition-colors"
      >
        ← Continuer mes achats
      </a>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function OrderForm({ product, store, disabled }: OrderFormProps) {
  const supabase = getSupabaseBrowserClient();

  const [form, setForm] = useState<FormState>({
    name: "", phone: "", address: "", quantity: "1", notes: "",
  });
  const [errors, setErrors]   = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep]       = useState<Step>("form");
  const [orderId, setOrderId] = useState("");
  const [waLink, setWaLink]   = useState("");

  // Delivery
  const [rates, setRates]                   = useState<ShippingRateOption[]>([]);
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [shipMode, setShipMode]             = useState<"domicile" | "stopdesk">("domicile");
  const [deliveryFee, setDeliveryFee]       = useState(0);

  // Options & Variants
  const productOptions: any[] = (product as any).options || [];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (Array.isArray(productOptions)) {
      productOptions.forEach((opt: any) => {
        const firstAvail = opt.values?.find((v: any) => v.available !== false) || opt.values?.[0];
        if (firstAvail?.label) init[opt.name] = firstAvail.label;
      });
    }
    return init;
  });

  const qty      = Math.max(1, parseInt(form.quantity) || 1);
  const subtotal = product.price * qty;
  const total    = subtotal + deliveryFee;

  // Load real-time shipping rates for this store from Supabase
  useEffect(() => {
    supabase
      .from("shipping_rates")
      .select("wilaya_id, price_home, price_desk, eta, wilayas(name)")
      .eq("store_id", store.id)
      .order("wilaya_id", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: ShippingRateOption[] = (data as any[]).map((r) => ({
            wilaya_id: r.wilaya_id,
            code: String(r.wilaya_id).padStart(2, "0"),
            name: r.wilayas?.name || `Wilaya ${r.wilaya_id}`,
            price_home: r.price_home,
            price_desk: r.price_desk,
            eta: r.eta || "2-4 j",
          }));
          setRates(mapped);
        }
      });
  }, [store.id, supabase]);

  // Recalculate fee when wilaya or shipMode changes
  useEffect(() => {
    if (!selectedWilaya) { setDeliveryFee(0); return; }
    const currentRate = rates.find(
      (r) => String(r.wilaya_id) === selectedWilaya || r.code === selectedWilaya
    );
    if (!currentRate) { setDeliveryFee(0); return; }
    setDeliveryFee(shipMode === "stopdesk" ? currentRate.price_desk : currentRate.price_home);
  }, [selectedWilaya, shipMode, rates]);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    };

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim())  errs.name  = "Nom requis";
    if (!form.phone.trim()) errs.phone = "Téléphone requis";
    else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone))
      errs.phone = "Format invalide";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    setLoading(true);

    const selectedRate = rates.find(
      (r) => String(r.wilaya_id) === selectedWilaya || r.code === selectedWilaya
    );
    const wilayaLabel = selectedRate ? `${selectedRate.code}. ${selectedRate.name}` : selectedWilaya;
    const fullAddress = selectedWilaya
      ? `Wilaya: ${wilayaLabel} (${shipMode === "stopdesk" ? "Stop Desk" : "À domicile"})${form.address.trim() ? " — " + form.address.trim() : ""}`
      : form.address.trim() || null;

    let finalOrderId = "CMD-" + Date.now().toString().slice(-6);

    try {
      // 1. Essayer la route Next.js API /api/orders (sécurisée, service role, validation)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          product_id: product.id,
          qty,
          options_selected: selectedOptions,
          wilaya_id: selectedWilaya ? Number(selectedWilaya) : 16,
          ship_mode: shipMode,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: fullAddress,
          notes: form.notes.trim() || undefined,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.order?.id) finalOrderId = data.order.id;
      } else {
        // 2. Fallback: insertion directe Supabase sans .select() (car RLS restreint select pour anon)
        const { error } = await supabase
          .from("orders")
          .insert({
            store_id:         store.id,
            customer_name:    form.name.trim(),
            customer_phone:   form.phone.trim(),
            customer_address: fullAddress,
            notes:            form.notes.trim() || null,
            items: [
              {
                product_id: product.id,
                name:       product.name,
                price:      product.price,
                quantity:   qty,
                image:      product.images[0] ?? null,
                options_selected: selectedOptions,
              },
            ],
            subtotal: subtotal,
            total:    total,
            total_amount: total,
            shipping_address: fullAddress,
            status:         "pending",
            payment_status: "pending",
          } as any);

        if (error) {
          console.error("Supabase direct insert error:", error);
          setServerError("Erreur lors de l'envoi. Veuillez réessayer.");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Order submit error:", err);
      setServerError("Erreur lors de l'envoi. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    setLoading(false);

    // Build WhatsApp message for optional confirmation link
    const phone = (store.whatsapp_phone ?? store.whatsapp_number ?? "").replace(/\D/g, "");
    const currentRate = rates.find(
      (r) => String(r.wilaya_id) === selectedWilaya || r.code === selectedWilaya
    );
    const wilayaName = currentRate
      ? `Wilaya ${currentRate.code} (${currentRate.name}) — ${deliveryFee.toLocaleString("fr-DZ")} DZD (${shipMode === "stopdesk" ? "Stop Desk" : "À domicile"})`
      : "";
    const message = [
      `Bonjour ${store.name} ! 👋`,
      `Je voudrais commander :`,
      `• ${product.name} × ${qty} = ${subtotal.toLocaleString("fr-DZ")} DZD`,
      wilayaName ? `🚚 ${wilayaName}` : "",
      `💰 Total : ${total.toLocaleString("fr-DZ")} DZD`,
      ``,
      `👤 ${form.name}`,
      `📞 ${form.phone}`,
      form.address ? `📍 ${form.address}` : "",
      form.notes   ? `📝 ${form.notes}`   : "",
      ``,
      `Réf. commande : #${finalOrderId.slice(-6).toUpperCase()}`,
    ].filter(Boolean).join("\n");

    const wa = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : "";

    setOrderId(finalOrderId);
    setWaLink(wa);
    setStep("success");
  };

  if (disabled) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-center">
        <p className="text-sm font-semibold text-red-500">Produit épuisé</p>
        <p className="text-xs text-red-400 mt-1">Ce produit n&apos;est plus disponible pour le moment.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <SuccessView
        orderId={orderId}
        waLink={waLink}
        storeName={store.name}
        storeSlug={store.slug}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2
        className="text-sm font-bold text-stone-700 uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Passer commande
      </h2>

      {/* Options & Variants */}
      {Array.isArray(productOptions) && productOptions.length > 0 && (
        <div className="space-y-3.5 pb-2 border-b border-stone-100">
          {productOptions.map((opt: any) => {
            const optName = opt.name || "Option";
            const optType = opt.type || "chip";
            const currentVal = selectedOptions[optName] || "";
            return (
              <div key={optName}>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>{optName}</Label>
                  {currentVal && (
                    <span className="text-xs font-semibold text-stone-900">
                      {currentVal}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {opt.values?.map((v: any) => {
                    const isSelected = v.label === currentVal;
                    const isAvail = v.available !== false;
                    if (optType === "swatch") {
                      return (
                        <button
                          key={v.label}
                          type="button"
                          title={v.label}
                          disabled={!isAvail}
                          onClick={() => setSelectedOptions((p) => ({ ...p, [optName]: v.label }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            isSelected
                              ? "border-stone-900 ring-2 ring-stone-200 scale-105"
                              : "border-stone-200 hover:border-stone-300"
                          } ${!isAvail ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
                          style={{ backgroundColor: v.hex || "#3b82f6" }}
                        />
                      );
                    }
                    return (
                      <button
                        key={v.label}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => setSelectedOptions((p) => ({ ...p, [optName]: v.label }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                        } ${!isAvail ? "opacity-35 line-through cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quantity */}
      <div>
        <Label>Quantité</Label>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setForm((p) => ({ ...p, quantity: String(Math.max(1, qty - 1)) }))}
            className="w-10 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-all flex items-center justify-center text-lg font-light"
          >−</button>
          <input
            type="number" min="1" max={product.stock || 999}
            value={form.quantity} onChange={set("quantity")}
            className={inputClass + " text-center w-20"}
          />
          <button type="button"
            onClick={() => setForm((p) => ({ ...p, quantity: String(Math.min(product.stock || 999, qty + 1)) }))}
            className="w-10 h-10 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-all flex items-center justify-center text-lg font-light"
          >+</button>
          <span className="text-xs text-stone-400 ml-1">
            / {product.stock} disponible{product.stock !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Wilaya select & Mode */}
      {rates.length > 0 && (
        <div className="space-y-2">
          <Label>Wilaya de livraison</Label>
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className={inputClass + " appearance-none cursor-pointer"}
          >
            <option value="">Sélectionnez votre wilaya…</option>
            {rates.map((r) => (
              <option key={r.wilaya_id} value={String(r.wilaya_id)} className="bg-white text-stone-800">
                {r.code} — {r.name} ({shipMode === "stopdesk" ? `${r.price_desk.toLocaleString("fr-DZ")} DZD` : `${r.price_home.toLocaleString("fr-DZ")} DZD`})
              </option>
            ))}
          </select>

          {/* Mode de livraison */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShipMode("domicile")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                shipMode === "domicile"
                  ? "border-stone-800 bg-stone-900 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span>🏠 À domicile</span>
            </button>
            <button
              type="button"
              onClick={() => setShipMode("stopdesk")}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                shipMode === "stopdesk"
                  ? "border-stone-800 bg-stone-900 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span>🏢 Stop Desk (Bureau)</span>
            </button>
          </div>
        </div>
      )}

      {/* Total breakdown */}
      <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm text-stone-500">
          <span>Sous-total ({qty} article{qty > 1 ? "s" : ""})</span>
          <span>{subtotal.toLocaleString("fr-DZ")} DZD</span>
        </div>
        {selectedWilaya && (
          <div className="flex justify-between text-sm text-stone-500">
            <span>Livraison</span>
            <span className={deliveryFee === 0 ? "text-emerald-600 font-medium" : ""}>
              {deliveryFee === 0 ? "Gratuite" : `${deliveryFee.toLocaleString("fr-DZ")} DZD`}
            </span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-stone-900 pt-1 border-t border-stone-200 text-base">
          <span>Total</span>
          <span>{total.toLocaleString("fr-DZ")} DZD</span>
        </div>
      </div>

      {/* Name */}
      <div>
        <Label>Votre nom complet</Label>
        <input type="text" value={form.name} onChange={set("name")}
          placeholder="Amine Benali"
          className={errors.name ? inputErrorClass : inputClass}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">⚠ {errors.name}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label>Numéro de téléphone / WhatsApp</Label>
        <input type="tel" value={form.phone} onChange={set("phone")}
          placeholder="+213 6 00 00 00 00"
          className={errors.phone ? inputErrorClass : inputClass}
        />
        {errors.phone && <p className="mt-1 text-xs text-red-500">⚠ {errors.phone}</p>}
      </div>

      {/* Address */}
      <div>
        <Label>Adresse de livraison <span className="text-stone-300 normal-case font-normal tracking-normal">(optionnel)</span></Label>
        <input type="text" value={form.address} onChange={set("address")}
          placeholder="Rue, ville, wilaya"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <Label>Note pour le vendeur <span className="text-stone-300 normal-case font-normal tracking-normal">(optionnel)</span></Label>
        <textarea value={form.notes} onChange={set("notes") as React.ChangeEventHandler<HTMLTextAreaElement>}
          placeholder="Couleur, taille, instructions spéciales…"
          rows={2}
          className={inputClass + " resize-none"}
        />
      </div>

      {/* Server error */}
      {serverError && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {serverError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 shadow-md shadow-stone-200"
      >
        {loading ? (
          <><Spinner /> Envoi en cours…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Commander — {total.toLocaleString("fr-DZ")} DZD
              {deliveryFee > 0 && <span className="font-normal text-white/70 text-xs ml-1">(+livraison incluse)</span>}
          </>
        )}
      </button>

      {/* WhatsApp direct */}
      {store.whatsapp_number && (
        <a
          href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, je suis intéressé par "${product.name}" à ${product.price.toLocaleString("fr-DZ")} DZD.`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 py-3 text-sm font-semibold text-emerald-700 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Commander directement via WhatsApp
        </a>
      )}

      <p className="text-xs text-stone-400 text-center leading-relaxed">
        En commandant, vous serez contacté par {store.name} pour confirmer et organiser la livraison.
      </p>
    </form>
  );
}
