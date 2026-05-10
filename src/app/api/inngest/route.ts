import { serve } from "inngest/next";
import { Inngest } from "inngest";
import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createUnsubscribeToken, buildUnsubscribeUrl } from "@/lib/unsubscribe";

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
  return `<a href="${href}" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">${text}</a>`;
}

// ─── 1. Willkommens-Email ────────────────────────────────────────────────────
const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/registered" },
  async ({ event }) => {
    const { email, vorname, rolle } = event.data as {
      email: string; vorname: string; rolle: string;
    };
    const resend = new Resend(process.env.RESEND_API_KEY);
    const isAnbieter = rolle === "anbieter";
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Willkommen bei xcare, ${vorname}!`,
      html: baseTemplate("Willkommen!", `
        <h2 style="color:#1A5276;margin-top:0;">Hallo ${vorname}! 👋</h2>
        <p style="color:#333;line-height:1.6;">Schön, dass Sie Teil von xcare sind. Sie sind als <strong>${isAnbieter ? "Anbieter" : "Familie"}</strong> registriert.</p>
        ${isAnbieter
          ? `<p style="color:#333;line-height:1.6;">Vervollständigen Sie jetzt Ihr Profil und tragen Sie Ihre Leistungen ein.</p>${btn("Profil vervollständigen", `${appUrl}/anbieter/profil`)}`
          : `<p style="color:#333;line-height:1.6;">Starten Sie mit unserem KI-Lotsen, um die passenden Leistungen zu finden.</p>${btn("Lebenslage-Lotsen starten", `${appUrl}/lotse`)}`
        }
      `),
    });
  }
);

// ─── 2. Neue Anfrage → Anbieter benachrichtigen ──────────────────────────────
const notifyAnbieterNeueAnfrage = inngest.createFunction(
  { id: "notify-anbieter-new-anfrage" },
  { event: "anfrage/created" },
  async ({ event }) => {
    const { anbieter_email, anbieter_name, familie_name, lebenslage, anfrage_id } = event.data as {
      anbieter_email: string; anbieter_name: string; familie_name: string;
      lebenslage: string; anfrage_id?: string;
    };

    // Check email_prefs: skip if anbieter opted out of new request notifications
    const supabase = getServiceClient();
    const { data: anbieterProfile } = await supabase
      .from("profiles")
      .select("email_prefs")
      .eq("email", anbieter_email)
      .single();
    const anbieterPrefs = (anbieterProfile?.email_prefs ?? {}) as Record<string, boolean>;
    if (anbieterPrefs.neue_anfrage === false) return { skipped: true, reason: "opted out: neue_anfrage" };

    // Build unsubscribe link (DSGVO / CAN-SPAM)
    const unsubToken = await createUnsubscribeToken(anbieter_email, "neue_anfrage");
    const unsubUrl = buildUnsubscribeUrl(appUrl, anbieter_email, "neue_anfrage", unsubToken);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: anbieter_email,
      subject: `Neue Anfrage über xcare — ${familie_name}`,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("Neue Anfrage", `
        <h2 style="color:#1A5276;margin-top:0;">Neue Anfrage eingegangen 📬</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;"><strong>${familie_name}</strong> hat eine Anfrage für <strong>${lebenslage.replace(/_/g, " ")}</strong> gestellt.</p>
        <p style="color:#555;font-size:13px;">Bitte antworten Sie zeitnah — Familien warten auf Ihre Rückmeldung.</p>
        ${btn("Anfrage ansehen", anfrage_id ? `${appUrl}/anbieter/anfragen/${anfrage_id}` : `${appUrl}/anbieter/anfragen`)}
        <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl}" style="color:#999;">Keine Anfragen-E-Mails mehr</a> · <a href="${appUrl}/anbieter/einstellungen" style="color:#999;">Einstellungen</a></p>
      `),
    });
  }
);

// ─── 3. Status-Update → Familie benachrichtigen ──────────────────────────────
const notifyFamilieStatusUpdate = inngest.createFunction(
  { id: "notify-familie-status-update" },
  { event: "anfrage/status-changed" },
  async ({ event }) => {
    const { familie_email, familie_name, anbieter_name, new_status, lebenslage, anfrage_id } = event.data as {
      familie_email: string; familie_name: string; anbieter_name: string;
      new_status: string; lebenslage: string; anfrage_id?: string;
    };

    // Check email_prefs: skip if familie opted out of status updates
    const supabase = getServiceClient();
    const { data: familieProfile } = await supabase
      .from("profiles")
      .select("email_prefs")
      .eq("email", familie_email)
      .single();
    const familiePrefs = (familieProfile?.email_prefs ?? {}) as Record<string, boolean>;
    if (familiePrefs.statusupdate === false) return { skipped: true, reason: "opted out: statusupdate" };

    const anfragenUrl = anfrage_id
      ? `${appUrl}/familie/anfragen/${anfrage_id}`
      : `${appUrl}/familie/anfragen`;

    // Build unsubscribe link (DSGVO / CAN-SPAM)
    const unsubToken = await createUnsubscribeToken(familie_email, "statusupdate");
    const unsubUrl = buildUnsubscribeUrl(appUrl, familie_email, "statusupdate", unsubToken);

    const msgs: Record<string, { subject: string; body: string }> = {
      in_bearbeitung: {
        subject: `${anbieter_name} bearbeitet Ihre Anfrage`,
        body: `
          <p style="color:#333;line-height:1.6;"><strong>${anbieter_name}</strong> hat Ihre Anfrage angenommen und bearbeitet sie jetzt aktiv.</p>
          <p style="color:#555;font-size:13px;">Sie werden informiert, sobald ein Angebot vorliegt.</p>
          ${btn("Anfrage verfolgen", anfragenUrl)}
        `,
      },
      angeboten: {
        subject: `🎉 Angebot von ${anbieter_name} erhalten!`,
        body: `
          <div style="background:#EBF5FB;border-left:4px solid #1A5276;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
            <p style="margin:0;font-weight:600;color:#1A5276;">Gute Neuigkeiten!</p>
          </div>
          <p style="color:#333;line-height:1.6;"><strong>${anbieter_name}</strong> hat Ihnen ein Angebot für <strong>${lebenslage.replace(/_/g, " ")}</strong> gemacht.</p>
          <p style="color:#555;font-size:13px;">Schauen Sie sich das Angebot an und bestätigen oder lehnen Sie es ab.</p>
          ${btn("Angebot ansehen", anfragenUrl)}
        `,
      },
      bestaetigt: {
        subject: `Anfrage bei ${anbieter_name} bestätigt ✓`,
        body: `
          <p style="color:#333;line-height:1.6;">Ihre Anfrage bei <strong>${anbieter_name}</strong> wurde bestätigt. Sie sind einen Schritt weiter!</p>
          ${btn("Zur Anfrage", anfragenUrl)}
        `,
      },
      abgelehnt: {
        subject: `Anfrage bei ${anbieter_name} nicht möglich`,
        body: `
          <p style="color:#333;line-height:1.6;">Leider kann <strong>${anbieter_name}</strong> Ihre Anfrage für <strong>${lebenslage.replace(/_/g, " ")}</strong> derzeit nicht bearbeiten.</p>
          <p style="color:#555;font-size:13px;">Es gibt viele weitere Anbieter in Ihrer Nähe, die Ihnen helfen können.</p>
          ${btn("Weitere Anbieter suchen", `${appUrl}/suche`)}
        `,
      },
      abgeschlossen: {
        subject: `Anfrage bei ${anbieter_name} abgeschlossen`,
        body: `
          <p style="color:#333;line-height:1.6;">Ihre Anfrage bei <strong>${anbieter_name}</strong> wurde abgeschlossen.</p>
          <p style="color:#555;font-size:13px;">Vielen Dank, dass Sie xcare genutzt haben.</p>
          ${btn("Zur Anfrage", anfragenUrl)}
        `,
      },
    };

    const msg = msgs[new_status];
    if (!msg) return;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: familie_email,
      subject: msg.subject,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate(msg.subject, `
        <h2 style="color:#1A5276;margin-top:0;">Update zu Ihrer Anfrage</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${familie_name}</strong>,</p>
        ${msg.body}
        <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl}" style="color:#999;">Keine Status-E-Mails mehr erhalten</a> · <a href="${appUrl}/familie/einstellungen" style="color:#999;">Einstellungen</a></p>
      `),
    });
  }
);

// ─── 4. 48h-Erinnerung → Anbieter (nur wenn Anfrage noch offen) ───────────────
const remind48hAnbieter = inngest.createFunction(
  { id: "remind-anbieter-48h", concurrency: { limit: 50 } },
  { event: "anfrage/created" },
  async ({ event, step }) => {
    const { anfrage_id, anbieter_email, anbieter_name, familie_name, lebenslage } = event.data as {
      anfrage_id: string; anbieter_email: string; anbieter_name: string;
      familie_name: string; lebenslage: string;
    };

    // Wait 48 hours
    await step.sleep("wait-48h", "48h");

    // Check if anfrage is still open — skip reminder if already handled
    const shouldSend = await step.run("check-anfrage-status", async () => {
      try {
        const supabase = getServiceClient();
        const { data } = await supabase
          .from("anfragen")
          .select("status")
          .eq("id", anfrage_id)
          .single();
        // Only send if still "offen" (not yet picked up by anbieter)
        return data?.status === "offen";
      } catch {
        return true; // If check fails, send anyway to be safe
      }
    });

    if (!shouldSend) return { skipped: true, reason: "anfrage already handled" };

    // Check email_prefs: skip if anbieter opted out of neue_anfrage reminders
    const supabase48h = getServiceClient();
    const { data: anbieterProfile48h } = await supabase48h
      .from("profiles")
      .select("email_prefs")
      .eq("email", anbieter_email)
      .single();
    const prefs48h = (anbieterProfile48h?.email_prefs ?? {}) as Record<string, boolean>;
    if (prefs48h.neue_anfrage === false) return { skipped: true, reason: "opted out: neue_anfrage" };

    // Build unsubscribe link
    const unsubToken48h = await createUnsubscribeToken(anbieter_email, "neue_anfrage");
    const unsubUrl48h = buildUnsubscribeUrl(appUrl, anbieter_email, "neue_anfrage", unsubToken48h);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: anbieter_email,
      subject: `⏰ Erinnerung: Offene Anfrage von ${familie_name}`,
      headers: {
        "List-Unsubscribe": `<${unsubUrl48h}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("Erinnerung", `
        <h2 style="color:#1A5276;margin-top:0;">Offene Anfrage — Erinnerung</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Die Anfrage von <strong>${familie_name}</strong> zu <strong>${lebenslage.replace(/_/g, " ")}</strong> wartet seit 48 Stunden auf Ihre Rückmeldung.</p>
        <div style="background:#FEF9E7;border-left:4px solid #F1C40F;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="margin:0;color:#7D6608;font-size:13px;">Schnelle Antworten verbessern Ihre Bewertung auf xcare.</p>
        </div>
        ${btn("Jetzt bearbeiten", anfrage_id ? `${appUrl}/anbieter/anfragen/${anfrage_id}` : `${appUrl}/anbieter/anfragen`)}
        <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl48h}" style="color:#999;">Keine Erinnerungs-E-Mails mehr</a> · <a href="${appUrl}/anbieter/einstellungen" style="color:#999;">Einstellungen</a></p>
      `),
    });

    return { sent: true };
  }
);

