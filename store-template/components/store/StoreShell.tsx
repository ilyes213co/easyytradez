"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import type { Store, Product, CartItem, ThemeConfig } from "../../app/types";
import { THEME_CONFIGS } from "../../app/types";
import { getCart, type Cart } from "../../lib/cart";
import Navbar       from "./Navbar";
import Hero         from "./Hero";
import ProductGrid  from "./ProductGrid";
import ProductModal from "./ProductModal";
import CartDrawer   from "./CartDrawer";
import Footer       from "./Footer";

// ─── Store context ────────────────────────────────────────────────────────────

interface StoreCtx {
  store: Store;
  products: Product[];
  theme: ThemeConfig;
  primary: string;
  cart: Cart | null;
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  openCart: () => void;
  closeCart: () => void;
  cartOpen: boolean;
  openProduct: (p: Product) => void;
  closeProduct: () => void;
  selectedProduct: Product | null;
  addToCart: (p: Product, qty?: number) => void;
  trackEvent: (type: string, productId?: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);
export const useStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreShell");
  return ctx;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreShell({ store, products }: { store: Store; products: Product[] }) {
  const theme   = THEME_CONFIGS[store.theme] ?? THEME_CONFIGS.modern;
  const primary = store.primary_color ?? "#534AB7";

  const [cart, setCart]               = useState<Cart | null>(null);
  const [cartItems, setCartItems]     = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [selectedProduct, setProduct] = useState<Product | null>(null);

  // Init cart on client
  useEffect(() => {
    const c = getCart(store.slug);
    setCart(c);
    setCartItems(c.getItems());
    const unsub = c.subscribe(setCartItems);
    return unsub;
  }, [store.slug]);

  // Inject CSS variables globally
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "store-theme-vars";
    style.textContent = `
      :root {
        --primary: ${primary};
        --bg: ${theme.bg};
        --surface: ${theme.surface};
        --text: ${theme.text};
        --text-muted: ${theme.textMuted};
        --border: ${theme.border};
        --font: ${theme.font};
      }
      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font);
        margin: 0;
        padding: 0;
      }
      * { box-sizing: border-box; }
      ::selection { background: var(--primary); color: #fff; }
      @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
      @keyframes slideUp   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
      @keyframes slideInR  { from { transform:translateX(100%) } to { transform:none } }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [primary, theme]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart?.getTotal() ?? 0;

  const addToCart = useCallback((p: Product, qty = 1) => {
    cart?.add(p, qty);
    setCartOpen(true);
    trackEvent("cart_open");
  }, [cart]);

  const trackEvent = useCallback((type: string, productId?: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
    fetch(`${apiUrl}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: store.id, event_type: type, product_id: productId }),
      keepalive: true,
    }).catch(() => {});
  }, [store.id]);

  // Track page view on mount
  useEffect(() => { trackEvent("view"); }, [trackEvent]);

  const ctx: StoreCtx = {
    store, products, theme, primary, cart, cartItems, cartCount, cartTotal,
    cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    openProduct: (p) => { setProduct(p); trackEvent("product_view", p.id); },
    closeProduct: () => setProduct(null),
    selectedProduct,
    addToCart,
    trackEvent,
  };

  return (
    <Ctx.Provider value={ctx}>
      <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: theme.font }}>
        <Navbar />
        <Hero />
        <ProductGrid />
        <Footer />
        <CartDrawer />
        {selectedProduct && <ProductModal />}
      </div>
    </Ctx.Provider>
  );
}
