import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateBonPDF } from "@/lib/pdf/bon-sortie";
import { sendBonEmail } from "@/lib/email/send-bon";
import { handleAlertesSeuil } from "@/lib/alertes/check-seuils";

// =====================================================
// POST /api/bons/valider
// =====================================================
// Body : { chantier_nom: string, lignes: [{piece_id, quantite}] }
//
// Workflow :
// 1. Auth check
// 2. Créer le bon (status en_cours) + ses lignes
// 3. Appeler la fonction SQL valider_bon_sortie() qui :
//    - vérifie le stock dispo
//    - décrémente le stock
//    - crée les mouvements
//    - crée les alertes seuil si besoin
//    - marque le bon validé + calcule le total
// 4. Générer le PDF du bon
// 5. Uploader le PDF dans Storage
// 6. Envoyer l'email au gérant avec le PDF en pièce jointe
// 7. Vérifier les alertes créées et envoyer les SMS
// 8. Retourner numero + total
// =====================================================

const Body = z.object({
  chantier_nom: z.string().min(1).max(200),
  chantier_id: z.string().uuid().optional(),
  lignes: z
    .array(
      z.object({
        piece_id: z.string().uuid(),
        quantite: z.number().positive(),
      })
    )
    .min(1)
    .max(100),
});

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 2. Validation du body
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Body invalide", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const { chantier_nom, chantier_id, lignes } = parsed.data;

  // 3. Création du bon
  const { data: bon, error: bonError } = await supabase
    .from("bons_sortie")
    .insert({
      user_id: user.id,
      chantier_id: chantier_id || null,
      chantier_nom_libre: chantier_id ? null : chantier_nom,
      status: "en_cours",
    })
    .select()
    .single();

  if (bonError || !bon) {
    return NextResponse.json(
      { error: "Erreur création bon", details: bonError?.message },
      { status: 500 }
    );
  }

  // 4. Insertion des lignes (en récupérant les prix depuis la DB)
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, prix_unitaire")
    .in(
      "id",
      lignes.map((l) => l.piece_id)
    );

  const prixMap = new Map(
    (pieces || []).map((p) => [p.id, p.prix_unitaire || 0])
  );

  const lignesToInsert = lignes.map((l) => ({
    bon_id: bon.id,
    piece_id: l.piece_id,
    quantite: l.quantite,
    prix_unitaire: prixMap.get(l.piece_id) || 0,
  }));

  const { error: lignesError } = await supabase
    .from("bon_lignes")
    .insert(lignesToInsert);

  if (lignesError) {
    return NextResponse.json(
      { error: "Erreur lignes", details: lignesError.message },
      { status: 500 }
    );
  }

  // 5. Validation atomique côté DB (décrémente stock, crée mouvements, alertes)
  const { data: validation, error: valError } = await supabase.rpc(
    "valider_bon_sortie",
    { p_bon_id: bon.id }
  );

  if (valError) {
    return NextResponse.json(
      { error: "Validation échouée", details: valError.message },
      { status: 500 }
    );
  }

  // 6. Génération PDF + upload + email + SMS (en arrière-plan, on n'attend pas)
  // Volontairement non-bloquant pour rendre la main au chef d'équipe vite
  const admin = createAdminClient();
  postProcessBon(admin, bon.id).catch((e) => {
    console.error("[postProcess]", e);
  });

  return NextResponse.json({
    success: true,
    bon_id: bon.id,
    numero: bon.numero,
    total_ht: validation.total_ht,
    alertes_creees: validation.alertes_creees,
  });
}

/**
 * Post-traitement après validation : PDF + email + SMS.
 * Tourne en arrière-plan, ne bloque pas la réponse à l'utilisateur.
 */
async function postProcessBon(admin: any, bonId: string) {
  // Récupérer le bon complet avec ses lignes et les pièces
  const { data: bonComplet } = await admin
    .from("bons_sortie")
    .select(
      `
      *,
      profile:profiles!bons_sortie_user_id_fkey(prenom, nom, equipe_num),
      chantier:chantiers(*),
      lignes:bon_lignes(
        *,
        piece:pieces(*)
      )
    `
    )
    .eq("id", bonId)
    .single();

  if (!bonComplet) return;

  // 1. Générer le PDF
  const pdfBuffer = await generateBonPDF(bonComplet);

  // 2. Upload dans Storage
  const path = `bons/${new Date().getFullYear()}/${bonId}.pdf`;
  const { error: upErr } = await admin.storage
    .from("bons-pdf")
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (!upErr) {
    const { data: urlData } = admin.storage
      .from("bons-pdf")
      .getPublicUrl(path);

    await admin
      .from("bons_sortie")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", bonId);
  }

  // 3. Envoyer l'email au gérant
  await sendBonEmail({
    bon: bonComplet,
    pdfBuffer,
  });

  await admin
    .from("bons_sortie")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", bonId);

  // 4. Gérer les alertes seuil non encore notifiées
  await handleAlertesSeuil(admin);
}
