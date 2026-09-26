"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  Palette,
  Sparkles,
  Save,
  Loader2,
  ExternalLink,
  Check,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { storesApi } from "@/lib/api";
import type { Store } from "@/types/database";
import { useAuth } from "@/components/auth/AuthProvider";

const THEMES = [
  { id: "modern", label: "Moderne", desc: "Design épuré et contemporain" },
  { id: "luxury", label: "Luxe & Élégance", desc: "Finitions raffinées et sombres" },
  { id: "minimal", label: "Minimaliste", desc: "Centré sur l'essentiel et le produit" },
  { id: "colorful", label: "Coloré & Vivant", desc: "Palette dynamique et captivante" },
  { id: "tech", label: "Tech & Futuriste", desc: "Style néon et high-tech" },
  { id: "nature", label: "Nature & Organique", desc: "Tons terreux et apaisants" },
];

const ANIMATIONS = [
  { id: "none", label: "Aucune", desc: "Instantané sans transition" },
  { id: "soft", label: "Douce", desc: "Transitions légères et fluides" },
  { id: "dynamic", label: "Dynamique", desc: "Apparitions rythmées" },
  { id: "spectacular", label: "Spectaculaire", desc: "Effets visuels marqués" },
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

type Viewport = "desktop" | "tablet" | "mobile";

export default function StoreDesignPage() {
  const { user } = useAuth();
  const params = useParams();
  const storeId = params.id as string;
  const queryClient = useQueryClient();

  const { data: store, isLoading, isError } = useQuery<Store>({
    queryKey: ["store", storeId],
    queryFn: () => storesApi.getOne(storeId),
    enabled: Boolean(storeId) && Boolean(user?.id),
  });

  const [theme, setTheme] = useState("modern");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [animationStyle, setAnimationStyle] = useState("soft");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (store) {
      if (store.theme) setTheme(store.theme);
      if (store.primary_color) setPrimaryColor(store.primary_color);
      if (store.animation_style) setAnimationStyle(store.animation_style);
    }
  }, [store]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await storesApi.update(storeId, {
        theme,
        primary_color: primaryColor,
        animation_style: animationStyle,
      });
    },
    onSuccess: () => {
      toast.success("Thème et style enregistrés !");
      queryClient.invalidateQueries({ queryKey: ["store", storeId] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      setPreviewKey((k) => k + 1);
    },
    onError: (err: any) => {
      console.error("Save theme error:", err);
      toast.error("Impossible d'enregistrer les styles du thème.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !store) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <h1 className="text-lg font-semibold text-red-200">Boutique introuvable</h1>
        <Link href="/dashboard/store" className="mt-4 inline-flex text-sm font-medium text-red-200 hover:underline">
          ← Retour à mes boutiques
        </Link>
      </div>
    );
  }

  const previewQuery = new URLSearchParams({
    color: primaryColor,
    theme,
    animation: animationStyle,
  }).toString();

  const previewUrl = `/preview/${store.id}?${previewQuery}`;

  const viewportWidth =
    viewport === "mobile" ? "max-w-[375px]" : viewport === "tablet" ? "max-w-[768px]" : "w-full";

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/store/${store.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-400" /> Studio de Design & Thème
            </h1>
            <p className="text-xs text-white/50">{store.name} — Personnalisation visuelle en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewport controls */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewport === "desktop" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              }`}
              title="Vue Bureau"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewport === "tablet" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              }`}
              title="Vue Tablette"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewport === "mobile" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
              }`}
              title="Vue Mobile"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> Plein écran
          </a>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Appliquer le thème
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio layout: Controls on left, Live Iframe on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Style Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Color Picker */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
              Couleur Maîtresse
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setPrimaryColor(col)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    primaryColor.toLowerCase() === col.toLowerCase()
                      ? "border-white scale-110 shadow-lg shadow-indigo-500/20"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: col }}
                  title={col}
                >
                  {primaryColor.toLowerCase() === col.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-7 w-7 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-xs text-white/60 uppercase">{primaryColor}</span>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
              Thème Visuel
            </label>
            <div className="space-y-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    theme === t.id
                      ? "border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      theme === t.id ? "border-indigo-400 bg-indigo-500" : "border-white/30"
                    }`}
                  >
                    {theme === t.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.label}</div>
                    <div className="text-[11px] text-white/50">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Animation Selector */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70">
              Style d&apos;Animation
            </label>
            <div className="space-y-2">
              {ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAnimationStyle(a.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    animationStyle === a.id
                      ? "border-indigo-500/60 bg-indigo-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      animationStyle === a.id ? "border-indigo-400 bg-indigo-500" : "border-white/30"
                    }`}
                  >
                    {animationStyle === a.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{a.label}</div>
                    <div className="text-[11px] text-white/50">{a.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Preview Frame */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            className={`w-full ${viewportWidth} rounded-2xl border border-white/10 bg-[#0f0f18] shadow-2xl overflow-hidden transition-all duration-300 flex flex-col`}
          >
            {/* Fake browser bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="rounded-md bg-white/[0.06] px-3 py-1 font-mono text-[10px] text-white/50 truncate max-w-[240px]">
                easytrade.dz/{store.slug}
              </div>
              <div className="text-[10px] text-white/30 capitalize">{viewport}</div>
            </div>

            {/* Iframe Viewport */}
            <div className="relative w-full h-[680px] bg-black/20">
              <iframe
                key={previewKey}
                src={previewUrl}
                title="Aperçu en direct"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
