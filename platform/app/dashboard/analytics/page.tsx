"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from "recharts";
import { analyticsApi } from "@/lib/api";
import { resolveOwnedStore } from "@/lib/current-store";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "today" | "7d" | "30d" | "3m";

interface KPI {
  views: number;
  views_prev: number;
  whatsapp_clicks: number;
  whatsapp_clicks_prev: number;
  conversion_rate: number;
  conversion_rate_prev: number;
  confirmed_orders: number;
  confirmed_orders_prev: number;
}

interface DailyView    { date: string; views: number }
interface TopProduct   { product_id: string; name: string; views: number; image?: string }
interface TrafficSource{ source: string; count: number }
interface OrderRow {
  id: string;
  created_at: string;
  customer_name: string;
  items: { name: string; qty: number }[];
  total_amount: number;
  status: string;
}

interface AnalyticsData {
  kpi: KPI;
  daily_views: DailyView[];
  top_products: TopProduct[];
  traffic_sources: TrafficSource[];
  recent_orders: OrderRow[];
  store_id: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  "7d":  "7 jours",
  "30d": "30 jours",
  "3m":  "3 mois",
};

const PIE_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#64748b"];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "En attente" },
  confirmed: { bg: "bg-blue-500/10",    text: "text-blue-400",    label: "Confirmée"  },
  shipped:   { bg: "bg-indigo-500/10",  text: "text-indigo-400",  label: "Expédiée"   },
  delivered: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Livrée"     },
  cancelled: { bg: "bg-red-500/10",     text: "text-red-400",     label: "Annulée"    },
};
const DEFAULT_STATUS_STYLE = { bg: "bg-white/10", text: "text-white/70", label: "Inconnu" } as const;

function pct(current: number, prev: number): { value: number; up: boolean } {
  if (prev === 0) return { value: 0, up: true };
  const v = Math.round(((current - prev) / prev) * 100);
  return { value: Math.abs(v), up: v >= 0 };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function maskName(name: string): string {
  if (!name) return "—";
  const parts = name.trim().split(" ");
  return parts.map((p, i) => i === 0 ? p : p[0] + "***").join(" ");
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-indigo-300 font-semibold">{payload[0].value} vues</p>
    </div>
  );
};

