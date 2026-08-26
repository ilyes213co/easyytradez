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
}

// ─── Status config ────────────────────────────────────────────────────────────

export const ORDER_STATUS = {
  pending:   { label: "En attente",  color: "text-amber-400",   bg: "bg-amber-500/15  border-amber-500/25",  icon: "🕐", step: 0 },
  confirmed: { label: "Confirmée",   color: "text-blue-400",    bg: "bg-blue-500/15   border-blue-500/25",   icon: "✅", step: 1 },
  shipped:   { label: "Expédiée",    color: "text-indigo-400",  bg: "bg-indigo-500/15 border-indigo-500/25", icon: "🚚", step: 2 },
  delivered: { label: "Livrée",      color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25",icon: "📦", step: 3 },
  cancelled: { label: "Annulée",     color: "text-red-400",     bg: "bg-red-500/15    border-red-500/25",    icon: "✕",  step: -1 },
} as const;

export const PAYMENT_STATUS = {
  pending:  { label: "Non payé",  color: "text-amber-400",   dot: "bg-amber-400"   },
  paid:     { label: "Payé",      color: "text-emerald-400", dot: "bg-emerald-400" },
  refunded: { label: "Remboursé", color: "text-white/40",    dot: "bg-white/30"    },
} as const;

const STATUS_FLOW: Order["status"][] = ["pending", "confirmed", "shipped", "delivered"];

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Status stepper ───────────────────────────────────────────────────────────

function StatusStepper({ current, onAdvance, loading }: {
  current: Order["status"];
  onAdvance: (next: Order["status"]) => void;
  loading: boolean;
}) {
  if (current === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
        <span className="text-red-400 text-sm">✕</span>
        <span className="text-sm text-red-300 font-medium">Commande annulée</span>
      </div>
    );
  }

  const currentStep = ORDER_STATUS[current].step;
  const nextStatus = STATUS_FLOW[currentStep + 1] as Order["status"] | undefined;

  return (
    <div className="space-y-3">
      {/* Timeline */}
      <div className="flex items-center gap-0">
        {STATUS_FLOW.map((s, i) => {
          const cfg = ORDER_STATUS[s];
          const done = cfg.step <= currentStep;
          const active = cfg.step === currentStep;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm border transition-all",
                  done
                    ? active
                      ? "bg-indigo-500/25 border-indigo-500/60 text-indigo-300"
                      : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.03] border-white/10 text-white/20",
                ].join(" ")}>
                  {done && !active ? "✓" : cfg.icon}
                </div>
                <span className={`text-[10px] font-medium ${done ? active ? "text-indigo-300" : "text-emerald-400" : "text-white/20"}`}>
                  {cfg.label}
                </span>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className="flex-1 h-px mx-1 mb-4 rounded-full overflow-hidden bg-white/[0.06]">
                  <div
                    className="h-full bg-emerald-500/60 transition-all duration-500"
                    style={{ width: currentStep > i ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advance button */}
      {nextStatus && (
        <button
          onClick={() => onAdvance(nextStatus)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ boxShadow: "0 0 16px rgba(99,102,241,0.18)" }}
        >
          {loading ? <Spinner /> : (
            <>
              Marquer comme « {ORDER_STATUS[nextStatus].label} »
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
          className="w-full rounded-xl border border-white/[0.07] py-2 text-xs text-white/25 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/[0.06] transition-all"
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
  const statusCfg = ORDER_STATUS[order.status];
  const payCfg = PAYMENT_STATUS[order.payment_status];

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
    if (!error && data) onUpdated(data as Order);
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
    if (!error && data) onUpdated(data as Order);
  };

  // ── WhatsApp link ────────────────────────────────────────────────────────
  const waLink = `https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Bonjour ${order.customer_name} ! Votre commande #${order.id.slice(-6).toUpperCase()} est ${statusCfg.label.toLowerCase()}.`
  )}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0f0f18] border-l border-white/[0.08] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-xs text-white/30 font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </p>
            <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Commande de {order.customer_name}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status stepper */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-3">Avancement</p>
            <StatusStepper
              current={order.status}
              onAdvance={handleStatusAdvance}
              loading={updating}
            />
          </section>

          <div className="h-px bg-white/[0.05]" />

          {/* Client info */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-3">Client</p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {order.customer_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/85">{order.customer_name}</p>
                  {order.customer_email && (
                    <p className="text-xs text-white/35">{order.customer_email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
                  </svg>
                  {order.customer_phone}
                </div>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/25 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
              {(order.shipping_address ?? order.customer_address) && (
                <div className="flex items-start gap-2 px-4 py-3 text-sm text-white/50">
                  <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {order.shipping_address ?? order.customer_address}
                </div>
              )}
            </div>
          </section>

          {/* Products */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-3">
              Produits · {items.length} article{items.length !== 1 ? "s" : ""}
            </p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              {items.length > 0 ? items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{item.name}</p>
                    <p className="text-xs text-white/30">× {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-white shrink-0">
                    {(item.price * item.quantity).toLocaleString()} DZD
                  </p>
                </div>
              )) : (
                <div className="px-4 py-4 text-sm text-white/30 text-center">Aucun article</div>
              )}

              {/* Totals */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs text-white/35">
                  <span>Sous-total</span>
                  <span>{(order.subtotal ?? order.total_amount ?? 0).toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-white/[0.06]">
                  <span>Total</span>
                  <span>{(order.total ?? order.total_amount ?? 0).toLocaleString()} DZD</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-3">Paiement</p>
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${payCfg.dot}`} />
                <span className={`text-sm font-medium ${payCfg.color}`}>{payCfg.label}</span>
              </div>
              <button
                onClick={handlePayToggle}
                disabled={payUpdating || order.payment_status === "refunded"}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {payUpdating ? <Spinner /> : order.payment_status === "paid" ? "Marquer non payé" : "Marquer payé"}
              </button>
            </div>
          </section>

          {/* Meta */}
          <section>
            <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-3">Détails</p>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] divide-y divide-white/[0.05]">
              <div className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-white/35">Date</span>
                <span className="text-white/60">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-white/35">Référence</span>
                <span className="font-mono text-white/60">#{order.id.slice(-8).toUpperCase()}</span>
              </div>
              {order.notes && (
                <div className="px-4 py-2.5 text-xs">
                  <span className="text-white/35 block mb-1">Note client</span>
                  <span className="text-white/55 italic">{order.notes}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
