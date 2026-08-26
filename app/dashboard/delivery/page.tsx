"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

// ─── Wilayas DZ ───────────────────────────────────────────────────────────────

export const WILAYAS = [
  { code: "01", name: "Adrar" },         { code: "02", name: "Chlef" },
  { code: "03", name: "Laghouat" },      { code: "04", name: "Oum El Bouaghi" },
  { code: "05", name: "Batna" },         { code: "06", name: "Béjaïa" },
  { code: "07", name: "Biskra" },        { code: "08", name: "Béchar" },
  { code: "09", name: "Blida" },         { code: "10", name: "Bouira" },
  { code: "11", name: "Tamanrasset" },   { code: "12", name: "Tébessa" },
  { code: "13", name: "Tlemcen" },       { code: "14", name: "Tiaret" },
  { code: "15", name: "Tizi Ouzou" },    { code: "16", name: "Alger" },
  { code: "17", name: "Djelfa" },        { code: "18", name: "Jijel" },
  { code: "19", name: "Sétif" },         { code: "20", name: "Saïda" },
  { code: "21", name: "Skikda" },        { code: "22", name: "Sidi Bel Abbès" },
  { code: "23", name: "Annaba" },        { code: "24", name: "Guelma" },
  { code: "25", name: "Constantine" },   { code: "26", name: "Médéa" },
  { code: "27", name: "Mostaganem" },    { code: "28", name: "M'Sila" },
  { code: "29", name: "Mascara" },       { code: "30", name: "Ouargla" },
  { code: "31", name: "Oran" },          { code: "32", name: "El Bayadh" },
  { code: "33", name: "Illizi" },        { code: "34", name: "Bordj Bou Arréridj" },
  { code: "35", name: "Boumerdès" },     { code: "36", name: "El Tarf" },
  { code: "37", name: "Tindouf" },       { code: "38", name: "Tissemsilt" },
  { code: "39", name: "El Oued" },       { code: "40", name: "Khenchela" },
  { code: "41", name: "Souk Ahras" },    { code: "42", name: "Tipaza" },
  { code: "43", name: "Mila" },          { code: "44", name: "Aïn Defla" },
  { code: "45", name: "Naâma" },         { code: "46", name: "Aïn Témouchent" },
  { code: "47", name: "Ghardaïa" },      { code: "48", name: "Relizane" },
  { code: "49", name: "Timimoun" },      { code: "50", name: "Bordj Badji Mokhtar" },
  { code: "51", name: "Ouled Djellal" }, { code: "52", name: "Béni Abbès" },
  { code: "53", name: "In Salah" },      { code: "54", name: "In Guezzam" },
  { code: "55", name: "Touggourt" },     { code: "56", name: "Djanet" },
  { code: "57", name: "El M'Ghair" },    { code: "58", name: "El Meniaa" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryZone {
  wilaya_code: string;
  fee: number;
  enabled: boolean;
  free_above: number | null; // free delivery above this order amount
}

type ZoneMap = Record<string, DeliveryZone>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/10";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const { user } = useAuth();
  const supabase  = getSupabaseBrowserClient();

  const [storeId, setStoreId]   = useState<string | null>(null);
  const [zones, setZones]       = useState<ZoneMap>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  // Global defaults
  const [defaultFee, setDefaultFee]         = useState("600");
  const [globalFreeAbove, setGlobalFreeAbove] = useState("");

  // ── Load ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;

    const { data: store } = await supabase
      .from("stores").select("id").eq("owner_id", user.id).single();

    if (!store) { setLoading(false); return; }
    setStoreId(store.id);

    const { data: existing } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("store_id", store.id);

    // Build zone map — fill with defaults for missing wilayas
    const map: ZoneMap = {};
    WILAYAS.forEach((w) => {
      map[w.code] = { wilaya_code: w.code, fee: 600, enabled: true, free_above: null };
    });
    (existing ?? []).forEach((z: DeliveryZone & { store_id: string }) => {
      map[z.wilaya_code] = { wilaya_code: z.wilaya_code, fee: z.fee, enabled: z.enabled, free_above: z.free_above };
    });

    setZones(map);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Apply global default to all enabled zones ─────────────────────────
  const applyDefault = () => {
    const fee = parseInt(defaultFee) || 0;
    const freeAbove = globalFreeAbove ? parseInt(globalFreeAbove) : null;
    setZones((prev) => {
      const next = { ...prev };
      WILAYAS.forEach((w) => {
        next[w.code] = { ...next[w.code], fee, free_above: freeAbove };
      });
      return next;
    });
  };

  // ── Toggle / update zone ──────────────────────────────────────────────
  const toggleZone = (code: string) => {
    setZones((prev) => ({
      ...prev,
      [code]: { ...prev[code], enabled: !prev[code].enabled },
    }));
  };

  const updateFee = (code: string, val: string) => {
    setZones((prev) => ({
      ...prev,
      [code]: { ...prev[code], fee: parseInt(val) || 0 },
    }));
  };

  const updateFreeAbove = (code: string, val: string) => {
    setZones((prev) => ({
      ...prev,
      [code]: { ...prev[code], free_above: val ? parseInt(val) : null },
    }));
  };

  // ── Save all zones ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!storeId) return;
    setError(null);
    setSaving(true);

    const rows = WILAYAS.map((w) => ({
      store_id:    storeId,
      wilaya_code: w.code,
      fee:         zones[w.code]?.fee         ?? 600,
      enabled:     zones[w.code]?.enabled     ?? true,
      free_above:  zones[w.code]?.free_above  ?? null,
    }));

    const { error: err } = await supabase
      .from("delivery_zones")
      .upsert(rows, { onConflict: "store_id,wilaya_code" });

    setSaving(false);
    if (err) { setError(err.message); return; }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = WILAYAS.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.code.includes(search)
  );

  // ── Stats ─────────────────────────────────────────────────────────────
  const enabledCount  = Object.values(zones).filter((z) => z.enabled).length;
  const avgFee        = enabledCount
    ? Math.round(Object.values(zones).filter((z) => z.enabled).reduce((s, z) => s + z.fee, 0) / enabledCount)
    : 0;
  const freeCount     = Object.values(zones).filter((z) => z.free_above !== null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/30 gap-2">
        <Spinner /> Chargement…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Livraison
          </h1>
          <p className="text-sm text-white/35 mt-0.5">
            Configurez vos frais de livraison par wilaya
          </p>
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
          style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
        >
          {saving ? <><Spinner size={13} /> Enregistrement…</> :
           saved   ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Wilayas actives",    value: `${enabledCount} / 58`,       icon: "📍", color: "text-white/80" },
          { label: "Frais moyen",        value: `${avgFee.toLocaleString()} DZD`, icon: "💰", color: "text-indigo-400" },
          { label: "Livraison gratuite", value: `${freeCount} wilayas`,       icon: "🎁", color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <p className="text-lg mb-1">{s.icon}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Global defaults */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5">
        <h3 className="text-sm font-semibold text-white/80 mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Appliquer un tarif global
        </h3>
        <p className="text-xs text-white/35 mb-4">
          Définissez un tarif par défaut et appliquez-le à toutes les wilayas en un clic.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-28">
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Frais par défaut</label>
            <div className="relative">
              <input type="number" min="0" value={defaultFee}
                onChange={(e) => setDefaultFee(e.target.value)}
                className={inputClass + " pr-12"} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25">DZD</span>
            </div>
          </div>
          <div className="flex-1 min-w-36">
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Gratuit au-dessus de</label>
            <div className="relative">
              <input type="number" min="0" value={globalFreeAbove}
                onChange={(e) => setGlobalFreeAbove(e.target.value)}
                placeholder="Désactivé"
                className={inputClass + " pr-12"} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25">DZD</span>
            </div>
          </div>
          <button
            onClick={applyDefault}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/25 px-4 py-2 text-xs font-semibold text-indigo-300 transition-all"
          >
            Appliquer à toutes
          </button>
        </div>
      </div>

      {/* Search + toggle all */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une wilaya…"
            className={inputClass + " pl-8"} />
        </div>
        <button
          onClick={() => setZones((prev) => {
            const next = { ...prev };
            const allOn = filtered.every((w) => next[w.code]?.enabled);
            filtered.forEach((w) => { next[w.code] = { ...next[w.code], enabled: !allOn }; });
            return next;
          })}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-all whitespace-nowrap"
        >
          Tout activer / désactiver
        </button>
      </div>

      {/* Wilaya table */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_7rem_9rem_2.5rem] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs font-medium text-white/30 uppercase tracking-wider">
          <span>#</span>
          <span>Wilaya</span>
          <span>Frais (DZD)</span>
          <span>Gratuit dès (DZD)</span>
          <span>Actif</span>
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[520px] overflow-y-auto">
          {filtered.map((w) => {
            const zone = zones[w.code];
            if (!zone) return null;
            return (
              <div
                key={w.code}
                className={`grid grid-cols-[2rem_1fr_7rem_9rem_2.5rem] gap-3 items-center px-5 py-2.5 transition-colors ${
                  zone.enabled ? "hover:bg-white/[0.02]" : "opacity-40"
                }`}
              >
                {/* Code */}
                <span className="text-xs font-mono text-white/25">{w.code}</span>

                {/* Name */}
                <span className="text-sm text-white/80 font-medium">{w.name}</span>

                {/* Fee */}
                <div className="relative">
                  <input
                    type="number" min="0"
                    value={zone.fee}
                    onChange={(e) => updateFee(w.code, e.target.value)}
                    disabled={!zone.enabled}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Free above */}
                <div>
                  <input
                    type="number" min="0"
                    value={zone.free_above ?? ""}
                    onChange={(e) => updateFreeAbove(w.code, e.target.value)}
                    disabled={!zone.enabled}
                    placeholder="—"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white placeholder-white/15 outline-none focus:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleZone(w.code)}
                  className={`relative w-8 h-4 rounded-full transition-all ${zone.enabled ? "bg-indigo-500" : "bg-white/10"}`}
                  aria-label={zone.enabled ? "Désactiver" : "Activer"}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${zone.enabled ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
          style={{ boxShadow: "0 0 20px rgba(99,102,241,0.2)" }}
        >
          {saving ? <><Spinner /> Enregistrement…</> :
           saved   ? "✓ Enregistré" :
                     "Enregistrer les tarifs"}
        </button>
      </div>
    </div>
  );
}
