"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storesApi, productsApi } from "@/lib/api";
import type { Product } from "@/types/database";
import type { Store, StoreContentOverrides } from "@/types/store";
import { extractImageUrl, safeString } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  ChevronDown,
  Tag,
  Home,
  ShoppingBag,
  PhoneCall,
  LayoutTemplate,
  Sliders,
  Image as ImageIcon,
  ExternalLink,
  Info,
} from "lucide-react";

interface TemplateEditorViewProps {
  storeId: string;
  type?: "boutique" | "funnel";
}

export default function TemplateEditorView({ storeId, type = "boutique" }: TemplateEditorViewProps) {
  const queryClient = useQueryClient();

  // Load store
  const {
    data: store,
    isLoading: isStoreLoading,
    error: storeError,
  } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: () => storesApi.getOne(storeId),
    enabled: Boolean(storeId),
  });

  // Load products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["store-products", storeId],
    queryFn: () => productsApi.getByStore(storeId),
    enabled: Boolean(storeId),
  });

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Viewport mode
  const [viewportMode, setViewportMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"hero" | "notice">("hero");

  // Hero section state
  const [kickerEnabled, setKickerEnabled] = useState(true);
  const [kickerText, setKickerText] = useState("Sélection officielle");
  const [titleText, setTitleText] = useState("");
  const [descriptionText, setDescriptionText] = useState(
    "Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d'Algérie."
  );
  const [ctaLabel, setCtaLabel] = useState("Découvrir la collection");
  const [ctaTarget, setCtaTarget] = useState("#catalogue");
  const [mediaUrl, setMediaUrl] = useState("");

  // Notice bar state
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [noticeSticky, setNoticeSticky] = useState(true);
  const [homeLabel, setHomeLabel] = useState("Accueil");
  const [productsLabel, setProductsLabel] = useState("Produits");
  const [contactLabel, setContactLabel] = useState("Contact");
  const [toggleEnabled, setToggleEnabled] = useState(true);
  const [toggleButtonText, setToggleButtonText] = useState("Rayons");

  // Live preview interactive state
  const [previewDropdownOpen, setPreviewDropdownOpen] = useState(false);
  const [previewActiveAnchor, setPreviewActiveAnchor] = useState("#top");
  const previewScrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize from store content overrides
  // Initialize from store content overrides safely
  useEffect(() => {
    if (!store) return;
    const overrides = (store.content_overrides || {}) as StoreContentOverrides;
    const hero = overrides.hero || {};
    const notice = overrides.notice_bar || {};

    setKickerEnabled(hero.kicker_enabled !== false);
    setKickerText(safeString(hero.kicker_text, "Sélection officielle"));
    setTitleText(safeString(hero.title_text, safeString(store.description, "Des créations uniques pensées pour vous.")));
    setDescriptionText(
      safeString(
        hero.description_text,
        "Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d'Algérie."
      )
    );
    setCtaLabel(safeString(hero.cta_label, "Découvrir la collection"));
    setCtaTarget(safeString(hero.cta_target, "#catalogue"));

    const initialMedia =
      extractImageUrl(hero.media_url) ||
      extractImageUrl(store.cover_url) ||
      extractImageUrl(products[0]?.images?.[0]) ||
      "";
    setMediaUrl(initialMedia);

    setNoticeEnabled(notice.enabled !== false);
    setNoticeSticky(notice.sticky !== false);

    const homeLink = notice.links?.find((l) => l.id === "home");
    const productsLink = notice.links?.find((l) => l.id === "products");
    const contactLink = notice.links?.find((l) => l.id === "contact");

    if (homeLink?.label) setHomeLabel(safeString(homeLink.label, "Accueil"));
    if (productsLink?.label) setProductsLabel(safeString(productsLink.label, "Produits"));
    if (contactLink?.label) setContactLabel(safeString(contactLink.label, "Contact"));

    setToggleEnabled(notice.categories_toggle?.enabled !== false);
    setToggleButtonText(safeString(notice.categories_toggle?.button_text, "Rayons"));
  }, [store, products]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("Boutique introuvable");

      const cleanMedia = extractImageUrl(mediaUrl);

      const payload: StoreContentOverrides = {
        hero: {
          kicker_enabled: kickerEnabled,
          kicker_text: safeString(kickerText).trim(),
          title_text: safeString(titleText).trim(),
          description_text: safeString(descriptionText).trim(),
          cta_label: safeString(ctaLabel).trim(),
          cta_target: safeString(ctaTarget).trim(),
          media_url: cleanMedia || undefined,
        },
        notice_bar: {
          enabled: noticeEnabled,
          sticky: noticeSticky,
          links: [
            { id: "home", label: safeString(homeLabel).trim() || "Accueil", target_anchor: "#top", enabled: true },
            { id: "products", label: safeString(productsLabel).trim() || "Produits", target_anchor: "#catalogue", enabled: true },
            { id: "contact", label: safeString(contactLabel).trim() || "Contact", target_anchor: "#contact", enabled: true },
          ],
          categories_toggle: {
            enabled: toggleEnabled,
            button_text: safeString(toggleButtonText).trim() || "Rayons",
          },
        },
      };

      // Direct Next.js route handler call for guaranteed cookie & SSR revalidation
      const res = await fetch(`/api/stores/${store.id}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_overrides: payload }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Erreur de sauvegarde");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store", storeId] });
      toast.success("Modifications publiées avec succès !", {
        description: "Votre vitrine a été mise à jour en temps réel.",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Impossible d'enregistrer les modifications");
    },
  });

  // Reset to original store state
  const handleReset = () => {
    if (!store) return;
    const overrides = (store.content_overrides || {}) as StoreContentOverrides;
    const hero = overrides.hero || {};
    const notice = overrides.notice_bar || {};

    setKickerEnabled(hero.kicker_enabled !== false);
    setKickerText(safeString(hero.kicker_text, "Sélection officielle"));
    setTitleText(safeString(hero.title_text, safeString(store.description, "Des créations uniques pensées pour vous.")));
    setDescriptionText(
      safeString(
        hero.description_text,
        "Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d'Algérie."
      )
    );
    setCtaLabel(safeString(hero.cta_label, "Découvrir la collection"));
    setCtaTarget(safeString(hero.cta_target, "#catalogue"));

    const initialMedia =
      extractImageUrl(hero.media_url) ||
      extractImageUrl(store.cover_url) ||
      extractImageUrl(products[0]?.images?.[0]) ||
      "";
    setMediaUrl(initialMedia);

    setNoticeEnabled(notice.enabled !== false);
    setNoticeSticky(notice.sticky !== false);
    setHomeLabel("Accueil");
    setProductsLabel("Produits");
    setContactLabel("Contact");
    setToggleEnabled(true);
    setToggleButtonText("Rayons");

    toast.info("Valeurs réinitialisées à leur état sauvegardé");
  };

  // Preview smooth scroll inside canvas
  const handlePreviewScrollTo = (anchorId: string) => {
    const container = previewScrollContainerRef.current;
    if (!container) return;

    setPreviewActiveAnchor(anchorId);
    if (anchorId === "#top") {
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const cleanId = anchorId.replace(/^#/, "");
    const targetElem = container.querySelector(`#preview-${cleanId}`);
    if (targetElem) {
      targetElem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isStoreLoading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs text-slate-500 dark:text-white/60 font-medium">Chargement du studio d'édition...</p>
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 text-center space-y-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Boutique introuvable</p>
        <Link
          href={`/dashboard/${type}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au tableau de bord</span>
        </Link>
      </div>
    );
  }

  const liveStoreUrl = store.published_url || `/${store.slug}`;
  const themeName = store.theme || "crimson";

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50 dark:bg-[#060713] text-slate-900 dark:text-white overflow-hidden">
      {/* ─── Top Studio Bar ────────────────────────────────────────── */}
      <header className="h-16 shrink-0 border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0d1e]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dashboard/${type}/${store.id}`}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 transition-colors shrink-0"
            title="Quitter l'éditeur"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold truncate text-slate-900 dark:text-white">
                Éditeur de Vitrine : {store.name}
              </h1>
              <span className="hidden xs:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent dark:text-sky border border-accent/20">
                Thème {themeName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-white/50 truncate">
              Personnalisation instantanée du Hero & de la barre Notice
            </p>
          </div>
        </div>

        {/* Viewport switchers & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Device switchers */}
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewportMode === "desktop"
                  ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Aperçu Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ordinateur</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("mobile")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewportMode === "mobile"
                  ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Aperçu Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1.5"
            title="Réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>

          {/* Live store link */}
          <a
            href={liveStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Voir en direct</span>
          </a>

          {/* Save button */}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {saveMutation.isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Enregistrer et publier</span>
          </button>
        </div>
      </header>

      {/* ─── Main Editor Split-Screen ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Studio (Sidebar) */}
        <aside className="w-full sm:w-[380px] lg:w-[420px] shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d1e] flex flex-col overflow-y-auto custom-scrollbar z-20 shadow-lg">
          {/* Studio Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-white/10 p-2 gap-1.5 bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setActiveTab("hero")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "hero"
                  ? "bg-white dark:bg-white/10 text-accent dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Section Hero</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notice")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "notice"
                  ? "bg-white dark:bg-white/10 text-accent dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Barre Notice</span>
            </button>
          </div>

          <div className="p-5 space-y-6 flex-1">
            {/* ─── TAB 1 : SECTION HERO ─────────────────────────────────── */}
            {activeTab === "hero" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.05]">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white">
                      Textes d'Accroche Hero
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-white/50">
                      Modifiez en direct ce qui apparaît tout en haut de votre vitrine.
                    </p>
                  </div>
                  <Sparkles className="w-4 h-4 text-accent dark:text-sky" />
                </div>

                {/* 1. Kicker / Sur-titre */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                      Sur-titre (Kicker)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 dark:text-white/40">Afficher</span>
                      <input
                        type="checkbox"
                        checked={kickerEnabled}
                        onChange={(e) => setKickerEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                      />
                    </div>
                  </div>
                  {kickerEnabled && (
                    <input
                      type="text"
                      value={kickerText}
                      onChange={(e) => setKickerText(e.target.value)}
                      maxLength={50}
                      placeholder="Ex: Sélection officielle, Nouveautés 2026..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent"
                    />
                  )}
                </div>

                {/* 2. Titre Principal / H1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                      Titre Principal (H1)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{titleText.length}/120</span>
                  </div>
                  <textarea
                    rows={2}
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    maxLength={120}
                    placeholder="Ex: Des créations uniques pensées pour vous."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent leading-relaxed resize-none"
                  />
                </div>

                {/* 3. Description / Sous-titre */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                      Description / Réassurance
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{descriptionText.length}/250</span>
                  </div>
                  <textarea
                    rows={3}
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    maxLength={250}
                    placeholder="Ex: Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d'Algérie."
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent leading-relaxed resize-none"
                  />
                </div>

                {/* 4. Bouton d'action CTA */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                    Bouton d'Action (CTA)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-white/50 block mb-1">
                        Libellé du bouton
                      </span>
                      <input
                        type="text"
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        placeholder="Découvrir la collection"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-white/50 block mb-1">
                        Cible du clic
                      </span>
                      <select
                        value={ctaTarget}
                        onChange={(e) => setCtaTarget(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                      >
                        <option value="#catalogue">Catalogue (#catalogue)</option>
                        <option value="#contact">Contact (#contact)</option>
                        <option value="#top">Haut de page (#top)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. Image Hero */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-white/90">
                      Visuel de la vitrine (Hero Art)
                    </label>
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    value={safeString(mediaUrl)}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://... URL de votre visuel"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent"
                  />

                  {/* Pick from product images */}
                  {products.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 dark:text-white/50 mb-1.5">
                        Ou choisissez rapidement parmi les photos de vos produits :
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {products
                          .map((p) => ({
                            id: p.id,
                            name: p.name,
                            imgUrl: extractImageUrl(p.images?.[0]),
                          }))
                          .filter((p) => Boolean(p.imgUrl))
                          .slice(0, 8)
                          .map((p) => {
                            const isSelected = mediaUrl === p.imgUrl;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setMediaUrl(p.imgUrl)}
                                className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                                  isSelected
                                    ? "border-accent ring-2 ring-accent/30"
                                    : "border-slate-200 dark:border-white/10 hover:border-accent/50 opacity-80 hover:opacity-100"
                                }`}
                                title={`Utiliser l'image de "${p.name}"`}
                              >
                                <img src={p.imgUrl} alt={p.name} className="w-full h-full object-cover" />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-accent/40 flex items-center justify-center text-white">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB 2 : BARRE NOTICE & NAVIGATION ───────────────────── */}
            {activeTab === "notice" && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.05]">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white">
                      Barre Notice & Navigation
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-white/50">
                      Boutons de défilement fluide et sélecteur triangulaire de catégories.
                    </p>
                  </div>
                  <Sliders className="w-4 h-4 text-accent dark:text-sky" />
                </div>

                {/* 1. Activer Notice Bar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Activer la barre Notice
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-white/50">
                      Affiche la barre de navigation rapide sous l'en-tête
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeEnabled}
                      onChange={(e) => setNoticeEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
                  </label>
                </div>

                {noticeEnabled && (
                  <>
                    {/* 2. Sticky behavior */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06]">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Position fixe (Sticky Top)
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-white/50">
                          Reste visible en haut lors du défilement des produits
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noticeSticky}
                          onChange={(e) => setNoticeSticky(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
                      </label>
                    </div>

                    {/* 3. Boutons de navigation rapide (Smooth Scroll) */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-white/90">
                        Boutons à défilement fluide (Smooth Scrolling)
                      </h3>

                      {/* Home */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 dark:text-white/50 block">
                            Cible : Ancre #top
                          </span>
                          <input
                            type="text"
                            value={homeLabel}
                            onChange={(e) => setHomeLabel(e.target.value)}
                            placeholder="Accueil"
                            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      {/* Products */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 dark:text-white/50 block">
                            Cible : Ancre #catalogue
                          </span>
                          <input
                            type="text"
                            value={productsLabel}
                            onChange={(e) => setProductsLabel(e.target.value)}
                            placeholder="Produits"
                            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <PhoneCall className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 dark:text-white/50 block">
                            Cible : Ancre #contact
                          </span>
                          <input
                            type="text"
                            value={contactLabel}
                            onChange={(e) => setContactLabel(e.target.value)}
                            placeholder="Contact"
                            className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Bascule Triangulaire des Catégories (Caret Toggle ▼/▲) */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 dark:text-white/90">
                            Bascule Catégories (Icône Triangulaire ▼)
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-white/50">
                            Déploie le tiroir de filtrage avec rotation à 180°
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={toggleEnabled}
                          onChange={(e) => setToggleEnabled(e.target.checked)}
                          className="rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                        />
                      </div>

                      {toggleEnabled && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-400 dark:text-white/50 block">
                            Libellé du bouton déclencheur
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={toggleButtonText}
                              onChange={(e) => setToggleButtonText(e.target.value)}
                              placeholder="Rayons"
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent"
                            />
                            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-mono text-slate-500 flex items-center gap-1">
                              <span>▼</span>
                              <span className="text-[10px]">180°</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ─── Right Live Preview Canvas ─────────────────────────────── */}
        <main className="flex-1 bg-slate-100 dark:bg-[#03040c] p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start overflow-y-auto">
          {/* Preview Container info banner */}
          <div className="w-full max-w-[1200px] mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-white/50 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-white/80">
                Aperçu interactif temps réel
              </span>
              <span className="text-[10px] text-slate-400">
                (Latence zéro — testez les clics & le menu déroulant ci-dessous)
              </span>
            </div>
            <div className="text-[11px] font-mono">
              {viewportMode === "desktop" ? "1200px (Desktop Full)" : "375px (iPhone View)"}
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div
            ref={previewScrollContainerRef}
            data-theme={themeName}
            className={`w-full transition-all duration-300 bg-[var(--bg)] text-[var(--text)] rounded-3xl border border-slate-300/80 dark:border-white/15 shadow-2xl overflow-y-auto max-h-[calc(100vh-170px)] custom-scrollbar ${
              viewportMode === "mobile"
                ? "max-w-[390px] border-[10px] border-slate-800 dark:border-slate-800 rounded-[48px] shadow-2xl min-h-[640px]"
                : "max-w-[1200px] min-h-[640px]"
            }`}
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text)",
            }}
          >
            {/* Simulation Header */}
            <header className="st-nav" style={{ position: "relative" }}>
              <div className="st-nav__in">
                <div className="st-nav__brand font-bold text-base">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="h-7 w-auto object-contain" />
                  ) : (
                    store.name
                  )}
                </div>

                {categories.length > 0 && viewportMode === "desktop" && (
                  <ul className="st-nav__links">
                    {categories.slice(0, 4).map((c) => (
                      <li key={c}>
                        <span className="cursor-pointer opacity-80 hover:opacity-100">{c}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="st-nav__actions">
                  {store.whatsapp_phone && (
                    <span className="st-nav__cart text-xs cursor-pointer">
                      WhatsApp
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Simulation NoticeBar with Smooth-Scrolling & Caret Toggle */}
            {noticeEnabled && (
              <div
                className={`w-full border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-all z-20 ${
                  noticeSticky ? "sticky top-0 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95" : "relative"
                }`}
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text)",
                }}
              >
                <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2 sm:px-6">
                  {/* Dynamic Nav Buttons */}
                  <nav className="flex items-center gap-1 sm:gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handlePreviewScrollTo("#top")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                        previewActiveAnchor === "#top"
                          ? "bg-[var(--accent)] text-white shadow-xs font-bold"
                          : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{homeLabel || "Accueil"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePreviewScrollTo("#catalogue")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                        previewActiveAnchor === "#catalogue"
                          ? "bg-[var(--accent)] text-white shadow-xs font-bold"
                          : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{productsLabel || "Produits"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePreviewScrollTo("#contact")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                        previewActiveAnchor === "#contact"
                          ? "bg-[var(--accent)] text-white shadow-xs font-bold"
                          : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{contactLabel || "Contact"}</span>
                    </button>
                  </nav>

                  {/* Triangular Caret Button Toggle ▼/▲ */}
                  {toggleEnabled && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPreviewDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-bold text-[var(--text)] shadow-2xs hover:border-[var(--accent)] hover:shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Tester le déploiement des catégories"
                      >
                        <Tag className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className="hidden xs:inline">{toggleButtonText || "Rayons"}</span>
                        <span className="rounded-full bg-[var(--accent)] text-white px-1.5 py-0.2 text-[10px] font-mono leading-tight">
                          {categories.length || 3}
                        </span>

                        {/* Interactive Caret Icon rotating 180° */}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-[var(--accent)] transition-transform duration-200 ease-out ${
                            previewDropdownOpen ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>

                      {/* Dropdown Tray with categories */}
                      {previewDropdownOpen && (
                        <div
                          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                          style={{
                            backgroundColor: "var(--surface)",
                            borderColor: "var(--border)",
                            boxShadow: "0 16px 36px -8px rgba(0,0,0,0.25)",
                          }}
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                              Filtrer par rayon
                            </p>
                            <span className="text-[10px] text-[var(--muted)]">
                              {categories.length || 3} disponibles
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                            <span className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-[var(--accent)] text-white cursor-pointer">
                              Tous les articles
                            </span>
                            {(categories.length > 0 ? categories : ["Mode", "Chaussures", "Accessoires"]).map((cat) => (
                              <span
                                key={cat}
                                onClick={() => setPreviewDropdownOpen(false)}
                                className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Simulation Hero Section */}
            <section id="preview-top" className="st-hero">
              <div className="st-hero__in">
                <div>
                  {kickerEnabled && (
                    <p className="st-hero__kicker transition-all">
                      {kickerText || "Sélection officielle"}
                    </p>
                  )}
                  <h1 className="st-hero__title transition-all leading-tight">
                    {titleText || "Des créations uniques pensées pour vous."}
                  </h1>
                  <p className="st-hero__sub transition-all">
                    {descriptionText ||
                      "Commandez en quelques clics avec paiement à la livraison dans les 58 Wilayas d'Algérie."}
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePreviewScrollTo(ctaTarget || "#catalogue")}
                    className="st-hero__cta cursor-pointer transition-all shadow-md"
                  >
                    {ctaLabel || "Découvrir la collection"}
                  </button>
                </div>

                <div className="st-hero__art relative overflow-hidden flex items-center justify-center">
                  {extractImageUrl(mediaUrl) ? (
                    <img
                      src={extractImageUrl(mediaUrl)}
                      alt={store.name}
                      className="w-full h-full object-cover transition-all"
                    />
                  ) : (
                    <svg viewBox="0 0 400 400" role="img" aria-label="Vitrine">
                      <rect width="400" height="400" fill="var(--stage)" />
                      <circle cx="200" cy="196" r="104" fill="var(--accent)" opacity="0.3" />
                      <rect x="152" y="118" width="96" height="150" rx="10" fill="var(--accent)" />
                    </svg>
                  )}
                </div>
              </div>
            </section>

            {/* Simulation Categories Row */}
            {categories.length > 0 && (
              <section className="st-cats">
                <div className="st-cats__in">
                  <h2>Catégories</h2>
                  <div className="st-cat-row">
                    {categories.slice(0, 5).map((cat) => (
                      <div key={cat} className="st-cat cursor-pointer">
                        <span className="st-cat__art">
                          <span className="text-xl font-bold text-[var(--accent)]">
                            {cat.slice(0, 2).toUpperCase()}
                          </span>
                        </span>
                        <span className="st-cat__label">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Simulation Products Section (#catalogue anchor target) */}
            <section id="preview-catalogue" className="st-grid scroll-mt-12 py-10">
              <div className="st-grid__in">
                <div className="st-grid__head">
                  <h2>Nos Produits ({products.length})</h2>
                  <span className="text-xs text-[var(--accent)] font-semibold">Catalogue officiel</span>
                </div>

                <div className="st-cards">
                  {(products.length > 0
                    ? products.slice(0, viewportMode === "mobile" ? 2 : 4)
                    : [
                        { id: "1", name: "Article Démonstration 1", price: 3800 },
                        { id: "2", name: "Article Démonstration 2", price: 5400 },
                      ]
                  ).map((p: any) => (
                    <div key={p.id} className="st-card">
                      <span className="st-card__art relative overflow-hidden">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 400 400">
                            <rect width="400" height="400" fill="var(--stage)" />
                            <circle cx="200" cy="196" r="80" fill="var(--accent)" opacity="0.3" />
                          </svg>
                        )}
                      </span>
                      <span className="st-card__name">{p.name}</span>
                      <span className="st-card__price">
                        {new Intl.NumberFormat("fr-DZ").format(p.price)} DA
                      </span>
                      <span className="pd-btn pd-btn--buy text-xs py-2 px-3 mt-1 text-center block">
                        Commander
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Simulation Trust Band (#contact anchor target) */}
            <div id="preview-contact" className="st-band scroll-mt-12">
              <ul className="st-band__in">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="6" width="19" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  <span>
                    <b>Paiement à la livraison.</b> Aucun paiement anticipé, vérification sur place.
                  </span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h11v10H3z" />
                    <path d="M14 9h4l3 3v4h-7z" />
                    <circle cx="7" cy="18.5" r="1.7" />
                    <circle cx="17.5" cy="18.5" r="1.7" />
                  </svg>
                  <span>
                    <b>58 Wilayas livrées</b> à domicile ou en point relais (Stop Desk).
                  </span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4.5V9h4.5" />
                  </svg>
                  <span>
                    <b>Garantie satisfaction</b> et échange facile sous 7 jours.
                  </span>
                </li>
              </ul>
            </div>

            {/* Simulation Footer */}
            <footer className="pd-foot">
              <div className="pd-shell text-center">
                {store.name} — Algérie 🇩🇿 · Commandes 7j/7 · Paiement sécurisé à la réception
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
