"use client";

import { useState } from "react";
import type { Product } from "../../app/types";
import { useStore } from "./StoreShell";

export default function ProductCard({ product }: { product: Product }) {
  const { theme, primary, openProduct, addToCart, store } = useStore();
  const [hovered, setHovered] = useState(false);

  const img = product.images[0]?.url ?? null;
  const discount =
    product.original_price && product.original_price > product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  const isLuxury = store.theme === "luxury";

  const card: React.CSSProperties = {
    background: theme.surface,
    border: `1px solid ${hovered ? primary + "66" : theme.border}`,
    borderRadius: isLuxury ? "2px" : "16px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "all 0.3s ease",
    transform: hovered ? "translateY(-4px)" : "none",
    boxShadow: hovered ? `0 12px 40px ${primary}22` : "none",
    position: "relative",
  };

  const imgWrap: React.CSSProperties = {
    aspectRatio: "1",
    overflow: "hidden",
    background: theme.bg,
    position: "relative",
  };

  const imgStyle: React.CSSProperties = {
    width: "100%", height: "100%",
    objectFit: "cover",
    transition: "transform 0.4s ease",
    transform: hovered ? "scale(1.06)" : "scale(1)",
  };

  const body: React.CSSProperties = {
    padding: "16px",
  };

  const name: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "15px",
    color: theme.text,
    marginBottom: "8px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  const priceRow: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "8px",
    marginBottom: "16px",
  };

  const waBtn: React.CSSProperties = {
    width: "100%",
    padding: "11px",
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: isLuxury ? "2px" : "10px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "opacity 0.2s",
    marginTop: "8px",
  };

  const addBtn: React.CSSProperties = {
    width: "100%",
    padding: "11px",
    background: primary,
    color: "#fff",
    border: "none",
    borderRadius: isLuxury ? "2px" : "10px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "opacity 0.2s",
  };

  const buildDirectWaUrl = () => {
    if (!store.whatsapp_phone) return "#";
    const phone = store.whatsapp_phone.replace(/\D/g, "");
    const msg = `Bonjour ${store.name} ! 👋\nJe veux commander :\n🛍️ 1x ${product.name} — ${product.price.toLocaleString("fr-DZ")} DZD\n\nMon nom : \nMon adresse : `;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div style={imgWrap} onClick={() => openProduct(product)}>
        {img ? (
          <img src={img} alt={product.name} style={imgStyle} loading="lazy" />
        ) : (
          <div style={{ ...imgStyle, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: "40px" }}>
            📦
          </div>
        )}

        {/* Badges */}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {product.is_featured && (
            <span style={{ background: primary, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px" }}>
              ⭐ Vedette
            </span>
          )}
          {discount && (
            <span style={{ background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px" }}>
              -{discount}%
            </span>
          )}
          {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
            <span style={{ background: "#f59e0b", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px" }}>
              Plus que {product.stock_quantity} !
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={body}>
        <div style={name} onClick={() => openProduct(product)}>{product.name}</div>

        {/* Price */}
        <div style={priceRow}>
          <span style={{ fontWeight: 700, fontSize: "18px", color: primary }}>
            {product.price.toLocaleString("fr-DZ")} DZD
          </span>
          {product.original_price && (
            <span style={{ fontSize: "13px", color: theme.textMuted, textDecoration: "line-through" }}>
              {product.original_price.toLocaleString("fr-DZ")} DZD
            </span>
          )}
        </div>

        {/* Out of stock */}
        {product.stock_quantity === 0 && (
          <p style={{ fontSize: "12px", color: "#ef4444", marginBottom: "8px", fontWeight: 500 }}>
            Rupture de stock
          </p>
        )}

        {/* Add to cart */}
        {product.stock_quantity > 0 && (
          <button
            style={addBtn}
            onClick={() => addToCart(product)}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Ajouter au panier
          </button>
        )}

        {/* Commander */}
        {product.stock_quantity > 0 && (
          <button
            type="button"
            onClick={() => openProduct(product)}
            style={{
              ...addBtn,
              background: "transparent",
              color: primary,
              border: `1.5px solid ${primary}`,
              marginTop: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = primary;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = primary;
            }}
          >
            Commander
          </button>
        )}
      </div>
    </div>
  );
}
