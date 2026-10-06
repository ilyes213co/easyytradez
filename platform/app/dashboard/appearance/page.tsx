"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveOwnedStore } from "@/lib/current-store";
import { storesApi } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Palette, Check, ExternalLink, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ThemeName } from "@/types/product";
import type { ThemeScope } from "@/types/store";

interface ThemeMeta {
  id: ThemeName;
  name: string;
  scope: ThemeScope;
  tagline: string;
  category: string;
  fonts: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  accentText: string;
  border: string;
  borderRadius: string;
  isDark: boolean;
}

const THEMES: ThemeMeta[] = [
  {
    id: "monochrome",
    name: "Monochrome",
    scope: "boutique",
    tagline: "Épuré, ultra-minimaliste et intemporel",
    category: "High-End / Mode / Design",
    fonts: "Schibsted Grotesk",
    bg: "#ffffff",
    surface: "#f8f8f8",
    text: "#0d0d0d",
    accent: "#0d0d0d",
    accentText: "#ffffff",
    border: "#e5e5e5",
    borderRadius: "0px",
    isDark: false,
  },
  {
    id: "blossom-lavender",
    name: "Blossom Lavender",
    scope: "boutique",
    tagline: "Pastel délicat, élégance florale et bien-être",
    category: "Cosmétique / Soins / Beauté",
    fonts: "Fraunces & Karla",
    bg: "#fbf8f5",
    surface: "#ffffff",
    text: "#201a1e",
    accent: "#9d4edd",
    accentText: "#ffffff",
    border: "#f0e4db",
    borderRadius: "16px",
    isDark: false,
  },
  {
    id: "phantom",
    name: "Phantom",
    scope: "funnel",
    tagline: "Cyberpunk furtif, néon cyan sur noir profond",
    category: "Gaming / Tech / Électronique",
    fonts: "Space Grotesk & Inter Tight",
    bg: "#07090e",
    surface: "#0e111a",
    text: "#ecf2ff",
    accent: "#00f5d4",
    accentText: "#000000",
    border: "#1a2235",
    borderRadius: "10px",
    isDark: true,
  },
  {
    id: "playful-pumpkin",
    name: "Playful Pumpkin",
    scope: "boutique",
    tagline: "Chaleureux, acidulé et ludique",
    category: "Enfants / Jouets / Épicerie fine",
    fonts: "Fredoka & Nunito",
    bg: "#fffdf9",
    surface: "#ffffff",
    text: "#2d2013",
    accent: "#ff6b35",
    accentText: "#ffffff",
    border: "#fce9d8",
    borderRadius: "20px",
    isDark: false,
  },
  {
    id: "crimson",
    name: "Crimson",
    scope: "funnel",
    tagline: "Carmin audacieux, maroquinerie et caractère",
    category: "Cuir / Maroquinerie / Streetwear",
    fonts: "Anton & Barlow",
    bg: "#0f0507",
    surface: "#18090d",
    text: "#fcefee",
    accent: "#e63946",
    accentText: "#ffffff",
    border: "#2e0f17",
    borderRadius: "4px",
    isDark: true,
  },
  {
    id: "natural",
    name: "Natural",
    scope: "boutique",
    tagline: "Organique, terre cuite et feuillage apaisant",
    category: "Bio / Écologique / Déco maison",
    fonts: "Newsreader & Work Sans",
    bg: "#faf6f0",
    surface: "#ffffff",
    text: "#28231d",
    accent: "#3d5a45",
    accentText: "#ffffff",
    border: "#e7dec8",
    borderRadius: "8px",
    isDark: false,
  },
  {
    id: "energetic",
    name: "Energetic",
    scope: "funnel",
    tagline: "High-voltage, jaune fluo et pulsations sportives",
    category: "Sport / Sneakers / Fitness",
    fonts: "Archivo",
    bg: "#0c0f12",
    surface: "#14181e",
    text: "#f0f4f8",
    accent: "#ccff00",
    accentText: "#000000",
    border: "#202832",
    borderRadius: "8px",
    isDark: true,
  },
  {
    id: "tuareg-indigo",
    name: "Tuareg Indigo",
    scope: "boutique",
    tagline: "Bleu saharien noble et ornementations dorées",
    category: "Artisanat / Bijoux kabyles / Héritage",
    fonts: "Amiri & Cairo",
    bg: "#f8f6f0",
    surface: "#ffffff",
    text: "#141724",
    accent: "#1e3a8a",
    accentText: "#ffffff",
    border: "#e2dcce",
    borderRadius: "12px",
    isDark: false,
  },
  {
    id: "neo-brutalist",
    name: "Neo-Brutalist",
    scope: "funnel",
    tagline: "Contraste maximal, contours 3px et pop attitude",
    category: "Mode urbaine / Accessoires / Créateurs",
    fonts: "Space Mono & DM Sans",
    bg: "#fffbe8",
    surface: "#ffffff",
    text: "#000000",
    accent: "#ffea00",
    accentText: "#000000",
    border: "#000000",
    borderRadius: "0px",
    isDark: false,
  },
  {
    id: "luxe-noir",
    name: "Luxe Noir",
    scope: "boutique",
    tagline: "Opulence nocturne, or satiné et raffinement ultime",
    category: "Joaillerie / Parfumerie / Horlogerie",
    fonts: "Cormorant Garamond & Jost",
    bg: "#0a0908",
    surface: "#14120e",
    text: "#f3eee7",
    accent: "#d4af37",
    accentText: "#0a0908",
    border: "#2b261b",
    borderRadius: "6px",
    isDark: true,
  },
];

