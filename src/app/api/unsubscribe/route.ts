import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

/**
 * GET /api/unsubscribe?email=...&type=...&token=...
 *
 * One-click unsubscribe link embedded in bulk emails (DSGVO / CAN-SPAM).
 * Verifies the HMAC token, then sets email_prefs[type] = false in profiles.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  const type  = searchParams.get("type")  ?? "";
  const token = searchParams.get("token") ?? "";

  const VALID_TYPES = ["digest", "neue_anfrage", "statusupdate", "neue_nachricht", "bewertung", "wiedervorlage"];

  if (!email || !type || !token || !VALID_TYPES.includes(type)) {
    return new NextResponse(unsubscribePage("Ungültiger Link", "Dieser Abmelde-Link ist ungültig oder veraltet.", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const valid = await verifyUnsubscribeToken(email, type, token);
  if (!valid) {
    return new NextResponse(unsubscribePage("Ungültiger Token", "Dieser Abmelde-Link ist ungültig oder wurde bereits verwendet.", false), {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Use service role to update without session (clicking email link = no cookie)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find profile by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email_prefs")
    .eq("email", email)
    .single();

  if (!profile) {
    return new NextResponse(unsubscribePage("Konto nicht gefunden", "Wir konnten kein Konto mit dieser E-Mail-Adresse finden.", false), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const merged = { ...(profile.email_prefs ?? {}), [type]: false };
  await supabase
    .from("profiles")
    .update({ email_prefs: merged, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  const typeLabels: Record<string, string> = {
    digest:         "Wöchentlicher Digest",
    neue_anfrage:   "Neue Anfragen",
    statusupdate:   "Status-Änderungen",
    neue_nachricht: "Neue Nachrichten",
    bewertung:      "Neue Bewertungen",
    wiedervorlage:  "Wiedervorlagen-Erinnerungen",
  };

  return new NextResponse(
    unsubscribePage(
      "Erfolgreich abgemeldet",
      `Sie erhalten keine E-Mails für „${typeLabels[type] ?? type}" mehr. Sie können Ihre Einstellungen jederzeit im Dashboard ändern.`,
      true
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function unsubscribePage(title: string, message: string, success: boolean): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
  const color = success ? "#1A5276" : "#C0392B";
  const icon  = success ? "✅" : "❌";
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/><title>${title} – xcare</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:48px 40px;max-width:480px;width:100%;text-align:center;">
  <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
  <h1 style="color:${color};margin:0 0 12px;font-size:22px;">${title}</h1>
  <p style="color:#555;line-height:1.6;margin:0 0 28px;">${message}</p>
  <a href="${appUrl}/einstellungen" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Einstellungen öffnen</a>
  <p style="margin-top:20px;"><a href="${appUrl}" style="color:#1A5276;font-size:13px;">Zurück zu xcare</a></p>
</div>
</body></html>`;
}
