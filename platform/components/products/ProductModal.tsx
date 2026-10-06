"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import ImageUploader, { UploadedImage } from "./ImageUploader";
import type { ProductOption, ProductOptionValue } from "@/types/product";

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
}).refine(d => !d.original_price || d.original_price > d.price, {
  message: "Le prix barré doit être supérieur au prix de vente",
  path:    ["original_price"],
});

type ProductForm = z.infer<typeof ProductSchema>;

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
  options?:       ProductOption[];
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
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);

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
      });
      setImages(product.images ?? []);
      setOptions(Array.isArray(product.options) ? product.options : []);
    } else {
      setForm({ name: "", description: "", price: 0, original_price: null, category: "", stock_quantity: 0, is_featured: false, status: "active" });
      setImages([]);
      setOptions([]);
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

  // ─── Dynamic Options Handlers ───────────────────────────────────────────────
  const addOption = () => {
    setOptions(prev => [
      ...prev,
      {
        name: "",
        type: "chip",
        values: [{ label: "", hex: "#3b82f6", available: true }],
      },
    ]);
  };

  const removeOption = (optIndex: number) => {
    setOptions(prev => prev.filter((_, idx) => idx !== optIndex));
  };

  const updateOptionName = (optIndex: number, name: string) => {
    setOptions(prev => {
      const next = [...prev];
      const curr = next[optIndex];
      if (curr) {
        next[optIndex] = { ...curr, name };
      }
      return next;
    });
  };

  const updateOptionType = (optIndex: number, type: "swatch" | "chip") => {
    setOptions(prev => {
      const next = [...prev];
      const curr = next[optIndex];
      if (curr) {
        next[optIndex] = { ...curr, type };
      }
      return next;
    });
  };

  const addOptionValue = (optIndex: number) => {
    setOptions(prev => {
      const next = [...prev];
      const curr = next[optIndex];
      if (curr) {
        next[optIndex] = {
          ...curr,
          values: [
            ...curr.values,
            { label: "", hex: "#3b82f6", available: true },
          ],
        };
      }
      return next;
    });
  };

  const removeOptionValue = (optIndex: number, valIndex: number) => {
    setOptions(prev => {
      const next = [...prev];
      const curr = next[optIndex];
      if (curr) {
        next[optIndex] = {
          ...curr,
          values: curr.values.filter((_, idx) => idx !== valIndex),
        };
      }
      return next;
    });
  };

  const updateOptionValue = (
    optIndex: number,
    valIndex: number,
    field: keyof ProductOptionValue,
    value: any
  ) => {
    setOptions(prev => {
      const next = [...prev];
      const curr = next[optIndex];
      if (curr && curr.values[valIndex]) {
        const nextVals = [...curr.values];
        const val = nextVals[valIndex];
        if (val) {
          nextVals[valIndex] = { ...val, [field]: value } as ProductOptionValue;
          next[optIndex] = { ...curr, values: nextVals };
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
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
      // Nettoyer les options vides avant d'enregistrer
      const cleanedOptions = options
        .filter(opt => opt.name.trim().length > 0)
        .map(opt => ({
          ...opt,
          name: opt.name.trim(),
          values: opt.values.filter(v => v.label.trim().length > 0).map(v => ({
            ...v,
            label: v.label.trim(),
          })),
        }))
        .filter(opt => opt.values.length > 0);

      await onSave({
        ...result.data,
        images,
        options: cleanedOptions,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d17] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEdit ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              {isEdit ? "Modifiez les informations de votre produit" : "Remplissez les détails pour publier un article"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">

          {/* Statut */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 mr-1">Statut :</span>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, status: s.value }))}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  form.status === s.value ? s.color + " border-current font-semibold" : "bg-white/5 text-white/30 border-transparent hover:text-white/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Images */}
          <div>
            <label className={labelCls}>Photos du produit (max 5)</label>
            <ImageUploader
              existingImages={images}
              onUpload={handleNewImages}
              onRemove={removeImage}
              maxFiles={5}
              storeId={storeId}
            />
          </div>

          {/* Nom */}
          <Field label="Nom du produit *" error={errors.name}>
            <input
              className={inputCls}
              type="text"
              placeholder="Ex: Coffret Rose d'Atlas, Baskets Apex 01..."
              value={form.name}
              onChange={set("name")}
              maxLength={120}
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              className={inputCls + " resize-none h-24"}
              placeholder="Décrivez votre produit : matières, bienfaits, conseils d'utilisation..."
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

            <Field label="Stock" error={errors.stock_quantity}>
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

          {/* ─── OPTIONS DYNAMIQUES DU PRODUIT (LIBRE ET NON FIGÉ PAR CATÉGORIE) ─── */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/90">Options &amp; Variantes du produit</p>
                <p className="text-xs text-white/40 mt-0.5">
                  Nommez librement vos options (ex: Couleur, Format, Pointure, Contenance...)
                </p>
              </div>
              <button
                type="button"
                onClick={addOption}
                className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>＋</span> Ajouter une option
              </button>
            </div>

            {options.length === 0 ? (
              <p className="text-xs text-white/30 italic py-2">
                Aucune option définie. Cliquez sur &quot;Ajouter une option&quot; pour proposer des choix aux clients (pastilles de couleur ou boutons).
              </p>
            ) : (
              <div className="space-y-4">
                {options.map((opt, optIdx) => (
                  <div key={optIdx} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Nom de l'option */}
                      <div className="flex-1">
                        <input
                          type="text"
                          className={inputCls}
                          placeholder="Nom de l'option (ex: Couleur, Taille, Parfum...)"
                          value={opt.name}
                          onChange={(e) => updateOptionName(optIdx, e.target.value)}
                        />
                      </div>

                      {/* Select Type : swatch ou chip */}
                      <div className="w-44">
                        <select
                          className={inputCls + " appearance-none cursor-pointer"}
                          value={opt.type}
                          onChange={(e) => updateOptionType(optIdx, e.target.value as "swatch" | "chip")}
                        >
                          <option value="chip" className="bg-[#0f0f1a]">Bouton texte (Chip)</option>
                          <option value="swatch" className="bg-[#0f0f1a]">Pastille couleur (Swatch)</option>
                        </select>
                      </div>

                      {/* Supprimer l'option */}
                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="text-white/40 hover:text-red-400 p-2 text-xs transition-colors"
                        title="Supprimer cette option"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Liste dynamique de valeurs */}
                    <div className="pl-2 space-y-2 border-l-2 border-indigo-500/30">
                      <p className="text-xs text-white/40 font-medium">Valeurs possibles :</p>
                      {opt.values.map((val, valIdx) => (
                        <div key={valIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            className={inputCls + " flex-1 py-1.5 text-xs"}
                            placeholder={opt.type === "swatch" ? "Nom couleur (ex: Noir, Rose...)" : "Valeur (ex: 42, 100ml, XL...)"}
                            value={val.label}
                            onChange={(e) => updateOptionValue(optIdx, valIdx, "label", e.target.value)}
                          />

                          {opt.type === "swatch" && (
                            <div className="flex items-center gap-1.5 shrink-0 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                              <input
                                type="color"
                                value={val.hex || "#3b82f6"}
                                onChange={(e) => updateOptionValue(optIdx, valIdx, "hex", e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                              />
                              <span className="text-[11px] text-white/40 font-mono">{val.hex || "#3b82f6"}</span>
                            </div>
                          )}

                          <label className="flex items-center gap-1 text-[11px] text-white/50 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={val.available}
                              onChange={(e) => updateOptionValue(optIdx, valIdx, "available", e.target.checked)}
                              className="rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0"
                            />
                            Dispo
                          </label>

                          <button
                            type="button"
                            onClick={() => removeOptionValue(optIdx, valIdx)}
                            className="text-white/30 hover:text-red-400 p-1 text-xs"
                            title="Retirer cette valeur"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOptionValue(optIdx)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-1 flex items-center gap-1"
                      >
                        ＋ Ajouter une valeur
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
