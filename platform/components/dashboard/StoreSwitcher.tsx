"use client";

import { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronsUpDown, Check, Plus, Sparkles 
} from "lucide-react";
import { storesApi } from "@/lib/api";
import type { Store as StoreType } from "@/types/database";

interface StoreSwitcherProps {
  typeOverride?: "boutique" | "funnel";
}

export default function StoreSwitcher({ typeOverride }: StoreSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Deduce navigation section
  const currentType: "boutique" | "funnel" = useMemo(() => {
    if (typeOverride) return typeOverride;
    if (pathname.startsWith("/dashboard/funnel")) return "funnel";
    return "boutique";
  }, [pathname, typeOverride]);

  const isFunnel = currentType === "funnel";

  // Fetch stores filtered by currentType
  const { data: stores = [], isLoading } = useQuery<StoreType[]>({
    queryKey: ["stores", currentType],
    queryFn: () => storesApi.getAll(currentType),
  });

  // Extract store ID from URL if on [id] route, otherwise first store
  const currentStoreId = useMemo(() => {
    const match = pathname.match(new RegExp(`/dashboard/${currentType}/([a-zA-Z0-9-]+)`));
    if (match && match[1] && !["orders", "delivery", "products", "create"].includes(match[1])) {
      return match[1];
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem(`active_store_${currentType}`) : null;
    if (saved && stores.some(s => s.id === saved)) {
      return saved;
    }
    return stores[0]?.id ?? null;
  }, [pathname, currentType, stores]);

  const activeStore = stores.find(s => s.id === currentStoreId) || stores[0] || null;

  const handleSelect = (store: StoreType) => {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(`active_store_${currentType}`, store.id);
    }
    // If on a store detail page, navigate to the selected store detail page
    if (pathname.includes(`/${currentType}/`)) {
      router.push(`/dashboard/${currentType}/${store.id}`);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.16] transition-all text-left group shadow-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm border border-black/10 dark:border-white/20 overflow-hidden"
            style={{ backgroundColor: activeStore?.primary_color || "#2540ea" }}
          >
            {activeStore?.logo_url ? (
              <img src={activeStore.logo_url} alt="" className="w-full h-full object-contain" />
            ) : (
              activeStore?.name?.[0]?.toUpperCase() || (isFunnel ? "F" : "B")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white/95 truncate leading-tight">
              {isLoading ? "Chargement..." : activeStore?.name || (isFunnel ? "Aucun funnel" : "Aucune boutique")}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isFunnel ? "bg-accent dark:bg-sky animate-pulse" : "bg-indigo-500"}`} />
              <span className="text-[10px] text-slate-500 dark:text-white/45 font-medium tracking-wide">
                {isFunnel ? "Funnel mono-produit" : "Catalogue multi-produits"}
              </span>
            </div>
          </div>
        </div>
        <ChevronsUpDown className={`w-3.5 h-3.5 text-slate-400 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/80 transition-colors shrink-0 ${open ? "text-slate-900 dark:text-white" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-white dark:bg-[#090915] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[10px] font-bold text-accent dark:text-sky-light/80 uppercase tracking-widest font-mono">
                {isFunnel ? "Funnels" : "Boutiques"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">
                {stores.length} {stores.length > 1 ? "actifs" : "actif"}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5 custom-scrollbar">
              {stores.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 dark:text-white/40">
                  Aucun {isFunnel ? "funnel" : "boutique"} créé.
                </div>
              ) : (
                stores.map((s) => {
                  const isSelected = s.id === activeStore?.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelect(s)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                        isSelected
                          ? "bg-accent/10 dark:bg-accent/20 text-accent dark:text-white font-semibold border border-accent/20 dark:border-accent/40 shadow-sm"
                          : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-black/10 dark:border-white/10"
                          style={{ backgroundColor: s.primary_color || "#2540ea" }}
                        >
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <span className="truncate">{s.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent dark:text-sky shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/dashboard/${currentType}/create`);
                }}
                className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-accent dark:text-sky-light hover:bg-accent/10 dark:hover:bg-accent/20 border border-transparent hover:border-accent/20 dark:hover:border-accent/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isFunnel ? "Nouveau Funnel" : "Nouvelle Boutique"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
