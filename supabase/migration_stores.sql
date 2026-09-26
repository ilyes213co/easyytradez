-- Compatibility migration for existing Supabase projects.
-- Aligns existing schemas to supabase/schema.sql canonical contract.
-- Safe to run multiple times.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------
-- profiles alignment
-- -------------------------------------------------------------------

alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists plan text default 'free',
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='plan') then
    alter table public.profiles drop constraint if exists profiles_plan_check;
    alter table public.profiles
      add constraint profiles_plan_check
      check (plan in ('free', 'pro', 'business'));
  end if;
end
$$;

-- -------------------------------------------------------------------
-- stores alignment
-- -------------------------------------------------------------------

alter table if exists public.stores
  add column if not exists category text,
  add column if not exists font_family text default 'modern',
  add column if not exists primary_color text default '#6366f1',
  add column if not exists theme text default 'modern',
  add column if not exists animation_style text default 'soft',
  add column if not exists special_effects jsonb default '[]'::jsonb,
  add column if not exists cover_url text,
  add column if not exists github_repo text,
  add column if not exists generated_html text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists slogan text,
  add column if not exists vercel_project_id text,
  add column if not exists subdomain text,
  add column if not exists published_url text,
  add column if not exists city text,
  add column if not exists country text default 'DZ',
  add column if not exists custom_domain text,
  add column if not exists facebook_pixel_id text,
  add column if not exists tiktok_pixel_id text,
  add column if not exists payment_settings jsonb default '{"cod_enabled": true, "baridimob_enabled": false, "baridimob_rip": "", "baridimob_name": "", "stripe_enabled": false}'::jsonb,
  add column if not exists google_sheets_webhook text,
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stores'
      and column_name = 'whatsapp_number'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stores'
      and column_name = 'whatsapp_phone'
  ) then
    alter table public.stores rename column whatsapp_number to whatsapp_phone;
  end if;
end
$$;

update public.stores
set status = case
  when status = 'active' then 'published'
  when status = 'inactive' then 'draft'
  else status
end
where status in ('active', 'inactive');

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.stores drop constraint if exists %I', c.conname);
  end loop;

  alter table public.stores
    add constraint stores_status_check
    check (status in ('draft', 'generating', 'generated', 'published', 'inactive', 'suspended'));
end
$$;

-- -------------------------------------------------------------------
-- products alignment
-- -------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='stock'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='stock_quantity'
  ) then
    alter table public.products rename column stock to stock_quantity;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='compare_price'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='original_price'
  ) then
    alter table public.products rename column compare_price to original_price;
  end if;
end
$$;

alter table if exists public.products
  add column if not exists slug text,
  add column if not exists original_price numeric(10,2),
  add column if not exists stock_quantity integer default 0,
  add column if not exists is_featured boolean default false,
  add column if not exists position integer default 0,
  add column if not exists sku text,
  add column if not exists variants jsonb default '[]'::jsonb,
  add column if not exists upsells jsonb default '[]'::jsonb,
  add column if not exists updated_at timestamptz default now();

do $$
declare current_type text;
begin
  select data_type
  into current_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'products'
    and column_name = 'images';

  if current_type is not null and current_type <> 'jsonb' then
    alter table public.products alter column images drop default;
    alter table public.products
      alter column images type jsonb
      using case
        when images is null then '[]'::jsonb
        else to_jsonb(images)
      end;
    alter table public.products alter column images set default '[]'::jsonb;
  end if;
end
$$;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.products drop constraint if exists %I', c.conname);
  end loop;

  alter table public.products
    add constraint products_status_check
    check (status in ('active', 'draft', 'archived'));
end
$$;

-- -------------------------------------------------------------------
-- orders alignment
-- -------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='total'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='total_amount'
  ) then
    alter table public.orders rename column total to total_amount;
  end if;
end
$$;

alter table if exists public.orders
  add column if not exists customer_email text,
  add column if not exists customer_address text,
  add column if not exists total_amount numeric(10,2) default 0,
  add column if not exists payment_status text default 'pending',
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now();

-- -------------------------------------------------------------------
-- missing tables required by API
-- -------------------------------------------------------------------

