"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  OrderDrawer,
  ORDER_STATUS,
  PAYMENT_STATUS,
  timeAgo,
  formatFullDateTime,
} from "@/components/orders/OrderDrawer";
import type { Order, Store } from "@/lib/supabase";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  ChevronRight,
  Phone,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";

type StatusFilter = "all" | Order["status"];

interface OrdersViewProps {
  type: "boutique" | "funnel";
}

function formatAmount(n: any) {
  if (n === null || n === undefined || n === "") return "0 DZD";
  const val = Number(n);
  if (isNaN(val)) return "0 DZD";
  return val.toLocaleString("fr-DZ") + " DZD";
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status Badge Coloré (Point 4) ────────────────────────────────────────────

export function StatusBadge({ status }: { status: Order["status"] }) {
  const configs: Record<
    Order["status"],
    { label: string; badgeClass: string; dotClass: string }
  > = {
    pending: {
      label: "En attente",
      badgeClass:
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
      dotClass: "bg-amber-500",
    },
    confirmed: {
      label: "Confirmée",
      badgeClass:
        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
      dotClass: "bg-blue-500",
    },
    shipped: {
      label: "Expédiée",
      badgeClass:
        "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25",
      dotClass: "bg-purple-500",
    },
    delivered: {
      label: "Livrée",
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      dotClass: "bg-emerald-500",
    },
    cancelled: {
      label: "Annulée",
      badgeClass:
        "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25",
      dotClass: "bg-rose-500",
    },
  };

  const cfg = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass} shadow-xs transition-all`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      <span>{cfg.label}</span>
    </span>
  );
}

export default function OrdersView({ type }: OrdersViewProps) {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sélections multiples & actions rapides (Point 5)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickUpdatingId, setQuickUpdatingId] = useState<string | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);

  // Clear state when switching between boutique and funnel
  useEffect(() => {
    setSelectedStoreId("all");
    setOrders([]);
    setStores([]);
    setSelectedIds(new Set());
  }, [type]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: storeList } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", user.id)
      .eq("type", type);

    const stList = (storeList ?? []) as unknown as Store[];
    setStores(stList);

    if (stList.length === 0) {
      setSelectedStoreId("all");
      setOrders([]);
      setLoading(false);
      return;
    }

    const storeIds = stList.map((s) => s.id);

    // Validate that selectedStoreId actually belongs to this section's stores
    let effectiveStoreId = selectedStoreId;
    if (effectiveStoreId !== "all" && !storeIds.includes(effectiveStoreId)) {
      effectiveStoreId = "all";
      setSelectedStoreId("all");
    }

    let query = supabase.from("orders").select("*");
    if (effectiveStoreId !== "all") {
      query = query.eq("store_id", effectiveStoreId);
    } else {
      query = query.in("store_id", storeIds);
    }

    const { data } = await query.order("created_at", { ascending: false });
    const mappedOrders = ((data ?? []) as any[]).map((o) => ({
      ...o,
      total: o.total ?? o.total_amount ?? 0,
      subtotal: o.subtotal ?? o.total_amount ?? 0,
      shipping_address: o.shipping_address ?? o.customer_address ?? null,
    })) as Order[];

    setOrders(mappedOrders);
    setLoading(false);
  }, [user, supabase, type, selectedStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (stores.length === 0) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`orders:${type}:${user?.id ?? "global"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const raw = payload.new as any;
          const storeIds = stores.map((s) => s.id);
          if (raw && !storeIds.includes(raw.store_id)) return;

          if (payload.eventType === "INSERT") {
            const newOrder: Order = {
              ...raw,
              total: raw.total ?? raw.total_amount ?? 0,
              subtotal: raw.subtotal ?? raw.total_amount ?? 0,
              shipping_address: raw.shipping_address ?? raw.customer_address ?? null,
            };
            setOrders((prev) => [newOrder, ...prev]);
          } else if (payload.eventType === "UPDATE") {
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
  }, [stores, supabase, type, user?.id]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.wilaya?.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  // ── Action Rapide : Confirmer une commande individuelle (Point 5) ────────────
  const handleQuickConfirm = async (orderId: string) => {
    setQuickUpdatingId(orderId);
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "confirmed" } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: "confirmed" } : prev));
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    setQuickUpdatingId(null);
    if (error) {
      // Revert if error
      loadData();
    }
  };

  // ── Action Groupée : Confirmer la sélection (Point 5) ───────────────────────
  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkConfirming(true);

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (ids.includes(o.id) ? { ...o, status: "confirmed" } : o))
    );

    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .in("id", ids);

    setBulkConfirming(false);
    setSelectedIds(new Set());

    if (error) {
      loadData();
    }
  };

  // ── Gestion de la sélection par checkbox ─────────────────────────────────────
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Commandes {type === "funnel" ? "Funnels" : "Boutiques"}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60">
            {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {stores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white/80 focus:border-accent outline-none shadow-sm"
            >
              <option value="all">Tous les {type === "funnel" ? "funnels" : "boutiques"}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-colors shadow-sm"
            title="Rafraîchir les commandes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Focused Search & Status Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom client, téléphone, wilaya, identifiant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:border-accent outline-none transition-colors shadow-sm"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {(["all", "pending", "confirmed", "shipped", "delivered", "cancelled"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-accent text-white shadow-sm"
                  : "bg-white dark:bg-white/[0.03] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/5"
              }`}
            >
              {st === "all" ? "Toutes" : ORDER_STATUS[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Table */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1e] overflow-hidden shadow-sm dark:shadow-xl">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 dark:text-white/40">Chargement des commandes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-white/40 flex items-center justify-center mx-auto text-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {search ? "Aucune commande trouvée pour cette recherche" : "Aucune commande enregistrée"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 max-w-sm mx-auto">
              {search
                ? "Essayez avec d'autres mots-clés ou réinitialisez les filtres."
                : `Les commandes passées sur vos ${type === "funnel" ? "funnels" : "boutiques"} apparaîtront ici immédiatement.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] text-slate-400 dark:text-white/40 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  {/* Checkbox Tout sélectionner (Point 5) */}
                  <th className="py-3 px-3 text-center w-9">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-accent focus:ring-accent accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Commande & Client</th>
                  <th className="py-3 px-4">Téléphone / Wilaya</th>
                  <th className="py-3 px-4">Date de réception</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Actions rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filtered.map((order) => {
                  const isSelected = selectedIds.has(order.id);
                  const isPending = order.status === "pending";

                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setDrawerOpen(true);
                      }}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-indigo-500/[0.06] dark:bg-indigo-500/10"
                          : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Checkbox de ligne (Point 5) */}
                      <td
                        className="py-3.5 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectRow(order.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner commande ${order.id}`}
                          checked={isSelected}
                          onChange={() => toggleSelectRow(order.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-accent focus:ring-accent accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Customer & ID */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
                          {order.customer_name || "Client sans nom"}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 dark:text-white/40 mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </td>

                      {/* Phone & Wilaya */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <p className="text-slate-700 dark:text-white/80 font-medium">
                          {order.customer_phone || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-white/40">
                          {order.wilaya || "Algérie"}
                        </p>
                      </td>

                      {/* Date de réception relative avec tooltip au survol (Point 2) */}
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div
                          title={`Reçue le ${formatFullDateTime(order.created_at)}`}
                          className="cursor-help group/date"
                        >
                          <p className="font-semibold text-slate-800 dark:text-white/90 group-hover/date:text-accent transition-colors flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-white/40" />
                            {timeAgo(order.created_at)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-white/40 font-mono mt-0.5">
                            {formatShortDate(order.created_at)}
                          </p>
                        </div>
                      </td>

                      {/* Statut avec Badge coloré (Point 4) */}
                      <td className="py-3.5 px-4 min-w-[120px]">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right min-w-[120px]">
                        <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                          {formatAmount(order.total ?? order.total_amount)}
                        </span>
                      </td>

                      {/* Action Rapide Ligne par Ligne + Détail (Point 5) */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-center gap-2">
                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickConfirm(order.id);
                              }}
                              disabled={quickUpdatingId === order.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                              title="Confirmer cette commande directement"
                            >
                              {quickUpdatingId === order.id ? (
                                <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Confirmer</span>
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/50 group-hover:text-accent dark:group-hover:text-white group-hover:bg-accent/10 dark:group-hover:bg-accent/20 transition-colors"
                            title="Ouvrir le détail de la commande"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Barre d'action groupée flottante (Point 5) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3.5 bg-slate-900/95 dark:bg-[#121324]/95 text-white px-5 py-3 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-white/90">
              {selectedIds.size} commande{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Bouton Confirmer la sélection */}
          <button
            type="button"
            onClick={handleBulkConfirm}
            disabled={bulkConfirming}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
          >
            {bulkConfirming ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Confirmer la sélection
          </button>

          {/* Bouton Désélectionner */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-colors"
          >
            Désélectionner
          </button>
        </div>
      )}

      {/* Order Detail Drawer */}
      <OrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        order={selectedOrder}
        onUpdated={(updated) => {
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setSelectedOrder(updated);
        }}
      />
    </div>
  );
}
