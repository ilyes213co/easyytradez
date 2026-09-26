"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import ImageUploader, { UploadedImage } from "./ImageUploader";

// ─── Schema ───────────────────────────────────────────────────────────────────

const ProductSchema = z.object({
  name:           z.string().min(2, "Au moins 2 caractères").max(120),
  description:    z.string().max(1000).optional(),
  price:          z.number({ invalid_type_error: "Prix invalide" }).positive("Le prix doit être positif"),
  original_price: z.number().positive().optional().nullable(),
  category:       z.string().optional(),
  stock_quantity: z.number().int().min(0, "Stock invalide"),
  is_featured:    z.boolean(),
  status:         z.enum(["active", "draft", "archived"]),
  sku:            z.string().max(60).optional().nullable(),
}).refine(d => !d.original_price || d.original_price > d.price, {
  message: "Le prix barré doit être supérieur au prix de vente",
  path:    ["original_price"],
});

type ProductForm = z.infer<typeof ProductSchema>;

export interface ProductVariantItem {
  id: string;
  name: string;
  price?: number | null;
  stock?: number;
  sku?: string;
}

// ─── Product type system ─────────────────────────────────────────────────────────

type ProductType = "clothing" | "shoes" | "other";

const PRODUCT_TYPES: { value: ProductType; label: string; icon: string; desc: string }[] = [
  { value: "clothing", label: "Vêtement", icon: "👕", desc: "Haut, bas, robe, veste…" },
  { value: "shoes",    label: "Chaussure", icon: "👟", desc: "Pointures EU 36-46" },
  { value: "other",    label: "Autre produit", icon: "📦", desc: "Accessoire, électronique…" },
];

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const COLOR_PALETTE = [
  { label: "Noir",      hex: "#111111" },
  { label: "Blanc",     hex: "#FFFFFF" },
  { label: "Gris",      hex: "#9CA3AF" },
  { label: "Beige",     hex: "#D9C5A0" },
  { label: "Marron",    hex: "#92400E" },
  { label: "Rouge",     hex: "#EF4444" },
  { label: "Rose",      hex: "#F472B6" },
  { label: "Bordeaux",  hex: "#881337" },
  { label: "Orange",    hex: "#F97316" },
  { label: "Jaune",     hex: "#FACC15" },
  { label: "Vert",      hex: "#22C55E" },
  { label: "Kaki",      hex: "#6B7280" },
  { label: "Bleu",      hex: "#3B82F6" },
  { label: "Marine",    hex: "#1E3A5F" },
  { label: "Violet",    hex: "#A855F7" },
  { label: "Camel",     hex: "#C8956C" },
];


// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id?:            string;
  store_id:       string;
  name:           string;
  description?:   string;
  price:          number;
  original_price?: number | null;
  category?:      string;
  stock_quantity: number;
  images:         UploadedImage[];
  is_featured:    boolean;
  status:         "active" | "draft" | "archived";
  position?:      number;
  sku?:           string | null;
  variants?:      ProductVariantItem[];
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSave:    (product: Partial<Product>) => Promise<void>;
  product?:  Product | null;
  storeId:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Mode & Vêtements", "Électronique", "Alimentation", "Beauté & Cosmétiques",
  "Maison & Déco", "Sport & Fitness", "Enfants & Bébés", "Librairie",
  "Bijoux & Accessoires", "Artisanat", "Auto & Moto", "Autre",
];

const STATUS_OPTIONS = [
  { value: "active",   label: "Actif",    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "draft",    label: "Brouillon", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "archived", label: "Archivé",  color: "bg-white/5 text-white/40 border-white/10" },
] as const;

