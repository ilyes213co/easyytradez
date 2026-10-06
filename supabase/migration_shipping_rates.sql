-- ==============================================================================
-- Migration : shipping_rates (Tarifs de livraison personnalisés par boutique)
-- Date: 2026-10-05
-- ==============================================================================

-- 1. CRÉATION DE LA TABLE shipping_rates
CREATE TABLE IF NOT EXISTS public.shipping_rates (
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    wilaya_id INTEGER NOT NULL REFERENCES public.wilayas(id) ON DELETE CASCADE,
    price_home INTEGER NOT NULL DEFAULT 500,
    price_desk INTEGER NOT NULL DEFAULT 300,
    eta TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_shipping_rates PRIMARY KEY (store_id, wilaya_id)
);

-- Index pour accélérer les requêtes de filtrage par store
CREATE INDEX IF NOT EXISTS idx_shipping_rates_store_id 
    ON public.shipping_rates(store_id);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Lecture publique : Tout le monde (y compris les acheteurs anonymes sur la boutique/funnel)
-- peut consulter les tarifs de livraison pour calculer son panier en direct
DROP POLICY IF EXISTS "shipping_rates_public_read" ON public.shipping_rates;
CREATE POLICY "shipping_rates_public_read" 
    ON public.shipping_rates 
    FOR SELECT 
    USING (true);

-- Écriture : Seul le propriétaire du store peut insérer/modifier/supprimer
DROP POLICY IF EXISTS "shipping_rates_owner_all" ON public.shipping_rates;
CREATE POLICY "shipping_rates_owner_all" 
    ON public.shipping_rates 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = shipping_rates.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores 
            WHERE stores.id = shipping_rates.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 3. TRIGGER DE PRÉ-REMPLISSAGE AUTOMATIQUE (58 WILAYAS À LA CRÉATION)
CREATE OR REPLACE FUNCTION public.handle_new_store_shipping_rates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.shipping_rates (store_id, wilaya_id, price_home, price_desk, eta, updated_at)
    SELECT 
        NEW.id,
        w.id,
        w.price_home,
        w.price_desk,
        w.eta,
        NOW()
    FROM public.wilayas w
    ON CONFLICT (store_id, wilaya_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_shipping_rates ON public.stores;
CREATE TRIGGER trg_store_shipping_rates
    AFTER INSERT ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_store_shipping_rates();

-- 4. BACKFILL POUR LES BOUTIQUES ET FUNNELS DÉJÀ EXISTANTS
INSERT INTO public.shipping_rates (store_id, wilaya_id, price_home, price_desk, eta, updated_at)
SELECT 
    s.id,
    w.id,
    w.price_home,
    w.price_desk,
    w.eta,
    NOW()
FROM public.stores s
CROSS JOIN public.wilayas w
ON CONFLICT (store_id, wilaya_id) DO NOTHING;

-- 5. RECHARGEMENT IMMÉDIAT DU CACHE DE SCHÉMA POSTGREST
NOTIFY pgrst, 'reload schema';
