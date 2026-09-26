"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ElementType } from "react";
import {
  ExternalLink,
  Package,
  BarChart2,
  Settings,
  RefreshCw,
  Globe,
  Palette,
  Smartphone,
  Search,
  Loader2,
  ArrowRight,
  Layers,
} from "lucide-react";
import PublishButton from "@/components/store/PublishButton";
import { analyticsApi, productsApi, storesApi } from "@/lib/api";
import type { Product, Store } from "@/types/database";

type StoreAnalyticsSummary = {
  kpi?: {
    views?: number;
    whatsapp_clicks?: number;
  };
};

export default function StorePage() {
  const params = useParams();
  const storeId = params.id as string;
  const { user } = useAuth();

  const {
    data: store,
    isLoading: isStoreLoading,
    isError: isStoreError,
  } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: () => storesApi.getOne(storeId),
    enabled: Boolean(storeId) && Boolean(user?.id),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["store-products", storeId],
    queryFn: () => productsApi.getByStore(storeId),
    enabled: Boolean(storeId) && Boolean(user?.id),
  });

  const { data: analytics } = useQuery<StoreAnalyticsSummary>({
    queryKey: ["store-analytics-summary", storeId],
    queryFn: () => analyticsApi.get(storeId, "7d"),
    enabled: Boolean(storeId) && Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  if (isStoreLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isStoreError || !store) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-rose-200">Boutique introuvable</h1>
        <p className="mt-2 text-sm text-rose-300/80">
          Cette boutique ne peut pas être chargée avec votre session actuelle.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
        >
          Retour au Command Center
        </Link>
      </div>
    );
  }

  const views = analytics?.kpi?.views ?? 0;
  const waClicks = analytics?.kpi?.whatsapp_clicks ?? 0;
  const previewProducts = products.slice(0, 5);
  const isPublished = store.status === "published";

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-200">
      {/* Top Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg shadow-blue-900/40 border border-white/20 flex-shrink-0"
            style={{ backgroundColor: store.primary_color ?? "#2540ea" }}
          >
            {store.name[0]?.toUpperCase() ?? "T"}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/stores"
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 hover:underline"
              >
                <Layers className="h-3 w-3" />
                <span>Toutes mes boutiques</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {store.name}
              </h1>
              <Link
                href="/dashboard/stores"
                className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                title="Changer de boutique"
              >
                <span>Changer</span>
                <span className="text-[10px]">▼</span>
              </Link>
            </div>
            <div className="mt-1 flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isPublished
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-400" : "bg-amber-400"}`} />
                {isPublished ? "En ligne" : "Brouillon"}
              </span>

              {store.published_url && (
                <a
                  href={store.published_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  <span>{store.published_url.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <PublishButton storeId={store.id} currentStatus={store.status} />
          
          <Link
            href={`/dashboard/store/${store.id}/seo`}
            className="px-4 py-2.5 rounded-xl border border-blue-400/30 bg-blue-950/40 hover:bg-blue-900/40 text-blue-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:border-blue-300"
          >
            <Search className="h-4 w-4" />
            <span>SEO</span>
          </Link>

          {store.published_url && (
            <a
              href={store.published_url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl border border-blue-400/30 bg-blue-950/40 hover:bg-blue-900/40 text-blue-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:border-blue-300"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Voir la boutique</span>
            </a>
          )}
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Vues (7j)",
            value: views,
            icon: BarChart2,
            iconWrap: "bg-blue-600/20 border-blue-400/30 text-blue-300",
          },
          {
            label: "Clics WA (7j)",
            value: waClicks,
            icon: Globe,
            iconWrap: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
          },
          {
            label: "Produits",
            value: products.length,
            icon: Package,
            iconWrap: "bg-amber-500/20 border-amber-400/30 text-amber-300",
          },
          {
            label: "Thème",
            value: store.theme ?? "Moderne",
            icon: Palette,
            iconWrap: "bg-indigo-500/20 border-indigo-400/30 text-indigo-300",
          },
        ].map(({ label, value, icon: Icon, iconWrap }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3.5 bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-xl shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm ${iconWrap}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              <p className="text-base font-bold text-white capitalize truncate mt-0.5">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 6 Action Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href={`/dashboard/products?store=${store.id}`}
          icon={Package}
          title="Gérer les produits"
          desc={`${products.length} produits — ajouter, modifier, réordonner`}
          iconColor="bg-amber-500/20 border-amber-400/30 text-amber-300"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/design`}
          icon={Palette}
          title="Design & thème"
          desc="Couleurs, animations, mise en page"
          iconColor="bg-purple-500/20 border-purple-400/30 text-purple-300"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/preview`}
          icon={Smartphone}
          title="Aperçu"
          desc="Voir votre boutique avant publication"
          iconColor="bg-blue-600/20 border-blue-400/30 text-blue-300"
        />
        <ActionCard
          href={`/dashboard/analytics?store=${store.id}`}
          icon={BarChart2}
          title="Statistiques"
          desc="Vues, conversions, commandes"
          iconColor="bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/regenerate`}
          icon={RefreshCw}
          title="Régénérer avec l'IA"
          desc="Créer une nouvelle version de la boutique"
          iconColor="bg-indigo-500/20 border-indigo-400/30 text-indigo-300"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/settings`}
          icon={Settings}
          title="Paramètres boutique"
          desc="Domaine, WhatsApp, SEO, intégrations"
          iconColor="bg-white/10 border-white/20 text-slate-300"
        />
      </div>

      {/* Recent Products Gallery */}
      {previewProducts.length > 0 && (
        <div className="p-6 rounded-3xl border border-blue-500/20 bg-[#0a0e27]/75 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
              Produits récents
            </h2>
            <Link
              href={`/dashboard/products?store=${store.id}`}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {previewProducts.map((product) => {
              const image =
                Array.isArray(product.images) && product.images.length > 0
                  ? (product.images[0] as { url?: string }).url ?? null
                  : null;
              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-blue-400/20 bg-[#090d24] p-3 transition-all hover:border-blue-400/40 hover:-translate-y-1 shadow-md group cursor-pointer"
                >
                  <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-white/5 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-white/20 flex items-center justify-center">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="truncate text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    {product.name}
                  </p>
                  <p className="text-xs font-extrabold text-blue-400 mt-0.5">
                    {product.price?.toLocaleString("fr-DZ")} DZD
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  iconColor,
}: {
  href: string;
  icon: ElementType;
  title: string;
  desc: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="p-5 rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#101840]/65 to-[#090d22]/90 hover:from-[#1c2c6e]/70 hover:to-[#0c1230]/95 hover:border-blue-400/60 flex items-start gap-4 transition-all duration-300 shadow-lg group hover:-translate-y-1"
    >
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-md transition-transform group-hover:scale-110 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
            {title}
          </h3>
          <span className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all text-xs">
            →
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          {desc}
        </p>
      </div>
    </Link>
  );
}
