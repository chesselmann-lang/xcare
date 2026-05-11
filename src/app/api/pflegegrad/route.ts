import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

// NBI Gewichte (§ 15 SGB XI)
const NBI_GEWICHTE = { m1: 0.10, m2: 0.15, m3: 0.10, m4: 0.40, m5: 0.20, m6: 0.15 };
const NBI_MAX     = { m1: 10,   m2: 10,   m3: 9,    m4: 18,   m5: 9,    m6: 9 };

// Pflegegrad-Schwellen (Gesamtpunktzahl nach Gewichtung 0-100)
function berechnePflegegrad(gesamtpunkte: number): number {
  if (gesamtpunkte < 12.5) return 1;
  if (gesamtpunkte < 27)   return 2;
  if (gesamtpunkte < 47.5) return 3;
  if (gesamtpunkte < 70)   return 4;
  return 5;
}

const ModulWerte = z.number().int().min(0).max(3).optional();

const Schema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  einschaetzung_datum: z.string().optional(),
  aktueller_pflegegrad: z.number().int().min(0).max(5).optional(),
  notizen: z.string().max(2000).optional(),
  // M1
  m1_bettpositionswechsel: ModulWerte,
  m1_halten_sitzposition: ModulWerte,
  m1_umsetzen: ModulWerte,
  m1_fortbewegung_innen: ModulWerte,
  m1_treppensteigen: ModulWerte,
  // M2
  m2_personen_erkennen: ModulWerte,
  m2_oertliche_orientierung: ModulWerte,
  m2_zeitliche_orientierung: ModulWerte,
  m2_alltagsgegenstaende: ModulWerte,
  m2_risiken_erkennen: ModulWerte,
  // M3
  m3_motorische_unruhe: ModulWerte,
  m3_naechtliche_unruhe: ModulWerte,
  m3_abwehrverhalten: ModulWerte,
  // M4
  m4_waschen_gesicht: ModulWerte,
  m4_koerperpflege: ModulWerte,
  m4_an_auskleiden: ModulWerte,
  m4_ernaehrung: ModulWerte,
  m4_trinken: ModulWerte,
  m4_toilettennutzung: ModulWerte,
  // M5
  m5_medikamente: ModulWerte,
  m5_arztbesuche: ModulWerte,
  m5_hilfsmittel: ModulWerte,
  // M6
  m6_tagesstruktur: ModulWerte,
  m6_freizeitgestaltung: ModulWerte,
  m6_kontakte: ModulWerte,
});

function sumModule(vals: (number | undefined | null)[]): number {
  return vals.reduce((s, v) => s + (v ?? 0), 0);
}

function berechneGesamtpunkte(d: z.infer<typeof Schema>): number {
  const m1 = sumModule([d.m1_bettpositionswechsel, d.m1_halten_sitzposition, d.m1_umsetzen, d.m1_fortbewegung_innen, d.m1_treppensteigen]);
  const m2 = sumModule([d.m2_personen_erkennen, d.m2_oertliche_orientierung, d.m2_zeitliche_orientierung, d.m2_alltagsgegenstaende, d.m2_risiken_erkennen]);
  const m3 = sumModule([d.m3_motorische_unruhe, d.m3_naechtliche_unruhe, d.m3_abwehrverhalten]);
  const m4 = sumModule([d.m4_waschen_gesicht, d.m4_koerperpflege, d.m4_an_auskleiden, d.m4_ernaehrung, d.m4_trinken, d.m4_toilettennutzung]);
  const m5 = sumModule([d.m5_medikamente, d.m5_arztbesuche, d.m5_hilfsmittel]);
  const m6 = sumModule([d.m6_tagesstruktur, d.m6_freizeitgestaltung, d.m6_kontakte]);

  // Normierung auf 0-100 pro Modul, dann gewichtet
  const score =
    (m1 / (NBI_MAX.m1 * 3) * 100) * NBI_GEWICHTE.m1 +
    (m2 / (NBI_MAX.m2 * 3) * 100) * NBI_GEWICHTE.m2 +
    (m3 / (NBI_MAX.m3 * 3) * 100) * NBI_GEWICHTE.m3 +
    (m4 / (NBI_MAX.m4 * 3) * 100) * NBI_GEWICHTE.m4 +
    (m5 / (NBI_MAX.m5 * 3) * 100) * NBI_GEWICHTE.m5 +
    (m6 / (NBI_MAX.m6 * 3) * 100) * NBI_GEWICHTE.m6;

  return Math.round(score * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();

    const url = new URL(req.url);
    const familieId = url.searchParams.get("familie_profile_id");

    let query = supabase
      .from("pflegegrad_einschaetzungen")
      .select("*")
      .order("einschaetzung_datum", { ascending: false })
      .limit(10);

    if (profile?.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile!.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
      if (familieId) query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile?.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("pflegegrad GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    let familieProfileId = d.familie_profile_id;
    let anbieterId: string | null = null;

    if (profile.role === "anbieter") {
      if (!familieProfileId) return NextResponse.json({ error: "familie_profile_id erforderlich" }, { status: 422 });
      const { data: a } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
      anbieterId = a?.id ?? null;
    } else {
      familieProfileId = profile.id;
    }

    const gesamtpunkte = berechneGesamtpunkte(d);
    const pflegegrad_empfehlung = berechnePflegegrad(gesamtpunkte);

    const { data: entry, error } = await supabase
      .from("pflegegrad_einschaetzungen")
      .insert({
        ...d,
        familie_profile_id: familieProfileId,
        anbieter_id: anbieterId,
        gesamtpunkte,
        pflegegrad_empfehlung,
        erstellt_von: profile.id,
        einschaetzung_datum: d.einschaetzung_datum ?? new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ...entry, gesamtpunkte, pflegegrad_empfehlung }, { status: 201 });
  } catch (err) {
    logger.error("pflegegrad POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
