"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, CheckCircle2 } from "lucide-react";
import EasyTradeLogo from "@/components/brand/EasyTradeLogo";
import ThreeAmbientScene from "@/components/brand/ThreeAmbientScene";
import StyleStudio from "@/components/brand/StyleStudio";

const TICKER_ITEMS = [
  "Paiement à la livraison",
  "Algérie · الجزائر",
  "Yalidine & ZR Express",
  "Comptabilité en DZD",
  "58 Wilayas couvertes",
  "Boutique 100% Mobile",
  "Certificat SSL Sécurisé",
  "Zéro Carte Bancaire requise",
  "Support Darija & Français",
  "Ouverture en 5 minutes",
];

const FEATURES = [
  {
    num: "01",
    title: "Paiement à la livraison",
    body: "Le standard incontournable en Algérie. Vos clients règlent en espèces à la remise du colis par le livreur. Zéro friction, confiance maximale.",
    tag: "Standard Algérie",
  },
  {
    num: "02",
    title: "IA intégrée",
    body: "Génération de boutiques stylées et fiches produits captivantes grâce à l'IA en moins d'une minute.",
    tag: "Intelligent",
  },
  {
    num: "03",
    title: "Livraison Intégrée",
    body: "Connectez Yalidine, Zr Express, Procolis et d'autres transporteurs en un clic. Génération automatique de bordereaux et tracking précis.",
    tag: "58 Wilayas",
  },
  {
    num: "04",
    title: "Déploiement rapide",
    body: "Votre boutique sera en ligne dans moins d'une minute, prête à recevoir des commandes et à convertir vos visiteurs.",
    tag: "< 60 secondes",
  },
  {
    num: "05",
    title: "100% Mobile-first",
    body: "9 commandes sur 10 se font sur smartphone en Algérie. Les vitrines sont calibrées pour se charger instantanément même en connexion 3G/4G.",
    tag: "Ultra-rapide",
  },
  {
    num: "06",
    title: "Protection Anti-Faux Ordres",
    body: "Certificat SSL inclus, filtres intelligents pour bloquer les commandes frauduleuses ou spams et infrastructure cloud toujours en ligne.",
    tag: "Sécurité Pro",
  },
];

const STATS = [
  { target: 99, suffix: "%", label: "Disponibilité garantie" },
  { target: 58, suffix: "", label: "Wilayas couvertes" },
  { target: 5, suffix: "min", label: "Pour ouvrir sa boutique" },
  { target: 0, suffix: " DZD", label: "Pour commencer" },
];

const STEPS = [
  {
    step: "Étape 01",
    title: "Créez votre compte en 60s",
    body: "Renseignez votre nom et numéro de téléphone. Votre boutique et son sous-domaine sont immédiatement configurés.",
  },
  {
    step: "Étape 02",
    title: "Ajoutez vos produits en DZD",
    body: "Importez vos photos, décrivez vos articles et fixez vos tarifs en dinars algériens en toute simplicité grâce à nos modèles.",
  },
  {
    step: "Étape 03",
    title: "Encaissez à la livraison",
    body: "Recevez vos premières commandes en direct, expédiez avec Yalidine ou ZR Express, et encaissez vos paiements en espèces.",
  },
];

