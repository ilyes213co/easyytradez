"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Product, Store } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Delivery ─────────────────────────────────────────────────────────────────

interface DeliveryZone {
  wilaya_code: string;
  fee: number;
  enabled: boolean;
  free_above: number | null;
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

// ─── Success Overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({
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
  const router = useRouter();
  const [countdown, setCountdown] = useState(4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Open WhatsApp right away if available
    if (waLink) {
      setTimeout(() => window.open(waLink, "_blank"), 300);
    }

    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          router.push(`/${storeSlug}`);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router, storeSlug, waLink]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 px-8 text-center max-w-sm">
        {/* Animated checkmark */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center">
            <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path className="animate-[dash_0.6s_ease-in-out_0.2s_both]" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          {/* Ripple ring */}
          <div className="absolute inset-0 rounded-full border-4 border-emerald-300/40 animate-ping" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-stone-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Commande confirmée ! 🎉
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Merci pour votre commande chez <span className="font-semibold text-stone-700">{storeName}</span>.
            Vous serez contacté prochainement.
          </p>
          <p className="text-xs font-mono bg-stone-100 rounded-lg px-3 py-1.5 text-stone-600 inline-block">
            Réf : #{orderId.slice(-6).toUpperCase()}
          </p>
        </div>

        {/* WhatsApp CTA */}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] py-3.5 text-sm font-bold text-white transition-all shadow-lg shadow-emerald-200/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmer via WhatsApp
          </a>
        )}

        {/* Auto-redirect countdown */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-stone-400">
            Retour à la boutique dans{" "}
            <span className="font-bold text-stone-600">{countdown}s</span>…
          </p>
          {/* Progress bar */}
          <div className="w-40 h-1 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 4) * 100}%` }}
            />
          </div>
          <button
            onClick={() => router.push(`/${storeSlug}`)}
            className="text-xs text-stone-400 hover:text-stone-700 underline transition-colors"
          >
            Retourner à la boutique maintenant
          </button>
        </div>
      </div>
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
  const [zones, setZones]           = useState<DeliveryZone[]>([]);
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [deliveryFee, setDeliveryFee]       = useState(0);

  // Phase 2: Upsell state
  const [upsellProduct, setUpsellProduct]   = useState<{ id: string; name: string; price: number; image?: string } | null>(null);
  const [upsellSelected, setUpsellSelected] = useState(false);

  // Load upsell product candidate from store
  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price, images")
      .eq("store_id", store.id)
      .neq("id", product.id)
      .eq("status", "active")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0]) {
          const p = data[0];
          setUpsellProduct({
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            image: Array.isArray(p.images) && p.images.length > 0
              ? (typeof p.images[0] === "string" ? p.images[0] : (p.images[0] as any)?.url)
              : undefined,
          });
        }
      });
  }, [store.id, product.id, supabase]);

  const upsellExtra = (upsellSelected && upsellProduct) ? upsellProduct.price : 0;
  const qty      = Math.max(1, parseInt(form.quantity) || 1);
  const subtotal = (product.price * qty) + upsellExtra;
  const total    = subtotal + deliveryFee;

  // Load delivery zones for this store
  useEffect(() => {
    supabase
      .from("delivery_zones")
      .select("*")
      .eq("store_id", store.id)
      .eq("enabled", true)
      .then(({ data }) => setZones(((data ?? []) as any[]) as DeliveryZone[]));
  }, [store.id, supabase]);

  // Recalculate fee when wilaya or qty changes
  useEffect(() => {
    if (!selectedWilaya) { setDeliveryFee(0); return; }
    const zone = zones.find((z) => z.wilaya_code === selectedWilaya);
    if (!zone) { setDeliveryFee(0); return; }
    const free = zone.free_above !== null && subtotal >= zone.free_above;
    setDeliveryFee(free ? 0 : zone.fee);
  }, [selectedWilaya, zones, subtotal]);

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

    const fullAddress = selectedWilaya
      ? `Wilaya ${selectedWilaya}${form.address.trim() ? " — " + form.address.trim() : ""}`
      : form.address.trim() || null;

    const firstImg = product.images?.[0];
    const imgUrl =
      typeof firstImg === "string"
        ? firstImg
        : (firstImg as { url?: string } | undefined)?.url ?? null;

    let createdOrder: { id: string } | null = null;

    try {
      const apiRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: fullAddress,
          wilaya: selectedWilaya,
          notes: form.notes.trim() || null,
          items: [
            {
              product_id: product.id,
              name: product.name,
              price: product.price,
              quantity: qty,
              image: imgUrl,
            },
            ...(upsellSelected && upsellProduct ? [{
              product_id: upsellProduct.id,
              name: upsellProduct.name,
              price: upsellProduct.price,
              quantity: 1,
              image: upsellProduct.image || null,
            }] : []),
          ],
          total_amount: total,
        }),
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success && json.order) {
          createdOrder = json.order;
        }
      }
    } catch (e) {
      console.warn("API orders error, trying fallback:", e);
    }

    if (!createdOrder) {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          store_id: store.id,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: fullAddress,
          notes: form.notes.trim() || null,
          items: [
            {
              product_id: product.id,
              name: product.name,
              price: product.price,
              quantity: qty,
              image: imgUrl,
            },
          ],
          total_amount: total,
          status: "pending",
          payment_status: "pending",
        } as any)
        .select()
        .single();

      if (!error && order) {
        createdOrder = order as unknown as { id: string };
      }
    }

    setLoading(false);

    if (!createdOrder) {
      setServerError("Erreur lors de l'envoi. Veuillez réessayer.");
      return;
    }

    // Build WhatsApp message
    const phone = (store.whatsapp_phone ?? store.whatsapp_number ?? "").replace(/\D/g, "");
    const wilayaName = zones.find((z) => z.wilaya_code === selectedWilaya)
      ? `Wilaya ${selectedWilaya} — ${deliveryFee === 0 ? "Livraison gratuite" : deliveryFee.toLocaleString("fr-DZ") + " DZD livraison"}`
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
      `Réf. commande : #${createdOrder.id.slice(-6).toUpperCase()}`,
    ].filter(Boolean).join("\n");

    const wa = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : "";

    setOrderId(createdOrder.id);
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
      <SuccessOverlay
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

      {/* Wilaya select */}
      {zones.length > 0 && (
        <div>
          <Label>Wilaya de livraison</Label>
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className={inputClass + " appearance-none cursor-pointer"}
          >
            <option value="">Sélectionnez votre wilaya…</option>
            {zones.map((z) => {
              const free = z.free_above !== null && subtotal >= z.free_above;
              return (
                <option key={z.wilaya_code} value={z.wilaya_code} className="bg-white text-stone-800">
                  {z.wilaya_code.padStart(2, "0")} — Wilaya {z.wilaya_code}{" "}
                  ({free ? "Livraison gratuite 🎁" : `${z.fee.toLocaleString()} DZD`})
                </option>
              );
            })}
          </select>
          {selectedWilaya && deliveryFee === 0 && (
            <p className="mt-1 text-xs text-emerald-600 font-medium">🎁 Livraison gratuite pour cette wilaya !</p>
          )}
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
        <input 
          type="tel" 
          value={form.phone} 
          onChange={set("phone")}
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

      {/* Upsell / Offre groupée */}
      {upsellProduct && (
        <div className={`p-3.5 rounded-2xl border transition-all ${upsellSelected ? "border-indigo-500 bg-indigo-50/70 shadow-sm" : "border-stone-200 bg-stone-50"}`}>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={upsellSelected}
              onChange={(e) => setUpsellSelected(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-stone-300"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-800 truncate">
                  🎁 Offre spéciale : {upsellProduct.name}
                </span>
                <span className="text-xs font-black text-indigo-600 shrink-0">
                  +{upsellProduct.price.toLocaleString("fr-DZ")} DZD
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Cochez pour ajouter cet article complémentaire à votre commande !
              </p>
            </div>
          </label>
        </div>
      )}

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
