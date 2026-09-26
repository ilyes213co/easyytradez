"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useAuth } from "@/components/auth/AuthProvider";
import dynamic from "next/dynamic";
import { storesApi, productsApi, api } from "@/lib/api";
import type { Product } from "@/components/products/ProductModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStores } from "@/hooks/use-stores";

const ProductModal = dynamic(() => import("@/components/products/ProductModal"), {
  ssr: false,
});

// ─── Types ──────────────────────────────────────────────────────────────────────

type Status = "active" | "draft" | "archived";
type SortKey = "position" | "name" | "price" | "stock" | "created_at";

const STATUS_BADGE: Record<Status, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  draft: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  archived: "bg-white/5 text-white/30 border border-white/10",
};

const STATUS_LABEL: Record<Status, string> = {
  active: "Actif",
  draft: "Brouillon",
  archived: "Archivé",
};

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden p-0">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2 opacity-50" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFeatured,
  isDragging,
}: {
  product: Product;
  index: number;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onToggleFeatured: (id: string, val: boolean) => void;
  isDragging: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const img = product.images?.[0]?.url;
  const disc = product.original_price && product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <div className={`relative bg-white/[0.03] border rounded-2xl overflow-hidden transition-all duration-200 group ${
      isDragging
        ? "border-blue-400/60 shadow-2xl shadow-indigo-500/20 scale-[1.02] rotate-1"
        : "border-white/[0.07] hover:border-white/15"
    }`}>
    {/* Image */}
    <div className="relative aspect-square bg-white/5 overflow-hidden">
      {img ? (
        <img src={img} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl text-white/10">📦</div>
      )}

      {/* Top badges */}
      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
        {disc && disc > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">-{disc}%</span>
        )}
        {product.is_featured && (
          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">⭐ Vedette</span>
        )}
        {product.stock_quantity === 0 ? (
          <span className="bg-white/20 backdrop-blur text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-none">Épuisé</span>
        ) : product.stock_quantity <= 3 ? (
          <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">Stock bas ({product.stock_quantity})</span>
        ) : null}
      </div>

      {/* Drag handle overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-2 text-white/60 text-xs cursor-grab active:cursor-grabbing">
          ⠿ Glisser
        </div>
      </div>

      {/* Status badge */}
      <div className="absolute bottom-2 right-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm ${STATUS_BADGE[product.status]}`}>
          {STATUS_LABEL[product.status]}
        </span>
      </div>
    </div>

    {/* Info */}
    <div className="p-3 space-y-2">
      <p className="text-white text-sm font-medium leading-tight line-clamp-2">{product.name}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {product.category && (
          <span className="text-white/35 text-xs">{product.category}</span>
        )}
        {product.sku && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
            {product.sku}
          </span>
        )}
        {product.variants && product.variants.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            {product.variants.length} var.
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-white font-bold text-base">{product.price.toLocaleString()} <span className="text-xs font-normal text-white/50">DZD</span></span>
        {product.original_price && (
          <span className="text-white/30 text-xs line-through">{product.original_price.toLocaleString()}</span>
        )}
      </div>

      {/* Stock bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-white/30">
          <span>Stock</span>
          <span className={product.stock_quantity === 0 ? "text-red-400" : product.stock_quantity < 5 ? "text-amber-400 font-semibold" : "text-white/50"}>
            {product.stock_quantity} {product.stock_quantity <= 3 && product.stock_quantity > 0 ? "⚠️" : ""}
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              product.stock_quantity === 0 ? "bg-red-500" :
              product.stock_quantity < 5 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, (product.stock_quantity / 50) * 100)}%` }}
          />
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1 pt-1">
        {/* Featured toggle */}
        <button
          onClick={() => onToggleFeatured(product.id!, !product.is_featured)}
          title={product.is_featured ? "Retirer de la vedette" : "Mettre en vedette"}
          className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
            product.is_featured
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60"
          }`}
        >
          ⭐
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(product)}
          className="flex-1 h-8 rounded-lg bg-white/5 hover:bg-blue-600/20 hover:text-blue-300 text-white/50 text-xs font-medium transition-all"
        >
          Modifier
        </button>

        {/* Kebab menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center transition-all text-sm"
          >
            ⋮
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full right-0 mb-1 z-20 bg-[#1a1a2e] border border-white/10 rounded-xl py-1 min-w-[140px] shadow-2xl">
                <button
                  onClick={() => { onDuplicate(product); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                >
                  <span>📋</span> Dupliquer
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <button
                  onClick={() => { onDelete(product.id!); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <span>🗑</span> Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// ─── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteDialog({ productName, onConfirm, onCancel }: { productName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f0f1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-4xl mb-3 text-center">🗑</div>
        <h3 className="text-white font-semibold text-center mb-2">Supprimer ce produit ?</h3>
        <p className="text-white/40 text-sm text-center mb-6">
          &quot;<strong className="text-white/60">{productName}</strong>&quot; sera définitivement supprimé.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium transition-all">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const router = useRouter();

  const [storeId, setStoreId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterCat, setFilterCat] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch current store using backend API (bypasses RLS recursion)
  const searchParams = useSearchParams();
  const storeIdFromUrl = searchParams.get("store");

  const { data: userStores = [], isLoading: isStoresLoading } = useStores();

  // Verify ownership or select default store
  useEffect(() => {
    if (!userStores) return;
    if (storeIdFromUrl) {
      const isOwner = userStores.some((s) => s.id === storeIdFromUrl);
      if (isOwner) {
        setStoreId(storeIdFromUrl);
        setAccessDenied(false);
      } else {
        setAccessDenied(true);
      }
    } else if (userStores.length > 0 && userStores[0]?.id) {
      setStoreId(userStores[0].id);
      setAccessDenied(false);
    }
  }, [userStores, storeIdFromUrl]);

  // Fetch products
  const { isLoading, data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const data = await productsApi.getByStore(storeId!);
      return data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit ajouté avec succès");
    },
    onError: (error: any) => {
      console.error("Create product error:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la création du produit");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; data: Partial<Product> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error("Update product error:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la mise à jour du produit");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      toast.success("Produit supprimé avec succès");
    },
    onError: (error: any) => {
      console.error("Delete product error:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la suppression du produit");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      api.patch("/products/reorder", { product_ids: productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
    onError: (error) => {
      console.error("Reorder products error:", error);
      toast.error("Erreur lors de la réorganisation des produits");
    },
  });

  // Save (create or update)
  const handleSave = async (data: Partial<Product>) => {
    if (!storeId) {
      toast.error("Boutique non chargée. Rafraîchissez la page.");
      return;
    }

    try {
      if (editProduct?.id) {
        await updateMutation.mutateAsync({ id: editProduct.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (err: any) {
      console.error("handleSave error:", err);
      throw err;
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    setDeleteTarget(null);
    // Optimistic removal via query cache
    queryClient.setQueryData<Product[]>(["products", storeId], (old) =>
      old?.filter((p) => p.id !== id)
    );
    await deleteMutation.mutateAsync(id);
  };

  // Duplicate
  const handleDuplicate = async (product: Product) => {
    const copy: Partial<Product> = {
      store_id: product.store_id,
      name: `${product.name} (copie)`,
      description: product.description,
      price: product.price,
      original_price: product.original_price,
      category: product.category,
      stock_quantity: product.stock_quantity,
      images: product.images,
      is_featured: false,
      status: "draft",
    };
    await createMutation.mutateAsync(copy);
  };

  // Toggle featured (optimistic)
  const handleToggleFeatured = async (id: string, val: boolean) => {
    // Optimistic update via query cache
    queryClient.setQueryData<Product[]>(["products", storeId], (old) =>
      old?.map((p) => (p.id === id ? { ...p, is_featured: val } : p))
    );
    try {
      await updateMutation.mutateAsync({ id, data: { is_featured: val } });
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData<Product[]>(["products", storeId], (old) =>
        old?.map((p) => (p.id === id ? { ...p, is_featured: !val } : p))
      );
      toast.error("Failed to update product featured status");
    }
  };

  // Drag and drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const reordered = Array.from(filtered);
    const [moved] = reordered.splice(result.source.index, 1);
    if (!moved) return;
    reordered.splice(result.destination.index, 0, moved);
    
    const reorderedIds = reordered.map((p) => p.id!);
    reorderMutation.mutate(reorderedIds);
  };

  // Open modal
  const openCreate = () => {
    if (!storeId) return;
    setEditProduct(null);
    setModalOpen(true);
  };
  
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setModalOpen(true);
  };

  // ── Filter + sort ────────────────────────────────────────────────────────
  
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  }, [products]);

  const filtered = useMemo(() => {
    return products
      .filter(p => {
        if (filterStatus !== "all" && p.status !== filterStatus) return false;
        if (filterCat && p.category !== filterCat) return false;
        if (debouncedSearch && !p.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") cmp = a.name.localeCompare(b.name);
        else if (sortKey === "price") cmp = a.price - b.price;
        else if (sortKey === "stock") cmp = a.stock_quantity - b.stock_quantity;
        else cmp = (a.position ?? 0) - (b.position ?? 0);
        return sortAsc ? cmp : -cmp;
      });
  }, [products, filterStatus, filterCat, debouncedSearch, sortKey, sortAsc]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === "active").length,
    drafts: products.filter(p => p.status === "draft").length,
    outStock: products.filter(p => p.stock_quantity === 0).length,
    lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 3).length,
  }), [products]);

  // ─────────────────────────────────────────────────────────────────────────

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-white font-semibold text-lg mb-2">
          Accès refusé à cette boutique
        </h3>
        <p className="text-white/40 text-sm mb-6 max-w-md">
          Vous n&apos;êtes pas le propriétaire de cette boutique. Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, vérifiez que vous êtes bien connecté avec le bon compte.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  if (!isStoresLoading && userStores && userStores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h3 className="text-white font-semibold text-lg mb-2">
          Aucune boutique trouvée
        </h3>
        <p className="text-white/40 text-sm mb-6 max-w-md">
          Vous devez d&apos;abord créer votre boutique avant de pouvoir gérer vos produits.
        </p>
        <button
          onClick={() => router.push("/dashboard/create-store")}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all"
        >
          Créer ma boutique
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">Produits</h1>
            <p className="text-white/40 text-sm mt-0.5">{stats.total} produit{stats.total !== 1 ? "s" : ""} au total</p>
          </div>
          {userStores && userStores.length > 1 && (
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-white/50 font-medium">Boutique :</span>
              <select
                value={storeId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setStoreId(val);
                  localStorage.setItem("active_store_id", val);
                  router.push(`/dashboard/products?store=${val}`);
                }}
                className="bg-transparent text-xs font-bold text-blue-400 outline-none cursor-pointer"
              >
                {userStores.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0c1024] text-white">
                    {s.name} ({s.status === "published" ? "En ligne" : "Brouillon"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={openCreate}
          disabled={!storeId}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 self-start sm:self-auto"
        >
          <span className="text-base leading-none">＋</span>
          Ajouter un produit
        </button>
      </div>

      {/* Low stock alert banner */}
      {stats.lowStock > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <span className="text-base">⚠️</span>
          <div className="flex-1">
            <span className="font-semibold">{stats.lowStock} produit{stats.lowStock > 1 ? "s ont" : " a"} un stock faible (3 unités ou moins).</span>{" "}
            Pensez à ajuster vos quantités pour éviter les ruptures lors des commandes.
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Actifs", value: stats.active, color: "text-emerald-400" },
          { label: "Brouillons", value: stats.drafts, color: "text-amber-400" },
          { label: "Épuisés", value: stats.outStock, color: "text-red-400" },
        ].map(k => (
          <div key={k.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
            <p className="text-white/40 text-xs">{k.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs">✕</button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer appearance-none"
        >
          <option value="all" className="bg-[#0f0f1a]">Tous les statuts</option>
          <option value="active" className="bg-[#0f0f1a]">Actifs</option>
          <option value="draft" className="bg-[#0f0f1a]">Brouillons</option>
          <option value="archived" className="bg-[#0f0f1a]">Archivés</option>
        </select>

        {/* Category filter */}
        {categories.length > 0 && (
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer appearance-none"
          >
            <option value="" className="bg-[#0f0f1a]">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c} className="bg-[#0f0f1a]">{c}</option>)}
          </select>
        )}

        {/* Sort */}
        <select
          value={`${sortKey}:${sortAsc ? "asc" : "desc"}`}
          onChange={e => {
            const [k, d] = e.target.value.split(":");
            setSortKey(k as SortKey);
            setSortAsc(d === "asc");
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 cursor-pointer appearance-none"
        >
          <option value="position:asc" className="bg-[#0f0f1a]">Ordre manuel</option>
          <option value="name:asc" className="bg-[#0f0f1a]">Nom A→Z</option>
          <option value="name:desc" className="bg-[#0f0f1a]">Nom Z→A</option>
          <option value="price:asc" className="bg-[#0f0f1a]">Prix croissant</option>
          <option value="price:desc" className="bg-[#0f0f1a]">Prix décroissant</option>
          <option value="stock:asc" className="bg-[#0f0f1a]">Stock faible</option>
        </select>

        {/* View toggle */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {(["grid", "list"] as const).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === v ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {v === "grid" ? "⊞ Grille" : "☰ Liste"}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(search || filterStatus !== "all" || filterCat) && (
        <p className="text-white/40 text-sm">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          {search && <> pour &quot;<span className="text-white/70">{search}</span>&quot;</>}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            {search || filterStatus !== "all" || filterCat ? "Aucun résultat" : "Aucun produit"}
          </h3>
          <p className="text-white/40 text-sm mb-6">
            {search || filterStatus !== "all" || filterCat
              ? "Essayez d'autres filtres"
              : "Ajoutez votre premier produit pour commencer"}
          </p>
          {!search && filterStatus === "all" && !filterCat && (
            <button
              onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all"
            >
              ＋ Ajouter un produit
            </button>
          )}
        </div>
      )}

      {/* Grid with DnD */}
      {!isLoading && filtered.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="products" direction={viewMode === "grid" ? "horizontal" : "vertical"}>
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {filtered.map((product, index) => (
                  <Draggable key={product.id} draggableId={product.id!} index={index}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                      >
                        {viewMode === "grid" ? (
                          <ProductCard
                            product={product}
                            index={index}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                            onToggleFeatured={handleToggleFeatured}
                            isDragging={snapshot.isDragging}
                          />
                        ) : (
                          /* List row */
                          <div className={`flex items-center gap-4 bg-white/[0.03] border rounded-xl px-4 py-3 transition-all ${snapshot.isDragging ? "border-blue-400/60 shadow-xl" : "border-white/[0.07] hover:border-white/15"}`}>
                            <div className="text-white/20 cursor-grab text-lg">⠿</div>
                            <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0">
                              {product.images?.[0]?.url
                                ? <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{product.name}</p>
                              <p className="text-white/35 text-xs">{product.category || "—"}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-white text-sm font-bold">{product.price.toLocaleString()} DZD</p>
                              {product.original_price && <p className="text-white/30 text-xs line-through">{product.original_price.toLocaleString()}</p>}
                            </div>
                            <div className="text-center shrink-0 w-12">
                              <p className={`text-sm font-bold ${product.stock_quantity === 0 ? "text-red-400" : product.stock_quantity < 5 ? "text-amber-400" : "text-white/60"}`}>
                                {product.stock_quantity}
                              </p>
                              <p className="text-white/25 text-[10px]">stock</p>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-1 rounded-full border shrink-0 ${STATUS_BADGE[product.status]}`}>
                              {STATUS_LABEL[product.status]}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEdit(product)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 hover:text-blue-300 text-white/50 text-xs transition-all">Modifier</button>
                              <button onClick={() => setDeleteTarget(product)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/15 hover:text-red-400 text-white/30 flex items-center justify-center text-sm transition-all">🗑</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Modals */}
      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        product={editProduct}
        storeId={storeId ?? ""}
      />

      {deleteTarget && (
        <DeleteDialog
          productName={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget.id!)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}