export default function AppearancePage() {
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ["current-store"],
    queryFn: () => resolveOwnedStore(),
  });

  const [activeTheme, setActiveTheme] = useState<ThemeName>("monochrome");
  const [scopeFilter, setScopeFilter] = useState<"recommended" | "all">("recommended");

  const targetScope = (store as any)?.type === "funnel" ? "funnel" : "boutique";
  const displayedThemes = THEMES.filter((t) => {
    if (scopeFilter === "all") return true;
    return t.scope === targetScope || t.scope === "both";
  });

  useEffect(() => {
    if (store && (store as any).theme) {
      setActiveTheme((store as any).theme as ThemeName);
    }
  }, [store]);

  const updateMutation = useMutation({
    mutationFn: async (newTheme: ThemeName) => {
      if (!store?.id) throw new Error("Boutique introuvable");
      return storesApi.updateTheme(store.id, newTheme);
    },
    onSuccess: (updatedStore, newTheme) => {
      setActiveTheme(newTheme);
      queryClient.setQueryData(["current-store"], (old: any) =>
        old ? { ...old, theme: newTheme } : old
      );
      toast.success(`Thème « ${THEMES.find((t) => t.id === newTheme)?.name} » appliqué instantanément !`);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.detail || "Erreur lors de la mise à jour du thème"
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-white/60 mb-4">Vous n&apos;avez pas encore de boutique active.</p>
        <Link
          href="/dashboard/create-store"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          Créer ma première boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Palette className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Apparence & Thèmes</h1>
          </div>
          <p className="text-sm text-white/50">
            Le thème visuel est découplé de vos produits : changez d&apos;ambiance à volonté en un clic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <span>Voir ma boutique</span>
            <ExternalLink className="w-4 h-4 text-white/40" />
          </Link>
        </div>
      </div>

      {/* Current Active Theme Highlight */}
      {(() => {
        const currentMeta: ThemeMeta = THEMES.find((t) => t.id === activeTheme) ?? THEMES[0]!;
        return (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] p-6 backdrop-blur">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" /> Thème actif en production
                </div>
                <h2 className="text-xl font-bold text-white">{currentMeta.name}</h2>
                <p className="text-sm text-white/60 max-w-xl">{currentMeta.tagline}</p>
                <div className="flex items-center gap-4 pt-1 text-xs text-white/40">
                  <span>Typographie : <strong className="text-white/70">{currentMeta.fonts}</strong></span>
                  <span>•</span>
                  <span>Ambiance : <strong className="text-white/70">{currentMeta.category}</strong></span>
                </div>
              </div>

              {/* Live Preview Mini Swatch Banner */}
              <div
                className="w-full md:w-72 p-4 rounded-xl shadow-lg border transition-all"
                style={{
                  backgroundColor: currentMeta.bg,
                  borderColor: currentMeta.border,
                  color: currentMeta.text,
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">
                  {store.name || "Ma Boutique"}
                </div>
                <div className="text-sm font-semibold mb-3">
                  Aperçu fiche produit
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block px-3 py-1.5 text-xs font-bold shadow-sm"
                    style={{
                      backgroundColor: currentMeta.accent,
                      color: currentMeta.accentText,
                      borderRadius: currentMeta.borderRadius,
                    }}
                  >
                    Commander (COD)
                  </span>
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: currentMeta.accent }}
                  />
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: currentMeta.surface }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grid of Themes */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white/90">
              Catalogue des thèmes ({displayedThemes.length})
            </h3>
            <span className="text-xs text-white/40">
              {scopeFilter === "recommended"
                ? `Thèmes calibrés pour votre ${targetScope === "funnel" ? "Funnel (mono-produit)" : "Boutique (catalogue)"}`
                : "Tous les thèmes du catalogue"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setScopeFilter("recommended")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                scopeFilter === "recommended"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Recommandés ({targetScope === "funnel" ? "Funnel" : "Boutique"})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                scopeFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Tous (10)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedThemes.map((theme) => {
            const isSelected = activeTheme === theme.id;
            const isUpdatingThis = updateMutation.isPending && updateMutation.variables === theme.id;

            return (
              <motion.div
                key={theme.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all overflow-hidden ${
                  isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/[0.03]"
                    : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                {/* Visual Card Header */}
                <div
                  className="p-5 border-b relative"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase font-bold tracking-wider opacity-60">
                          {theme.category}
                        </span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{
                            backgroundColor: theme.accentText === "#ffffff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)",
                            color: theme.text,
                          }}
                        >
                          {theme.scope === "funnel" ? "Funnel" : "Boutique"}
                        </span>
                      </div>
                      <div className="text-lg font-bold tracking-tight">
                        {theme.name}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-xs font-semibold shadow">
                        <Check className="w-3 h-3" /> Actif
                      </span>
                    )}
                  </div>

                  {/* Micro Store Mockup */}
                  <div
                    className="p-3 rounded-lg border shadow-sm space-y-2.5"
                    style={{
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>Produit Vedette</span>
                      <span style={{ color: theme.accent }} className="font-bold">4 800 DZD</span>
                    </div>

                    {/* Fake Swatches */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-black/15 shadow-inner"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/15"
                        style={{ backgroundColor: theme.isDark ? "#ffffff" : "#000000" }}
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/15"
                        style={{ backgroundColor: theme.isDark ? "#444" : "#ccc" }}
                      />
                    </div>

                    {/* Fake CTA */}
                    <div
                      className="w-full text-center py-1.5 text-xs font-bold uppercase tracking-wide transition-transform hover:scale-[1.02]"
                      style={{
                        backgroundColor: theme.accent,
                        color: theme.accentText,
                        borderRadius: theme.borderRadius,
                        border: theme.id === "neo-brutalist" ? "2px solid #000" : "none",
                        boxShadow: theme.id === "neo-brutalist" ? "2px 2px 0px #000" : undefined,
                      }}
                    >
                      Acheter Maintenant
                    </div>
                  </div>
                </div>

                {/* Card Description & Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <p className="text-xs text-white/70 line-clamp-2 leading-relaxed mb-3">
                      {theme.tagline}
                    </p>
                    <div className="text-[11px] text-white/40 space-y-1">
                      <div>Typographie : <span className="text-white/60">{theme.fonts}</span></div>
                      <div>Id : <code className="text-indigo-400 font-mono">{theme.id}</code></div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isSelected ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <Check className="w-3.5 h-3.5" /> Thème Actuel
                      </button>
                    ) : (
                      <button
                        onClick={() => updateMutation.mutate(theme.id)}
                        disabled={updateMutation.isPending}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-indigo-600 text-white/90 hover:text-white border border-white/10 hover:border-indigo-500 transition-all flex items-center justify-center gap-2 group"
                      >
                        {isUpdatingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Application...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                            Appliquer ce thème
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
