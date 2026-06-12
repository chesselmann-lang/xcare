import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * POST /api/kv-connect
 *
 * Stub implementation of KV-Connect (Kassenärztliche Vereinigung) communication.
 *
 * KV-Connect is the secure messaging standard used in Germany for electronic
 * communication between healthcare providers and the Kassenärztliche Vereinigungen (KV).
 * It uses TLS-encrypted SOAP-based communication over dedicated VPN connections.
 *
 * THIS IS A STUB / SIMULATION:
 * Real KV-Connect integration requires:
 *  1. A valid KV-Connect Zugangsberechtigung (access authorisation)
 *  2. An approved connector (Telematikinfrastruktur-Konnektor)
 *  3. SMC-B (Security Module Card for institutions)
 *  4. Accreditation as a KV-Connect participant (KVDT Teilnahme)
 *
 * Supported message types (stub):
 *  - ARZT_ANFRAGE: Request for patient data from treating physician
 *  - PFLEGEBERICHT: Submit care report to KV
 *  - ENTLASSBRIEF: Discharge summary / hand-over
 *  - PFLEGEGRAD_MELDUNG: Report care grade change to KV
 */

const RequestBodySchema = z.object({
  messageType: z.enum([
    "ARZT_ANFRAGE",
    "PFLEGEBERICHT",
    "ENTLASSBRIEF",
    "PFLEGEGRAD_MELDUNG",
    "TERMIN_ANFRAGE",
  ]),
  familieProfileId: z.string().uuid().optional(),
  inhalt: z.string().min(1).max(10000).optional(),
  empfaengerKVNr: z.string().optional(),
  prioritaet: z.enum(["NORMAL", "DRINGEND", "NOTFALL"]).optional().default("NORMAL"),
  anhaenge: z
    .array(
      z.object({
        typ: z.string(),
        bezeichnung: z.string(),
      })
    )
    .optional(),
});

type MessageType = z.infer<typeof RequestBodySchema>["messageType"];

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  ARZT_ANFRAGE:        "Arzt-Anfrage",
  PFLEGEBERICHT:       "Pflegebericht",
  ENTLASSBRIEF:        "Entlassbrief",
  PFLEGEGRAD_MELDUNG:  "Pflegegrad-Meldung",
  TERMIN_ANFRAGE:      "Terminanfrage",
};

