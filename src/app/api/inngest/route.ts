import { serve } from "inngest/next";
import { Inngest } from "inngest";

// Inngest Client
export const inngest = new Inngest({ id: "xcare" });

// Beispiel-Funktion: Willkommens-E-Mail nach Registrierung
const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/registered" },
  async ({ event }) => {
    const { email, vorname, rolle } = event.data;
    // E-Mail via Resend senden
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
      to: email,
      subject: "Willkommen bei xcare!",
      html: `<h1>Hallo ${vorname}!</h1>
<p>Schön, dass du dabei bist. Du bist als <strong>${rolle === "anbieter" ? "Anbieter" : "Familie"}</strong> registriert.</p>
<p>Starte jetzt mit dem <a href="${process.env.NEXT_PUBLIC_APP_URL}/lotse">Lebenslage-Lotsen</a>.</p>`,
    });
  }
);

// Funktion: Anfrage-Benachrichtigung an Anbieter
const notifyAnbieter = inngest.createFunction(
  { id: "notify-anbieter-new-anfrage" },
  { event: "anfrage/created" },
  async ({ event }) => {
    const { anbieter_email, anbieter_name, familie_name, lebenslage } = event.data;
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@xcare.de",
      to: anbieter_email,
      subject: `Neue Anfrage über xcare`,
      html: `<h2>Neue Anfrage</h2>
<p><strong>${familie_name}</strong> hat eine Anfrage für Lebenslage <em>${lebenslage}</em> gestellt.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/anbieter/anfragen">Jetzt ansehen</a></p>`,
    });
  }
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWelcomeEmail, notifyAnbieter],
});
