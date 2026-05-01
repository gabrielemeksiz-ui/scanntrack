# Plan de projet ScannTrack

## Vue d'ensemble

**Client** : Entreprise BTP de l'ami de LeG
**Périmètre** : 15 chefs d'équipe + 1 équipe dépôt + 1 gérant
**Volumétrie** : 1826 références, ~15 chantiers actifs en parallèle, 30-80 mouvements/jour estimés
**Budget** : self-hosted / vibe-code → coût ≈ Vercel Hobby (gratuit) + Supabase Free (gratuit) + Resend Free (gratuit) + Twilio (~5€/mois) ≈ **5-10€/mois la première année**

## Définition de "fini"

Le projet est livré quand un chef d'équipe peut :
1. Se connecter sur son téléphone via `https://scanntrack.fr/auth/login`
2. Saisir le nom de son chantier
3. Scanner une pièce avec la caméra de son tel
4. Saisir une quantité, ajouter au panier
5. Répéter, puis valider
6. Le gérant reçoit un PDF par mail dans la minute
7. Si une pièce passe sous le seuil → SMS au gérant

Et que le gérant peut :
1. Voir un dashboard avec les alertes du jour
2. Consulter les bons reçus
3. Voir le coût cumulé par chantier
4. Modifier le catalogue et les seuils

---

## Sprint 1 — Fondations (5-7 jours)

### Objectif
Avoir l'infra prête + le catalogue importé + l'auth qui marche.

### Tâches