// Stub response templates per message type
const STUB_RESPONSES: Record<MessageType, (params: { prioritaet: string; kvNr?: string }) => object> = {
  ARZT_ANFRAGE: ({ prioritaet, kvNr }) => ({
    status: "ANGENOMMEN",
    nachrichtenId: `KV-${Date.now()}-ANFRG`,
    bearbeitungszeit: prioritaet === "NOTFALL" ? "Sofort" : prioritaet === "DRINGEND" ? "2 Stunden" : "24 Stunden",
    empfaenger: kvNr ?? "KV Bayern — Stub",
    bestaetigungstext:
      "Ihre Arzt-Anfrage wurde simuliert angenommen. In einer echten KV-Connect-Umgebung würde diese Anfrage über den zertifizierten Konnektor übermittelt.",
    protokollnummer: `PROT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
  }),
  PFLEGEBERICHT: ({ prioritaet }) => ({
    status: "UEBERMITTELT",
    nachrichtenId: `KV-${Date.now()}-PFLEG`,
    bearbeitungszeit: "Automatische Verarbeitung",
    bestaetigungstext:
      "Pflegebericht simuliert übermittelt. Gemäß § 291a SGB V würde dieser Bericht in der Telematikinfrastruktur gespeichert.",
    referenzId: `REF-${Date.now()}`,
  }),
  ENTLASSBRIEF: ({ prioritaet }) => ({
    status: "ZUGESTELLT",
    nachrichtenId: `KV-${Date.now()}-ENTL`,
    bearbeitungszeit: prioritaet === "DRINGEND" ? "Sofort" : "4 Stunden",
    bestaetigungstext:
      "Entlassbrief simuliert zugestellt. Im Produktivbetrieb erfolgt die Übertragung nach HL7 CDA R2 Standard.",
    signierstatus: "QUALIFIZIERTE_SIGNATUR_ERFORDERLICH",
  }),
  PFLEGEGRAD_MELDUNG: () => ({
    status: "BEARBEITUNG",
    nachrichtenId: `KV-${Date.now()}-PGMD`,
    bearbeitungszeit: "5 Werktage",
    bestaetigungstext:
      "Pflegegrad-Meldung simuliert eingereicht. Gemäß SGB XI §18 wäre eine Begutachtung durch den MDK erforderlich.",
    naechsterSchritt: "MDK-Begutachtung wird veranlasst",
    vorgangsnummer: `VG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
  }),
  TERMIN_ANFRAGE: ({ kvNr }) => ({
    status: "ANGEFRAGT",
    nachrichtenId: `KV-${Date.now()}-TERM`,
    bearbeitungszeit: "48 Stunden",
    empfaenger: kvNr ?? "KV-Termin-Service — Stub",
    bestaetigungstext:
      "Terminanfrage simuliert übermittelt. Über KV-Connect würde eine gesicherte Terminkommunikation nach KVDT-Standard erfolgen.",
    vorgeschlageneTermine: [
      { datum: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], uhrzeit: "10:00" },
      { datum: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], uhrzeit: "14:30" },
    ],
  }),
};

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
      .select("id, name")
      .eq("profile_id", profile.id)
      .single();
    if (!anbieter)
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = RequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validierungsfehler", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messageType, familieProfileId, inhalt, empfaengerKVNr, prioritaet, anhaenge } =
      parsed.data;

    logger.info("KV-Connect stub request", {
      messageType,
      anbieter_id: anbieter.id,
      familie_profile_id: familieProfileId,
      prioritaet,
    });

    // Simulate network latency for realism (100–400ms)
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));

    const stubResponse = STUB_RESPONSES[messageType]({
      prioritaet: prioritaet ?? "NORMAL",
      kvNr: empfaengerKVNr,
    });

    return NextResponse.json({
      erfolg: true,
      istSimulation: true,
      simulationsHinweis:
        "ACHTUNG: Dies ist eine Simulation. Für produktiven Betrieb ist eine offizielle KV-Connect-Zertifizierung erforderlich. " +
        "Wenden Sie sich an Ihre Kassenärztliche Vereinigung (KV) für eine Teilnahmeberechtigung.",
      nachrichtenTyp: messageType,
      nachrichtenTypLabel: MESSAGE_TYPE_LABELS[messageType],
      anbieter: anbieter.name,
      zeitstempel: new Date().toISOString(),
      anhaenge: anhaenge ?? [],
      antwort: stubResponse,
      standards: {
        kommunikation: "KV-Connect (SOAP/TLS)",
        datenformat: "KVDT / HL7 CDA R2 / FHIR R4",
        sicherheit: "SMC-B + QES (Qualifizierte Elektronische Signatur)",
        rechtsgrundlage: "§ 291a SGB V — Telematikinfrastruktur",
      },
    });
  } catch (err) {
    logger.error("KV-Connect stub error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Interner Fehler bei der KV-Connect-Kommunikation" },
      { status: 500 }
    );
  }
}

// GET — capability discovery endpoint
export async function GET() {
  return NextResponse.json({
    dienst: "KV-Connect Stub",
    version: "1.0.0-stub",
    istSimulation: true,
    unterstuetztMessageTypes: [
      { type: "ARZT_ANFRAGE",       beschreibung: "Anfrage bei behandelndem Arzt" },
      { type: "PFLEGEBERICHT",      beschreibung: "Pflegebericht an KV übermitteln" },
      { type: "ENTLASSBRIEF",       beschreibung: "Entlassbrief / Übergabe-Dokumentation" },
      { type: "PFLEGEGRAD_MELDUNG", beschreibung: "Pflegegrad-Änderung melden" },
      { type: "TERMIN_ANFRAGE",     beschreibung: "Terminanfrage über KV-Terminservice" },
    ],
    produktivbetriebAnforderungen: [
      "KV-Connect Zugangsberechtigung",
      "TI-Konnektor (zertifiziert nach gematik-Spezifikation)",
      "SMC-B Karte (Institutionskarte)",
      "eHBA (falls Arzt-Signatur benötigt)",
      "KVDT-Teilnahmevereinbarung",
    ],
    kontakt: "https://www.kbv.de/html/kv-connect.php",
  });
}
