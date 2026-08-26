"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "DZD", label: "Dinar algérien", symbol: "دج" },
  { code: "MAD", label: "Dirham marocain", symbol: "MAD" },
  { code: "TND", label: "Dinar tunisien", symbol: "DT" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dollar américain", symbol: "$" },
  { code: "GBP", label: "Livre sterling", symbol: "£" },
  { code: "SAR", label: "Riyal saoudien", symbol: "ر.س" },
  { code: "AED", label: "Dirham émirati", symbol: "د.إ" },
];

const COUNTRIES = [
  { code: "DZ", label: "Algérie" },
  { code: "MA", label: "Maroc" },
  { code: "TN", label: "Tunisie" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CA", label: "Canada" },
  { code: "SA", label: "Arabie Saoudite" },
  { code: "AE", label: "Émirats Arabes Unis" },
  { code: "other", label: "Autre" },
];

const STEPS = [
  { id: 1, label: "Boutique", icon: "🏪" },
  { id: 2, label: "Logo",     icon: "🖼️" },
  { id: 3, label: "Contact",  icon: "📞" },
  { id: 4, label: "Devise",   icon: "💰" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-white/45 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-red-400">⚠ {msg}</p>;
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Step 1 : Nom + Slug ──────────────────────────────────────────────────────

interface Step1Data { name: string; slug: string }
interface Step1Props { data: Step1Data; onChange: (d: Step1Data) => void }

function Step1({ data, onChange }: Step1Props) {
  const [slugManual, setSlugManual] = useState(false);
  const [checking, setChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = getSupabaseBrowserClient();

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    setChecking(true);
    const { count } = await supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    setChecking(false);
    setSlugAvailable(count === 0);
  }, [supabase]);

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = slugManual ? data.slug : slugify(name);
    onChange({ name, slug });
    // debounce slug check
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => checkSlug(slug), 500);
  };

  const handleSlug = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = slugify(e.target.value);
    setSlugManual(true);
    onChange({ ...data, slug });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => checkSlug(slug), 500);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label>Nom de votre boutique</Label>
        <input
          type="text"
          value={data.name}
          onChange={handleName}
          placeholder="Ex : Chez Amira, TechStore DZ…"
          maxLength={60}
          className={inputClass}
          autoFocus
        />
        <p className="mt-1.5 text-xs text-white/25 text-right">{data.name.length}/60</p>
      </div>

      <div>
        <Label>URL de votre boutique</Label>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-sm text-white/25 select-none pointer-events-none">
            marchand.app/
          </span>
          <input
            type="text"
            value={data.slug}
            onChange={handleSlug}
            placeholder="votre-boutique"
            className={inputClass + " pl-[6.5rem]"}
          />
          <span className="absolute right-3">
            {checking ? (
              <Spinner />
            ) : slugAvailable === true ? (
              <span className="text-emerald-400 text-xs font-medium">✓ Disponible</span>
            ) : slugAvailable === false ? (
              <span className="text-red-400 text-xs font-medium">✗ Pris</span>
            ) : null}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-white/25">
          Généré automatiquement · modifiable · minuscules et tirets uniquement
        </p>
      </div>
    </div>
  );
}

// ─── Step 2 : Logo ────────────────────────────────────────────────────────────

interface Step2Data { logoFile: File | null; logoPreview: string | null }
interface Step2Props { data: Step2Data; onChange: (d: Step2Data) => void }

