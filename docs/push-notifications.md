# 🔔 Configuration des Notifications Push

## 1. Installer web-push

```bash
npm install web-push
npm install --save-dev @types/web-push
```

## 2. Générer les clés VAPID (une seule fois)

```bash
npx web-push generate-vapid-keys
```

Vous obtenez :
```
Public Key:  BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
Private Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

## 3. Ajouter dans `.env.local`

```env
# VAPID (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
VAPID_PRIVATE_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
VAPID_MAILTO=mailto:vous@votredomaine.com

# Sécurité webhook (choisissez un secret aléatoire)
WEBHOOK_SECRET=un_secret_tres_long_et_aleatoire
```

## 4. Exécuter le SQL

Dans Supabase → SQL Editor, exécutez le bloc `push_subscriptions`
ajouté en bas de `supabase/schema.sql`.

## 5. Configurer les webhooks Supabase

Dans **Supabase → Database → Webhooks** → "Create a new hook" :

### Webhook 1 — Nouvelle commande

| Champ        | Valeur                                      |
|--------------|---------------------------------------------|
| Name         | `push_new_order`                            |
| Table        | `orders`                                    |
| Events       | ✅ INSERT                                   |
| URL          | `https://votredomaine.com/api/push/send`    |
| HTTP Method  | POST                                        |
| Header       | `x-webhook-secret: votre_secret`            |

### Webhook 2 — Stock épuisé

| Champ        | Valeur                                      |
|--------------|---------------------------------------------|
| Name         | `push_stock_zero`                           |
| Table        | `products`                                  |
| Events       | ✅ UPDATE                                   |
| URL          | `https://votredomaine.com/api/push/send`    |
| HTTP Method  | POST                                        |
| Header       | `x-webhook-secret: votre_secret`            |

## 6. Activer les notifications

Dans votre dashboard → **Paramètres** → section **Notifications push**
→ cliquez **Activer** → autorisez dans le navigateur.

---

## Comment ça marche

```
Client commande
       ↓
Supabase insère dans orders
       ↓
Webhook Supabase → POST /api/push/send
       ↓
API route → web-push → Navigateur du marchand
       ↓
Notification s'affiche même si l'onglet est fermé ✅
```

## Notes

- Les notifications fonctionnent même si le dashboard est fermé
  (tant que le navigateur est ouvert en arrière-plan)
- Chaque appareil/navigateur a sa propre subscription
- Les subscriptions expirées (410) sont nettoyées automatiquement
- Sur mobile, ajoutez le site à l'écran d'accueil (PWA) pour
  que les notifications fonctionnent en arrière-plan
