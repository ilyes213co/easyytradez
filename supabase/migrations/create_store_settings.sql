-- ==============================================================================
-- Migration : Paramètres avancés des boutiques & funnels (Pixels, Sécurité COD, Transporteurs, Bordereaux)
-- Date: 2026-10-17
-- ==============================================================================

-- 1. AJOUT DES COLONNES DE CONFIGURATION SUR LA TABLE stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Index pour accélérer la recherche par domaine personnalisé
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain 
  ON public.stores(custom_domain) 
  WHERE custom_domain IS NOT NULL;

-- Index GIN pour les requêtes sur les réglages JSONB
CREATE INDEX IF NOT EXISTS idx_stores_settings 
  ON public.stores USING gin (settings);

-- Commentaires descriptifs
COMMENT ON COLUMN public.stores.custom_domain IS 'Nom de domaine personnalisé (.com, .dz, .shop)';
COMMENT ON COLUMN public.stores.facebook_pixel_id IS 'ID Pixel Meta / Facebook pour le tracking';
COMMENT ON COLUMN public.stores.tiktok_pixel_id IS 'ID Pixel TikTok pour le tracking';
COMMENT ON COLUMN public.stores.google_analytics_id IS 'ID Google Analytics (G-XXXXX ou UA-XXXXX)';
COMMENT ON COLUMN public.stores.settings IS 'Configuration JSONB: bordereau d''expédition, sécurité COD, transporteurs DZ, notifications';
