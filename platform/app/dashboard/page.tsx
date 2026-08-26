"use client";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Bienvenue sur votre tableau de bord.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Produits",   value: "—", color: "text-indigo-400" },
          { label: "Commandes",  value: "—", color: "text-emerald-400" },
          { label: "En attente", value: "—", color: "text-amber-400" },
          { label: "Revenus",    value: "—", color: "text-white" },
        ].map((k) => (
          <div key={k.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-4">
            <p className="text-white/40 text-xs">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}