"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Store as StoreIcon,
  Truck,
  Search,
  Palette,
  Plus,
} from "lucide-react";
import { storesApi } from "@/lib/api";
import { StoreSettingsForm } from "@/components/store/StoreSettingsForm";
import type { Store } from "@/types/database";

function SettingsContent() {
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get("store");

  const {
    data: stores = [],
    isLoading,
    isError,
  } = useQuery<Store[]>({
    queryKey: ["user-stores-settings"],
    queryFn: async () => {
      try {
        const res = await storesApi.getAll();
        return Array.isArray(res) ? res : [];
      } catch (err) {
        console.error("Failed to load stores for settings:", err);
        return [];
      }
    },
  });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (stores.length === 0) return;
    const firstStore = stores[0];
    if (storeIdParam && stores.some((s) => s.id === storeIdParam)) {
      setSelectedStoreId(storeIdParam);
    } else if (!selectedStoreId || !stores.some((s) => s.id === selectedStoreId)) {
      if (firstStore) {
        setSelectedStoreId(firstStore.id);
      }
    }
  }, [stores, storeIdParam, selectedStoreId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const firstStore = stores[0];
  if (isError || stores.length === 0 || !firstStore) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-300 border border-blue-400/30 mb-4">
          <StoreIcon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-white">Aucune boutique trouvée</h1>
        <p className="text-sm text-white/50 mt-2 mb-6">
          Vous devez d&apos;abord créer une boutique pour pouvoir configurer ses paramètres généraux, de livraison et de design.
        </p>
        <Link
          href="/dashboard/create-store"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-900/40 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          <Plus className="h-4 w-4" /> Créer ma boutique
        </Link>
      </div>
    );
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId) || firstStore;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">Paramètres</h1>
            <span className="flex h-6 items-center rounded-md bg-blue-600/20 border border-blue-400/30 px-2 text-xs font-semibold text-blue-300">
              Général
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Gérez la configuration globale, le contact WhatsApp, l&apos;identité et les devises.
          </p>
        </div>

        {/* Store switcher if user owns multiple stores */}
        {stores.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">Boutique active :</label>
            <select
              value={selectedStore.id}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#121218] px-3 py-2 text-xs font-medium text-white outline-none focus:border-blue-400"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#121218] text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick navigation pill cards to other config sections */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href={`/dashboard/delivery`}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Tarifs de Livraison</p>
            <p className="text-[11px] text-white/40">Frais par wilaya & seuils de gratuité</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/store/${selectedStore.id}/seo`}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Référencement SEO</p>
            <p className="text-[11px] text-white/40">Mots-clés, sitemap & robots.txt</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/store/${selectedStore.id}/design`}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Éditeur de Thème</p>
            <p className="text-[11px] text-white/40">Typographies et mise en page visuelle</p>
          </div>
        </Link>
      </div>

      {/* Main Settings Form */}
      <StoreSettingsForm store={selectedStore} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
