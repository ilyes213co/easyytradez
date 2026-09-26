"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Save,
  Loader2,
  Store as StoreIcon,
  Phone,
  Palette,
  Sparkles,
  ExternalLink,
  Check,
  AlertCircle,
  Trash2,
  Globe,
  CreditCard,
  Activity,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";
import type { PaymentSettings } from "@/lib/supabase";

interface StoreSettingsFormProps {
  store: Store;
}

const CATEGORIES = [
  "Mode & Vêtements",
  "Électronique & High-Tech",
  "Beauté & Cosmétiques",
  "Maison & Décoration",
  "Alimentation & Boissons",
  "Artisanat & Fait-main",
  "Sport & Loisirs",
  "Santé & Bien-être",
  "Bébés & Enfants",
  "Autre",
];

const THEMES = [
  { id: "modern", label: "Moderne", desc: "Design épuré et contemporain" },
  { id: "luxury", label: "Luxe & Élégance", desc: "Finitions raffinées et sombres" },
  { id: "minimal", label: "Minimaliste", desc: "Centré sur l'essentiel et le produit" },
  { id: "colorful", label: "Coloré & Vivant", desc: "Palette dynamique et captivante" },
  { id: "tech", label: "Tech & Futuriste", desc: "Style néon et high-tech" },
  { id: "nature", label: "Nature & Organique", desc: "Tons terreux et apaisants" },
];

