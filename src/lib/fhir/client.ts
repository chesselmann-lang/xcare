/**
 * FHIR R4 Client für ePA-Integration
 * Spec: HL7 FHIR R4 (https://hl7.org/fhir/R4/)
 * German ePA: gematik ePA 3.0 spec
 *
 * In production: connects to Gematik Telematikinfrastruktur (TI)
 * For dev/testing: connects to a HAPI FHIR test server
 */

const FHIR_BASE_URL =
  process.env.FHIR_SERVER_URL || "https://hapi.fhir.org/baseR4";
const FHIR_TOKEN = process.env.FHIR_ACCESS_TOKEN;

// ─── Resource Types ────────────────────────────────────────────────────────────

export interface FHIRPatient {
  id: string;
  resourceType: "Patient";
  name: Array<{ family: string; given: string[] }>;
  birthDate: string;
  gender: "male" | "female" | "other" | "unknown";
  identifier: Array<{ system: string; value: string }>;
}

export interface FHIRMedication {
  id: string;
  resourceType: "MedicationRequest";
  status: string;
  medicationCodeableConcept: {
    text: string;
    coding: Array<{ system: string; code: string; display: string }>;
  };
  dosageInstruction: Array<{ text: string; timing?: unknown }>;
  authoredOn: string;
}

export interface FHIRCondition {
  id: string;
  resourceType: "Condition";
  clinicalStatus: { coding: Array<{ code: string }> };
  code: {
    text: string;
    coding: Array<{ system: string; code: string; display: string }>;
  };
  onsetDateTime?: string;
  recordedDate: string;
}

export interface FHIRObservation {
  id: string;
  resourceType: "Observation";
  status: string;
  code: {
    text: string;
    coding: Array<{ system: string; code: string; display: string }>;
  };
  valueQuantity?: { value: number; unit: string };
  valueString?: string;
  effectiveDateTime: string;
}

interface FHIRBundle<T> {
  resourceType: "Bundle";
  total: number;
  entry?: Array<{ resource: T }>;
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

async function fhirFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/fhir+json",
    "Content-Type": "application/fhir+json",
  };
  if (FHIR_TOKEN) headers["Authorization"] = `Bearer ${FHIR_TOKEN}`;

  const res = await fetch(`${FHIR_BASE_URL}/${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FHIR ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export async function getPatient(patientId: string): Promise<FHIRPatient> {
  return fhirFetch<FHIRPatient>(`Patient/${patientId}`);
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function getMedications(
  patientId: string
): Promise<FHIRMedication[]> {
  const bundle = await fhirFetch<FHIRBundle<FHIRMedication>>(
    `MedicationRequest?patient=${patientId}&status=active&_count=50`
  );
  return bundle.entry?.map((e) => e.resource) || [];
}

// ─── Conditions ───────────────────────────────────────────────────────────────

export async function getConditions(
  patientId: string
): Promise<FHIRCondition[]> {
  const bundle = await fhirFetch<FHIRBundle<FHIRCondition>>(
    `Condition?patient=${patientId}&clinical-status=active&_count=50`
  );
  return bundle.entry?.map((e) => e.resource) || [];
}

// ─── Observations ─────────────────────────────────────────────────────────────

export async function getObservations(
  patientId: string,
  code?: string
): Promise<FHIRObservation[]> {
  const params = new URLSearchParams({
    patient: patientId,
    _count: "50",
    _sort: "-date",
  });
  if (code) params.set("code", code);
  const bundle = await fhirFetch<FHIRBundle<FHIRObservation>>(
    `Observation?${params}`
  );
  return bundle.entry?.map((e) => e.resource) || [];
}

// ─── German-specific: KVNR Lookup ────────────────────────────────────────────
// KVNR = Krankenversichertennummer (German health insurance number)
// System: http://fhir.de/sid/gkv/kvid-10 (GKV — gesetzliche Krankenversicherung)

export async function findPatientByKVNR(
  kvnr: string
): Promise<FHIRPatient | null> {
  const bundle = await fhirFetch<FHIRBundle<FHIRPatient>>(
    `Patient?identifier=http://fhir.de/sid/gkv/kvid-10|${kvnr}`
  );
  return bundle.entry?.[0]?.resource || null;
}
