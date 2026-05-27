import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { type, to_email, to_phone, data } = await req.json();

  const results: Record<string, unknown> = {};

  // ── Email via Resend ──────────────────────────────────────────────────────
  if (to_email && Deno.env.get("RESEND_API_KEY")) {
    const templates: Record<string, { subject: string; html: string }> = {
      buchung_bestaetigt: {
        subject: `✅ Buchung bestätigt — ${data?.datum || ""}`,
        html: `<h2>Ihre Buchung ist bestätigt!</h2><p>Datum: ${data?.datum}</p><p>Anbieter: ${data?.anbieter_name}</p>`,
      },
      video_erinnerung: {
        subject: `📹 Video-Termin in 30 Minuten — ${data?.betreff || ""}`,
        html: `<h2>Ihr Video-Termin startet bald!</h2><p>Betreff: ${data?.betreff}</p><a href="${data?.url}">Jetzt beitreten</a>`,
      },
      antrag_status: {
        subject: `📋 Antragsstatus: ${data?.status || ""}`,
        html: `<h2>Ihr Antrag wurde aktualisiert</h2><p>Status: ${data?.status}</p>`,
      },
    };

    const template = templates[type] || {
      subject: `xcare: ${type}`,
      html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
    };

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "xcare <noreply@xcare.app>",
        to: [to_email],
        subject: template.subject,
        html: template.html,
      }),
    });
    results.email = await emailRes.json();
  }

  // ── SMS via Twilio ────────────────────────────────────────────────────────
  if (
    to_phone &&
    Deno.env.get("TWILIO_ACCOUNT_SID") &&
    Deno.env.get("TWILIO_AUTH_TOKEN") &&
    Deno.env.get("TWILIO_PHONE_NUMBER")
  ) {
    const smsMessages: Record<string, string> = {
      buchung_bestaetigt: `xcare: Ihre Buchung am ${data?.datum ?? ""} wurde bestätigt.`,
      video_erinnerung: `xcare: Ihr Video-Termin "${data?.betreff ?? ""}" startet in 30 Minuten. ${data?.url ?? ""}`,
      antrag_status: `xcare: Ihr Antrag wurde aktualisiert — Status: ${data?.status ?? ""}.`,
    };

    const body = smsMessages[type] ?? `xcare: ${type} — ${JSON.stringify(data)}`;

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const smsRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: Deno.env.get("TWILIO_PHONE_NUMBER")!,
          To: to_phone,
          Body: body,
        }).toString(),
      }
    );
    results.sms = await smsRes.json();
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
