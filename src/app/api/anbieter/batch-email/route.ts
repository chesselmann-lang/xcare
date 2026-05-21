import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Template variable replacement — replaces {{key}} with value
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

interface BatchEmailBody {
  anfrageIds: string[];
  betreff: string;
  nachricht: string; // plain-text body with {{name}}, {{lebenslage}} etc.
}

/**
 * POST /api/anbieter/batch-email
 * Sends a personalized email to each family in the selected Anfragen.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, vorname, nachname")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id, name")
      .eq("profile_id", profile.id)
      .single();

    if (!anbieter) {
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });
    }

    const body: BatchEmailBody = await req.json();

    if (!body.anfrageIds || body.anfrageIds.length === 0) {
      return NextResponse.json({ error: "Keine Anfragen ausgewählt" }, { status: 400 });
    }
    if (body.anfrageIds.length > 50) {
      return NextResponse.json({ error: "Maximal 50 Anfragen pro Batch" }, { status: 400 });
    }
    if (!body.betreff?.trim() || !body.nachricht?.trim()) {
      return NextResponse.json({ error: "Betreff und Nachricht sind Pflichtfelder" }, { status: 400 });
    }

    // Fetch anfragen + family email (via user_id join)
    const { data: anfragen, error: anfragenError } = await supabase
      .from("anfragen")
      .select(`
        id,
        lebenslage,
        status,
        profiles!familie_id (
          vorname,
          nachname,
          user_id
        )
      `)
      .in("id", body.anfrageIds)
      .eq("anbieter_id", anbieter.id); // ownership check — only this anbieter's anfragen

    if (anfragenError) throw anfragenError;

    if (!anfragen || anfragen.length === 0) {
      return NextResponse.json({ error: "Keine gültigen Anfragen gefunden" }, { status: 404 });
    }

    // Fetch auth emails for each family's user_id (via admin client if available, else via profiles)
    const familyUserIds = anfragen
      .map((a) => (a.profiles as { vorname: string | null; nachname: string | null; user_id: string } | null)?.user_id)
      .filter(Boolean) as string[];

    // Fetch emails from profiles table (email column)
    const { data: profileEmails } = await supabase
      .from("profiles")
      .select("user_id, email")
      .in("user_id", familyUserIds);

    const emailByUserId = new Map(
      (profileEmails ?? []).map((p) => [p.user_id, p.email as string])
    );

    const anbieterName = anbieter.name ??
      (profile.vorname ? `${profile.vorname} ${profile.nachname ?? ""}`.trim() : "Ihr Anbieter");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de";

    const results: Array<{ anfrageId: string; email: string; success: boolean; error?: string }> = [];

    for (const anfrage of anfragen) {
      const familyProfile = anfrage.profiles as {
        vorname: string | null;
        nachname: string | null;
        user_id: string;
      } | null;

      const familyEmail = emailByUserId.get(familyProfile?.user_id ?? "");
      if (!familyEmail) {
        results.push({ anfrageId: anfrage.id, email: "(unbekannt)", success: false, error: "Keine E-Mail-Adresse" });
        continue;
      }

      const familyName = familyProfile?.vorname
        ? `${familyProfile.vorname} ${familyProfile.nachname ?? ""}`.trim()
        : "Familie";

      const vars: Record<string, string> = {
        name: familyName,
        vorname: familyProfile?.vorname ?? familyName,
        lebenslage: anfrage.lebenslage.replace(/_/g, " "),
        status: anfrage.status,
        anbieter: anbieterName,
        anfrageId: anfrage.id.slice(0, 8),
      };

      const betreff = fillTemplate(body.betreff, vars);
      const nachrichtText = fillTemplate(body.nachricht, vars);

      const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #6d28d9; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px;">Nachricht von ${anbieterName}</h1>
    </div>
    <div style="padding: 32px; color: #1f2937; line-height: 1.7;">
      ${nachrichtText
        .split("\n")
        .map((line) => `<p style="margin: 0 0 12px 0;">${line || "&nbsp;"}</p>`)
        .join("")}
    </div>
    <div style="padding: 16px 32px 24px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
      Diese E-Mail wurde über xcare.de gesendet. Bei Fragen antworten Sie direkt auf diese E-Mail.
    </div>
  </div>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: familyEmail,
          subject: betreff,
          html,
          text: nachrichtText,
          replyTo: user.email,
        });
        results.push({ anfrageId: anfrage.id, email: familyEmail, success: true });
      } catch (sendErr) {
        logger.error("batch-email send failed", { anfrageId: anfrage.id, error: String(sendErr) });
        results.push({ anfrageId: anfrage.id, email: familyEmail, success: false, error: "Versandfehler" });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info("batch-email completed", { anbieterEmail: user.email, sent, failed });

    return NextResponse.json({ sent, failed, results });
  } catch (err) {
    logger.error("POST /api/anbieter/batch-email failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
