import type { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";

type EmailParams = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

/**
 * Sends an email via Resend and logs the result to the email_log table.
 * Logging is fire-and-forget — a logging failure will NOT prevent email delivery.
 */
export async function sendAndLog(
  resend: Resend,
  params: EmailParams,
  template = "transaktional",
) {
  const result = await resend.emails.send(params);

  // Fire-and-forget logging — never throw
  try {
    const supabase = getServiceClient();
    const toEmail = Array.isArray(params.to) ? params.to.join(", ") : params.to;
    await supabase.from("email_log").insert({
      to_email: toEmail,
      subject: params.subject,
      template,
      status: result.error ? "error" : "sent",
      error: result.error ? JSON.stringify(result.error) : null,
    });
  } catch {
    // Intentionally silent — logging must not break email sending
  }

  return result;
}
