// =============================================================
// Script d'import du catalogue Excel → Supabase
// =============================================================
// Usage :
//   node scripts/import-catalogue.mjs ./chemin/vers/catalogue.xlsx
//
// Le fichier Excel doit contenir au minimum les colonnes :
//   - nom (obligatoire)
//   - ref_interne (sera générée si absente)
//   - ref_fournisseur (optionnel)
//   - fournisseur (optionnel)
//   - prix_unitaire (optionnel, défaut 0)
//   - unite (optionnel, défaut 'pièce')
//   - stock_actuel (optionnel, défaut 0)
//   - seuil_alerte (optionnel, défaut 0)
//   - categorie (optionnel)
//
// Le script :
//   1. Lit la 1ère feuille du fichier
//   2. Normalise les noms de colonnes (insensible casse/accents)
//   3. Génère ref_interne automatiquement si vide (REF-00001, REF-00002...)
//   4. Insère par batch de 500 dans la table 'pieces'
// =============================================================

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌ Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local"
  );
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-catalogue.mjs <fichier.xlsx>");
  process.exit(1);
}

// ----- Lecture Excel -----
console.log(`📖 Lecture de ${filePath}...`);
const buf = readFileSync(resolve(filePath));
const wb = XLSX.read(buf, { type: "buffer" });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

console.log(`✓ ${rows.length} lignes lues dans la 1ère feuille`);

// ----- Normalisation des clés -----
function normKey(k) {
  return String(k)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Mapping des variantes de colonnes
const colMap = {
  nom: ["nom", "designation", "libelle", "name", "intitule"],
  ref_interne: ["ref_interne", "reference_interne", "ref", "code", "sku"],
  ref_fournisseur: ["ref_fournisseur", "reference_fournisseur"],
  fournisseur: ["fournisseur", "supplier", "marque"],
  prix_unitaire: ["prix_unitaire", "prix", "price", "pu", "prix_ht"],
  unite: ["unite", "unit", "u"],
  stock_actuel: ["stock_actuel", "stock", "quantite", "qty"],
  seuil_alerte: ["seuil_alerte", "seuil", "min", "minimum"],
  categorie: ["categorie", "category", "famille", "type"],
  description: ["description", "desc", "commentaire"],
  emplacement: ["emplacement", "location", "rayon", "etagere"],
};

function findCol(row, target) {
  const aliases = colMap[target];
  for (const k of Object.keys(row)) {
    const nk = normKey(k);
    if (aliases.includes(nk)) return k;
  }
  return null;
}

// ----- Préparation des pièces -----
console.log("🔧 Préparation des données...");
let counter = 1;
const pieces = rows
  .map((row, idx) => {
    const piece = {};

    const nomCol = findCol(row, "nom");
    if (!nomCol || !String(row[nomCol]).trim()) {
      console.warn(`  ⚠️  Ligne ${idx + 2} ignorée (pas de nom)`);
      return null;
    }
    piece.nom = String(row[nomCol]).trim();

    const refCol = findCol(row, "ref_interne");
    piece.ref_interne =
      refCol && String(row[refCol]).trim()
        ? String(row[refCol]).trim()
        : `REF-${String(counter).padStart(5, "0")}`;
    counter++;

    const setIfPresent = (target, transform = (x) => x) => {
      const c = findCol(row, target);
      if (c && row[c] !== "" && row[c] != null) {
        piece[target] = transform(row[c]);
      }
    };

    setIfPresent("ref_fournisseur", (v) => String(v).trim());
    setIfPresent("fournisseur", (v) => String(v).trim());
    setIfPresent("prix_unitaire", (v) => parseFloat(v) || 0);
    setIfPresent("unite", (v) => String(v).trim() || "pièce");
    setIfPresent("stock_actuel", (v) => parseFloat(v) || 0);
    setIfPresent("seuil_alerte", (v) => parseFloat(v) || 0);
    setIfPresent("categorie", (v) => String(v).trim());
    setIfPresent("description", (v) => String(v).trim());
    setIfPresent("emplacement", (v) => String(v).trim());

    return piece;
  })
  .filter(Boolean);

console.log(`✓ ${pieces.length} pièces prêtes à insérer`);

// ----- Vérif des doublons de ref_interne -----
const refSet = new Set();
const dups = [];
for (const p of pieces) {
  if (refSet.has(p.ref_interne)) dups.push(p.ref_interne);
  refSet.add(p.ref_interne);
}
if (dups.length > 0) {
  console.error(
    `❌ ${dups.length} doublon(s) de ref_interne :`,
    dups.slice(0, 10)
  );
  console.error("   Corrigez le fichier Excel et relancez.");
  process.exit(1);
}

// ----- Insertion par batchs -----
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BATCH = 500;
let inserted = 0;
let errors = 0;

for (let i = 0; i < pieces.length; i += BATCH) {
  const slice = pieces.slice(i, i + BATCH);
  const { error, count } = await supabase
    .from("pieces")
    .upsert(slice, { onConflict: "ref_interne", count: "exact" });

  if (error) {
    console.error(`❌ Batch ${i}: ${error.message}`);
    errors += slice.length;
  } else {
    inserted += slice.length;
    process.stdout.write(`\r  ✓ ${inserted}/${pieces.length} importées`);
  }
}

console.log(`\n\n=== Import terminé ===`);
console.log(`  ✓ Importées : ${inserted}`);
console.log(`  ✗ Erreurs   : ${errors}`);
console.log(`\nProchaine étape : npm run generate:qr pour créer les étiquettes QR.`);