- [ ] Créer projet Supabase
- [ ] Exécuter `supabase/migrations/0001_initial.sql` dans le SQL Editor
- [ ] Créer le bucket Storage `bons-pdf` (public read) et `pieces-photos` (public read)
- [ ] Créer un projet Vercel + connecter au repo Git
- [ ] Créer un compte Resend, vérifier un domaine (ou utiliser onboarding@resend.dev pour les tests)
- [ ] Créer un compte Twilio (peut attendre Sprint 3)
- [ ] Remplir `.env.local` avec toutes les variables
- [ ] `pnpm install`
- [ ] Lancer `pnpm dev`, vérifier que la page `/auth/login` s'affiche
- [ ] Créer un user gérant via Supabase Dashboard > Auth > Add User
- [ ] Insérer son profile en SQL avec role='admin'
- [ ] Tester le login → redirection vers `/`
- [ ] **Importer le catalogue Excel** : `pnpm import:catalogue ./catalogue.xlsx`
- [ ] Vérifier dans Supabase que les 1826 lignes sont là
- [ ] Créer les 16 autres users (chefs d'équipe + magasinier) via Auth > Add User
- [ ] Renseigner leurs profiles (role + equipe_num)

### Critères de succès Sprint 1
- ✅ Le gérant peut se connecter
- ✅ Les 1826 pièces sont en base avec leurs prix et seuils
- ✅ Les 16 chefs d'équipe ont des comptes

---

## Sprint 2 — Cœur métier (5-7 jours)

### Objectif
Le scan → panier → validation → PDF → email fonctionne de bout en bout.

### Tâches

- [ ] Tester le scanner caméra sur un téléphone (HTTPS obligatoire, donc déployer sur Vercel d'abord)
- [ ] Vérifier que `html5-qrcode` lit bien les QR
- [ ] Lancer `pnpm generate:qr` pour générer les étiquettes
- [ ] Imprimer 5-10 étiquettes test (laser ou thermique)
- [ ] Coller les étiquettes sur de vrais bacs au dépôt et tester un scan complet
- [ ] Implémenter la sélection de chantier (dropdown des chantiers actifs OU saisie libre)
- [ ] Soigner la modale de saisie de quantité (gros boutons, clavier numérique)
- [ ] Tester la validation avec 5+ lignes
- [ ] Vérifier que le PDF est correct (mise en page, total HT)
- [ ] Vérifier que l'email arrive avec le PDF en pièce jointe
- [ ] Vérifier que le stock se décrémente bien
- [ ] Vérifier que les mouvements sont historisés

### Risques connus à gérer
- **HTTPS obligatoire pour la caméra** → toujours déployer sur Vercel pour les tests, jamais en localhost sur téléphone
- **PDF génération lente sur Vercel** → si > 10s, basculer en background job (à voir Sprint 4)
- **Resend domaine non vérifié** → utiliser `onboarding@resend.dev` pour les tests, vérifier le domaine pour la prod

### Critères de succès Sprint 2
- ✅ Un chef d'équipe peut scanner 5 pièces, valider, et le gérant reçoit le PDF par mail
- ✅ Le stock baisse correctement
- ✅ Le bon est consultable dans `/bons`

---

## Sprint 3 — Dashboard + alertes (3-5 jours)

### Objectif
Le gérant a une vue d'ensemble et reçoit ses SMS.

### Tâches

- [ ] Page `/dashboard` (admin/magasinier) :
  - Bons du jour
  - Alertes stock actives
  - Top 10 des consommations de la semaine
  - Compteur de chantiers actifs
- [ ] Page `/bons` : liste paginée + filtres (date, chantier, chef d'équipe)
- [ ] Page `/bons/[id]` : détail + lien vers le PDF
- [ ] Page `/chantiers` : liste avec coût cumulé
- [ ] Page `/chantiers/[id]` : détail + tous les bons + total
- [ ] Page `/catalogue` : liste paginée + recherche + édition d'une pièce
- [ ] Configurer Twilio (acheter un numéro français)
- [ ] Tester l'envoi d'un SMS d'alerte (sortie de stock provoquant un seuil)
- [ ] Mettre en place une **rate limit** : pas plus d'1 SMS toutes les 15 min (regrouper les alertes)
- [ ] Export Excel des mouvements (route API `/api/export/mouvements`)

### Critères de succès Sprint 3
- ✅ Le gérant ouvre `/dashboard` et voit tout en un coup d'œil
- ✅ Les alertes SMS arrivent
- ✅ Le coût par chantier est visible

---

## Sprint 4 — Polish et déploiement (3-5 jours)

### Objectif
L'app est utilisable en conditions réelles par 16 personnes.

### Tâches

- [ ] **Mode hors-ligne** : queue des scans en `localStorage`, sync au retour de réseau
  - Détection `navigator.onLine`
  - Stockage des bons "en attente d'envoi"
  - Bouton manuel "Forcer la synchro"
- [ ] PWA : `manifest.json` + service worker basique pour install sur écran d'accueil
- [ ] Login PIN pour les chefs d'équipe (4 chiffres, plus rapide que email/password)
- [ ] Loader sur tous les écrans + gestion d'erreurs
- [ ] Page de feedback "merci, votre bon est validé" avec récap
- [ ] Tests utilisateurs avec 2-3 chefs d'équipe pilotes pendant 1 semaine
- [ ] Recueillir leurs retours
- [ ] Ajustements ergonomie (taille des boutons, ordre des étapes)
- [ ] Formation rapide (vidéo de 2 min ou réunion de 20 min)
- [ ] Déploiement final sur tout le monde

### Critères de succès Sprint 4
- ✅ Les 15 chefs d'équipe utilisent l'app au quotidien
- ✅ Le système tient la charge le matin (10-15 validations en 30 min)
- ✅ Le client est content

---

## Backlog V2 (post-livraison)

À faire seulement après que la V1 tourne bien :
- Retours de pièces au dépôt
- Multi-dépôts
- Photos prises sur le tel pour les nouvelles pièces
- App native iOS/Android via Expo
- Intégration compta (export Sage / Cegid)
- Statistiques avancées (top chefs, top chantiers, courbes)
- Module bon de commande fournisseur depuis les alertes

---

## Risques globaux

| Risque | Mitigation |
|---|---|
| Les chefs d'équipe trichent ou oublient de scanner | Pilote court, retours réguliers, on rend le scan plus rapide que de ne pas scanner |
| QR codes endommagés sur chantier | Étiquettes polypropylène, double étiquetage |
| Réseau dépôt instable | Mode hors-ligne (Sprint 4) |
| Catalogue Excel mal formaté | Le script d'import gère les variantes de colonnes — tester avec un échantillon de 20 lignes d'abord |
| LeG manque de temps | Découper en petites tâches, prioriser le cœur (Sprint 1+2 = MVP utilisable) |