create table if not exists public.store_analytics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  event_type text not null,
  product_id uuid references public.products(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  html text,
  metadata jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.deploy_jobs (
  id uuid primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  url text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists public.deploy_jobs
  add column if not exists store_id uuid,
  add column if not exists user_id uuid,
  add column if not exists status text,
  add column if not exists url text,
  add column if not exists error text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists completed_at timestamptz;

-- -------------------------------------------------------------------
-- indexes
-- -------------------------------------------------------------------

create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_products_store_id on public.products(store_id);
create index if not exists idx_products_store_position on public.products(store_id, position);
create index if not exists idx_orders_store_id on public.orders(store_id);
create index if not exists idx_store_analytics_store_created on public.store_analytics(store_id, created_at desc);
create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index if not exists idx_generation_jobs_store_id on public.generation_jobs(store_id);
create index if not exists idx_deploy_jobs_user_id on public.deploy_jobs(user_id);
create index if not exists idx_deploy_jobs_store_id on public.deploy_jobs(store_id);

alter table if exists public.deploy_jobs enable row level security;

drop policy if exists "deploy_jobs owner full access" on public.deploy_jobs;

create policy "deploy_jobs owner full access"
  on public.deploy_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- delivery_zones
-- -------------------------------------------------------------------

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  wilaya_code text not null,
  fee numeric(10,2) not null default 600 check (fee >= 0),
  enabled boolean not null default true,
  free_above numeric(10,2) check (free_above is null or free_above >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, wilaya_code)
);

drop trigger if exists delivery_zones_set_updated_at on public.delivery_zones;
create trigger delivery_zones_set_updated_at
before update on public.delivery_zones
for each row execute procedure public.set_updated_at();

create index if not exists idx_delivery_zones_store_id on public.delivery_zones(store_id);

alter table if exists public.delivery_zones enable row level security;

drop policy if exists "delivery_zones owner full access" on public.delivery_zones;
drop policy if exists "delivery_zones public read enabled" on public.delivery_zones;

create policy "delivery_zones owner full access"
  on public.delivery_zones for all
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

create policy "delivery_zones public read enabled"
  on public.delivery_zones for select
  using (enabled = true);

-- -------------------------------------------------------------------
-- push_subscriptions
-- -------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_store_user on public.push_subscriptions(store_id, user_id);

alter table if exists public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions owner full access" on public.push_subscriptions;

create policy "push_subscriptions owner full access"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- ai_generation_logs
-- -------------------------------------------------------------------

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  method text not null,
  success boolean not null default true,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  total_tokens integer not null default 0,
  duration_seconds numeric(8,2) not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generation_logs_store on public.ai_generation_logs(store_id, created_at desc);

alter table if exists public.ai_generation_logs enable row level security;

drop policy if exists "ai_generation_logs owner read" on public.ai_generation_logs;

create policy "ai_generation_logs owner read"
  on public.ai_generation_logs for select
  using (
    store_id is null or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------
-- leads (Phase 2)
-- -------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  product_interest text,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_store_id on public.leads(store_id);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

alter table if exists public.leads enable row level security;

drop policy if exists "leads owner full access" on public.leads;
drop policy if exists "leads public insert" on public.leads;

create policy "leads owner full access"
  on public.leads for all
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

create policy "leads public insert"
  on public.leads for insert
  with check (true);

-- -------------------------------------------------------------------
-- store_members (Phase 2)
-- -------------------------------------------------------------------

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_email text not null,
  role text not null default 'manager'
    check (role in ('admin', 'manager', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited')),
  created_at timestamptz not null default now()
);

create index if not exists idx_store_members_store_id on public.store_members(store_id);
create index if not exists idx_store_members_email on public.store_members(user_email);

alter table if exists public.store_members enable row level security;

drop policy if exists "store_members owner full access" on public.store_members;

create policy "store_members owner full access"
  on public.store_members for all
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------
-- abandoned_carts (Phase 2)
-- -------------------------------------------------------------------

create table if not exists public.abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text,
  customer_phone text not null,
  customer_address text,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  recovered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_abandoned_carts_store_id on public.abandoned_carts(store_id);
create index if not exists idx_abandoned_carts_phone on public.abandoned_carts(customer_phone);

alter table if exists public.abandoned_carts enable row level security;

drop policy if exists "abandoned_carts owner full access" on public.abandoned_carts;
drop policy if exists "abandoned_carts public insert" on public.abandoned_carts;
drop policy if exists "abandoned_carts public update" on public.abandoned_carts;

create policy "abandoned_carts owner full access"
  on public.abandoned_carts for all
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

create policy "abandoned_carts public insert"
  on public.abandoned_carts for insert
  with check (true);

create policy "abandoned_carts public update"
  on public.abandoned_carts for update
  using (true)
  with check (true);
