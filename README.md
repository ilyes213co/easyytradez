# StoreGen â€” Plateforme de gÃ©nÃ©ration de boutiques e-commerce

> CrÃ©ez et publiez une boutique e-commerce complÃ¨te en moins de 3 minutes grÃ¢ce Ã  l'IA (Claude API). Aucune compÃ©tence technique requise pour le marchand.

---

## Architecture

```
/
â”œâ”€â”€ platform/          â†’ Dashboard marchand (Next.js 14 + Tailwind)
â”œâ”€â”€ api/               â†’ Backend (FastAPI Python)
â””â”€â”€ store-template/    â†’ Template des boutiques gÃ©nÃ©rÃ©es (Next.js SSG)
```

## Stack technique (100% gratuit pour dÃ©marrer)

| Service       | Usage                         | Plan gratuit             |
|---------------|-------------------------------|--------------------------|
| Supabase      | DB + Auth + Storage           | 500MB DB, 1GB storage    |
| Cloudinary    | Images produits               | 25GB bandwidth/mois      |
| Claude API    | GÃ©nÃ©ration IA boutique        | Free tier disponible     |
| Vercel        | HÃ©bergement boutiques         | 100 deploys/jour         |
| GitHub        | Repo par boutique             | IllimitÃ© public/privÃ©    |
| Resend.com    | Emails transactionnels        | 3000 emails/mois         |
| Cloudflare    | DNS + CDN sous-domaines       | Gratuit                  |

---

## Installation

### 1. Cloner et configurer l'environnement

```bash
git clone https://github.com/votreuser/storegen
cd storegen
cp .env.example .env.local
# Remplissez toutes les variables dans .env.local
```

### 2. Supabase â€” CrÃ©er le schÃ©ma

