"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/components/orders/OrderDrawer";
import { storesApi, ordersApi } from "@/lib/api";
import type { Order, Store } from "@/lib/supabase";
import { useStores } from "@/hooks/use-stores";

const OrderDrawer = dynamic(
  () => import("@/components/orders/OrderDrawer").then((mod) => mod.OrderDrawer),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | Order["status"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatAmount(n: number) {
  return (n || 0).toLocaleString("fr-DZ") + " DZD";
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Status badges ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Order["status"] }) {
  const cfg = ORDER_STATUS[status] ?? { label: status, bg: "bg-white/10", color: "text-white", icon: "•" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function PayBadge({ status }: { status: Order["payment_status"] }) {
  const cfg = PAYMENT_STATUS[status] ?? { label: status, color: "text-white/60", dot: "bg-white/40" };
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-blue-400/30 bg-[#090d24] px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
      <span className="text-base">🔔</span>
      <p className="text-sm font-medium text-white/85">{message}</p>
      <button onClick={onDismiss} className="text-white/30 hover:text-white/60 transition-colors ml-1" aria-label="Fermer">
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
          ? "Essayez de changer le filtre ou les termes de votre recherche."
          : "Les commandes de vos clients apparaîtront ici en temps réel dès qu'elles seront passées."}
      </p>
    </div>
  );
}

// ─── Orders Content ───────────────────────────────────────────────────────────

function OrdersContent() {
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get("store");

  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: cachedStores = [] } = useStores();
  const [stores, setStores]             = useState<Store[]>([]);
  const [store, setStore]               = useState<Store | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeIdParam || "all");
  const [orders, setOrders]             = useState<Order[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]             = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [toast, setToast]               = useState<string | null>(null);

  const exportOrdersToCsv = () => {
    if (orders.length === 0) {
      setToast("Aucune commande à exporter");
      return;
    }
    const headers = [
      "Reference",
      "Client",
      "Telephone",
      "Adresse",
      "Total (DZD)",
      "Statut",
      "Paiement",
      "Articles",
      "Date",
    ];
    const rows = orders.map((o) => {
      const itemsList = Array.isArray(o.items)
        ? o.items.map((i: any) => `${i.name || "Article"} (x${i.quantity || 1})`).join(" ; ")
        : "";
      const address = typeof o.shipping_address === "string" ? o.shipping_address : (o.customer_address || "");
      return [
        `"#${o.id.slice(-6).toUpperCase()}"`,
        `"${(o.customer_name || "").replace(/"/g, '""')}"`,
        `"${o.customer_phone || ""}"`,
        `"${address.replace(/"/g, '""')}"`,
        `"${o.total || o.total_amount || 0}"`,
        `"${o.status}"`,
        `"${o.payment_status || "pending"}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
        `"${new Date(o.created_at).toLocaleDateString("fr-FR")}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Fichier CSV des commandes téléchargé avec succès !");
  };

  // ── Load stores & orders ─────────────────────────────────────────────────
  const fetchOrdersForStore = useCallback(async (storeId: string) => {
    setLoading(true);
    let rawOrders: any[] = [];
    try {
      const url = (!storeId || storeId === "all") ? "/api/orders" : `/api/orders?store_id=${storeId}`;
      const apiRes = await fetch(url);
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.success && Array.isArray(json.orders)) {
          rawOrders = json.orders;
        }
      }
    } catch (e) {
      console.warn("API orders fetch fallback:", e);
    }

    if (rawOrders.length === 0 && storeId && storeId !== "all") {
      try {
        const apiOrders = await ordersApi.getByStore(storeId);
        if (apiOrders && apiOrders.length > 0) rawOrders = apiOrders;
      } catch (e) {}
    }

    if (rawOrders.length === 0) {
      try {
        let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (storeId && storeId !== "all") {
          q = q.eq("store_id", storeId);
        }
        const { data } = await q;
        if (data && data.length > 0) rawOrders = data;
      } catch (e) {}
    }

    const mappedOrders = rawOrders.map((o) => ({
      ...o,
      total: o.total ?? o.total_amount ?? 0,
      subtotal: o.subtotal ?? o.total_amount ?? 0,
      shipping_address: o.shipping_address ?? o.customer_address ?? null,
    })) as Order[];
    setOrders(mappedOrders);
    setLoading(false);
  }, [supabase]);

  const loadData = useCallback(async () => {
    if (!user) return;

    let userStores: Store[] = (cachedStores.length ? cachedStores : []) as unknown as Store[];
    if (!userStores.length) {
      try {
        const res = await storesApi.getAll();
        userStores = Array.isArray(res) ? (res as unknown as Store[]) : [];
      } catch {
        const { data } = await supabase
          .from("stores").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
        userStores = (data ?? []) as unknown as Store[];
      }
    }
    setStores(userStores);

    const initialStoreId = storeIdParam || selectedStoreId || "all";
    if (initialStoreId !== "all") {
      const matched = userStores.find((s) => s.id === initialStoreId) || userStores[0] || null;
      setStore(matched);
    } else {
      setStore(null);
    }

    await fetchOrdersForStore(initialStoreId);
  }, [user, supabase, storeIdParam, selectedStoreId, fetchOrdersForStore, cachedStores]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!store) return;

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
            const raw = payload.new as any;
            const newOrder: Order = {
              ...raw,
              total: raw.total ?? raw.total_amount ?? 0,
              subtotal: raw.subtotal ?? raw.total_amount ?? 0,
              shipping_address: raw.shipping_address ?? raw.customer_address ?? null,
            };
            setOrders((prev) => [newOrder, ...prev]);
            setToast(`Nouvelle commande de ${newOrder.customer_name} — ${formatAmount(newOrder.total)}`);
          } else if (payload.eventType === "UPDATE") {
            const raw = payload.new as any;
            const updated: Order = {
              ...raw,
              total: raw.total ?? raw.total_amount ?? 0,
              subtotal: raw.subtotal ?? raw.total_amount ?? 0,
              shipping_address: raw.shipping_address ?? raw.customer_address ?? null,
            };
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedOrder((prev) => (prev?.id === updated.id ? updated : prev));
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store, supabase]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalRevenue = 0;
    let pendingCount = 0;
    let todayCount = 0;

    orders.forEach((o) => {
      const t = o.total ?? o.total_amount ?? 0;
      if (o.status !== "cancelled") totalRevenue += t;
      if (o.status === "pending") pendingCount++;
      if (new Date(o.created_at) >= today) todayCount++;
    });

    return {
      total: orders.length,
      revenue: totalRevenue,
      pending: pendingCount,
      today: todayCount,
    };
  }, [orders]);

  // ── Filtered orders ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName  = o.customer_name?.toLowerCase().includes(q);
        const matchPhone = o.customer_phone?.includes(q);
        const matchId    = o.id.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const handleUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Commandes
          </h1>
          <p className="text-sm text-white/40 mt-0.5 flex items-center gap-2">
            {stats.total} commande{stats.total !== 1 ? "s" : ""}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Temps réel
            </span>
          </p>
        </div>

        {/* Store switcher if user owns multiple stores */}
        {stores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">Boutique :</label>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedStoreId(newId);
                const target = stores.find((s) => s.id === newId) || null;
                setStore(target);
                fetchOrdersForStore(newId);
              }}
              className="rounded-xl border border-white/10 bg-[#121218] px-3 py-2 text-xs font-medium text-white outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="all" className="bg-[#121218] text-white">
                ✨ Toutes mes boutiques ({stores.length})
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#121218] text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80">
            📦 Liste des commandes ({orders.length})
          </span>
        </div>

        <button
          onClick={exportOrdersToCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exporter les commandes (CSV)</span>
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: stats.total,                 icon: "🛒", color: "text-white/80",    sub: "commandes" },
          { label: "En attente",  value: stats.pending,               icon: "⏳", color: "text-amber-400",   sub: "à traiter" },
          { label: "Aujourd'hui", value: stats.today,                 icon: "📅", color: "text-blue-400",  sub: "nouvelles" },
          { label: "Revenus",     value: formatAmount(stats.revenue), icon: "💰", color: "text-emerald-400", sub: "encaissés" },
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
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, téléphone, référence…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-0.5 flex-wrap">
              {(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    statusFilter === s ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"
                  }`}
                >
                  {s === "all" ? "Toutes" : ORDER_STATUS[s]?.label ?? s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-white/30 gap-3">
              <Spinner /> Chargement des commandes…
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
                      try {
                        return Array.isArray(order.items) ? order.items : JSON.parse(order.items as string);
                      } catch {
                        return [];
                      }
                    })() as { name: string; quantity: number }[];

                    const orderTotal = order.total ?? order.total_amount ?? 0;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => openOrder(order)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer group"
                      >
                        {/* Ref */}
                        <td className="px-5 py-3">
                          {selectedStoreId === "all" && (
                            <span className="inline-block mr-2 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-[10px] font-semibold text-blue-300">
                              {stores.find((s) => s.id === order.store_id)?.name || "Boutique"}
                            </span>
                          )}
                          <span className="font-mono text-xs text-blue-400/80">
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
                          <span className="text-sm font-bold text-white">{orderTotal.toLocaleString("fr-DZ")}</span>
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

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
