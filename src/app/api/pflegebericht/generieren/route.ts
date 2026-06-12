import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const maxDuration = 60;

const RequestSchema = z.object({
  familieProfileId: z.string().uuid(),
  von: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  berichtTyp: z.enum([
    "kurzbericht",
    "mdk_bericht",
    "entlassung",
    "uebergabe",
    "pflegeanamnese",
  ]),
  patientName: z.string().max(200).optional(),
  pflegegrad: z.number().min(1).max(5).optional(),
  zusatzInfos: z.string().max(2000).optional(),
});

const BERICHT_LABELS: Record<string, string> = {
  kurzbericht: "Pflegekurzbericht",
  mdk_bericht: "MDK-Pflegebericht (§ 115a SGB XI)",
  entlassung: "Entlassungsbericht",
  uebergabe: "Übergabebericht",
  pflegeanamnese: "Pflegeanamnese",
};

function buildSystemPrompt(berichtTyp: string): string {
  const base = `Du bist ein erfahrener Pflegefachmann/Pflegefachfrau mit fundiertem Wissen über
deutsche Pflegestandards, SGB XI, MDK-Prüfanforderungen und professionelle Pflegedokumentation.
Erstelle ausschließlich in professionellem Deutsch. Verwende Fachterminologie korrekt.
Halte dich strikt an die deutschen Pflegedokumentationsstandards.`;

  const typeSpecific: Record<string, string> = {
    kurzbericht: `${base}
Erstelle einen prägnanten Pflegekurzbericht (1-2 Seiten) mit:
- Zusammenfassung des Pflegezeitraums
- Wesentliche Beobachtungen zu Vitalzeichen, Allgemeinzustand
- Durchgeführte Pflegemaßnahmen
- Besondere Vorkommnisse
- Aktuelle Medikation (falls dokumentiert)
- Empfehlungen`,

    mdk_bericht: `${base}
Erstelle einen MDK-konformen Pflegebericht nach § 115a SGB XI mit folgender Struktur:
1. Stammdaten (anonymisiert/pseudonymisiert)
2. Pflegeanamnese und Ausgangslage
3. Pflegegrad und Begründung
4. Strukturierte Informationssammlung (SIS) nach den 6 Themenfeldern:
   - Kognition und Kommunikation
   - Mobilität und Beweglichkeit
   - Krankheitsbewältigigung
   - Selbstversorgung
   - Leben in sozialen Beziehungen
   - Wohnen/Häuslichkeit
5. Individuelle Maßnahmenpläne
6. Verlauf und Wirksamkeitsnachweise
7. Pflegeziele und Evaluation`,

    entlassung: `${base}
Erstelle einen Entlassungsbericht mit:
- Aufnahmebefund und Pflegebedarf bei Aufnahme
- Verlauf der Pflege und Maßnahmen
- Erreichung der Pflegeziele
- Aktueller Pflegezustand bei Entlassung
- Weiterführende Empfehlungen und Maßnahmen
- Übergaberelevante Informationen für Nachfolgeeinrichtung`,

    uebergabe: `${base}
Erstelle ein strukturiertes Übergabeprotokoll mit:
- SBAR-Format (Situation, Background, Assessment, Recommendation)
- Aktuelle Vitalzeichen und Allgemeinzustand
- Besonderheiten und offene Aufgaben
- Durchgeführte und ausstehende Maßnahmen
- Medikamentengaben und -ausstände
- Dringende Hinweise für die Folgeschicht`,

    pflegeanamnese: `${base}
Erstelle eine vollständige Pflegeanamnese mit:
- Biographische Informationen und Ressourcen
- Gesundheitszustand und Diagnosen
- Pflegebedarf nach den ATL (Aktivitäten des täglichen Lebens)
- Kognitive und kommunikative Fähigkeiten
- Soziales Umfeld und Unterstützungsnetzwerk
- Besondere Bedürfnisse und Vorlieben
- Pflegeziele und Maßnahmenplanung`,
  };

  return typeSpecific[berichtTyp] ?? base;
}

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
      return NextResponse.json(
        { error: "Anbieter nicht gefunden" },
        { status: 404 }
      );

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { familieProfileId, von, bis, berichtTyp, patientName, pflegegrad, zusatzInfos } =
      parsed.data;

    // Fetch pflegedokumentation entries for this client in date range
    const { data: dokus } = await supabase
      .from("pflegedokumentation")
      .select(
        "kategorie, titel, inhalt, ereignis_datum, puls, temperatur, blutdruck_sys, blutdruck_dia, sauerstoff, blutzucker, gewicht, medikament_name, medikament_dosis, medikament_gegeben"
      )
      .eq("anbieter_id", anbieter.id)
      .eq("familie_profile_id", familieProfileId)
      .gte("ereignis_datum", von)
      .lte("ereignis_datum", bis)
      .order("ereignis_datum", { ascending: true })
      .limit(100);

    // Fetch pflegetagebuch entries
    const { data: tagebuch } = await supabase
      .from("pflegetagebuch")
      .select("eintrag_datum, stimmung, schmerzen, schlaf_stunden, aktivitaeten, notizen")
      .eq("profil_id", familieProfileId)
      .gte("eintrag_datum", von)
      .lte("eintrag_datum", bis)
      .order("eintrag_datum", { ascending: true })
      .limit(50);

    if (!dokus?.length && !tagebuch?.length) {
      return NextResponse.json(
        { error: "Keine Dokumentationseinträge im gewählten Zeitraum gefunden." },
        { status: 422 }
      );
    }

    // Build documentation summary for AI
    const dokuText = (dokus ?? [])
      .map((d) => {
        const vitals = [
          d.puls ? `Puls: ${d.puls} bpm` : null,
          d.temperatur ? `Temp: ${d.temperatur}°C` : null,
          d.blutdruck_sys && d.blutdruck_dia
            ? `RR: ${d.blutdruck_sys}/${d.blutdruck_dia} mmHg`
            : null,
          d.sauerstoff ? `SpO2: ${d.sauerstoff}%` : null,
          d.blutzucker ? `BZ: ${d.blutzucker} mg/dL` : null,
          d.gewicht ? `Gewicht: ${d.gewicht} kg` : null,
        ]
          .filter(Boolean)
          .join(", ");

        const med =
          d.medikament_name
            ? `Medikament: ${d.medikament_name}${d.medikament_dosis ? ` ${d.medikament_dosis}` : ""} – ${d.medikament_gegeben ? "gegeben" : "nicht gegeben"}`
            : null;

        return [
          `[${d.ereignis_datum}] ${d.kategorie.toUpperCase()}${d.titel ? `: ${d.titel}` : ""}`,
          d.inhalt,
          vitals || null,
          med,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const tagebuchText = (tagebuch ?? [])
      .map((t) => {
        const stimmungLabel =
          t.stimmung != null
            ? `Stimmung: ${t.stimmung}/5`
            : null;
        return [
          `[${t.eintrag_datum}] PFLEGETAGEBUCH`,
          stimmungLabel,
          t.schmerzen != null ? `Schmerzen: ${t.schmerzen}/10` : null,
          t.schlaf_stunden != null ? `Schlaf: ${t.schlaf_stunden}h` : null,
          t.aktivitaeten ? `Aktivitäten: ${t.aktivitaeten}` : null,
          t.notizen ? `Notizen: ${t.notizen}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const patientInfo = [
      patientName ? `Patient/in: ${patientName}` : "Patient/in: [anonymisiert]",
      pflegegrad ? `Pflegegrad: ${pflegegrad}` : null,
      `Zeitraum: ${von} bis ${bis}`,
      zusatzInfos ? `Zusätzliche Informationen: ${zusatzInfos}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = `Erstelle einen ${BERICHT_LABELS[berichtTyp]} basierend auf folgenden Dokumentationseinträgen:

## Patienteninformationen
${patientInfo}

## Pflegedokumentation (${(dokus ?? []).length} Einträge)
${dokuText || "Keine Einträge vorhanden."}

${tagebuchText ? `## Pflegetagebuch (${(tagebuch ?? []).length} Einträge)\n${tagebuchText}` : ""}

Erstelle daraus einen vollständigen, professionellen ${BERICHT_LABELS[berichtTyp]}.
Verwende eine klare Struktur mit Überschriften. Schreibe in der dritten Person.
Achte auf datenschutzkonformes Schreiben (keine unnötigen Personendaten).`;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(berichtTyp),
      messages: [{ role: "user", content: userPrompt }],
    });

    const berichtText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      bericht: berichtText,
      berichtTyp,
      berichtTypLabel: BERICHT_LABELS[berichtTyp],
      zeitraum: { von, bis },
      eintraegeAnzahl: (dokus ?? []).length + (tagebuch ?? []).length,
    });
  } catch (err) {
    logger.error("pflegebericht generieren error", { err });
    return NextResponse.json(
      { error: "Interner Fehler beim Generieren des Berichts." },
      { status: 500 }
    );
  }
}
