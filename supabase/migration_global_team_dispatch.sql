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
WHERE (LOWER(TRIM(sm.email)) = LOWER(TRIM(u.email)) OR LOWER(TRIM(sm.user_email)) = LOWER(TRIM(u.email)))
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

-- 3. POLITIQUES RLS SUR public.stores (Accès aux boutiques pour l'équipe)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_team_member_read" ON public.stores;
CREATE POLICY "stores_team_member_read" ON public.stores
FOR SELECT TO authenticated
USING (
    stores.owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.owner_id = stores.owner_id
        AND (
            sm.user_id = auth.uid() 
            OR LOWER(sm.email) = LOWER(auth.jwt() ->> 'email') 
            OR LOWER(sm.user_email) = LOWER(auth.jwt() ->> 'email')
        )
        AND sm.status IN ('active', 'invited')
    )
);

-- 4. POLITIQUES RLS SUR public.orders (Accès lecture & mise à jour pour l'équipe)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders owner read" ON public.orders;
DROP POLICY IF EXISTS "orders owner update" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_read" ON public.orders;
DROP POLICY IF EXISTS "orders_team_member_update" ON public.orders;

CREATE POLICY "orders_team_member_read" ON public.orders
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = orders.store_id
        AND (
            s.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.store_members sm
                WHERE sm.owner_id = s.owner_id
                AND (
                    sm.user_id = auth.uid() 
                    OR LOWER(sm.email) = LOWER(auth.jwt() ->> 'email') 
                    OR LOWER(sm.user_email) = LOWER(auth.jwt() ->> 'email')
                )
                AND sm.status IN ('active', 'invited')
            )
        )
    )
);

CREATE POLICY "orders_team_member_update" ON public.orders
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = orders.store_id
        AND (
            s.owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.store_members sm
                WHERE sm.owner_id = s.owner_id
                AND (
                    sm.user_id = auth.uid() 
                    OR LOWER(sm.email) = LOWER(auth.jwt() ->> 'email') 
                    OR LOWER(sm.user_email) = LOWER(auth.jwt() ->> 'email')
                )
                AND sm.status IN ('active', 'invited')
            )
        )
    )
);

-- 5. POLITIQUES RLS SUR public.store_members
DROP POLICY IF EXISTS "store_members_owner_all" ON public.store_members;
CREATE POLICY "store_members_owner_all" ON public.store_members
FOR ALL TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_members.store_id
        AND s.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "store_members_user_read" ON public.store_members;
CREATE POLICY "store_members_user_read" ON public.store_members
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR LOWER(user_email) = LOWER(auth.jwt() ->> 'email')
);

-- Recharger le schéma PostgREST
NOTIFY pgrst, 'reload schema';