const ANIMATIONS = [
  { id: "none", label: "Aucune", desc: "Affichage instantané sans transition" },
  { id: "soft", label: "Douce", desc: "Transitions légères et fluides" },
  { id: "dynamic", label: "Dynamique", desc: "Animations d'apparition rythmées" },
  { id: "spectacular", label: "Spectaculaire", desc: "Effets visuels prononcés au scroll" },
];

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#4f46e5", // Deep Indigo
  "#2563eb", // Blue
  "#0d9488", // Teal
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#18181b", // Zinc
];

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(store.name || "");
  const [slogan, setSlogan] = useState(store.slogan || "");
  const [description, setDescription] = useState(store.description || "");
  const [category, setCategory] = useState(store.category || CATEGORIES[0]);
  const [city, setCity] = useState(store.city || "");
  const [currency, setCurrency] = useState(store.currency || "DZD");
  const [whatsappPhone, setWhatsappPhone] = useState(store.whatsapp_phone || "");
  const [primaryColor, setPrimaryColor] = useState(store.primary_color || "#6366f1");
  const [theme, setTheme] = useState(store.theme || "modern");
  const [animationStyle, setAnimationStyle] = useState(store.animation_style || "soft");
  const [customDomain, setCustomDomain] = useState(store.custom_domain || "");
  const [facebookPixelId, setFacebookPixelId] = useState(store.facebook_pixel_id || "");
  const [tiktokPixelId, setTiktokPixelId] = useState(store.tiktok_pixel_id || "");
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(
    store.payment_settings || {
      cod_enabled: true,
      baridimob_enabled: false,
      baridimob_rip: "",
      baridimob_name: "",
      stripe_enabled: false,
      stripe_public_key: "",
    }
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    setName(store.name || "");
    setSlogan(store.slogan || "");
    setDescription(store.description || "");
    setCategory(store.category || CATEGORIES[0]);
    setCity(store.city || "");
    setCurrency(store.currency || "DZD");
    setWhatsappPhone(store.whatsapp_phone || "");
    setPrimaryColor(store.primary_color || "#6366f1");
    setTheme(store.theme || "modern");
    setAnimationStyle(store.animation_style || "soft");
    setCustomDomain(store.custom_domain || "");
    setFacebookPixelId(store.facebook_pixel_id || "");
    setTiktokPixelId(store.tiktok_pixel_id || "");
    setPaymentSettings(
      store.payment_settings || {
        cod_enabled: true,
        baridimob_enabled: false,
        baridimob_rip: "",
        baridimob_name: "",
        stripe_enabled: false,
        stripe_public_key: "",
      }
    );
  }, [store]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        slogan: slogan.trim() || null,
        description: description.trim() || null,
        category: category || null,
        city: city.trim() || null,
        currency: currency || "DZD",
        whatsapp_phone: whatsappPhone.trim() || null,
        primary_color: primaryColor,
        theme,
        animation_style: animationStyle,
        custom_domain: customDomain.trim() || null,
        facebook_pixel_id: facebookPixelId.trim() || null,
        tiktok_pixel_id: tiktokPixelId.trim() || null,
        payment_settings: paymentSettings,
      };
      return await storesApi.update(store.id, payload);
    },
    onSuccess: () => {
      toast.success("Paramètres enregistrés avec succès !");
      queryClient.invalidateQueries({ queryKey: ["store", store.id] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["store-redirect"] });
      router.refresh();
    },
    onError: (err: any) => {
      console.error("Store settings update error:", err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Impossible d'enregistrer les paramètres.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await storesApi.delete(store.id);
    },
    onSuccess: () => {
      toast.success("Boutique supprimée");
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      router.replace("/dashboard/create-store");
    },
    onError: (err: any) => {
      console.error("Delete store error:", err);
      toast.error("Erreur lors de la suppression de la boutique");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom de la boutique est obligatoire");
      return;
    }
    updateMutation.mutate();
  };

  const isSaving = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* ── Section 1: Informations Générales ──────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Informations Générales</h2>
            <p className="text-xs text-white/50">Les coordonnées et l&apos;identité de votre boutique</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Nom de la boutique <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="Ex: El Mordjane Store"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Slogan / Accroche</label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="Ex: La qualité au meilleur prix"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Catégorie d&apos;activité</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121218] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#121218] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Ville / Wilaya</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              placeholder="Ex: Alger, Oran, Constantine..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/70 mb-1.5">Description de la boutique</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none"
              placeholder="Présentez votre boutique, votre savoir-faire et vos engagements clients..."
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Contact & Commande WhatsApp ────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Commandes & WhatsApp</h2>
            <p className="text-xs text-white/50">Le numéro qui recevra les notifications de commande instantanées</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Numéro WhatsApp (Algérie)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                placeholder="Ex: 0550 12 34 56 ou +213 550 12 34 56"
              />
            </div>
            <p className="mt-1 text-[11px] text-white/40">
              Format supporté : 05/06/07 ou préfixe international +213.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Devise d&apos;affichage</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#121218] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            >
              <option value="DZD" className="bg-[#121218] text-white">Dinar Algérien (DZD / DA)</option>
              <option value="EUR" className="bg-[#121218] text-white">Euro (€)</option>
              <option value="USD" className="bg-[#121218] text-white">Dollar US ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 3: Identité Visuelle & Thème ──────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Style & Design</h2>
            <p className="text-xs text-white/50">Personnalisez la couleur maîtresse et l&apos;ambiance de votre vitrine</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70 mb-2">Couleur principale</label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setPrimaryColor(col)}
                className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                  primaryColor.toLowerCase() === col.toLowerCase()
                    ? "border-white scale-110 shadow-lg shadow-indigo-500/20"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: col }}
                title={col}
              >
                {primaryColor.toLowerCase() === col.toLowerCase() && (
                  <Check className="h-4 w-4 text-white drop-shadow" />
                )}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <span className="font-mono text-xs text-white/60 uppercase">{primaryColor}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">Thème de la boutique</label>
            <div className="space-y-2">
              {THEMES.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    theme === t.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t.id}
                    checked={theme === t.id}
                    onChange={() => setTheme(t.id)}
                    className="mt-1 text-indigo-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{t.label}</div>
                    <div className="text-xs text-white/50">{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">Style des animations</label>
            <div className="space-y-2">
              {ANIMATIONS.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    animationStyle === a.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <input
                    type="radio"
                    name="animation"
                    value={a.id}
                    checked={animationStyle === a.id}
                    onChange={() => setAnimationStyle(a.id)}
                    className="mt-1 text-indigo-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{a.label}</div>
                    <div className="text-xs text-white/50">{a.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Liens d'accès ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <ExternalLink className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Adresse de la Vitrine</h2>
            <p className="text-xs text-white/50">Lien public pour partager vos produits avec vos clients</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-xs text-white/40">URL locale & Storefront :</p>
            <p className="text-sm font-mono text-indigo-300 truncate">/{store.slug}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/${store.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium text-white hover:bg-white/15 transition-colors"
            >
              Visiter le Storefront <ExternalLink className="h-3 w-3" />
            </a>
            {store.published_url && (
              <a
                href={store.published_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30 transition-colors"
              >
                Site Déployé <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 5: Nom de Domaine Personnalisé ────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Nom de Domaine Personnalisé</h2>
            <p className="text-xs text-white/50">Connectez votre propre adresse web (ex: maboutique.dz ou boutique.com)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Votre nom de domaine</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/https?:\/\//, ""))}
                placeholder="Ex: maboutique.com ou shop.dz"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            {customDomain && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold self-start">
                <Check className="h-3.5 w-3.5" /> Enregistré
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2 text-xs text-cyan-200/80">
          <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <span>ℹ️</span> Configuration DNS (Chez votre registrar)
          </p>
          <p>
            Créez un enregistrement chez votre fournisseur de domaine (Icosnet, Hostinger, Namecheap, Cloudflare) :
          </p>
          <div className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/20 font-mono text-[11px] text-white">
            <span>Type : <strong>CNAME</strong> &nbsp;|&nbsp; Nom : <strong>@</strong> ou <strong>www</strong> &nbsp;|&nbsp; Valeur : <strong>cname.easytrade.dz</strong></span>
          </div>
        </div>
      </div>

      {/* ── Section 6: Pixels Publicitaires (Meta & TikTok) ────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Pixels Publicitaires (Meta Facebook & TikTok)</h2>
            <p className="text-xs text-white/50">Suivez vos ventes, vos conversions et optimisez vos campagnes sponsorisées</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Facebook / Meta Pixel ID
            </label>
            <input
              type="text"
              value={facebookPixelId}
              onChange={(e) => setFacebookPixelId(e.target.value.trim())}
              placeholder="Ex: 123456789012345"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Trouvez votre ID dans le Gestionnaire d&apos;évènements Meta.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" /> TikTok Pixel ID
            </label>
            <input
              type="text"
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value.trim())}
              placeholder="Ex: C1234567890ABCDEF"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Trouvez votre ID dans TikTok Ads Manager.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50 space-y-1">
          <p className="font-medium text-white/80">Événements mesurés automatiquement sur votre boutique :</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 text-[11px]">👁️ Visites (PageView)</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 text-[11px]">📦 Vue Produit (ViewContent)</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 text-[11px]">🛒 Ajout Panier (AddToCart)</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 text-[11px]">🎉 Achat validé (Purchase)</span>
          </div>
        </div>
      </div>

      {/* ── Section 7: Moyens de Paiement ─────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Moyens de Paiement</h2>
            <p className="text-xs text-white/50">Choisissez les modes de règlement proposés à vos acheteurs</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Paiement à la livraison */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Paiement à la livraison (Cash on Delivery)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">Standard en Algérie</span>
              </div>
              <p className="text-xs text-white/40">Le client paye en espèces directement au livreur à la réception de son colis.</p>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSettings(p => ({ ...p, cod_enabled: !p.cod_enabled }))}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${paymentSettings.cod_enabled ? "bg-emerald-500" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${paymentSettings.cod_enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* BaridiMob & CCP */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">BaridiMob / Virement CCP</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Algérie Poste</span>
                </div>
                <p className="text-xs text-white/40">Vos coordonnées bancaires / RIP sont affichées au client pour effectuer le virement.</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentSettings(p => ({ ...p, baridimob_enabled: !p.baridimob_enabled }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${paymentSettings.baridimob_enabled ? "bg-amber-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${paymentSettings.baridimob_enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {paymentSettings.baridimob_enabled && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-white/[0.04]">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Numéro RIP (20 chiffres) ou Compte CCP</label>
                  <input
                    type="text"
                    value={paymentSettings.baridimob_rip || ""}
                    onChange={(e) => setPaymentSettings(p => ({ ...p, baridimob_rip: e.target.value }))}
                    placeholder="Ex: 00799999000123456789"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Nom du titulaire du compte</label>
                  <input
                    type="text"
                    value={paymentSettings.baridimob_name || ""}
                    onChange={(e) => setPaymentSettings(p => ({ ...p, baridimob_name: e.target.value }))}
                    placeholder="Ex: BENADJINA ILYES"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Stripe Carte Bancaire */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Carte Bancaire (Stripe)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">International</span>
                </div>
                <p className="text-xs text-white/40">Acceptez les cartes Visa, Mastercard pour les ventes à l&apos;international.</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentSettings(p => ({ ...p, stripe_enabled: !p.stripe_enabled }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${paymentSettings.stripe_enabled ? "bg-blue-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${paymentSettings.stripe_enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {paymentSettings.stripe_enabled && (
              <div className="pt-2 border-t border-white/[0.04]">
                <label className="block text-xs font-medium text-white/60 mb-1">Clé Publique Stripe (Publishable Key)</label>
                <input
                  type="text"
                  value={paymentSettings.stripe_public_key || ""}
                  onChange={(e) => setPaymentSettings(p => ({ ...p, stripe_public_key: e.target.value.trim() }))}
                  placeholder="Ex: pk_live_51ABCDEF..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Save Action Button ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Enregistrer les modifications
            </>
          )}
        </button>
      </div>

      {/* ── Danger Zone: Suppression ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-red-300">Zone de danger</h3>
            <p className="text-xs text-red-300/70">
              Supprimer cette boutique et l&apos;ensemble de ses produits et commandes associés.
            </p>
          </div>
        </div>

        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Supprimer la boutique
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-xs text-red-200">
              Pour confirmer la suppression définitive, tapez le nom exact de la boutique :{" "}
              <strong className="underline">{store.name}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={store.name}
                className="rounded-lg border border-red-400/30 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-red-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleteInput !== store.name || isDeleting}
                  onClick={() => deleteMutation.mutate()}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? "Suppression..." : "Confirmer la suppression"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirm(false);
                    setDeleteInput("");
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
