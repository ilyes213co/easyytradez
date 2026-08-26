"use client";

import { useState, useEffect } from "react";
import { useStore } from "./StoreShell";

export default function ProductModal() {
  const { selectedProduct: product, closeProduct, addToCart, store, theme, primary } = useStore();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => { setActiveImg(0); setQty(1); }, [product?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeProduct(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeProduct]);

  if (!product) return null;

  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  const buildWaUrl = () => {
    if (!store.whatsapp_phone) return "#";
    const phone = store.whatsapp_phone.replace(/\D/g, "");
    const total = (product.price * qty).toLocaleString("fr-DZ");
    const msg = `Bonjour ${store.name} ! 👋\nJe veux commander :\n🛍️ ${qty}x ${product.name} — ${total} DZD\n\nMon nom : \nMon adresse : `;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 300,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "16px",
    animation: "fadeIn 0.2s ease",
  };

  const modal: React.CSSProperties = {
    background: theme.bg,
    borderRadius: "20px",
    maxWidth: "880px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    animation: "slideUp 0.3s ease",
    position: "relative",
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) closeProduct(); }}>
      <div style={modal}>
        {/* Close */}
        <button onClick={closeProduct} style={{
          position: "absolute", top: "16px", right: "16px", zIndex: 10,
          background: theme.surface, border: "none", borderRadius: "50%",
          width: "36px", height: "36px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: theme.text,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Images panel */}
        <div style={{ padding: "24px" }}>
          {/* Main image */}
          <div style={{ aspectRatio: "1", borderRadius: "14px", overflow: "hidden", background: theme.surface, marginBottom: "12px" }}>
            {product.images[activeImg]?.url ? (
              <img
                src={product.images[activeImg].url}
                alt={product.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px" }}>📦</div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  width: "64px", height: "64px", flexShrink: 0,
                  border: `2px solid ${i === activeImg ? primary : theme.border}`,
                  borderRadius: "10px", overflow: "hidden", cursor: "pointer", padding: 0,
                }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Badges */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {product.is_featured && (
              <span style={{ background: `${primary}22`, color: primary, fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" }}>⭐ Vedette</span>
            )}
            {discount && (
              <span style={{ background: "#fee2e2", color: "#ef4444", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px" }}>-{discount}%</span>
            )}
            {product.category && (
              <span style={{ background: theme.surface, color: theme.textMuted, fontSize: "12px", padding: "4px 10px", borderRadius: "20px" }}>{product.category}</span>
            )}
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1.3 }}>
            {product.name}
          </h2>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: primary }}>
              {product.price.toLocaleString("fr-DZ")} DZD
            </span>
            {product.original_price && (
              <span style={{ fontSize: "16px", color: theme.textMuted, textDecoration: "line-through" }}>
                {product.original_price.toLocaleString("fr-DZ")} DZD
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: "14px", color: theme.textMuted, lineHeight: 1.7, margin: 0 }}>
              {product.description}
            </p>
          )}

          {/* Stock info */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: product.stock_quantity > 0 ? "#22c55e" : "#ef4444" }} />
            <span style={{ color: theme.textMuted }}>
              {product.stock_quantity > 0
                ? `En stock (${product.stock_quantity} disponibles)`
                : "Rupture de stock"}
            </span>
          </div>

          {/* Quantity selector */}
          {product.stock_quantity > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "14px", color: theme.textMuted }}>Quantité :</span>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${theme.border}`, borderRadius: "10px", overflow: "hidden" }}>
                <button onClick={() => setQty((v) => Math.max(1, v - 1))} style={{ width: "36px", height: "36px", background: "none", border: "none", cursor: "pointer", color: theme.text, fontSize: "18px" }}>−</button>
                <span style={{ width: "40px", textAlign: "center", fontWeight: 700, color: theme.text }}>{qty}</span>
                <button onClick={() => setQty((v) => Math.min(product.stock_quantity, v + 1))} style={{ width: "36px", height: "36px", background: "none", border: "none", cursor: "pointer", color: theme.text, fontSize: "18px" }}>+</button>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color: primary }}>
                = {(product.price * qty).toLocaleString("fr-DZ")} DZD
              </span>
            </div>
          )}

          {/* CTA buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
            {product.stock_quantity > 0 && (
              <button onClick={() => { addToCart(product, qty); closeProduct(); }} style={{
                padding: "14px", background: primary, color: "#fff",
                border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "15px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Ajouter au panier
              </button>
            )}

            {store.whatsapp_phone && (
              <a href={buildWaUrl()} target="_blank" rel="noreferrer" style={{
                padding: "14px", background: "#25D366", color: "#fff",
                border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "15px",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                gap: "8px", textDecoration: "none",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Commander directement via WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Responsive override */}
        <style>{`
          @media (max-width: 640px) {
            div[role="dialog"] { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
