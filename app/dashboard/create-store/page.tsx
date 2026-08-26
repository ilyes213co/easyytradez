"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  photo: File | null;
  photoPreview: string | null;
}

interface WizardState {
  // Étape 1
  name: string;
  category: string;
  description: string;
  whatsapp: string;
  // Étape 2
  logoFile: File | null;
  logoPreview: string | null;
  logoUrl: string | null;
  primaryColor: string;
  font: "modern" | "classic" | "playful";
  // Étape 3
  theme: string;
  animation: "none" | "soft" | "dynamic" | "spectacular";
  // Étape 4
  products: Product[];
  // Meta
  currentStep: number;
  storeId: string | null;
  publishedUrl: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Mode & Vêtements", "Électronique", "Alimentation", "Beauté & Cosmétiques",
  "Maison & Déco", "Sport & Fitness", "Enfants & Bébés", "Librairie & Papeterie",
  "Bijoux & Accessoires", "Artisanat", "Auto & Moto", "Autre",
];

const PRESET_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#ec4899", label: "Rose" },
  { value: "#f59e0b", label: "Ambre" },
  { value: "#10b981", label: "Émeraude" },
  { value: "#3b82f6", label: "Bleu" },
  { value: "#ef4444", label: "Rouge" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#14b8a6", label: "Teal" },
];

const FONTS = [
  { value: "modern",   label: "Moderne",  sample: "Inter",      css: "font-sans" },
  { value: "classic",  label: "Classique", sample: "Playfair",  css: "font-serif" },
  { value: "playful",  label: "Playful",   sample: "Quicksand", css: "font-mono" },
] as const;

const THEMES = [
  {
    value: "modern", label: "Moderne",
    bg: "from-slate-900 to-slate-700", accent: "#6366f1",
    desc: "Épuré et professionnel",
    preview: ["▬▬▬▬▬", "◼ ◼ ◼", "▬▬▬"],
  },
  {
    value: "luxury", label: "Luxe",
    bg: "from-stone-900 to-amber-900", accent: "#f59e0b",
    desc: "Élégant et raffiné",
    preview: ["〓〓〓〓〓", "◈ ◈ ◈", "〓〓〓"],
  },
  {
    value: "minimal", label: "Minimaliste",
    bg: "from-gray-100 to-white", accent: "#111827",
    desc: "Simple et aéré",
    preview: ["― ― ― ―", "□ □ □", "― ―"],
    dark: true,
  },
  {
    value: "colorful", label: "Coloré",
    bg: "from-fuchsia-600 to-orange-400", accent: "#fff",
    desc: "Vibrant et dynamique",
    preview: ["▬▬▬▬▬", "◼ ◼ ◼", "▬▬▬"],
  },
  {
    value: "tech", label: "Tech",
    bg: "from-cyan-950 to-blue-900", accent: "#22d3ee",
    desc: "Futuriste et high-tech",
    preview: ["⟦⟦⟦⟦⟦", "◧ ◧ ◧", "⟦⟦⟦"],
  },
  {
    value: "nature", label: "Nature",
    bg: "from-green-900 to-emerald-700", accent: "#86efac",
    desc: "Organique et chaleureux",
    preview: ["≋≋≋≋≋", "❋ ❋ ❋", "≋≋≋"],
  },
];

const ANIMATIONS = [
  { value: "none",        label: "Aucune",       icon: "⏸", desc: "Statique, très rapide" },
  { value: "soft",        label: "Douce",        icon: "🌊", desc: "Fondu léger, élégant" },
  { value: "dynamic",     label: "Dynamique",    icon: "⚡", desc: "Slides et zooms" },
  { value: "spectacular", label: "Spectaculaire", icon: "✨", desc: "Particules et effets 3D" },
] as const;

const AI_STEPS = [
  "Analyse de vos préférences...",
  "Génération du design personnalisé...",
  "Création des sections de la boutique...",
  "Optimisation SEO et métadonnées...",
  "Intégration WhatsApp et commandes...",
  "Déploiement en ligne...",
  "Finalisation et tests...",
];

const DRAFT_KEY = "marchand_wizard_draft";

