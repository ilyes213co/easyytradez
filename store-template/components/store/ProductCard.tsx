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

        {/* Direct WhatsApp */}
        {store.whatsapp_phone && (
          <a
            href={buildDirectWaUrl()}
            target="_blank" rel="noreferrer"
            style={waBtn}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Commander via WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
