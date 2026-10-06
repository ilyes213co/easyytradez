"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { 
  Plus, Edit2, Eye, Trash2, ShoppingCart, DollarSign, 
  ExternalLink, Layers, ArrowUpRight, AlertTriangle, Sparkles, Check, Store as StoreIcon
} from "lucide-react";
import { toast } from "sonner";
import type { Store as StoreType } from "@/types/database";

interface FunnelMetrics {
  totalOrders: number;
  totalIncome: number;
  confirmedOrders: number;
  avgOrderValue: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  // Determine active section type ("funnel" or "boutique")
  const activeType: "funnel" | "boutique" = useMemo(() => {
    if (sectionParam === "boutique") return "boutique";
    if (sectionParam === "funnel") return "funnel";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_section");
      if (saved === "boutiques") return "boutique";
      if (saved === "funnels") return "funnel";
    }
    return "funnel";
  }, [sectionParam]);

  const isFunnel = activeType === "funnel";

  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FunnelMetrics>({
    totalOrders: 0,
    totalIncome: 0,
    confirmedOrders: 0,
    avgOrderValue: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<StoreType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch user's stores strictly filtered by activeType
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .eq("type", activeType)
        .order("created_at", { ascending: false });

      if (storesError) throw storesError;
      const storeList = (storesData ?? []) as unknown as StoreType[];
      setStores(storeList);

      // 2. Fetch metrics strictly for this section's stores
      if (storeList.length > 0) {
        const storeIds = storeList.map((s) => s.id);
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id, total_amount, status, store_id")
          .in("store_id", storeIds);

        if (!ordersError && ordersData) {
          const totalOrders = ordersData.length;
          const validOrders = ordersData.filter((o) => o.status !== "cancelled");
          const totalIncome = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
          const confirmedOrders = ordersData.filter((o) => o.status === "confirmed" || o.status === "delivered").length;
          const avgOrderValue = validOrders.length > 0 ? Math.round(totalIncome / validOrders.length) : 0;

          setMetrics({
            totalOrders,
            totalIncome,
            confirmedOrders,
            avgOrderValue,
          });
        }
      } else {
        setMetrics({ totalOrders: 0, totalIncome: 0, confirmedOrders: 0, avgOrderValue: 0 });
      }
    } catch (err: any) {
      console.error("Dashboard data load error:", err);
      toast.error("Impossible de charger les données du tableau de bord");
    } finally {
      setLoading(false);
    }
  }, [user, supabase, activeType]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleDeleteStore = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success(`${isFunnel ? "Le funnel" : "La boutique"} "${deleteTarget.name}" a été supprimé(e)`);
      setStores((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      // Reload metrics
      loadDashboardData();
    } catch (err: any) {
      console.error("Delete store error:", err);
      toast.error(`Erreur lors de la suppression ${isFunnel ? "du funnel" : "de la boutique"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDZD = (amount: number) => {
    return amount.toLocaleString("fr-DZ") + " DZD";
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {isFunnel ? "Vue d'ensemble des Funnels" : "Vue d'ensemble des Boutiques"}
          </h1>
          <p className="text-slate-500 dark:text-white/60 text-sm mt-1">
            {isFunnel
              ? "Indicateurs clés et gestion de vos tunnels de conversion en direct."
              : "Indicateurs clés et gestion de vos boutiques e-commerce en direct."}
          </p>
        </div>

        <Link
          href={`/dashboard/${activeType}/create`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isFunnel ? "Créer un funnel" : "Créer une boutique"}</span>
        </Link>
      </div>

      {/* 1. Overview - Top High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Total Commandes
            </span>
            <div className="w-9 h-9 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center text-accent dark:text-sky">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
            {loading ? "..." : metrics.totalOrders}
          </p>
        </div>

        {/* Total Income */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Chiffre d&apos;Affaires
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
            {loading ? "..." : formatDZD(metrics.totalIncome)}
          </p>
        </div>

        {/* Panier Moyen */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Panier Moyen
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky/10 dark:bg-sky/20 flex items-center justify-center text-sky">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
            {loading ? "..." : formatDZD(metrics.avgOrderValue)}
          </p>
        </div>

        {/* Active Stores / Funnels */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              {isFunnel ? "Funnels Actifs" : "Boutiques Actives"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">
            {loading ? "..." : stores.length}
          </p>
        </div>
      </div>

      {/* 2. List Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isFunnel ? "Vos Funnels de Vente" : "Vos Boutiques en Ligne"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {isFunnel
              ? "Accédez directement à l'édition, la prévisualisation ou la gestion de chaque funnel."
              : "Accédez directement à l'édition, la prévisualisation ou la gestion de chaque boutique."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center bg-white/50 dark:bg-white/[0.01]">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
              {isFunnel ? <Layers className="w-7 h-7" /> : <StoreIcon className="w-7 h-7" />}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {isFunnel ? "Aucun funnel créé pour l'instant" : "Aucune boutique créée pour l'instant"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/50 max-w-sm mx-auto mt-1 mb-5">
              {isFunnel
                ? "Créez votre première page mono-produit optimisée pour générer des ventes en quelques minutes."
                : "Créez votre première boutique e-commerce multi-produits optimisée pour générer des ventes en quelques minutes."}
            </p>
            <Link
              href={`/dashboard/${activeType}/create`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isFunnel ? "Créer mon premier funnel" : "Créer ma première boutique"}</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm dark:shadow-xl divide-y divide-slate-100 dark:divide-white/[0.06]">
            {stores.map((item) => {
              const liveUrl = item.published_url || `/preview/${item.id}`;
              const initial = item.name?.[0]?.toUpperCase() || (isFunnel ? "F" : "B");

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left: Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm border border-white/20"
                      style={{ backgroundColor: item.primary_color || "#2540ea" }}
                    >
                      {item.logo_url ? (
                        <img src={item.logo_url} alt="" className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                          {item.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.status === "published"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.status === "published" ? "En ligne" : "Brouillon"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-white/40 mt-1">
                        <span>Créé le {new Date(item.created_at).toLocaleDateString("fr-FR")}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] truncate max-w-[180px]">
                          ID: {item.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Three Distinct Action Buttons (Modify, View, Delete) */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* 1. Modify Button */}
                    <Link
                      href={`/dashboard/${activeType}/${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-white/80 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 transition-colors"
                      title={`Modifier et gérer ${isFunnel ? "ce funnel" : "cette boutique"}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-accent dark:text-sky" />
                      <span>Modifier</span>
                    </Link>

                    {/* 2. View Button */}
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-white/80 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 transition-colors"
                      title={`Voir ${isFunnel ? "le funnel" : "la boutique"} en direct`}
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Voir</span>
                    </a>

                    {/* 3. Delete Button */}
                    <button
                      onClick={() => setDeleteTarget(item)}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                      title={`Supprimer ${isFunnel ? "ce funnel" : "cette boutique"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Supprimer {isFunnel ? "le funnel" : "la boutique"} ?
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-white/70">
              Êtes-vous sûr de vouloir supprimer définitivement {isFunnel ? "le funnel" : "la boutique"}{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">
                &ldquo;{deleteTarget.name}&rdquo;
              </strong>{" "}
              ainsi que toutes ses données et pages associées ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStore}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}