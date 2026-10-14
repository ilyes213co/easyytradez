-- ==============================================================================
-- Migration: Enable Supabase Realtime Publication for Orders & Stores
-- ==============================================================================
-- This migration ensures that database inserts, updates, and deletes are broadcast
-- instantly in real time via Supabase Realtime WebSockets to the merchant dashboard.

-- 1. Configure replica identity full so all columns (including updated statuses)
-- are broadcast to RLS-filtered realtime subscriptions
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.stores REPLICA IDENTITY FULL;

-- 2. Add orders and stores tables to the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  END IF;
END $$;
