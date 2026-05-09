import { serve } from "inngest/next";
import { Inngest } from "inngest";
import { Resend } from "resend";

export const inngest = new Inngest({ id: "xcare" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare-git-main-mindry.vercel.app";
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de";

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

// 1. Willkommens-Email
const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/registered" },
  async ({ event }) => {
    const { email, vorname, rolle } = event.data as { email: string; vorname: string; rolle: string };
    const resend = new Resend(process.env.RESEND_API_KEY!);
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
        }`
      ),
    });
  }
);

// 2. Neue Anfrage → Anbieter
const notifyAnbieterNeueAnfrage = inngest.createFunction(
  { id: "notify-anbieter-new-anfrage" },
  { event: "anfrage/created" },
  async ({ event }) => {
    const { anbieter_email, anbieter_name, familie_name, lebenslage, anfrage_id } = event.data as {
      anbieter_email: string; anbieter_name: string; familie_name: string;
      lebenslage: string; anfrage_id?: string;
    };
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: fromEmail,
      to: anbieter_email,
      subject: `Neue Anfrage über xcare — ${familie_name}`,
      html: baseTemplate("Neue Anfrage", `
        <h2 style="color:#1A5276;margin-top:0;">Neue Anfrage eingegangen 📬</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;"><strong>${familie_name}</strong> hat eine Anfrage für <strong>${lebenslage.replace(/_/g, " ")}</strong> gestellt.</p>
        ${btn("Anfrage ansehen", anfrage_id ? `${appUrl}/anbieter/anfragen/${anfrage_id}` : `${appUrl}/anbieter/anfragen`)}
      `),
    });
  }
);

// 3. Status-Update → Familie
const notifyFamilieStatusUpdate = inngest.createFunction(
  { id: "notify-familie-status-update" },
  { event: "anfrage/status-changed" },
  async ({ event }) => {
    const { familie_email, familie_name, anbieter_name, new_status, lebenslage } = event.data as {
      familie_email: string; familie_name: string; anbieter_name: string;
      new_status: string; lebenslage: string;
    };
    const msgs: Record<string, { subject: string; body: string }> = {
      in_bearbeitung: {
        subject: `${anbieter_name} bearbeitet Ihre Anfrage`,
        body: `<p style="color:#333;line-height:1.6;"><strong>${anbieter_name}</strong> hat Ihre Anfrage angenommen und bearbeitet sie jetzt aktiv.</p>`,
      },
      angeboten: {
        subject: `Angebot von ${anbieter_name} erhalten!`,
        body: `<p style="color:#333;line-height:1.6;">Gute Neuigkeiten! <strong>${anbieter_name}</strong> hat Ihnen ein Angebot für <strong>${lebenslage.replace(/_/g, " ")}</strong> gemacht.</p>`,
      },
      bestaetigt: {
        subject: `Anfrage bei ${anbieter_name} bestätigt ✓`,
        body: `<p style="color:#333;line-height:1.6;">Ihre Anfrage bei <strong>${anbieter_name}</strong> wurde bestätigt.</p>`,
      },
      abgelehnt: {
        subject: `Anfrage bei ${anbieter_name} nicht möglich`,
        body: `<p style="color:#333;line-height:1.6;">Leider kann <strong>${anbieter_name}</strong> Ihre Anfrage derzeit nicht bearbeiten.</p>${btn("Weitere Anbieter suchen", `${appUrl}/suche`)}`,
      },
    };
    const msg = msgs[new_status];
    if (!msg) return;
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: fromEmail,
      to: familie_email,
      subject: msg.subject,
      html: baseTemplate(msg.subject, `
        <h2 style="color:#1A5276;margin-top:0;">Update zu Ihrer Anfrage</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${familie_name}</strong>,</p>
        ${msg.body}
        ${btn("Meine Anfragen", `${appUrl}/familie/anfragen`)}
      `),
    });
  }
);

// 4. 48h-Erinnerung → Anbieter (wenn Anfrage noch offen ist)
const remind48hAnbieter = inngest.createFunction(
  { id: "remind-anbieter-48h" },
  { event: "anfrage/created" },
  async ({ event, step }) => {
    // Wait 48 hours
    await step.sleep("wait-48h", "48h");

    const { anfrage_id, anbieter_email, anbieter_name, familie_name, lebenslage } = event.data as {
      anfrage_id: string; anbieter_email: string; anbieter_name: string;
      familie_name: string; lebenslage: string;
    };

    // Check if still open via fetch (server-side Supabase not available in Inngest worker)
    // We'll send the reminder regardless and let the anbieter dismiss it if handled
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: fromEmail,
      to: anbieter_email,
      subject: `Erinnerung: Offene Anfrage von ${familie_name}`,
      html: baseTemplate("Erinnerung", `
        <h2 style="color:#1A5276;margin-top:0;">Offene Anfrage — Erinnerung ⏰</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${anbieter_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Die Anfrage von <strong>${familie_name}</strong> zu <strong>${lebenslage.replace(/_/g, " ")}</strong> wartet noch auf Ihre Rückmeldung.</p>
        <p style="color:#555;font-size:13px;">Familien erhalten eine bessere Erfahrung, wenn Anfragen schnell bearbeitet werden.</p>
        ${btn("Anfrage bearbeiten", anfrage_id ? `${appUrl}/anbieter/anfragen/${anfrage_id}` : `${appUrl}/anbieter/anfragen`)}
      `),
    });
  }
);

// 5. Post-Abschluss Bewertungsanfrage → Familie
const requestBewertungNachAbschluss = inngest.createFunction(
  { id: "request-bewertung-nach-abschluss" },
  { event: "anfrage/status-changed" },
  async ({ event, step }) => {
    const { new_status, familie_email, familie_name, anbieter_name, anfrage_id } = event.data as {
      new_status: string; familie_email: string; familie_name: string;
      anbieter_name: string; anfrage_id?: string;
    };

    // Only trigger for "abgeschlossen"
    if (new_status !== "abgeschlossen") return;

    // Wait 24 hours before asking for rating
    await step.sleep("wait-24h-rating", "24h");

    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: fromEmail,
      to: familie_email,
      subject: `Wie war Ihre Erfahrung mit ${anbieter_name}?`,
      html: baseTemplate("Bewertung abgeben", `
        <h2 style="color:#1A5276;margin-top:0;">Helfen Sie anderen Familien ⭐</h2>
        <p style="color:#333;line-height:1.6;">Hallo <strong>${familie_name}</strong>,</p>
        <p style="color:#333;line-height:1.6;">Ihre Anfrage bei <strong>${anbieter_name}</strong> wurde abgeschlossen. Möchten Sie Ihre Erfahrung teilen?</p>
        <p style="color:#555;font-size:13px;">Eine Bewertung hilft anderen Familien, den richtigen Anbieter zu finden.</p>
        ${btn("Jetzt bewerten", anfrage_id ? `${appUrl}/familie/anfragen/${anfrage_id}` : `${appUrl}/familie/anfragen`)}
        <p style="color:#999;font-size:12px;margin-top:16px;">Wenn Sie bereits bewertet haben, können Sie diese E-Mail ignorieren.</p>
      `),
    });
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendWelcomeEmail,
    notifyAnbieterNeueAnfrage,
    notifyFamilieStatusUpdate,
    remind48hAnbieter,
    requestBewertungNachAbschluss,
  ],
});
