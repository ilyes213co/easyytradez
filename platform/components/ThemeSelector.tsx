"use client";

import React, { useState } from "react";
import type { ThemeName } from "@/types/product";

export interface ThemeOption {
  id: ThemeName;
  name: string;
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

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "monochrome",
    name: "Monochrome",
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
    name: "Bleu Royal DZ (easytrade)",
    tagline: "Bleu royal d'élite, sapphire profond et contrastes nets",
    category: "Officiel / E-Commerce Algérie / Élite",
    fonts: "Outfit & Plus Jakarta Sans",
    bg: "#06060f",
    surface: "#0e1328",
    text: "#ffffff",
    accent: "#2540ea",
    accentText: "#ffffff",
    border: "rgba(96, 165, 250, 0.3)",
    borderRadius: "14px",
    isDark: true,
  },
  {
    id: "neo-brutalist",
    name: "Neo-Brutalist",
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

interface ThemeSelectorProps {
  storeId: string;
  initialTheme?: ThemeName;
  onThemeChanged?: (theme: ThemeName) => void;
  apiBaseUrl?: string;
}

export function ThemeSelector({
  storeId,
  initialTheme = "monochrome",
  onThemeChanged,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const applyTheme = async (themeId: ThemeName) => {
    if (saving || selectedTheme === themeId) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/stores/${storeId}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur serveur (${res.status})`);
      }

      setSelectedTheme(themeId);
      setMessage({
        text: `Thème « ${THEME_OPTIONS.find((t) => t.id === themeId)?.name} » appliqué !`,
        type: "success",
      });
      onThemeChanged?.(themeId);
    } catch (err: any) {
      setMessage({
        text: err.message || "Impossible d'appliquer le thème.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between transition-all ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {THEME_OPTIONS.map((theme) => {
          const isCurrent = selectedTheme === theme.id;

          return (
            <div
              key={theme.id}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isCurrent
                  ? "border-[#2540ea] ring-2 ring-[#2540ea]/30 bg-[#2540ea]/[0.06] shadow-lg shadow-[rgba(37,64,234,0.25)]"
                  : "border-white/[0.08] hover:border-[#60a5fa]/50 bg-white/[0.02]"
              }`}
            >
              {/* Card visual mockup */}
              <div
                className="p-5 border-b"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                    {theme.category}
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">
                      Actif
                    </span>
                  )}
                </div>

                <div className="text-lg font-bold tracking-tight mb-3">
                  {theme.name}
                </div>

                {/* Mock preview card */}
                <div
                  className="p-3.5 rounded-lg border shadow-sm space-y-2.5"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderRadius: theme.borderRadius,
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Produit Exemple</span>
                    <span style={{ color: theme.accent }}>3 500 DZD</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: theme.surface }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10"
                      style={{ backgroundColor: theme.text }}
                    />
                  </div>

                  <div
                    className="w-full text-center py-1.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.accentText,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    Commander
                  </div>
                </div>
              </div>

              {/* Card details & action */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-white/70 line-clamp-2">{theme.tagline}</p>
                  <div className="text-[11px] text-white/40">
                    Police : <span className="text-white/60">{theme.fonts}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving || isCurrent}
                  onClick={() => applyTheme(theme.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                      : "bg-white/[0.06] hover:bg-[#2540ea] text-white border border-white/10 hover:border-[#60a5fa] hover:shadow-lg hover:shadow-[rgba(37,64,234,0.3)]"
                  }`}
                >
                  {isCurrent ? "✓ Thème Actif" : saving ? "Application..." : "Appliquer ce thème"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSelector;
