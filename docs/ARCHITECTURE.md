# Architecture technique — ScannTrack

## Vue d'ensemble

```
┌─────────────────┐         ┌──────────────────────┐
│  Smartphone     │         │  Vercel              │
│  chef d'équipe  │ HTTPS   │                      │
│                 │ ──────> │  Next.js 15 App      │
│  - Caméra (QR)  │         │  - Server Components │
│  - Local cache  │ <────── │  - API Routes        │
└─────────────────┘   PDF   │  - Server Actions    │
                            └──────────┬───────────┘
                                       │
                                       │ supabase-js
                                       v
                            ┌──────────────────────┐
                            │  Supabase            │
                            │  - Postgres + RLS    │
                            │  - Auth              │
                            │  - Storage (PDF)     │
                            └──────────────────────┘
                                       │
                            ┌──────────┴───────────┐
                            v                      v
                     ┌──────────────┐       ┌──────────────┐
                     │  Resend      │       │  Twilio      │
                     │  (email PDF) │       │  (SMS alerte)│
                     └──────────────┘       └──────────────┘
```

## Choix techniques

### Pourquoi Next.js 15 + App Router
- Server Components → moins de JS côté client → plus rapide sur 4G de chantier
- Route Handlers (API) intégrées
- Vercel deploy en 1 clic
- Connaissance déjà acquise (cf. Brayn)

### Pourquoi Supabase
- Postgres = vraie DB relationnelle (1826 pièces × historique = vite gros)
- RLS natif → sécurité au niveau ligne
- Auth gratuite jusqu'à 50K MAU
- Storage S3-like pour les PDFs
- API REST + temps réel sans backend custom

### Pourquoi html5-qrcode
- Lib pure JS, pas besoin d'app native
- Marche sur iOS Safari ET Chrome Android
- API simple (1 callback par scan)
- Free + open source

### Pourquoi @react-pdf/renderer
- Génération côté serveur (pas de dépendance navigateur)
- Layout en JSX (familier pour un dev React)
- Streamable → on peut envoyer le PDF en pièce jointe sans temp file

### Pourquoi Resend
- API simpliste (1 ligne pour envoyer)
- 3000 mails/mois gratuits
- Bonne deliverability
- Support des PDF en attachment trivial

## Modèle de données

Voir le SQL dans `supabase/migrations/0001_initial.sql`. Les points clés :

### Tables principales
- `profiles` — étend `auth.users`, contient le rôle et le n° d'équipe
- `pieces` — catalogue (~1826 lignes) avec stock_actuel et seuil_alerte
- `chantiers` — projets BTP en cours
- `bons_sortie` — un bon = un panier validé par un chef
- `bon_lignes` — détail des pièces de chaque bon
- `mouvements` — historique IMMUTABLE de tous les changements de stock
- `alertes` — quand une pièce passe sous le seuil

### Pourquoi un historique séparé ?
Plutôt que de juste mettre à jour `stock_actuel`, on log chaque mouvement dans `mouvements` (avec stock_avant / stock_apres). Avantages :
- Audit complet (qui a sorti quoi quand)
- Possibilité de recalculer le stock à n'importe quelle date
- Détection d'anomalies (ex: stock négatif)

### Pourquoi une fonction SQL `valider_bon_sortie()` ?
Le passage panier → stock-décrémenté + mouvements + alertes doit être **atomique**. Si on le fait en plusieurs requêtes côté Node, on peut avoir des incohérences (panier décrémenté mais mouvement pas créé). Une fonction PL/pgSQL en transaction garantit le tout-ou-rien.

### Row Level Security (RLS)
- Un chef d'équipe ne voit que **ses propres** bons en `select`
- Un chef d'équipe ne peut créer que **ses propres** bons
- Admin/magasinier voient tout
- La table `pieces` est lisible par tous (pas de secret)
- Le service_role bypass tout RLS (utilisé pour l'envoi mail/SMS)

## Flow complet d'une validation

```
1. [Mobile] Chef d'équipe valide le panier
2. [Mobile] POST /api/bons/valider {chantier_nom, lignes}
3. [API] Auth check (cookie Supabase)
4. [API] INSERT bons_sortie (status='en_cours')
5. [API] INSERT bon_lignes (avec prix copiés depuis pieces)
6. [API] CALL valider_bon_sortie(bon_id) :
       - Pour chaque ligne :
         - UPDATE pieces SET stock = stock - qte
         - INSERT mouvements (sortie)
         - SI stock <= seuil_alerte : INSERT alertes
       - UPDATE bons_sortie SET status='valide', total=...
7. [API] Réponse au mobile : {numero, total} → l'UI montre "validé"
8. [API en arrière-plan] :
       - Génère le PDF (@react-pdf/renderer)
       - Upload dans Storage
       - Envoie l'email (Resend) avec PDF en attachment
       - Vérifie les alertes en attente, regroupe en 1 SMS, envoie via Twilio
       - Marque les alertes comme envoyées
```

Le post-process est non-bloquant : le chef d'équipe a sa confirmation immédiate, le PDF arrive 5-10s plus tard.

## Sécurité

- Auth Supabase (JWT + cookies HttpOnly)
- RLS sur toutes les tables sensibles
- Service role key JAMAIS exposée côté client
- Input validation avec Zod sur les API routes
- Pas de SQL dynamique (toutes les requêtes via supabase-js paramétrées)
- HTTPS obligatoire (Vercel par défaut)

## Performance

| Métrique | Cible | Comment |
|---|---|---|
| Temps de réponse scan → modale qty | < 500ms | Lookup direct par `ref_interne` (index) |
| Validation d'un bon (10 lignes) | < 2s | Fonction SQL en 1 transaction |
| Génération PDF + email | < 10s | En arrière-plan |
| Page dashboard | < 1s | Indexes + pagination |

## Limites connues / dette technique

- Pas de mode hors-ligne en V1 (Sprint 4)
- Pas de tests automatisés (à ajouter si l'app vit)
- Le PDF est généré à chaque validation (pourrait être caché)
- Pas de rate limit sur les API routes (à ajouter si abus)
- Login par email/password uniquement (PIN scannette en V2)
