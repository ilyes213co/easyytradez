"use client";

import { useState, useMemo } from "react";
import { useStore } from "./StoreShell";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  const { products, theme, primary } = useStore();
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return ["all", ...Array.from(cats)];
  }, [products]);

  const filtered = useMemo(() =>
    activeCategory === "all" ? products : products.filter((p) => p.category === activeCategory),
    [products, activeCategory]
  );

  if (products.length === 0) return null;

  const sectionStyle: React.CSSProperties = {
    padding: "80px 24px",
    maxWidth: "1280px",
    margin: "0 auto",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 700,
    textAlign: "center",
    color: "var(--text)",
    marginBottom: "8px",
  };

  const subtitleStyle: React.CSSProperties = {
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "16px",
    marginBottom: "40px",
  };

  const filterBar: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "48px",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "24px",
  };

  return (
    <section id="produits" style={sectionStyle}>
      <h2 style={titleStyle}>Nos produits</h2>
      <p style={subtitleStyle}>
        {products.length} article{products.length > 1 ? "s" : ""} disponible{products.length > 1 ? "s" : ""}
      </p>

      {/* Category filter */}
      {categories.length > 2 && (
        <div style={filterBar}>
          {categories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "50px",
                  border: `1.5px solid ${active ? primary : theme.border}`,
                  background: active ? primary : "transparent",
                  color: active ? "#fff" : theme.textMuted,
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {cat === "all" ? "Tous les produits" : cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <div style={grid}>
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: theme.textMuted, padding: "60px 0" }}>
          Aucun produit dans cette catégorie.
        </p>
      )}
    </section>
  );
}
