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
  status?: 'active' | 'suspended' | 'draft';
  created_at?: string;
  updated_at?: string;
}
