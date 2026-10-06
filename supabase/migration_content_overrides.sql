-- =============================================================================
-- Migration : content_overrides & RPC sécurisée pour édition in-place
-- =============================================================================

-- 1. Table 'stores' : colonne + index GIN
alter table if exists public.stores 
  add column if not exists content_overrides jsonb not null default '{}'::jsonb;

create index if not exists idx_stores_content_overrides 
  on public.stores using gin (content_overrides);

-- 2. Table 'funnels' : colonne + index GIN (bloc conditionnel)
do $$
begin
  if exists (
    select 1 
    from information_schema.tables 
    where table_schema = 'public' and table_name = 'funnels'
  ) then
    alter table public.funnels 
      add column if not exists content_overrides jsonb not null default '{}'::jsonb;

    create index if not exists idx_funnels_content_overrides 
      on public.funnels using gin (content_overrides);
  end if;
end $$;

-- 3. Fonction RPC PostgreSQL atomique
create or replace function public.patch_store_content_overrides(
  p_store_id uuid,
  p_patches jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_current jsonb;
  v_key text;
  v_val jsonb;
begin
  -- Verrouille la ligne du store contre les écritures concurrentes
  select coalesce(content_overrides, '{}'::jsonb)
  into v_current
  from public.stores
  where id = p_store_id
  for update;

  if not found then
    return null;
  end if;

  -- Parcours de chaque patch reçu
  for v_key, v_val in select * from jsonb_each(p_patches) loop
    if v_val is null or jsonb_typeof(v_val) = 'null' then
      -- Suppression de la clé si la valeur est null
      v_current = v_current - v_key;
    else
      -- Fusion de la nouvelle valeur (merge JSONB)
      v_current = v_current || jsonb_build_object(v_key, v_val);
    end if;
  end loop;

  -- Sauvegarde
  update public.stores
  set content_overrides = v_current,
      updated_at = now()
  where id = p_store_id;

  return v_current;
end;
$$;

-- 4. Sécurisation stricte (accès réservé exclusivement à FastAPI via service_role)
revoke all on function public.patch_store_content_overrides(uuid, jsonb) from public;
revoke execute on function public.patch_store_content_overrides(uuid, jsonb) from anon, authenticated;
grant execute on function public.patch_store_content_overrides(uuid, jsonb) to service_role;

-- 5. Notification pour forcer PostgREST à recharger son cache de schéma immédiatement
notify pgrst, 'reload schema';
