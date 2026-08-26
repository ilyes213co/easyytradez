export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string;
  font_family: string;
  logo_url: string | null;
  whatsapp_phone: string | null;
  theme: "modern" | "luxury" | "minimal" | "colorful" | "tech" | "nature";
  animation_style: "none" | "soft" | "dynamic" | "spectacular";
  special_effects: string[];
  seo_metadata: SeoMetadata | null;
  published_url: string | null;
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string[];
  og_title: string;
  og_description: string;
  og_image?: string;
  slogan?: string;
}

export interface ProductImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string | null;
  stock_quantity: number;
  images: ProductImage[];
  is_featured: boolean;
  position: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

export type ThemeConfig = {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  font: string;
};

export const THEME_CONFIGS: Record<Store["theme"], ThemeConfig> = {
  modern: {
    bg: "#ffffff", surface: "#f9fafb",
    text: "#111827", textMuted: "#6b7280",
    border: "#e5e7eb", font: "'Inter', sans-serif",
  },
  luxury: {
    bg: "#0a0a0a", surface: "#141414",
    text: "#f5f0e8", textMuted: "#a89880",
    border: "#2a2a2a", font: "'Cormorant Garamond', serif",
  },
  minimal: {
    bg: "#fafafa", surface: "#f4f4f4",
    text: "#1a1a1a", textMuted: "#888888",
    border: "#e0e0e0", font: "'Helvetica Neue', Helvetica, sans-serif",
  },
  colorful: {
    bg: "#ffffff", surface: "#fff8ec",
    text: "#1a1a1a", textMuted: "#666666",
    border: "#ffe4b5", font: "'Nunito', sans-serif",
  },
  tech: {
    bg: "#0f172a", surface: "#1e293b",
    text: "#e2e8f0", textMuted: "#94a3b8",
    border: "#334155", font: "'JetBrains Mono', monospace",
  },
  nature: {
    bg: "#f7f5f2", surface: "#ede9e3",
    text: "#2d2a24", textMuted: "#7a7060",
    border: "#d8d0c4", font: "'Lora', serif",
  },
};
