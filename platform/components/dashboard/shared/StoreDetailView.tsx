"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import {
  ExternalLink, Package, BarChart2, Settings,
  Globe, Palette, Smartphone, ArrowRight,
  ShoppingBag, Truck, Copy, Check, AlertTriangle, ArrowLeft
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

interface StoreDetailViewProps {
  type: "boutique" | "funnel";
  storeId?: string;
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  color,
}: {
  href: string;
  icon: ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] hover:border-accent/40 dark:hover:border-accent/50 p-5 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between shadow-sm dark:shadow-xl relative overflow-hidden"
    >
      <div className="flex items-start gap-3.5">
        <div className={`rounded-xl p-2.5 shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent dark:text-sky pt-3 border-t border-slate-100 dark:border-white/[0.05]">
        <span>Gérer</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function StoreDetailView({ type, storeId: propStoreId }: StoreDetailViewProps) {
  const params = useParams();
  const storeId = propStoreId || (params?.id as string);
  const isFunnel = type === "funnel";
  const [copied, setCopied] = useState(false);

  const {
    data: store,
    isLoading: isStoreLoading,
    isError: isStoreError,
  } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: () => storesApi.getOne(storeId),
    enabled: Boolean(storeId),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["store-products", storeId],
    queryFn: () => productsApi.getByStore(storeId),
    enabled: Boolean(storeId),
  });

  const { data: analytics } = useQuery<StoreAnalyticsSummary>({
    queryKey: ["store-analytics-summary", storeId],
    queryFn: () => analyticsApi.get(storeId, "7d"),
    enabled: Boolean(storeId),
    staleTime: 60 * 1000,
  });

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isStoreLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent dark:border-sky border-t-transparent" />
      </div>
    );
  }

  // Strict isolation check: verify existence and matching type
  if (isStoreError || !store || store.type !== type) {
    const isMismatched = Boolean(store && store.type !== type);
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 shadow-xl text-center space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          {isMismatched
            ? "Ressource non accessible ici"
            : isFunnel ? "Funnel introuvable" : "Boutique introuvable"}
        </h1>
        <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed">
          {isMismatched
            ? `Cet élément est un(e) ${store?.type === "funnel" ? "funnel" : "boutique"}. Pour garantir la séparation stricte des données, il ne peut pas être affiché dans la section ${isFunnel ? "Funnels" : "Boutiques"}.`
            : "Cette ressource n'existe pas ou n'est pas accessible avec votre compte."}
        </p>
        <div className="pt-2 flex flex-col gap-2">
          {isMismatched ? (
            <Link
              href={`/dashboard/${store?.type}/${store?.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all"
            >
              <span>Ouvrir dans la section {store?.type === "funnel" ? "Funnels" : "Boutiques"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/dashboard/${type}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à mes {isFunnel ? "funnels" : "boutiques"}</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const views = analytics?.kpi?.views ?? 0;
  const waClicks = analytics?.kpi?.whatsapp_clicks ?? 0;
  const liveUrl = store.published_url || `/preview/${store.id}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Identity & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow-md border border-white/20 shrink-0"
            style={{ backgroundColor: store.primary_color ?? "#2540ea" }}
          >
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-full w-full object-contain rounded-2xl" />
            ) : (
              store.name[0]?.toUpperCase() || (isFunnel ? "F" : "B")
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {store.name}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  store.status === "published"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {store.status === "published" ? "En ligne" : "Brouillon"}
              </span>
            </div>

            {store.published_url ? (
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={store.published_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-accent dark:text-sky hover:underline"
                >
                  <span className="font-mono">{store.published_url.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(store.published_url!)}
                  className="p-1 rounded-md text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
                  title="Copier le lien"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">
                {isFunnel ? "Tunnel mono-produit optimisé" : "Boutique en ligne multi-produits"}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PublishButton storeId={store.id} currentStatus={store.status} />
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-white dark:bg-white/[0.05] hover:bg-slate-50 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5 text-accent dark:text-sky" />
            <span>Voir en direct</span>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[
          { label: "Visites (7j)", value: views, icon: BarChart2, color: "text-accent dark:text-sky bg-accent/10 dark:bg-accent/20" },
          { label: "Clics WhatsApp", value: waClicks, icon: Globe, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20" },
          { label: isFunnel ? "Produit Star" : "Produits", value: products.length, icon: Package, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20" },
          { label: "Thème", value: store.theme || "Standard", icon: Palette, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-500/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1e] p-4 flex items-center gap-3.5 shadow-sm dark:shadow-xl"
          >
            <div className={`rounded-xl p-2.5 ${color} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wider">{label}</p>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize truncate mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href={`/dashboard/${type}/products`}
          icon={Package}
          title={isFunnel ? "Gérer le produit" : "Gérer les produits"}
          desc={isFunnel ? "Prix, photos, descriptions & variantes de conversion" : `${products.length} articles — modifier, stock, prix et réordonner`}
          color="bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
        />
        <ActionCard
          href={`/dashboard/${type}/orders`}
          icon={ShoppingBag}
          title="Commandes"
          desc="Suivi en direct, statuts, clients et encaissements"
          color="bg-accent/10 dark:bg-accent/20 text-accent dark:text-sky"
        />
        <ActionCard
          href={`/dashboard/${type}/delivery`}
          icon={Truck}
          title="Frais de livraison"
          desc="Configuration des tarifs et gratuité par wilaya"
          color="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        />
        <ActionCard
          href={`/dashboard/analytics?section=${type}&store=${store.id}`}
          icon={BarChart2}
          title="Statistiques de vente"
          desc="Taux de conversion, visites uniques et ROI"
          color="bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
        />
        <ActionCard
          href={liveUrl}
          icon={Smartphone}
          title="Aperçu mobile"
          desc="Vérifier l'expérience d'achat sur smartphone et desktop"
          color="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
        />
        <ActionCard
          href={`/dashboard/settings`}
          icon={Settings}
          title="Paramètres"
          desc="Pixel Facebook, TikTok, domaine personnalisé et coordonnées"
          color="bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70"
        />
      </div>
    </div>
  );
}
