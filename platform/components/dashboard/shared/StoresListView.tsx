"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { 
  Store, Plus, ExternalLink, Package, ShoppingBag, 
  Trash2, Edit3, Eye, Search, AlertTriangle, 
  CheckCircle2, Globe, Sparkles, LayoutGrid, List as ListIcon,
  ArrowUpRight, Loader2, Copy, Check, ArrowRight,
  TrendingUp, BarChart2, Layers
} from "lucide-react";
import type { Store as StoreType } from "@/types/database";

interface StoreWithMetrics extends StoreType {
  productsCount: number;
  ordersCount: number;
  totalRevenue: number;
}

interface StoresListViewProps {
  type: "boutique" | "funnel";
}

export default function StoresListView({ type }: StoresListViewProps) {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [stores, setStores] = useState<StoreWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "orders">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion modal state
  const [storeToDelete, setStoreToDelete] = useState<StoreWithMetrics | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isFunnel = type === "funnel";

  const loadStores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading stores:", error);
        setStores([]);
      } else {
        const rawStores = (data ?? []) as unknown as StoreType[];
        const storeIds = rawStores.map((s) => s.id);

        if (storeIds.length === 0) {
          setStores([]);
          setLoading(false);
          return;
        }

        // Fetch real-time products and orders counts for each store
        const [productsRes, ordersRes] = await Promise.all([
          supabase.from("products").select("store_id, id").in("store_id", storeIds),
          supabase.from("orders").select("store_id, id, total_amount").in("store_id", storeIds),
        ]);

        const productCounts: Record<string, number> = {};
        (productsRes.data || []).forEach((p: any) => {
          productCounts[p.store_id] = (productCounts[p.store_id] || 0) + 1;
        });

        const orderCounts: Record<string, number> = {};
        const revenueMap: Record<string, number> = {};
        (ordersRes.data || []).forEach((o: any) => {
          orderCounts[o.store_id] = (orderCounts[o.store_id] || 0) + 1;
          revenueMap[o.store_id] = (revenueMap[o.store_id] || 0) + (Number(o.total_amount) || 0);
        });

        const enrichedStores: StoreWithMetrics[] = rawStores.map((s) => ({
          ...s,
          productsCount: productCounts[s.id] || 0,
          ordersCount: orderCounts[s.id] || 0,
          totalRevenue: revenueMap[s.id] || 0,
        }));

        setStores(enrichedStores);
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase, type]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Copy link helper
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered & Sorted stores
  const filteredStores = useMemo(() => {
    const filtered = stores.filter((store) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        store.name.toLowerCase().includes(q) ||
        (store.slug && store.slug.toLowerCase().includes(q)) ||
        (store.category && store.category.toLowerCase().includes(q));

      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "published" && store.status === "published") ||
        (statusFilter === "draft" && store.status !== "published");

      return matchesSearch && matchesStatus;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "orders") {
        return b.ordersCount - a.ordersCount;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [stores, searchQuery, statusFilter, sortBy]);

  // Aggregate Metrics for Header
  const publishedCount = useMemo(() => stores.filter(s => s.status === "published").length, [stores]);
  const draftCount = useMemo(() => stores.filter(s => s.status !== "published").length, [stores]);
  const totalProducts = useMemo(() => stores.reduce((acc, s) => acc + s.productsCount, 0), [stores]);
  const totalOrders = useMemo(() => stores.reduce((acc, s) => acc + s.ordersCount, 0), [stores]);
  const totalRevenue = useMemo(() => stores.reduce((acc, s) => acc + s.totalRevenue, 0), [stores]);

  // Handle Delete
  const confirmDelete = async () => {
    if (!storeToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeToDelete.id);

      if (error) throw error;

      setStores(prev => prev.filter(s => s.id !== storeToDelete.id));
      setToastMessage({
        type: "success",
        text: `${isFunnel ? "Le funnel" : "La boutique"} "${storeToDelete.name}" a été supprimé(e) avec succès.`
      });
      setStoreToDelete(null);
    } catch (err: any) {
      console.error("Delete store error:", err);
      setToastMessage({
        type: "error",
        text: err?.message || "Erreur lors de la suppression."
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const formatDZD = (num: number) => {
    return num.toLocaleString("fr-DZ") + " DZD";
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            toastMessage.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 bg-[#090915]" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400 bg-[#090915]"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0d0d1a] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Supprimer {isFunnel ? "ce funnel" : "cette boutique"} ?
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/60 mt-2 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-slate-900 dark:text-white font-semibold">« {storeToDelete.name} »</strong> ? 
                Cette action est irréversible et effacera toutes les données, produits et commandes associés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl font-medium text-sm text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Top Executive Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {isFunnel ? "Mes Funnels de Vente" : "Mes Boutiques"}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
              {stores.length} {stores.length > 1 ? (isFunnel ? "funnels" : "boutiques") : (isFunnel ? "funnel" : "boutique")}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-white/60 mt-1">
            {isFunnel
              ? "Pilotez vos pages mono-produit optimisées pour un taux de conversion maximal."
              : "Gérez vos catalogues de vente multi-produits et votre présence en ligne."}
          </p>
        </div>

        {/* Primary Action */}
        <Link
          href={`/dashboard/${type}/create`}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-accent to-[#3b55f6] hover:from-accent/95 hover:to-[#2e47e8] shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-95 transition-all duration-200 self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isFunnel ? "Créer un funnel" : "Créer une boutique"}</span>
        </Link>
      </div>

      {/* ── 2. Operational Overview Strip (Shopify & Vercel Pulse) ───────────── */}
      {!loading && stores.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Active Stores */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider block">
              {isFunnel ? "Funnels Actifs" : "Boutiques en Ligne"}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {publishedCount}
                <span className="text-xs font-normal text-slate-400 dark:text-white/40 ml-1.5">
                  / {stores.length}
                </span>
              </p>
            </div>
          </div>

          {/* Products Count */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider block">
              Articles Référencés
            </span>
            <div className="flex items-center gap-2 mt-2">
              <Package className="w-4 h-4 text-sky shrink-0" />
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {totalProducts}
              </p>
            </div>
          </div>

          {/* Total Orders */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider block">
              Commandes Reçues
            </span>
            <div className="flex items-center gap-2 mt-2">
              <ShoppingBag className="w-4 h-4 text-indigo-500 shrink-0" />
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {totalOrders}
              </p>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider block">
              Chiffre d&apos;Affaires
            </span>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {formatDZD(totalRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. High-Craft Search & Filter Toolbar ───────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Rechercher ${isFunnel ? "un funnel" : "une boutique"} par nom, slug...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:border-accent shadow-sm transition-all"
          />
        </div>

        {/* Filter Pills, Sorter & View Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Segmented Control */}
          <div className="flex items-center bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-accent text-white shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tous ({stores.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === "published"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === "published" ? "bg-white" : "bg-emerald-500"}`} />
              En ligne ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === "draft"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === "draft" ? "bg-white" : "bg-amber-500"}`} />
              Brouillons ({draftCount})
            </button>
          </div>

          {/* Sorter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-white/80 focus:border-accent outline-none shadow-sm"
          >
            <option value="recent">Plus récents</option>
            <option value="name">Nom (A-Z)</option>
            <option value="orders">Commandes</option>
          </select>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === "grid"
                  ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === "list"
                  ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
              title="Vue liste"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Content Area ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-3xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] p-6 space-y-4 animate-pulse shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-xl mt-6" />
              <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d1e] p-12 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent shadow-inner">
            {isFunnel ? <Sparkles className="w-8 h-8" /> : <Store className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {searchQuery || statusFilter !== "all" 
                ? "Aucun résultat trouvé" 
                : isFunnel ? "Aucun funnel actif" : "Aucune boutique créée"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-white/60 max-w-md mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Modifiez vos filtres ou votre terme de recherche pour retrouver vos projets."
                : isFunnel
                  ? "Créez votre première landing page mono-produit optimisée pour générer des ventes massives dès aujourd'hui."
                  : "Lancez votre première boutique en ligne pour vendre vos produits partout en Algérie."}
            </p>
          </div>
          <Link
            href={`/dashboard/${type}/create`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white bg-accent hover:bg-accent/90 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isFunnel ? "Créer mon premier funnel" : "Créer ma première boutique"}</span>
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View (Vercel & Shopify Inspired Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => {
            const isOnline = store.status === "published";
            const liveUrl = store.published_url || (store.slug ? `https://store-${store.slug}.vercel.app` : null);

            return (
              <div
                key={store.id}
                className="group rounded-3xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] hover:border-accent/40 dark:hover:border-accent/50 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-accent/5 relative overflow-hidden"
              >
                {/* Brand Color top highlight bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 opacity-80 group-hover:opacity-100 transition-opacity" 
                  style={{ backgroundColor: store.primary_color || "#2540ea" }} 
                />

                <div className="space-y-5">
                  {/* Top info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0 border border-black/5 dark:border-white/10 overflow-hidden"
                        style={{ 
                          width: "52px", 
                          height: "52px",
                          backgroundColor: store.primary_color || "#2540ea" 
                        }}
                      >
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="w-full h-full object-contain" />
                        ) : (
                          store.name[0]?.toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/${type}/${store.id}`}
                          className="font-bold text-slate-900 dark:text-white text-base truncate block hover:text-accent transition-colors"
                          title={store.name}
                        >
                          {store.name}
                        </Link>
                        <span className="inline-block text-[11px] font-medium text-slate-500 dark:text-white/50 truncate mt-0.5">
                          {store.category || (isFunnel ? "Tunnel mono-produit" : "E-commerce")}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                      {isOnline ? "En ligne" : "Brouillon"}
                    </span>
                  </div>

                  {/* Slug / Domain preview with copy shortcut */}
                  <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs group/domain">
                    <div className="flex items-center gap-2 min-w-0 text-slate-600 dark:text-white/70">
                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-white/40 shrink-0" />
                      <span className="truncate font-mono text-[11px]">
                        {store.published_url 
                          ? store.published_url.replace(/^https?:\/\//, "")
                          : store.slug ? `${store.slug}.storegen.dz` : "Non configuré"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {liveUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(liveUrl, store.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title="Copier le lien"
                          >
                            {copiedId === store.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg text-slate-400 hover:text-accent transition-colors"
                            title="Ouvrir dans un nouvel onglet"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Operational Pulse Bar (Products, Orders, Revenue) */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider block font-medium">
                        Articles
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {store.productsCount}
                      </p>
                    </div>

                    <div className="border-x border-slate-200/60 dark:border-white/[0.06]">
                      <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider block font-medium">
                        Commandes
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {store.ordersCount}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-white/40 uppercase tracking-wider block font-medium">
                        Revenu
                      </span>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                        {store.totalRevenue > 0 ? `${(store.totalRevenue / 1000).toFixed(0)}k` : "0"} DZD
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions with Visual Hierarchy */}
                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-white/10 space-y-2.5">
                  {/* Primary & Sub Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/${type}/${store.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Gérer {isFunnel ? "le funnel" : "la boutique"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {/* Delete Icon Button */}
                    <button
                      type="button"
                      onClick={() => setStoreToDelete(store)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-white/[0.04] dark:hover:bg-rose-500/10 dark:text-white/60 dark:hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Fast Shortcuts: Produits & Commandes */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/${type}/products`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-white/70 text-[11px] font-semibold transition-colors"
                    >
                      <Package className="w-3 h-3 text-slate-400" />
                      <span>Produits</span>
                    </Link>

                    <Link
                      href={`/dashboard/${type}/orders`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-white/70 text-[11px] font-semibold transition-colors"
                    >
                      <ShoppingBag className="w-3 h-3 text-slate-400" />
                      <span>Commandes</span>
                    </Link>

                    {liveUrl && (
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20 text-[11px] font-semibold transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Aperçu</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── 5. Companion "Create New Project" Card (Vercel Style) ────────── */}
          <Link
            href={`/dashboard/${type}/create`}
            className="group rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-accent dark:hover:border-accent/80 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[320px] transition-all duration-300 hover:bg-accent/[0.02] dark:hover:bg-accent/[0.04]"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform mb-4 shadow-sm">
              <Plus className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-accent transition-colors">
              {isFunnel ? "Nouveau Funnel de Vente" : "Nouvelle Boutique en Ligne"}
            </h3>

            <p className="text-xs text-slate-500 dark:text-white/50 max-w-xs mt-1.5 leading-relaxed">
              {isFunnel
                ? "Configurez une nouvelle landing page mono-produit avec formulaire de commande optimisé."
                : "Lancez un nouveau catalogue complet de produits et commencez à vendre partout en Algérie."}
            </p>

            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-accent group-hover:underline">
              <span>Commencer maintenant</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      ) : (
        /* List / Table View (Stripe-Style) */
        <div className="bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-400 dark:text-white/40 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-4">Boutique</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Domaine</th>
                  <th className="px-6 py-4">Articles</th>
                  <th className="px-6 py-4">Commandes</th>
                  <th className="px-6 py-4">Chiffre d&apos;Affaires</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {filteredStores.map((store) => {
                  const isOnline = store.status === "published";
                  const liveUrl = store.published_url || (store.slug ? `https://store-${store.slug}.vercel.app` : null);

                  return (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm overflow-hidden"
                            style={{ backgroundColor: store.primary_color || "#2540ea" }}
                          >
                            {store.logo_url ? (
                              <img src={store.logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              store.name[0]?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/dashboard/${type}/${store.id}`}
                              className="font-bold text-slate-900 dark:text-white text-sm hover:text-accent transition-colors"
                            >
                              {store.name}
                            </Link>
                            <p className="text-[11px] text-slate-400 dark:text-white/40">
                              {store.category || (isFunnel ? "Mono-produit" : "Catalogue")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                          {isOnline ? "En ligne" : "Brouillon"}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-slate-600 dark:text-white/70">
                        {liveUrl ? (
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline hover:text-accent inline-flex items-center gap-1"
                          >
                            <span>{store.slug ? `${store.slug}.storegen.dz` : "Voir le site"}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </a>
                        ) : (
                          "Non publié"
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {store.productsCount}
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {store.ordersCount}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatDZD(store.totalRevenue)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/${type}/${store.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-sm transition-all"
                          >
                            <span>Gérer</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setStoreToDelete(store)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
