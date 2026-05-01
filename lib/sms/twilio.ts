import twilio from "twilio";

const DRY_RUN = process.env.DRY_RUN_NOTIFICATIONS === "true";

const client =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export async function sendSMS(to: string, body: string) {
  if (DRY_RUN || !client) {
    console.log(`[DRY RUN] SMS qui aurait été envoyé à ${to}:`);
    console.log(`  ${body}`);
    return { success: true, dry_run: true };
  }

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE_FROM!,
      to,
      body,
    });
    return { success: true, sid: message.sid };
  } catch (e: any) {
    console.error("[SMS Twilio] Erreur :", e.message);
    return { success: false, error: e.message };
  }
}
