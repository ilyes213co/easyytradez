# Plan Debug + Prompts (Beginner Friendly)

## Etat actuel (deja corrige)
- `npm run dev` demarre maintenant `platform` + `api` sans erreur de commande.
- `npm run dev:full` demarre `platform` + `api` + `store-template`.
- `platform` build/type-check OK.
- `store-template` build OK.
- `api` tests OK (`5 passed`).

## Etape 1 - Installer proprement tout le projet
Commande:
```bash
npm run install:all
```
Prompt:
```text
Analyse mon monorepo et verifie que toutes les dependances sont installees correctement.
Important: utilise Python 3.11 pour api/.venv et confirme les versions finales de Node, npm et Python.
Donne-moi seulement les commandes a executer et le resultat attendu.
```

## Etape 2 - Lancer tous les services
Commande:
```bash
npm run dev:full
```
Prompt:
```text
Je suis debutant. Verifie mon demarrage local et dis-moi quel service correspond a chaque port.
Attendu:
- platform: 3000
- api: 8000
- store-template: 3001
Si un port est occupe, donne le fix immediat.
```

## Etape 3 - Verifier la base Supabase
Commande:
```bash
# Supabase SQL editor
# 1) executer supabase/schema.sql
# 2) si projet deja existant: supabase/migration_stores.sql
```
Prompt:
```text
Compare ma base Supabase avec mon code API + platform.
Verifie les tables/colonnes critiques (stores, products, orders, store_analytics, generation_jobs).
Donne les requetes SQL manquantes exactes a executer.
```

## Etape 4 - Verifier les variables d'environnement
Commande:
```bash
# verifier les .env.example puis copier vers les vrais fichiers locaux
```
Prompt:
```text
Audit complet de mes variables d'environnement.
Controle ces fichiers: .env.local, platform/.env.local, api/.env, store-template/.env.local.
Donne:
1) variables manquantes
2) variables en double
3) variables mal nommees
Puis donne le contenu final recommande par fichier.
```

## Etape 5 - Validation technique
Commandes:
```bash
cd platform && npm run type-check
cd platform && npm run build
cd ../store-template && npm run build
cd ../api && .\.venv\Scripts\python -m pytest -q
```
Prompt:
```text
Lance les validations et classe les erreurs par priorite:
P0 bloque le run
P1 casse une feature
P2 warning qualite
Donne pour chaque erreur:
- fichier
- ligne
- fix exact
```

## Etape 6 - Stabilisation finale
Prompt:
```text
Fais un second passage de stabilisation sans ajouter de nouvelles features.
Objectif: fiabilite.
Actions:
- eviter les regressions
- simplifier les scripts de run
- garder une documentation claire pour debutant
Donne un mini changelog final.
```