const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white/80 font-medium truncate max-w-[160px]">{payload[0].payload.name}</p>
      <p className="text-violet-300 font-semibold">{payload[0].value} vues</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white/80">{payload[0].name}</p>
      <p className="font-semibold" style={{ color: payload[0].payload.fill }}>{payload[0].value}</p>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, prev, unit = "", icon, color,
}: {
  label: string; value: number; prev: number;
  unit?: string; icon: string; color: string;
}) {
  const { value: pctVal, up } = pct(value, prev);
  return (
    <div className="relative overflow-hidden bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 group hover:border-white/[0.14] transition-all duration-300">
      {/* glow */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity ${color}`} />
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {prev > 0 && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {up ? "▲" : "▼"} {pctVal}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">
        {fmt(value)}<span className="text-lg text-white/40 ml-1">{unit}</span>
      </p>
      <p className="text-white/40 text-sm mt-1">{label}</p>
    </div>
  );
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAnalytics(storeId: string, period: Period): Promise<AnalyticsData> {
  return analyticsApi.get(storeId, period);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const searchParams = useSearchParams();
  const requestedStoreId = searchParams.get("store");

  const {
    data: store,
    isLoading: isStoreLoading,
    isError: isStoreError,
  } = useQuery({
    queryKey: ["owned-store", requestedStoreId],
    queryFn: () => resolveOwnedStore(requestedStoreId),
  });

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ["analytics", store?.id, period],
    queryFn: () => fetchAnalytics(store!.id, period),
    enabled: !!store?.id,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 60 * 1000,
  });

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isStoreLoading || isLoading || (!store && !isStoreError) || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-white/[0.06] rounded-xl" />
          <div className="h-9 w-64 bg-white/[0.06] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.04] rounded-2xl border border-white/[0.06]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white/[0.04] rounded-2xl border border-white/[0.06]" />
          ))}
        </div>
      </div>
    );
  }

  if (isStoreError || !store) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <span className="text-4xl mb-3">🏪</span>
        <p>Aucune boutique disponible.</p>
        <p className="text-sm">Créez une boutique avant d&apos;ouvrir les analytics.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <span className="text-4xl mb-3">📡</span>
        <p>Impossible de charger les analytics.</p>
        <p className="text-sm">Vérifiez que votre API est en ligne.</p>
      </div>
    );
  }

  const { kpi, daily_views, top_products, traffic_sources, recent_orders } = data;

  const maxProductViews = Math.max(...top_products.map(p => p.views), 1);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-white/40 text-sm mt-0.5">Performance de votre boutique</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                period === p
                  ? "bg-indigo-600 text-white shadow"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Vues boutique"
          value={kpi.views}
          prev={kpi.views_prev}
          icon="👁️"
          color="bg-indigo-500"
        />
        <KpiCard
          label="Clics WhatsApp"
          value={kpi.whatsapp_clicks}
          prev={kpi.whatsapp_clicks_prev}
          icon="💬"
          color="bg-emerald-500"
        />
        <KpiCard
          label="Taux de conversion"
          value={kpi.conversion_rate}
          prev={kpi.conversion_rate_prev}
          unit="%"
          icon="🎯"
          color="bg-violet-500"
        />
        <KpiCard
          label="Commandes confirmées"
          value={kpi.confirmed_orders}
          prev={kpi.confirmed_orders_prev}
          icon="✅"
          color="bg-cyan-500"
        />
      </div>

      {/* ── Charts row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LineChart — Vues 30j */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Vues sur la période</h2>
          <p className="text-white/30 text-xs mb-4">Visiteurs uniques par jour</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily_views} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<LineTooltip />} />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* PieChart — Sources de trafic */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Sources de trafic</h2>
          <p className="text-white/30 text-xs mb-4">Répartition des visiteurs</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={traffic_sources}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {traffic_sources.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {traffic_sources.map((s, i) => {
                const total = traffic_sources.reduce((a, b) => a + b.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.source} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-white/60 text-xs truncate">{s.source}</span>
                    </div>
                    <span className="text-white/80 text-xs font-medium tabular-nums">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Top produits vus</h2>
        <p className="text-white/30 text-xs mb-5">Les 8 produits les plus consultés</p>
        <div className="space-y-3">
          {top_products.map((product, i) => {
            const barWidth = Math.round((product.views / maxProductViews) * 100);
            return (
              <div key={product.product_id} className="flex items-center gap-3 group cursor-pointer">
                {/* Rank */}
                <span className={`text-xs font-bold w-5 text-right flex-shrink-0 ${
                  i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-500" : "text-white/20"
                }`}>
                  {i + 1}
                </span>
                {/* Name */}
                <span className="text-sm text-white/70 w-40 flex-shrink-0 truncate group-hover:text-white transition-colors">
                  {product.name}
                </span>
                {/* Bar */}
                <div className="flex-1 bg-white/[0.04] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      background: i === 0
                        ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                        : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                    }}
                  />
                </div>
                {/* Count */}
                <span className="text-xs font-semibold text-white/50 w-12 text-right tabular-nums">
                  {fmt(product.views)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Orders Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Commandes récentes</h2>
            <p className="text-white/30 text-xs mt-0.5">{recent_orders.length} commande{recent_orders.length !== 1 ? "s" : ""}</p>
          </div>
          <a
            href="/dashboard/orders"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Voir tout →
          </a>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Date", "Client", "Produits", "Total", "Statut", "Action"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recent_orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-white/20 text-sm">
                    Aucune commande sur cette période
                  </td>
                </tr>
              ) : (
                recent_orders.map((order) => {
                  const st = STATUS_STYLES[order.status] ?? DEFAULT_STATUS_STYLE;
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3.5 text-xs text-white/40 tabular-nums whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString("fr-DZ", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/70">
                        {maskName(order.customer_name)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/50 max-w-[180px]">
                        <span className="truncate block">
                          {order.items.map(i => `${i.qty}× ${i.name}`).join(", ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-white tabular-nums whitespace-nowrap">
                        {order.total_amount.toLocaleString("fr-DZ")} DZD
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`/dashboard/orders?id=${order.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Détails →
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-white/[0.05]">
          {recent_orders.map((order) => {
            const st = STATUS_STYLES[order.status] ?? DEFAULT_STATUS_STYLE;
            return (
              <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white/80 truncate">{maskName(order.customer_name)}</p>
                  <p className="text-xs text-white/40 mt-0.5 truncate">
                    {order.items.map(i => i.name).join(", ")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white">{order.total_amount.toLocaleString()} DZD</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
