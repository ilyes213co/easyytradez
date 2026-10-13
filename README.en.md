🇫🇷 [Version française](./README.md)

# EasyTradez 🇩🇿

> **Open-source e-commerce platform and Shopify alternative, purpose-built and optimized for the Algerian market.**

---

## 1. Description & Problem Solved

In Algeria, launching an online store using international solutions such as Shopify, WooCommerce, or Wix comes with critical barriers:
- **Lack of widely adopted international payment methods** (Visa/Mastercard credit cards are rarely accessible to the general public).
- **Absolute predominance of Cash on Delivery (COD)**: over 95% of e-commerce purchases are paid in cash upon physical package delivery.
- **Logistics specific to Algeria's 58 Wilayas (provinces)**: distinct shipping rates between door-to-door home delivery and parcel pickup points (Stop-Desk) operated by domestic couriers (Yalidine, ZR Express, Procolis).
- **Accounting and transactions in Algerian Dinar (DZD)** along with domestic payment rails (Edahabia cards and BaridiMob).

**EasyTradez** addresses these challenges by delivering an all-in-one, ultra-lightweight, mobile-first platform crafted for local Algerian e-commerce realities: any merchant or brand creator can deploy a full-featured storefront or high-converting single-product sales funnel in minutes.

---

## 2. Implemented Features

The following features are **fully implemented, tested, and operational** in the current codebase:

### 🛍️ Storefronts & Sales Funnels
- **Dual Selling Formats**:
  - **Multi-product Catalog Storefront**: organized by categories, product detail pages, smooth browsing.
  - **High-Converting Single-Product Funnel**: streamlined direct sales funnel dedicated to social ads (TikTok Ads, Meta Ads).
- **10 Pre-calibrated Visual Themes**: Neo-Brutalist, Playful Pumpkin, Blossom Lavender, Crimson, Natural, Tuareg Indigo, Energetic, Monochrome, Luxe Noir, Phantom (dynamic contrast adaptation and typography).
- **Mobile-First Experience**: instant page loads optimized for mobile shoppers over 3G/4G connections.
- **Zero-Friction COD Checkout Form**: 1-step checkout (Full Name, Phone, Wilaya, Municipality, Address) requiring no bank card whatsoever from buyers.

### 📦 Product & Catalog Management
- Create, update, archive, and delete products.
- Standard price and promotional strikethrough price in Algerian Dinars (**DZD**).
- Real-time stock tracking with automated out-of-stock indicators.
- Variant options (sizes, colors, custom attributes).
- Product image uploads (via Supabase Storage or Cloudinary).

### 🚚 58-Wilaya Logistics
- Custom shipping rate configuration for each of Algeria's 58 provinces.
- Support for dual delivery modes: **Home Delivery** and **Stop-Desk Pickup**.
- Display of estimated delivery times (ETA).

### 📊 Merchant Dashboard
- Complete order management and lifecycle tracking (`Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`).
- Customer contact details, delivery address, and ordered items inspection.
- Brand identity customization (store logo, banner cover, accent color, WhatsApp support contact).

### ⚡ SEO & AI Visibility (GEO)
- Server-Side Rendering (**SSR / Server Components**) for instant indexing by search engine crawlers.
- Comprehensive Schema.org JSON-LD structured data (`Organization`, `Product`, `Offer` in DZD, `Store`, `FAQPage`).
- Dynamic XML sitemap generation (`/sitemap.xml`) reflecting published stores and active products.
- Crawler configuration (`/robots.txt`) explicitly allowing search engines and AI web crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.).
- Machine-readable `/llms.txt` standard for accurate attribution across generative AI search engines.

### 💳 Merchant Subscriptions & Local Gateway
- Tiered subscription plans (Free, Pro, Business).
- Integration with Algerian payment gateway **Slick-Pay** for subscription billing via **Edahabia** and **BaridiMob**.

### 🔔 Notifications
- **Web Push Notifications** alerting merchants in real time whenever a new order is placed.

---

## 3. Technology Stack