Allez sur [supabase.com](https://supabase.com), crÃ©ez un projet, puis exÃ©cutez dans l'Ã©diteur SQL :

> Source of truth: use [`supabase/schema.sql`](./supabase/schema.sql).
> If your DB already exists, run [`supabase/migration_stores.sql`](./supabase/migration_stores.sql) after it.


```sql
-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  phone text,
  avatar_url text,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stores
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  primary_color text default '#534AB7',
  font_family text default 'modern',
  logo_url text,
  whatsapp_phone text,
  theme text default 'modern',
  animation_style text default 'soft',
  special_effects jsonb default '[]',
  status text default 'draft',
  subdomain text unique,
  vercel_project_id text,
  published_url text,
  seo_metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  name text not null,
  description text,
  price decimal(10,2) not null,
  original_price decimal(10,2),
  category text,
  stock_quantity integer default 0,
  images jsonb default '[]',
  is_featured boolean default false,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id),
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb not null,
  total_amount decimal(10,2),
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

-- Analytics
create table store_analytics (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  event_type text,
  product_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS Policies
alter table profiles      enable row level security;
alter table stores        enable row level security;
alter table products      enable row level security;
alter table orders        enable row level security;
alter table store_analytics enable row level security;

-- Profiles: user can only see their own
create policy "own profile" on profiles for all using (auth.uid() = id);

-- Stores: owner only
create policy "own stores" on stores for all using (auth.uid() = owner_id);

-- Products: owner of the store
create policy "own products" on products for all
  using (exists (select 1 from stores where stores.id = products.store_id and stores.owner_id = auth.uid()));

-- Orders: owner of the store
create policy "own orders" on orders for all
  using (exists (select 1 from stores where stores.id = orders.store_id and stores.owner_id = auth.uid()));

-- Analytics: insert from public (store visitors), read by store owner
create policy "public insert analytics" on store_analytics for insert with check (true);
create policy "owner read analytics" on store_analytics for select
  using (exists (select 1 from stores where stores.id = store_analytics.store_id and stores.owner_id = auth.uid()));

-- Trigger: updated_at auto-update
create or replace function update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger stores_updated   before update on stores   for each row execute function update_updated_at();
create trigger products_updated before update on products for each row execute function update_updated_at();
create trigger profiles_updated before update on profiles for each row execute function update_updated_at();

-- Storage Buckets
insert into storage.buckets (id, name, public) values ('store-logos', 'store-logos', true);
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
insert into storage.buckets (id, name, public) values ('store-builds', 'store-builds', false);

-- Storage policies
create policy "authenticated upload logos"    on storage.objects for insert to authenticated with check (bucket_id = 'store-logos');
create policy "public read logos"             on storage.objects for select using (bucket_id = 'store-logos');
create policy "authenticated upload products" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "public read products"          on storage.objects for select using (bucket_id = 'product-images');
```

### 3. Installer les dÃ©pendances

```bash
# Depuis la racine du projet
npm run install:all

# (optionnel) installer API seule dans le venv local
npm run install:api
```

### 4. Lancer en dÃ©veloppement

```bash
# Option recommandÃ©e (dashboard + API)
npm run dev

# Option complÃ¨te (dashboard + API + store-template)
npm run dev:full

# Option manuelle (3 terminaux)
# Terminal 1 â€” Dashboard (port 3000)
cd platform && npm run dev

# Terminal 2 â€” API FastAPI (port 8000, via venv local)
cd ../api && .\.venv\Scripts\python -m uvicorn main:app --reload --port 8000

# Terminal 3 â€” Store preview (port 3001)
cd ../store-template && npm run dev
```

### 5. Variables d'environnement requises

Copiez `.env.example` vers `.env.local` dans `/platform` et `.env` dans `/api` puis remplissez :

| Variable                      | OÃ¹ trouver                                      |
|-------------------------------|------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`    | Supabase â†’ Settings â†’ API                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase â†’ Settings â†’ API                   |
| `SUPABASE_SERVICE_KEY`        | Supabase â†’ Settings â†’ API (service_role key)  |
| `ANTHROPIC_API_KEY`           | console.anthropic.com                          |
| `VERCEL_TOKEN`                | vercel.com â†’ Settings â†’ Tokens                |
| `GITHUB_TOKEN`                | github.com â†’ Settings â†’ Developer settings    |
| `CLOUDINARY_*`                | cloudinary.com â†’ Dashboard                    |
| `RESEND_API_KEY`              | resend.com â†’ API Keys                         |

---

## Flux de crÃ©ation d'une boutique

```
Marchand remplit le wizard (5 Ã©tapes)
        â†“
POST /stores â†’ Supabase (status: draft)
POST /products â†’ upload photos Cloudinary
        â†“
Clic "Publier" â†’ POST /deploy/:store_id
        â†“
AIStoreGenerator.generate_store() â€” Claude API
        â†“
StoreDeployer:
  1. Push HTML â†’ GitHub repo
  2. Vercel crÃ©e le projet + dÃ©ploie
  3. Ajoute sous-domaine slug.platform.dz
        â†“
Supabase: status = "published", published_url = "https://slug.platform.dz"
        â†“
Email + SMS de confirmation au marchand
```

## Fichiers clÃ©s

| Fichier | RÃ´le |
|---------|------|
| `api/services/ai_generator.py` | Prompt Claude pour gÃ©nÃ©rer le HTML complet de la boutique |
| `api/services/deployer.py` | Pipeline GitHub + Vercel auto-deployment |
| `store-template/components/store/StoreShell.tsx` | Root de la boutique gÃ©nÃ©rÃ©e avec Context |
| `store-template/lib/cart.ts` | Panier localStorage + message WhatsApp |
| `platform/app/dashboard/` | Toutes les pages du dashboard marchand |

---

## Ã‰tapes suivantes (Phase 2)

- [ ] Wizard de crÃ©ation complet (5 Ã©tapes)
- [ ] ProductModal avec upload Cloudinary
- [ ] SÃ©lecteur de thÃ¨mes visuels avec preview live
- [ ] Dashboard analytics avec Recharts
- [ ] SystÃ¨me de notifications email (Resend.com)
- [ ] Support multi-langue (arabe RTL + franÃ§ais + anglais)

---

*Construit avec â¤ï¸ pour les e-commerÃ§ants algÃ©riens*
#   S h o p i f y c l o n e  
 