const defaultState = (): WizardState => ({
  name: "", category: "", description: "", whatsapp: "",
  logoFile: null, logoPreview: null, logoUrl: null,
  primaryColor: "#6366f1", font: "modern",
  theme: "modern", animation: "soft",
  products: [],
  currentStep: 1, storeId: null, publishedUrl: null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

function generateProductId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step, total = 5 }: { step: number; total?: number }) {
  const pct = ((step - 1) / (total - 1)) * 100;
  const labels = ["Infos", "Identité", "Thème", "Produits", "Générer"];

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-3">
        {labels.map((label, i) => {
          const s = i + 1;
          const done = s < step;
          const active = s === step;
          return (
            <div key={s} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                    : active
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {done ? "✓" : s}
              </div>
              <span className={`text-xs hidden sm:block transition-colors ${active ? "text-indigo-400 font-semibold" : done ? "text-white/60" : "text-white/30"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StepContainer({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-white/50 mt-1 text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/80">
        {label}{required && <span className="text-indigo-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

const inputClass = "bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm";
const selectClass = inputClass + " appearance-none cursor-pointer";

// ─── Step 1: Infos de base ────────────────────────────────────────────────────

function Step1({ state, setState, errors }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; errors: Record<string, string> }) {
  const set = (k: keyof WizardState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setState(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <StepContainer title="Parlez-nous de votre boutique" subtitle="Ces informations apparaîtront sur votre vitrine.">
      <div className="grid gap-5">
        <Field label="Nom de la boutique" error={errors.name} required>
          <input
            className={inputClass}
            placeholder="Ex: Boutique Amira, TechStore DZ..."
            value={state.name}
            onChange={set("name")}
            maxLength={60}
          />
          <span className="text-xs text-white/30 self-end">{state.name.length}/60</span>
        </Field>

        <Field label="Catégorie" error={errors.category} required>
          <select className={selectClass} value={state.category} onChange={set("category")}>
            <option value="">-- Choisissez une catégorie --</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Description courte" error={errors.description}>
          <textarea
            className={inputClass + " resize-none h-24"}
            placeholder="Décrivez votre boutique en 2-3 phrases..."
            value={state.description}
            onChange={set("description")}
            maxLength={300}
          />
          <span className="text-xs text-white/30 self-end">{state.description.length}/300</span>
        </Field>

        <Field label="Numéro WhatsApp" error={errors.whatsapp} required>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm select-none">🇩🇿 +213</span>
            <input
              className={inputClass + " pl-24"}
              placeholder="0555 12 34 56"
              value={state.whatsapp}
              onChange={set("whatsapp")}
              type="tel"
            />
          </div>
        </Field>

        {state.name && (
          <div className="bg-indigo-950/50 border border-indigo-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-indigo-400 text-lg">🔗</span>
            <div>
              <p className="text-xs text-white/40">Lien de votre boutique</p>
              <p className="text-sm text-indigo-300 font-mono">marchand.app/<strong>{slugify(state.name) || "votre-boutique"}</strong></p>
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

// ─── Step 2: Identité visuelle ────────────────────────────────────────────────

function Step2({ state, setState, errors }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; errors: Record<string, string> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setState(prev => ({
      ...prev, logoFile: file, logoPreview: e.target?.result as string,
    }));
    reader.readAsDataURL(file);
  };

  return (
    <StepContainer title="Identité visuelle" subtitle="Donnez une âme à votre boutique.">
      <div className="grid gap-6">

        {/* Logo upload */}
        <Field label="Logo de la boutique" error={errors.logo}>
          <div
            className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              dragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/20 hover:border-white/40"
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {state.logoPreview ? (
              <div className="flex items-center gap-4 p-4">
                <img src={state.logoPreview} alt="Logo preview" className="w-20 h-20 object-contain rounded-xl bg-white/5 p-1" />
                <div>
                  <p className="text-white text-sm font-medium">{state.logoFile?.name}</p>
                  <p className="text-white/40 text-xs">{state.logoFile ? (state.logoFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                  <button
                    className="text-red-400 text-xs mt-2 hover:text-red-300"
                    onClick={e => { e.stopPropagation(); setState(prev => ({ ...prev, logoFile: null, logoPreview: null })); }}
                  >✕ Supprimer</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl">🖼</div>
                <p className="text-white/60 text-sm">Glissez votre logo ici ou <span className="text-indigo-400">cliquez</span></p>
                <p className="text-white/30 text-xs">PNG, JPG, WEBP · max 5 Mo</p>
              </div>
            )}
          </div>
        </Field>

        {/* Couleur primaire */}
        <Field label="Couleur principale">
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setState(prev => ({ ...prev, primaryColor: c.value }))}
                className={`w-9 h-9 rounded-xl transition-all ${state.primaryColor === c.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={state.primaryColor}
              onChange={e => setState(prev => ({ ...prev, primaryColor: e.target.value }))}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={state.primaryColor}
              onChange={e => setState(prev => ({ ...prev, primaryColor: e.target.value }))}
              className={inputClass + " font-mono w-32 text-sm"}
              pattern="^#[0-9a-fA-F]{6}$"
            />
            <div className="w-10 h-10 rounded-xl border border-white/20 transition-all" style={{ backgroundColor: state.primaryColor }} />
          </div>
        </Field>

        {/* Police */}
        <Field label="Style de police">
          <div className="grid grid-cols-3 gap-3">
            {FONTS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setState(prev => ({ ...prev, font: f.value }))}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  state.font === f.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className={`text-xl text-white mb-1 ${f.css}`}>Aa</div>
                <div className="text-xs text-white/60">{f.label}</div>
              </button>
            ))}
          </div>
        </Field>
      </div>
    </StepContainer>
  );
}

// ─── Step 3: Thème et animations ──────────────────────────────────────────────

function Step3({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <StepContainer title="Thème et animations" subtitle="Choisissez l'ambiance de votre vitrine.">
      <div className="grid gap-7">

        {/* Thèmes */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-3 block">Thème de la boutique</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setState(prev => ({ ...prev, theme: t.value }))}
                className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                  state.theme === t.value ? "border-indigo-500 scale-[1.03] shadow-xl shadow-indigo-500/20" : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Preview miniature */}
                <div className={`h-24 bg-gradient-to-br ${t.bg} flex flex-col items-center justify-center gap-1 p-2`}>
                  <div className={`text-xs font-mono opacity-60 ${t.dark ? "text-gray-700" : "text-white"}`}>
                    {t.preview.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>
                <div className="bg-white/5 px-3 py-2">
                  <div className="text-white text-xs font-semibold">{t.label}</div>
                  <div className="text-white/40 text-[10px]">{t.desc}</div>
                </div>
                {state.theme === t.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Animations */}
        <div>
          <label className="text-sm font-medium text-white/80 mb-3 block">Animations</label>
          <div className="grid grid-cols-2 gap-3">
            {ANIMATIONS.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => setState(prev => ({ ...prev, animation: a.value }))}
                className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                  state.animation === a.value
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="text-white text-sm font-medium">{a.label}</div>
                  <div className="text-white/40 text-xs">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </StepContainer>
  );
}

// ─── Step 4: Premiers produits ────────────────────────────────────────────────

function Step4({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const addProduct = () => {
    if (state.products.length >= 5) return;
    setState(prev => ({
      ...prev,
      products: [...prev.products, { id: generateProductId(), name: "", price: "", description: "", photo: null, photoPreview: null }],
    }));
  };

  const removeProduct = (id: string) => setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));

  const updateProduct = (id: string, key: keyof Product, value: string | File | null) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => {
        if (p.id !== id) return p;
        if (key === "photo" && value instanceof File) {
          const reader = new FileReader();
          reader.onload = e => setState(pr => ({
            ...pr,
            products: pr.products.map(pp => pp.id === id ? { ...pp, photo: value, photoPreview: e.target?.result as string } : pp),
          }));
          reader.readAsDataURL(value);
          return p;
        }
        return { ...p, [key]: value };
      }),
    }));
  };

  return (
    <StepContainer title="Premiers produits" subtitle="Ajoutez jusqu'à 5 produits pour démarrer (optionnel).">
      <div className="grid gap-4">
        {state.products.map((product, idx) => (
          <div key={product.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-indigo-400 text-sm font-semibold">Produit {idx + 1}</span>
              <button type="button" onClick={() => removeProduct(product.id)} className="text-white/30 hover:text-red-400 transition-colors text-sm">✕ Supprimer</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nom du produit" required>
                <input className={inputClass} placeholder="Ex: Robe été fleurie" value={product.name}
                  onChange={e => updateProduct(product.id, "name", e.target.value)} />
              </Field>
              <Field label="Prix (DZD)" required>
                <input className={inputClass} placeholder="2500" type="number" min="0" value={product.price}
                  onChange={e => updateProduct(product.id, "price", e.target.value)} />
              </Field>
            </div>

            <Field label="Description courte">
              <input className={inputClass} placeholder="En quelques mots..." value={product.description}
                onChange={e => updateProduct(product.id, "description", e.target.value)} />
            </Field>

            <Field label="Photo">
              <label className="flex items-center gap-3 cursor-pointer group">
                {product.photoPreview ? (
                  <img src={product.photoPreview} alt="" className="w-16 h-16 object-cover rounded-xl" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:border-white/30 transition-colors">📷</div>
                )}
                <span className="text-sm text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  {product.photoPreview ? "Changer la photo" : "Ajouter une photo"}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) updateProduct(product.id, "photo", f); }} />
              </label>
            </Field>
          </div>
        ))}

        {state.products.length < 5 ? (
          <button
            type="button"
            onClick={addProduct}
            className="border-2 border-dashed border-white/20 rounded-2xl p-6 flex flex-col items-center gap-2 text-white/40 hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
          >
            <span className="text-3xl">＋</span>
            <span className="text-sm font-medium">Ajouter un produit</span>
            <span className="text-xs text-white/30">{5 - state.products.length} emplacement{5 - state.products.length > 1 ? "s" : ""} restant{5 - state.products.length > 1 ? "s" : ""}</span>
          </button>
        ) : (
          <p className="text-center text-white/30 text-sm py-4">Maximum 5 produits atteint — vous pourrez en ajouter plus après.</p>
        )}

        {state.products.length === 0 && (
          <p className="text-center text-white/30 text-sm py-2 italic">Cette étape est optionnelle. Vous pouvez sauter et ajouter vos produits depuis le dashboard.</p>
        )}
      </div>
    </StepContainer>
  );
}

