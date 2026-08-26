"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { OrderDrawer, ORDER_STATUS, PAYMENT_STATUS } from "@/components/orders/OrderDrawer";
import type { Order, Store } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | Order["status"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatAmount(n: number) {
  return n.toLocaleString("fr-DZ") + " DZD";
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Order["status"] }) {
  const cfg = ORDER_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function PayBadge({ status }: { status: Order["payment_status"] }) {
  const cfg = PAYMENT_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-[#0f0f18] px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-base">🔔</span>
      <p className="text-sm font-medium text-white/85">{message}</p>
      <button onClick={onDismiss} className="text-white/30 hover:text-white/60 transition-colors ml-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-2xl mb-4">
        {filtered ? "🔍" : "🛒"}
      </div>
      <h3 className="text-sm font-semibold text-white/70 mb-1">
        {filtered ? "Aucune commande trouvée" : "Aucune commande pour l'instant"}
      </h3>
      <p className="text-xs text-white/30 max-w-xs">
        {filtered
          ? "Essayez de changer le filtre ou la recherche."
          : "Les commandes de vos clients apparaîtront ici en temps réel dès qu'elles seront passées."}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [store, setStore]       = useState<Store | null>(null);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]     = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  // ── Load store + orders ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: storeData } = await supabase
      .from("stores").select("*").eq("owner_id", user.id).single();
    setStore(storeData);

    if (storeData) {
      const { data } = await supabase
        .from("orders").select("*").eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!store) return;

    // Clean previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`orders:store:${store.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${store.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            setToast(`Nouvelle commande de ${newOrder.customer_name} — ${formatAmount(newOrder.total)}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
            // Keep drawer in sync
            setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, supabase]);

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.customer_name.toLowerCase().includes(q) &&
          !o.customer_phone.includes(q) &&
          !o.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const today = new Date().toDateString();
  const stats = {
    total:    orders.length,
    pending:  orders.filter((o) => o.status === "pending").length,
    revenue:  orders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + o.total, 0),
    today:    orders.filter((o) => new Date(o.created_at).toDateString() === today).length,
  };

  // ── Open drawer ───────────────────────────────────────────────────────────
  const openOrder = (o: Order) => {
    setSelectedOrder(o);
    setDrawerOpen(true);
  };

  const handleUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    setSelectedOrder(updated);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Commandes
          </h1>
          <p className="text-sm text-white/35 mt-0.5 flex items-center gap-1.5">
            {stats.total} commande{stats.total !== 1 ? "s" : ""}
            {/* Realtime indicator */}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Temps réel
            </span>
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: stats.total,                     icon: "🛒", color: "text-white/80",    sub: "commandes" },
          { label: "En attente",  value: stats.pending,                   icon: "🕐", color: "text-amber-400",   sub: "à traiter" },
          { label: "Aujourd'hui", value: stats.today,                     icon: "📅", color: "text-indigo-400",  sub: "nouvelles" },
          { label: "Revenus",     value: formatAmount(stats.revenue),     icon: "💰", color: "text-emerald-400", sub: "encaissés" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <p className="text-lg mb-1">{s.icon}</p>
            <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/30 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, téléphone, référence…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-0.5 flex-wrap">
          {(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              {s === "all" ? "Toutes" : ORDER_STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/30 gap-3">
          <Spinner /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filtered={search !== "" || statusFilter !== "all"} />
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Référence", "Client", "Produits", "Total", "Paiement", "Statut", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const items = (() => {
                  try { return Array.isArray(order.items) ? order.items : JSON.parse(order.items as string); }
                  catch { return []; }
                })() as { name: string; quantity: number }[];

                return (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group"
                  >
                    {/* Ref */}
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-indigo-400/80">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white/80">{order.customer_name}</p>
                      <p className="text-xs text-white/30">{order.customer_phone}</p>
                    </td>

                    {/* Products summary */}
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-xs text-white/50 truncate">
                        {items.length > 0
                          ? items.map((it) => `${it.name} ×${it.quantity}`).join(", ")
                          : "—"}
                      </p>
                      <p className="text-xs text-white/25">{items.length} article{items.length !== 1 ? "s" : ""}</p>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-white">{order.total.toLocaleString()}</span>
                      <span className="text-xs text-white/30 ml-1">DZD</span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3">
                      <PayBadge status={order.payment_status} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-white/40">{timeAgo(order.created_at)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table footer */}
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <p className="text-xs text-white/25">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              {statusFilter !== "all" || search ? ` sur ${orders.length} total` : ""}
            </p>
            <p className="text-xs text-white/20">Cliquez sur une ligne pour voir le détail</p>
          </div>
        </div>
      )}

      {/* Drawer */}
      <OrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrder}
        onUpdated={handleUpdated}
      />

      {/* Realtime toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