// ─── Field components ─────────────────────────────────────────────────────────

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all";
const labelCls = "block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductModal({ open, onClose, onSave, product, storeId }: Props) {
  const isEdit = Boolean(product?.id);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

  // Product type
  const [productType, setProductType] = useState<ProductType>("other");
  const [selectedSizes, setSelectedSizes]   = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);


  // Form state
  const [form, setForm] = useState<ProductForm>({
    name:           "",
    description:    "",
    price:          0,
    original_price: null,
    category:       "",
    stock_quantity: 0,
    is_featured:    false,
    status:         "active",
    sku:            "",
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [variants, setVariants] = useState<ProductVariantItem[]>([]);

  // Sync with product prop
  useEffect(() => {
    if (product) {
      setForm({
        name:           product.name,
        description:    product.description ?? "",
        price:          product.price,
        original_price: product.original_price ?? null,
        category:       product.category ?? "",
        stock_quantity: product.stock_quantity,
        is_featured:    product.is_featured,
        status:         product.status,
        sku:            product.sku ?? "",
      });
      setImages(product.images ?? []);
      setVariants(product.variants ?? []);
    } else {
      setForm({ name: "", description: "", price: 0, original_price: null, category: "", stock_quantity: 0, is_featured: false, status: "active", sku: "" });
      setImages([]);
      setVariants([]);
      setProductType("other");
      setSelectedSizes([]);
      setSelectedColors([]);
    }
    setErrors({});
  }, [product, open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = <K extends keyof ProductForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      setForm(prev => ({
        ...prev,
        [k]: ["price", "original_price", "stock_quantity"].includes(k)
          ? raw === "" ? (k === "original_price" ? null : 0) : Number(raw)
          : raw,
      }));
    };

  const addVariant = () => {
    const newId = `var_${Date.now()}`;
    setVariants(prev => [
      ...prev,
      { id: newId, name: `Variante ${prev.length + 1}`, price: null, stock: 5, sku: "" },
    ]);
  };

  const updateVariant = (id: string, field: keyof ProductVariantItem, value: any) => {
    setVariants(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleSave = async () => {
    // Build variants from type-aware attributes if needed
    let finalVariants = variants;

    if (productType === "clothing" && selectedSizes.length > 0) {
      // Merge sizes + colors into variant names
      if (selectedColors.length > 0) {
        finalVariants = selectedSizes.flatMap((size) =>
          selectedColors.map((color) => ({
            id: `${size}_${color}_${Date.now()}`,
            name: `${size} / ${color}`,
            price: null,
            stock: Math.max(1, Math.floor(form.stock_quantity / (selectedSizes.length * selectedColors.length))),
            sku: "",
          }))
        );
      } else {
        finalVariants = selectedSizes.map((size) => ({
          id: `${size}_${Date.now()}`,
          name: size,
          price: null,
          stock: Math.max(1, Math.floor(form.stock_quantity / selectedSizes.length)),
          sku: "",
        }));
      }
    } else if (productType === "shoes" && selectedSizes.length > 0) {
      if (selectedColors.length > 0) {
        finalVariants = selectedSizes.flatMap((size) =>
          selectedColors.map((color) => ({
            id: `${size}_${color}_${Date.now()}`,
            name: `${size} / ${color}`,
            price: null,
            stock: Math.max(1, Math.floor(form.stock_quantity / (selectedSizes.length * selectedColors.length))),
            sku: "",
          }))
        );
      } else {
        finalVariants = selectedSizes.map((size) => ({
          id: `size_${size}_${Date.now()}`,
          name: `Pointure ${size}`,
          price: null,
          stock: Math.max(1, Math.floor(form.stock_quantity / selectedSizes.length)),
          sku: "",
        }));
      }
    } else if (productType === "other" && selectedColors.length > 0 && variants.length === 0) {
      finalVariants = selectedColors.map((color) => ({
        id: `color_${color}_${Date.now()}`,
        name: color,
        price: null,
        stock: Math.max(1, Math.floor(form.stock_quantity / selectedColors.length)),
        sku: "",
      }));
    }

    // Validate
    const result = ProductSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => {
        const key = e.path[0] as string;
        fieldErrors[key] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave({
        ...result.data,
        sku: form.sku?.trim() || null,
        variants: finalVariants,
        images,
        store_id: storeId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleNewImages = (newImgs: UploadedImage[]) =>
    setImages(prev => [...prev, ...newImgs].slice(0, 5));

  const removeImage = (publicId: string) =>
    setImages(prev => prev.filter(img => img.public_id !== publicId));

  const discount = form.original_price && form.price
    ? Math.round(((form.original_price - form.price) / form.original_price) * 100)
    : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[95dvh] bg-[#0f0f1a] border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-sm">
              {isEdit ? "✏️" : "＋"}
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">{isEdit ? "Modifier le produit" : "Nouveau produit"}</h2>
              <p className="text-white/30 text-xs">{isEdit ? product?.name : "Remplissez les informations"}</p>
            </div>
          </div>

          {/* Status selector in header */}
          <div className="flex items-center gap-2">
            <select
              value={form.status}
              onChange={set("status")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none bg-transparent ${STATUS_OPTIONS.find(s => s.value === form.status)?.color}`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value} className="bg-[#0f0f1a] text-white">{s.label}</option>
              ))}
            </select>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all text-sm">✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Photos */}
          <div>
            <label className={labelCls}>Photos du produit <span className="text-white/25 normal-case tracking-normal">(max 5)</span></label>
            <ImageUploader
              maxFiles={5}
              existingImages={images}
              onUpload={handleNewImages}
              onRemove={removeImage}
              storeId={storeId}
            />
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Nom */}
          <Field label="Nom du produit *" error={errors.name}>
            <input className={inputCls} placeholder="Ex: Robe été fleurie taille M" value={form.name} onChange={set("name")} maxLength={120} />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              className={inputCls + " resize-none h-28"}
              placeholder="Décrivez votre produit : matière, taille, couleurs disponibles..."
              value={form.description}
              onChange={set("description")}
              maxLength={1000}
            />
            <p className="text-right text-xs text-white/20 mt-1">{form.description?.length ?? 0}/1000</p>
          </Field>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix de vente (DZD) *" error={errors.price}>
              <div className="relative">
                <input
                  className={inputCls + " pr-14"}
                  type="number"
                  min="0"
                  step="50"
                  placeholder="2500"
                  value={form.price || ""}
                  onChange={set("price")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">DZD</span>
              </div>
            </Field>

            <Field label="Prix barré (optionnel)" error={errors.original_price}>
              <div className="relative">
                <input
                  className={inputCls + " pr-14"}
                  type="number"
                  min="0"
                  step="50"
                  placeholder="3500"
                  value={form.original_price ?? ""}
                  onChange={set("original_price")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">DZD</span>
              </div>
              {discount && discount > 0 && (
                <p className="mt-1 text-xs text-emerald-400">🏷 -{discount}% de remise affiché</p>
              )}
            </Field>
          </div>

          {/* Catégorie + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Catégorie">
              <select className={inputCls + " appearance-none cursor-pointer"} value={form.category} onChange={set("category")}>
                <option value="">Sans catégorie</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0f0f1a]">{c}</option>)}
              </select>
            </Field>

            <Field label="Stock global" error={errors.stock_quantity}>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, stock_quantity: Math.max(0, p.stock_quantity - 1) }))}
                  className="h-[42px] w-10 bg-white/5 border border-white/10 rounded-l-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-light flex items-center justify-center"
                >−</button>
                <input
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={set("stock_quantity")}
                  className="h-[42px] flex-1 bg-white/5 border-y border-white/10 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:z-10 relative"
                />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, stock_quantity: p.stock_quantity + 1 }))}
                  className="h-[42px] w-10 bg-white/5 border border-white/10 rounded-r-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-light flex items-center justify-center"
                >＋</button>
              </div>
              {form.stock_quantity === 0 && (
                <p className="mt-1 text-xs text-amber-400">⚠ Affiché comme &quot;Épuisé&quot;</p>
              )}
            </Field>
          </div>

          {/* Code SKU / Référence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Code SKU / Référence">
              <input
                className={inputCls}
                placeholder="Ex: TSH-001"
                value={form.sku || ""}
                onChange={set("sku")}
                maxLength={60}
              />
            </Field>

            <div className="flex flex-col justify-end">
              <p className="text-[11px] text-white/40 pb-2">
                Le SKU vous aide à identifier rapidement vos articles lors de la préparation des commandes.
              </p>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ─── TYPE DE PRODUIT ─── */}
          <div className="space-y-3">
            <label className={labelCls}>Type de produit</label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setProductType(t.value);
                    setSelectedSizes([]);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    productType === t.value
                      ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                      : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80"
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-[10px] text-white/30 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>

            {/* Sizes for clothing */}
            {productType === "clothing" && (
              <div>
                <p className="text-[11px] text-white/40 mb-2">Tailles disponibles (cliquez pour sélectionner)</p>
                <div className="flex flex-wrap gap-2">
                  {CLOTHING_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setSelectedSizes((prev) =>
                          prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        selectedSizes.includes(size)
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes for shoes */}
            {productType === "shoes" && (
              <div>
                <p className="text-[11px] text-white/40 mb-2">Pointures disponibles (EU)</p>
                <div className="flex flex-wrap gap-2">
                  {SHOE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        setSelectedSizes((prev) =>
                          prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                        )
                      }
                      className={`w-10 h-10 rounded-lg border text-xs font-bold transition-all ${
                        selectedSizes.includes(size)
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors (available for all types) */}
            <div>
              <p className="text-[11px] text-white/40 mb-2">Couleurs disponibles (optionnel)</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onClick={() =>
                      setSelectedColors((prev) =>
                        prev.includes(c.label) ? prev.filter((x) => x !== c.label) : [...prev, c.label]
                      )
                    }
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColors.includes(c.label)
                        ? "border-indigo-400 scale-110 shadow-lg shadow-indigo-500/30"
                        : "border-white/10 hover:border-white/30 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              {selectedColors.length > 0 && (
                <p className="text-[11px] text-indigo-400 mt-1.5">
                  {selectedColors.join(", ")}
                </p>
              )}
            </div>

            {/* Summary of what will be created */}
            {(selectedSizes.length > 0 || selectedColors.length > 0) && (
              <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 px-4 py-3">
                <p className="text-xs text-indigo-300 font-medium">
                  ✨ {selectedSizes.length > 0 && selectedColors.length > 0
                    ? `${selectedSizes.length * selectedColors.length} variantes seront créées (${selectedSizes.length} tailles × ${selectedColors.length} couleurs)`
                    : selectedSizes.length > 0
                    ? `${selectedSizes.length} variante${selectedSizes.length > 1 ? "s" : ""} de taille seront créées`
                    : `${selectedColors.length} variante${selectedColors.length > 1 ? "s" : ""} de couleur seront créées`
                  }
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Manual variants (for "other" type) */}
          {productType === "other" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className={labelCls}>Variantes manuelles <span className="text-white/25 normal-case tracking-normal">({variants.length})</span></label>
                  <p className="text-[11px] text-white/40">Ajoutez des tailles, matières ou formats disponibles.</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-all"
                >
                  ＋ Ajouter
                </button>
              </div>
              {variants.length > 0 && (
                <div className="space-y-2.5">
                  {variants.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row gap-2.5 sm:items-center">
                      <div className="flex-1">
                        <input
                          className={inputCls + " py-1.5 text-xs"}
                          placeholder="Nom (ex: M / Noir)"
                          value={v.name}
                          onChange={(e) => updateVariant(v.id, "name", e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          className={inputCls + " py-1.5 text-xs"}
                          placeholder="Prix DZD"
                          value={v.price ?? ""}
                          onChange={(e) => updateVariant(v.id, "price", e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </div>
                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          min="0"
                          className={inputCls + " py-1.5 text-xs"}
                          placeholder="Stock"
                          value={v.stock ?? 0}
                          onChange={(e) => updateVariant(v.id, "stock", Math.max(0, Number(e.target.value) || 0))}
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <input
                          className={inputCls + " py-1.5 text-xs"}
                          placeholder="SKU"
                          value={v.sku ?? ""}
                          onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.id)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 self-end sm:self-center"
                        title="Supprimer la variante"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-white/[0.06]" />

          {/* En vedette */}
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm text-white/80 font-medium">Produit en vedette</p>
              <p className="text-xs text-white/35 mt-0.5">Affiché en premier sur votre vitrine</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, is_featured: !p.is_featured }))}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${form.is_featured ? "bg-indigo-500" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.is_featured ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.06] bg-[#0d0d17] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>{isEdit ? "✓ Enregistrer les modifications" : "＋ Créer le produit"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
