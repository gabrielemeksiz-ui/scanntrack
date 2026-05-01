// =====================================================
// Types métier ScannTrack
// =====================================================
// Note : à terme, générer les types DB avec :
//   pnpm db:types
// pour avoir les types Supabase 100% à jour avec le schéma.

export type UserRole = "admin" | "magasinier" | "chef_equipe";
export type BonStatus = "en_cours" | "valide" | "annule";
export type MouvementType = "entree" | "sortie" | "ajustement" | "retour";

export interface Profile {
  id: string;
  nom: string;
  prenom: string | null;
  role: UserRole;
  equipe_num: number | null;
  pin_code: string | null;
  telephone: string | null;
  actif: boolean;
}

export interface Piece {
  id: string;
  ref_interne: string;
  nom: string;
  description: string | null;
  ref_fournisseur: string | null;
  fournisseur: string | null;
  prix_unitaire: number;
  unite: string;
  photo_url: string | null;
  stock_actuel: number;
  seuil_alerte: number;
  categorie: string | null;
  emplacement: string | null;
  actif: boolean;
}

export interface Chantier {
  id: string;
  nom: string;
  client: string | null;
  adresse: string | null;
  date_debut: string | null;
  date_fin: string | null;
  archive: boolean;
}

export interface BonSortie {
  id: string;
  numero: number;
  user_id: string;
  chantier_id: string | null;
  chantier_nom_libre: string | null;
  total_ht: number;
  status: BonStatus;
  pdf_url: string | null;
  email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  validated_at: string | null;
}

export interface BonLigne {
  id: string;
  bon_id: string;
  piece_id: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
}

// Type "panier en cours" (dans le state local du chef d'équipe avant validation)
export interface PanierLigne {
  piece: Piece;
  quantite: number;
}

export interface Panier {
  chantier_nom: string;
  chantier_id?: string;
  lignes: PanierLigne[];
}
