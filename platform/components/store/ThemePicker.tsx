"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeId     = "modern" | "luxury" | "minimal" | "colorful" | "tech" | "nature";
export type AnimationId = "none" | "soft" | "dynamic" | "spectacular";
export type EffectId    = "parallax" | "countdown" | "banner" | "badge_new" | "stock_counter";

export interface ThemeConfig {
  theme:      ThemeId;
  animation:  AnimationId;
  effects:    EffectId[];
}

interface Props {
  selectedTheme:     ThemeId;
  selectedAnimation: AnimationId;
  selectedEffects?:  EffectId[];
  storeId?:          string;
  primaryColor?:     string;
  onThemeSelect:     (theme: ThemeId) => void;
  onAnimationSelect: (animation: AnimationId) => void;
  onEffectsChange?:  (effects: EffectId[]) => void;
}

// ─── Theme definitions ────────────────────────────────────────────────────────

const THEMES: {
  id:       ThemeId;
  label:    string;
  desc:     string;
  popular?: boolean;
  svg:      React.ReactNode;
  accent:   string;
  bg:       string;
}[] = [
  {
    id: "modern", label: "Moderne", desc: "Épuré et professionnel", popular: true,
    accent: "#6366f1", bg: "#ffffff",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="180" height="120" fill="#ffffff"/>
        {/* Navbar */}
        <rect width="180" height="18" fill="#f8f8f8"/>
        <rect x="10" y="6" width="28" height="6" rx="2" fill="#6366f1"/>
        <rect x="120" y="6" width="14" height="6" rx="2" fill="#e5e7eb"/>
        <rect x="138" y="6" width="14" height="6" rx="2" fill="#e5e7eb"/>
        <rect x="156" y="6" width="14" height="6" rx="2" fill="#6366f1"/>
        {/* Hero */}
        <rect x="10" y="26" width="80" height="8" rx="2" fill="#111827"/>
        <rect x="10" y="38" width="60" height="5" rx="2" fill="#9ca3af"/>
        <rect x="10" y="47" width="40" height="5" rx="2" fill="#9ca3af"/>
        <rect x="10" y="58" width="28" height="10" rx="3" fill="#6366f1"/>
        {/* Hero image */}
        <rect x="105" y="22" width="65" height="55" rx="6" fill="#f3f4f6"/>
        <rect x="115" y="32" width="45" height="35" rx="4" fill="#e5e7eb"/>
        <circle cx="137" cy="46" r="10" fill="#d1d5db"/>
        {/* Product grid */}
        <rect x="10" y="85" width="48" height="28" rx="4" fill="#f9fafb"/>
        <rect x="66" y="85" width="48" height="28" rx="4" fill="#f9fafb"/>
        <rect x="122" y="85" width="48" height="28" rx="4" fill="#f9fafb"/>
        <rect x="15" y="104" width="25" height="4" rx="1" fill="#374151"/>
        <rect x="71" y="104" width="25" height="4" rx="1" fill="#374151"/>
        <rect x="127" y="104" width="25" height="4" rx="1" fill="#374151"/>
        <rect x="15" y="110" width="16" height="3" rx="1" fill="#6366f1"/>
        <rect x="71" y="110" width="16" height="3" rx="1" fill="#6366f1"/>
        <rect x="127" y="110" width="16" height="3" rx="1" fill="#6366f1"/>
      </svg>
    ),
  },
  {
    id: "luxury", label: "Luxe", desc: "Élégant et raffiné", popular: true,
    accent: "#d4af37", bg: "#0f0a00",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        <rect width="180" height="120" fill="#0d0a05"/>
        {/* Gold top border */}
        <rect width="180" height="2" fill="#d4af37"/>
        {/* Navbar */}
        <rect width="180" height="18" fill="#110e07"/>
        <rect x="10" y="6" width="30" height="6" rx="1" fill="#d4af37"/>
        <rect x="126" y="7" width="12" height="4" rx="1" fill="#8b7536"/>
        <rect x="142" y="7" width="12" height="4" rx="1" fill="#8b7536"/>
        <rect x="158" y="7" width="12" height="4" rx="1" fill="#d4af37"/>
        {/* Decorative line */}
        <line x1="10" y1="24" x2="170" y2="24" stroke="#d4af37" strokeWidth="0.5" opacity="0.4"/>
        {/* Hero text */}
        <rect x="40" y="30" width="100" height="7" rx="1" fill="#d4af37"/>
        <rect x="55" y="41" width="70" height="4" rx="1" fill="#8b7536"/>
        <rect x="65" y="49" width="50" height="4" rx="1" fill="#5a4c24"/>
        {/* Divider */}
        <rect x="80" y="57" width="20" height="1" fill="#d4af37"/>
        {/* CTA */}
        <rect x="62" y="62" width="56" height="10" rx="0" fill="none" stroke="#d4af37" strokeWidth="1"/>
        <rect x="65" y="65" width="50" height="4" rx="1" fill="#d4af37"/>
        {/* Product cards */}
        <rect x="10" y="80" width="48" height="34" rx="2" fill="#1a1408"/>
        <rect x="66" y="80" width="48" height="34" rx="2" fill="#1a1408"/>
        <rect x="122" y="80" width="48" height="34" rx="2" fill="#1a1408"/>
        <rect x="10" y="80" width="48" height="20" rx="2" fill="#251d0c"/>
        <rect x="66" y="80" width="48" height="20" rx="2" fill="#251d0c"/>
        <rect x="122" y="80" width="48" height="20" rx="2" fill="#251d0c"/>
        <rect x="15" y="102" width="28" height="3" rx="1" fill="#8b7536"/>
        <rect x="71" y="102" width="28" height="3" rx="1" fill="#8b7536"/>
        <rect x="127" y="102" width="28" height="3" rx="1" fill="#8b7536"/>
        <rect x="15" y="107" width="18" height="3" rx="1" fill="#d4af37"/>
        <rect x="71" y="107" width="18" height="3" rx="1" fill="#d4af37"/>
        <rect x="127" y="107" width="18" height="3" rx="1" fill="#d4af37"/>
        {/* Gold bottom border */}
        <rect y="118" width="180" height="2" fill="#d4af37"/>
      </svg>
    ),
  },
  {
    id: "minimal", label: "Minimaliste", desc: "Simple et aéré",
    accent: "#000000", bg: "#fafafa",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        <rect width="180" height="120" fill="#fafafa"/>
        {/* Thin navbar */}
        <rect width="180" height="14" fill="#fafafa"/>
        <line x1="0" y1="14" x2="180" y2="14" stroke="#e5e5e5" strokeWidth="0.8"/>
        <rect x="10" y="4" width="20" height="6" rx="1" fill="#111"/>
        <rect x="148" y="5" width="10" height="4" rx="1" fill="#888"/>
        <rect x="162" y="5" width="10" height="4" rx="1" fill="#111"/>
        {/* Big headline */}
        <rect x="10" y="24" width="100" height="9" rx="1" fill="#111"/>
        <rect x="10" y="37" width="70" height="5" rx="1" fill="#ccc"/>
        <rect x="10" y="46" width="50" height="5" rx="1" fill="#ccc"/>
        {/* Minimal CTA */}
        <rect x="10" y="56" width="34" height="9" rx="0" fill="#111"/>
        <rect x="13" y="59" width="28" height="3" rx="1" fill="#fff"/>
        {/* Single accent line */}
        <rect x="10" y="72" width="40" height="2" fill="#111"/>
        {/* Product row - minimal */}
        <rect x="10" y="82" width="50" height="32" rx="0" fill="#f0f0f0"/>
        <rect x="68" y="82" width="50" height="32" rx="0" fill="#f0f0f0"/>
        <rect x="126" y="82" width="50" height="32" rx="0" fill="#f0f0f0"/>
        <rect x="14" y="106" width="28" height="3" rx="0" fill="#333"/>
        <rect x="72" y="106" width="28" height="3" rx="0" fill="#333"/>
        <rect x="130" y="106" width="28" height="3" rx="0" fill="#333"/>
      </svg>
    ),
  },
  {
    id: "colorful", label: "Coloré", desc: "Vibrant et énergique", popular: true,
    accent: "#f059da", bg: "#0f0624",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        {/* Gradient background */}
        <defs>
          <linearGradient id="cBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f0624"/>
            <stop offset="100%" stopColor="#1a0533"/>
          </linearGradient>
          <linearGradient id="cHero" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f059da"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
          <linearGradient id="cCard1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f059da" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1"/>
          </linearGradient>
          <linearGradient id="cCard2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
          </linearGradient>
          <linearGradient id="cCard3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        <rect width="180" height="120" fill="url(#cBg)"/>
        {/* Glowing circles */}
        <circle cx="150" cy="30" r="30" fill="#f059da" opacity="0.08"/>
        <circle cx="20" cy="80" r="25" fill="#06b6d4" opacity="0.08"/>
        {/* Navbar */}
        <rect width="180" height="16" fill="rgba(255,255,255,0.05)"/>
        <rect x="10" y="5" width="24" height="6" rx="3" fill="url(#cHero)"/>
        <rect x="152" y="5" width="18" height="6" rx="3" fill="url(#cHero)"/>
        {/* Hero */}
        <rect x="10" y="24" width="90" height="8" rx="2" fill="#fff"/>
        <rect x="10" y="36" width="65" height="4" rx="2" fill="rgba(255,255,255,0.4)"/>
        <rect x="10" y="46" width="32" height="10" rx="5" fill="url(#cHero)"/>
        <rect x="46" y="46" width="32" height="10" rx="5" fill="none" stroke="#f059da" strokeWidth="1"/>
        {/* Cards */}
        <rect x="10" y="64" width="50" height="50" rx="8" fill="url(#cCard1)" stroke="#f059da" strokeWidth="0.5"/>
        <rect x="66" y="64" width="50" height="50" rx="8" fill="url(#cCard2)" stroke="#06b6d4" strokeWidth="0.5"/>
        <rect x="122" y="64" width="50" height="50" rx="8" fill="url(#cCard3)" stroke="#f59e0b" strokeWidth="0.5"/>
        <rect x="15" y="98" width="30" height="4" rx="2" fill="rgba(255,255,255,0.7)"/>
        <rect x="71" y="98" width="30" height="4" rx="2" fill="rgba(255,255,255,0.7)"/>
        <rect x="127" y="98" width="30" height="4" rx="2" fill="rgba(255,255,255,0.7)"/>
        <rect x="15" y="105" width="20" height="4" rx="2" fill="#f059da"/>
        <rect x="71" y="105" width="20" height="4" rx="2" fill="#06b6d4"/>
        <rect x="127" y="105" width="20" height="4" rx="2" fill="#f59e0b"/>
      </svg>
    ),
  },
  {
    id: "tech", label: "Tech", desc: "Futuriste et high-tech",
    accent: "#00f5ff", bg: "#050d1a",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#050d1a"/>
            <stop offset="100%" stopColor="#0a1628"/>
          </linearGradient>
        </defs>
        <rect width="180" height="120" fill="url(#tBg)"/>
        {/* Grid lines */}
        <line x1="0" y1="30" x2="180" y2="30" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        <line x1="0" y1="60" x2="180" y2="60" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        <line x1="0" y1="90" x2="180" y2="90" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        <line x1="45" y1="0" x2="45" y2="120" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        <line x1="90" y1="0" x2="90" y2="120" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        <line x1="135" y1="0" x2="135" y2="120" stroke="#00f5ff" strokeWidth="0.2" opacity="0.15"/>
        {/* Navbar */}
        <rect width="180" height="16" fill="rgba(0,245,255,0.05)"/>
        <rect x="0" y="15.5" width="180" height="0.5" fill="#00f5ff" opacity="0.3"/>
        <rect x="10" y="5" width="22" height="6" rx="1" fill="#00f5ff" opacity="0.9"/>
        <rect x="148" y="6" width="10" height="4" rx="1" fill="#00f5ff" opacity="0.4"/>
        <rect x="162" y="6" width="10" height="4" rx="1" fill="#00f5ff"/>
        {/* Glowing hero title */}
        <rect x="10" y="25" width="85" height="8" rx="1" fill="#00f5ff" opacity="0.9"/>
        <rect x="10" y="37" width="60" height="4" rx="1" fill="#00f5ff" opacity="0.3"/>
        <rect x="10" y="45" width="40" height="4" rx="1" fill="#00f5ff" opacity="0.2"/>
        {/* Neon CTA */}
        <rect x="10" y="54" width="36" height="9" rx="2" fill="none" stroke="#00f5ff" strokeWidth="1"/>
        <rect x="13" y="57" width="30" height="3" rx="1" fill="#00f5ff" opacity="0.8"/>
        {/* Corner decoration */}
        <polyline points="160,20 170,20 170,30" fill="none" stroke="#00f5ff" strokeWidth="1" opacity="0.6"/>
        <polyline points="10,105 10,115 20,115" fill="none" stroke="#00f5ff" strokeWidth="1" opacity="0.6"/>
        {/* Product cards */}
        <rect x="10" y="72" width="48" height="40" rx="3" fill="rgba(0,245,255,0.04)" stroke="#00f5ff" strokeWidth="0.6"/>
        <rect x="66" y="72" width="48" height="40" rx="3" fill="rgba(0,245,255,0.04)" stroke="#00f5ff" strokeWidth="0.6"/>
        <rect x="122" y="72" width="48" height="40" rx="3" fill="rgba(0,245,255,0.04)" stroke="#00f5ff" strokeWidth="0.6"/>
        <rect x="14" y="76" width="40" height="24" rx="2" fill="rgba(0,245,255,0.08)"/>
        <rect x="70" y="76" width="40" height="24" rx="2" fill="rgba(0,245,255,0.08)"/>
        <rect x="126" y="76" width="40" height="24" rx="2" fill="rgba(0,245,255,0.08)"/>
        <rect x="14" y="103" width="25" height="3" rx="1" fill="#00f5ff" opacity="0.5"/>
        <rect x="70" y="103" width="25" height="3" rx="1" fill="#00f5ff" opacity="0.5"/>
        <rect x="126" y="103" width="25" height="3" rx="1" fill="#00f5ff" opacity="0.5"/>
        <rect x="14" y="108" width="16" height="3" rx="1" fill="#00f5ff"/>
        <rect x="70" y="108" width="16" height="3" rx="1" fill="#00f5ff"/>
        <rect x="126" y="108" width="16" height="3" rx="1" fill="#00f5ff"/>
      </svg>
    ),
  },
  {
    id: "nature", label: "Nature", desc: "Organique et chaleureux",
    accent: "#4d7c0f", bg: "#faf7f0",
    svg: (
      <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="nBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#faf7f0"/>
            <stop offset="100%" stopColor="#f5f0e8"/>
          </linearGradient>
        </defs>
        <rect width="180" height="120" fill="url(#nBg)"/>
        {/* Organic shapes */}
        <ellipse cx="160" cy="20" rx="30" ry="20" fill="#d9f0c4" opacity="0.5"/>
        <ellipse cx="15" cy="95" rx="22" ry="16" fill="#d9f0c4" opacity="0.4"/>
        {/* Navbar */}
        <rect width="180" height="16" fill="rgba(255,255,255,0.7)"/>
        <rect x="10" y="5" width="22" height="6" rx="3" fill="#4d7c0f"/>
        <rect x="148" y="6" width="10" height="4" rx="2" fill="#a3b899"/>
        <rect x="162" y="6" width="10" height="4" rx="3" fill="#4d7c0f"/>
        {/* Leaf decoration */}
        <ellipse cx="170" cy="45" rx="10" ry="16" fill="#86efac" opacity="0.3" transform="rotate(-30 170 45)"/>
        {/* Hero */}
        <rect x="10" y="24" width="80" height="8" rx="4" fill="#1a3308"/>
        <rect x="10" y="36" width="60" height="4" rx="2" fill="#6b7c63"/>
        <rect x="10" y="44" width="45" height="4" rx="2" fill="#6b7c63"/>
        {/* Organic CTA */}
        <rect x="10" y="53" width="38" height="10" rx="5" fill="#4d7c0f"/>
        <rect x="13" y="56" width="32" height="4" rx="2" fill="rgba(255,255,255,0.8)"/>
        {/* Product cards - organic/rounded */}
        <rect x="10" y="72" width="48" height="42" rx="12" fill="#fff" stroke="#e8e0d0" strokeWidth="1"/>
        <rect x="66" y="72" width="48" height="42" rx="12" fill="#fff" stroke="#e8e0d0" strokeWidth="1"/>
        <rect x="122" y="72" width="48" height="42" rx="12" fill="#fff" stroke="#e8e0d0" strokeWidth="1"/>
        <rect x="14" y="76" width="40" height="22" rx="8" fill="#d9f0c4"/>
        <rect x="70" y="76" width="40" height="22" rx="8" fill="#fde68a" opacity="0.5"/>
        <rect x="126" y="76" width="40" height="22" rx="8" fill="#d9f0c4"/>
        <rect x="15" y="102" width="28" height="3" rx="2" fill="#374151"/>
        <rect x="71" y="102" width="28" height="3" rx="2" fill="#374151"/>
        <rect x="127" y="102" width="28" height="3" rx="2" fill="#374151"/>
        <rect x="15" y="108" width="18" height="3" rx="2" fill="#4d7c0f"/>
        <rect x="71" y="108" width="18" height="3" rx="2" fill="#4d7c0f"/>
        <rect x="127" y="108" width="18" height="3" rx="2" fill="#4d7c0f"/>
      </svg>
    ),
  },
];

