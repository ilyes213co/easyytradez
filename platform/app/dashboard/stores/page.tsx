"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  Plus, 
  ExternalLink, 
  Settings, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Globe, 
  Sparkles, 
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2
} from "lucide-react";
import { storesApi } from "@/lib/api";
import type { Store as StoreType } from "@/types/database";
import { useStores } from "@/hooks/use-stores";

export default function AllStoresPage() {
  const router = useRouter();

  const { data: stores = [], isLoading } = useStores();

  const selectAndOpenStore = (storeId: string, path: string = "") => {
    localStorage.setItem("active_store_id", storeId);
    window.dispatchEvent(new CustomEvent("active_store_changed", { detail: storeId }));
    router.push(path || `/dashboard/store/${storeId}`);
  };

  const totalStores = stores.length;
  const publishedStores = stores.filter(s => s.status === "published").length;
  const draftStores = totalStores - publishedStores;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Mes Boutiques
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Naviguez, gérez et pilotez l&apos;ensemble de vos boutiques et landing pages en Algérie.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/create-store"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 border border-white/20 transition-all self-start sm:self-auto hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>Créer une nouvelle boutique</span>
        </Link>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-blue-400/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Boutiques</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-400/30 text-blue-300 flex items-center justify-center">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{totalStores}</p>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-emerald-500/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">En Ligne (Actives)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">{publishedStores}</p>
        </div>

        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#0e1434]/80 to-[#070a1a]/95 border border-amber-500/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Brouillons</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{draftStores}</p>
        </div>
      </div>

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-12 text-center max-w-lg mx-auto">
          <Store className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white">Aucune boutique créée</h3>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            Lancez votre première boutique en quelques clics grâce à nos nouveaux modèles prêts pour le marché algérien.
          </p>
          <Link
            href="/dashboard/create-store"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Créer ma boutique
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => {
            const isOnline = store.status === "published";
            const dateStr = store.created_at ? new Date(store.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric"
            }) : "";

            return (
              <div
                key={store.id}
                className="group relative rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-blue-500/40 p-5 backdrop-blur-md shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                        <Store className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">
                          {store.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {store.theme || "Modèle Standard"} • {dateStr}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isOnline
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
                      {isOnline ? "En ligne" : "Brouillon"}
                    </span>
                  </div>

                  {/* Public Link */}
                  {store.published_url ? (
                    <a
                      href={store.published_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline mb-4 truncate max-w-full"
                    >
                      <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{store.published_url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500 italic mb-4">Lien public non publié</p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="space-y-2 border-t border-white/[0.08] pt-4 mt-2">
                  <button
                    onClick={() => selectAndOpenStore(store.id, `/dashboard/store/${store.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 hover:border-blue-400 text-white font-bold text-xs transition-all shadow-md"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Gérer cette boutique</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-70" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => selectAndOpenStore(store.id, `/dashboard/products?store=${store.id}`)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <Package className="h-3.5 w-3.5 text-amber-400" />
                      <span>Produits</span>
                    </button>

                    <button
                      onClick={() => selectAndOpenStore(store.id, `/dashboard/orders?store_id=${store.id}`)}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Commandes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