function Step2({ data, onChange }: Step2Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5 MB max
    const url = URL.createObjectURL(file);
    onChange({ logoFile: file, logoPreview: url });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const remove = () => {
    if (data.logoPreview) URL.revokeObjectURL(data.logoPreview);
    onChange({ logoFile: null, logoPreview: null });
  };

  return (
    <div className="space-y-4">
      {data.logoPreview ? (
        /* Preview */
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.logoPreview}
              alt="Logo preview"
              className="w-32 h-32 rounded-2xl object-cover ring-2 ring-indigo-500/30"
            />
            <button
              onClick={remove}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-white/40">{data.logoFile?.name}</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Changer l&apos;image
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-12 px-6 text-center",
            dragging
              ? "border-indigo-500/60 bg-indigo-500/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
          ].join(" ")}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-2xl">
            🖼️
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">
              Glissez votre logo ici
            </p>
            <p className="text-xs text-white/30 mt-1">
              ou <span className="text-indigo-400">cliquez pour parcourir</span>
            </p>
          </div>
          <p className="text-xs text-white/20">PNG, JPG, WEBP · max 5 Mo · carré recommandé</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Skip note */}
      <p className="text-center text-xs text-white/25">
        Vous pouvez ajouter ou modifier votre logo plus tard dans les paramètres.
      </p>
    </div>
  );
}

// ─── Step 3 : Contact + Localisation ─────────────────────────────────────────

interface Step3Data { whatsapp: string; city: string; country: string }
interface Step3Props { data: Step3Data; onChange: (d: Step3Data) => void; errors: Partial<Step3Data> }

