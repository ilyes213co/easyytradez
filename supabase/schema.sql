-- StoreGen canonical schema
-- Source of truth for Supabase tables used by platform + api.
-- Aligned with api routes as of 2026-03-27.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------
-- Shared helpers
-- -------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  plan text not null default 'free'
    check (plan in ('free', 'pro', 'business')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  begin
    drop trigger if exists on_auth_user_created on auth.users;
  exception when others then
    null;
  end;

  if not exists (
    select 1
    from information_schema.triggers
    where event_object_schema = 'auth'
      and event_object_table = 'users'
      and trigger_name = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
  end if;
end
$$;

-- -------------------------------------------------------------------
-- stores
-- -------------------------------------------------------------------

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  whatsapp_phone text,
  primary_color text not null default '#6366f1',
  font_family text default 'modern',
  theme text not null default 'modern',
  animation_style text not null default 'soft',
  special_effects jsonb not null default '[]'::jsonb,
  category text,
  currency text not null default 'DZD',
  city text,
  country text not null default 'DZ',
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'generated', 'published', 'inactive', 'suspended')),
  subdomain text unique,
  vercel_project_id text,
  published_url text,
  github_repo text,
  generated_html text,
  seo_title text,
  seo_description text,
  seo_metadata jsonb not null default '{}'::jsonb,
  slogan text,
  custom_domain text,
  facebook_pixel_id text,
  tiktok_pixel_id text,
  payment_settings jsonb not null default '{"cod_enabled": true, "baridimob_enabled": false, "baridimob_rip": "", "baridimob_name": "", "stripe_enabled": false}'::jsonb,
  google_sheets_webhook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute procedure public.set_updated_at();

create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_stores_status on public.stores(status);

-- -------------------------------------------------------------------
-- products
-- -------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text,
  description text,
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2) check (original_price is null or original_price > price),
  category text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images jsonb not null default '[]'::jsonb,
  sku text,
  variants jsonb not null default '[]'::jsonb,
  upsells jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  position integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'draft', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create index if not exists idx_products_store_id on public.products(store_id);
create index if not exists idx_products_store_position on public.products(store_id, position);
create index if not exists idx_products_status on public.products(status);
create unique index if not exists uq_products_store_slug
  on public.products(store_id, slug)
  where slug is not null;

-- -------------------------------------------------------------------
-- orders
-- -------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_address text,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(10,2) not null default 0 check (total_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create index if not exists idx_orders_store_id on public.orders(store_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- -------------------------------------------------------------------
-- store_analytics
-- -------------------------------------------------------------------

create table if not exists public.store_analytics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  event_type text not null,
  product_id uuid references public.products(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_analytics_store_created
  on public.store_analytics(store_id, created_at desc);
create index if not exists idx_store_analytics_event_type
  on public.store_analytics(event_type);

-- -------------------------------------------------------------------
-- generation_jobs
-- -------------------------------------------------------------------

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

create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index if not exists idx_generation_jobs_store_id on public.generation_jobs(store_id);
create index if not exists idx_generation_jobs_status on public.generation_jobs(status);

-- -------------------------------------------------------------------
-- deploy_jobs
-- -------------------------------------------------------------------

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

create index if not exists idx_deploy_jobs_user_id on public.deploy_jobs(user_id);
create index if not exists idx_deploy_jobs_store_id on public.deploy_jobs(store_id);
create index if not exists idx_deploy_jobs_status on public.deploy_jobs(status);

-- -------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.store_analytics enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.deploy_jobs enable row level security;

drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;

create policy "profiles own read"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles own update"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles own insert"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "stores owner full access" on public.stores;
drop policy if exists "stores public read published" on public.stores;

create policy "stores owner full access"
  on public.stores for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "stores public read published"
  on public.stores for select
  using (status in ('published', 'active'));

drop policy if exists "products owner full access" on public.products;
drop policy if exists "products public read active" on public.products;

create policy "products owner full access"
  on public.products for all
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

create policy "products public read active"
  on public.products for select
  using (status = 'active');

drop policy if exists "orders owner read" on public.orders;
drop policy if exists "orders owner update" on public.orders;
drop policy if exists "orders public insert" on public.orders;

create policy "orders owner read"
  on public.orders for select
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

create policy "orders owner update"
  on public.orders for update
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

create policy "orders public insert"
  on public.orders for insert
  with check (true);

drop policy if exists "analytics public insert" on public.store_analytics;
drop policy if exists "analytics owner read" on public.store_analytics;

create policy "analytics public insert"
  on public.store_analytics for insert
  with check (true);

create policy "analytics owner read"
  on public.store_analytics for select
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.owner_id = auth.uid()
    )
  );

drop policy if exists "generation_jobs owner full access" on public.generation_jobs;
drop policy if exists "deploy_jobs owner full access" on public.deploy_jobs;

create policy "generation_jobs owner full access"
  on public.generation_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- -------------------------------------------------------------------
-- Additional RLS
-- -------------------------------------------------------------------

alter table public.delivery_zones enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.ai_generation_logs enable row level security;

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

drop policy if exists "push_subscriptions owner full access" on public.push_subscriptions;

create policy "push_subscriptions owner full access"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute procedure public.set_updated_at();

create index if not exists idx_leads_store_id on public.leads(store_id);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

alter table public.leads enable row level security;

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

alter table public.store_members enable row level security;

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

drop trigger if exists abandoned_carts_set_updated_at on public.abandoned_carts;
create trigger abandoned_carts_set_updated_at
before update on public.abandoned_carts
for each row execute procedure public.set_updated_at();

create index if not exists idx_abandoned_carts_store_id on public.abandoned_carts(store_id);
create index if not exists idx_abandoned_carts_phone on public.abandoned_carts(customer_phone);

alter table public.abandoned_carts enable row level security;

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
