-- Migration: Add type column to stores table ('boutique' | 'funnel')
-- Compatible with existing Supabase projects and safe to run multiple times.

alter table if exists public.stores 
  add column if not exists type text not null default 'boutique';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stores'
      and column_name = 'type'
  ) then
    alter table public.stores drop constraint if exists stores_type_check;
    alter table public.stores
      add constraint stores_type_check
      check (type in ('boutique', 'funnel'));
  end if;
end
$$;

create index if not exists idx_stores_owner_type on public.stores(owner_id, type);
