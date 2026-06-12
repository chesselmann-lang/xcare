import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * GET /api/fhir?familieProfileId=...&von=YYYY-MM-DD&bis=YYYY-MM-DD
 *
 * Exports pflegedokumentation entries as a FHIR R4 Bundle (application/fhir+json).
 * Resources included:
 *  - Bundle (type: document)
 *  - Patient (from profiles row)
 *  - Observations (Vitalzeichen: Puls, Temperatur, Blutdruck, SpO2, BZ, Gewicht)
 *  - Conditions (Pflegedokumentation-Kategorien as Condition resources)
 *  - MedicationAdministration (Medikament-Einträge)
 *
 * Spec reference: https://hl7.org/fhir/R4/
 * Note: This is a best-effort FHIR R4 export for interoperability demonstration.
 * Production implementations should validate against official FHIR profiles.
 */

const QuerySchema = z.object({
  familieProfileId: z.string().uuid(),
  von: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  bis: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  format: z.enum(["json", "bundle"]).optional().default("bundle"),
});

// LOINC / SNOMED codes for common vitals
const LOINC_CODES: Record<string, { code: string; display: string; unit: string; system: string }> = {
  puls:        { code: "8867-4",  display: "Herzfrequenz",       unit: "/min",    system: "http://loinc.org" },
  temperatur:  { code: "8310-5",  display: "Körpertemperatur",   unit: "Cel",     system: "http://loinc.org" },
  blutdruck:   { code: "55284-4", display: "Blutdruck",          unit: "mm[Hg]",  system: "http://loinc.org" },
  sauerstoff:  { code: "2708-6",  display: "Sauerstoffsättigung",unit: "%",       system: "http://loinc.org" },
  blutzucker:  { code: "14743-9", display: "Blutzucker",         unit: "mg/dL",   system: "http://loinc.org" },
  gewicht:     { code: "29463-7", display: "Körpergewicht",      unit: "kg",      system: "http://loinc.org" },
};

const KATEGORIE_CODES: Record<string, string> = {
  allgemein:          "General assessment",
  medikamente:        "Medication administration",
  vitalzeichen:       "Vital signs",
  koerperpflege:      "Personal hygiene care",
  ernaehrung:         "Nutritional assessment",
  mobilitaet:         "Mobility",
  wundversorgung:     "Wound care",
  ausscheidung:       "Elimination",
  schlaf:             "Sleep",
  kognition:          "Cognitive assessment",
  psychisch:          "Psychological assessment",
  sozial:             "Social interaction",
  rehabilitation:     "Rehabilitation",
  sonstiges:          "Other",
};

function uuid() {
  return crypto.randomUUID();
}

