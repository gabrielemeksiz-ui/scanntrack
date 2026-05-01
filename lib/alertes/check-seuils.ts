import { sendSMS } from "@/lib/sms/twilio";

/**
 * Récupère les alertes non encore notifiées, envoie un SMS regroupé,
 * puis marque les alertes comme envoyées.
 *
 * Stratégie : on regroupe les alertes en 1 seul SMS pour éviter le spam
 * (le gérant a 1826 références, ça pourrait alerter en cascade).
 */
export async function handleAlertesSeuil(admin: any) {
  const { data: alertes } = await admin
    .from("alertes")
    .select("*, piece:pieces(nom, ref_interne, stock_actuel, seuil_alerte)")
    .eq("sms_sent", false)
    .is("resolved_at", null)
    .limit(20);

  if (!alertes || alertes.length === 0) return;

  // Construire un SMS regroupé
  const lignes = alertes
    .map(
      (a: any) =>
        `• ${a.piece.nom} (${a.piece.ref_interne}) : ${a.piece.stock_actuel} restants`
    )
    .join("\n");

  const body = `🚨 STOCK BAS\n${alertes.length} pièce${
    alertes.length > 1 ? "s" : ""
  } sous le seuil :\n\n${lignes}\n\n— ScannTrack`;

  // Tronquer à 1500 caractères max pour Twilio (multi-SMS coûteux)
  const finalBody =
    body.length > 1500 ? body.slice(0, 1490) + "...\n[+]" : body;

  const result = await sendSMS(process.env.SMS_GERANT!, finalBody);

  if (result.success) {
    await admin
      .from("alertes")
      .update({ sms_sent: true })
      .in(
        "id",
        alertes.map((a: any) => a.id)
      );
  }

  return result;
}
