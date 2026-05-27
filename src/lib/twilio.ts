/**
 * Twilio SMS integration for critical notifications
 * Install: npm install twilio
 */

const isConfigured = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

export interface SmsOptions {
  to: string;
  message: string;
}

export interface SmsResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendSms({ to, message }: SmsOptions): Promise<SmsResult> {
  if (!isConfigured) {
    console.warn("[Twilio] Not configured — SMS not sent:", message.slice(0, 50));
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Dynamic import to avoid issues when not installed
    const twilio = (await import("twilio")).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Twilio] SMS failed:", msg);
    return { success: false, error: msg };
  }
}

// Pre-built SMS templates
export const SMS_TEMPLATES = {
  notfallAlert: (name: string, situation: string) =>
    `⚠️ XCARE NOTFALL: ${name} benötigt Hilfe.\n${situation}\nBitte sofort kontaktieren oder 112 anrufen.`,

  terminErinnerung: (name: string, datum: string, anbieter: string) =>
    `📅 xcare: Ihr Termin mit ${anbieter} am ${datum}.\nBitte rechtzeitig erscheinen.`,

  buchungsBestätigung: (service: string, datum: string) =>
    `✅ xcare: Buchung bestätigt!\n${service} am ${datum}.\nFragen? App öffnen oder antworten.`,

  pflegegradBescheid: (grade: number) =>
    `🏥 xcare: Ihr Pflegegrad-${grade} wurde bewilligt. Öffnen Sie die App für alle Details und nächsten Schritte.`,
};
