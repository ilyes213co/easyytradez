-- ============================================================================
-- Migration : plan_transactions (Abonnements SaaS via SlickPay / BaridiMob / CIB)
-- ============================================================================
-- Contexte : Paiement des abonnements de la plateforme par les marchands
--            (Plan Gratuit, Pro 2000 DZD/mois, Business 5000 DZD/mois).
-- ============================================================================

-- 1. Table plan_transactions
CREATE TABLE IF NOT EXISTS public.plan_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan            TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'business')),
    amount          NUMERIC(12, 2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'DZD',
    billing_period  TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    invoice_id      TEXT,
    payment_url     TEXT,
    slickpay_raw    JSONB DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
    paid_at         TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_plan_tx_user_id    ON public.plan_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_tx_invoice_id ON public.plan_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_plan_tx_status     ON public.plan_transactions(status);

-- 3. Sécurité RLS
ALTER TABLE public.plan_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_tx_user_read" ON public.plan_transactions;
CREATE POLICY "plan_tx_user_read"
    ON public.plan_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS plan_transactions_set_updated_at ON public.plan_transactions;
CREATE TRIGGER plan_transactions_set_updated_at
    BEFORE UPDATE ON public.plan_transactions
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 4. Ajout de la date d'expiration de l'abonnement sur la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 5. Rechargement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
