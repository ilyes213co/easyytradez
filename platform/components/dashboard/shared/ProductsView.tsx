"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import ProductModal, { Product } from "@/components/products/ProductModal";
import { toast } from "sonner";
import { 
  Package, Plus, Search, MoreVertical, Edit2, Trash2, 
  Copy, Star, RefreshCw, AlertTriangle, Layers, Store as StoreIcon
} from "lucide-react";
import type { Store } from "@/lib/supabase";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function apiFetch(path: string, opts?: RequestInit) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token ?? ""}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${errorText || res.statusText}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("apiFetch: non-JSON response:", text);
    return null;
  }
}

type StatusFilter = "all" | "active" | "draft" | "archived";

interface ProductsViewProps {
  type: "boutique" | "funnel";
}

function ProductCard({
  product,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFeatured,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onToggleFeatured: (id: string, val: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const img = product.images?.[0]?.url;
  const disc = product.original_price && product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <div className="group rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] hover:border-accent/40 dark:hover:border-accent/50 shadow-sm dark:shadow-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 relative">
      {/* Top Media Container */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-white/[0.03] overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-slate-300 dark:text-white/20 flex flex-col items-center gap-1.5">
            <Package className="w-8 h-8" />
            <span className="text-[11px] font-medium">Sans image</span>
          </div>
        )}

        {/* Featured Pill */}
        {product.is_featured && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-white" />
            <span>Vedette</span>
          </div>
        )}

        {/* Discount Badge */}
        {disc && disc > 0 && (
          <div className="absolute bottom-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            -{disc}%
          </div>
        )}

        {/* Action Dropdown Menu */}
        <div className="absolute top-2.5 right-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors shadow-sm"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-40 w-40 bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden p-1 text-xs animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(product); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-white/80 hover:text-accent dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-accent dark:text-sky" /> Modifier
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDuplicate(product); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-white/50" /> Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onToggleFeatured(product.id!, !product.is_featured); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-white/80 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Star className={`w-3.5 h-3.5 ${product.is_featured ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                  {product.is_featured ? "Retirer vedette" : "Mettre en vedette"}
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-white/10" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(product.id!); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[10px] font-semibold text-accent dark:text-sky-light uppercase tracking-wider font-mono">
            {product.category || "Général"}
          </span>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate mt-0.5" title={product.name}>
            {product.name}
          </h4>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-slate-900 dark:text-white text-base">
              {product.price.toLocaleString("fr-DZ")} DZD
            </span>
            {product.original_price && (
              <span className="text-xs text-slate-400 dark:text-white/40 line-through">
                {product.original_price.toLocaleString("fr-DZ")}
              </span>
            )}
          </div>

          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            product.stock_quantity === 0
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          }`}>
            {product.stock_quantity === 0 ? "Épuisé" : `${product.stock_quantity} en stock`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProductsView({ type }: ProductsViewProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Reset store and products immediately when switching between boutique and funnel
  useEffect(() => {
    setStoreId(null);
    setProducts([]);
    setStores([]);
  }, [type]);

  // Load stores matching current type
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .eq("type", type)
        .order("created_at");

      const stList = (data ?? []) as unknown as Store[];
      setStores(stList);
      if (stList.length > 0 && stList[0]) {
        // Sync with localStorage preference if available
        const saved = typeof window !== "undefined" ? localStorage.getItem(`active_store_${type}`) : null;
        if (saved && stList.some(s => s.id === saved)) {
          setStoreId(saved);
        } else {
          setStoreId(stList[0].id);
        }
      } else {
        setStoreId(null);
        setProducts([]);
      }
    });
  }, [supabase, type]);

  // Fetch products for selected storeId
  const { isLoading, refetch } = useQuery({
    queryKey: ["products", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const data = await apiFetch(`/products/?store_id=${storeId}`);
      const list = Array.isArray(data) ? (data as Product[]) : [];
      setProducts(list);
      return list;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (p: Partial<Product>) =>
      apiFetch("/products/", { method: "POST", body: JSON.stringify(p) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit ajouté avec succès");
      setModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message ?? "Erreur lors de l'ajout"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...patch }: Partial<Product> & { id: string }) =>
      apiFetch(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit mis à jour");
      setModalOpen(false);
      setEditProduct(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Erreur lors de la modification"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit supprimé");
      setDeleteTargetId(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Erreur de suppression"),
  });

  const handleSave = async (data: Partial<Product>) => {
    if (!storeId) return;
    if (editProduct?.id) {
      await updateMutation.mutateAsync({ ...data, id: editProduct.id, store_id: storeId });
    } else {
      await createMutation.mutateAsync({ ...data, store_id: storeId });
    }
  };

  const handleDuplicate = async (p: Product) => {
    if (!storeId) return;
    const { id, created_at, updated_at, ...rest } = p as any;
    try {
      await createMutation.mutateAsync({
        ...rest,
        name: `${p.name} (Copie)`,
        store_id: storeId,
      });
    } catch {
      // Handled by mutation onError
    }
  };

  const handleToggleFeatured = async (id: string, val: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, is_featured: val, store_id: storeId! });
    } catch {
      // Handled by mutation onError
    }
  };

  // Filtered products list
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    });
  }, [products, statusFilter, search]);

  const activeStore = stores.find((s) => s.id === storeId) || stores[0] || null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Produits {type === "funnel" ? "du Funnel" : "du Catalogue"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {stores.length > 1 && (
            <select
              value={storeId ?? ""}
              onChange={(e) => {
                setStoreId(e.target.value);
                localStorage.setItem(`active_store_${type}`, e.target.value);
              }}
              className="bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-white/80 focus:border-accent outline-none shadow-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setEditProduct(null);
              setModalOpen(true);
            }}
            disabled={!storeId}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau produit</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre ou catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#0c0d1e] border border-slate-200/90 dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:border-accent outline-none transition-colors shadow-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "Tous" },
            { id: "active", label: "Actifs" },
            { id: "draft", label: "Brouillons" },
            { id: "archived", label: "Archivés" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as StatusFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st.id
                  ? "bg-accent text-white shadow-sm"
                  : "bg-white dark:bg-white/[0.03] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/5"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center bg-white/50 dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-white/40 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Aucun {type === "funnel" ? "funnel" : "boutique"} trouvé
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/40 max-w-xs mx-auto mt-1 mb-4">
            Veuillez créer un {type === "funnel" ? "funnel" : "boutique"} avant de gérer vos produits.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-12 text-center bg-white/50 dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-white/40 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {search ? "Aucun produit ne correspond à votre recherche" : "Aucun produit dans ce catalogue"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/40 max-w-xs mx-auto mt-1 mb-4">
            {search ? "Essayez d'autres termes de recherche." : "Ajoutez votre premier produit pour lancer les ventes."}
          </p>
          <button
            onClick={() => {
              setEditProduct(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un produit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={(p) => {
                setEditProduct(p);
                setModalOpen(true);
              }}
              onDelete={(id) => setDeleteTargetId(id)}
              onDuplicate={handleDuplicate}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      )}

      {/* Product Modal */}
      {storeId && (
        <ProductModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditProduct(null);
          }}
          onSave={handleSave}
          product={editProduct}
          storeId={storeId}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Supprimer le produit ?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70">
              Cette action est irréversible et supprimera définitivement le produit du catalogue.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTargetId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
