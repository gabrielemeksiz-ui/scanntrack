import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DRY_RUN = process.env.DRY_RUN_NOTIFICATIONS === "true";

interface SendBonOpts {
  bon: any; // Bon complet (cf. lib/pdf/bon-sortie)
  pdfBuffer: Buffer;
}

export async function sendBonEmail({ bon, pdfBuffer }: SendBonOpts) {
  const numFmt = `BS-${new Date(bon.created_at).getFullYear()}-${String(
    bon.numero
  ).padStart(4, "0")}`;
  const chantierLabel = bon.chantier?.nom || bon.chantier_nom_libre || "—";
  const chefNom = `${bon.profile.prenom} ${bon.profile.nom}`;

  const subject = `Bon de sortie ${numFmt} — ${chantierLabel} — ${chefNom}`;

  const html = `
    <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#1F3A5F;margin-bottom:8px">Bon de sortie ${numFmt}</h1>
      <p style="color:#606060;margin-top:0">Émis le ${new Date(
        bon.created_at
      ).toLocaleString("fr-FR")}</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr>
          <td style="padding:8px;background:#F5F7FA;font-weight:bold;width:40%">Chantier</td>
          <td style="padding:8px;background:#F5F7FA">${chantierLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold">Chef d'équipe</td>
          <td style="padding:8px">${chefNom} (équipe ${bon.profile.equipe_num})</td>
        </tr>
        <tr>
          <td style="padding:8px;background:#F5F7FA;font-weight:bold">Total HT</td>
          <td style="padding:8px;background:#F5F7FA;font-size:18px;color:#1F3A5F"><strong>${bon.total_ht.toFixed(
            2
          )} €</strong></td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold">Pièces</td>
          <td style="padding:8px">${bon.lignes.length} ligne(s)</td>
        </tr>
      </table>

      <p>Le détail complet est en pièce jointe.</p>
      <p style="font-size:12px;color:#999;margin-top:30px">ScannTrack — Email automatique, ne pas répondre directement.</p>
    </div>
  `;

  if (DRY_RUN || !resend) {
    console.log("[DRY RUN] Email qui aurait été envoyé:");
    console.log(`  À: ${process.env.EMAIL_GERANT}`);
    console.log(`  Sujet: ${subject}`);
    console.log(`  PDF: ${pdfBuffer.length} bytes`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_GERANT!,
    subject,
    html,
    attachments: [
      {
        filename: `${numFmt}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
