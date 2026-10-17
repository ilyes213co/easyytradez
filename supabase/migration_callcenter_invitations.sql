-- ==============================================================================
-- 🎧 MIGRATION : FLUX D'INVITATION CALL CENTER & VISIBILITÉ STRICTE DES COMMANDES
-- Date: 2026-10-17
-- ==============================================================================

-- 1. Sécuriser la valeur par défaut de is_active à false lors d'une nouvelle invitation
ALTER TABLE IF EXISTS public.store_members
    ALTER COLUMN is_active SET DEFAULT false;

-- 2. Mise à jour de la fonction SECURITY DEFINER get_accessible_owner_ids()
-- Seuls les téléopérateurs ayant accepté l'invitation (status = 'active' ET is_active = true)
-- peuvent accéder aux boutiques et commandes du propriétaire.
CREATE OR REPLACE FUNCTION public.get_accessible_owner_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT owner_id FROM public.store_members
  WHERE is_active = true
    AND status = 'active'
    AND owner_id IS NOT NULL
    AND (
      user_id = auth.uid()
      OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
      OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_owner_ids() TO authenticated, service_role, anon;

-- 3. Mise à jour de get_accessible_store_ids()
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

-- 4. POLITIQUES RLS SUR public.orders POUR LE CALL CENTER
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_team_member_read" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_update" ON public.orders;

-- Un téléopérateur actif lit :
-- 1. Les commandes qui lui sont assignées (via son auth.uid() ou son store_members.id)
-- 2. TOUTES les commandes des boutiques de son propriétaire (y compris les commandes 'pending' non encore assignées)
CREATE POLICY "orders_team_member_read" ON public.orders
FOR SELECT TO authenticated
USING (
    assigned_to = auth.uid()
    OR assigned_to IN (
        SELECT id FROM public.store_members
        WHERE is_active = true
          AND status = 'active'
          AND (
            user_id = auth.uid()
            OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
            OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
          )
    )
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

-- Un téléopérateur actif peut mettre à jour ses commandes (statut, confirmed_at, agent_notes, call_attempts)
CREATE POLICY "orders_team_member_update" ON public.orders
FOR UPDATE TO authenticated
USING (
    assigned_to = auth.uid()
    OR assigned_to IN (
        SELECT id FROM public.store_members
        WHERE is_active = true
          AND status = 'active'
          AND (
            user_id = auth.uid()
            OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
            OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
          )
    )
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

-- 5. Rechargement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
