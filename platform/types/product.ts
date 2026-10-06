// ─── Product & Store Theme Types ─────────────────────────────────────────────

import type { ThemeId, StoreTheme, Store } from './store';
export * from './store';

export type ProductOptionType = 'swatch' | 'chip';

export interface ProductOptionValue {
  label: string;
  hex?: string; // Utilisé si type === 'swatch' (ex: #c0392b)
  available: boolean;
}

export interface ProductOption {
  name: string; // Nom libre (Couleur, Pointure, Format, Contenance...)
  type: ProductOptionType;
  values: ProductOptionValue[];
}

export interface Wilaya {
  id: number;
  code: string;
  name: string;
  price_home: number;
  price_desk: number;
  eta: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  original_price?: number | null;
  category?: string;
  stock_quantity?: number;
  images: string[];
  options: ProductOption[];
  is_featured?: boolean;
  position?: number;
  status?: 'active' | 'draft' | 'archived';
  created_at?: string;
  updated_at?: string;
  // Onglets / Caractéristiques
  specs?: Record<string, string>;
  included_items?: string[];
}

export interface CreateOrderPayload {
  product_id: string;
  options_selected: Record<string, string>;
  qty: number;
  wilaya_id: number;
  ship_mode: 'domicile' | 'stopdesk';
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  notes?: string;
  store_id?: string;
}
