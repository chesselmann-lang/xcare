import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GeraetTyp =
  | "blutdruckmessgeraet"
  | "blutzuckermessgeraet"
  | "waage"
  | "pulsoximeter"
  | "ekg"
  | "schlaftracker"
  | "aktivitaetstracker";

interface TelemonitoringInsert {
  user_id: string;
  geraet_typ: GeraetTyp;
  wert: number | null;
  einheit: string | null;
  gemessen_am: string;
  fhir_code?: string;
  roh_daten?: Record<string, unknown>;
  quelle: "csv_import" | "fhir";
}

function parseCSV(text: string, userId: string): TelemonitoringInsert[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const datumIdx = header.indexOf("datum");
  const wertIdx = header.indexOf("wert");
  const einheitIdx = header.indexOf("einheit");
  const geraetTypIdx = header.indexOf("geraet_typ");

  const rows: TelemonitoringInsert[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < 2) continue;

    const datum = datumIdx >= 0 ? cols[datumIdx] : "";
    const wertRaw = wertIdx >= 0 ? cols[wertIdx] : "";
    const einheit = einheitIdx >= 0 ? cols[einheitIdx] : null;
    const geraetTypRaw = geraetTypIdx >= 0 ? cols[geraetTypIdx] : "waage";

    if (!datum) continue;

    const validGeraetTypen: GeraetTyp[] = [
      "blutdruckmessgeraet",
      "blutzuckermessgeraet",
      "waage",
      "pulsoximeter",
      "ekg",
      "schlaftracker",
      "aktivitaetstracker",
    ];

    const geraet_typ: GeraetTyp = validGeraetTypen.includes(geraetTypRaw as GeraetTyp)
      ? (geraetTypRaw as GeraetTyp)
      : "waage";

    rows.push({
      user_id: userId,
      geraet_typ,
      wert: wertRaw ? parseFloat(wertRaw) : null,
      einheit: einheit || null,
      gemessen_am: new Date(datum).toISOString(),
      quelle: "csv_import",
      roh_daten: { original_row: cols },
    });
  }

  return rows;
}

interface FHIRObservation {
  resourceType: string;
  code?: { coding?: { code?: string }[] };
  valueQuantity?: { value?: number; unit?: string };
  effectiveDateTime?: string;
}

interface FHIRBundle {
  resourceType: string;
  entry?: { resource?: FHIRObservation }[];
}

function parseFHIRBundle(bundle: FHIRBundle, userId: string): TelemonitoringInsert[] {
  const rows: TelemonitoringInsert[] = [];

  if (bundle.resourceType !== "Bundle" || !Array.isArray(bundle.entry)) return rows;

  for (const entry of bundle.entry) {
    const resource = entry?.resource;
    if (!resource || resource.resourceType !== "Observation") continue;

    const fhir_code = resource.code?.coding?.[0]?.code ?? undefined;
    const wert = resource.valueQuantity?.value ?? null;
    const einheit = resource.valueQuantity?.unit ?? null;
    const gemessen_am = resource.effectiveDateTime
      ? new Date(resource.effectiveDateTime).toISOString()
      : new Date().toISOString();

    // Map FHIR LOINC codes to device types
    let geraet_typ: GeraetTyp = "waage";
    if (fhir_code === "55284-4" || fhir_code === "8480-6") geraet_typ = "blutdruckmessgeraet";
    else if (fhir_code === "2339-0" || fhir_code === "14743-9") geraet_typ = "blutzuckermessgeraet";
    else if (fhir_code === "29463-7") geraet_typ = "waage";
    else if (fhir_code === "59408-5") geraet_typ = "pulsoximeter";
    else if (fhir_code === "11524-6") geraet_typ = "ekg";

    rows.push({
      user_id: userId,
      geraet_typ,
      wert: wert !== undefined ? wert : null,
      einheit,
      gemessen_am,
      fhir_code,
      quelle: "fhir",
      roh_daten: resource as unknown as Record<string, unknown>,
    });
  }

  return rows;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let rows: TelemonitoringInsert[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    }

    const text = await file.text();

    if (file.name.endsWith(".json") || file.type === "application/json") {
      try {
        const bundle = JSON.parse(text) as FHIRBundle;
        rows = parseFHIRBundle(bundle, user.id);
      } catch {
        return NextResponse.json({ error: "Ungültiges FHIR JSON" }, { status: 400 });
      }
    } else {
      // Treat as CSV
      rows = parseCSV(text, user.id);
    }
  } else if (contentType.includes("application/json")) {
    const body = await request.json() as FHIRBundle;
    rows = parseFHIRBundle(body, user.id);
  } else {
    return NextResponse.json({ error: "Unbekannter Content-Type" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ imported: 0, message: "Keine Datensätze gefunden" });
  }

  const { error } = await supabase.from("telemonitoring_daten").insert(rows);

  if (error) {
    console.error("Telemonitoring import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: rows.length });
}
