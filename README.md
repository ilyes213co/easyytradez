🇬🇧 [English version](./README.en.md)

# EasyTradez 🇩🇿

> **Plateforme e-commerce open source et alternative à Shopify, spécialement conçue et optimisée pour le marché algérien.**

---

## 1. Description & Problème Résolu

En Algérie, lancer une boutique e-commerce avec des plateformes internationales comme Shopify, WooCommerce ou Wix pose des obstacles majeurs :
- **Absence de moyens de paiement internationaux généralisés** (cartes Visa/Mastercard peu accessibles au grand public).
- **Dominance absolue du Paiement à la Livraison (Cash on Delivery - COD)** : plus de 95% des transactions s'effectuent en espèces à la réception du colis.
- **Logistique spécifique aux 58 Wilayas** : tarifs d'expédition différenciés entre livraison à domicile et retrait en point relais (Stop-Desk) avec des transporteurs locaux (Yalidine, ZR Express, Procolis).
- **Comptabilité en Dinar Algérien (DZD)** et utilisation des passerelles de paiement locales (Edahabia et BaridiMob).

**EasyTradez** résout ces problématiques en fournissant une solution tout-en-un, ultra-légère, mobile-first et pensée pour les réalités du marché algérien : n'importe quel commerçant ou créateur de marque peut lancer une boutique en ligne ou un tunnel de vente (funnel) haute conversion en quelques minutes.

---

## 2. Fonctionnalités Implémentées

Les fonctionnalités suivantes sont **pleinement implémentées et fonctionnelles** dans le code actuel :

### 🛍️ Vitrines et Tunnels de Vente
- **Double format de vente** :
  - **Boutique catalogue multi-produits** : affichage par catégories, fiches détaillées, navigation fluide.
  - **Funnel mono-produit haute-conversion** : tunnel de vente direct dédié aux campagnes publicitaires (TikTok Ads, Meta Ads).
- **10 Thèmes Graphiques Prêts à l'Emploi** : Neo-Brutalist, Playful Pumpkin, Blossom Lavender, Crimson, Natural, Tuareg Indigo, Energetic, Monochrome, Luxe Noir, Phantom (adaptation automatique des contrastes et de la typographie).
- **Ultra Mobile-First** : Expérience d'achat fluide et chargement instantané même sur réseaux mobiles 3G/4G.
- **Formulaire de commande COD sans friction** : saisie en 1 étape (Nom, Téléphone, Wilaya, Commune, Adresse) sans nécessiter de carte bancaire pour l'acheteur.

### 📦 Gestion du Catalogue & Produits
- Création, modification, archivage et suppression de produits.
- Prix standard et prix barré promotionnel en Dinars Algériens (**DZD**).
- Suivi des quantités en stock avec détection automatique de rupture.
- Gestion des variantes (tailles, couleurs, options).
- Upload d'images produits (via Supabase Storage ou Cloudinary).

### 🚚 Logistique 58 Wilayas
- Configuration personnalisée des frais d'expédition pour chaque Wilaya.
- Prise en charge des deux modes de livraison : **Livraison à domicile** et **Point relais (Stop-Desk)**.
- Affichage des délais de livraison indicatifs (ETA).

### 📊 Tableau de Bord Marchand
- Gestion complète des commandes avec cycle de vie (`En attente`, `Confirmée`, `Expédiée`, `Livrée`, `Annulée`).
- Visualisation des coordonnées clients et détails des articles commandés.
- Personnalisation de l'identité de marque (logo, photo de couverture, couleur d'accentuation, lien WhatsApp).

### ⚡ SEO & Visibilité IA (GEO)
- Rendu côté serveur (**SSR / Server Components**) pour une indexation immédiate par les moteurs de recherche.
- Données structurées Schema.org JSON-LD complètes (`Organization`, `Product`, `Offer` en DZD, `Store`, `FAQPage`).
- Génération automatique du sitemap XML (`/sitemap.xml`) avec actualisation dynamique des boutiques et produits publiés.
- Directives de crawlers configurées (`/robots.txt`) autorisant explicitement les moteurs de recherche et les robots d'IA (GPTBot, ClaudeBot, PerplexityBot, etc.).
- Support du standard `/llms.txt` pour la citation dans les moteurs de recherche génératifs.

### 💳 Abonnements Marchands & Passerelle Locale
- Gestion des plans d'abonnement (Gratuit, Pro, Business).
- Intégration de la passerelle algérienne **Slick-Pay** pour les paiements en ligne par carte **Edahabia** et **BaridiMob**.

### 🔔 Notifications
- Support des notifications **Web Push** pour alerter le marchand en temps réel lors de la réception d'une nouvelle commande.

---

## 3. Stack Technique

