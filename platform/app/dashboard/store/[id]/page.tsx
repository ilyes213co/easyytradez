"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import {
  ExternalLink, Package, BarChart2, Settings,
  RefreshCw, Globe, Palette, Smartphone, Search,
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

  if (isStoreLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isStoreError || !store) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-red-900">Boutique introuvable</h1>
        <p className="mt-2 text-sm text-red-700">
          Cette boutique ne peut pas être chargée avec votre session actuelle.
        </p>
        <Link href="/dashboard/store" className="mt-4 inline-flex text-sm font-medium text-red-800 hover:underline">
          Retour à mes boutiques
        </Link>
      </div>
    );
  }

  const views = analytics?.kpi?.views ?? 0;
  const waClicks = analytics?.kpi?.whatsapp_clicks ?? 0;
  const previewProducts = products.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: store.primary_color ?? "#534AB7" }}
          >
            {store.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{store.name}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`badge ${store.status === "published" ? "badge-success" : "badge-warning"}`}>
                {store.status === "published" ? "En ligne" : "Brouillon"}
              </span>
              {store.published_url && (
                <a
                  href={store.published_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                >
                  {store.published_url.replace("https://", "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <PublishButton storeId={store.id} currentStatus={store.status} />
          <Link href={`/dashboard/store/${store.id}/seo`} className="btn-secondary flex items-center gap-2">
            <Search className="h-4 w-4" /> SEO
          </Link>
          {store.published_url && (
            <a href={store.published_url} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink className="h-4 w-4" /> Voir la boutique
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Vues (7j)", value: views, icon: BarChart2, color: "text-blue-500 bg-blue-50" },
          { label: "Clics WA (7j)", value: waClicks, icon: Globe, color: "text-green-500 bg-green-50" },
          { label: "Produits", value: products.length, icon: Package, color: "text-amber-500 bg-amber-50" },
          { label: "Thème", value: store.theme, icon: Palette, color: "text-purple-500 bg-purple-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <div className={`rounded-lg p-2 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-base font-semibold capitalize text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href={`/dashboard/products?store=${store.id}`}
          icon={Package}
          title="Gérer les produits"
          desc={`${products.length} produits — ajouter, modifier, réordonner`}
          color="bg-amber-50 text-amber-600"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/design`}
          icon={Palette}
          title="Design & thème"
          desc="Couleurs, animations, mise en page"
          color="bg-purple-50 text-purple-600"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/preview`}
          icon={Smartphone}
          title="Aperçu"
          desc="Voir votre boutique avant publication"
          color="bg-blue-50 text-blue-600"
        />
        <ActionCard
          href={`/dashboard/analytics?store=${store.id}`}
          icon={BarChart2}
          title="Statistiques"
          desc="Vues, conversions, commandes"
          color="bg-green-50 text-green-600"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/regenerate`}
          icon={RefreshCw}
          title="Régénérer avec l'IA"
          desc="Créer une nouvelle version de la boutique"
          color="bg-primary-50 text-primary-600"
        />
        <ActionCard
          href={`/dashboard/store/${store.id}/settings`}
          icon={Settings}
          title="Paramètres boutique"
          desc="Domaine, WhatsApp, SEO, intégrations"
          color="bg-gray-100 text-gray-600"
        />
      </div>

      {previewProducts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Produits récents</h2>
            <Link href={`/dashboard/products?store=${store.id}`} className="text-xs text-primary-600 hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {previewProducts.map((product) => {
              const image = Array.isArray(product.images) && product.images.length > 0
                ? (product.images[0] as { url?: string }).url ?? null
                : null;
              return (
                <div key={product.id} className="card group cursor-pointer p-3 transition hover:border-gray-200">
                  <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {image ? (
                      <img src={image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.price.toLocaleString("fr-DZ")} DZD</p>
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
  color,
}: {
  href: string;
  icon: ElementType;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link href={href} className="card group flex items-start gap-3 transition-all hover:border-gray-200 hover:shadow-sm">
      <div className={`rounded-xl p-2.5 ${color} transition group-hover:scale-105`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
      </div>
    </Link>
  );
}
