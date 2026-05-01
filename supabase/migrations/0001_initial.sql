-- =============================================================
-- ScannTrack - Migration initiale
-- =============================================================
-- À exécuter dans le SQL Editor de Supabase
-- (Project > SQL Editor > New query > coller > Run)
-- =============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================
-- 1. PROFILS UTILISATEURS
-- =============================================================
-- Étend la table auth.users de Supabase
-- 3 rôles: admin (gérant), magasinier, chef_equipe

create type user_role as enum ('admin', 'magasinier', 'chef_equipe');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  prenom text,
  role user_role not null default 'chef_equipe',
  equipe_num integer,                -- numéro d'équipe (1 à 20)
  pin_code text,                     -- PIN à 4 chiffres pour login rapide sur scannette (hashé)
  telephone text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_equipe on public.profiles(equipe_num);

-- =============================================================
-- 2. CATALOGUE DES PIÈCES
-- =============================================================

create table public.pieces (
  id uuid primary key default uuid_generate_v4(),
  ref_interne text not null unique,           -- code unique encodé dans le QR
  nom text not null,
  description text,
  ref_fournisseur text,
  fournisseur text,
  prix_unitaire numeric(10, 2) default 0,     -- € HT
  unite text default 'pièce',                  -- pièce, mètre, kg, litre, paquet...
  photo_url text,
  stock_actuel numeric(10, 2) not null default 0,
  seuil_alerte numeric(10, 2) default 0,
  categorie text,                              -- vis, joints, raccords, EPI, outillage...
  emplacement text,                            -- rayon/étagère du dépôt
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pieces_ref_interne on public.pieces(ref_interne);
create index idx_pieces_nom on public.pieces using gin (to_tsvector('french', nom));
create index idx_pieces_actif on public.pieces(actif) where actif = true;
create index idx_pieces_alerte on public.pieces(stock_actuel, seuil_alerte) where actif = true;

-- =============================================================
-- 3. CHANTIERS
-- =============================================================

create table public.chantiers (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  client text,
  adresse text,
  date_debut date,
  date_fin date,
  archive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chantiers_archive on public.chantiers(archive);
create index idx_chantiers_nom on public.chantiers using gin (to_tsvector('french', nom));

-- =============================================================
-- 4. BONS DE SORTIE
-- =============================================================
-- Un bon = un panier validé par un chef d'équipe à un instant T

create type bon_status as enum ('en_cours', 'valide', 'annule');

create table public.bons_sortie (
  id uuid primary key default uuid_generate_v4(),
  numero serial,                               -- numéro lisible (BS-2025-0001)
  user_id uuid not null references public.profiles(id),
  chantier_id uuid references public.chantiers(id),
  chantier_nom_libre text,                     -- saisie libre si chantier pas encore créé
  total_ht numeric(10, 2) not null default 0,
  status bon_status not null default 'en_cours',
  pdf_url text,
  email_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create index idx_bons_user on public.bons_sortie(user_id);
create index idx_bons_chantier on public.bons_sortie(chantier_id);
create index idx_bons_status on public.bons_sortie(status);
create index idx_bons_created on public.bons_sortie(created_at desc);

-- =============================================================
-- 5. LIGNES DE BON DE SORTIE
-- =============================================================

create table public.bon_lignes (
  id uuid primary key default uuid_generate_v4(),
  bon_id uuid not null references public.bons_sortie(id) on delete cascade,
  piece_id uuid not null references public.pieces(id),
  quantite numeric(10, 2) not null check (quantite > 0),
  prix_unitaire numeric(10, 2) not null default 0,
  total_ligne numeric(10, 2) generated always as (quantite * prix_unitaire) stored,
  created_at timestamptz not null default now()
);

create index idx_bon_lignes_bon on public.bon_lignes(bon_id);
create index idx_bon_lignes_piece on public.bon_lignes(piece_id);

-- =============================================================
-- 6. MOUVEMENTS DE STOCK
-- =============================================================
-- Historique COMPLET et IMMUTABLE de tous les mouvements
-- (entrées fournisseur, sorties chantier, ajustements inventaire)

create type mouvement_type as enum ('entree', 'sortie', 'ajustement', 'retour');

create table public.mouvements (
  id uuid primary key default uuid_generate_v4(),
  piece_id uuid not null references public.pieces(id),
  type mouvement_type not null,
  quantite numeric(10, 2) not null,            -- positif = +stock, négatif = -stock
  stock_avant numeric(10, 2) not null,
  stock_apres numeric(10, 2) not null,
  user_id uuid references public.profiles(id),
  bon_id uuid references public.bons_sortie(id),
  chantier_id uuid references public.chantiers(id),
  reference_externe text,                       -- bon de livraison fournisseur, etc.
  motif text,
  created_at timestamptz not null default now()
);

create index idx_mouvements_piece on public.mouvements(piece_id);
create index idx_mouvements_chantier on public.mouvements(chantier_id);
create index idx_mouvements_created on public.mouvements(created_at desc);
create index idx_mouvements_type on public.mouvements(type);

-- =============================================================
-- 7. ALERTES SEUIL
-- =============================================================
-- Trace des alertes envoyées pour éviter le spam

create table public.alertes (
  id uuid primary key default uuid_generate_v4(),
  piece_id uuid not null references public.pieces(id),
  stock_au_moment numeric(10, 2) not null,
  seuil_au_moment numeric(10, 2) not null,
  sms_sent boolean not null default false,
  email_sent boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_alertes_piece on public.alertes(piece_id);
create index idx_alertes_resolved on public.alertes(resolved_at) where resolved_at is null;

-- =============================================================
-- 8. TRIGGERS - Mise à jour automatique du updated_at
-- =============================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger trg_pieces_updated before update on public.pieces
  for each row execute function public.update_updated_at();
create trigger trg_chantiers_updated before update on public.chantiers
  for each row execute function public.update_updated_at();

-- =============================================================
-- 9. FONCTION - Validation d'un bon de sortie
-- =============================================================
-- Décrémente le stock + crée les mouvements + check des seuils
-- Tout en transaction atomique

create or replace function public.valider_bon_sortie(p_bon_id uuid)
returns json as $$
declare
  v_bon record;
  v_ligne record;
  v_piece record;
  v_total numeric := 0;
  v_alertes_creees int := 0;
begin
  -- Récupérer le bon
  select * into v_bon from public.bons_sortie where id = p_bon_id and status = 'en_cours';
  if not found then
    raise exception 'Bon introuvable ou déjà validé';
  end if;

  -- Pour chaque ligne du bon
  for v_ligne in
    select bl.*, p.stock_actuel, p.seuil_alerte, p.nom as piece_nom
    from public.bon_lignes bl
    join public.pieces p on p.id = bl.piece_id
    where bl.bon_id = p_bon_id
  loop
    -- Vérifier qu'on a assez de stock
    if v_ligne.stock_actuel < v_ligne.quantite then
      raise exception 'Stock insuffisant pour la pièce %', v_ligne.piece_nom;
    end if;

    -- Décrémenter le stock
    update public.pieces
      set stock_actuel = stock_actuel - v_ligne.quantite
      where id = v_ligne.piece_id
      returning * into v_piece;

    -- Créer le mouvement
    insert into public.mouvements (
      piece_id, type, quantite, stock_avant, stock_apres,
      user_id, bon_id, chantier_id
    ) values (
      v_ligne.piece_id, 'sortie', -v_ligne.quantite,
      v_ligne.stock_actuel, v_piece.stock_actuel,
      v_bon.user_id, p_bon_id, v_bon.chantier_id
    );

    v_total := v_total + v_ligne.total_ligne;

    -- Check seuil d'alerte
    if v_piece.stock_actuel <= v_piece.seuil_alerte and v_piece.seuil_alerte > 0 then
      -- Vérifier qu'on n'a pas déjà une alerte ouverte pour cette pièce
      if not exists (
        select 1 from public.alertes
        where piece_id = v_piece.id and resolved_at is null
      ) then
        insert into public.alertes (piece_id, stock_au_moment, seuil_au_moment)
        values (v_piece.id, v_piece.stock_actuel, v_piece.seuil_alerte);
        v_alertes_creees := v_alertes_creees + 1;
      end if;
    end if;
  end loop;

  -- Marquer le bon comme validé
  update public.bons_sortie
    set status = 'valide',
        validated_at = now(),
        total_ht = v_total
    where id = p_bon_id;

  return json_build_object(
    'success', true,
    'bon_id', p_bon_id,
    'total_ht', v_total,
    'alertes_creees', v_alertes_creees
  );
end;
$$ language plpgsql security definer;

-- =============================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =============================================================

alter table public.profiles enable row level security;
alter table public.pieces enable row level security;
alter table public.chantiers enable row level security;
alter table public.bons_sortie enable row level security;
alter table public.bon_lignes enable row level security;
alter table public.mouvements enable row level security;
alter table public.alertes enable row level security;

-- Helper: vérifier le rôle de l'utilisateur connecté
create or replace function public.user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- ----- PROFILES -----
create policy "Users can read all profiles"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Admin can insert/delete profiles"
  on public.profiles for insert to authenticated
  with check (public.user_role() = 'admin');

-- ----- PIECES -----
create policy "Authenticated can read pieces"
  on public.pieces for select to authenticated using (true);

create policy "Admin/magasinier can manage pieces"
  on public.pieces for all to authenticated
  using (public.user_role() in ('admin', 'magasinier'))
  with check (public.user_role() in ('admin', 'magasinier'));

-- ----- CHANTIERS -----
create policy "Authenticated can read chantiers"
  on public.chantiers for select to authenticated using (true);

create policy "Admin/magasinier can manage chantiers"
  on public.chantiers for all to authenticated
  using (public.user_role() in ('admin', 'magasinier'))
  with check (public.user_role() in ('admin', 'magasinier'));

-- ----- BONS DE SORTIE -----
create policy "Users can read their own bons + admin/magasinier all"
  on public.bons_sortie for select to authenticated
  using (user_id = auth.uid() or public.user_role() in ('admin', 'magasinier'));

create policy "Users can create their own bons"
  on public.bons_sortie for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own bons en_cours"
  on public.bons_sortie for update to authenticated
  using (user_id = auth.uid() and status = 'en_cours');

-- ----- BON LIGNES -----
create policy "Bon lignes follow bon access"
  on public.bon_lignes for select to authenticated using (
    exists (
      select 1 from public.bons_sortie b
      where b.id = bon_id
      and (b.user_id = auth.uid() or public.user_role() in ('admin', 'magasinier'))
    )
  );

create policy "Users can manage lignes of their own bons"
  on public.bon_lignes for all to authenticated
  using (
    exists (
      select 1 from public.bons_sortie b
      where b.id = bon_id and b.user_id = auth.uid() and b.status = 'en_cours'
    )
  );

-- ----- MOUVEMENTS (lecture seule sauf via fonctions) -----
create policy "All authenticated can read mouvements"
  on public.mouvements for select to authenticated using (true);

create policy "Only system can insert mouvements"
  on public.mouvements for insert to authenticated
  with check (public.user_role() in ('admin', 'magasinier'));

-- ----- ALERTES -----
create policy "Admin/magasinier can read alertes"
  on public.alertes for select to authenticated
  using (public.user_role() in ('admin', 'magasinier'));

create policy "System manages alertes"
  on public.alertes for all to authenticated
  using (public.user_role() in ('admin', 'magasinier'))
  with check (public.user_role() in ('admin', 'magasinier'));

-- =============================================================
-- 11. STORAGE - Bucket pour les photos de pièces
-- =============================================================
-- À exécuter SÉPARÉMENT dans Storage > Policies

-- insert into storage.buckets (id, name, public) values ('pieces-photos', 'pieces-photos', true)
-- on conflict do nothing;
--
-- create policy "Public read on pieces photos"
--   on storage.objects for select to public
--   using (bucket_id = 'pieces-photos');
--
-- create policy "Authenticated upload pieces photos"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'pieces-photos');

-- =============================================================
-- FIN
-- =============================================================
