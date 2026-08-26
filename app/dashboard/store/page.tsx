"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Store } from "@/lib/supabase";

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

const CURRENCIES = [
  { code: "DZD", label: "Dinar algérien" },
  { code: "MAD", label: "Dirham marocain" },
  { code: "TND", label: "Dinar tunisien" },
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "Dollar américain" },
  { code: "GBP", label: "Livre sterling" },
  { code: "SAR", label: "Riyal saoudien" },
  { code: "AED", label: "Dirham émirati" },
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
];

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-white/45 mb-1.5 uppercase tracking-wider">
      {children}
    </label>
  );
}

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white/85" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
        {description && <p className="text-xs text-white/35 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Image upload field ───────────────────────────────────────────────────────

function ImageField({ label, value, storeId, bucket, path, onUploaded }: {
  label: string; value: string | null; storeId: string;
  bucket: string; path: string; onUploaded: (url: string) => void;
}) {
  const supabase = getSupabaseBrowserClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fullPath = `${storeId}/${path}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file, { upsert: true, contentType: file.type });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
      onUploaded(data.publicUrl + `?t=${Date.now()}`);
    }
    setUploading(false);
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="w-16 h-16 rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="text-white/15" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/60 hover:bg-white/[0.07] hover:text-white/80 transition-all disabled:opacity-50"
          >
            {uploading ? <><Spinner size={12} /> Upload…</> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Changer l&apos;image</>}
          </button>
          <p className="text-xs text-white/20">PNG, JPG, WEBP · max 5 Mo</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StorePage() {
  const { user } = useAuth();
  const supabase  = getSupabaseBrowserClient();

  const [store, setStore]       = useState<Store | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  // Form fields
  const [name, setName]               = useState("");
  const [slug, setSlug]               = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [city, setCity]               = useState("");
  const [country, setCountry]         = useState("DZ");
  const [currency, setCurrency]       = useState("DZD");
  const [status, setStatus]           = useState<Store["status"]>("inactive");
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [coverUrl, setCoverUrl]       = useState<string | null>(null);

  // ── Load store ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stores").select("*").eq("owner_id", user.id).single();
    if (data) {
      setStore(data);
      setName(data.name);
      setSlug(data.slug);
      setDescription(data.description ?? "");
      setWhatsapp(data.whatsapp_number ?? "");
      setCity(data.city ?? "");
      setCountry(data.country);
      setCurrency(data.currency);
      setStatus(data.status);
      setLogoUrl(data.logo_url);
      setCoverUrl(data.cover_url);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Handle name → auto slug ────────────────────────────────────────────
  const handleName = (v: string) => {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  };

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!store) return;
    setError(null);
    setSaving(true);

    const { error: err } = await supabase
      .from("stores")
      .update({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        city: city.trim() || null,
        country,
        currency,
        status,
        logo_url: logoUrl,
        cover_url: coverUrl,
      })
      .eq("id", store.id);

    setSaving(false);

    if (err) {
      setError(err.message.includes("unique") ? "Ce slug est déjà utilisé." : err.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Copy storefront link ───────────────────────────────────────────────
  const copyLink = () => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/30 gap-2">
        <Spinner /> Chargement…
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-white/40 text-sm">Aucune boutique trouvée.</p>
        <p className="text-white/25 text-xs mt-1">Complétez d&apos;abord l&apos;onboarding.</p>
      </div>
    );
  }

  const storefrontUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${slug}`;

  return (
    <div className="max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Ma boutique
          </h1>
          <p className="text-sm text-white/35 mt-0.5">Gérez les informations de votre boutique</p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
          style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
        >
          {saving ? <><Spinner /> Enregistrement…</> :
           saved   ? <>✓ Enregistré</> :
                     <>Enregistrer</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          {error}
        </div>
      )}

      {/* ── Storefront link ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] px-5 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">
              Lien de votre vitrine
            </p>
            <p className="text-sm text-white/70 font-mono truncate">{storefrontUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.09] transition-all"
            >
              {copied ? "✓ Copié !" : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg> Copier</>
              )}
            </button>
            <a
              href={`/${slug}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-300 hover:bg-indigo-500/25 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Voir
            </a>
          </div>
        </div>
      </div>

      {/* ── Status toggle ──────────────────────────────────────────────── */}
      <SectionCard title="Statut de la boutique" description="Une boutique inactive n'est pas visible par les clients.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">
              {status === "active" ? "✅ Boutique active" : status === "inactive" ? "⏸ Boutique inactive" : "🚫 Boutique suspendue"}
            </p>
            <p className="text-xs text-white/35 mt-0.5">
              {status === "active" ? "Vos clients peuvent visiter et commander." : "Votre vitrine est masquée pour les clients."}
            </p>
          </div>
          {status !== "suspended" && (
            <button
              onClick={() => setStatus(status === "active" ? "inactive" : "active")}
              className={`relative w-12 h-6 rounded-full transition-all ${status === "active" ? "bg-indigo-500" : "bg-white/10"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${status === "active" ? "left-7" : "left-1"}`} />
            </button>
          )}
        </div>
      </SectionCard>

      {/* ── Info générale ──────────────────────────────────────────────── */}
      <SectionCard title="Informations générales">
        <div>
          <Label>Nom de la boutique</Label>
          <input type="text" value={name} onChange={(e) => handleName(e.target.value)}
            maxLength={60} className={inputClass} />
        </div>

        <div>
          <Label>URL (slug)</Label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-sm text-white/25 select-none pointer-events-none">
              {typeof window !== "undefined" ? window.location.host : "marchand.app"}/
            </span>
            <input type="text" value={slug}
              onChange={(e) => { setSlugManual(true); setSlug(slugify(e.target.value)); }}
              className={inputClass + " pl-36"}
            />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <textarea value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3} maxLength={300}
            placeholder="Décrivez votre boutique en quelques mots…"
            className={inputClass + " resize-none leading-relaxed"}
          />
          <p className="mt-1 text-xs text-white/20 text-right">{description.length}/300</p>
        </div>
      </SectionCard>

      {/* ── Médias ────────────────────────────────────────────────────── */}
      <SectionCard title="Logo et couverture">
        <ImageField label="Logo de la boutique" value={logoUrl} storeId={store.id}
          bucket="store-assets" path="logo" onUploaded={setLogoUrl} />
        <div className="h-px bg-white/[0.05]" />
        <ImageField label="Image de couverture" value={coverUrl} storeId={store.id}
          bucket="store-assets" path="cover" onUploaded={setCoverUrl} />
        <p className="text-xs text-white/20">La couverture s&apos;affiche en bannière sur votre vitrine. Format paysage recommandé (1200×400px).</p>
      </SectionCard>

      {/* ── Contact & localisation ────────────────────────────────────── */}
      <SectionCard title="Contact & localisation">
        <div>
          <Label>Numéro WhatsApp</Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base pointer-events-none">📱</span>
            <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+213 6 00 00 00 00" className={inputClass + " pl-10"} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ville</Label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="Alger, Oran…" className={inputClass} />
          </div>
          <div>
            <Label>Pays</Label>
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className={inputClass + " appearance-none cursor-pointer"}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#1a1a2e]">{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Devise ────────────────────────────────────────────────────── */}
      <SectionCard title="Devise" description="Utilisée pour afficher les prix sur votre vitrine.">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
          className={inputClass + " appearance-none cursor-pointer"}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-[#1a1a2e]">{c.code} — {c.label}</option>
          ))}
        </select>
      </SectionCard>

      {/* Bottom save */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
          style={{ boxShadow: "0 0 20px rgba(99,102,241,0.2)" }}
        >
          {saving ? <><Spinner /> Enregistrement…</> :
           saved   ? <>✓ Modifications sauvegardées</> :
                     <>Enregistrer les modifications</>}
        </button>
      </div>
    </div>
  );
}
