# Setup pas à pas — ScannTrack

Guide pour passer de zéro à une app fonctionnelle en local, puis en prod.

## Pré-requis

- Node 20+ et pnpm (ou npm)
- Un compte GitHub (pour Vercel)
- Une carte bancaire (Twilio gratuit pendant trial mais ajout CB requis pour SMS réels)

## 1. Clone et install

```bash
git clone <repo-url> scanntrack
cd scanntrack
pnpm install
```

## 2. Supabase

### 2.1 Créer le projet
1. https://supabase.com → New Project
2. Région : Europe (Frankfurt ou Paris)
3. Password : générer fort, le sauvegarder

### 2.2 Récupérer les credentials
- Project Settings > API
- Copier `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copier `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copier `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ JAMAIS côté client

### 2.3 Exécuter le schéma
- SQL Editor > New query
- Copier le contenu de `supabase/migrations/0001_initial.sql`
- Run
- Vérifier dans Tables que `pieces`, `chantiers`, `bons_sortie`, etc. sont créées

### 2.4 Storage
- Dans Supabase, aller dans **Storage**
- Créer un bucket `bons-pdf` (Public bucket : ✓)
- Créer un bucket `pieces-photos` (Public bucket : ✓)

### 2.5 Créer les utilisateurs
Pour chaque utilisateur (gérant, magasinier, 15 chefs d'équipe) :
1. Authentication > Users > Add User > Create new user
2. Email + mot de passe temporaire
3. Récupérer l'`id` UUID généré
4. Aller dans SQL Editor et exécuter :

```sql
insert into public.profiles (id, prenom, nom, role, equipe_num, telephone)
values ('<UUID-COPIÉ>', 'Flav', 'Nom', 'chef_equipe', 1, '+33612345678');
```

## 3. Resend (email)

1. https://resend.com → Sign up (gratuit, 3000 mails/mois)
2. Domains > Add domain
   - Si tu as un domaine : ajouter les DNS (SPF, DKIM)
   - Pour les tests sans domaine : utiliser `onboarding@resend.dev` comme `EMAIL_FROM`
3. API Keys > Create API Key → copier dans `RESEND_API_KEY`

## 4. Twilio (SMS) — peut attendre Sprint 3

1. https://www.twilio.com → Sign up
2. Acheter un numéro français : Phone Numbers > Buy a number > Country: France (~1$/mois)
3. Account Info > copier `Account SID` et `Auth Token`
4. Renseigner les variables `TWILIO_*` dans `.env.local`

**Alternative française** : OVH SMS (à coder dans `lib/sms/ovh.ts`).

## 5. Variables d'env

```bash
cp .env.example .env.local
# Éditer .env.local avec toutes les valeurs ci-dessus
# Mettre DRY_RUN_NOTIFICATIONS=true pour les tests (logs au lieu d'envoi réel)
```

## 6. Import du catalogue

Mettre l'Excel quelque part (par exemple `~/Desktop/catalogue.xlsx`), puis :

```bash
pnpm import:catalogue ~/Desktop/catalogue.xlsx
```

Vérifier dans Supabase Table Editor que les 1826 lignes sont là.

## 7. Lancer en local

```bash
pnpm dev
# Ouvrir http://localhost:3000
```

⚠️ **Le scan caméra ne marche pas en localhost sur téléphone** (HTTPS obligatoire). Pour tester sur ton mobile, déployer d'abord sur Vercel.

## 8. Déploiement Vercel

### 8.1 Push sur GitHub
```bash
git init && git add . && git commit -m "init"
gh repo create scanntrack --private --source=.
git push -u origin main
```

### 8.2 Vercel
1. https://vercel.com → New Project → Import depuis GitHub
2. Settings > Environment Variables : recopier toutes les variables de `.env.local`
3. Deploy

### 8.3 Domaine
- Vercel donne un `xxx.vercel.app`
- Pour un domaine custom (ex: `scanntrack.fr`) : Settings > Domains > Add

## 9. Génération des QR codes

Une fois le catalogue importé :

```bash
pnpm generate:qr
# Ouvrir public/qr-codes/etiquettes.html dans Chrome
# Ctrl+P → "Enregistrer au format PDF"
# OU imprimer directement sur imprimante thermique
```

## 10. Test bout en bout

Sur ton téléphone :
1. Ouvrir l'URL Vercel en HTTPS
2. Login avec un compte chef d'équipe
3. Saisir un nom de chantier
4. Scanner un QR code (autoriser la caméra)
5. Saisir une quantité, ajouter
6. Valider
7. Vérifier que le mail arrive sur l'adresse `EMAIL_GERANT`

---

## Dépannage

| Symptôme | Solution |
|---|---|
| `Camera access denied` | Vérifier qu'on est en HTTPS, pas localhost |
| `Pièce introuvable` au scan | Le QR code contient bien `ref_interne` ? Vérifier dans DB |
| Pas de mail reçu | DRY_RUN_NOTIFICATIONS=true ? Sinon vérifier les logs Vercel |
| Le PDF est corrompu | Vérifier la version `@react-pdf/renderer` (>=4.0) |
| RLS error | Le user a-t-il un profile avec un role ? |

