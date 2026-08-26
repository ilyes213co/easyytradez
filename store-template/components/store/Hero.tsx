"use client";

import { useStore } from "./StoreShell";

export default function Hero() {
  const { store, primary, theme } = useStore();
  const slogan = store.seo_metadata?.slogan ?? `Bienvenue chez ${store.name}`;
  const isLuxury = store.theme === "luxury";
  const isTech   = store.theme === "tech";

  const sectionStyle: React.CSSProperties = {
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "80px 24px",
    position: "relative",
    overflow: "hidden",
    background: isLuxury
      ? `linear-gradient(135deg, #0a0a0a 0%, #1a1208 50%, #0a0a0a 100%)`
      : isTech
      ? `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
      : theme.bg,
  };

  const decorCircle: React.CSSProperties = {
    position: "absolute",
    borderRadius: "50%",
    background: primary,
    opacity: 0.08,
    pointerEvents: "none",
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    maxWidth: "680px",
    margin: "0 auto",
    animation: "slideUp 0.7s ease both",
  };

  const taglineStyle: React.CSSProperties = {
    display: "inline-block",
    background: `${primary}22`,
    color: primary,
    border: `1px solid ${primary}44`,
    borderRadius: "20px",
    padding: "6px 16px",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: "24px",
  };

  const h1Style: React.CSSProperties = {
    fontSize: "clamp(36px, 7vw, 72px)",
    fontWeight: isLuxury ? 300 : 700,
    lineHeight: 1.1,
    letterSpacing: isLuxury ? "0.05em" : "-0.02em",
    color: theme.text,
    margin: "0 0 20px",
  };

  const accentSpan: React.CSSProperties = {
    color: primary,
    display: "block",
  };

  const descStyle: React.CSSProperties = {
    fontSize: "18px",
    color: theme.textMuted,
    lineHeight: 1.6,
    marginBottom: "40px",
    maxWidth: "500px",
    margin: "0 auto 40px",
  };

  const ctaStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    background: primary,
    color: "#fff",
    padding: "16px 36px",
    borderRadius: "50px",
    fontSize: "16px",
    fontWeight: 600,
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.2s, opacity 0.2s",
    boxShadow: `0 4px 24px ${primary}44`,
  };

  const ctaSecStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "transparent",
    color: theme.text,
    padding: "16px 28px",
    borderRadius: "50px",
    fontSize: "16px",
    fontWeight: 500,
    textDecoration: "none",
    border: `1.5px solid ${theme.border}`,
    cursor: "pointer",
    transition: "border-color 0.2s",
    marginLeft: "12px",
  };

  return (
    <section id="accueil" style={sectionStyle}>
      {/* Decorative circles */}
      <div style={{ ...decorCircle, width: "600px", height: "600px", top: "-200px", right: "-200px" }} />
      <div style={{ ...decorCircle, width: "400px", height: "400px", bottom: "-150px", left: "-150px" }} />

      <div style={contentStyle}>
        <div style={taglineStyle}>✦ Boutique officielle</div>

        <h1 style={h1Style}>
          {store.name}
          <span style={accentSpan}>
            {slogan}
          </span>
        </h1>

        <p style={descStyle}>
          {store.description ?? `Découvrez notre sélection de produits de qualité. Commandez facilement via WhatsApp, livraison partout en Algérie.`}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <a href="#produits" style={ctaStyle}
            onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.opacity = "0.9"; (e.target as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.opacity = "1"; (e.target as HTMLAnchorElement).style.transform = "none"; }}
          >
            Voir les produits
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>

          {store.whatsapp_phone && (
            <a
              href={`https://wa.me/${store.whatsapp_phone.replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              style={ctaSecStyle}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Nous contacter
            </a>
          )}
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "56px", flexWrap: "wrap" }}>
          {[
            { icon: "🚚", label: "Livraison rapide" },
            { icon: "✅", label: "Qualité garantie" },
            { icon: "💬", label: "Support WhatsApp" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", color: theme.textMuted, fontSize: "13px" }}>
              <span style={{ fontSize: "18px" }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
