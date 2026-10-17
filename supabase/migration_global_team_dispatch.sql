-- ==============================================================================
-- Migration : Équipe Globale (Tous Funnels & Boutiques) & Smart Dispatch COD
-- Date: 2026-10-17
-- ==============================================================================

-- 1. ÉVOLUTION DE LA TABLE store_members (Équipe Globale du Marchand)
-- Rendre store_id optionnel et lier les membres à l'owner_id (le propriétaire)
ALTER TABLE IF EXISTS public.store_members 
    ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.store_members
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index pour optimiser les requêtes de dispatch et de vérification d'accès
CREATE INDEX IF NOT EXISTS idx_store_members_owner_id 
    ON public.store_members(owner_id);

CREATE INDEX IF NOT EXISTS idx_store_members_user_id 
    ON public.store_members(user_id);

CREATE INDEX IF NOT EXISTS idx_store_members_last_assigned 
    ON public.store_members(owner_id, last_assigned_at);

-- Rétro-compatibilité : Remplir owner_id pour les membres déjà enregistrés
UPDATE public.store_members sm
SET owner_id = s.owner_id
FROM public.stores s
WHERE sm.store_id = s.id AND sm.owner_id IS NULL;

-- Lier automatiquement user_id si l'utilisateur a déjà un compte avec cet email
UPDATE public.store_members sm
SET user_id = u.id
FROM auth.users u
WHERE (
    (sm.email IS NOT NULL AND LOWER(TRIM(sm.email)) = LOWER(TRIM(u.email)))
    OR (sm.user_email IS NOT NULL AND LOWER(TRIM(sm.user_email)) = LOWER(TRIM(u.email)))
)
AND sm.user_id IS NULL;

-- 2. ÉVOLUTION DE LA TABLE orders (Champs Call Center & Dispatch)
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS call_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_notes TEXT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_to 
    ON public.orders(assigned_to);

CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON public.orders(status);

-- Mise à jour de la contrainte CHECK sur le statut des commandes pour inclure le Call Center
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE IF EXISTS public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'pending',       -- Nouvelle commande non encore traitée
        'confirmed',     -- Confirmée par téléphone, prête pour emballage/expédition
        'no_answer',     -- Ne répond pas (tentative 1, 2 ou 3)
        'callback',      -- À rappeler plus tard (convenu avec le client)
        'postponed',     -- Reportée (ex: client en déplacement ou paie fin de mois)
        'shipped',       -- Expédiée / Remise au transporteur
        'delivered',     -- Livrée et encaissée
        'cancelled',     -- Annulée par le client
        'unreachable',   -- Injoignable / Hors service
        'wrong_number',  -- Faux numéro
        'duplicate'      -- Doublon
    ));

-- ==============================================================================
-- 3. FONCTION DE SÉCURITÉ SANS RÉCURSION (SECURITY DEFINER)
-- Bypasse le RLS sur store_members pour éliminer à 100% toute récursion PostgreSQL
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_accessible_owner_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT owner_id FROM public.store_members
  WHERE is_active = true
    AND owner_id IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
      OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_owner_ids() TO authenticated, service_role, anon;

-- Helper pour les IDs des boutiques accessibles
CREATE OR REPLACE FUNCTION public.get_accessible_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.stores
  WHERE owner_id = auth.uid()
     OR owner_id IN (SELECT public.get_accessible_owner_ids());
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_store_ids() TO authenticated, service_role, anon;

-- ==============================================================================
-- 4. POLITIQUES RLS SUR public.store_members (ZÉRO RÉFÉRENCE À public.stores)
-- ==============================================================================
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_members_owner_all" ON public.store_members;
DROP POLICY IF EXISTS "store_members_user_read" ON public.store_members;
DROP POLICY IF EXISTS "store_members_owner_manage" ON public.store_members;
DROP POLICY IF EXISTS "store_members_self_read" ON public.store_members;

-- Le propriétaire gère tous les membres de son équipe directement via owner_id
CREATE POLICY "store_members_owner_manage" ON public.store_members
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- L'employé peut lire sa propre fiche membre
CREATE POLICY "store_members_self_read" ON public.store_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
    OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
);

-- ==============================================================================
-- 5. POLITIQUES RLS SUR public.stores (SANS RÉCURSION VIA SECURITY DEFINER)
-- ==============================================================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_team_member_read" ON public.stores;
DROP POLICY IF EXISTS "stores owner full access" ON public.stores;
DROP POLICY IF EXISTS "stores public read published" ON public.stores;
DROP POLICY IF EXISTS "stores_owner_manage" ON public.stores;
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_modify_policy" ON public.stores;

-- Le propriétaire gère ses boutiques (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "stores_owner_manage" ON public.stores
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- Les employés peuvent lire les boutiques/funnels de leur propriétaire
CREATE POLICY "stores_team_member_read" ON public.stores
FOR SELECT TO authenticated
USING (
    owner_id IN (SELECT public.get_accessible_owner_ids())
);

-- Public / clients : lecture des boutiques actives
CREATE POLICY "stores_public_read_published" ON public.stores
FOR SELECT TO anon, authenticated
USING (
    status = 'active' OR status = 'published'
);

-- ==============================================================================
-- 6. POLITIQUES RLS SUR public.orders (SANS RÉCURSION VIA SECURITY DEFINER)
-- ==============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders owner read" ON public.orders;
DROP POLICY IF EXISTS "orders owner update" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_read" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_update" ON public.orders;
DROP POLICY IF EXISTS "orders public insert" ON public.orders;

-- Insertion publique pour les formulaires de commande COD
CREATE POLICY "orders public insert" ON public.orders
FOR INSERT WITH CHECK (true);

-- Lecture des commandes : propriétaire ou employé assigné ou membre de l'équipe
CREATE POLICY "orders_team_member_read" ON public.orders
FOR SELECT TO authenticated
USING (
    assigned_to = auth.uid()
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

-- Mise à jour des commandes : confirmation statut / notes par propriétaire ou employé
CREATE POLICY "orders_team_member_update" ON public.orders
FOR UPDATE TO authenticated
USING (
    assigned_to = auth.uid()
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

-- Recharger le schéma PostgREST
NOTIFY pgrst, 'reload schema';
