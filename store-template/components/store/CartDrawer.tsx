"use client";

import { useStore } from "./StoreShell";

export default function CartDrawer() {
  const { store, theme, primary, cartItems, cartTotal, cartOpen, closeCart, cart } = useStore();

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.5)",
    opacity: cartOpen ? 1 : 0,
    pointerEvents: cartOpen ? "auto" : "none",
    transition: "opacity 0.3s",
  };

  const drawer: React.CSSProperties = {
    position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
    width: "min(420px, 100vw)",
    background: theme.bg,
    borderLeft: `1px solid ${theme.border}`,
    transform: cartOpen ? "translateX(0)" : "translateX(100%)",
    transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
    display: "flex",
    flexDirection: "column",
  };

  const header: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: `1px solid ${theme.border}`,
    fontWeight: 700, fontSize: "18px", color: theme.text,
  };

  const closeBtn: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    color: theme.textMuted, padding: "4px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const itemList: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: "16px 24px",
    display: "flex", flexDirection: "column", gap: "16px",
  };

  const emptyMsg: React.CSSProperties = {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: theme.textMuted, gap: "12px", padding: "40px",
    textAlign: "center",
  };

  const footer: React.CSSProperties = {
    padding: "20px 24px",
    borderTop: `1px solid ${theme.border}`,
  };

  const totalRow: React.CSSProperties = {
    display: "flex", justifyContent: "space-between",
    marginBottom: "16px",
    fontWeight: 700, fontSize: "18px", color: theme.text,
  };

  const waBtn: React.CSSProperties = {
    width: "100%", padding: "16px",
    background: "#25D366", color: "#fff",
    border: "none", borderRadius: "12px",
    fontWeight: 700, fontSize: "15px",
    cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
    gap: "10px", transition: "opacity 0.2s",
  };

  const clearBtn: React.CSSProperties = {
    width: "100%", marginTop: "10px",
    padding: "10px", background: "transparent",
    color: theme.textMuted, border: `1px solid ${theme.border}`,
    borderRadius: "10px", fontSize: "13px",
    cursor: "pointer", transition: "all 0.2s",
  };

  const handleWhatsApp = () => {
    if (!cart || !store.whatsapp_phone) return;
    const url = cart.buildWhatsAppUrl(store.whatsapp_phone, store.name);
    window.open(url, "_blank");
  };

  return (
    <>
      <div style={overlay} onClick={closeCart} />
      <div style={drawer} role="dialog" aria-modal="true" aria-label="Panier">
        {/* Header */}
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Mon panier
            {cartItems.length > 0 && (
              <span style={{ background: primary, color: "#fff", borderRadius: "50%", width: "22px", height: "22px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {cartItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button style={closeBtn} onClick={closeCart} aria-label="Fermer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        {cartItems.length === 0 ? (
          <div style={emptyMsg}>
            <span style={{ fontSize: "48px" }}>🛒</span>
            <p style={{ fontWeight: 600, color: theme.text }}>Votre panier est vide</p>
            <p style={{ fontSize: "14px" }}>Ajoutez des produits pour commencer</p>
            <button onClick={closeCart} style={{ marginTop: "8px", padding: "10px 24px", background: primary, color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
              Voir les produits
            </button>
          </div>
        ) : (
          <div style={itemList}>
            {cartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                theme={theme}
                primary={primary}
                onRemove={() => cart?.remove(item.id)}
                onQtyChange={(q) => cart?.updateQuantity(item.id, q)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={footer}>
            <div style={totalRow}>
              <span>Total</span>
              <span style={{ color: primary }}>{cartTotal.toLocaleString("fr-DZ")} DZD</span>
            </div>
            <button
              style={waBtn}
              onClick={handleWhatsApp}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              disabled={!store.whatsapp_phone}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Passer commande via WhatsApp
            </button>
            <button style={clearBtn} onClick={() => cart?.clear()}>Vider le panier</button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Cart item row ─────────────────────────────────────────────────────────────

function CartItemRow({
  item, theme, primary, onRemove, onQtyChange,
}: {
  item: import("../../app/types").CartItem;
  theme: import("../../app/types").ThemeConfig;
  primary: string;
  onRemove: () => void;
  onQtyChange: (q: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
      {/* Image */}
      <div style={{ width: "64px", height: "64px", borderRadius: "10px", overflow: "hidden", background: theme.surface, flexShrink: 0 }}>
        {item.image
          ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>📦</div>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: "14px", color: theme.text, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: primary, margin: 0 }}>
          {(item.price * item.quantity).toLocaleString("fr-DZ")} DZD
        </p>
      </div>

      {/* Qty controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0", border: `1px solid ${theme.border}`, borderRadius: "8px", overflow: "hidden" }}>
        <button onClick={() => onQtyChange(item.quantity - 1)} style={{ width: "30px", height: "30px", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ width: "30px", textAlign: "center", fontSize: "14px", fontWeight: 600, color: theme.text }}>{item.quantity}</span>
        <button onClick={() => onQtyChange(item.quantity + 1)} style={{ width: "30px", height: "30px", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>

      {/* Delete */}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px", borderRadius: "6px", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  );
}
