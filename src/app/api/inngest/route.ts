import { serve } from "inngest/next";
import { Inngest } from "inngest";
import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const inngest = new Inngest({ id: "xcare" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;">
<tr><td style="background:#1A5276;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p><p style="margin:4px 0 0;color:#a8c7e8;font-size:13px;">Ihr digitales Pflege-Ökosystem</p></td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH · <a href="${appUrl}" style="color:#1A5276;">xcare.de</a></p></td></tr>
</table></td></tr></table>
</body></html>`;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#1A5276;color:#