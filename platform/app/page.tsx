"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useThree } from "@/lib/useThree";

const PALETTES = [
  { name: "Bleu Royal DZ", color: "#2540ea", colord: "#1a2ca3", colorl: "#93c5fd", dot: "#2540ea", dotBorder: "#60a5fa" },
  { name: "Berry Électrique", color: "#e1007a", colord: "#9d174d", colorl: "#fbcfe8", dot: "#e1007a", dotBorder: "#f472b6" },
  { name: "Émeraude DZ", color: "#10b981", colord: "#047857", colorl: "#a7f3d0", dot: "#10b981", dotBorder: "#34d399" },
  { name: "Ambre Saharien", color: "#f59e0b", colord: "#b45309", colorl: "#fde68a", dot: "#f59e0b", dotBorder: "#fbbf24" },
  { name: "Violet Digital", color: "#8b5cf6", colord: "#5b21b6", colorl: "#ddd6fe", dot: "#8b5cf6", dotBorder: "#a78bfa" },
  { name: "Cyan Méditerranée", color: "#06b6d4", colord: "#0e7490", colorl: "#a5f3fc", dot: "#06b6d4", dotBorder: "#22d3ee" },
];

const FONTS = [
  { name: "Outfit + Jakarta", h: "Outfit", b: "Plus Jakarta Sans" },
  { name: "Alexandria (Bilingue)", h: "Alexandria", b: "Alexandria" },
  { name: "Readex Pro (DZ)", h: "Readex Pro", b: "Readex Pro" },
  { name: "Cairo + Jakarta", h: "Cairo", b: "Plus Jakarta Sans" },
  { name: "Urbanist + Inter", h: "Urbanist", b: "Inter" },
  { name: "Syne + Jakarta", h: "Syne", b: "Plus Jakarta Sans" },
  { name: "Space + DM Sans", h: "Space Grotesk", b: "DM Sans" },
  { name: "Unbounded (Impact)", h: "Unbounded", b: "Plus Jakarta Sans" },
];

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

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const updateThreeColorRef = useRef<((hex: string) => void) | null>(null);

  const [activePalette, setActivePalette] = useState(0);
  const [activeFont, setActiveFont] = useState(0);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const threeLoaded = useThree();

  // ─── Initialisation Three.js ───────────────────────────────────────────────
  useEffect(() => {
    if (!threeLoaded || !canvasRef.current || !heroRef.current) return;
    const THREE = window.THREE;
    if (!THREE) return;

    const hero = heroRef.current;
    const canvas = canvasRef.current;

    const W = () => hero.clientWidth || window.innerWidth;
    const H = () => hero.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 1000);
    camera.position.z = 6.2;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Matériaux réactifs à la couleur
    const knotMat = new THREE.MeshBasicMaterial({ color: 0x2540ea, wireframe: true, transparent: true, opacity: 0.35 });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.1, 0.5, 128, 20), knotMat);
    scene.add(knot);

    const icoMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true, transparent: true, opacity: 0.09 });
    const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(3.5, 1), icoMat);
    scene.add(ico);

    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.25 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 20), sphereMat);
    scene.add(sphere);

    // Particules stellaires
    const N = 1800;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 24;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const ptsMat = new THREE.PointsMaterial({ size: 0.025, color: 0xffffff, transparent: true, opacity: 0.45 });
    const pts = new THREE.Points(pGeo, ptsMat);
    scene.add(pts);

    updateThreeColorRef.current = (hexStr: string) => {
      const col = new THREE.Color(hexStr);
      knotMat.color = col;
      sphereMat.color = col;
    };

    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMouseMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 1.5;
      ty = -(e.clientY / window.innerHeight - 0.5) * 1.5;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        tx = (e.touches[0].clientX / window.innerWidth - 0.5) * 1.2;
        ty = -(e.touches[0].clientY / window.innerHeight - 0.5) * 1.2;
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    let animId = 0;
    let f = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      f += 0.005;
      knot.rotation.x = f * 0.35;
      knot.rotation.y = f * 0.52;
      ico.rotation.x = -f * 0.12;
      ico.rotation.y = f * 0.16;
      sphere.rotation.y = f * 0.4;
      pts.rotation.y = f * 0.03;

      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      camera.position.x = cx;
      camera.position.y = cy;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [threeLoaded]);

  // ─── IntersectionObserver pour apparition & compteurs ──────────────────────
  useEffect(() => {
    function countUp(el: HTMLElement, target: number, suffix: string) {
      const start = performance.now();
      const dur = 1800;
      function frame(now: number) {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(ease * target).toLocaleString("fr-DZ") + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          e.target.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
            if (el.dataset.done) return;
            el.dataset.done = "1";
            countUp(el, Number(el.dataset.t), el.dataset.s || "");
          });
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".r").forEach((el) => obs.observe(el));

    // Lueur volumétrique sur fcard
    const cards = document.querySelectorAll<HTMLElement>(".fcard");
    const cleanups: (() => void)[] = [];
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", (((e.clientX - rect.left) / rect.width) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (((e.clientY - rect.top) / rect.height) * 100).toFixed(1) + "%");
      };
      card.addEventListener("mousemove", handler);
      cleanups.push(() => card.removeEventListener("mousemove", handler));
    });

    return () => {
      obs.disconnect();
      cleanups.forEach((c) => c());
    };
  }, []);

  // ─── Changement Palette ───────────────────────────────────────────────────
  const applyPalette = (index: number) => {
    const p = PALETTES[index];
    if (!p) return;
    setActivePalette(index);
    const root = document.documentElement;
    root.style.setProperty("--g", p.color);
    root.style.setProperty("--gd", p.colord);
    root.style.setProperty("--gl", p.colorl);
    root.style.setProperty("--g-glow", p.color + "88");
    root.style.setProperty("--g-subtle", p.color + "33");

    if (updateThreeColorRef.current) {
      updateThreeColorRef.current(p.color);
    }
  };

  // ─── Changement Typographie ───────────────────────────────────────────────
  const applyFont = (index: number) => {
    const f = FONTS[index];
    if (!f) return;
    setActiveFont(index);
    const root = document.documentElement;
    root.style.setProperty("--font-heading", `'${f.h}', -apple-system, sans-serif`);
    root.style.setProperty("--font-body", `'${f.b}', -apple-system, sans-serif`);
  };

  return (
    <div className="landing-page-root min-h-screen bg-[#06060f] text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg: #06060f;
          --card: linear-gradient(155deg, rgba(28, 44, 148, 0.35) 0%, rgba(10, 14, 38, 0.85) 100%);
          --border: rgba(96, 165, 250, 0.28);
          --text: #ffffff;
          --muted: rgba(226, 232, 240, 0.78);
          
          --g: #2540ea;
          --gd: #1a2ca3;
          --gl: #93c5fd;
          --g-glow: rgba(37, 64, 234, 0.6);
          --g-subtle: rgba(37, 64, 234, 0.18);
          --g-border: rgba(96, 165, 250, 0.5);
          --btn-text: #ffffff;

          --font-heading: 'Outfit', -apple-system, sans-serif;
          --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          line-height: 1.6;
        }

        h1, h2, h3, h4, .logo, .bnum, .fh, .sth {
          font-family: var(--font-heading);
        }

        /* NAVIGATION */
        .landing-nav {
          position: sticky; top: 0; z-index: 70;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          background: rgba(6, 6, 15, 0.82);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
          transition: border-color .3s ease;
        }
        .landing-logo {
          font-size: 1.35rem; font-weight: 900; letter-spacing: -0.5px;
          color: #ffffff; text-decoration: none;
          display: inline-flex; align-items: center; gap: 11px;
        }
        .landing-logo-icon {
          width: 34px; height: auto; flex-shrink: 0;
          filter: drop-shadow(0 4px 12px rgba(37, 64, 234, 0.45));
          transition: transform .28s cubic-bezier(.2,.8,.2,1);
        }
        .landing-logo:hover .landing-logo-icon {
          transform: scale(1.08) translateY(-1px);
        }
        .landing-logo em {
          color: var(--gl); font-style: normal;
          text-shadow: 0 0 16px var(--g-glow);
        }
        .landing-nav-links {
          display: flex; align-items: center; gap: 24px; list-style: none;
        }
        .landing-nav-links a {
          color: var(--muted); text-decoration: none;
          font-size: .92rem; font-weight: 600; transition: color .2s;
        }
        .landing-nav-links a:hover { color: #ffffff; }
        .landing-nbtn {
          background: linear-gradient(135deg, var(--g) 0%, var(--gd) 100%);
          color: var(--btn-text); font-size: .9rem; font-weight: 700;
          padding: 11px 24px; border-radius: 12px; text-decoration: none;
          box-shadow: 0 8px 24px -6px var(--g-glow), inset 0 1px 0 rgba(255,255,255,.3);
          transition: all .25s ease; border: 1px solid rgba(255,255,255,.15);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .landing-nbtn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -4px var(--g-glow);
          filter: brightness(1.1);
        }

        @media(max-width: 768px) {
          .landing-nav-links { display: none; }
          .landing-nav { padding: 16px 20px; }
        }

        /* HERO */
        #hero {
          position: relative; min-height: 86vh;
          display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 120px 24px 80px; overflow: hidden;
        }
        #tcanvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .hgrad {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background:
            radial-gradient(ellipse 70% 60% at 50% 45%, var(--g-subtle) 0%, transparent 72%),
            radial-gradient(ellipse at bottom, rgba(6,6,15,1) 0%, transparent 65%);
        }
        .hinner { position: relative; z-index: 2; max-width: 920px; margin: 0 auto; }

        h1.hero-h1 {
          font-size: clamp(3rem, 6.8vw, 6.2rem); font-weight: 900;
          letter-spacing: -2.5px; line-height: 1.06; margin-bottom: 38px;
          animation: fadeU .85s ease .15s both; color: #ffffff;
        }
        .gh {
          background: linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, var(--g) 90%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          text-shadow: 0 0 40px var(--g-glow);
        }

        .hctas {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          animation: fadeU .85s ease .3s both; flex-wrap: wrap;
        }
        .btno {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(10,14,38,.75);
          color: #ffffff; font-size: 1.02rem; font-weight: 600;
          padding: 16px 36px; border-radius: 14px; text-decoration: none;
          border: 1px solid rgba(96,165,250,.4);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 12px 32px -8px rgba(0,0,0,.6), 0 0 24px rgba(37,64,234,.25);
          transition: all .28s cubic-bezier(.2,.8,.2,1);
        }
        .btno:hover {
          border-color: rgba(147,197,253,.9);
          background: rgba(37,64,234,.2);
          transform: translateY(-3px);
          box-shadow: 0 18px 40px -8px var(--g-glow);
        }

        /* TICKER BANNER */
        .ticker {
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
          overflow: hidden; padding: 16px 0;
          background: linear-gradient(90deg, rgba(10,14,38,.8) 0%, rgba(26,44,163,.15) 50%, rgba(10,14,38,.8) 100%);
          backdrop-filter: blur(12px);
        }
        .ticker-inner {
          display: flex; gap: 36px; width: max-content; animation: scroll 32s linear infinite;
        }
        .tick {
          display: flex; align-items: center; gap: 10px; font-size: .9rem; font-weight: 600; color: var(--muted); white-space: nowrap;
        }
        .tsep {
          width: 6px; height: 6px; background: var(--gl); border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px var(--gl);
        }
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* FONCTIONNALITÉS */
        .feat-s { padding: 110px 24px; max-width: 1180px; margin: 0 auto; }
        .eyebrow {
          display: inline-block; font-size: .82rem; font-weight: 800; letter-spacing: 3px;
          text-transform: uppercase; color: var(--gl); margin-bottom: 14px;
          text-shadow: 0 0 16px var(--g-glow);
        }
        .sh2 {
          font-size: clamp(2.2rem, 4.6vw, 3.6rem); font-weight: 900; letter-spacing: -1.8px;
          line-height: 1.12; margin-bottom: 16px; color: #ffffff;
        }
        .ssub { color: var(--muted); font-size: 1.08rem; line-height: 1.8; max-width: 620px; }

        .fgrid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 26px; margin-top: 60px;
        }
        .fcard {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 34px 30px;
          cursor: default; position: relative; overflow: hidden;
          transition: all .35s cubic-bezier(.2,.8,.2,1);
          box-shadow: 0 12px 36px -10px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.16);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          display: flex; flex-direction: column; justify-content: space-between; min-height: 250px;
        }
        .fcard::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at var(--mx,50%) var(--my,50%), var(--g-glow) 0%, transparent 65%);
          opacity: 0; transition: opacity .35s; pointer-events: none;
        }
        .fcard::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--gl), var(--g), transparent);
          opacity: 0; transition: opacity .35s;
        }
        .fcard:hover {
          border-color: rgba(147,197,253,.9);
          transform: translateY(-7px);
          box-shadow: 0 26px 60px -12px var(--g-glow), 0 0 30px rgba(37,64,234,.35), inset 0 1px 0 rgba(255,255,255,.3);
        }
        .fcard:hover::before, .fcard:hover::after { opacity: 1; }
        .fhead { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 14px; }
        .fnum {
          font-family: var(--font-heading); font-size: 1.4rem; font-weight: 900;
          color: #60a5fa; opacity: .75; letter-spacing: -1px; transition: all .3s ease;
        }
        .fcard:hover .fnum { opacity: 1; transform: scale(1.1); color: #ffffff; text-shadow: 0 0 12px #60a5fa; }

        .fh {
          font-size: 1.28rem; font-weight: 800; color: #ffffff;
          margin-bottom: 12px; letter-spacing: -.4px; line-height: 1.3;
        }
        .fp { color: var(--muted); font-size: .96rem; line-height: 1.75; font-weight: 400; }

        /* BANDE STATISTIQUES */
        .sbelt {
          background: linear-gradient(180deg, rgba(37,64,234,.18) 0%, rgba(10,14,38,.85) 100%);
          border-top: 1px solid rgba(96,165,250,.45); border-bottom: 1px solid rgba(96,165,250,.45);
          padding: 72px 24px; box-shadow: inset 0 0 40px rgba(37,64,234,.22);
        }
        .sbelt-in {
          max-width: 1080px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 40px; text-align: center;
        }
        .bnum {
          font-size: 3.6rem; font-weight: 900; color: var(--gl); letter-spacing: -2.5px;
          line-height: 1; text-shadow: 0 0 30px var(--g-glow);
        }
        .blbl {
          font-size: .9rem; color: #e2e8f0; margin-top: 14px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px;
        }

        /* CTA FINAL */
        .ctaw { padding: 96px 24px; }
        .ctabox {
          max-width: 760px; margin: 0 auto; background: var(--card);
          border: 1px solid rgba(96,165,250,.45); border-radius: 30px;
          padding: 72px 48px; text-align: center; position: relative; overflow: hidden;
          box-shadow: 0 28px 70px -15px rgba(0,0,0,.8), 0 0 40px var(--g-subtle);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        }
        .ctabox::before {
          content: ''; position: absolute; width: 600px; height: 260px;
          background: radial-gradient(ellipse, var(--g-glow) 0%, transparent 70%);
          top: -80px; left: 50%; transform: translateX(-50%); pointer-events: none;
        }
        .ctabox h2 {
          font-size: clamp(2.1rem, 4.2vw, 3.2rem); font-weight: 900;
          letter-spacing: -1.5px; margin-bottom: 32px; position: relative; color: #ffffff;
        }
        .btng {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, var(--g) 0%, var(--gd) 100%);
          color: var(--btn-text); font-size: 1.05rem; font-weight: 700;
          padding: 16px 36px; border-radius: 14px; text-decoration: none;
          box-shadow: 0 14px 40px -8px var(--g-glow), inset 0 1px 0 rgba(255,255,255,.3);
          transition: all .26s ease; border: 1px solid rgba(255,255,255,.2);
          position: relative;
        }
        .btng:hover { transform: translateY(-3px); filter: brightness(1.12); box-shadow: 0 20px 50px -6px var(--g-glow); }

        /* FOOTER */
        .landing-footer {
          border-top: 1px solid var(--border); padding: 44px 24px;
          text-align: center; color: var(--muted); font-size: .85rem; line-height: 1.8;
          background: rgba(6,6,15,.95);
        }
        .landing-footer strong { color: var(--gl); font-weight: 700; }

        /* ANIMATIONS */
        .r { opacity: 0; transform: translateY(36px); transition: opacity .65s ease, transform .65s ease; }
        .r.in { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: .08s; } .d2 { transition-delay: .16s; } .d3 { transition-delay: .24s; }
        .d4 { transition-delay: .32s; } .d5 { transition-delay: .4s; } .d6 { transition-delay: .48s; }

        @keyframes fadeU { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeD { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

        /* STUDIO FLOTTANT */
        .studio-toggle {
          position: fixed; bottom: 24px; right: 24px; z-index: 90;
          background: linear-gradient(135deg, var(--g) 0%, var(--gd) 100%);
          color: #fff; border: 1px solid rgba(255,255,255,.3);
          padding: 12px 22px; border-radius: 100px; font-size: .88rem; font-weight: 800;
          cursor: pointer; box-shadow: 0 12px 36px var(--g-glow);
          display: inline-flex; align-items: center; gap: 10px; transition: all .25s ease;
        }
        .studio-toggle:hover { transform: translateY(-3px) scale(1.03); }

        .studio-panel {
          position: fixed; bottom: 84px; right: 24px; z-index: 90; width: 370px; max-width: calc(100vw - 32px);
          max-height: 80vh; overflow-y: auto; background: rgba(10,14,38,.96);
          border: 1px solid rgba(96,165,250,.4); border-radius: 22px;
          padding: 24px; box-shadow: 0 30px 80px rgba(0,0,0,.9), 0 0 40px var(--g-subtle);
          backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
          display: flex; flex-direction: column; gap: 20px;
        }
        .studio-title { font-size: 1.05rem; font-weight: 800; color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .studio-close { background: transparent; border: none; color: var(--muted); font-size: 1.3rem; cursor: pointer; }
        .studio-sec { display: flex; flex-direction: column; gap: 10px; }
        .studio-sec-h { font-size: .76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--gl); }
        .studio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .studio-btn {
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12);
          color: #fff; padding: 10px 12px; border-radius: 10px; cursor: pointer;
          font-size: .78rem; font-weight: 600; text-align: left; transition: all .2s;
          display: flex; align-items: center; gap: 8px;
        }
        .studio-btn:hover, .studio-btn.active {
          background: rgba(37,64,234,.35); border-color: var(--gl);
        }
        .dot-c { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
      ` }} />

      {/* NAVIGATION */}
      <nav className="landing-nav">
        <Link className="landing-logo" href="/" scroll={false}>
          {/* LOGO OFFICIEL EASYTRADE */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-white.png"
            alt="EasyTrade"
            className="landing-logo-icon h-7 w-auto object-contain"
          />
          <span>Easy<em>Trade</em></span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link href="/login" scroll={false} className="text-sm font-semibold text-white/70 hover:text-white transition-colors hidden sm:inline-block">
            Connexion
          </Link>
          <Link className="landing-nbtn" href="/register" scroll={false}>
            <span>Commencer</span>
            <span>→</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" ref={heroRef}>
        <canvas id="tcanvas" ref={canvasRef}></canvas>
        <div className="hgrad"></div>
        <div className="hinner">
          <h1 className="hero-h1">
            Votre boutique<br />en ligne, <span className="gh">en 5 minutes.</span>
          </h1>
          
          <div className="hctas">
            <a href="#features" className="btno">Explorer la plateforme ↓</a>
            <Link href="/register" className="landing-nbtn" style={{ padding: "16px 36px", fontSize: "1.02rem" }}>
              Lancer ma boutique gratuitement →
            </Link>
          </div>
        </div>
      </section>

      {/* TICKER DÉFILANT */}
      <div className="ticker">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="tick">
              {item}
              <span className="tsep" />
            </span>
          ))}
        </div>
      </div>

      {/* SECTION FONCTIONNALITÉS */}
      <section className="feat-s" id="features">
        <div className="eyebrow r">Fonctionnalités</div>
        <h2 className="sh2 r">Tout ce qu&apos;il faut<br />pour vendre en Algérie</h2>
        <p className="ssub r">Une infrastructure tout-en-un pensée pour le marché algérien, sans carte de crédit bancaire, sans complications.</p>
        
        <div className="fgrid">
          {/* Carte 01 */}
          <div className="fcard r d1">
            <div className="fhead"><span className="fnum">01</span></div>
            <div className="fh">Paiement à la livraison</div>
            <p className="fp">Le standard incontournable en Algérie. Vos clients règlent en espèces à la remise du colis par le livreur. Zéro friction, confiance maximale.</p>
          </div>

          {/* Carte 02 */}
          <div className="fcard r d2">
            <div className="fhead"><span className="fnum">02</span></div>
            <div className="fh"><strong>IA intégrée</strong></div>
            <p className="fp">Génération de boutiques stylées grâce à l&apos;IA.</p>
          </div>

          {/* Carte 03 */}
          <div className="fcard r d3">
            <div className="fhead"><span className="fnum">03</span></div>
            <div className="fh">Livraison Intégrée</div>
            <p className="fp">Connectez Yalidine, Zr Express, Procolis et d&apos;autres transporteurs en un clic. Génération automatique de bordereaux et tracking précis.</p>
          </div>

          {/* Carte 04 */}
          <div className="fcard r d4">
            <div className="fhead"><span className="fnum">04</span></div>
            <div className="fh"><strong>Déploiement rapide</strong></div>
            <p className="fp">Votre boutique sera en ligne dans moins d&apos;une minute.</p>
          </div>

          {/* Carte 05 */}
          <div className="fcard r d5">
            <div className="fhead"><span className="fnum">05</span></div>
            <div className="fh">100% Mobile-first</div>
            <p className="fp">9 commandes sur 10 se font sur smartphone en Algérie. Les vitrines sont calibrées pour se charger instantanément même en connexion 3G/4G.</p>
          </div>

          {/* Carte 06 */}
          <div className="fcard r d6">
            <div className="fhead"><span className="fnum">06</span></div>
            <div className="fh">Protection Anti-Faux Ordres</div>
            <p className="fp">Certificat SSL inclus, filtres intelligents pour bloquer les commandes frauduleuses ou spams et infrastructure cloud toujours en ligne.</p>
          </div>
        </div>
      </section>

      {/* BANDEAU DE STATISTIQUES */}
      <div className="sbelt r">
        <div className="sbelt-in">
          <div>
            <div className="bnum" data-t="99" data-s="%">0%</div>
            <div className="blbl">Disponibilité garantie</div>
          </div>
          <div>
            <div className="bnum" data-t="58" data-s="">0</div>
            <div className="blbl">Wilayas couvertes</div>
          </div>
          <div>
            <div className="bnum" data-t="5" data-s=" min">0 min</div>
            <div className="blbl">Pour ouvrir sa boutique</div>
          </div>
          <div>
            <div className="bnum" data-t="0" data-s=" DZD">0 DZD</div>
            <div className="blbl">Pour commencer</div>
          </div>
        </div>
      </div>

      {/* CALL TO ACTION FINAL */}
      <div className="ctaw r">
        <div className="ctabox">
          <h2>Prêt à lancer<br />votre boutique ?</h2>
          <Link href="/register" className="btng">
            Commencer →
          </Link>
        </div>
      </div>

      {/* PIED DE PAGE */}
      <footer className="landing-footer">
        <p style={{ fontSize: "1.4rem", marginBottom: "8px" }}>🇩🇿</p>
        <p>© 2026 <strong>EasyTrade</strong> · Fait avec fierté à Oran, Algérie</p>
      </footer>

      {/* BOUTON FLOTTANT DU STUDIO */}
      <button
        className="studio-toggle"
        onClick={() => setIsStudioOpen(!isStudioOpen)}
        title="Tester palettes et polices"
      >
        <span>🎨</span>
        <span>Palette & Polices</span>
      </button>

      {/* PANNEAU DU STUDIO INTERACTIF */}
      {isStudioOpen && (
        <div className="studio-panel">
          <div className="studio-title">
            <span>Studio de Style</span>
            <button className="studio-close" onClick={() => setIsStudioOpen(false)}>✕</button>
          </div>

          <div className="studio-sec">
            <div className="studio-sec-h">1. Palettes de Couleurs</div>
            <div className="studio-grid">
              {PALETTES.map((p, idx) => (
                <button
                  key={p.name}
                  className={`studio-btn ${activePalette === idx ? "active" : ""}`}
                  onClick={() => applyPalette(idx)}
                >
                  <span className="dot-c" style={{ background: p.dot, color: p.dotBorder }}></span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="studio-sec">
            <div className="studio-sec-h">2. Modèles de Typographies</div>
            <div className="studio-grid">
              {FONTS.map((f, idx) => (
                <button
                  key={f.name}
                  className={`studio-btn ${activeFont === idx ? "active" : ""}`}
                  onClick={() => applyFont(idx)}
                >
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );;
}