| Component | Technology | Exact Version | Role |
| :--- | :--- | :--- | :--- |
| **Frontend Platform** | Next.js (App Router) | `14.2.5` | Dashboard, public storefronts, checkout |
| **UI & Styles** | Tailwind CSS / CSS Variables | `3.4.6` | Design system & theme engine |
| **Frontend Language** | TypeScript | `5.5.3` | Type safety and static verification |
| **UI Library** | React | `18.3.1` | Reactive user interface |
| **State & Data Fetching** | Zustand / TanStack Query | `4.5.4` / `5.51.1` | Global state management & client cache |
| **Backend API** | FastAPI (Python) | `>=0.111.0` | REST API, business logic |
| **ASGI Server** | Uvicorn | `>=0.29.0` | High-performance Python web server |
| **Database & Auth** | Supabase (PostgreSQL) | `^2.44.4` (JS) / `>=2.4.6` (Py) | Authentication, relational data, RLS, Storage |
| **Backend Validation** | Pydantic | `>=2.7.1` | Strict data schema parsing |
| **AI (Optional)** | Google GenAI / Anthropic | `>=1.0.0` / API | AI content and theme generation |
| **Hosting** | Vercel | — | Cloud deployment platform |

---

## 4. Project Structure

```
opensource-shopify/
├── platform/               # Core Next.js 14 application (Frontend & Storefronts)
│   ├── app/                # Next.js App Router (pages, layouts, API routes)
│   │   ├── [slug]/         # Public merchant storefronts (Store & Funnel)
│   │   ├── dashboard/      # Authenticated merchant back-office
│   │   ├── sitemap.ts      # Dynamic sitemap.xml generation
│   │   └── robots.ts       # robots.txt rules (search engines + AI bots)
│   ├── components/         # React components (funnels, checkout, dashboard)
│   ├── lib/                # Supabase clients, utility helpers, API services
│   ├── public/             # Static public assets (icons, llms.txt)
│   └── styles/themes/      # Stylesheets for the 10 visual themes
├── api/                    # FastAPI backend (Python)
│   ├── routes/             # Endpoints (stores, products, orders, payment, upload)
│   ├── services/           # Service layer (deployment, AI, DB resilience)
│   ├── models/             # Pydantic data schemas
│   ├── dependencies.py     # FastAPI dependencies (auth, Supabase client injection)
│   ├── requirements.txt    # Python package dependencies
│   └── main.py             # FastAPI entrypoint
├── store-template/         # Standalone Next.js template for local preview (port 3001)
├── supabase/               # SQL database schemas and migration scripts
│   ├── schema.sql          # Complete database schema (source of truth)
│   └── migration_*.sql     # Incremental migration scripts
├── scripts/                # Automated maintenance scripts
├── run.py                  # One-line starter script for FastAPI (port 8000)
├── start.bat               # Windows batch script to launch frontend + backend in 1 click
└── package.json            # Monorepo NPM root (workspaces platform & store-template)
```

---

## 5. Prerequisites

Before setting up the project locally, verify that your machine has:
- **Node.js**: version `18.17.0` or higher (`20.x` recommended).
- **npm**: version `9.x` or higher.
- **Python**: version `3.10` or `3.11` (recommended).
- **Git**: for source control.
- **A free Supabase account**: to host your PostgreSQL database, authentication, and file storage.

---

## 6. Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/ilyes213co/opensource-shopify.git
cd opensource-shopify
```

### Step 2: Install Frontend Dependencies
From the repository root:
```bash
npm install
cd platform && npm install
cd ..
```

### Step 3: Install Backend Dependencies
Create and activate a Python virtual environment in the `api` folder:

**On Windows (PowerShell / CMD):**
```bash
cd api
python -m venv .venv
.\.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