const ANIMATIONS: { id: AnimationId; label: string; icon: string; desc: string }[] = [
  { id: "none",        icon: "⏸", label: "Aucune",        desc: "Statique, rapide" },
  { id: "soft",        icon: "🌊", label: "Douce",         desc: "Fondus élégants" },
  { id: "dynamic",     icon: "⚡", label: "Dynamique",     desc: "Slides et zooms" },
  { id: "spectacular", icon: "✨", label: "Spectaculaire", desc: "Effets 3D" },
];

const EFFECTS: { id: EffectId; label: string; desc: string; icon: string }[] = [
  { id: "parallax",      icon: "🖼",  label: "Parallax hero",          desc: "Effet de profondeur au scroll" },
  { id: "countdown",     icon: "⏱",  label: "Compteur de réduction",  desc: "Urgence : offre expire dans..." },
  { id: "banner",        icon: "📢",  label: "Bannière défilante",     desc: "Message promotionnel en haut" },
  { id: "badge_new",     icon: "🆕",  label: "Badge Nouveau",          desc: "Sur les produits récents" },
  { id: "stock_counter", icon: "📦",  label: "Compteur de stock",      desc: "\"Plus que 3 en stock !\"" },
];

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview({
  storeId, theme, animation, effects, primaryColor,
}: {
  storeId?:     string;
  theme:        ThemeId;
  animation:    AnimationId;
  effects:      EffectId[];
  primaryColor?: string;
}) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setKey(k => k + 1), 300);
    return () => clearTimeout(t);
  }, [theme, animation, effects, primaryColor]);

  const params = new URLSearchParams({
    theme,
    animation,
    effects: effects.join(","),
    ...(primaryColor ? { color: primaryColor } : {}),
  });

  const previewUrl = storeId
    ? `/preview/${storeId}?${params}`
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Prévisualisation mobile</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/40">Live</span>
        </div>
      </div>

      {/* Phone frame */}
      <div className="mx-auto relative">
        {/* Phone outer */}
        <div className="relative w-[180px] bg-[#1a1a2e] rounded-[28px] p-[6px] shadow-2xl border border-white/10">
          {/* Notch */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1a1a2e] rounded-b-xl z-10 flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <div className="w-6 h-1.5 rounded-full bg-white/10" />
          </div>
          {/* Screen */}
          <div className="bg-white rounded-[22px] overflow-hidden" style={{ height: "360px" }}>
            {previewUrl ? (
              <iframe
                key={key}
                src={previewUrl}
                className="w-full h-full border-0 scale-[0.85] origin-top"
                style={{ width: "212px", marginLeft: "-16px" }}
                title="Aperçu boutique"
              />
            ) : (
              <MockPreview theme={theme} primaryColor={primaryColor} />
            )}
          </div>
          {/* Home bar */}
          <div className="flex justify-center mt-1.5">
            <div className="w-16 h-1 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Theme info pill */}
      <div className="mx-auto flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEMES.find(t => t.id === theme)?.accent }} />
        <span className="text-xs text-white/60 font-medium">
          {THEMES.find(t => t.id === theme)?.label} · {ANIMATIONS.find(a => a.id === animation)?.label}
        </span>
      </div>
    </div>
  );
}

