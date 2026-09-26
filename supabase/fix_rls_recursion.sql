-- =====================================================================
-- Fix RLS Infinite Recursion on stores, products, and orders
-- Error code: 42P17 "infinite recursion detected in policy for relation 'stores'"
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/lyntwhvvnklmcprnnump
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run" (or Ctrl+Enter)
-- =====================================================================

-- 1. Dynamically drop ALL existing policies on stores, products, orders, store_analytics
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('stores', 'products', 'orders', 'store_analytics')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- 2. Ensure RLS is enabled on all tables and missing columns exist
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_analytics ENABLE ROW LEVEL SECURITY;

-- Add status column to products if missing
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 3. STORES POLICIES (Strictly non-recursive: NO subqueries to products/orders!)
-- Store owners have full CRUD access
CREATE POLICY "stores_owner_all"
    ON public.stores
    FOR ALL
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Public can read published/active storefronts
CREATE POLICY "stores_public_read"
    ON public.stores
    FOR SELECT
    TO anon, authenticated
    USING (status IN ('published', 'active'));

-- 4. PRODUCTS POLICIES
-- Store owner has full CRUD access to products belonging to their stores
CREATE POLICY "products_owner_all"
    ON public.products
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = public.products.store_id
              AND s.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = public.products.store_id
              AND s.owner_id = auth.uid()
        )
    );

-- Public can read active products
CREATE POLICY "products_public_read"
    ON public.products
    FOR SELECT
    TO anon, authenticated
    USING (status = 'active');

-- 5. ORDERS POLICIES
-- Store owner can view and update orders for their stores
CREATE POLICY "orders_owner_all"
    ON public.orders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = public.orders.store_id
              AND s.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = public.orders.store_id
              AND s.owner_id = auth.uid()
        )
    );

-- Anyone (customers) can place orders
CREATE POLICY "orders_public_insert"
    ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 6. STORE ANALYTICS POLICIES
-- Store owner can view analytics for their stores
CREATE POLICY "analytics_owner_read"
    ON public.store_analytics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stores s
            WHERE s.id = public.store_analytics.store_id
              AND s.owner_id = auth.uid()
        )
    );

-- Public/storefront can insert tracking events
CREATE POLICY "analytics_public_insert"
    ON public.store_analytics
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