**On Linux / macOS:**
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### Step 4: Configure Supabase Database
1. Go to your [Supabase](https://supabase.com) dashboard and create a new project.
2. Navigate to the **SQL Editor** tab.
3. Paste the complete contents of [`supabase/schema.sql`](./supabase/schema.sql) and execute the script.
4. Enable email authentication under **Authentication → Providers**.

---

## 7. Environment Variables

Create `.env.local` inside the `platform/` directory and `.env` inside `api/` (or at the repository root), referencing [`.env.example`](./.env.example).

> ⚠️ **Important:** Never commit `.env` or `.env.local` files to source control. The values below describe expected variable keys.

### Required Variables (Minimal Setup)

| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend & Backend | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Public anonymous Supabase key (exposed client-side) |
| `SUPABASE_URL` | Backend | Supabase project URL for the Python service |
| `SUPABASE_SERVICE_KEY` | Frontend & Backend | Supabase `service_role` key with administrative rights |
| `NEXT_PUBLIC_API_URL` | Frontend | FastAPI backend URL (e.g. `http://localhost:8000`) |
| `NEXT_PUBLIC_APP_URL` | Frontend | Platform base URL (e.g. `http://localhost:3000` locally, `https://easytradez.site` in production) |
| `CORS_ALLOW_ORIGINS` | Backend | Allowed origins for CORS (e.g. `http://localhost:3000,http://127.0.0.1:3000`) |

### Optional Variables (Advanced Integrations)

| Variable Name | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key for AI-assisted copy generation |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key for AI generation fallback |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary credentials for media hosting |
| `SLICKPAY_API_KEY` / `SLICKPAY_ENV` | API credentials for Algerian Slick-Pay gateway (BaridiMob / Edahabia) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_MAILTO` | Web Push notification server credentials |
| `RESEND_API_KEY` / `FROM_EMAIL` | Resend API key for transactional email confirmations |
| `VERCEL_TOKEN` / `GITHUB_TOKEN` | Automation tokens for multi-project provisioning |

---

## 8. Local Development

### Option A: One-Click Startup (Windows)
If you are running Windows, double-click:
```cmd
start.bat
```
This script launches two command windows in parallel:
1. The FastAPI backend at `http://127.0.0.1:8000`
2. The Next.js frontend at `http://localhost:3000`

---

### Option B: NPM Root Script (Recommended)
From the project root, launch both processes concurrently:
```bash
npm run dev
```

---

### Option C: Manual Launch (Two Separate Terminals)

**Terminal 1 — FastAPI Backend:**
```bash
python run.py
# Or alternatively:
cd api
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The API is available at `http://127.0.0.1:8000` and the interactive Swagger documentation is accessible at `http://127.0.0.1:8000/docs`.

**Terminal 2 — Next.js Frontend:**
```bash
cd platform
npm run dev
```
The frontend application is available at `http://localhost:3000`.

---

## 9. Merchant User Journey

Here is the standard merchant flow, fully implemented and validated in the codebase:

```
1. Merchant Signup (/register)
       ↓
2. Storefront / Funnel Creation (/dashboard/boutique/create or /dashboard/funnel/create)
   - Choose a brand name and unique identifier (slug)
   - Select one of 10 calibrated visual themes
       ↓
3. Product Management (/dashboard/products)
   - Add items with title, description, price in DZD, and photos
   - Configure stock inventory levels
       ↓
4. Shipping Configuration (/dashboard/delivery)
   - Customize Home Delivery and Stop-Desk Pickup rates across all 58 Wilayas
       ↓
5. Share Storefront Link (https://easytradez.site/[slug] or http://localhost:3000/[slug])
   - Shoppers complete orders in 1 step through the friction-free COD form
       ↓
6. Order Processing (/dashboard/orders)
   - Track order statuses, confirm by phone, and dispatch packages
```

---

## 10. Contributing

Contributions are warmly welcomed! To submit an enhancement or bug fix:

1. **Fork** the repository.
2. Create a dedicated feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Follow the project's commit guidelines (**Conventional Commits**):
   - `feat(scope): ...` for new features
   - `fix(scope): ...` for bug fixes
   - `docs(scope): ...` for documentation updates
   - `chore(scope): ...` for maintenance and dependency updates
4. Confirm that the application builds cleanly without errors:
   ```bash
   cd platform && npm run build
   ```
5. Push your branch and open a clear, descriptive **Pull Request**.

---

## 11. License

This project is licensed under the **MIT License**. See the [`LICENSE`](./LICENSE) file for details.

---

## 12. Author & Contact

- **Creator & Maintainer**: [@ilyes213co](https://github.com/ilyes213co)
- **Official Repository**: [https://github.com/ilyes213co/opensource-shopify](https://github.com/ilyes213co/opensource-shopify)
- **Live Production Platform**: [https://easytradez.site](https://easytradez.site)
