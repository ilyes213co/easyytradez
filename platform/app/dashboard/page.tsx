"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Plus,
  Package,
  Palette,
  Truck,
  Check,
  Zap,
  ShoppingBag,
  ArrowRight,
  Copy,
  X,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { storesApi, productsApi, analyticsApi } from "@/lib/api";
import type { Store } from "@/types/database";
import { useStores } from "@/hooks/use-stores";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  confirmed: "bg-blue-600/20 text-blue-300 border-blue-400/30",
  shipped: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

interface OrderRow {
  id: string;
  order_number?: string;
  customer_name: string;
  items?: { name: string; qty: number }[] | string;
  total_amount: number;
  status: string;
  created_at?: string;
}

interface AnalyticsKpi {
  confirmed_orders?: number;
  confirmed_orders_prev?: number;
  revenue?: number;
  revenue_prev?: number;
  views?: number;
  views_prev?: number;
  average_basket?: number;
  average_basket_prev?: number;
  recent_orders?: OrderRow[];
}

interface AnalyticsData {
  kpi: AnalyticsKpi;
  recent_orders?: OrderRow[];
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("fr-DZ").format(n) + " DZD";
}

function DashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Product form state
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdIcon, setNewProdIcon] = useState("👕");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Simulated orders state (client side bonus)
  const [simulatedOrders, setSimulatedOrders] = useState<OrderRow[]>([]);
  const [simulatedStats, setSimulatedStats] = useState<{ orders: number; revenue: number; views: number }>({
    orders: 0,
    revenue: 0,
    views: 0,
  });

  // Shipping carriers state
  const [yalidineActive, setYalidineActive] = useState(true);
  const [zrActive, setZrActive] = useState(true);

  const searchParams = useSearchParams();
  const qStoreId = searchParams?.get("store_id") || searchParams?.get("store");

  // Fetch all user stores (partagé en cache)
  const { data: allStores = [], isLoading: isStoreLoading } = useStores();

  // Active store resolution (déterministe entre serveur et client)
  const store = useMemo(() => {
    if (!allStores.length) return null;
    if (qStoreId) {
      const match = allStores.find(s => s.id === qStoreId);
      if (match) return match;
    }
    if (storeId) {
      const match = allStores.find(s => s.id === storeId);
      if (match) return match;
    }
    return allStores[0] ?? null;
  }, [allStores, storeId, qStoreId]);

  // Restauration du storeId sauvegardé côté client après montage
  useEffect(() => {
    if (!qStoreId && !storeId && typeof window !== "undefined") {
      const saved = localStorage.getItem("active_store_id");
      if (saved && allStores.some(s => s.id === saved)) {
        setStoreId(saved);
        return;
      }
    }
    if (store?.id && store.id !== storeId) {
      setStoreId(store.id);
    }
  }, [store?.id, storeId, qStoreId, allStores]);

  // Listen for active_store_changed events
  useEffect(() => {
    const handleStoreChange = (e: any) => {
      const newId = e.detail;
      if (newId) {
        setStoreId(newId);
        queryClient.invalidateQueries({ queryKey: ["dashboard-products-list", newId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-analytics-7d", newId] });
      }
    };
    window.addEventListener("active_store_changed", handleStoreChange);
    return () => window.removeEventListener("active_store_changed", handleStoreChange);
  }, [queryClient]);

  // Fetch products count and list
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["dashboard-products-list", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const list = await productsApi.getByStore(storeId);
      return Array.isArray(list) ? list : [];
    },
    enabled: !!storeId,
  });

  // Fetch analytics
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["dashboard-analytics-7d", storeId],
    queryFn: () => analyticsApi.get(storeId as string, "7d"),
    enabled: !!storeId,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

  const publishedUrl = useMemo(() => {
    if (!store) return null;
    if (store.published_url) return store.published_url;
    if (store.slug) return `https://${store.slug}.vercel.app`;
    return null;
  }, [store]);

  const recentOrders: OrderRow[] = useMemo(() => {
    const list: OrderRow[] = [];
    if (analytics) {
      if (Array.isArray(analytics.recent_orders) && analytics.recent_orders.length > 0) {
        list.push(...analytics.recent_orders);
      } else if (Array.isArray(analytics.kpi?.recent_orders) && analytics.kpi!.recent_orders!.length > 0) {
        list.push(...analytics.kpi!.recent_orders!);
      }
    }
    return [...simulatedOrders, ...list];
  }, [analytics, simulatedOrders]);

  const kpi = analytics?.kpi;
  const totalOrders = (kpi?.confirmed_orders ?? 0) + simulatedStats.orders;
  const totalRevenue = (kpi?.revenue ?? 0) + simulatedStats.revenue;
  const totalViews = (kpi?.views ?? 4) + simulatedStats.views;
  const avgBasket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : (kpi?.average_basket ?? null);

  // Onboarding items calculation
  const designDone = Boolean(store?.theme || store?.primary_color);
  const productsDone = products.length > 0;
  const deliveryDone = yalidineActive || zrActive;
  const publishedDone = store?.status === "published";

  const checklist = [
    {
      id: "design",
      label: "Personnaliser le design",
      description: "Couleurs, typographie et identité visuelle configurées",
      href: store ? `/dashboard/store/${store.id}/design` : "/dashboard/create-store",
      done: designDone,
      action: null,
    },
    {
      id: "products",
      label: "Ajouter des produits",
      description: products.length > 0 ? `${products.length} produit(s) au catalogue` : "Créez votre première fiche produit",
      href: "/dashboard/products",
      done: productsDone,
      action: () => setIsProductModalOpen(true),
    },
    {
      id: "delivery",
      label: "Configurer la livraison 58 Wilayas",
      description: "Tarifs Yalidine / ZR Express et wilayas desservies",
      href: "/dashboard/delivery",
      done: deliveryDone,
      action: () => setIsShippingModalOpen(true),
    },
    {
      id: "publish",
      label: "Publier votre boutique en ligne",
      description: publishedDone ? "Boutique en ligne et opérationnelle" : "Déploiement en 1 clic sur Vercel",
      href: store ? `/dashboard/store/${store.id}` : "/dashboard/create-store",
      done: publishedDone,
      action: null,
    },
  ];
  const completedChecklistCount = checklist.filter((item) => item.done).length;

  // Handlers
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle.trim()) {
      toast.error("Veuillez indiquer un titre pour le produit.");
      return;
    }
    const priceNum = parseFloat(newProdPrice) || 2500;
    setIsCreatingProduct(true);
    try {
      if (storeId) {
        await productsApi.create({
          store_id: storeId,
          title: newProdTitle.trim(),
          price: priceNum,
          description: `Produit sous la catégorie ${newProdIcon}`,
          inventory_quantity: 50,
          status: "active",
        });
        queryClient.invalidateQueries({ queryKey: ["dashboard-products-list", storeId] });
      }
      toast.success(`Produit "${newProdTitle}" ajouté avec succès !`);
      setNewProdTitle("");
      setNewProdPrice("");
      setIsProductModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'ajout du produit.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSimulateOrder = () => {
    const fakeAmount = 3200;
    const fakeOrder: OrderRow = {
      id: `sim-${Date.now()}`,
      customer_name: "Karim M. (Oran)",
      total_amount: fakeAmount,
      status: "confirmed",
      items: [{ name: "T-Shirt Premium DZ", qty: 1 }],
      created_at: new Date().toISOString(),
    };
    setSimulatedOrders((prev) => [fakeOrder, ...prev]);
    setSimulatedStats((prev) => ({
      orders: prev.orders + 1,
      revenue: prev.revenue + fakeAmount,
      views: prev.views + 3,
    }));
    toast.success("Nouvelle commande test reçue depuis Oran ! (+3 200 DZD)");
  };

  const handleCopyStoreLink = () => {
    const link = publishedUrl || (store?.slug ? `https://${store.slug}.easytrade.dz` : "https://maboutique.easytrade.dz");
    navigator.clipboard.writeText(link);
    toast.success(`Lien copié : ${link}`);
  };

  const merchantName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Marchand";
  const activeStoreName = store?.name || "digital market";

  return (
    <div className="flex flex-col gap-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            AI Command Hub Active
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            Bonjour, <span>{merchantName}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            Boutique <strong className="text-white font-semibold">{activeStoreName}</strong>
            <span>•</span>
            Statut :{" "}
            <span className="text-emerald-400 font-medium inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {store?.status === "published" ? "En ligne sur Vercel" : "Prêt à vendre"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-blue-400/30 bg-blue-950/40 hover:bg-blue-900/40 text-blue-200 text-xs md:text-sm font-semibold flex items-center gap-2 transition-all hover:border-blue-300"
          >
            <span>Voir le site public</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/dashboard/create-store"
            className="px-4 py-2.5 rounded-xl text-white text-xs md:text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 border border-white/20 transition-all hover:scale-[1.02]"
          >
            <span>+ Nouvelle boutique</span>
          </Link>
        </div>
      </div>

      {/* 4 Fintech KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Metric 1: Commandes COD */}
        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-md shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-60" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-sm">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300">
                7J Glissants
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Commandes COD</span>
            <div className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
              {totalOrders}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Paiement livraison</span>
            <svg className="w-16 h-5 text-blue-400" viewBox="0 0 60 20" fill="none">
              <path d="M2 16 L14 12 L26 15 L38 8 L50 11 L58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Metric 2: Revenus COD */}
        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-md shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent opacity-60" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-sm">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> DZD
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Revenus Encaissés</span>
            <div className="text-3xl md:text-4xl font-black text-emerald-400 mt-1 tracking-tight">
              {totalRevenue > 0 ? formatPrice(totalRevenue) : "—"}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Encaissé 58 Wilayas</span>
            <svg className="w-16 h-5 text-emerald-400" viewBox="0 0 60 20" fill="none">
              <path d="M2 17 L12 14 L24 16 L36 9 L48 6 L58 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Metric 3: Visiteurs */}
        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-md shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 to-transparent opacity-60" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shadow-sm">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
                +100%
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Trafic Boutique</span>
            <div className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
              {totalViews}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-medium">Visites en direct</span>
            <svg className="w-16 h-5 text-sky-400" viewBox="0 0 60 20" fill="none">
              <path d="M2 18 L15 15 L28 12 L40 14 L50 7 L58 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Metric 4: Panier Moyen */}
        <div className="rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-md shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent opacity-60" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-sm">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300">
                Moyenne
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Panier Moyen</span>
            <div className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
              {avgBasket ? formatPrice(avgBasket) : "—"}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Par commande</span>
            <svg className="w-16 h-5 text-indigo-400" viewBox="0 0 60 20" fill="none">
              <path d="M2 14 L15 13 L28 9 L40 10 L52 6 L58 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Onboarding Checklist Progress Box */}
      <div className="p-6 md:p-8 rounded-3xl relative overflow-hidden border border-blue-500/30 bg-[#0a0e27]/75 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-blue-400 text-lg">⚡</span>
              <h2 className="text-lg md:text-xl font-extrabold text-white">Mise en ligne de votre boutique</h2>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Complétez ces étapes pour commencer à encaisser en cash-on-delivery
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-extrabold px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-400/30">
            {completedChecklistCount}/{checklist.length} Terminées
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {checklist.map((item) => {
            if (item.action) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  type="button"
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                    item.done
                      ? "bg-[#090e29]/70 border-blue-500/20"
                      : "bg-blue-950/40 border-blue-400/40 hover:border-blue-400 hover:bg-blue-900/30"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.done
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                      : "border-2 border-blue-400 text-transparent"
                  }`}>
                    {item.done ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold ${item.done ? "text-white line-through opacity-80" : "text-blue-200"}`}>
                        {item.label}
                      </h4>
                      {!item.done && <span className="text-[11px] text-blue-400 font-semibold underline">Configurer →</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                  item.done
                    ? "bg-[#090e29]/70 border-blue-500/20"
                    : "bg-blue-950/40 border-blue-400/40 hover:border-blue-400 hover:bg-blue-900/30"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  item.done
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "border-2 border-blue-400 text-transparent"
                }`}>
                  {item.done ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold ${item.done ? "text-white line-through opacity-80" : "text-blue-200"}`}>
                      {item.label}
                    </h4>
                    {!item.done && <span className="text-[11px] text-blue-400 font-semibold underline">Ouvrir →</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Row (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setIsProductModalOpen(true)}
          className="p-5 rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#101840]/65 to-[#090d22]/90 hover:from-[#1c2c6e]/70 hover:to-[#0c1230]/95 hover:border-blue-400/60 flex items-center justify-between text-left transition-all duration-300 shadow-lg group hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-900/50 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080d27] rounded-[14px] flex items-center justify-center text-blue-300">
                <Plus className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Ajouter un produit</h4>
              <p className="text-xs text-slate-400 mt-0.5">Prix en DZD, photos & variantes</p>
            </div>
          </div>
          <span className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all">
            →
          </span>
        </button>

        <button
          onClick={() => setIsPreviewModalOpen(true)}
          className="p-5 rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#101840]/65 to-[#090d22]/90 hover:from-[#1c2c6e]/70 hover:to-[#0c1230]/95 hover:border-blue-400/60 flex items-center justify-between text-left transition-all duration-300 shadow-lg group hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-md shadow-indigo-900/50 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080d27] rounded-[14px] flex items-center justify-center text-indigo-300">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Voir ma boutique</h4>
              <p className="text-xs text-slate-400 mt-0.5">Storefront public en direct</p>
            </div>
          </div>
          <span className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all">
            →
          </span>
        </button>

        <Link
          href={store ? `/dashboard/store/${store.id}/design` : "/dashboard/create-store"}
          className="p-5 rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#101840]/65 to-[#090d22]/90 hover:from-[#1c2c6e]/70 hover:to-[#0c1230]/95 hover:border-blue-400/60 flex items-center justify-between text-left transition-all duration-300 shadow-lg group hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-500 p-0.5 shadow-md shadow-cyan-900/50 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080d27] rounded-[14px] flex items-center justify-center text-cyan-300">
                <Palette className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Studio de Design</h4>
              <p className="text-xs text-slate-400 mt-0.5">Personnaliser thème & animations</p>
            </div>
          </div>
          <span className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all">
            →
          </span>
        </Link>
      </div>

      {/* Recent Orders Area */}
      <div className="p-8 rounded-3xl border border-blue-500/20 bg-[#0a0e27]/75 backdrop-blur-md relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
              Commandes Récentes (Flux COD)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {recentOrders.length} commande{recentOrders.length !== 1 ? "s" : ""} enregistrée{recentOrders.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateOrder}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simuler commande test (Algérie)</span>
            </button>
            <Link
              href="/dashboard/orders"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Consulter tout →
            </Link>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-blue-500/20 flex items-center justify-center text-slate-400 mb-4">
              <Truck className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Aucune commande récente</h4>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md">
              Vos prochaines commandes en provenance de votre boutique apparaîtront ici en temps réel.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {recentOrders.slice(0, 6).map((order) => {
              const itemCount = Array.isArray(order.items)
                ? order.items.reduce((s: number, it: any) => s + (it.qty ?? 1), 0)
                : 1;
              const badge = STATUS_BADGE[order.status] ?? "bg-blue-500/10 text-blue-300 border-blue-400/20";
              const label = STATUS_LABEL[order.status] ?? "Confirmée";

              return (
                <li key={order.id} className="py-3.5 flex items-center justify-between hover:bg-white/[0.02] px-3 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-xs">
                      COD
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{order.customer_name || "Client Marchand"}</p>
                      <p className="text-xs text-slate-400">
                        {itemCount} article{itemCount !== 1 ? "s" : ""} • Paiement à la livraison
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-white">{formatPrice(order.total_amount)}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge}`}>
                      {label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* MODAL: AJOUTER UN PRODUIT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Ajouter un produit</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex flex-col gap-3.5 text-left text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Titre du produit</label>
                <input
                  type="text"
                  value={newProdTitle}
                  onChange={(e) => setNewProdTitle(e.target.value)}
                  placeholder="Ex: T-Shirt Oversize Noir DZ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Prix de vente (DZD)</label>
                <input
                  type="number"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="Ex: 3500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Catégorie visuelle</label>
                <select
                  value={newProdIcon}
                  onChange={(e) => setNewProdIcon(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="👕">👕 T-shirt / Vêtement</option>
                  <option value="👟">👟 Baskets / Chaussures</option>
                  <option value="⌚">⌚ Montre / Bijou</option>
                  <option value="📱">📱 Smartphone / Tech</option>
                  <option value="🧴">🧴 Parfum / Cosmétique</option>
                  <option value="📦">📦 Autre article</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold border border-slate-200 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center gap-1.5"
                >
                  {isCreatingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXPÉDITION 58 WILAYAS */}
      {isShippingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0e27] text-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-blue-500/40 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚚</span>
                <h3 className="text-lg font-extrabold text-white">Livraison 58 Wilayas</h3>
              </div>
              <button onClick={() => setIsShippingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Activez vos transporteurs favoris pour expédier automatiquement vos commandes avec bordereaux synchronisés.
            </p>

            <div className="flex flex-col gap-3 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.05] border border-white/10 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={yalidineActive}
                    onChange={(e) => setYalidineActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="font-bold text-white">Yalidine Express</p>
                    <p className="text-[11px] text-slate-400">Hubs & Domicile sur 58 Wilayas</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold ${yalidineActive ? "text-emerald-400" : "text-slate-500"}`}>
                  {yalidineActive ? "Actif" : "Inactif"}
                </span>
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.05] border border-white/10 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={zrActive}
                    onChange={(e) => setZrActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <div>
                    <p className="font-bold text-white">ZR Express</p>
                    <p className="text-[11px] text-slate-400">Service express livraison rapide</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold ${zrActive ? "text-emerald-400" : "text-slate-500"}`}>
                  {zrActive ? "Actif" : "Inactif"}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setIsShippingModalOpen(false);
                  toast.success("Configuration des transporteurs 58 Wilayas enregistrée !");
                }}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                Valider la configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APERÇU VITRINE STOREFRONT */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0e27] text-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative border border-blue-400/40 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {activeStoreName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{activeStoreName}</h3>
                  <p className="text-xs text-blue-300">
                    {store?.slug ? `${store.slug}.easytrade.dz` : "maboutique.easytrade.dz"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 text-center">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                Aperçu direct en ligne
              </span>
              <h4 className="text-xl font-black text-white">
                Bienvenue chez <span>{activeStoreName}</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                {store?.description || "La meilleure sélection de vêtements et d'accessoires branchés en Algérie."}
              </p>
            </div>

            <div className="mb-6">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Catalogue en ligne</h5>
              {products.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                  Aucun produit pour le moment. Cliquez sur &quot;Ajouter un produit&quot; pour garnir votre vitrine.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        <div>
                          <p className="text-xs font-bold text-white">{p.title}</p>
                          <p className="text-xs font-extrabold text-blue-400">{formatPrice(p.price)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.success(`Simulation d'achat pour "${p.title}" lancée !`)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Commander COD
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-white/10">
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Paiement Cash à la livraison 58 Wilayas
              </span>
              <button
                onClick={handleCopyStoreLink}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le lien public</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-24 bg-white/[0.03] rounded-2xl border border-white/[0.08]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white/[0.03] rounded-2xl border border-white/[0.08]" />
        ))}
      </div>
      <div className="h-72 bg-white/[0.03] rounded-2xl border border-white/[0.08]" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
