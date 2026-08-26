"use client";

import { useState, useEffect } from "react";
import { useStore } from "./StoreShell";

export default function Navbar() {
  const { store, primary, theme, cartCount, openCart } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navStyle: React.CSSProperties = {
    position: "sticky", top: 0, zIndex: 100,
    background: scrolled ? theme.bg : "transparent",
    borderBottom: scrolled ? `1px solid ${theme.border}` : "none",
    backdropFilter: scrolled ? "blur(12px)" : "none",
    transition: "all 0.3s ease",
    padding: "0 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: "64px",
  };

  const logoStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px",
    textDecoration: "none", color: theme.text,
  };

  const logoCircle: React.CSSProperties = {
    width: "36px", height: "36px", borderRadius: "10px",
    background: primary, display: "flex", alignItems: "center",
    justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "16px",
  };

  const linkStyle: React.CSSProperties = {
    color: theme.textMuted, textDecoration: "none", fontSize: "14px",
    fontWeight: 500, transition: "color 0.2s",
  };

  const cartBtn: React.CSSProperties = {
    position: "relative", background: "none", border: "none",
    cursor: "pointer", padding: "8px", color: theme.text,
    display: "flex", alignItems: "center", gap: "4px",
  };

  const badge: React.CSSProperties = {
    position: "absolute", top: "2px", right: "2px",
    background: primary, color: "#fff", borderRadius: "50%",
    width: "18px", height: "18px", fontSize: "10px", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: cartCount > 0 ? 1 : 0, transition: "opacity 0.2s",
  };

  return (
    <nav style={navStyle}>
      {/* Logo */}
      <a href="#" style={logoStyle}>
        {store.logo_url ? (
          <img src={store.logo_url} alt={store.name} style={{ height: "36px", objectFit: "contain" }} />
        ) : (
          <div style={logoCircle}>{store.name[0]?.toUpperCase()}</div>
        )}
        <span style={{ fontWeight: 600, fontSize: "16px" }}>{store.name}</span>
      </a>

      {/* Desktop nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}
        className="desktop-nav">
        {["Accueil", "Produits", "À propos", "Contact"].map((item) => (
          <a key={item} href={`#${item.toLowerCase().replace("à", "a")}`} style={linkStyle}>
            {item}
          </a>
        ))}
      </div>

      {/* Cart button */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button onClick={openCart} style={cartBtn} aria-label="Panier">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span style={badge}>{cartCount}</span>
        </button>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{ ...cartBtn, display: "flex" }}
          className="mobile-menu-btn"
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: "64px", left: 0, right: 0,
          background: theme.bg, borderBottom: `1px solid ${theme.border}`,
          padding: "16px 24px", display: "flex", flexDirection: "column", gap: "16px",
          animation: "fadeIn 0.2s ease",
        }}>
          {["Accueil", "Produits", "À propos", "Contact"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`}
              style={{ ...linkStyle, fontSize: "16px", padding: "4px 0" }}
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 769px) { .mobile-menu-btn { display: none !important; } }
        @media (max-width: 768px) { .desktop-nav { display: none !important; } }
      `}</style>
    </nav>
  );
}
