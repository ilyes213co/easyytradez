-- ==============================================================================
-- 🚨 CORRECTIF D'URGENCE : ÉLIMINATION DE LA RÉCURSION INFINIE RLS (ERREUR 500)
-- Exécutez ce script dans l'éditeur SQL de votre console Supabase.
-- ==============================================================================

-- 1. Fonction SECURITY DEFINER pour récupérer les owner_id accessibles sans déclencher de RLS
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

-- 2. Fonction SECURITY DEFINER pour récupérer les store_id accessibles
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

-- 3. NETTOYAGE ET RECONFIGURATION DE public.store_members (ZÉRO référence à public.stores)
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_members_owner_all" ON public.store_members;
DROP POLICY IF EXISTS "store_members_user_read" ON public.store_members;
DROP POLICY IF EXISTS "store_members_owner_manage" ON public.store_members;
DROP POLICY IF EXISTS "store_members_self_read" ON public.store_members;

-- Le propriétaire gère ses membres directement via owner_id
CREATE POLICY "store_members_owner_manage" ON public.store_members
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- L'employé lit sa propre assignation
CREATE POLICY "store_members_self_read" ON public.store_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR (email IS NOT NULL AND LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
    OR (user_email IS NOT NULL AND LOWER(user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
);

-- 4. NETTOYAGE ET RECONFIGURATION DE public.stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_team_member_read" ON public.stores;
DROP POLICY IF EXISTS "stores owner full access" ON public.stores;
DROP POLICY IF EXISTS "stores public read published" ON public.stores;
DROP POLICY IF EXISTS "stores_owner_manage" ON public.stores;
DROP POLICY IF EXISTS "stores_select_policy" ON public.stores;
DROP POLICY IF EXISTS "stores_modify_policy" ON public.stores;

-- Le propriétaire gère ses propres boutiques
CREATE POLICY "stores_owner_manage" ON public.stores
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- Les employés peuvent lire les boutiques/funnels de leur propriétaire (via fonction sans récursion)
CREATE POLICY "stores_team_member_read" ON public.stores
FOR SELECT TO authenticated
USING (
    owner_id IN (SELECT public.get_accessible_owner_ids())
);

-- Les visiteurs peuvent voir les boutiques publiées
CREATE POLICY "stores_public_read_published" ON public.stores
FOR SELECT TO anon, authenticated
USING (
    status = 'active' OR status = 'published'
);

-- 5. NETTOYAGE ET RECONFIGURATION DE public.orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders owner read" ON public.orders;
DROP POLICY IF EXISTS "orders owner update" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_read" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_update" ON public.orders;
DROP POLICY IF EXISTS "orders public insert" ON public.orders;

CREATE POLICY "orders public insert" ON public.orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_team_member_read" ON public.orders
FOR SELECT TO authenticated
USING (
    assigned_to = auth.uid()
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

CREATE POLICY "orders_team_member_update" ON public.orders
FOR UPDATE TO authenticated
USING (
    assigned_to = auth.uid()
    OR store_id IN (SELECT public.get_accessible_store_ids())
);

-- 6. Rechargement immédiat du cache PostgREST
NOTIFY pgrst, 'reload schema';
