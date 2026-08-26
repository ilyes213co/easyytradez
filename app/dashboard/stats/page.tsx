"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Order, Store } from "@/lib/supabase";

// ─── Period config ────────────────────────────────────────────────────────────

type Period = "month" | "7d" | "30d";

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "Ce mois-ci" },
  { key: "7d",   label: "7 jours"    },
  { key: "30d",  label: "30 jours"   },
];

function getPeriodStart(period: Period): Date {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "7d")    return new Date(Date.now() - 6 * 86400000);
  return new Date(Date.now() - 29 * 86400000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20 text-white/25 gap-2">
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span className="text-sm">Calcul des statistiques…</span>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, unit }: {
  active?: boolean; payload?: { value: number }[]; label?: string; unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#13131e] px-3 py-2 shadow-xl text-xs">
      <p className="text-white/40 mb-1">{label}</p>
      <p className="font-bold text-white">
        {payload[0].value.toLocaleString("fr-DZ")} {unit}
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, trend }: {
  icon: string; label: string; value: string; sub?: string; trend?: { value: number; label: string };
}) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            up ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
               : "text-red-400 bg-red-500/10 border-red-500/20"
          }`}>
            {up ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-white/35 mt-1.5">{label}</p>
      {sub && <p className="text-xs text-white/20 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface OrderItem { name: string; quantity: number; price: number }

export default function StatsPage() {
  const { user } = useAuth();
  const supabase  = getSupabaseBrowserClient();

  const [store, setStore]     = useState<Store | null>(null);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<Period>("month");

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: storeData } = await supabase
      .from("stores").select("*").eq("owner_id", user.id).single();
    setStore(storeData);

    if (storeData) {
      const { data } = await supabase
        .from("orders").select("*")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: true });
      setOrders(data ?? []);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Filter by period ──────────────────────────────────────────────────────
  const periodStart = getPeriodStart(period);
  const inPeriod = useMemo(
    () => orders.filter((o) => new Date(o.created_at) >= periodStart),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, period]
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const paid       = inPeriod.filter((o) => o.payment_status === "paid");
    const revenue    = paid.reduce((s, o) => s + o.total, 0);
    const delivered  = inPeriod.filter((o) => o.status === "delivered").length;
    const conversion = pct(paid.length, inPeriod.length);

    // Previous period for trend
    const prevLen = periodStart.getTime() - (Date.now() - periodStart.getTime());
    const prev    = orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= prevLen && t < periodStart.getTime();
    });
    const prevRevenue = prev.filter((o) => o.payment_status === "paid").reduce((s, o) => s + o.total, 0);
    const revTrend    = pct(revenue - prevRevenue, prevRevenue || 1);

    return { revenue, total: inPeriod.length, delivered, conversion, revTrend };
  }, [inPeriod, orders, periodStart]);

  // ── Revenue by day ────────────────────────────────────────────────────────
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};

    // Build all days in period
    const start = new Date(periodStart);
    start.setHours(0, 0, 0, 0);
    const end   = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      map[key] = 0;
    }

    inPeriod
      .filter((o) => o.payment_status === "paid")
      .forEach((o) => {
        const key = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        map[key] = (map[key] ?? 0) + o.total;
      });

    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
  }, [inPeriod, periodStart]);

  // ── Orders by day ─────────────────────────────────────────────────────────
  const ordersByDay = useMemo(() => {
    const map: Record<string, number> = {};

    const start = new Date(periodStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      map[key] = 0;
    }

    inPeriod.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      map[key] = (map[key] ?? 0) + 1;
    });

    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [inPeriod, periodStart]);

  // ── Top products ──────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};

    inPeriod.forEach((o) => {
      let items: OrderItem[] = [];
      try { items = Array.isArray(o.items) ? o.items as OrderItem[] : JSON.parse(o.items as string); }
      catch { /* skip */ }

      items.forEach((item) => {
        if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
        map[item.name].qty     += item.quantity;
        map[item.name].revenue += item.price * item.quantity;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);
  }, [inPeriod]);

  const maxQty = topProducts[0]?.qty || 1;

  // ── Revenue by product ────────────────────────────────────────────────────
  const revenueByProduct = useMemo(() => {
    const map: Record<string, { name: string; revenue: number }> = {};

    inPeriod
      .filter((o) => o.payment_status === "paid")
      .forEach((o) => {
        let items: OrderItem[] = [];
        try { items = Array.isArray(o.items) ? o.items as OrderItem[] : JSON.parse(o.items as string); }
        catch { /* skip */ }
        items.forEach((item) => {
          if (!map[item.name]) map[item.name] = { name: item.name, revenue: 0 };
          map[item.name].revenue += item.price * item.quantity;
        });
      });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p) => ({ ...p, short: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name }));
  }, [inPeriod]);

  // ── Activity by hour ──────────────────────────────────────────────────────
  const byHour = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: 0, h }));
    inPeriod.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      counts[h].count++;
    });
    return counts;
  }, [inPeriod]);

  // ── Activity by day of week ───────────────────────────────────────────────
  const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const byDayOfWeek = useMemo(() => {
    const counts = DAYS.map((day) => ({ day, count: 0 }));
    inPeriod.forEach((o) => {
      const d = new Date(o.created_at).getDay();
      counts[d].count++;
    });
    return counts;
  }, [inPeriod]);

  const maxHourCount = Math.max(...byHour.map((h) => h.count), 1);
  const maxDayCount  = Math.max(...byDayOfWeek.map((d) => d.count), 1);

  // ── Period selector ───────────────────────────────────────────────────────
  const PeriodSelector = (
    <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-0.5">
      {PERIODS.map((p) => (
        <button key={p.key} onClick={() => setPeriod(p.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            period === p.key ? "bg-white/[0.08] text-white" : "text-white/35 hover:text-white/60"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Statistiques
          </h1>
          <p className="text-sm text-white/35 mt-0.5">
            {store?.name ?? "Votre boutique"} · {PERIODS.find((p) => p.key === period)?.label}
          </p>
        </div>
        {PeriodSelector}
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon="💰" label="Chiffre d'affaires" sub="commandes payées"
              value={`${kpis.revenue.toLocaleString("fr-DZ")} DZD`}
              trend={{ value: kpis.revTrend, label: "vs période préc." }}
            />
            <StatCard
              icon="🛒" label="Commandes reçues" sub={`sur la période`}
              value={String(kpis.total)}
            />
            <StatCard
              icon="📦" label="Livrées" sub="statut livré"
              value={String(kpis.delivered)}
            />
            <StatCard
              icon="💳" label="Taux de paiement" sub="payé / total"
              value={`${kpis.conversion}%`}
            />
          </div>

          {/* Revenue chart */}
          <ChartCard title="Chiffre d'affaires par jour (DZD)">
            {revenueByDay.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-10">Aucune donnée sur cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    interval={revenueByDay.length > 14 ? Math.floor(revenueByDay.length / 7) : 0}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                    tickLine={false} axisLine={false} tickFormatter={fmt}
                  />
                  <Tooltip content={<CustomTooltip unit="DZD" />} />
                  <Area type="monotone" dataKey="revenue"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#818cf8" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Orders per day chart */}
          <ChartCard title="Commandes par jour">
            {ordersByDay.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-10">Aucune donnée sur cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ordersByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    interval={ordersByDay.length > 14 ? Math.floor(ordersByDay.length / 7) : 0}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                    tickLine={false} axisLine={false} allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip unit="commandes" />} />
                  <Bar dataKey="count" fill="#6366f1" fillOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: "#818cf8", fillOpacity: 1 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top products */}
          <ChartCard title="Produits les plus vendus">
            {topProducts.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-10">
                Aucune vente enregistrée sur cette période.
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank */}
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? "bg-amber-500/20 text-amber-400"
                          : i === 1 ? "bg-white/[0.07] text-white/40"
                          : "bg-white/[0.04] text-white/25"
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-sm text-white/75 truncate">{p.name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs text-white/30">{p.qty} vendus</span>
                        <span className="text-xs font-semibold text-white/70">
                          {p.revenue.toLocaleString("fr-DZ")} DZD
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct(p.qty, maxQty)}%`,
                          background: i === 0
                            ? "linear-gradient(90deg, #6366f1, #818cf8)"
                            : "rgba(99,102,241,0.4)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* Revenue by product */}
          <ChartCard title="Revenus par produit (DZD encaissé)">
            {revenueByProduct.length === 0 ? (
              <p className="text-sm text-white/25 text-center py-10">Aucune vente payée sur cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, revenueByProduct.length * 36)}>
                <BarChart
                  data={revenueByProduct}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                  barSize={14}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                    tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="short" width={90}
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip unit="DZD" />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {revenueByProduct.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#6366f1" : `rgba(99,102,241,${Math.max(0.2, 0.7 - i * 0.08)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Activity heatmap */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* By hour */}
            <ChartCard title="Pic d'activité par heure">
              {inPeriod.length === 0 ? (
                <p className="text-sm text-white/25 text-center py-8">Aucune donnée.</p>
              ) : (
                <div className="space-y-2">
                  {/* Group into rows of 6 */}
                  {[0, 6, 12, 18].map((startH) => (
                    <div key={startH} className="flex gap-1.5">
                      {byHour.slice(startH, startH + 6).map((slot) => {
                        const intensity = slot.count / maxHourCount;
                        return (
                          <div key={slot.h} className="flex-1 group relative">
                            <div
                              className="h-8 rounded-lg transition-all duration-300"
                              style={{
                                background: intensity === 0
                                  ? "rgba(255,255,255,0.04)"
                                  : `rgba(99,102,241,${0.1 + intensity * 0.85})`,
                              }}
                            />
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-white/25 whitespace-nowrap">
                              {slot.hour}
                            </div>
                            {/* Tooltip */}
                            {slot.count > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
                                <div className="rounded-lg bg-[#13131e] border border-white/10 px-2 py-1 text-xs text-white whitespace-nowrap shadow-xl">
                                  {slot.hour} · {slot.count} commande{slot.count > 1 ? "s" : ""}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="mt-7" />
                </div>
              )}
            </ChartCard>

            {/* By day of week */}
            <ChartCard title="Pic d'activité par jour">
              {inPeriod.length === 0 ? (
                <p className="text-sm text-white/25 text-center py-8">Aucune donnée.</p>
              ) : (
                <div className="flex items-end gap-2 h-32 pt-2">
                  {byDayOfWeek.map((d) => {
                    const intensity = d.count / maxDayCount;
                    const isToday   = new Date().getDay() === byDayOfWeek.indexOf(d);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Count label */}
                        {d.count > 0 && (
                          <span className="text-[10px] text-white/30">{d.count}</span>
                        )}
                        {/* Bar */}
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${Math.max(4, intensity * 72)}px`,
                            background: isToday
                              ? "linear-gradient(180deg, #818cf8, #6366f1)"
                              : intensity === 0
                              ? "rgba(255,255,255,0.05)"
                              : `rgba(99,102,241,${0.15 + intensity * 0.7})`,
                          }}
                        />
                        <span className={`text-[10px] font-medium ${isToday ? "text-indigo-400" : "text-white/25"}`}>
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Empty state (no orders at all) */}
          {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <span className="text-3xl mb-3">📊</span>
              <p className="text-sm text-white/50 font-medium">Pas encore de données</p>
              <p className="text-xs text-white/25 mt-1 max-w-xs">
                Les statistiques apparaîtront ici dès que vous recevrez vos premières commandes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
