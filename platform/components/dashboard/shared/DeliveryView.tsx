"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { storesApi } from "@/lib/api";
import {
  Truck,
  Check,
  Search,
  AlertCircle,
  Loader2,
  Layers,
  ArrowRight,
  X,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { Store } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShippingRate {
  wilaya_id: number;
  code: string;
  name: string;
  price_home: number;
  price_desk: number;
  eta: string;
  updated_at?: string;
}

type RowStatus = "idle" | "saving" | "saved" | "error";

interface DeliveryViewProps {
  type: "boutique" | "funnel";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeliveryView({ type }: DeliveryViewProps) {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  // Stores
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);

  // Shipping Rates
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Status map per wilaya (saving, saved, error)
  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  // Reference to last successfully saved rates to avoid useless PATCH calls
  const savedRatesRef = useRef<Record<number, { price_home: number; price_desk: number }>>({});
  // Debounce timers per wilaya
  const debounceTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  // Status clear timers per wilaya
  const statusTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Search & Filter
  const [search, setSearch] = useState("");

  // Bulk Apply
  const [bulkHome, setBulkHome] = useState("600");
  const [bulkDesk, setBulkDesk] = useState("350");
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  // ── Load Stores ─────────────────────────────────────────────────────────────
  const loadStores = useCallback(async () => {
    if (!user) return;
    setLoadingStores(true);
    setGeneralError(null);

    try {
      const { data, error: storeErr } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (storeErr) throw storeErr;

      const list = (data ?? []) as Store[];
      setStores(list);

      if (list.length > 0 && list[0]) {
        const activeId =
          selectedStoreId && list.some((s) => s.id === selectedStoreId)
            ? selectedStoreId
            : list[0].id;
        setSelectedStoreId(activeId);
      } else {
        setSelectedStoreId(null);
        setRates([]);
      }
    } catch (err: any) {
      console.error("Erreur chargement boutiques:", err);
      setGeneralError(err?.message || "Impossible de charger vos boutiques.");
    } finally {
      setLoadingStores(false);
    }
  }, [user, supabase, type, selectedStoreId]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // ── Load Rates for Selected Store ───────────────────────────────────────────
  const loadShippingRates = useCallback(async (storeId: string) => {
    setLoadingRates(true);
    setGeneralError(null);
    setRowStatus({});
    setRowErrors({});

    try {
      const data = await storesApi.getShippingRates(storeId);
      const list = (data ?? []) as ShippingRate[];
      setRates(list);

      // Cache current saved values
      const cache: Record<number, { price_home: number; price_desk: number }> = {};
      list.forEach((r) => {
        cache[r.wilaya_id] = {
          price_home: r.price_home,
          price_desk: r.price_desk,
        };
      });
      savedRatesRef.current = cache;
    } catch (err: any) {
      console.error("Erreur chargement shipping rates:", err);
      setGeneralError(
        err?.response?.data?.detail ||
          err?.message ||
          "Impossible de charger les tarifs de livraison pour cette boutique."
      );
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      loadShippingRates(selectedStoreId);
    }
  }, [selectedStoreId, loadShippingRates]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((t) => clearTimeout(t));
      Object.values(statusTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // ── Save Single Wilaya Rate ─────────────────────────────────────────────────
  const saveRate = useCallback(
    async (wilayaId: number, newHome: number, newDesk: number) => {
      if (!selectedStoreId) return;

      const lastSaved = savedRatesRef.current[wilayaId];
      if (
        lastSaved &&
        lastSaved.price_home === newHome &&
        lastSaved.price_desk === newDesk
      ) {
        return; // Nothing changed, skip redundant network call
      }

      // Mark row as saving
      setRowStatus((prev) => ({ ...prev, [wilayaId]: "saving" }));
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[wilayaId];
        return next;
      });

      try {
        await storesApi.updateShippingRate(selectedStoreId, wilayaId, {
          price_home: newHome,
          price_desk: newDesk,
        });

        // Update saved reference
        savedRatesRef.current[wilayaId] = {
          price_home: newHome,
          price_desk: newDesk,
        };

        // Mark as saved
        setRowStatus((prev) => ({ ...prev, [wilayaId]: "saved" }));

        // Clear "saved" badge after 2.5s
        if (statusTimersRef.current[wilayaId]) {
          clearTimeout(statusTimersRef.current[wilayaId]);
        }
        statusTimersRef.current[wilayaId] = setTimeout(() => {
          setRowStatus((prev) => {
            const next = { ...prev };
            if (next[wilayaId] === "saved") {
              next[wilayaId] = "idle";
            }
            return next;
          });
        }, 2500);
      } catch (err: any) {
        console.error(`Erreur sauvegarde wilaya ${wilayaId}:`, err);
        setRowStatus((prev) => ({ ...prev, [wilayaId]: "error" }));
        setRowErrors((prev) => ({
          ...prev,
          [wilayaId]:
            err?.response?.data?.detail || "Échec de la sauvegarde",
        }));
      }
    },
    [selectedStoreId]
  );

  // ── Handle Inline Input Changes (Debounce 600ms) ─────────────────────────────
  const handleRateInputChange = (
    wilayaId: number,
    field: "price_home" | "price_desk",
    rawVal: string
  ) => {
    const parsed = parseInt(rawVal.replace(/[^0-9]/g, ""), 10);
    const numericVal = isNaN(parsed) ? 0 : Math.max(0, parsed);

    // Update local UI immediately for zero lag
    setRates((prev) =>
      prev.map((r) => {
        if (r.wilaya_id === wilayaId) {
          return { ...r, [field]: numericVal };
        }
        return r;
      })
    );

    // Cancel existing debounce timer for this wilaya
    if (debounceTimersRef.current[wilayaId]) {
      clearTimeout(debounceTimersRef.current[wilayaId]);
    }

    // Schedule save with 600ms debounce
    debounceTimersRef.current[wilayaId] = setTimeout(() => {
      setRates((currentRates) => {
        const row = currentRates.find((r) => r.wilaya_id === wilayaId);
        if (row) {
          saveRate(wilayaId, row.price_home, row.price_desk);
        }
        return currentRates;
      });
    }, 600);
  };

  // ── Handle Blur (Immediate Save if Changed) ──────────────────────────────────
  const handleRateBlur = (wilayaId: number) => {
    // Clear debounce timer and flush immediately on blur
    if (debounceTimersRef.current[wilayaId]) {
      clearTimeout(debounceTimersRef.current[wilayaId]);
      delete debounceTimersRef.current[wilayaId];
    }

    const row = rates.find((r) => r.wilaya_id === wilayaId);
    if (row) {
      saveRate(wilayaId, row.price_home, row.price_desk);
    }
  };

  // ── Bulk Update Execution ───────────────────────────────────────────────────
  const handleBulkApply = async () => {
    if (!selectedStoreId) return;

    const homeNum = parseInt(bulkHome.replace(/[^0-9]/g, ""), 10);
    const deskNum = parseInt(bulkDesk.replace(/[^0-9]/g, ""), 10);

    const price_home = isNaN(homeNum) ? 0 : Math.max(0, homeNum);
    const price_desk = isNaN(deskNum) ? 0 : Math.max(0, deskNum);

    setBulkSaving(true);
    setGeneralError(null);

    try {
      await storesApi.updateShippingRatesBulk(selectedStoreId, {
        price_home,
        price_desk,
      });

      // Update all rows in local state
      setRates((prev) =>
        prev.map((r) => ({
          ...r,
          price_home,
          price_desk,
        }))
      );

      // Update saved reference cache
      rates.forEach((r) => {
        savedRatesRef.current[r.wilaya_id] = { price_home, price_desk };
      });

      // Close confirmation modal
      setShowBulkConfirmModal(false);

      // Show success toast
      setBulkSuccessMsg(
        `✓ Tarifs appliqués avec succès aux 58 wilayas (${price_home} DA domicile / ${price_desk} DA stop desk)`
      );
      setTimeout(() => setBulkSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Erreur bulk update:", err);
      setGeneralError(
        err?.response?.data?.detail ||
          err?.message ||
          "Échec de l'application globale des tarifs."
      );
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Filtered Wilayas ────────────────────────────────────────────────────────
  const filteredRates = useMemo(() => {
    if (!search.trim()) return rates;
    const q = search.toLowerCase().trim();
    return rates.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.includes(q) ||
        String(r.wilaya_id).includes(q)
    );
  }, [rates, search]);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tarifs de Livraison
              </h1>
              <p className="text-xs text-slate-500 dark:text-white/50">
                Gérez les frais de livraison des 58 wilayas pour votre{" "}
                {type === "funnel" ? "funnel" : "boutique"}.
              </p>
            </div>
          </div>
        </div>

        {/* Store Selector (if multiple exist) */}
        {stores.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-white/40">
              Boutique :
            </span>
            <select
              value={selectedStoreId || ""}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-white dark:bg-[#090915] border border-slate-200 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-white focus:border-accent outline-none shadow-sm cursor-pointer"
            >
              {stores.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-white dark:bg-[#090915] text-slate-900 dark:text-white"
                >
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {generalError && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-400 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span className="flex-1">{generalError}</span>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-rose-400 hover:text-rose-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bulkSuccessMsg && (
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <Check className="w-5 h-5 shrink-0 text-emerald-500" />
          <span className="font-semibold flex-1">{bulkSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setBulkSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Bulk Update Form (En haut du tableau) ─────────────────────────── */}
      <div className="rounded-3xl p-6 bg-white dark:bg-[#090915] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Application globale rapide
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                Définissez un tarif unique pour l&apos;appliquer instantanément aux 58 wilayas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          {/* Tarif Domicile */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
              Tarif domicile :
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={bulkHome}
                onChange={(e) => setBulkHome(e.target.value)}
                placeholder="600"
                className="w-28 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] pl-3 pr-8 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-accent outline-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-white/40 pointer-events-none">
                DA
              </span>
            </div>
          </div>

          {/* Tarif Stop Desk */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-white/70">
              Tarif stop desk :
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={bulkDesk}
                onChange={(e) => setBulkDesk(e.target.value)}
                placeholder="350"
                className="w-28 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] pl-3 pr-8 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-accent outline-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-white/40 pointer-events-none">
                DA
              </span>
            </div>
          </div>

          {/* Button trigger modal */}
          <button
            type="button"
            onClick={() => setShowBulkConfirmModal(true)}
            disabled={!selectedStoreId || loadingRates}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs shadow-md shadow-accent/20 disabled:opacity-50 transition-all active:scale-95 ml-auto"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Appliquer à toutes les wilayas</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar & Stats ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une wilaya par nom ou code (ex: Alger, Oran, 16)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#090915] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-accent outline-none transition-colors shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-white/40 flex items-center gap-2">
          <span>
            {filteredRates.length} wilaya{filteredRates.length > 1 ? "s" : ""}{" "}
            affichée{filteredRates.length > 1 ? "s" : ""}
          </span>
          {rates.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-white/60">
              Total : {rates.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Wilayas Table (58 wilayas) ─────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#090915] overflow-hidden shadow-sm">
        {loadingStores || loadingRates ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-sm font-medium text-slate-500 dark:text-white/50">
              Chargement des tarifs de livraison...
            </span>
          </div>
        ) : stores.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-white/50 text-sm">
            Vous n&apos;avez aucun {type === "funnel" ? "funnel" : "boutique"} créé pour le moment.
          </div>
        ) : filteredRates.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-white/50 text-sm flex flex-col items-center gap-2">
            <Search className="w-6 h-6 text-slate-300 dark:text-white/20" />
            <span>Aucune wilaya ne correspond à &quot;{search}&quot;.</span>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-accent text-xs font-bold hover:underline mt-1"
            >
              Réinitialiser la recherche
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-white/80">
              <thead className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02] text-xs font-semibold uppercase text-slate-400 dark:text-white/40 tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-1/4">Wilaya</th>
                  <th className="px-6 py-4 w-1/4">Tarif Domicile</th>
                  <th className="px-6 py-4 w-1/4">Tarif Stop Desk</th>
                  <th className="px-6 py-4 w-1/6">Délai (ETA)</th>
                  <th className="px-6 py-4 w-28 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredRates.map((r) => {
                  const status = rowStatus[r.wilaya_id] || "idle";
                  const errorMsg = rowErrors[r.wilaya_id];

                  return (
                    <tr
                      key={r.wilaya_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* 1. Wilaya Name */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-xs font-bold text-accent dark:text-sky shrink-0">
                            {r.code}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {r.name}
                          </span>
                        </div>
                      </td>

                      {/* 2. Inline Edit: Tarif Domicile */}
                      <td className="px-6 py-3.5">
                        <div className="relative inline-flex items-center w-36">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={r.price_home}
                            onChange={(e) =>
                              handleRateInputChange(
                                r.wilaya_id,
                                "price_home",
                                e.target.value
                              )
                            }
                            onBlur={() => handleRateBlur(r.wilaya_id)}
                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] pl-3 pr-8 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/[0.08] focus:border-accent outline-none transition-all shadow-none focus:shadow-sm"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-white/40 pointer-events-none">
                            DA
                          </span>
                        </div>
                      </td>

                      {/* 3. Inline Edit: Tarif Stop Desk */}
                      <td className="px-6 py-3.5">
                        <div className="relative inline-flex items-center w-36">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={r.price_desk}
                            onChange={(e) =>
                              handleRateInputChange(
                                r.wilaya_id,
                                "price_desk",
                                e.target.value
                              )
                            }
                            onBlur={() => handleRateBlur(r.wilaya_id)}
                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] pl-3 pr-8 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/[0.08] focus:border-accent outline-none transition-all shadow-none focus:shadow-sm"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-white/40 pointer-events-none">
                            DA
                          </span>
                        </div>
                      </td>

                      {/* 4. ETA Delay */}
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70">
                          {r.eta || "2-4 j"}
                        </span>
                      </td>

                      {/* 5. Visual Indicator Status */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end h-7">
                          {status === "saving" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent dark:text-sky animate-in fade-in">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="hidden sm:inline">Enregistrement...</span>
                            </span>
                          )}

                          {status === "saved" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in zoom-in-95">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Enregistré ✓</span>
                            </span>
                          )}

                          {status === "error" && (
                            <span
                              title={errorMsg || "Échec"}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-semibold cursor-help"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Erreur</span>
                            </span>
                          )}

                          {status === "idle" && (
                            <span className="text-[11px] text-slate-300 dark:text-white/20 select-none">
                              —
                            </span>
                          )}
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

      {/* ── Confirmation Modal (Bulk Overwrite) ───────────────────────────── */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#101020] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Attention : écrasement des tarifs
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Cette action aura un impact immédiat sur l&apos;ensemble de votre boutique.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-500/20 text-sm text-slate-800 dark:text-white/90 leading-relaxed font-medium">
              Ceci va écraser les tarifs personnalisés des 58 wilayas avec cette valeur
              unique — continuer ?
            </div>

            {/* Recap */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 text-xs">
              <div>
                <span className="text-slate-400 dark:text-white/40 block">
                  Nouveau tarif domicile :
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {bulkHome} DA
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-white/40 block">
                  Nouveau tarif stop desk :
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {bulkDesk} DA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={bulkSaving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-xs font-bold text-slate-700 dark:text-white/70 transition-colors"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleBulkApply}
                disabled={bulkSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 disabled:opacity-50 transition-all active:scale-95"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Application en cours...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmer l&apos;écrasement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
