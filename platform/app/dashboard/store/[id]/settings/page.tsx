"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { storesApi } from "@/lib/api";
import { StoreSettingsForm } from "@/components/store/StoreSettingsForm";
import type { Store } from "@/types/database";

export default function StoreSettingsPage() {
  const params = useParams();
  const storeId = params.id as string;

  const {
    data: store,
    isLoading,
    isError,
  } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: () => storesApi.getOne(storeId),
    enabled: Boolean(storeId),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <h1 className="text-lg font-semibold text-red-200">Boutique introuvable</h1>
        <p className="mt-2 text-sm text-red-300/80">
          Cette boutique ne peut pas être chargée avec votre session actuelle.
        </p>
        <Link href="/dashboard/store" className="mt-4 inline-flex text-sm font-medium text-red-200 hover:underline">
          ← Retour à mes boutiques
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/store/${store.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Paramètres de la boutique</h1>
          <p className="text-xs text-white/50">{store.name} — Configuration générale, WhatsApp & Thème</p>
        </div>
      </div>

      <StoreSettingsForm store={store} />
    </div>
  );
}
