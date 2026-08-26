"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProductDrawer } from "@/components/products/ProductDrawer";
import type { Product, Store } from "@/lib/supabase";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:   { label: "Actif",    color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25", dot: "bg-emerald-400" },
  draft:    { label: "Brouillon", color: "text-amber-400",  bg: "bg-amber-500/15 border-amber-500/25",    dot: "bg-amber-400"   },
  archived: { label: "Archivé",  color: "text-white/30",   bg: "bg-white/5 border-white/10",             dot: "bg-white/25"    },
};

type StatusFilter = "all" | "active" | "draft" | "archived";
type ViewMode = "grid" | "table";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Product["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-2xl mb-4">
        📦
      </div>
      <h3 className="text-sm font-semibold text-white/70 mb-1">Aucun produit pour l&apos;instant</h3>
      <p className="text-xs text-white/30 mb-5">Ajoutez votre premier produit pour commencer à vendre.</p>
      <button onClick={onAdd}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-all"
        style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un produit
      </button>
    </div>
  );
}

// ─── Product Card (grid) ──────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onToggle: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onDelete: (p: Product) => void;
}

function ProductCard({ product, onEdit, onToggle, onDuplicate, onDelete }: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasDiscount = product.compare_price && product.compare_price > product.price;

  return (
    <div
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all overflow-hidden cursor-pointer"
      onClick={() => onEdit(product)}
    >
      {/* Image */}
      <div className="aspect-square bg-white/[0.03] relative overflow-hidden">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-white/10">📦</div>
        )}
        {/* Image count */}
        {product.images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 backdrop-blur-sm px-2 py-0.5 text-xs text-white/60">
            +{product.images.length - 1}
          </span>
        )}
        {/* Discount tag */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-lg bg-red-500/90 px-2 py-0.5 text-xs font-bold text-white">
            -{Math.round((1 - product.price / product.compare_price!) * 100)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-white/85 leading-snug line-clamp-2 flex-1">
            {product.name}
          </h3>
          {/* 3-dot menu */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-white/20 hover:text-white/60 transition-colors p-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <DropMenu product={product} onToggle={onToggle} onDuplicate={onDuplicate}
                  onDelete={onDelete} onClose={() => setMenuOpen(false)} />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-white">{product.price.toLocaleString()} DZD</span>
          {hasDiscount && (
            <span className="text-xs text-white/30 line-through">{product.compare_price?.toLocaleString()}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={product.status} />
          <span className={`text-xs ${product.stock === 0 ? "text-red-400" : "text-white/30"}`}>
            {product.stock === 0 ? "Épuisé" : `${product.stock} en stock`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Drop menu ────────────────────────────────────────────────────────────────

function DropMenu({ product, onToggle, onDuplicate, onDelete, onClose }: {
  product: Product; onToggle: (p: Product) => void;
  onDuplicate: (p: Product) => void; onDelete: (p: Product) => void; onClose: () => void;
}) {
  const action = (fn: () => void) => { fn(); onClose(); };

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-white/10 bg-[#161624] shadow-2xl overflow-hidden">
      <button onClick={() => action(() => onToggle(product))}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors text-left"
      >
        {product.status === "active" ? (
          <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64A9 9 0 015.64 19.36M6.16 6.16a9 9 0 0112.69 12.69M1 1l22 22"/></svg>Désactiver</>
        ) : (
          <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Activer</>
        )}
      </button>
      <button onClick={() => action(() => onDuplicate(product))}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors text-left"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        Dupliquer
      </button>
      <div className="h-px bg-white/[0.06]" />
      <button onClick={() => action(() => onDelete(product))}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        Supprimer
      </button>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function TableRow({ product, onEdit, onToggle, onDuplicate, onDelete }: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr
      className="border-b border-white/[0.05] hover:bg-white/[0.025] transition-colors cursor-pointer"
      onClick={() => onEdit(product)}
    >
      {/* Product */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85 truncate max-w-[200px]">{product.name}</p>
            {product.category && <p className="text-xs text-white/30">{product.category}</p>}
          </div>
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3"><StatusBadge status={product.status} /></td>
      {/* Price */}
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-white">{product.price.toLocaleString()} DZD</span>
        {product.compare_price && (
          <span className="ml-2 text-xs text-white/25 line-through">{product.compare_price.toLocaleString()}</span>
        )}
      </td>
      {/* Stock */}
      <td className="px-4 py-3">
        <span className={`text-sm font-medium ${product.stock === 0 ? "text-red-400" : "text-white/60"}`}>
          {product.stock}
        </span>
      </td>
      {/* Date */}
      <td className="px-4 py-3 text-xs text-white/25">
        {new Date(product.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </td>
      {/* Actions */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex justify-end">
          <button onClick={() => setMenuOpen((v) => !v)}
            className="text-white/20 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <DropMenu product={product} onToggle={onToggle} onDuplicate={onDuplicate}
                onDelete={onDelete} onClose={() => setMenuOpen(false)} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ product, onConfirm, onCancel }: {
  product: Product; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0f0f18] p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4">
          <svg className="text-red-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">Supprimer ce produit ?</h3>
        <p className="text-xs text-white/40 mb-5 leading-relaxed">
          <span className="text-white/70">{product.name}</span> sera définitivement supprimé. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
          >Annuler</button>
          <button onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500/90 hover:bg-red-500 py-2.5 text-sm font-semibold text-white transition-all"
          >Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [store, setStore]       = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch]     = useState("");
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // ── Load store + products ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: storeData } = await supabase
      .from("stores").select("*").eq("owner_id", user.id).single();
    setStore(storeData);

    if (storeData) {
      const { data: prods } = await supabase
        .from("products").select("*").eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      setProducts(prods ?? []);
    }

    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const openCreate = () => { setEditProduct(null); setDrawerOpen(true); };
  const openEdit   = (p: Product) => { setEditProduct(p); setDrawerOpen(true); };

  const handleToggle = async (p: Product) => {
    const next = p.status === "active" ? "draft" : "active";
    await supabase.from("products").update({ status: next }).eq("id", p.id);
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x));
  };

  const handleDuplicate = async (p: Product) => {
    if (!store) return;
    const { id, created_at, updated_at, ...rest } = p;
    void id; void created_at; void updated_at;
    const { data } = await supabase.from("products")
      .insert({ ...rest, name: `${p.name} (copie)`, slug: `${p.slug}-copie-${Date.now()}`, status: "draft" })
      .select().single();
    if (data) setProducts((prev) => [data, ...prev]);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("products").delete().eq("id", deleteTarget.id);
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  // ── Stats bar ─────────────────────────────────────────────────────────────
  const stats = {
    total:    products.length,
    active:   products.filter((p) => p.status === "active").length,
    draft:    products.filter((p) => p.status === "draft").length,
    outstock: products.filter((p) => p.stock === 0).length,
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Produits
          </h1>
          <p className="text-sm text-white/35 mt-0.5">
            {stats.total} produit{stats.total !== 1 ? "s" : ""} · {stats.active} actif{stats.active !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-all shrink-0"
          style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau produit
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,    icon: "📦", color: "text-white/70" },
          { label: "Actifs",    value: stats.active,   icon: "✅", color: "text-emerald-400" },
          { label: "Brouillons",value: stats.draft,    icon: "📝", color: "text-amber-400" },
          { label: "Épuisés",   value: stats.outstock, icon: "⚠️", color: "text-red-400" },
        ].map((s) => (
          <div key={s.label}
            className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"
          >
            <p className="text-lg mb-0.5">{s.icon}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 gap-0.5">
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-white/[0.08] text-white"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button onClick={() => setView("grid")}
            className={`rounded-lg p-1.5 transition-all ${view === "grid" ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button onClick={() => setView("table")}
            className={`rounded-lg p-1.5 transition-all ${view === "table" ? "bg-white/[0.08] text-white" : "text-white/30 hover:text-white/60"}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/30 gap-3">
          <Spinner /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        products.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-white/40 mb-2">Aucun produit ne correspond à votre recherche.</p>
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >Réinitialiser les filtres</button>
          </div>
        )
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p}
              onEdit={openEdit} onToggle={handleToggle}
              onDuplicate={handleDuplicate} onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Produit", "Statut", "Prix", "Stock", "Date", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <TableRow key={p.id} product={p}
                  onEdit={openEdit} onToggle={handleToggle}
                  onDuplicate={handleDuplicate} onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {store && (
        <ProductDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          storeId={store.id}
          product={editProduct}
          onSaved={loadData}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