export default function LandingPage() {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0]);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const animatedRef = useRef<boolean>(false);

  // Intersection Observer for animated counter
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const duration = 1800;
          const startTime = performance.now();

          const updateCounter = (currentTime: number) => {
            const elapsed = Math.min((currentTime - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - elapsed, 3);

            setCounts(STATS.map((s) => Math.round(easeOut * s.target)));

            if (elapsed < 1) {
              requestAnimationFrame(updateCounter);
            }
          };

          requestAnimationFrame(updateCounter);
        }
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Card cursor light glow effect
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mx", `${x.toFixed(1)}%`);
    card.style.setProperty("--my", `${y.toFixed(1)}%`);
  };

  return (
    <div className="min-h-screen bg-[#06060f] text-white selection:bg-[#2540ea] selection:text-white relative">
      {/* ── STICKY NAVIGATION ── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-2xl transition-colors duration-300"
        style={{
          background: "rgba(6, 6, 15, 0.84)",
          borderBottom: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
        }}
      >
        <EasyTradeLogo size={34} href="/" />

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-white/70">
          <a href="#features" className="hover:text-white transition-colors duration-200">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200">
            Comment ça marche
          </a>
          <a href="#stats" className="hover:text-white transition-colors duration-200">
            Statistiques
          </a>
        </div>

        {/* Right CTA buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-white/70 hover:text-white px-3.5 py-2 rounded-xl transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background:
                "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
              boxShadow: "0 8px 24px -4px var(--g-glow, rgba(37, 64, 234, 0.6))",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <span>Commencer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section
        id="hero"
        className="relative min-h-[86vh] flex items-center justify-center text-center px-4 pt-24 pb-20 md:pt-36 md:pb-28 overflow-hidden"
      >
        {/* Three.js 3D interactive ambient canvas */}
        <ThreeAmbientScene opacity={0.88} interactive={true} />

        {/* Radial subtle glowing overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 50% 45%, var(--g-subtle, rgba(37, 64, 234, 0.18)) 0%, transparent 72%),
              radial-gradient(ellipse at bottom, rgba(6, 6, 15, 1) 0%, transparent 65%)
            `,
          }}
          aria-hidden="true"
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-[920px] mx-auto space-y-7">
          {/* Top pill badge */}
          <div
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-bold text-[#bfdbfe] border backdrop-blur-md shadow-lg"
            style={{
              background: "rgba(37, 64, 234, 0.16)",
              borderColor: "rgba(96, 165, 250, 0.4)",
              boxShadow: "0 0 24px var(--g-subtle, rgba(37, 64, 234, 0.35))",
            }}
          >
            <span
              className="w-2 h-2 rounded-full bg-[#60a5fa]"
              style={{
                animation: "pulse-dot 2s ease infinite",
              }}
            />
            <span>Plateforme E-Commerce Algérie 🇩🇿 · En ligne en 5 minutes</span>
          </div>

          {/* Hero H1 */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.08]"
            style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
          >
            Votre boutique<br />en ligne,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #ffffff 0%, var(--gl, #93c5fd) 40%, var(--g, #2540ea) 90%)",
                filter: "drop-shadow(0 0 24px var(--g-glow, rgba(37, 64, 234, 0.5)))",
              }}
            >
              en 5 minutes.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-normal">
            Une infrastructure e-commerce tout-en-un pensée pour le marché algérien :
            paiement à la livraison (COD), intégration Yalidine & ZR Express, et boutique ultra-rapide sur mobile.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-white shadow-2xl transition-all duration-200 hover:-translate-y-1 hover:brightness-110"
              style={{
                background:
                  "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
                boxShadow: "0 14px 40px -8px var(--g-glow, rgba(37, 64, 234, 0.6))",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              <span>Créer ma boutique</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-semibold text-base text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "rgba(10, 14, 38, 0.75)",
                border: "1px solid var(--border, rgba(96, 165, 250, 0.4))",
                backdropFilter: "blur(16px)",
                boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.6)",
              }}
            >
              <span>Explorer la plateforme</span>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </a>
          </div>

          {/* Trust badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#60a5fa]" />
              <span>Zéro carte bancaire requise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#60a5fa]" />
              <span>Prêt pour Yalidine & ZR Express</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#60a5fa]" />
              <span>Comptabilité directe en DZD</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER BANNER (INFINITE SCROLL) ── */}
      <div
        className="overflow-hidden py-4 border-y"
        style={{
          borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
          background:
            "linear-gradient(90deg, rgba(10, 14, 38, 0.8) 0%, rgba(26, 44, 163, 0.15) 50%, rgba(10, 14, 38, 0.8) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="animate-marquee gap-8">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 text-sm font-semibold text-white/70 whitespace-nowrap">
              <span>{item}</span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: "var(--gl, #93c5fd)",
                  boxShadow: "0 0 8px var(--gl, #93c5fd)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES SECTION (6 CLEAN, HIGH-VISIBILITY CARDS) ── */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
        <div className="space-y-3 mb-14 text-center md:text-left">
          <span
            className="text-xs font-black uppercase tracking-[3px]"
            style={{
              color: "var(--gl, #93c5fd)",
              textShadow: "0 0 16px var(--g-glow, rgba(37, 64, 234, 0.6))",
            }}
          >
            Fonctionnalités
          </span>
          <h2
            className="text-3xl md:text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
          >
            Tout ce qu&apos;il faut<br />pour vendre en Algérie
          </h2>
          <p className="text-white/70 text-base md:text-lg max-w-2xl">
            Une infrastructure tout-en-un pensée pour le marché algérien, sans carte de crédit bancaire, sans complications techniques.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => (
            <div
              key={idx}
              onMouseMove={handleCardMouseMove}
              className="group relative rounded-3xl p-8 flex flex-col justify-between min-h-[250px] transition-all duration-300 hover:-translate-y-2 overflow-hidden"
              style={{
                background:
                  "linear-gradient(155deg, rgba(28, 44, 148, 0.35) 0%, rgba(10, 14, 38, 0.85) 100%)",
                border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
                boxShadow: "0 12px 36px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* Dynamic mouse cursor radial light */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), var(--g-glow, rgba(37, 64, 234, 0.5)) 0%, transparent 65%)",
                }}
              />

              {/* Glowing top accent border on hover */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, var(--gl, #93c5fd), var(--g, #2540ea), transparent)",
                }}
              />

              {/* Card top */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border text-white/80"
                  style={{
                    background: "rgba(37, 64, 234, 0.2)",
                    borderColor: "var(--border, rgba(96, 165, 250, 0.3))",
                  }}
                >
                  {feat.tag}
                </span>
                <span
                  className="text-2xl font-black transition-all duration-300 group-hover:scale-110"
                  style={{
                    color: "var(--gl, #60a5fa)",
                    fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
                  }}
                >
                  {feat.num}
                </span>
              </div>

              {/* Card body */}
              <div className="relative z-10 space-y-2">
                <h3
                  className="text-xl font-extrabold text-white tracking-tight"
                  style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed font-normal">{feat.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS BELT ── */}
      <div
        id="stats"
        ref={statsRef}
        className="py-16 px-6 border-y"
        style={{
          background:
            "linear-gradient(180deg, rgba(37, 64, 234, 0.18) 0%, rgba(10, 14, 38, 0.85) 100%)",
          borderColor: "rgba(96, 165, 250, 0.45)",
          boxShadow: "inset 0 0 40px var(--g-subtle, rgba(37, 64, 234, 0.22))",
        }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, idx) => (
            <div key={idx} className="space-y-2">
              <div
                className="text-4xl md:text-5xl font-black tracking-tight"
                style={{
                  color: "var(--gl, #93c5fd)",
                  fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
                  textShadow: "0 0 30px var(--g-glow, rgba(37, 64, 234, 0.6))",
                }}
              >
                {counts[idx]}
                {stat.suffix}
              </div>
              <div className="text-xs md:text-sm font-bold uppercase tracking-wider text-white/80">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS / STEPS ── */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
        <div className="space-y-3 mb-14 text-center">
          <span
            className="text-xs font-black uppercase tracking-[3px]"
            style={{
              color: "var(--gl, #93c5fd)",
              textShadow: "0 0 16px var(--g-glow, rgba(37, 64, 234, 0.6))",
            }}
          >
            Démarrage Express
          </span>
          <h2
            className="text-3xl md:text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
          >
            Comment ça marche ?
          </h2>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto">
            Trois étapes simples pour commencer à vendre en ligne partout en Algérie.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, idx) => (
            <div
              key={idx}
              className="relative rounded-3xl p-8 space-y-4 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden"
              style={{
                background:
                  "linear-gradient(155deg, rgba(28, 44, 148, 0.35) 0%, rgba(10, 14, 38, 0.85) 100%)",
                border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
                boxShadow: "0 12px 36px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.16)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Vertical glowing accent line on left */}
              <div
                className="absolute top-0 left-0 bottom-0 w-1"
                style={{
                  background:
                    "linear-gradient(180deg, var(--gl, #60a5fa), var(--g, #2540ea))",
                }}
              />

              <div
                className="inline-block text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg border text-[#bfdbfe]"
                style={{
                  background: "rgba(37, 64, 234, 0.26)",
                  borderColor: "rgba(147, 197, 253, 0.4)",
                  boxShadow: "0 0 12px var(--g-subtle, rgba(37, 64, 234, 0.3))",
                }}
              >
                {s.step}
              </div>

              <h3
                className="text-xl font-extrabold text-white tracking-tight"
                style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
              >
                {s.title}
              </h3>

              <p className="text-sm text-white/70 leading-relaxed font-normal">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION BOX ── */}
      <section className="py-20 px-6 max-w-4xl mx-auto relative z-10 text-center">
        <div
          className="rounded-[32px] p-10 md:p-16 relative overflow-hidden shadow-2xl"
          style={{
            background:
              "linear-gradient(155deg, rgba(28, 44, 148, 0.4) 0%, rgba(10, 14, 38, 0.9) 100%)",
            border: "1px solid rgba(96, 165, 250, 0.45)",
            boxShadow:
              "0 28px 70px -15px rgba(0, 0, 0, 0.8), 0 0 40px var(--g-subtle, rgba(37, 64, 234, 0.2))",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Radial glow dome */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[260px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, var(--g-glow, rgba(37, 64, 234, 0.6)) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 space-y-6">
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
            >
              Prêt à lancer<br />votre boutique ?
            </h2>

            <p className="text-white/70 text-base md:text-lg max-w-lg mx-auto">
              Rejoignez dès aujourd&apos;hui les marchands et créateurs qui développent leur commerce en Algérie.
            </p>

            <div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 px-9 py-4 rounded-2xl font-bold text-base text-white shadow-2xl transition-all duration-200 hover:-translate-y-1 hover:brightness-110"
                style={{
                  background:
                    "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
                  boxShadow: "0 14px 40px -8px var(--g-glow, rgba(37, 64, 234, 0.6))",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                }}
              >
                <span>Commencer maintenant</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-12 px-6 border-t text-center space-y-3 relative z-10"
        style={{
          borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
          background: "rgba(6, 6, 15, 0.95)",
        }}
      >
        <div className="text-2xl">🇩🇿</div>
        <p className="text-sm text-white/60">
          © 2026 <strong style={{ color: "var(--gl, #93c5fd)" }}>easytrade</strong> · Fait avec fierté à Oran, Algérie
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-white/40 pt-2">
          <Link href="/login" className="hover:text-white transition-colors">
            Connexion
          </Link>
          <Link href="/register" className="hover:text-white transition-colors">
            Inscription
          </Link>
          <a href="#features" className="hover:text-white transition-colors">
            Fonctionnalités
          </a>
        </div>
      </footer>

      {/* ── INTERACTIVE FLOATING STYLE STUDIO ── */}
      <StyleStudio />
    </div>
  );
}
