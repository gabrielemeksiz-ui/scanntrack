# ScannTrack

Application web de gestion de stock par scannette pour entreprise BTP.

Chaque chef d'équipe scanne les pièces qu'il prend au dépôt le matin, sélectionne son chantier, valide → génère automatiquement un bon de sortie PDF envoyé au gérant par email + met à jour le stock + déclenche un SMS si seuil d'alerte franchi.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Postgres + Auth + Storage + RLS)
- **html5-qrcode** pour le scan via caméra du smartphone
- **@react-pdf/renderer** pour la génération de PDF
- **Resend** pour l'envoi d'emails
- **Twilio** (ou OVH SMS) pour les alertes SMS
- **Vercel** pour l'hébergement

## Démarrage rapide

```bash
# 1. Cloner le repo
git clone <repo-url> scanntrack && cd scanntrack

# 2. Installer les dépendances
pnpm install   # ou npm install

# 3. Copier et remplir les variables d'env
cp .env.example .env.local
# → remplir avec les valeurs Supabase, Resend, Twilio (voir docs/SETUP.md)

# 4. Initialiser la base Supabase
# Aller sur supabase.com, créer un projet
# Copier le contenu de supabase/migrations/0001_initial.sql dans le SQL Editor
# Exécuter

# 5. Importer le catalogue depuis ton Excel
node scripts/import-catalogue.mjs ./chemin/vers/ton-excel.xlsx

# 6. Lancer
pnpm dev
```

Voir `docs/SETUP.md` pour le guide pas à pas complet.

## Structure

```
app/                 → Routes Next.js (App Router)
  auth/login/        → Login PIN
  scan/              → Écran scannette mobile (le cœur du produit)
  bons/              → Liste et détail des bons de sortie
  catalogue/         → CRUD des pièces (admin/magasinier)
  chantiers/         → Liste et détail des chantiers
  dashboard/         → Dashboard gérant (alertes, stats)
  api/               → Routes API (PDF, email, SMS, webhooks)

components/
  ui/                → shadcn components
  scan/              → Composants spécifiques au scan
  catalogue/         → Composants catalogue
  layout/            → Header, sidebar, etc.

lib/
  supabase/          → Clients Supabase (server & browser)
  pdf/               → Génération PDF des bons de sortie

types/               → Types TypeScript partagés
supabase/migrations/ → Schémas SQL et RLS
scripts/             → Scripts utilitaires (import CSV, génération QR)
docs/                → Documentation (setup, architecture, déploiement)
```

## Documentation

- `docs/SETUP.md` — Guide d'installation pas à pas
- `docs/ARCHITECTURE.md` — Architecture technique
- `docs/PROJECT_PLAN.md` — Plan de développement par sprints
- `docs/DEPLOYMENT.md` — Déploiement Vercel + Supabase

## Roadmap

Voir `docs/PROJECT_PLAN.md` pour le détail. En résumé :

- **Sprint 1** — Fondations (auth, schéma, import catalogue)
- **Sprint 2** — Cœur métier (scan, panier, validation, PDF, mail)
- **Sprint 3** — Alertes SMS + Dashboard admin
- **Sprint 4** — Mode hors-ligne + polish + déploiement
