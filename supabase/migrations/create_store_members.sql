-- ==============================================================================
-- Migration : store_members (Gestion multi-utilisateurs & permissions d'équipe)
-- Module Équipe — Exclusivité Pack Business
-- Date: 2026-10-17
-- ==============================================================================

-- 1. CRÉATION DE LA TABLE store_members
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    user_email TEXT,
    role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'editor', 'viewer', 'support')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited', 'pending', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_members_store_email UNIQUE (store_id, email)
);

-- Index pour optimiser les requêtes par store et par email
CREATE INDEX IF NOT EXISTS idx_store_members_store_id 
    ON public.store_members(store_id);

CREATE INDEX IF NOT EXISTS idx_store_members_email 
    ON public.store_members(email);

CREATE INDEX IF NOT EXISTS idx_store_members_user_email 
    ON public.store_members(user_email);

-- 2. TRIGGER DE SYNCHRONISATION email <-> user_email
CREATE OR REPLACE FUNCTION public.sync_store_member_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.email IS NULL AND NEW.user_email IS NOT NULL THEN
        NEW.email := LOWER(TRIM(NEW.user_email));
    ELSIF NEW.user_email IS NULL AND NEW.email IS NOT NULL THEN
        NEW.user_email := LOWER(TRIM(NEW.email));
    ELSE
        NEW.email := LOWER(TRIM(NEW.email));
        NEW.user_email := LOWER(TRIM(NEW.user_email));
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_member_emails ON public.store_members;
CREATE TRIGGER trg_sync_store_member_emails
    BEFORE INSERT OR UPDATE ON public.store_members
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_store_member_emails();

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Les propriétaires de boutique ont tous les droits sur les membres de leurs boutiques
DROP POLICY IF EXISTS "store_members_owner_all" ON public.store_members;
CREATE POLICY "store_members_owner_all"
    ON public.store_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = store_members.store_id
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores
            WHERE stores.id = store_members.store_id
            AND stores.owner_id = auth.uid()
        )
    );

-- Les membres invités peuvent consulter leur propre assignation
DROP POLICY IF EXISTS "store_members_user_read" ON public.store_members;
CREATE POLICY "store_members_user_read"
    ON public.store_members
    FOR SELECT
    TO authenticated
    USING (
        email = (auth.jwt() ->> 'email')
        OR user_email = (auth.jwt() ->> 'email')
    );
