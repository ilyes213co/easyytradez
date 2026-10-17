// ─── Store & Theme Types ───────────────────────────────────────────────────

export type ThemeId =
  | 'monochrome'
  | 'blossom-lavender'
  | 'phantom'
  | 'playful-pumpkin'
  | 'crimson'
  | 'natural'
  | 'energetic'
  | 'tuareg-indigo'
  | 'neo-brutalist'
  | 'luxe-noir';

export type StoreTheme = ThemeId;
export type ThemeName = ThemeId;
export type ThemeScope = 'boutique' | 'funnel' | 'both';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  scope: ThemeScope;
}

export const THEME_LIST: ThemeInfo[] = [
  // Thèmes adaptés Boutique
  { id: 'monochrome', name: 'Monochrome (ORAN SUPPLY)', scope: 'boutique' },
  { id: 'natural', name: 'Natural (Terre de Kabylie)', scope: 'boutique' },
  { id: 'luxe-noir', name: 'Luxe Noir (Maison Noir Haute Parfumerie)', scope: 'boutique' },
  { id: 'tuareg-indigo', name: 'Tuareg Indigo (Tinariwen Hoggar)', scope: 'boutique' },
  { id: 'playful-pumpkin', name: 'Playful Pumpkin (Yalla Kids)', scope: 'boutique' },
  { id: 'blossom-lavender', name: 'Blossom Lavender (Rose d\'Atlas)', scope: 'boutique' },

  // Thèmes adaptés Funnel
  { id: 'crimson', name: 'Crimson (Maroquinerie Bab El Oued)', scope: 'funnel' },
  { id: 'energetic', name: 'Energetic (Pulse Sport)', scope: 'funnel' },
  { id: 'neo-brutalist', name: 'Neo-Brutalist (BLOC Drops)', scope: 'funnel' },
  { id: 'phantom', name: 'Phantom (Tech & Gaming)', scope: 'funnel' },
];

export interface Store {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  theme: ThemeId;
  brand_accent?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  slogan?: string | null;
  whatsapp_phone?: string | null;
  phone?: string | null;
  city?: string | null;
  type?: 'boutique' | 'funnel';
  facebook_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  google_analytics_id?: string | null;
  custom_domain?: string | null;
  settings?: {
    instagram_url?: string | null;
    facebook_page_url?: string | null;
    shipping_slip?: {
      sender_name?: string | null;
      customer_service_phone?: string | null;
      default_wilaya_id?: number | null;
      footer_note?: string | null;
    } | null;
    security?: {
      strict_dz_phone?: boolean;
      anti_spam_orders?: boolean;
      blacklist?: string[];
    } | null;
    carrier?: {
      provider?: string | null;
      api_id?: string | null;
      api_token?: string | null;
    } | null;
    notifications?: {
      email_alerts?: boolean;
      telegram_chat_id?: string | null;
    } | null;
  } | null;
  content_overrides?: StoreContentOverrides | null;
  published_url?: string | null;
  status?: 'active' | 'suspended' | 'draft';
  created_at?: string;
  updated_at?: string;
}

export interface StoreContentOverrides {
  hero?: {
    kicker_enabled?: boolean;
    kicker_text?: string;
    title_text?: string;
    description_text?: string;
    cta_label?: string;
    cta_target?: string;
    alignment?: "left" | "center";
    media_url?: string;
  };
  notice_bar?: {
    enabled?: boolean;
    sticky?: boolean;
    links?: {
      id: "home" | "products" | "contact" | string;
      label: string;
      target_anchor: string;
      enabled: boolean;
    }[];
    categories_toggle?: {
      enabled?: boolean;
      button_text?: string;
      max_inline_items?: number;
      show_counts?: boolean;
    };
  };
}