// ─── 5. Post-Abschluss Bewertungsanfrage → Familie (24h Delay) ────────────────
const requestBewertungNachAbschluss = inngest.createFunction(
  { id: "request-bewertung-nach-abschluss" },
  { event: "anfrage/status-changed" },
  async ({ event, step }) => {
    const { new_status, familie_email, familie_name, anbieter_name, anfrage_id } = event.data as {
      new_status: string; familie_email: string; familie_name: string;
      anbieter_name: string; anfrage_id?: string;
    };

    if (new_status !== "abgeschlossen") return;

    // Wait 24 hours before asking for review
    await step.sleep("wait-24h-rating", "24h");

    // Check if already rated
    const alreadyRated = await step.run("check-bewertung", async () => {
      if (!anfrage_id) return false;
      try {
        const supabase = getServiceClient();
        const { data } = await supabase
          .from("bewertungen")
          .select("id")
          .eq("anfrage_id", anfrage_id)
          .single();
        return !!data;
      } catch {
        return false;
      }
    });

    if (alreadyRated) return { skipped: true, reason: "already rated" };

    // Check email_prefs: skip if familie opted out of review reminder emails
    const supabaseBew = getServiceClient();
    const { data: familieProfileBew } = await supabaseBew
      .from("profiles")
      .select("email_prefs")
      .eq("email", familie_email)
      .single();
    const prefsBew = (familieProfileBew?.email_prefs ?? {}) as Record<string, boolean>;
    if (prefsBew.bewertung === false) return { skipped: true, reason: "opted out: bewertung" };

    // Build unsubscribe link
    const unsubTokenBew = await createUnsubscribeToken(familie_email, "bewertung");
    const unsubUrlBew = buildUnsubscribeUrl(appUrl, familie_email, "bewertung", unsubTokenBew);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: familie_email,
      subject: `Wie war Ihre Erfahrung mit ${anbieter_name}? ⭐`,
      headers: {
        "List-Unsubscribe": `<${unsubUrlBew}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("Bewertung abgeben", `
        <h2 style="color:#1A5276;margin-top:0;">Helfen Sie anderen Familien ⭐</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${familie_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Ihre Anfrage bei <strong>${anbieter_name}</strong> wurde abgeschlossen. Möchten Sie Ihre Erfahrung teilen?</p>
        <p style="color:#555;font-size:13px;">Eine Bewertung hilft anderen Familien, den richtigen Anbieter zu finden — es dauert nur 1 Minute.</p>
        ${btn("Jetzt bewerten", anfrage_id ? `${appUrl}/familie/anfragen/${anfrage_id}` : `${appUrl}/familie/anfragen`)}
        <p style="color:#999;font-size:12px;margin-top:24px;">Wenn Sie bereits bewertet haben, können Sie diese E-Mail ignorieren. · <a href="${unsubUrlBew}" style="color:#999;">Keine Bewertungs-Erinnerungen mehr</a></p>
      `),
    });
  }
);

// ─── 6. Neue Nachricht im Chat → Gegenseite benachrichtigen ──────────────────
const notifyNeueNachricht = inngest.createFunction(
  { id: "notify-neue-nachricht" },
  { event: "nachricht/created" },
  async ({ event }) => {
    const { empfaenger_email, empfaenger_name, sender_name, anfrage_id, vorschau } = event.data as {
      empfaenger_email: string; empfaenger_name: string; sender_name: string;
      anfrage_id: string; vorschau?: string;
    };

    // Check email_prefs: skip if recipient opted out of message notifications
    const supabase = getServiceClient();
    const { data: empfaengerProfile } = await supabase
      .from("profiles")
      .select("email_prefs")
      .eq("email", empfaenger_email)
      .single();
    const empfaengerPrefs = (empfaengerProfile?.email_prefs ?? {}) as Record<string, boolean>;
    if (empfaengerPrefs.neue_nachricht === false) return { skipped: true, reason: "opted out: neue_nachricht" };

    // Build unsubscribe link (DSGVO / CAN-SPAM)
    const unsubToken = await createUnsubscribeToken(empfaenger_email, "neue_nachricht");
    const unsubUrl = buildUnsubscribeUrl(appUrl, empfaenger_email, "neue_nachricht", unsubToken);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: empfaenger_email,
      subject: `Neue Nachricht von ${sender_name}`,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("Neue Nachricht", `
        <h2 style="color:#1A5276;margin-top:0;">Neue Nachricht 💬</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${empfaenger_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;"><strong>${sender_name}</strong> hat Ihnen eine Nachricht geschrieben.</p>
        ${vorschau ? `<div style="background:#f4f6f8;border-radius:8px;padding:12px 16px;margin:16px 0;color:#555;font-style:italic;font-size:14px;">"${vorschau.substring(0, 120)}${vorschau.length > 120 ? "…" : ""}"</div>` : ""}
        ${btn("Nachricht lesen", `${appUrl}/familie/anfragen/${anfrage_id}`)}
        <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl}" style="color:#999;">Keine Nachrichten-E-Mails mehr</a> · <a href="${appUrl}/familie/einstellungen" style="color:#999;">Einstellungen</a></p>
      `),
    });
  }
);

// ─── 7. 48h-Erinnerung → Familie (Angebot wartet auf Bestätigung) ─────────────
const remind48hFamilieAngebot = inngest.createFunction(
  { id: "remind-familie-48h-angebot", concurrency: { limit: 50 } },
  { event: "anfrage/status-changed" },
  async ({ event, step }) => {
    const { new_status, familie_email, familie_name, anbieter_name, anfrage_id } = event.data as {
      new_status: string; familie_email: string; familie_name: string;
      anbieter_name: string; anfrage_id?: string;
    };

    // Only trigger when an offer has been made
    if (new_status !== "angeboten") return;

    // Wait 48 hours for the family to respond
    await step.sleep("wait-48h-angebot", "48h");

    // Check if the anfrage is still in "angeboten" state (family hasn't responded)
    const stillPending = await step.run("check-angebot-status", async () => {
      if (!anfrage_id) return false;
      try {
        const supabase = getServiceClient();
        const { data } = await supabase
          .from("anfragen")
          .select("status")
          .eq("id", anfrage_id)
          .single();
        return data?.status === "angeboten";
      } catch {
        return false;
      }
    });

    if (!stillPending) return { skipped: true, reason: "angebot already responded to" };

    // Check email_prefs: skip if familie opted out of status update emails
    const supabaseAngebot = getServiceClient();
    const { data: familieProfileAngebot } = await supabaseAngebot
      .from("profiles")
      .select("email_prefs")
      .eq("email", familie_email)
      .single();
    const prefsAngebot = (familieProfileAngebot?.email_prefs ?? {}) as Record<string, boolean>;
    if (prefsAngebot.statusupdate === false) return { skipped: true, reason: "opted out: statusupdate" };

    // Build unsubscribe link
    const unsubTokenAngebot = await createUnsubscribeToken(familie_email, "statusupdate");
    const unsubUrlAngebot = buildUnsubscribeUrl(appUrl, familie_email, "statusupdate", unsubTokenAngebot);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const anfragenUrl = anfrage_id
      ? `${appUrl}/familie/anfragen/${anfrage_id}`
      : `${appUrl}/familie/anfragen`;

    await resend.emails.send({
      from: fromEmail,
      to: familie_email,
      subject: `⏳ Erinnerung: Angebot von ${anbieter_name} wartet auf Ihre Antwort`,
      headers: {
        "List-Unsubscribe": `<${unsubUrlAngebot}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("Angebot wartet", `
        <h2 style="color:#1A5276;margin-top:0;">Offenes Angebot — Erinnerung</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${familie_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;"><strong>${anbieter_name}</strong> hat Ihnen ein Angebot gemacht, das seit 48 Stunden auf Ihre Rückmeldung wartet.</p>
        <div style="background:#EBF5FB;border-left:4px solid #1A5276;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="margin:0;color:#1A5276;font-size:13px;">Bestätigen oder lehnen Sie das Angebot ab — damit der Anbieter planen kann.</p>
        </div>
        ${btn("Angebot jetzt ansehen", anfragenUrl)}
        <p style="color:#999;font-size:12px;margin-top:24px;">Falls Sie bereits geantwortet haben, können Sie diese E-Mail ignorieren. · <a href="${unsubUrlAngebot}" style="color:#999;">Keine Erinnerungs-E-Mails mehr</a></p>
      `),
    });

    return { sent: true };
  }
);

