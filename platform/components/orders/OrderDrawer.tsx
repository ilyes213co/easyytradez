"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Order } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  options_selected?: Record<string, string>;
}

// ─── Status config ────────────────────────────────────────────────────────────

export const ORDER_STATUS = {
  pending:   { label: "En attente",  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",   dot: "bg-amber-500",   icon: "🕐", step: 0 },
  confirmed: { label: "Confirmée",   color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-500/10 border-blue-500/25",     dot: "bg-blue-500",    icon: "✓",  step: 1 },
  shipped:   { label: "Expédiée",    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/25", dot: "bg-purple-500",  icon: "🚚", step: 2 },
  delivered: { label: "Livrée",      color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-500", icon: "📦", step: 3 },
  cancelled: { label: "Annulée",     color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/10 border-rose-500/25",     dot: "bg-rose-500",    icon: "✕",  step: -1 },
} as const;

export const PAYMENT_STATUS = {
  pending:  { label: "Non payé",  color: "text-amber-400",   dot: "bg-amber-400"   },
  paid:     { label: "Payé",      color: "text-emerald-400", dot: "bg-emerald-400" },
  refunded: { label: "Remboursé", color: "text-white/40",    dot: "bg-white/30"    },
} as const;

export const STATUS_FLOW: Order["status"][] = ["pending", "confirmed", "shipped", "delivered"];

interface OrderDrawerProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdated: (updated: Order) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseItems(raw: Order["items"]): OrderItem[] {
  try {
    if (Array.isArray(raw)) return raw as OrderItem[];
    if (typeof raw === "string") return JSON.parse(raw);
    return [];
  } catch { return []; }
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const time = date.getTime();
  if (isNaN(time)) return "—";
  const diff = Date.now() - time;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Hier";
  if (d < 7) return `Il y a ${d}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatFullDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStepDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export function getCleanCustomerNote(notes: string | null | undefined): string | null {
  if (!notes) return null;
  // Nettoyer d'anciens JSON injectés automatiquement [Paiement: ...] | Options: {...}
  let clean = notes
    .replace(/\[Paiement:[^\]]*\]/gi, "")
    .replace(/Options:\s*\{[^}]*\}/gi, "")
    .replace(/\|\s*\|/g, "")
    .replace(/^[\s|:-]+|[\s|:-]+$/g, "")
    .trim();
  return clean.length > 0 ? clean : null;
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Status stepper ───────────────────────────────────────────────────────────

function StatusStepper({
  current,
  orderCreatedAt,
  orderUpdatedAt,
  onAdvance,
  loading,
}: {
  current: Order["status"];
  orderCreatedAt: string;
  orderUpdatedAt: string;
  onAdvance: (next: Order["status"]) => void;
  loading: boolean;
}) {
  if (current === "cancelled") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm font-bold">✕</span>
          <span className="text-sm text-red-300 font-medium">Commande annulée</span>
        </div>
        <button
          onClick={() => onAdvance("pending")}
          disabled={loading}
          className="text-xs text-red-300/80 hover:text-white underline underline-offset-2 transition-colors"
        >
          Réactiver
        </button>
      </div>
    );
  }

  const currentStep = ORDER_STATUS[current].step;
  const nextStatus = STATUS_FLOW[currentStep + 1] as Order["status"] | undefined;
  const progressPercent = (currentStep / (STATUS_FLOW.length - 1)) * 100;

  // Calculer l'horodatage pour chaque étape
  const getStepTimestamp = (stepIndex: number) => {
    if (stepIndex === 0) {
      return formatStepDate(orderCreatedAt);
    }
    if (stepIndex <= currentStep) {
      return formatStepDate(orderUpdatedAt || orderCreatedAt);
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Visual Stepper Track */}
      <div className="relative pt-2 pb-2">
        {/* Continuous Background Line */}
        <div className="absolute top-6 left-5 right-5 h-1 bg-white/[0.08] rounded-full -translate-y-1/2" />

        {/* Filling Active Line */}
        <div
          className="absolute top-6 left-5 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500 rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ width: `calc((100% - 2.5rem) * ${progressPercent / 100})` }}
        />

        {/* Steps Nodes */}
        <div className="relative flex justify-between items-start">
          {STATUS_FLOW.map((s, i) => {
            const cfg = ORDER_STATUS[s];
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            const stepTime = getStepTimestamp(i);

            return (
              <div key={s} className="flex flex-col items-center group w-1/4">
                {/* Node Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 z-10 ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-4 ring-[#0f0f18]"
                      : isCurrent
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/30 scale-110"
                      : "bg-[#181926] border border-white/10 text-white/25 ring-4 ring-[#0f0f18]"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span>{cfg.icon}</span>
                  )}
                </div>

                {/* Node Text & Timestamp */}
                <div className="mt-2 text-center px-0.5">
                  <p
                    className={`text-[11px] font-semibold tracking-tight transition-colors ${
                      isCompleted
                        ? "text-emerald-400"
                        : isCurrent
                        ? "text-indigo-300 font-bold"
                        : "text-white/30"
                    }`}
                  >
                    {cfg.label}
                  </p>
                  {stepTime && (
                    <p className="text-[10px] font-mono text-white/40 mt-0.5 whitespace-nowrap">
                      {stepTime}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advance button */}
      {nextStatus && (
        <button
          onClick={() => onAdvance(nextStatus)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-md shadow-indigo-600/30"
        >
          {loading ? <Spinner /> : (
            <>
              Passer à « {ORDER_STATUS[nextStatus].label} »
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          )}
        </button>
      )}

      {/* Cancel (only if not delivered) */}
      {current !== "delivered" && (
        <button
          onClick={() => onAdvance("cancelled")}
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.07] py-2 text-xs text-white/30 hover:text-red-400 hover:border-red-500/25 hover:bg-red-500/[0.06] transition-all"
        >
          Annuler la commande
        </button>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function OrderDrawer({ open, onClose, order, onUpdated }: OrderDrawerProps) {
  const supabase = getSupabaseBrowserClient();
  const [updating, setUpdating] = useState(false);
  const [payUpdating, setPayUpdating] = useState(false);

  if (!order) return null;

  const items = parseItems(order.items);
  const statusCfg = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
  const payCfg = PAYMENT_STATUS[order.payment_status] ?? PAYMENT_STATUS.pending;

  // Calcul exact du sous-total, livraison et total
  const itemsSubtotal = items.reduce(
    (acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 1)),
    0
  );
  const totalAmount = Number(order.total_amount ?? order.total ?? 0);
  const shippingFee = Math.max(0, totalAmount - itemsSubtotal);
  const isStopDesk = (order.shipping_address || order.customer_address || "")
    .toLowerCase()
    .includes("stop desk");
  const shipModeLabel = isStopDesk ? "Livraison Stop Desk" : "Livraison à domicile";

  // Note client propre (sans JSON technique automatique)
  const cleanCustomerNote = getCleanCustomerNote(order.notes);

  // ── Advance order status ─────────────────────────────────────────────────
  const handleStatusAdvance = async (next: Order["status"]) => {
    setUpdating(true);
    const { data, error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .select()
      .single();
    setUpdating(false);
    if (!error && data) {
      onUpdated({
        ...(data as Order),
        total: (data as any).total ?? (data as any).total_amount ?? 0,
        subtotal: itemsSubtotal,
        shipping_address: (data as any).shipping_address ?? (data as any).customer_address ?? null,
      });
    }
  };

  // ── Toggle payment status ────────────────────────────────────────────────
  const handlePayToggle = async () => {
    const next = order.payment_status === "paid" ? "pending" : "paid";
    setPayUpdating(true);
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: next })
      .eq("id", order.id)
      .select()
      .single();
    setPayUpdating(false);
    if (!error && data) {
      onUpdated({
        ...(data as Order),
        total: (data as any).total ?? (data as any).total_amount ?? 0,
        subtotal: itemsSubtotal,
        shipping_address: (data as any).shipping_address ?? (data as any).customer_address ?? null,
      });
    }
  };

  // ── WhatsApp & Tel links ──────────────────────────────────────────────────
  const cleanPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, "") : "";
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Bonjour ${order.customer_name} ! Votre commande #${order.id.slice(-6).toUpperCase()} est ${statusCfg.label.toLowerCase()}.`
  )}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0f0f18] border-l border-white/[0.08] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header avec Référence & Heure relative avec tooltip */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/[0.07] shrink-0 bg-white/[0.01]">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/40 font-mono tracking-wider">
                #{order.id.slice(-8).toUpperCase()}
              </p>
              <span
                title={`Reçue le ${formatFullDateTime(order.created_at)}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] text-white/70 border border-white/10 cursor-help hover:bg-white/10 transition-colors"
              >
                <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {timeAgo(order.created_at)}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Commande de {order.customer_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5 custom-scrollbar">

          {/* Stepper de progression (Point 1) */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-2">Progression de la commande</p>
            <StatusStepper
              current={order.status}
              orderCreatedAt={order.created_at}
              orderUpdatedAt={order.updated_at}
              onAdvance={handleStatusAdvance}
              loading={updating}
            />
          </section>

          <div className="h-px bg-white/[0.05]" />

          {/* Client info avec Appel direct & WhatsApp (Point 3) */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Client</p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {order.customer_name ? order.customer_name[0]?.toUpperCase() : "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{order.customer_name || "Client sans nom"}</p>
                  {order.customer_email && (
                    <p className="text-xs text-white/40">{order.customer_email}</p>
                  )}
                </div>
              </div>

              {/* Téléphone + Bouton Appel Direct + Bouton WhatsApp */}
              <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white/70 font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
                  </svg>
                  <span>{order.customer_phone || "—"}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton Appel Direct (tel:) */}
                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200 transition-all shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                      title="Appeler directement ce client"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
                      </svg>
                      Appeler
                    </a>
                  )}

                  {/* Bouton WhatsApp */}
                  {cleanPhone && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 transition-all shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                      title="Envoyer un message WhatsApp"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Adresse de livraison */}
              {(order.shipping_address ?? order.customer_address) && (
                <div className="flex items-start gap-2 px-4 py-3 text-sm text-white/60">
                  <svg className="mt-0.5 shrink-0 text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{order.shipping_address ?? order.customer_address}</span>
                </div>
              )}
            </div>
          </section>

          {/* Products & Totaux Exacts (Point 0) */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">
              Produits · {items.length} article{items.length !== 1 ? "s" : ""}
            </p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              {items.length > 0 ? items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] shrink-0 border border-white/5">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{item.name}</p>
                    {/* Variantes et options */}
                    {item.options_selected && Object.keys(item.options_selected).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Object.entries(item.options_selected).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/[0.06] text-white/80 px-2 py-0.5 rounded-md border border-white/[0.08]"
                          >
                            <span className="text-white/40">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-white/40 mt-0.5">Quantité : × {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-white/90 shrink-0 font-mono">
                    {(Number(item?.price || 0) * Number(item?.quantity || 1)).toLocaleString("fr-DZ")} DZD
                  </p>
                </div>
              )) : (
                <div className="px-4 py-4 text-sm text-white/30 text-center">Aucun article</div>
              )}

              {/* Totals avec calcul clair du Sous-total et de la Livraison (Point 0) */}
              <div className="px-4 py-3.5 space-y-2 bg-white/[0.015]">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Sous-total ({items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)} article{items.length > 1 ? "s" : ""})</span>
                  <span className="font-mono text-white/80">{itemsSubtotal.toLocaleString("fr-DZ")} DZD</span>
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span className="flex items-center gap-1.5">
                    <span>{shipModeLabel}</span>
                  </span>
                  <span className="font-mono text-white/80">
                    {shippingFee === 0 ? "Gratuite" : `${shippingFee.toLocaleString("fr-DZ")} DZD`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.08]">
                  <span>Total commande</span>
                  <span className="font-mono text-emerald-400 text-base">{totalAmount.toLocaleString("fr-DZ")} DZD</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Paiement</p>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${payCfg.dot}`} />
                <span className={`text-sm font-medium ${payCfg.color}`}>{payCfg.label}</span>
              </div>
              <button
                onClick={handlePayToggle}
                disabled={payUpdating || order.payment_status === "refunded"}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {payUpdating ? <Spinner /> : order.payment_status === "paid" ? "Marquer non payé" : "Marquer payé"}
              </button>
            </div>
          </section>

          {/* Meta & Note Client Propre (Point 6) */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-3">Détails de la commande</p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              <div className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-white/40">Date exacte</span>
                <span className="text-white/70 font-mono" title={order.created_at}>{formatFullDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-white/40">Référence</span>
                <span className="font-mono text-white/70">#{order.id.slice(-8).toUpperCase()}</span>
              </div>

              {/* Note client : affichée UNIQUEMENT si un vrai texte existe */}
              {cleanCustomerNote && (
                <div className="px-4 py-3 text-xs bg-amber-500/[0.03]">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Note client
                  </span>
                  <p className="text-white/80 whitespace-pre-wrap leading-relaxed italic bg-black/20 p-2 rounded-lg border border-amber-500/10">
                    « {cleanCustomerNote} »
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
