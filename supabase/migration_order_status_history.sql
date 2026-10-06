-- ============================================================================
-- Migration : Historique des statuts de commande (status_history)
-- ============================================================================

-- 1. Ajout de la colonne status_history si elle n'existe pas encore
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '{}'::jsonb;

-- 2. Index GIN optionnel pour des requêtes analytiques sur l'historique
CREATE INDEX IF NOT EXISTS idx_orders_status_history 
ON public.orders USING gin (status_history);

-- 3. Recharger le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
