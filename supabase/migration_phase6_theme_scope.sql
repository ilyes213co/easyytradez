-- ==============================================================================
-- Migration Phase 6 : Séparer le sélecteur par usage (theme_scope)
-- ==============================================================================

-- 1. Création de l'enum theme_scope si inexistant
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'theme_scope') THEN
    CREATE TYPE theme_scope AS ENUM ('boutique', 'funnel', 'both');
  END IF;
END $$;

-- 2. Création de la table de référentiel des thèmes avec leur portée
CREATE TABLE IF NOT EXISTS public.theme_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  scope theme_scope NOT NULL DEFAULT 'boutique',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS sur theme_catalog (lecture publique, modification réservée aux admins/service)
ALTER TABLE public.theme_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique du catalogue de thèmes" ON public.theme_catalog;
CREATE POLICY "Lecture publique du catalogue de thèmes"
  ON public.theme_catalog FOR SELECT
  USING (true);

-- 3. Alimentation / Synchronisation des 10 thèmes avec leur usage
INSERT INTO public.theme_catalog (id, name, scope)
VALUES
  -- Thèmes adaptés aux boutiques (catalogues multi-produits, navigation par rayons)
  ('monochrome', 'Monochrome (ORAN SUPPLY)', 'boutique'),
  ('natural', 'Natural (Terre de Kabylie)', 'boutique'),
  ('luxe-noir', 'Luxe Noir (Maison Noir)', 'boutique'),
  ('tuareg-indigo', 'Tuareg Indigo (Tinariwen)', 'boutique'),
  ('playful-pumpkin', 'Playful Pumpkin (Yalla Kids)', 'boutique'),
  ('blossom-lavender', 'Blossom Lavender (Rose d''Atlas)', 'boutique'),

  -- Thèmes adaptés aux funnels (mono-produit, drop urgent, conversion directe COD)
  ('crimson', 'Crimson (Maroquinerie Bab El Oued)', 'funnel'),
  ('energetic', 'Energetic (Pulse Sport)', 'funnel'),
  ('neo-brutalist', 'Neo-Brutalist (BLOC Drops)', 'funnel'),
  ('phantom', 'Phantom (Tech & Gaming)', 'funnel')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope;

COMMENT ON TABLE public.theme_catalog IS
  'Référentiel des thèmes autorisés avec leur scope d''utilisation (boutique, funnel ou both).';
