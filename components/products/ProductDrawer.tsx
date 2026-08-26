"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ProductGallery } from "@/components/ui/ProductGallery";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Product } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  compare_price: string;
  stock: string;
  category: string;
  tags: string;
  status: "active" | "draft" | "archived";
  images: string[]; // existing URLs
}

interface ProductDrawerProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  product?: Product | null; // null = create mode
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10";

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-white/45 mb-1.5 uppercase tracking-wider">
      {children}
      {optional && <span className="normal-case tracking-normal text-white/20 font-normal">optionnel</span>}
    </label>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Image upload zone ────────────────────────────────────────────────────────

interface ImageUploaderProps {
  storeId: string;
  existingUrls: string[];
  onChange: (urls: string[]) => void;
}

function ImageUploader({ storeId, existingUrls, onChange }: ImageUploaderProps) {
  const supabase = getSupabaseBrowserClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    const newUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 8 * 1024 * 1024) continue;
      const ext = file.name.split(".").pop();
      const path = `${storeId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (!error) {
        const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }

    onChange([...existingUrls, ...newUrls]);
    setUploading(false);
  };

  const removeUrl = (url: string) => onChange(existingUrls.filter((u) => u !== url));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="space-y-3">
      {/* Existing images */}
      {existingUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingUrls.map((url, i) => (
            <div key={url} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="w-20 h-20 object-cover rounded-xl ring-1 ring-white/10"
              />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded-md">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs items-center justify-center hidden group-hover:flex transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-6",
          dragging
            ? "border-indigo-500/60 bg-indigo-500/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
        ].join(" ")}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Spinner /> Upload en cours…
          </div>
        ) : (
          <>
            <svg className="text-white/20" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p className="text-xs text-white/40">
              <span className="text-indigo-400">Cliquez</span> ou glissez des images
            </p>
            <p className="text-xs text-white/20">PNG, JPG, WEBP · max 8 Mo · plusieurs fichiers</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => e.target.files && uploadFiles(Array.from(e.target.files))}
        className="hidden"
      />
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

const DEFAULT_FORM: ProductFormData = {
  name: "", description: "", price: "", compare_price: "",
  stock: "0", category: "", tags: "", status: "draft", images: [],
};

export function ProductDrawer({ open, onClose, storeId, product, onSaved }: ProductDrawerProps) {
  const supabase = getSupabaseBrowserClient();
  const isEdit = !!product;

  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form on edit
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description ?? "",
        price: String(product.price),
        compare_price: product.compare_price ? String(product.compare_price) : "",
        stock: String(product.stock),
        category: product.category ?? "",
        tags: product.tags.join(", "),
        status: product.status,
        images: product.images,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  }, [product, open]);

  const set = useCallback(
    (key: keyof ProductFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    []
  );

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Le nom du produit est requis."); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError("Le prix est invalide."); return;
    }

    setSaving(true);

    const payload = {
      store_id: storeId,
      name: form.name.trim(),
      slug: slugify(form.name),
      description: form.description.trim() || null,
      price: Number(form.price),
      compare_price: form.compare_price ? Number(form.compare_price) : null,
      stock: Math.max(0, parseInt(form.stock) || 0),
      category: form.category.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
      images: form.images,
    };

    let dbError;
    if (isEdit && product) {
      ({ error: dbError } = await supabase.from("products").update(payload).eq("id", product.id));
    } else {
      ({ error: dbError } = await supabase.from("products").insert(payload));
    }

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }

    onSaved();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#0f0f18] border-l border-white/[0.08] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.07] shrink-0">
          <h2 className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {isEdit ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <select
              value={form.status}
              onChange={set("status")}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/70 outline-none cursor-pointer"
            >
              <option value="draft" className="bg-[#1a1a2e]">📝 Brouillon</option>
              <option value="active" className="bg-[#1a1a2e]">✅ Actif</option>
              <option value="archived" className="bg-[#1a1a2e]">📦 Archivé</option>
            </select>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors ml-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Images */}
          <div>
            <Label>Photos du produit</Label>
            {/* Gallery preview when images exist */}
            {form.images.length > 0 && (
              <div className="mb-3">
                <ProductGallery images={form.images} alt="Aperçu produit" compact />
              </div>
            )}
            <ImageUploader
              storeId={storeId}
              existingUrls={form.images}
              onChange={(urls) => setForm((p) => ({ ...p, images: urls }))}
            />
          </div>

          <div className="h-px bg-white/[0.05]" />

          {/* Name */}
          <div>
            <Label>Nom du produit</Label>
            <input type="text" value={form.name} onChange={set("name")}
              placeholder="Ex : Robe Kabyle Brodée" className={inputClass} />
          </div>

          {/* Description */}
          <div>
            <Label optional>Description</Label>
            <textarea
              value={form.description} onChange={set("description") as React.ChangeEventHandler<HTMLTextAreaElement>}
              placeholder="Décrivez votre produit en quelques mots…"
              rows={3}
              className={inputClass + " resize-none leading-relaxed"}
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prix de vente</Label>
              <div className="relative">
                <input type="number" min="0" step="0.01" value={form.price} onChange={set("price")}
                  placeholder="0.00" className={inputClass + " pr-14"} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/25">
                  DZD
                </span>
              </div>
            </div>
            <div>
              <Label optional>Prix barré</Label>
              <div className="relative">
                <input type="number" min="0" step="0.01" value={form.compare_price} onChange={set("compare_price")}
                  placeholder="0.00" className={inputClass + " pr-14"} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/25">
                  DZD
                </span>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div>
            <Label>Stock disponible</Label>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setForm((p) => ({ ...p, stock: String(Math.max(0, parseInt(p.stock || "0") - 1)) }))}
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center text-lg font-light"
              >−</button>
              <input type="number" min="0" value={form.stock} onChange={set("stock")}
                className={inputClass + " text-center"} />
              <button type="button"
                onClick={() => setForm((p) => ({ ...p, stock: String(parseInt(p.stock || "0") + 1) }))}
                className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-all flex items-center justify-center text-lg font-light"
              >+</button>
            </div>
            {parseInt(form.stock) === 0 && (
              <p className="mt-1.5 text-xs text-amber-400">⚠ Stock à 0 — le produit apparaîtra comme épuisé.</p>
            )}
          </div>

          {/* Category + Tags */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label optional>Catégorie</Label>
              <input type="text" value={form.category} onChange={set("category")}
                placeholder="Vêtements, Bijoux…" className={inputClass} />
            </div>
            <div>
              <Label optional>Tags</Label>
              <input type="text" value={form.tags} onChange={set("tags")}
                placeholder="promo, nouveau, été" className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-white/20 -mt-2">Séparez les tags par des virgules</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.07] shrink-0 space-y-3">
          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
            >
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
            >
              {saving ? <><Spinner /> Enregistrement…</> : isEdit ? "Mettre à jour" : "Créer le produit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
