"use client";

import { useStore } from "./StoreShell";

export default function Footer() {
  const { store, theme, primary } = useStore();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" style={{
      background: theme.surface,
      borderTop: `1px solid ${theme.border}`,
      padding: "60px 24px 32px",
      marginTop: "80px",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "48px", marginBottom: "48px" }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} style={{ height: "40px", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "18px" }}>
                  {store.name[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontWeight: 700, fontSize: "18px", color: theme.text }}>{store.name}</span>
            </div>
            <p style={{ color: theme.textMuted, fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              {store.description ?? `Votre boutique de confiance. Commandez via WhatsApp, livraison partout en Algérie.`}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "14px", color: theme.text, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Navigation
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Accueil", "Produits", "À propos", "Contact"].map((item) => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace("à ", "a").replace(" ", "-")}`}
                    style={{ color: theme.textMuted, textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div id="a-propos">
            <h3 style={{ fontWeight: 700, fontSize: "14px", color: theme.text, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Contact
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {store.whatsapp_phone && (
                <a
                  href={`https://wa.me/${store.whatsapp_phone.replace(/\D/g, "")}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "10px", color: "#25D366", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Nous contacter sur WhatsApp
                </a>
              )}
              <p style={{ fontSize: "13px", color: theme.textMuted, margin: 0 }}>
                Livraison partout en Algérie 🇩🇿
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <p style={{ fontSize: "13px", color: theme.textMuted, margin: 0 }}>
            © {year} {store.name}. Tous droits réservés.
          </p>
          <p style={{ fontSize: "12px", color: theme.textMuted, margin: 0 }}>
            Boutique créée avec{" "}
            <a href="https://storegen.dz" style={{ color: primary, textDecoration: "none", fontWeight: 500 }}>StoreGen</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
