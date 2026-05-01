// =============================================================
// Génération des étiquettes QR codes des pièces en PDF
// =============================================================
// Usage :
//   node scripts/generate-qr-pdf.mjs
//   → produit public/qr-codes/etiquettes.pdf
//
// Format : 30 étiquettes par page A4 (3 colonnes × 10 lignes)
// Chaque étiquette = QR code + ref interne + nom de la pièce
// =============================================================

import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { config } from "dotenv";

// Charger .env.local explicitement
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Récupérer toutes les pièces actives
console.log("📦 Récupération du catalogue...");
const { data: pieces, error } = await supabase
  .from("pieces")
  .select("ref_interne, nom")
  .eq("actif", true)
  .order("ref_interne");

if (error || !pieces) {
  console.error("❌ Erreur :", error?.message);
  process.exit(1);
}

console.log(`✓ ${pieces.length} pièces`);

// Génération des QR codes en data URL
console.log("🔳 Génération des QR codes...");
const qrs = await Promise.all(
  pieces.map(async (p) => ({
    ...p,
    qr: await QRCode.toDataURL(p.ref_interne, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
    }),
  }))
);

// Génération HTML imprimable
const COLS = 3;
const ROWS = 10;
const PER_PAGE = COLS * ROWS;

const pages = [];
for (let i = 0; i < qrs.length; i += PER_PAGE) {
  pages.push(qrs.slice(i, i + PER_PAGE));
}

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>QR codes - ScannTrack</title>
<style>
  @page { size: A4; margin: 8mm; }
  body { font-family: -apple-system, sans-serif; margin: 0; }
  .page {
    page-break-after: always;
    display: grid;
    grid-template-columns: repeat(${COLS}, 1fr);
    gap: 4mm;
  }
  .page:last-child { page-break-after: auto; }
  .label {
    border: 1px dashed #ccc;
    padding: 4mm;
    text-align: center;
    height: 27mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    page-break-inside: avoid;
  }
  .label img { width: 22mm; height: 22mm; }
  .label .ref { font-size: 7pt; font-weight: bold; margin-top: 1mm; }
  .label .nom { font-size: 6pt; color: #555; line-height: 1.1;
                overflow: hidden; max-height: 6mm; text-overflow: ellipsis; }
</style>
</head>
<body>
${pages
  .map(
    (page) => `
  <div class="page">
    ${page
      .map(
        (p) => `
      <div class="label">
        <img src="${p.qr}" alt="${p.ref_interne}">
        <div>
          <div class="ref">${p.ref_interne}</div>
          <div class="nom">${escapeHtml(p.nom)}</div>
        </div>
      </div>`
      )
      .join("")}
  </div>
`
  )
  .join("")}
</body>
</html>
`;

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const outDir = path.resolve("public/qr-codes");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "etiquettes.html");
fs.writeFileSync(outPath, html);

console.log(`\n✓ Fichier généré : ${outPath}`);
console.log(`  ${pages.length} page(s) A4, ${pieces.length} étiquettes`);
console.log(`\nOuvrir le HTML dans Chrome → Ctrl+P → "Enregistrer au format PDF"`);
console.log(`(ou utiliser une imprimante thermique avec étiquettes 50×30 mm)`);
