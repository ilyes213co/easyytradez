"use client";

import React, { useState, useEffect } from "react";
import { Palette, X, Sparkles, Check } from "lucide-react";

interface ColorPalette {
  id: string;
  name: string;
  color: string;
  colorDark: string;
  colorLight: string;
  dotColor: string;
}

const PALETTES: ColorPalette[] = [
  {
    id: "royal-blue",
    name: "Bleu Royal DZ",
    color: "#2540ea",
    colorDark: "#1a2ca3",
    colorLight: "#93c5fd",
    dotColor: "#60a5fa",
  },
  {
    id: "electric-berry",
    name: "Berry Électrique",
    color: "#e1007a",
    colorDark: "#9d174d",
    colorLight: "#fbcfe8",
    dotColor: "#f472b6",
  },
  {
    id: "emerald-dz",
    name: "Émeraude DZ",
    color: "#10b981",
    colorDark: "#047857",
    colorLight: "#a7f3d0",
    dotColor: "#34d399",
  },
  {
    id: "saharan-amber",
    name: "Ambre Saharien",
    color: "#f59e0b",
    colorDark: "#b45309",
    colorLight: "#fde68a",
    dotColor: "#fbbf24",
  },
  {
    id: "digital-violet",
    name: "Violet Digital",
    color: "#8b5cf6",
    colorDark: "#5b21b6",
    colorLight: "#ddd6fe",
    dotColor: "#a78bfa",
  },
  {
    id: "med-cyan",
    name: "Cyan Méditerranée",
    color: "#06b6d4",
    colorDark: "#0e7490",
    colorLight: "#a5f3fc",
    dotColor: "#22d3ee",
  },
];

interface FontPairing {
  id: string;
  label: string;
  heading: string;
  body: string;
}

const FONT_PAIRINGS: FontPairing[] = [
  { id: "outfit-jakarta", label: "Outfit + Jakarta", heading: "Outfit", body: "Plus Jakarta Sans" },
  { id: "alexandria", label: "Alexandria (Bilingue)", heading: "Alexandria", body: "Alexandria" },
  { id: "readex", label: "Readex Pro (DZ)", heading: "Readex Pro", body: "Readex Pro" },
  { id: "cairo-jakarta", label: "Cairo + Jakarta", heading: "Cairo", body: "Plus Jakarta Sans" },
  { id: "urbanist-inter", label: "Urbanist + Inter", heading: "Urbanist", body: "Inter" },
  { id: "syne-jakarta", label: "Syne + Jakarta", heading: "Syne", body: "Plus Jakarta Sans" },
  { id: "space-dm", label: "Space + DM Sans", heading: "Space Grotesk", body: "DM Sans" },
  { id: "unbounded", label: "Unbounded (Impact)", heading: "Unbounded", body: "Plus Jakarta Sans" },
];

export default function StyleStudio() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePalette, setActivePalette] = useState("royal-blue");
  const [activeFont, setActiveFont] = useState("outfit-jakarta");

  // Load persisted theme on mount
  useEffect(() => {
    const savedPalette = localStorage.getItem("easytrade_theme_palette");
    const savedFont = localStorage.getItem("easytrade_theme_font");

    if (savedPalette) {
      const p = PALETTES.find((item) => item.id === savedPalette);
      if (p) applyPalette(p);
    }
    if (savedFont) {
      const f = FONT_PAIRINGS.find((item) => item.id === savedFont);
      if (f) applyFont(f);
    }
  }, []);

  const applyPalette = (palette: ColorPalette) => {
    setActivePalette(palette.id);
    document.documentElement.style.setProperty("--g", palette.color);
    document.documentElement.style.setProperty("--gd", palette.colorDark);
    document.documentElement.style.setProperty("--gl", palette.colorLight);
    document.documentElement.style.setProperty("--g-glow", `${palette.color}88`);
    document.documentElement.style.setProperty("--g-subtle", `${palette.color}33`);
    localStorage.setItem("easytrade_theme_palette", palette.id);

    // Notify 3D canvas
    window.dispatchEvent(
      new CustomEvent("easytrade-palette-change", {
        detail: { color: palette.color, lightColor: palette.colorLight },
      })
    );
  };

  const applyFont = (fontPair: FontPairing) => {
    setActiveFont(fontPair.id);
    document.documentElement.style.setProperty(
      "--font-heading",
      `'${fontPair.heading}', -apple-system, sans-serif`
    );
    document.documentElement.style.setProperty(
      "--font-body",
      `'${fontPair.body}', -apple-system, sans-serif`
    );
    localStorage.setItem("easytrade_theme_font", fontPair.id);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full text-white font-bold text-sm shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.28)",
          boxShadow: "0 12px 36px var(--g-glow, rgba(37, 64, 234, 0.6))",
        }}
        aria-label="Ouvrir le studio de style"
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span>Palette & Polices</span>
      </button>

      {/* Studio Drawer / Panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] max-h-[82vh] overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{
            background: "rgba(10, 14, 38, 0.96)",
            border: "1px solid rgba(96, 165, 250, 0.4)",
            boxShadow:
              "0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px var(--g-subtle, rgba(37, 64, 234, 0.25))",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--g-subtle, rgba(37, 64, 234, 0.25))" }}
              >
                <Palette className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base leading-tight">Studio de Style</h3>
                <p className="text-xs text-white/50">Personnalisez votre expérience</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: Palettes */}
          <div className="space-y-2.5 mb-6">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color: "var(--gl, #93c5fd)" }}
              >
                1. Palettes de Couleurs
              </span>
              <span className="text-[11px] text-white/40">6 thèmes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PALETTES.map((pal) => {
                const isSelected = activePalette === pal.id;
                return (
                  <button
                    key={pal.id}
                    onClick={() => applyPalette(pal)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-200"
                    style={{
                      background: isSelected
                        ? "rgba(37, 64, 234, 0.35)"
                        : "rgba(255, 255, 255, 0.05)",
                      border: isSelected
                        ? "1px solid var(--gl, #93c5fd)"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{
                        backgroundColor: pal.color,
                        boxShadow: `0 0 8px ${pal.dotColor}`,
                      }}
                    />
                    <span className="truncate flex-1">{pal.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Fonts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color: "var(--gl, #93c5fd)" }}
              >
                2. Modèles de Typographies
              </span>
              <span className="text-[11px] text-white/40">Bilingue & Modernes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FONT_PAIRINGS.map((fp) => {
                const isSelected = activeFont === fp.id;
                return (
                  <button
                    key={fp.id}
                    onClick={() => applyFont(fp)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-200"
                    style={{
                      background: isSelected
                        ? "rgba(37, 64, 234, 0.35)"
                        : "rgba(255, 255, 255, 0.05)",
                      border: isSelected
                        ? "1px solid var(--gl, #93c5fd)"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#ffffff",
                      fontFamily: `'${fp.heading}', sans-serif`,
                    }}
                  >
                    <span className="truncate">{fp.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
