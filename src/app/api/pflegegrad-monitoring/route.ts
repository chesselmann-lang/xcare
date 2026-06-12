import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const maxDuration = 60;

const RequestSchema = z.object({
  familieProfileId: z.string().uuid(),
  aktuellerPflegegrad: z.number().min(1).max(5).optional(),
  letzteEinschaetzungDatum: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!anbieter)
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { familieProfileId, aktuellerPflegegrad, letzteEinschaetzungDatum } = parsed.data;

    // Fetch last 90 days of pflegedokumentation
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const vonDate = ninetyDaysAgo.toISOString().split("T")[0];

    const [{ data: dokus }, { data: tagebuch }, { data: einschaetzungen }] = await Promise.all([
      supabase
        .from("pflegedokumentation")
        .select(
          "kategorie, titel, inhalt, ereignis_datum, puls, temperatur, blutdruck_sys, blutdruck_dia, sauerstoff, blutzucker, gewicht"
        )
        .eq("anbieter_id", anbieter.id)
        .eq("familie_profile_id", familieProfileId)
        .gte("ereignis_datum", vonDate)
        .order("ereignis_datum", { ascending: false })
        .limit(60),
      supabase
        .from("pflegetagebuch")
        .select("eintrag_datum, stimmung, schmerzen, schlaf_stunden, aktivitaeten, notizen")
        .eq("profil_id", familieProfileId)
        .gte("eintrag_datum", vonDate)
        .order("eintrag_datum", { ascending: false })
        .limit(30),
      supabase
        .from("pflegegrad_einschaetzungen")
        .select(
          "einschaetzung_datum, aktueller_pflegegrad, pflegegrad_empfehlung, gesamtpunkte, notizen"
        )
        .eq("familie_profile_id", familieProfileId)
        .order("einschaetzung_datum", { ascending: false })
        .limit(5),
    ]);

    // Build context string
    const dokuSummary = (dokus ?? [])
      .slice(0, 30)
      .map((d) => {
        const vitals = [
          d.puls ? `Puls: ${d.puls}` : null,
          d.temperatur ? `Temp: ${d.temperatur}°C` : null,
          d.blutdruck_sys ? `RR: ${d.blutdruck_sys}/${d.blutdruck_dia}` : null,
          d.sauerstoff ? `SpO2: ${d.sauerstoff}%` : null,
          d.blutzucker ? `BZ: ${d.blutzucker}` : null,
          d.gewicht ? `KG: ${d.gewicht}kg` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return `[${d.ereignis_datum}] ${d.kategorie}: ${d.titel ?? ""}${d.inhalt ? " – " + d.inhalt.slice(0, 80) : ""}${vitals ? " | " + vitals : ""}`;
      })
      .join("\n");

    const tagebuchSummary = (tagebuch ?? [])
      .slice(0, 20)
      .map(
        (t) =>
          `[${t.eintrag_datum}] Stimmung: ${t.stimmung ?? "?"}/${5}, Schmerz: ${t.schmerzen ?? "?"}/${10}${t.schlaf_stunden ? `, Schlaf: ${t.schlaf_stunden}h` : ""}${t.notizen ? " – " + t.notizen.slice(0, 60) : ""}`
      )
      .join("\n");

    const einschaetzungSummary = (einschaetzungen ?? [])
      .map(
        (e) =>
          `[${e.einschaetzung_datum}] PG ${e.aktueller_pflegegrad ?? "?"} (Empfehlung: PG ${e.pflegegrad_empfehlung ?? "?"}, Punkte: ${e.gesamtpunkte ?? "?"})`
      )
      .join("\n");

    const systemPrompt = `Du bist ein erfahrener Pflegeexperte mit tiefem Wissen über das Neue Begutachtungsinstrument (NBI),
die Pflegegradermittlung nach § 15 SGB XI und die sechs Begutachtungsmodule:
M1 Mobilität, M2 Kognitive/kommunikative Fähigkeiten, M3 Verhaltensweisen/psychische Problemlagen,
M4 Selbstversorgung, M5 Umgang mit krankheitsbedingten Anforderungen, M6 Gestaltung des Alltagslebens.

Analysiere die vorliegenden Pflegedokumentationen und bewerte, ob eine Höherstufung des Pflegegrades
angemessen sein könnte. Gib eine strukturierte, fachlich fundierte Empfehlung auf Deutsch.

Wichtig: Du gibst nur eine Einschätzung, keine Diagnose. Endgültige Entscheidungen trifft der MDK/MD.`;

    const userPrompt = `## Aktuelle Situation
Aktueller Pflegegrad: PG ${aktuellerPflegegrad ?? "unbekannt"}
Letzte Begutachtung: ${letzteEinschaetzungDatum ?? "unbekannt"}

## Bisherige Einschätzungen (NBI)
${einschaetzungSummary || "Keine vorhanden"}

## Pflegedokumentation (letzte 90 Tage, ${(dokus ?? []).length} Einträge)
${dokuSummary || "Keine Einträge"}

## Pflegetagebuch (${(tagebuch ?? []).length} Einträge)
${tagebuchSummary || "Keine Einträge"}

Bitte analysiere:
1. **Verschlechterungstrends**: Gibt es Hinweise auf eine Verschlechterung des Pflegebedarfs?
2. **Modulrelevante Auffälligkeiten**: Welche der 6 NBI-Module zeigen erhöhten Bedarf?
3. **Höherstufungsempfehlung**: Ist eine Überprüfung des Pflegegrades empfehlenswert?
4. **Konkrete Handlungsempfehlungen**: Was sollte die Pflegekraft dokumentieren/beobachten?
5. **Zeitempfehlung**: Wann sollte die nächste Einschätzung erfolgen?

Strukturiere deine Antwort mit klaren Überschriften.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const analyse =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      analyse,
      datenBasis: {
        dokuEintraege: (dokus ?? []).length,
        tagebuchEintraege: (tagebuch ?? []).length,
        letzteEinschaetzungen: (einschaetzungen ?? []).length,
        analysierterZeitraum: vonDate,
      },
    });
  } catch (err) {
    logger.error("pflegegrad-monitoring POST error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