// Mock preview when no storeId
function MockPreview({ theme, primaryColor }: { theme: ThemeId; primaryColor?: string }) {
  const t = THEMES.find(x => x.id === theme)!;
  const accent = primaryColor || t.accent;
  const isDark = ["luxury", "tech", "colorful"].includes(theme);

  return (
    <div className="w-full h-full overflow-hidden" style={{ backgroundColor: t.bg }}>
      {/* Mock navbar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
      >
        <div className="w-12 h-2.5 rounded" style={{ backgroundColor: accent }} />
        <div className="flex gap-1.5">
          <div className="w-5 h-2 rounded opacity-40" style={{ backgroundColor: isDark ? "#fff" : "#000" }} />
          <div className="w-5 h-2 rounded" style={{ backgroundColor: accent }} />
        </div>
      </div>

      {/* Mock hero */}
      <div className="px-3 pt-4 pb-2">
        <div className="w-3/4 h-3 rounded mb-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.9)" : "#111" }} />
        <div className="w-1/2 h-2 rounded mb-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.3)" : "#999" }} />
        <div className="w-2/5 h-2 rounded mb-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#bbb" }} />
        <div className="w-20 h-6 rounded-lg" style={{ backgroundColor: accent }} />
      </div>

      {/* Divider */}
      <div className="mx-3 my-2 h-px" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#eee" }} />

      {/* Mock products */}
      <div className="grid grid-cols-2 gap-2 px-3 py-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-lg overflow-hidden"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#eee"}`,
            }}
          >
            <div className="h-14" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#e8e8e8" }} />
            <div className="p-1.5">
              <div className="w-full h-1.5 rounded mb-1" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.4)" : "#ccc" }} />
              <div className="w-2/3 h-1.5 rounded" style={{ backgroundColor: accent, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ThemePicker({
  selectedTheme,
  selectedAnimation,
  selectedEffects = [],
  storeId,
  primaryColor,
  onThemeSelect,
  onAnimationSelect,
  onEffectsChange,
}: Props) {
  const toggleEffect = useCallback((id: EffectId) => {
    if (!onEffectsChange) return;
    const next = selectedEffects.includes(id)
      ? selectedEffects.filter(e => e !== id)
      : [...selectedEffects, id];
    onEffectsChange(next);
  }, [selectedEffects, onEffectsChange]);

  return (
    <div className="grid lg:grid-cols-[1fr_200px] gap-6 w-full">

      {/* Left — Controls */}
      <div className="space-y-7">

        {/* ── Themes ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Thème de la boutique</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map(t => {
              const active = selectedTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onThemeSelect(t.id)}
                  className={[
                    "relative rounded-2xl overflow-hidden border-2 text-left transition-all duration-200 group",
                    active
                      ? "border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]"
                      : "border-white/[0.07] hover:border-white/20 hover:scale-[1.01]",
                  ].join(" ")}
                >
                  {/* SVG miniature */}
                  <div className="w-full aspect-[180/120] overflow-hidden">
                    {t.svg}
                  </div>

                  {/* Info bar */}
                  <div className={[
                    "px-3 py-2 transition-colors",
                    active ? "bg-indigo-500/20" : "bg-white/[0.03]",
                  ].join(" ")}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-xs font-semibold">{t.label}</span>
                      {t.popular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20 leading-none">
                          Populaire
                        </span>
                      )}
                    </div>
                    <p className="text-white/35 text-[10px] mt-0.5 leading-tight">{t.desc}</p>
                  </div>

                  {/* Accent dot */}
                  <div
                    className="absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white/40 shadow-sm"
                    style={{ backgroundColor: t.accent }}
                  />

                  {/* Check badge */}
                  {active && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Animations ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Animations</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ANIMATIONS.map(a => {
              const active = selectedAnimation === a.id;
              return (
                <label
                  key={a.id}
                  className={[
                    "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    active
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/[0.07] hover:border-white/20",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="animation"
                    value={a.id}
                    checked={active}
                    onChange={() => onAnimationSelect(a.id)}
                    className="sr-only"
                  />
                  <span className="text-2xl">{a.icon}</span>
                  <div className="text-center">
                    <p className={`text-xs font-semibold ${active ? "text-indigo-300" : "text-white/70"}`}>
                      {a.label}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{a.desc}</p>
                  </div>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-400" />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* ── Special effects ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Effets spéciaux</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
            {selectedEffects.length > 0 && (
              <span className="text-xs text-indigo-400 font-medium">
                {selectedEffects.length} actif{selectedEffects.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {EFFECTS.map(e => {
              const active = selectedEffects.includes(e.id);
              return (
                <label
                  key={e.id}
                  className={[
                    "flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all",
                    active
                      ? "border-indigo-500/60 bg-indigo-500/8"
                      : "border-white/[0.07] hover:border-white/15",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleEffect(e.id)}
                    className="sr-only"
                  />
                  {/* Custom checkbox */}
                  <div className={[
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                    active
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-white/20 bg-white/5",
                  ].join(" ")}>
                    {active && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-base">{e.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>
                      {e.label}
                    </p>
                    <p className="text-xs text-white/30 truncate">{e.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right — Live preview */}
      <div className="lg:sticky lg:top-6 h-fit">
        <LivePreview
          storeId={storeId}
          theme={selectedTheme}
          animation={selectedAnimation}
          effects={selectedEffects}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  );
}