| Composant | Technologie | Version exacte | Rôle |
| :--- | :--- | :--- | :--- |
| **Frontend Platform** | Next.js (App Router) | `14.2.5` | Dashboard, vitrines publiques, checkout |
| **UI & Styles** | Tailwind CSS / CSS Variables | `3.4.6` | Design system & gestion des thèmes |
| **Langage Frontend** | TypeScript | `5.5.3` | Typage statique et robustesse |
| **Bibliothèque UI** | React | `18.3.1` | Interface utilisateur réactive |
| **State & Data Fetching** | Zustand / TanStack Query | `4.5.4` / `5.51.1` | Gestion de l'état global et cache client |
| **Backend API** | FastAPI (Python) | `>=0.111.0` | API REST, traitement des données |
| **Serveur ASGI** | Uvicorn | `>=0.29.0` | Serveur web Python haute performance |
| **Base de Données & Auth** | Supabase (PostgreSQL) | `^2.44.4` (JS) / `>=2.4.6` (Py) | Authentification, base relationnelle, RLS, Storage |
| **Validation Backend** | Pydantic | `>=2.7.1` | Validation stricte des schémas de données |
| **IA (Optionnel)** | Google GenAI / Anthropic | `>=1.0.0` / API | Génération de contenu et d'assets |
| **Hébergement** | Vercel | — | Déploiement cloud de la plateforme |

---

## 4. Structure du Projet

```
opensource-shopify/
├── platform/               # Application principale Next.js 14 (Frontend & Storefronts)
│   ├── app/                # Next.js App Router (pages, layouts, API routes)
│   │   ├── [slug]/         # Vitrines publiques marchands (Boutique & Funnel)
│   │   ├── dashboard/      # Tableau de bord marchand privé
│   │   ├── sitemap.ts      # Génération dynamique du sitemap.xml
│   │   └── robots.ts       # Règles robots.txt (moteurs de recherche + crawlers IA)
│   ├── components/         # Composants React (funnels, checkout, dashboard)
│   ├── lib/                # Clients Supabase, utilitaires, services API
│   ├── public/             # Fichiers statiques (icônes, llms.txt)
│   └── styles/themes/      # Feuilles de styles des 10 thèmes graphiques
├── api/                    # Backend FastAPI (Python)
│   ├── routes/             # Endpoints (stores, products, orders, payment, upload)
│   ├── services/           # Logique métier (déploiement, IA, résilience DB)
│   ├── models/             # Modèles de données Pydantic
│   ├── dependencies.py     # Dépendances FastAPI (auth, injection client Supabase)
│   ├── requirements.txt    # Dépendances Python
│   └── main.py             # Point d'entrée de l'application FastAPI
├── store-template/         # Template autonome Next.js pour prévisualisation locale (port 3001)
├── supabase/               # Schémas SQL et scripts de migration
│   ├── schema.sql          # Schéma complet de la base de données (source de vérité)
│   └── migration_*.sql     # Migrations incrémentales
├── scripts/                # Scripts utilitaires d'automatisation
├── run.py                  # Script de démarrage rapide du backend FastAPI (port 8000)
├── start.bat               # Script Windows pour lancer frontend + backend en 1 clic
└── package.json            # Monorepo NPM root (workspaces platform & store-template)
```

---

## 5. Prérequis

Avant de lancer le projet, assurez-vous d'avoir installé sur votre machine :
- **Node.js** : version `18.17.0` ou supérieure (version `20.x` recommandée).
- **npm** : version `9.x` ou supérieure.
- **Python** : version `3.10` ou `3.11` (recommandé).
- **Git** : pour cloner et versionner le projet.
- **Un compte Supabase gratuit** : pour héberger la base PostgreSQL, l'authentification et le stockage.

---

## 6. Installation

### Étape 1 : Cloner le dépôt
```bash
git clone https://github.com/ilyes213co/opensource-shopify.git
cd opensource-shopify
```

### Étape 2 : Installer les dépendances Frontend
Depuis la racine du projet :
```bash
npm install
cd platform && npm install
cd ..
```

### Étape 3 : Installer les dépendances Backend
Créez et activez un environnement virtuel Python dans le dossier `api` :

**Sur Windows (PowerShell / CMD) :**
```bash
cd api
python -m venv .venv
.\.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

**Sur Linux / macOS :**
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### Étape 4 : Configurer la base de données Supabase
1. Rendez-vous sur votre tableau de bord [Supabase](https://supabase.com) et créez un nouveau projet.
2. Ouvrez l'onglet **SQL Editor**.
3. Copiez et collez l'intégralité du contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) et exécutez-le.
4. Activez l'authentification par e-mail dans **Authentication → Providers**.

---

## 7. Variables d'Environnement

Créez un fichier `.env.local` dans le dossier `platform/` et un fichier `.env` dans le dossier `api/` (ou à la racine) en vous basant sur [`.env.example`](./.env.example).

> ⚠️ **Important :** Ne committez jamais vos fichiers `.env` ou `.env.local`. Les valeurs ci-dessous sont des exemples de configuration.

### Variables requises (Configuration minimale)

| Nom de la variable | Composant | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend & Backend | URL de votre projet Supabase (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Clé publique anonyme Supabase (accessible côté client) |
| `SUPABASE_URL` | Backend | URL de votre projet Supabase côté serveur Python |
| `SUPABASE_SERVICE_KEY` | Frontend & Backend | Clé `service_role` Supabase avec droits d'administration |
| `NEXT_PUBLIC_API_URL` | Frontend | URL de l'API backend FastAPI (ex: `http://localhost:8000`) |
| `NEXT_PUBLIC_APP_URL` | Frontend | URL de base de la plateforme (ex: `http://localhost:3000` en local, `https://easytradez.site` en prod) |
| `CORS_ALLOW_ORIGINS` | Backend | Origines autorisées pour les requêtes CORS (ex: `http://localhost:3000,http://127.0.0.1:3000`) |