function Step3({ data, onChange, errors }: Step3Props) {
  const set = (key: keyof Step3Data) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => onChange({ ...data, [key]: e.target.value });

  return (
    <div className="space-y-5">
      <div>
        <Label>Numéro WhatsApp de la boutique</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none">📱</span>
          <input
            type="tel"
            value={data.whatsapp}
            onChange={set("whatsapp")}
            placeholder="+213 6 00 00 00 00"
            className={inputClass + " pl-11"}
          />
        </div>
        <FieldError msg={errors.whatsapp} />
        <p className="mt-1.5 text-xs text-white/25">
          Les clients vous contacteront via ce numéro pour passer commande.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ville</Label>
          <input
            type="text"
            value={data.city}
            onChange={set("city")}
            placeholder="Alger, Oran…"
            className={inputClass}
          />
        </div>
        <div>
          <Label>Pays</Label>
          <select
            value={data.country}
            onChange={set("country")}
            className={inputClass + " appearance-none cursor-pointer"}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#1a1a2e]">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 : Devise ──────────────────────────────────────────────────────────

interface Step4Data { currency: string }
interface Step4Props { data: Step4Data; onChange: (d: Step4Data) => void }

function Step4({ data, onChange }: Step4Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/40 mb-4">
        Choisissez la devise affichée sur votre boutique. Vous pouvez la modifier plus tard.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CURRENCIES.map((c) => {
          const active = data.currency === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onChange({ currency: c.code })}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-indigo-500/50 bg-indigo-500/15 text-white"
                  : "border-white/08 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white/80",
              ].join(" ")}
            >
              <span
                className={[
                  "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                  active ? "bg-indigo-500/25 text-indigo-300" : "bg-white/[0.05] text-white/30",
                ].join(" ")}
              >
                {c.symbol}
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{c.code}</p>
                <p className="text-xs text-white/30 leading-tight mt-0.5">{c.label}</p>
              </div>
              {active && (
                <span className="ml-auto text-indigo-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form state
  const [s1, setS1] = useState<Step1Data>({ name: "", slug: "" });
  const [s2, setS2] = useState<Step2Data>({ logoFile: null, logoPreview: null });
  const [s3, setS3] = useState<Step3Data>({ whatsapp: "", city: "", country: "DZ" });
  const [s4, setS4] = useState<Step4Data>({ currency: "DZD" });
  const [s3Errors, setS3Errors] = useState<Partial<Step3Data>>({});

  // ── Validation per step ──────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return s1.name.trim().length >= 2 && s1.slug.length >= 3;
    if (step === 2) return true; // logo optional
    if (step === 3) return true; // contact optional but validate format
    return true;
  };

  const validateStep3 = () => {
    const errors: Partial<Step3Data> = {};
    if (s3.whatsapp && !/^\+?[\d\s\-]{7,15}$/.test(s3.whatsapp)) {
      errors.whatsapp = "Format invalide (ex: +213 6 00 00 00 00)";
    }
    setS3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (step === 3 && !validateStep3()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ── Upload logo to Supabase Storage ───────────────────────────────────────
  const uploadLogo = async (storeId: string): Promise<string | null> => {
    if (!s2.logoFile) return null;
    const ext = s2.logoFile.name.split(".").pop();
    const path = `${storeId}/logo.${ext}`;

    const { error } = await supabase.storage
      .from("store-assets")
      .upload(path, s2.logoFile, { upsert: true, contentType: s2.logoFile.type });

    if (error) { console.error("Logo upload error:", error.message); return null; }

    const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setServerError(null);

    try {
      // 1. Create store (without logo first to get id)
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
          owner_id: user.id,
          name: s1.name.trim(),
          slug: s1.slug,
          whatsapp_phone: s3.whatsapp.trim() || null,
          city: s3.city.trim() || null,
          country: s3.country,
          currency: s4.currency,
          status: "inactive",
        })
        .select()
        .single();

      if (storeError) throw new Error(storeError.message);

      // 2. Upload logo if provided
      if (s2.logoFile) {
        const logoUrl = await uploadLogo(store.id);
        if (logoUrl) {
          await supabase
            .from("stores")
            .update({ logo_url: logoUrl })
            .eq("id", store.id);
        }
      }

      // 3. Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Une erreur est survenue. Réessayez."
      );
      setSubmitting(false);
    }
  };

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 py-12">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 50%, rgba(99,102,241,0.1) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="w-full max-w-lg relative">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-widest mb-2">
            Configuration initiale
          </p>
          <h1
            className="text-2xl font-semibold text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Créons votre boutique 🚀
          </h1>
          <p className="mt-1.5 text-sm text-white/35">
            Étape {step} sur {STEPS.length} — {STEPS[step - 1].label}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition-all duration-300 shrink-0",
                  step > s.id
                    ? "bg-indigo-500 border-indigo-500 text-white"
                    : step === s.id
                    ? "bg-indigo-500/20 border-indigo-500/60 text-indigo-300"
                    : "bg-white/[0.03] border-white/10 text-white/20",
                ].join(" ")}
              >
                {step > s.id ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{s.icon}</span>
                )}
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 bg-white/[0.06] overflow-hidden rounded-full">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: step > s.id ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-7 shadow-2xl"
          style={{ boxShadow: "0 0 80px rgba(99,102,241,0.06)" }}
        >
          {/* Progress bar (top edge) */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step label */}
          <h2
            className="text-base font-semibold text-white mb-5"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {step === 1 && "Comment s'appelle votre boutique ?"}
            {step === 2 && "Ajoutez votre logo"}
            {step === 3 && "Coordonnées de contact"}
            {step === 4 && "Quelle devise utilisez-vous ?"}
          </h2>

          {/* Step content */}
          <div>
            {step === 1 && <Step1 data={s1} onChange={setS1} />}
            {step === 2 && <Step2 data={s2} onChange={setS2} />}
            {step === 3 && <Step3 data={s3} onChange={setS3} errors={s3Errors} />}
            {step === 4 && <Step4 data={s4} onChange={setS4} />}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <svg className="mt-0.5 shrink-0 text-red-400" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p className="text-sm text-red-300">{serverError}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/[0.06]">
            {/* Back */}
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white/40 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Retour
            </button>

            {/* Next / Submit */}
            {step < 4 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ boxShadow: "0 0 20px rgba(99,102,241,0.2)" }}
              >
                Continuer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}
              >
                {submitting ? (
                  <>
                    <Spinner /> Création en cours…
                  </>
                ) : (
                  <>
                    Lancer ma boutique 🚀
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bottom note */}
        <p className="mt-4 text-center text-xs text-white/20">
          Toutes ces informations sont modifiables depuis les paramètres de votre boutique.
        </p>
      </div>
    </div>
  );
}
