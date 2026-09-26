"use client";

import React from "react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export interface DailyView { date: string; views: number; }
export interface TrafficSource { source: string; count: number; }

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#64748b"];

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1117] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className="text-[#60a5fa] font-semibold">{payload[0].value} vues</p>
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

interface AnalyticsChartsProps {
  daily_views: DailyView[];
  traffic_sources: TrafficSource[];
}

export default function AnalyticsCharts({ daily_views, traffic_sources }: AnalyticsChartsProps) {
  return (
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
              const pctVal = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s.source} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-white/60 text-xs truncate">{s.source}</span>
                  </div>
                  <span className="text-white/80 text-xs font-medium tabular-nums">{pctVal}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