### Variables optionnelles (Fonctionnalités avancées)

| Nom de la variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Clé API Google Gemini pour les fonctionnalités de génération IA |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (Claude) pour l'assistance IA |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Stockage externe Cloudinary pour les photos de produits |
| `SLICKPAY_API_KEY` / `SLICKPAY_ENV` | Clé API pour la passerelle de paiement algérienne Slick-Pay (BaridiMob / Edahabia) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_MAILTO` | Clés pour le serveur de notifications Web Push |
| `RESEND_API_KEY` / `FROM_EMAIL` | Clé Resend pour l'envoi d'e-mails de confirmation |
| `VERCEL_TOKEN` / `GITHUB_TOKEN` | Tokens pour le déploiement automatisé multi-projets |

---

## 8. Lancement en Local

### Option A : Lancement en 1 clic (Windows)
Si vous travaillez sous Windows, double-cliquez simplement sur le fichier :
```cmd
start.bat
```
Ce script ouvre automatiquement deux terminaux :
1. Le backend FastAPI sur `http://127.0.0.1:8000`
2. Le frontend Next.js sur `http://localhost:3000`

---

### Option B : Lancement via script NPM (Recommandé)
Depuis la racine du projet, lancez les deux serveurs en parallèle :
```bash
npm run dev
```

---

### Option C : Lancement manuel (2 terminaux séparés)

**Terminal 1 — Backend FastAPI :**
```bash
python run.py
# Ou alternativement :
cd api
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
L'API est accessible sur `http://127.0.0.1:8000` et la documentation Swagger interactive est disponible sur `http://127.0.0.1:8000/docs`.

**Terminal 2 — Frontend Next.js :**
```bash
cd platform
npm run dev
```
La plateforme est accessible sur `http://localhost:3000`.

---

## 9. Parcours d'Utilisation Marchand

Voici le parcours standard d'un commerçant, entièrement testé et opérationnel :

```
1. Inscription marchand (/register)
       ↓
2. Création de boutique (/dashboard/boutique/create ou /dashboard/funnel/create)
   - Choix du nom commercial et du sous-identifiant unique (slug)
   - Sélection parmi 10 thèmes visuels calibrés
       ↓
3. Gestion des produits (/dashboard/products)
   - Ajout d'articles avec titre, description, prix en DZD et photos
   - Définition des stocks disponibles
       ↓
4. Configuration de la livraison (/dashboard/delivery)
   - Personnalisation des frais Domicile / Stop-Desk pour les 58 Wilayas
       ↓
5. Partage du lien public (https://easytradez.site/[slug] ou http://localhost:3000/[slug])
   - Les clients passent commande en 1 clic via le formulaire COD
       ↓
6. Traitement des commandes (/dashboard/orders)
   - Suivi, confirmation téléphonique et expédition
```

---

## 10. Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration ou corriger une anomalie :

1. **Forkez** le projet.
2. Créez une branche dédiée à votre fonctionnalité :
   ```bash
   git checkout -b feat/nom-de-votre-fonctionnalite
   ```
3. Respectez la convention de commits du projet (**Conventional Commits**) :
   - `feat(scope): ...` pour une nouvelle fonctionnalité
   - `fix(scope): ...` pour une correction de bug
   - `docs(scope): ...` pour la documentation
   - `chore(scope): ...` pour la maintenance ou les dépendances
4. Assurez-vous que le projet compile sans erreur :
   ```bash
   cd platform && npm run build
   ```
5. Poussez votre branche et ouvrez une **Pull Request** claire et détaillée.

---

## 11. Licence

**Licence : à définir.**  
*(Veuillez consulter l'auteur du projet ou ouvrir une issue pour toute question relative aux droits de réutilisation et de distribution du code).*

---

## 12. Auteur & Contact

- **Créateur & Mainteneur** : [@ilyes213co](https://github.com/ilyes213co)
- **Dépôt officiel** : [https://github.com/ilyes213co/opensource-shopify](https://github.com/ilyes213co/opensource-shopify)
- **Site officiel en production** : [https://easytradez.site](https://easytradez.site)