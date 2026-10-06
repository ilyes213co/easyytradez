-- ==============================================================================
-- Migration Phase 4 : Surcouche de Branding (stores.brand_accent & stores.logo_url)
-- ==============================================================================

-- 1. Ajout de stores.brand_accent (code couleur hexadécimal, optionnel/nullable)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS brand_accent text;

-- Validation du format hexadécimal (#RGB ou #RRGGBB) si renseigné
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_brand_accent_hex_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_brand_accent_hex_check
  CHECK (brand_accent IS NULL OR brand_accent ~* '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');

COMMENT ON COLUMN public.stores.brand_accent IS 
  'Code hexadécimal optionnel (#RRGGBB) pour surcharger la couleur d''accent du thème sans altérer le reste de la palette.';

-- 2. Vérification / Ajout de stores.logo_url
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.stores.logo_url IS 
  'URL publique du logo de la boutique.';
