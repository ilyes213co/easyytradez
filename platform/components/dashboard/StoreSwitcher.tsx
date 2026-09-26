                                                                                                                                                                                                                                              "use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Store as StoreIcon, 
  ChevronDown, 
  Check, 
  Plus, 
  Layers, 
  ExternalLink,
  Sparkles,
  Loader2
} from "lucide-react";
import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";

import { useStores } from "@/hooks/use-stores";

export function StoreSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all stores (partagé en cache)
  const { data: stores = [], isLoading } = useStores();

  // Determine active store
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!stores.length) return;

    // 1. From URL param /dashboard/store/[id]
    if (params?.id && typeof params.id === "string") {
      const match = stores.find(s => s.id === params.id);
      if (match) {
        setActiveStoreId(match.id);
        localStorage.setItem("active_store_id", match.id);
        return;
      }
    }

    // 2. From URL query ?store=... or ?store_id=...
    const qStore = searchParams.get("store") || searchParams.get("store_id");
    if (qStore) {
      const match = stores.find(s => s.id === qStore);
      if (match) {
        setActiveStoreId(match.id);
        localStorage.setItem("active_store_id", match.id);
        return;
      }
    }

    // 3. From localStorage
    const saved = localStorage.getItem("active_store_id");
    if (saved) {
      const match = stores.find(s => s.id === saved);
      if (match) {
        setActiveStoreId(match.id);
        return;
      }
    }

    // 4. Default to newest
    if (stores[0]) {
      setActiveStoreId(stores[0].id);
      localStorage.setItem("active_store_id", stores[0].id);
    }
  }, [stores, params?.id, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStore = stores.find(s => s.id === activeStoreId) || stores[0];

  const handleSelectStore = (store: Store) => {
    setActiveStoreId(store.id);
    localStorage.setItem("active_store_id", store.id);
    setIsOpen(false);

    // Notify other components
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("active_store_changed", { detail: store.id }));
    }

    // Smart contextual navigation:
    if (pathname.startsWith("/dashboard/store/")) {
      // Stay on store details but for the newly selected store
      router.push(`/dashboard/store/${store.id}`);
    } else if (pathname.startsWith("/dashboard/products")) {
      router.push(`/dashboard/products?store=${store.id}`);
    } else if (pathname.startsWith("/dashboard/orders")) {
      router.push(`/dashboard/orders?store_id=${store.id}`);
    } else if (pathname.startsWith("/dashboard/analytics")) {
      router.push(`/dashboard/analytics?store=${store.id}`);
    } else {
      router.push(`/dashboard/store/${store.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.04] border border-white/[0.08]" />
    );
  }

  if (!stores.length) {
    return (
      <button
        onClick={() => router.push("/dashboard/create-store")}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/10 px-3 py-2.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-all"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Créer une boutique
        </span>
      </button>
    );
  }

  const isOnline = activeStore?.status === "published";

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-2.5 text-left transition-all hover:border-blue-500/50 hover:bg-white/[0.08] shadow-md shadow-black/30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-sm">
            <StoreIcon className="h-4 w-4" />
            <span 
              className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#090b10] ${
                isOnline ? "bg-emerald-400" : "bg-amber-400"
              }`} 
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                {activeStore?.name || "Ma Boutique"}
              </span>
            </div>
            <p className="truncate text-[10px] text-white/50">
              {isOnline ? "En ligne • Prête" : "Brouillon"}
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : "group-hover:text-white/70"
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-blue-500/30 bg-[#0c1024]/95 p-1.5 backdrop-blur-2xl shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-white/[0.08] mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              Vos Boutiques ({stores.length})
            </span>
            <span className="text-[10px] text-blue-400 font-semibold">Changer</span>
          </div>

          {/* List of Stores */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {stores.map((s) => {
              const isSelected = s.id === activeStore?.id;
              const online = s.status === "published";
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectStore(s)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? "bg-blue-600/25 text-white font-bold border border-blue-500/40 shadow-sm"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        online ? "bg-emerald-400 shadow-[0_0_6px_#10b981]" : "bg-amber-400"
                      }`} 
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-[10px] text-white/40">
                        {s.slug || s.theme || "Boutique standard"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-1.5 border-t border-white/[0.08] pt-1.5 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/stores");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Gérer toutes mes boutiques</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/create-store");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Créer une nouvelle boutique</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