// ─── 8. Erinnerung offen gebliebene Anfrage → Anbieter nach 7 Tagen ──────────
const remind7dAnbieterOffen = inngest.createFunction(
  { id: "remind-anbieter-7d-offen", concurrency: { limit: 20 } },
  { event: "anfrage/created" },
  async ({ event, step }) => {
    const { anfrage_id, anbieter_email, anbieter_name, familie_name, lebenslage } = event.data as {
      anfrage_id: string; anbieter_email: string; anbieter_name: string;
      familie_name: string; lebenslage: string;
    };

    // Wait 7 days — final nudge before the anfrage might be considered expired
    await step.sleep("wait-7d", "168h");

    const shouldSend = await step.run("check-7d-status", async () => {
      try {
        const supabase = getServiceClient();
        const { data } = await supabase
          .from("anfragen")
          .select("status")
          .eq("id", anfrage_id)
          .single();
        return data?.status === "offen";
      } catch {
        return false;
      }
    });

    if (!shouldSend) return { skipped: true, reason: "anfrage no longer offen after 7d" };

    // Check email_prefs: skip if anbieter opted out of neue_anfrage reminders
    const supabase7d = getServiceClient();
    const { data: anbieterProfile7d } = await supabase7d
      .from("profiles")
      .select("email_prefs")
      .eq("email", anbieter_email)
      .single();
    const prefs7d = (anbieterProfile7d?.email_prefs ?? {}) as Record<string, boolean>;
    if (prefs7d.neue_anfrage === false) return { skipped: true, reason: "opted out: neue_anfrage" };

    // Build unsubscribe link
    const unsubToken7d = await createUnsubscribeToken(anbieter_email, "neue_anfrage");
    const unsubUrl7d = buildUnsubscribeUrl(appUrl, anbieter_email, "neue_anfrage", unsubToken7d);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: fromEmail,
      to: anbieter_email,
      subject: `📋 Letzte Erinnerung: Anfrage von ${familie_name} seit 7 Tagen offen`,
      headers: {
        "List-Unsubscribe": `<${unsubUrl7d}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: baseTemplate("7-Tage-Erinnerung", `
        <h2 style="color:#1A5276;margin-top:0;">Anfrage seit 7 Tagen unbeantwortet</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Die Anfrage von <strong>${familie_name}</strong> zu <strong>${lebenslage.replace(/_/g, " ")}</strong> ist seit 7 Tagen offen.</p>
        <div style="background:#FDEDEC;border-left:4px solid #E74C3C;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
          <p style="margin:0;color:#922B21;font-size:13px;">Unbeantwortete Anfragen wirken sich negativ auf Ihre Antwortrate aus.</p>
        </div>
        <p style="color:#555;font-size:13px;">Bitte bearbeiten oder lehnen Sie die Anfrage ab, damit die Familie Alternativanbieter kontaktieren kann.</p>
        ${btn("Anfrage jetzt bearbeiten", anfrage_id ? `${appUrl}/anbieter/anfragen/${anfrage_id}` : `${appUrl}/anbieter/anfragen`)}
        <p style="color:#999;font-size:12px;margin-top:24px;"><a href="${unsubUrl7d}" style="color:#999;">Keine Erinnerungs-E-Mails mehr</a> · <a href="${appUrl}/anbieter/einstellungen" style="color:#999;">Einstellungen</a></p>
      `),
    });

    return { sent: true };
  }
);

// ─── 9. Wöchentlicher Digest für Anbieter (jeden Montag 08:00) ─────────────────
const weeklyDigestAnbieter = inngest.createFunction(
  { id: "weekly-digest-anbieter", concurrency: { limit: 10 } },
  { cron: "0 8 * * 1" }, // Every Monday at 08:00 UTC
  async ({ step }) => {
    const supabase = getServiceClient();

    // Get all active Anbieter with their email
    const anbieterList = await step.run("fetch-anbieter-list", async () => {
      const { data } = await supabase
        .from("anbieter")
        .select("id, name, profile_id")
        .eq("aktiv", true);
      return data ?? [];
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let sent = 0;

    for (const anbieter of anbieterList) {
      await step.run(`digest-${anbieter.id}`, async () => {
        // Fetch email + email_prefs directly from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, email_prefs")
          .eq("id", anbieter.profile_id)
          .single();

        const email = profile?.email;
        if (!email) return;

        // Respect email_prefs: skip if user opted out of digest
        const prefs = (profile?.email_prefs ?? {}) as Record<string, boolean>;
        if (prefs.digest === false) return;

        // Stats: new requests this week
        const { count: neueAnfragen } = await supabase
          .from("anfragen")
          .select("*", { count: "exact", head: true })
          .eq("anbieter_id", anbieter.id)
          .gte("created_at", sevenDaysAgo);

        const { count: offeneAnfragen } = await supabase
          .from("anfragen")
          .select("*", { count: "exact", head: true })
          .eq("anbieter_id", anbieter.id)
          .eq("status", "offen");

        // Skip if nothing interesting to report
        if (!neueAnfragen && !offeneAnfragen) return;

        // Build unsubscribe link (DSGVO / CAN-SPAM requirement)
        const unsubToken = await createUnsubscribeToken(email, "digest");
        const unsubUrl = buildUnsubscribeUrl(appUrl, email, "digest", unsubToken);

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `📊 Ihre xcare-Woche – ${neueAnfragen ?? 0} neue Anfrage${(neueAnfragen ?? 0) !== 1 ? "n" : ""}`,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          html: baseTemplate("Wöchentlicher Überblick", `
            <h2 style="color:#1A5276;margin-top:0;">Ihre Woche bei xcare 📊</h2>
            <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter.name}</strong>,</p>
            <p style="color:#333;line-height:1.6;">Hier ist Ihr Überblick der letzten 7 Tage:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
              <tr>
                <td style="background:#EBF5FB;border-radius:8px;padding:16px;text-align:center;width:48%;">
                  <p style="margin:0;font-size:32px;font-weight:700;color:#1A5276;">${neueAnfragen ?? 0}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#555;">Neue Anfragen</p>
                </td>
                <td style="width:4%;"></td>
                <td style="background:${(offeneAnfragen ?? 0) > 0 ? "#FEF9E7" : "#D5F5E3"};border-radius:8px;padding:16px;text-align:center;width:48%;">
                  <p style="margin:0;font-size:32px;font-weight:700;color:${(offeneAnfragen ?? 0) > 0 ? "#7D6608" : "#1E8449"};">${offeneAnfragen ?? 0}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#555;">Offen</p>
                </td>
              </tr>
            </table>
            ${(offeneAnfragen ?? 0) > 0
              ? `<div style="background:#FEF9E7;border-left:4px solid #F1C40F;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
                   <p style="margin:0;color:#7D6608;font-size:13px;">Sie haben ${offeneAnfragen} offene Anfrage${(offeneAnfragen ?? 0) > 1 ? "n" : ""}, die auf eine Antwort warten.</p>
                 </div>`
              : `<p style="color:#1E8449;font-size:13px;">✅ Alle Anfragen sind bearbeitet – gut gemacht!</p>`
            }
            ${btn("Zum Dashboard", `${appUrl}/anbieter`)}
            <p style="color:#999;font-size:12px;margin-top:24px;">Sie erhalten diesen Digest jeden Montag. <a href="${appUrl}/anbieter/einstellungen" style="color:#1A5276;">Einstellungen anpassen</a> · <a href="${unsubUrl}" style="color:#999;">Abmelden</a></p>
          `),
        });
        sent++;
      });
    }

    return { sent };
  }
);

// ─── 10. Tägliche Wiedervorlagen-Erinnerung (07:00 UTC) ────────────────────────
const dailyWiedervorlagenCheck = inngest.createFunction(
  { id: "daily-wiedervorlagen-check", concurrency: { limit: 5 } },
  { cron: "0 7 * * *" }, // Every day at 07:00 UTC
  async ({ step }) => {
    const supabase = getServiceClient();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch all due, unresolved Wiedervorlagen with anbieter + anfrage info
    const dueItems = await step.run("fetch-due-wiedervorlagen", async () => {
      const { data } = await supabase
        .from("wiedervorlagen")
        .select(`
          id,
          faellig_am,
          notiz,
          anfrage_id,
          anbieter_id,
          anbieter!inner(id, name, profile_id),
          anfragen!inner(lebenslage)
        `)
        .lte("faellig_am", today)
        .eq("erledigt", false);
      return data ?? [];
    });

    if (dueItems.length === 0) return { sent: 0 };

    // Group by anbieter
    const byAnbieter = dueItems.reduce<Record<string, typeof dueItems>>((acc, item) => {
      const aid = item.anbieter_id as string;
      acc[aid] = acc[aid] ?? [];
      acc[aid].push(item);
      return acc;
    }, {});

    let sent = 0;

    for (const [anbieterId, items] of Object.entries(byAnbieter)) {
      await step.run(`wiedervorlage-notify-${anbieterId}`, async () => {
        const anbieter = (items[0].anbieter as { id: string; name: string; profile_id: string });

        const { data: profile } = await supabase
          .from("profiles")
          .select("email, email_prefs")
          .eq("id", anbieter.profile_id)
          .single();

        const email = profile?.email;
        if (!email) return;

        // Respect email_prefs: skip if anbieter opted out of wiedervorlage reminders
        const wvPrefs = (profile?.email_prefs ?? {}) as Record<string, boolean>;
        if (wvPrefs.wiedervorlage === false) return;

        const rows = items
          .map((item) => {
            const anfrage = item.anfragen as { lebenslage: string };
            const lebenslage = (anfrage?.lebenslage ?? "").replace(/_/g, " ");
            const isOverdue = (item.faellig_am as string) < today;
            const dateStr = new Date(item.faellig_am as string).toLocaleDateString("de-DE", {
              day: "2-digit", month: "2-digit", year: "numeric",
            });
            return `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${dateStr}${isOverdue ? " <span style='color:#E74C3C;font-size:11px;'>überfällig</span>" : ""}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-transform:capitalize;">${lebenslage}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#777;">${item.notiz ?? "—"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;"><a href="${appUrl}/anbieter/anfragen/${item.anfrage_id}" style="color:#1A5276;font-size:12px;text-decoration:underline;">Anfrage öffnen</a></td>
            </tr>`;
          })
          .join("");

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `🔔 ${items.length} Wiedervorlage${items.length !== 1 ? "n" : ""} fällig – xcare`,
          html: baseTemplate("Wiedervorlagen fällig", `
            <h2 style="color:#1A5276;margin-top:0;">Ihre Wiedervorlagen für heute 🔔</h2>
            <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter.name}</strong>,</p>
            <p style="color:#333;line-height:1.6;">Heute sind <strong>${items.length} Wiedervorlage${items.length !== 1 ? "n" : ""}</strong> fällig:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#555;font-weight:600;">Datum</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#555;font-weight:600;">Lebenslage</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#555;font-weight:600;">Notiz</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#555;font-weight:600;">Link</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            ${btn("Alle Anfragen anzeigen", `${appUrl}/anbieter/anfragen`)}
            <p style="color:#999;font-size:12px;margin-top:24px;">Wiedervorlagen setzen Sie direkt in der Anfragen-Detailseite.</p>
          `),
        });
        sent++;
      });
    }

    return { sent };
  }
);

// ─── Export (Inngest serve handler) ────────────────────────────────────────────
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmail,
    notifyAnbieterNeueAnfrage,
    notifyFamilieStatusUpdate,
    remind48hAnbieter,
    requestBewertungNachAbschluss,
    notifyNeueNachricht,
    remind48hFamilieAngebot,
    remind7dAnbieterOffen,
    weeklyDigestAnbieter,
    dailyWiedervorlagenCheck,
  ],
});
