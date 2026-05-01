-- =============================================================
-- ScannTrack - Données initiales
-- =============================================================
-- À exécuter APRÈS avoir créé les utilisateurs dans Auth
--
-- ÉTAPE 1 : créer manuellement chaque utilisateur dans
--          Supabase Dashboard > Authentication > Users > Add User
--          (utiliser un email du type prenom.equipe@scanntrack.local)
--
-- ÉTAPE 2 : récupérer les UUID générés et les coller ci-dessous
-- =============================================================

-- Liste des chefs d'équipe (à remplir avec les vrais UUID après création)

-- insert into public.profiles (id, prenom, nom, role, equipe_num, pin_code) values
--   ('UUID-DE-FLAV',     'Flav',   'Nom',  'chef_equipe', 1,  '1111'),
--   ('UUID-DE-NABIL',    'Nabil',  'Nom',  'chef_equipe', 2,  '2222'),
--   ('UUID-DE-ROMAIN',   'Romain', 'Nom',  'chef_equipe', 3,  '3333'),
--   ('UUID-DE-ALAIN',    'Alain',  'Nom',  'chef_equipe', 4,  '4444'),
--   ('UUID-DE-JULES',    'Jules',  'Nom',  'chef_equipe', 5,  '5555'),
--   ('UUID-DE-SAMIR',    'Samir',  'Nom',  'chef_equipe', 6,  '6666'),
--   ('UUID-DE-AHMED',    'Ahmed',  'Nom',  'chef_equipe', 7,  '7777'),
--   ('UUID-DE-YOAN',     'Yoan',   'Nom',  'chef_equipe', 8,  '8888'),
--   ('UUID-DE-LUDO',     'Ludo',   'Nom',  'chef_equipe', 10, '1010'),
--   ('UUID-DE-CEDRIC',   'Cédric', 'Nom',  'chef_equipe', 11, '1112'),
--   ('UUID-DE-DAMIEN',   'Damien', 'Nom',  'chef_equipe', 12, '1212'),
--   ('UUID-DE-SEB',      'Seb',    'Nom',  'chef_equipe', 13, '1313'),
--   ('UUID-DE-SASHA',    'Sasha',  'Nom',  'chef_equipe', 14, '1414'),
--   ('UUID-DE-YAMEN',    'Yamen',  'Nom',  'chef_equipe', 15, '1515'),
--   ('UUID-DE-MAX',      'Max',    'Nom',  'chef_equipe', 20, '2020'),
--   ('UUID-DE-DEPOT',    'Équipe', 'Dépôt','magasinier',  99, '9999'),
--   ('UUID-DE-GERANT',   'Patron', 'Nom',  'admin',       0,  '0000');

-- =============================================================
-- Quelques chantiers d'exemple (à supprimer / remplacer)
-- =============================================================

insert into public.chantiers (nom, client, archive) values
  ('Chantier exemple 1', 'Client A', false),
  ('Chantier exemple 2', 'Client B', false)
on conflict do nothing;

-- =============================================================
-- Note : le catalogue des 1826 pièces est importé via le script
--        scripts/import-catalogue.mjs (NE PAS le mettre ici)
-- =============================================================
