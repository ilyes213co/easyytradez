-- ==============================================================================
-- MISE À JOUR BASE DE DONNÉES — ÉLÉMENTS ACTIFS
-- À copier et coller dans l'éditeur SQL de votre tableau de bord Supabase :
-- https://supabase.com/dashboard/project/lyntwhvvnklmcprnnump/sql
-- ==============================================================================

-- 1. Nettoyage des modules supprimés (Prospects & Paniers abandonnés)
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.abandoned_carts CASCADE;

-- 2. Colonnes pour les boutiques (Nom de domaine, Pixels, Modes de paiement)
ALTER TABLE IF EXISTS public.stores
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id text,
  ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{"cod_enabled": true, "baridimob_enabled": false, "baridimob_rip": "", "baridimob_name": "", "stripe_enabled": false}'::jsonb;

-- Supprimer l'ancienne colonne google sheets si elle existait
ALTER TABLE IF EXISTS public.stores
  DROP COLUMN IF EXISTS google_sheets_webhook;

-- 3. Colonnes pour les produits (Référence SKU, Variantes de taille/couleur, Ventes incitatives)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS upsells jsonb DEFAULT '[]'::jsonb;

-- 4. Table des Collaborateurs & Gestion d'équipe (Store Members)
CREATE TABLE IF NOT EXISTS public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  role text NOT NULL DEFAULT 'manager'
    CHECK (role IN ('admin', 'manager', 'viewer')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_email ON public.store_members(user_email);

ALTER TABLE IF EXISTS public.store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_members owner full access" ON public.store_members;

CREATE POLICY "store_members owner full access"
  ON public.store_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
  );
