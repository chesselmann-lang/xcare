// ============================================================
// API: POST /api/epa/sync
// Synchronisiert ePA-Daten via FHIR R4 → Supabase
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getMedications,
  getConditions,
  getObservations,
  type FHIRMedication,
  type FHIRCondition,
} from "@/lib/fhir/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_req: NextRequest) {
  const supabase = await createClient();

  // ─── Auth ───────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // ─── ePA-Verbindung laden ───────────────────────────────────────────────────
  const { data: verbindung, error: vErr } = await supabase
    .from("epa_verbindungen")
    .select("id, fhir_patient_id")
    .eq("user_id", user.id)
    .single();

  if (vErr || !verbindung) {
    return NextResponse.json(
      { error: "Keine ePA-Verbindung gefunden. Bitte zuerst verbinden." },
      { status: 404 }
    );
  }

  const patientId = verbindung.fhir_patient_id;

  // ─── FHIR-Daten abrufen ─────────────────────────────────────────────────────
  let medications: FHIRMedication[] = [];
  let conditions: FHIRCondition[] = [];
  let observationCount = 0;

  try {
    [medications, conditions] = await Promise.all([
      getMedications(patientId),
      getConditions(patientId),
    ]);

    const observations = await getObservations(patientId);
    observationCount = observations.length;
  } catch (err) {
    logger.error("FHIR sync error", { userId: user.id, error: String(err) });

    // Fehler in epa_verbindungen speichern
    await supabase
      .from("epa_verbindungen")
      .update({
        sync_status: "fehler",
        error_message: String(err),
      })
      .eq("user_id", user.id);

    return NextResponse.json(
      { error: "FHIR-Verbindung fehlgeschlagen", details: String(err) },
      { status: 502 }
    );
  }

  // ─── Medikamente upsert ─────────────────────────────────────────────────────
  let medSynced = 0;
  if (medications.length > 0) {
    const medRows = medications.map((med) => {
      const coding = med.medicationCodeableConcept.coding?.[0];
      return {
        user_id: user.id,
        fhir_id: med.id,
        name: med.medicationCodeableConcept.text || coding?.display || "Unbekannt",
        wirkstoff: coding?.display ?? null,
        dosierung: med.dosageInstruction?.[0]?.text ?? null,
        einnahme_anweisung: med.dosageInstruction?.[0]?.text ?? null,
        verordnet_am: med.authoredOn
          ? med.authoredOn.substring(0, 10)
          : null,
        aktiv: med.status === "active",
        imported_at: new Date().toISOString(),
      };
    });

    const { error: medErr, count } = await supabase
      .from("epa_medikamente")
      .upsert(medRows, { onConflict: "fhir_id", count: "exact" });

    if (medErr) {
      logger.error("ePA med upsert error", { error: medErr.message });
    } else {
      medSynced = count ?? medRows.length;
    }
  }

  // ─── Diagnosen upsert ───────────────────────────────────────────────────────
  let diagSynced = 0;
  if (conditions.length > 0) {
    const diagRows = conditions.map((cond) => {
      const icd10Coding = cond.code.coding?.find((c) =>
        c.system?.includes("icd")
      );
      return {
        user_id: user.id,
        fhir_id: cond.id,
        icd10_code: icd10Coding?.code ?? null,
        bezeichnung: cond.code.text || icd10Coding?.display || "Unbekannt",
        seit: cond.onsetDateTime
          ? cond.onsetDateTime.substring(0, 10)
          : null,
        status: cond.clinicalStatus?.coding?.[0]?.code ?? "aktiv",
        imported_at: new Date().toISOString(),
      };
    });

    const { error: diagErr, count } = await supabase
      .from("epa_diagnosen")
      .upsert(diagRows, { onConflict: "fhir_id", count: "exact" });

    if (diagErr) {
      logger.error("ePA diag upsert error", { error: diagErr.message });
    } else {
      diagSynced = count ?? diagRows.length;
    }
  }

  // ─── letzter_sync aktualisieren ─────────────────────────────────────────────
  await supabase
    .from("epa_verbindungen")
    .update({
      letzter_sync: new Date().toISOString(),
      sync_status: "aktiv",
      error_message: null,
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    success: true,
    synced: {
      medikamente: medSynced,
      diagnosen: diagSynced,
      vitalwerte: observationCount,
    },
    timestamp: new Date().toISOString(),
  });
}
