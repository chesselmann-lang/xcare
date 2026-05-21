import { serve } from "inngest/next";
import { Resend } from "resend";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createUnsubscribeToken, buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { logger } from "@/lib/logger";
import { sendAndLog } from "@/lib/email-log";
import { inngest } from "@/lib/inngest";

export { inngest }; // re-export for legacy imports

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
    await sendAndLog(resend, {
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
    await sendAndLog(resend, {
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
    await sendAndLog(resend, {
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
  { id: "remind-anbieter-48h", concurrency: { limit: 5 } },
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
    await sendAndLog(resend, {
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
    await sendAndLog(resend, {
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
    await sendAndLog(resend, {
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
  { id: "remind-familie-48h-angebot", concurrency: { limit: 5 } },
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

    await sendAndLog(resend, {
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
  { id: "remind-anbieter-7d-offen", concurrency: { limit: 5 } },
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
    await sendAndLog(resend, {
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
  { id: "weekly-digest-anbieter", concurrency: { limit: 5 } },
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
        await sendAndLog(resend, {
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
        await sendAndLog(resend, {
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

// ─── 11. Täglicher Ablaufdaten-Check (08:00 UTC) ─────────────────────────────
//
// Prüft ablaufende Dokumente, Impfungen und Medikamente.
// Erstellt Benachrichtigungen und sendet eine Zusammenfassungs-E-Mail je Nutzer.

const ablaufdatenCheck = inngest.createFunction(
  { id: "ablaufdaten-check", name: "Täglicher Ablaufdaten-Check" },
  { cron: "0 8 * * *" }, // täglich 08:00 UTC (09:00 Berlin Winter / 10:00 Sommer)
  async ({ step }) => {
    const supabase = getServiceClient();

    const heute = new Date();
    const in7Tagen = new Date(heute.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const in14Tagen = new Date(heute.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const in30Tagen = new Date(heute.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const in60Tagen = new Date(heute.getTime() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const heuteStr = heute.toISOString().split("T")[0];

    // ── Ablaufende Dokumente laden (30 und 60 Tage) ──────────────────────────
    const ablaufendeDokumente = await step.run("fetch-ablaufende-dokumente", async () => {
      const { data } = await supabase
        .from("dokumente")
        .select("id, name, ablaufdatum, profil_id")
        .not("ablaufdatum", "is", null)
        .gte("ablaufdatum", heuteStr)
        .lte("ablaufdatum", in60Tagen);
      return data ?? [];
    });

    // ── Fällige Impfungen laden (30 und 60 Tage) ─────────────────────────────
    const faelligeImpfungen = await step.run("fetch-fällige-impfungen", async () => {
      const { data } = await supabase
        .from("impfungen")
        .select("id, impfstoff, krankheit, naechste_impfung, profil_id")
        .not("naechste_impfung", "is", null)
        .gte("naechste_impfung", heuteStr)
        .lte("naechste_impfung", in60Tagen);
      return data ?? [];
    });

    // ── Auslaufende Medikamente laden (7 und 14 Tage) ────────────────────────
    const auslaufendeMedikamente = await step.run("fetch-auslaufende-medikamente", async () => {
      const { data } = await supabase
        .from("medikamente")
        .select("id, name, bis_datum, profil_id")
        .not("bis_datum", "is", null)
        .gte("bis_datum", heuteStr)
        .lte("bis_datum", in14Tagen)
        .eq("aktiv", true);
      return data ?? [];
    });

    // ── Alle betroffenen profil_ids zusammenstellen ───────────────────────────
    type FristItem = {
      profil_id: string;
      typ: "dokument" | "impfung" | "medikament";
      name: string;
      datum: string;
      tage: number;
    };

    const alleItems: FristItem[] = [];

    for (const dok of ablaufendeDokumente) {
      const ablauf = new Date(dok.ablaufdatum as string);
      const tage = Math.ceil((ablauf.getTime() - heute.getTime()) / (24 * 60 * 60 * 1000));
      if (tage <= 30 || tage <= 60) {
        alleItems.push({
          profil_id: dok.profil_id as string,
          typ: "dokument",
          name: dok.name as string,
          datum: dok.ablaufdatum as string,
          tage,
        });
      }
    }

    for (const impf of faelligeImpfungen) {
      const naechste = new Date(impf.naechste_impfung as string);
      const tage = Math.ceil((naechste.getTime() - heute.getTime()) / (24 * 60 * 60 * 1000));
      alleItems.push({
        profil_id: impf.profil_id as string,
        typ: "impfung",
        name: `${impf.impfstoff} (${impf.krankheit})`,
        datum: impf.naechste_impfung as string,
        tage,
      });
    }

    for (const med of auslaufendeMedikamente) {
      const bis = new Date(med.bis_datum as string);
      const tage = Math.ceil((bis.getTime() - heute.getTime()) / (24 * 60 * 60 * 1000));
      alleItems.push({
        profil_id: med.profil_id as string,
        typ: "medikament",
        name: med.name as string,
        datum: med.bis_datum as string,
        tage,
      });
    }

    if (alleItems.length === 0) return { gesendet: 0, benachrichtigungen: 0 };

    // ── Nach Nutzer gruppieren ────────────────────────────────────────────────
    const nachNutzer = alleItems.reduce<Record<string, FristItem[]>>((acc, item) => {
      acc[item.profil_id] = acc[item.profil_id] ?? [];
      acc[item.profil_id].push(item);
      return acc;
    }, {});

    let gesendetCount = 0;
    let benachrichtigungenCount = 0;

    for (const [profilId, items] of Object.entries(nachNutzer)) {
      await step.run(`ablauf-notify-${profilId}`, async () => {
        // Profil + E-Mail laden
        const { data: profil } = await supabase
          .from("profiles")
          .select("email, vorname, email_prefs")
          .eq("id", profilId)
          .single();

        if (!profil?.email) return;

        const prefs = (profil.email_prefs ?? {}) as Record<string, boolean>;

        // ── Benachrichtigungen in der App erstellen ───────────────────────────
        const typLabels: Record<string, string> = {
          dokument: "Dokument",
          impfung: "Impfung",
          medikament: "Medikament",
        };
        const typIcons: Record<string, string> = {
          dokument: "📄",
          impfung: "💉",
          medikament: "💊",
        };

        for (const item of items) {
          const { error: insertError } = await supabase.from("benachrichtigungen").insert({
            profile_id: profilId,
            typ: "system",
            titel: `${typIcons[item.typ]} ${typLabels[item.typ]} läuft bald ab`,
            nachricht: `„${item.name}" läuft in ${item.tage} ${item.tage === 1 ? "Tag" : "Tagen"} ab (${new Date(item.datum).toLocaleDateString("de-DE")}).`,
            gelesen: false,
          });
          if (!insertError) benachrichtigungenCount++;
        }

        // ── E-Mail senden (wenn nicht abgemeldet) ─────────────────────────────
        if (prefs.ablaufdaten === false) return;

        const vorname = profil.vorname ?? "Nutzer";
        const listItems = items
          .sort((a, b) => a.tage - b.tage)
          .map((item) => {
            const datumStr = new Date(item.datum).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            });
            return `<li style="padding:6px 0;border-bottom:1px solid #f0f0f0;">${typIcons[item.typ]} <strong>${item.name}</strong> — ${typLabels[item.typ]} — fällig am ${datumStr} (in ${item.tage} ${item.tage === 1 ? "Tag" : "Tagen"})</li>`;
          })
          .join("");

        const resend = new Resend(process.env.RESEND_API_KEY);
        await sendAndLog(resend, {
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
          to: profil.email,
          subject: `xcare Erinnerung: ${items.length} ${items.length === 1 ? "Frist" : "Fristen"} laufen bald ab`,
          html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Fristen-Erinnerung</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;">
<tr><td style="background:#1A5276;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p><p style="margin:4px 0 0;color:#a8c7e8;font-size:13px;">Ihr digitales Pflege-Ökosystem</p></td></tr>
<tr><td style="padding:32px;">
<h2 style="color:#1A5276;margin-top:0;">Wichtige Fristen-Erinnerung ⏰</h2>
<p style="color:#333;line-height:1.6;">Hallo <strong>${vorname}</strong>,</p>
<p style="color:#333;line-height:1.6;">Folgende Fristen laufen in den nächsten Tagen ab:</p>
<ul style="list-style:none;padding:0;margin:16px 0;">${listItems}</ul>
<p style="color:#555;font-size:13px;">Bitte nehmen Sie rechtzeitig Maßnahmen, um keine wichtigen Termine zu verpassen.</p>
<a href="${appUrl}/familie/gesundheit" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">Zur Gesundheitsübersicht</a>
<p style="color:#999;font-size:12px;margin-top:24px;"><a href="${appUrl}/familie/einstellungen" style="color:#999;">E-Mail-Einstellungen anpassen</a></p>
</td></tr>
<tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH · <a href="${appUrl}" style="color:#1A5276;">xcare.de</a></p></td></tr>
</table></td></tr></table>
</body></html>`,
        });
        gesendetCount++;
      });
    }

    return { gesendet: gesendetCount, benachrichtigungen: benachrichtigungenCount };
  }
);

// ─── 12. Wöchentliche Impf-Erinnerung (montags 09:00 UTC) ────────────────────
//
// Prüft alle Impfungen mit naechste_impfung in den nächsten 30 Tagen
// und sendet eine Zusammenfassungs-E-Mail.

const impfungenErinnerung = inngest.createFunction(
  { id: "impfungen-erinnerung", name: "Wöchentliche Impf-Erinnerung" },
  { cron: "0 9 * * 1" }, // montags 09:00 UTC
  async ({ step }) => {
    const supabase = getServiceClient();

    const heute = new Date();
    const heuteStr = heute.toISOString().split("T")[0];
    const in30Tagen = new Date(heute.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Alle fälligen Impfungen der nächsten 30 Tage laden
    const faelligeImpfungen = await step.run("fetch-impfungen-30d", async () => {
      const { data } = await supabase
        .from("impfungen")
        .select("id, impfstoff, krankheit, naechste_impfung, profil_id")
        .not("naechste_impfung", "is", null)
        .gte("naechste_impfung", heuteStr)
        .lte("naechste_impfung", in30Tagen);
      return data ?? [];
    });

    if (faelligeImpfungen.length === 0) return { gesendet: 0 };

    // Nach Nutzer gruppieren
    const nachNutzer = faelligeImpfungen.reduce<
      Record<string, typeof faelligeImpfungen>
    >((acc, impf) => {
      const pid = impf.profil_id as string;
      acc[pid] = acc[pid] ?? [];
      acc[pid].push(impf);
      return acc;
    }, {});

    let gesendetCount = 0;

    for (const [profilId, impfungen] of Object.entries(nachNutzer)) {
      await step.run(`impfung-erinnerung-${profilId}`, async () => {
        const { data: profil } = await supabase
          .from("profiles")
          .select("email, vorname, email_prefs")
          .eq("id", profilId)
          .single();

        if (!profil?.email) return;

        const prefs = (profil.email_prefs ?? {}) as Record<string, boolean>;
        if (prefs.ablaufdaten === false) return;

        // App-Benachrichtigung erstellen
        const impfungsTitel =
          impfungen.length === 1
            ? `Impfung ${impfungen[0].impfstoff} fällig`
            : `${impfungen.length} Impfungen in den nächsten 30 Tagen fällig`;

        await supabase.from("benachrichtigungen").insert({
          profile_id: profilId,
          typ: "system",
          titel: `💉 ${impfungsTitel}`,
          nachricht: impfungen
            .map((i) => {
              const tage = Math.ceil(
                (new Date(i.naechste_impfung as string).getTime() - heute.getTime()) /
                  (24 * 60 * 60 * 1000)
              );
              return `${i.impfstoff} (${i.krankheit}) in ${tage} Tagen`;
            })
            .join(", "),
          gelesen: false,
        });

        // E-Mail senden
        const vorname = profil.vorname ?? "Nutzer";
        const listItems = impfungen
          .sort(
            (a, b) =>
              new Date(a.naechste_impfung as string).getTime() -
              new Date(b.naechste_impfung as string).getTime()
          )
          .map((impf) => {
            const naechste = new Date(impf.naechste_impfung as string);
            const tage = Math.ceil(
              (naechste.getTime() - heute.getTime()) / (24 * 60 * 60 * 1000)
            );
            const datumStr = naechste.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            });
            const dringend = tage <= 7;
            return `<li style="padding:8px 0;border-bottom:1px solid #f0f0f0;">💉 <strong>${impf.impfstoff}</strong> gegen <em>${impf.krankheit}</em> — fällig am ${datumStr}${dringend ? ' <span style="color:#E74C3C;font-size:12px;font-weight:bold;">(in ' + tage + ' Tagen!)</span>' : " (in " + tage + " Tagen)"}</li>`;
          })
          .join("");

        const resend = new Resend(process.env.RESEND_API_KEY);
        await sendAndLog(resend, {
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
          to: profil.email,
          subject: `💉 Impf-Erinnerung: ${impfungen.length} ${impfungen.length === 1 ? "Impfung" : "Impfungen"} in den nächsten 30 Tagen`,
          html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><title>Impf-Erinnerung</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;">
<tr><td style="background:#1A5276;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p><p style="margin:4px 0 0;color:#a8c7e8;font-size:13px;">Ihr digitales Pflege-Ökosystem</p></td></tr>
<tr><td style="padding:32px;">
<h2 style="color:#1A5276;margin-top:0;">Ihre Impf-Erinnerungen 💉</h2>
<p style="color:#333;line-height:1.6;">Hallo <strong>${vorname}</strong>,</p>
<p style="color:#333;line-height:1.6;">Folgende Impfungen stehen in den nächsten 30 Tagen an:</p>
<ul style="list-style:none;padding:0;margin:16px 0;">${listItems}</ul>
<p style="color:#555;font-size:13px;">Vereinbaren Sie rechtzeitig einen Termin bei Ihrem Arzt.</p>
<a href="${appUrl}/familie/gesundheit" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">Zum Impfpass</a>
<p style="color:#999;font-size:12px;margin-top:24px;"><a href="${appUrl}/familie/einstellungen" style="color:#999;">E-Mail-Einstellungen anpassen</a></p>
</td></tr>
<tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH · <a href="${appUrl}" style="color:#1A5276;">xcare.de</a></p></td></tr>
</table></td></tr></table>
</body></html>`,
        });
        gesendetCount++;
      });
    }

    return { gesendet: gesendetCount, impfungen: faelligeImpfungen.length };
  }
);

// ─── 13. Stripe Abo-Upgrade-Bestätigung ──────────────────────────────────────
// Ausgelöst durch: stripe/webhook → checkout.session.completed
const notifyAboUpgrade = inngest.createFunction(
  { id: "notify-abo-upgrade", name: "Abo-Upgrade Bestätigung" },
  { event: "billing/plan.upgraded" },
  async ({ event, step }) => {
    const { anbieter_id, plan, email, vorname } = event.data as {
      anbieter_id: string;
      plan: string;
      email: string;
      vorname?: string;
    };

    await step.run("send-upgrade-email", async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
      const planLabel = plan === "professional" ? "Professional" : plan === "starter" ? "Starter" : plan;

      await sendAndLog(resend, {
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
        to: email,
        subject: `Ihr xcare ${planLabel}-Plan ist jetzt aktiv ✅`,
        html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;"><tr><td style="background:#1A5276;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#1A5276;margin-top:0;">Willkommen im ${planLabel}-Plan! 🎉</h2><p style="color:#333;line-height:1.6;">Hallo ${vorname ?? ""},</p><p style="color:#333;line-height:1.6;">Ihr Upgrade auf den <strong>${planLabel}-Plan</strong> war erfolgreich. Alle neuen Funktionen sind sofort verfügbar.</p><a href="${appUrl}/anbieter/abo" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">Mein Abo ansehen</a><p style="color:#999;font-size:12px;margin-top:24px;">Rechnungen und Zahlungsmethode verwalten Sie jederzeit im <a href="${appUrl}/anbieter/abo" style="color:#1A5276;">Abo-Portal</a>.</p></td></tr><tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH</p></td></tr></table></td></tr></table></body></html>`,
      });
    });

    logger.info("billing/plan.upgraded email sent", { anbieter_id, plan });
    return { sent: true };
  }
);

// ─── 14. Stripe Zahlung fehlgeschlagen ───────────────────────────────────────
// Ausgelöst durch: stripe/webhook → invoice.payment_failed
const notifyZahlungFehlgeschlagen = inngest.createFunction(
  { id: "notify-zahlung-fehlgeschlagen", name: "Zahlung fehlgeschlagen" },
  { event: "billing/payment.failed" },
  async ({ event, step }) => {
    const { anbieter_id, email, vorname, attempt_count } = event.data as {
      anbieter_id: string;
      email: string;
      vorname?: string;
      attempt_count: number;
    };

    await step.run("send-payment-failed-email", async () => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

      await sendAndLog(resend, {
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
        to: email,
        subject: `xcare: Zahlung fehlgeschlagen (Versuch ${attempt_count}) ⚠️`,
        html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;"><tr><td style="background:#c0392b;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#c0392b;margin-top:0;">Zahlung fehlgeschlagen ⚠️</h2><p style="color:#333;line-height:1.6;">Hallo ${vorname ?? ""},</p><p style="color:#333;line-height:1.6;">Leider konnte Ihre Abo-Zahlung nicht verarbeitet werden (Versuch ${attempt_count} von 3). Bitte aktualisieren Sie Ihre Zahlungsmethode, um eine Unterbrechung zu vermeiden.</p><a href="${appUrl}/anbieter/abo" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">Zahlungsmethode aktualisieren</a><p style="color:#666;font-size:13px;line-height:1.6;">Nach 3 fehlgeschlagenen Versuchen wird Ihr Konto auf den Free-Plan zurückgesetzt.</p></td></tr><tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH</p></td></tr></table></td></tr></table></body></html>`,
      });
    });

    logger.info("billing/payment.failed email sent", { anbieter_id, attempt_count });
    return { sent: true };
  }
);

// ─── 15. Abo-Verlängerungs-Erinnerung (7 Tage vor Ablauf, täglich 08:00) ─────
const remindAboVerlaengerung = inngest.createFunction(
  { id: "remind-abo-verlaengerung", name: "Abo-Verlängerungs-Erinnerung" },
  { cron: "0 8 * * *" },
  async ({ step }) => {
    const supabase = getServiceClient();

    const in7Tagen = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const heute = new Date().toISOString().split("T")[0];

    const faelligeAnbieter = await step.run("fetch-expiring-subscriptions", async () => {
      const { data } = await supabase
        .from("anbieter")
        .select(`
          id, name, plan, plan_expires_at,
          profiles!anbieter_profile_id_fkey (email, vorname)
        `)
        .not("plan", "eq", "free")
        .gte("plan_expires_at", heute)
        .lte("plan_expires_at", in7Tagen + "T23:59:59Z");
      return data ?? [];
    });

    if (faelligeAnbieter.length === 0) return { reminders: 0 };

    let count = 0;
    for (const anbieter of faelligeAnbieter) {
      await step.run(`remind-${anbieter.id}`, async () => {
        const profil = Array.isArray(anbieter.profiles) ? anbieter.profiles[0] : anbieter.profiles;
        if (!profil?.email) return;

        const ablaufDatum = new Date(anbieter.plan_expires_at as string).toLocaleDateString("de-DE", {
          day: "2-digit", month: "long", year: "numeric",
        });
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
        const planLabel = anbieter.plan === "professional" ? "Professional" : "Starter";

        await sendAndLog(resend, {
          from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
          to: profil.email,
          subject: `xcare: Ihr ${planLabel}-Abo verlängert sich am ${ablaufDatum}`,
          html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;max-width:600px;"><tr><td style="background:#1A5276;padding:24px 32px;"><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">❤️ xcare</p></td></tr><tr><td style="padding:32px;"><h2 style="color:#1A5276;margin-top:0;">Ihr Abo verlängert sich bald 🔄</h2><p style="color:#333;line-height:1.6;">Hallo ${profil.vorname ?? ""},</p><p style="color:#333;line-height:1.6;">Ihr <strong>${planLabel}-Plan</strong> wird am <strong>${ablaufDatum}</strong> automatisch verlängert. Falls Sie kündigen möchten, tun Sie dies bitte vorher im Abo-Portal.</p><a href="${appUrl}/anbieter/abo" style="display:inline-block;background:#1A5276;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:20px 0;">Abo verwalten</a></td></tr><tr><td style="background:#f8f9fa;padding:16px 32px;border-top:1px solid #e9ecef;"><p style="margin:0;color:#6c757d;font-size:12px;text-align:center;">© ${new Date().getFullYear()} xcare gemeinnützige GmbH</p></td></tr></table></td></tr></table></body></html>`,
        });
        count++;
      });
    }

    logger.info("remind-abo-verlaengerung cron done", { reminders: count });
    return { reminders: count };
  }
);

// ─── 17. S332: Automatische Angebots-Erinnerung (täglich 09:00 UTC) ──────────
//
// Findet offene Anfragen ohne Angebot die älter als 3 Tage sind und erinnert
// den zugewiesenen Anbieter per E-Mail.

const angebotsErinnerung = inngest.createFunction(
  { id: "angebots-erinnerung", name: "Angebots-Erinnerung — offene Anfragen ohne Angebot" },
  { cron: "0 9 * * *" }, // täglich 09:00 UTC
  async ({ step }) => {
    const supabase = getServiceClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Find open Anfragen older than 3 days that still have no Angebot
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const offene = await step.run("fetch-offene-anfragen", async () => {
      const { data } = await supabase
        .from("anfragen")
        .select(`
          id, lebenslage, created_at,
          anbieter:anbieter_id (
            id,
            name,
            profiles ( user_id, email_prefs )
          )
        `)
        .eq("status", "offen")
        .is("angeboten_at", null)
        .lt("created_at", cutoff);
      return data ?? [];
    });

    let sent = 0;

    for (const anfrage of offene) {
      await step.run(`erinnerung-${anfrage.id}`, async () => {
        // Type-safe access
        const anbieter = (anfrage as unknown as {
          anbieter: {
            id: string;
            name: string;
            profiles: { user_id: string; email_prefs: Record<string