function fhirReference(resourceType: string, id: string) {
  return { reference: `${resourceType}/${id}` };
}

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const params = QuerySchema.safeParse({
      familieProfileId: url.searchParams.get("familieProfileId") ?? undefined,
      von: url.searchParams.get("von") ?? undefined,
      bis: url.searchParams.get("bis") ?? undefined,
      format: url.searchParams.get("format") ?? undefined,
    });

    if (!params.success) {
      return NextResponse.json(
        { error: "Ungültige Parameter", details: params.error.flatten() },
        { status: 400 }
      );
    }

    const { familieProfileId, von, bis } = params.data;

    // Fetch patient profile
    const { data: familieProfile } = await supabase
      .from("profiles")
      .select("id, vorname, nachname, email, geburtsdatum")
      .eq("id", familieProfileId)
      .single();

    // Fetch dokumentation entries
    let dokuQuery = supabase
      .from("pflegedokumentation")
      .select(
        "id, kategorie, titel, inhalt, ereignis_datum, puls, temperatur, blutdruck_sys, blutdruck_dia, sauerstoff, blutzucker, gewicht, medikament_name, medikament_dosis, medikament_gegeben"
      )
      .eq("anbieter_id", anbieter.id)
      .eq("familie_profile_id", familieProfileId)
      .order("ereignis_datum", { ascending: true })
      .limit(500);

    if (von) dokuQuery = dokuQuery.gte("ereignis_datum", von);
    if (bis) dokuQuery = dokuQuery.lte("ereignis_datum", bis);

    const { data: dokus } = await dokuQuery;

    // ── Build FHIR R4 Bundle ─────────────────────────────────────────────────

    const bundleId = uuid();
    const patientId = `patient-${familieProfileId.slice(0, 8)}`;
    const organizationId = `org-${anbieter.id.slice(0, 8)}`;

    const entries: object[] = [];

    // Patient resource
    const patientName = [
      familieProfile?.vorname ? { use: "given", value: familieProfile.vorname } : null,
      familieProfile?.nachname ? { use: "family", value: familieProfile.nachname } : null,
    ].filter(Boolean);

    const patientResource = {
      resourceType: "Patient",
      id: patientId,
      meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
      identifier: [
        {
          system: "urn:xcare:patient-id",
          value: familieProfileId,
        },
      ],
      name: [{ use: "official", given: [familieProfile?.vorname], family: familieProfile?.nachname }],
      ...(familieProfile?.geburtsdatum
        ? { birthDate: familieProfile.geburtsdatum as string }
        : {}),
    };

    entries.push({
      fullUrl: `urn:uuid:${patientId}`,
      resource: patientResource,
      request: { method: "PUT", url: `Patient/${patientId}` },
    });

    // Organization resource (Anbieter)
    entries.push({
      fullUrl: `urn:uuid:${organizationId}`,
      resource: {
        resourceType: "Organization",
        id: organizationId,
        name: anbieter.name ?? "xcare Pflegedienst",
        identifier: [{ system: "urn:xcare:anbieter-id", value: anbieter.id }],
      },
      request: { method: "PUT", url: `Organization/${organizationId}` },
    });

    // Process each documentation entry
    for (const doku of dokus ?? []) {
      const effectiveDateTime = `${doku.ereignis_datum}T00:00:00Z`;

      // Observation resources for vitals
      const vitalEntries: Array<{ field: string; value: number | null; extra?: { sys: number | null; dia: number | null } }> = [
        { field: "puls",       value: doku.puls },
        { field: "temperatur", value: doku.temperatur },
        { field: "blutdruck",  value: null, extra: { sys: doku.blutdruck_sys, dia: doku.blutdruck_dia } },
        { field: "sauerstoff", value: doku.sauerstoff },
        { field: "blutzucker", value: doku.blutzucker },
        { field: "gewicht",    value: doku.gewicht },
      ];

      for (const { field, value, extra } of vitalEntries) {
        if (field === "blutdruck" && extra && (extra.sys || extra.dia)) {
          const loinc = LOINC_CODES.blutdruck;
          const obsId = uuid();
          entries.push({
            fullUrl: `urn:uuid:${obsId}`,
            resource: {
              resourceType: "Observation",
              id: obsId,
              status: "final",
              category: [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/observation-category",
                      code: "vital-signs",
                      display: "Vital Signs",
                    },
                  ],
                },
              ],
              code: {
                coding: [{ system: loinc.system, code: loinc.code, display: loinc.display }],
                text: loinc.display,
              },
              subject: fhirReference("Patient", patientId),
              effectiveDateTime,
              component: [
                {
                  code: {
                    coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }],
                  },
                  valueQuantity: { value: extra.sys, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
                },
                {
                  code: {
                    coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }],
                  },
                  valueQuantity: { value: extra.dia, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" },
                },
              ],
            },
            request: { method: "POST", url: "Observation" },
          });
        } else if (value != null) {
          const loinc = LOINC_CODES[field];
          if (!loinc) continue;
          const obsId = uuid();
          entries.push({
            fullUrl: `urn:uuid:${obsId}`,
            resource: {
              resourceType: "Observation",
              id: obsId,
              status: "final",
              category: [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/observation-category",
                      code: "vital-signs",
                      display: "Vital Signs",
                    },
                  ],
                },
              ],
              code: {
                coding: [{ system: loinc.system, code: loinc.code, display: loinc.display }],
                text: loinc.display,
              },
              subject: fhirReference("Patient", patientId),
              effectiveDateTime,
              valueQuantity: {
                value,
                unit: loinc.unit,
                system: "http://unitsofmeasure.org",
                code: loinc.unit,
              },
            },
            request: { method: "POST", url: "Observation" },
          });
        }
      }

      // MedicationAdministration for medication entries
      if (doku.medikament_name) {
        const medId = uuid();
        entries.push({
          fullUrl: `urn:uuid:${medId}`,
          resource: {
            resourceType: "MedicationAdministration",
            id: medId,
            status: doku.medikament_gegeben ? "completed" : "not-done",
            medicationCodeableConcept: {
              text: `${doku.medikament_name}${doku.medikament_dosis ? ` ${doku.medikament_dosis}` : ""}`,
            },
            subject: fhirReference("Patient", patientId),
            effectiveDateTime,
            dosage: doku.medikament_dosis
              ? { text: doku.medikament_dosis }
              : undefined,
            note: doku.inhalt ? [{ text: doku.inhalt }] : undefined,
          },
          request: { method: "POST", url: "MedicationAdministration" },
        });
      }

      // Condition / ClinicalImpression for general documentation
      if (doku.inhalt && doku.kategorie !== "medikamente") {
        const condId = uuid();
        const katLabel = KATEGORIE_CODES[doku.kategorie] ?? doku.kategorie;
        entries.push({
          fullUrl: `urn:uuid:${condId}`,
          resource: {
            resourceType: "ClinicalImpression",
            id: condId,
            status: "completed",
            description: doku.titel ? `${doku.titel}: ${doku.inhalt}` : doku.inhalt,
            subject: fhirReference("Patient", patientId),
            effectiveDateTime,
            code: { text: katLabel },
            note: [{ text: doku.inhalt }],
          },
          request: { method: "POST", url: "ClinicalImpression" },
        });
      }
    }

    // Build the Bundle
    const bundle = {
      resourceType: "Bundle",
      id: bundleId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"],
      },
      type: "transaction",
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/fhir+json; charset=utf-8",
        "Content-Disposition": `attachment; filename="xcare-fhir-export-${familieProfileId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json"`,
        "X-FHIR-Version": "4.0.1",
      },
    });
  } catch (err) {
    logger.error("FHIR export error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler beim FHIR-Export" }, { status: 500 });
  }
}