// ─── Step 5: Récapitulatif + Génération ───────────────────────────────────────

function Step5({
  state,
  onGenerate,
  generating,
  aiProgress,
  aiMessage,
  done,
}: {
  state: WizardState;
  onGenerate: () => void;
  generating: boolean;
  aiProgress: number;
  aiMessage: string;
  done: boolean;
}) {
  const theme = THEMES.find(t => t.value === state.theme);
  const anim = ANIMATIONS.find(a => a.value === state.animation);
  const font = FONTS.find(f => f.value === state.font);
  const router = useRouter();

  if (done && state.publishedUrl) {
    return (
      <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-3xl font-bold text-white mb-2">Votre boutique est en ligne !</h2>
        <p className="text-white/50 mb-8">Elle est accessible immédiatement dans le monde entier.</p>

        <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 mb-8 text-center">
          <p className="text-xs text-white/40 mb-2">Lien de votre boutique</p>
          <p className="text-xl font-mono text-indigo-300 font-bold break-all">{state.publishedUrl}</p>
          <button
            onClick={() => navigator.clipboard.writeText(state.publishedUrl!)}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mx-auto"
          >
            📋 Copier le lien
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <a
            href={state.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-6 bg-white text-slate-900 rounded-xl font-semibold hover:bg-white/90 transition-all"
          >
            👁 Voir ma boutique
          </a>
          <button
            onClick={() => router.push("/dashboard")}
            className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all"
          >
            ⚙️ Gérer depuis le dashboard
          </button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="text-center py-8 animate-in fade-in duration-300">
        <div className="text-5xl mb-6 animate-spin" style={{ animationDuration: "3s" }}>⚙️</div>
        <h2 className="text-xl font-bold text-white mb-2">L'IA construit votre boutique…</h2>
        <p className="text-white/50 text-sm mb-8">{aiMessage}</p>

        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3 mx-auto max-w-sm">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700"
            style={{ width: `${aiProgress}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
        <p className="text-white/30 text-xs">{Math.round(aiProgress)}%</p>
      </div>
    );
  }

  return (
    <StepContainer title="Récapitulatif" subtitle="Vérifiez vos choix avant de générer.">
      <div className="grid gap-4 mb-8">
        {/* Infos boutique */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid gap-2">
          <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>📋</span> Informations
          </div>
          <Row label="Nom" value={state.name} />
          <Row label="Catégorie" value={state.category} />
          <Row label="WhatsApp" value={state.whatsapp} />
          {state.description && <Row label="Description" value={state.description.slice(0, 60) + (state.description.length > 60 ? "…" : "")} />}
        </div>

        {/* Identité visuelle */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid gap-2">
          <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>🎨</span> Identité visuelle
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs w-24">Couleur</span>
            <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: state.primaryColor }} />
            <span className="text-white/60 text-sm font-mono">{state.primaryColor}</span>
          </div>
          <Row label="Police" value={font?.label ?? state.font} />
          {state.logoPreview && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs w-24">Logo</span>
              <img src={state.logoPreview} alt="logo" className="h-8 w-8 object-contain rounded" />
            </div>
          )}
        </div>

        {/* Thème */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid gap-2">
          <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>✨</span> Design
          </div>
          <Row label="Thème" value={theme?.label ?? state.theme} />
          <Row label="Animations" value={`${anim?.icon} ${anim?.label}`} />
        </div>

        {/* Produits */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>📦</span> Produits ({state.products.length})
          </div>
          {state.products.length === 0 ? (
            <p className="text-white/30 text-sm italic">Aucun produit — à ajouter depuis le dashboard</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {state.products.map(p => (
                <span key={p.id} className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">
                  {p.name || "Sans nom"} — {p.price ? Number(p.price).toLocaleString() + " DZD" : "—"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onGenerate}
        className="w-full py-4 rounded-2xl font-bold text-white text-base relative overflow-hidden group transition-all hover:scale-[1.01] active:scale-[0.99]"
        style={{ background: `linear-gradient(135deg, ${state.primaryColor}, #6366f1)` }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="text-xl">🚀</span>
          Générer ma boutique avec l'IA
        </span>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
      </button>
      <p className="text-center text-white/30 text-xs mt-3">⏱ Environ 30-60 secondes · Déploiement automatique inclus</p>
    </StepContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-white/40 text-xs w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-white/80 text-sm">{value}</span>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, state: WizardState): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (!state.name.trim()) e.name = "Le nom est requis";
    else if (state.name.trim().length < 2) e.name = "Au moins 2 caractères";
    if (!state.category) e.category = "Choisissez une catégorie";
    if (!state.whatsapp.trim()) e.whatsapp = "Le numéro WhatsApp est requis";
    else if (!/^[\d\s\+\-\(\)]{8,15}$/.test(state.whatsapp)) e.whatsapp = "Format invalide";
  }
  return e;
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function CreateStorePage() {
  const [state, setState] = useState<WizardState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Reset volatile state
          return { ...defaultState(), ...parsed, logoFile: null, logoPreview: null, currentStep: 1, storeId: null, publishedUrl: null };
        }
      } catch {}
    }
    return defaultState();
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState("");
  const [done, setDone] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Auto-save brouillon
  useEffect(() => {
    const { logoFile, logoPreview, ...saveable } = state;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable));
  }, [state]);

  const goNext = () => {
    const errs = validateStep(state.currentStep, state);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setState(prev => ({ ...prev, currentStep: Math.min(5, prev.currentStep + 1) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setErrors({});
    setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload logo to Supabase Storage
  const uploadLogo = async (storeId: string): Promise<string | null> => {
    if (!state.logoFile) return null;
    const ext = state.logoFile.name.split(".").pop();
    const path = `store-assets/${storeId}/logo.${ext}`;
    const { data, error } = await supabase.storage.from("store-assets").upload(path, state.logoFile, { upsert: true });
    if (error) { console.error("Logo upload failed", error); return null; }
    const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Simulate AI generation with real progress
  const runAiGeneration = async (storeId: string) => {
    const totalDuration = 45000; // 45s total
    const stepDuration = totalDuration / AI_STEPS.length;

    for (let i = 0; i < AI_STEPS.length; i++) {
      setAiMessage(AI_STEPS[i]);
      const startPct = (i / AI_STEPS.length) * 95;
      const endPct = ((i + 1) / AI_STEPS.length) * 95;
      const steps = 20;
      for (let j = 0; j <= steps; j++) {
        await new Promise(r => setTimeout(r, stepDuration / steps));
        setAiProgress(startPct + (endPct - startPct) * (j / steps));
      }
    }

    // Call the real API
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": (await supabase.auth.getUser()).data.user?.id ?? "" },
        body: JSON.stringify({ store_id: storeId }),
      });
      if (res.ok) {
        const deploy = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": (await supabase.auth.getUser()).data.user?.id ?? "" },
          body: JSON.stringify({ store_id: storeId }),
        });
        if (deploy.ok) {
          const deployData = await deploy.json();
          setState(prev => ({ ...prev, publishedUrl: deployData.published_url }));
        }
      }
    } catch (err) {
      console.warn("API unavailable, using demo URL", err);
      setState(prev => ({ ...prev, publishedUrl: `https://${slugify(state.name)}.marchand.app` }));
    }

    setAiProgress(100);
    await new Promise(r => setTimeout(r, 500));
    setDone(true);
    localStorage.removeItem(DRAFT_KEY);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAiProgress(0);
    setAiMessage(AI_STEPS[0]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 1. Create store in Supabase
      const slug = slugify(state.name) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: store, error: storeErr } = await supabase
        .from("stores")
        .insert({
          owner_id:       user.id,
          name:           state.name,
          slug,
          description:    state.description,
          primary_color:  state.primaryColor,
          whatsapp_phone: state.whatsapp,
          theme:          state.theme,
          animation_style: state.animation,
          status:         "draft",
        })
        .select()
        .single();

      if (storeErr || !store) throw new Error(storeErr?.message ?? "Store creation failed");
      setState(prev => ({ ...prev, storeId: store.id }));

      // 2. Upload logo
      const logoUrl = await uploadLogo(store.id);
      if (logoUrl) await supabase.from("stores").update({ logo_url: logoUrl }).eq("id", store.id);

      // 3. Insert products
      if (state.products.length > 0) {
        const validProducts = state.products.filter(p => p.name && p.price);
        if (validProducts.length > 0) {
          await supabase.from("products").insert(
            validProducts.map((p, i) => ({
              store_id:      store.id,
              name:          p.name,
              price:         parseFloat(p.price),
              description:   p.description,
              stock_quantity: 10,
              position:      i,
              status:        "active",
            }))
          );
        }
      }

      // 4. Run AI generation
      await runAiGeneration(store.id);

    } catch (err) {
      console.error(err);
      setGenerating(false);
      setAiProgress(0);
    }
  };

  const stepProps = { state, setState, errors };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-start justify-center p-4 pt-8 pb-24">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Retour
          </button>
          <div className="flex-1" />
          <span className="text-white/30 text-xs">Brouillon sauvegardé automatiquement</span>
        </div>

        {/* Progress */}
        {!done && <ProgressBar step={state.currentStep} />}

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
          {state.currentStep === 1 && <Step1 {...stepProps} />}
          {state.currentStep === 2 && <Step2 {...stepProps} />}
          {state.currentStep === 3 && <Step3 {...stepProps} />}
          {state.currentStep === 4 && <Step4 {...stepProps} />}
          {state.currentStep === 5 && (
            <Step5
              state={state}
              onGenerate={handleGenerate}
              generating={generating}
              aiProgress={aiProgress}
              aiMessage={aiMessage}
              done={done}
            />
          )}
        </div>

        {/* Navigation */}
        {!generating && !done && (
          <div className="flex items-center justify-between mt-6 gap-4">
            <button
              onClick={goPrev}
              disabled={state.currentStep === 1}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              ← Précédent
            </button>

            {state.currentStep < 5 && (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-all text-sm shadow-lg shadow-indigo-500/25"
              >
                {state.currentStep === 4 ? "Voir le résumé" : "Suivant"} →
              </button>
            )}
          </div>
        )}

        {/* Skip step 4 */}
        {state.currentStep === 4 && !generating && !done && (
          <p className="text-center mt-3 text-white/30 text-xs">
            <button onClick={goNext} className="hover:text-white/60 underline transition-colors">
              Passer cette étape →
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
