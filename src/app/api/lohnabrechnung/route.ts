import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// GET /api/lohnabrechnung?monat=2026-06
// Liefert alle Lohnperioden für einen Monat (oder berechnet sie on-the-fly aus Schichten)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Profil" }, { status: 404 });

    const monat = req.nextUrl.searchParams.get("monat") ?? new Date().toISOString().slice(0, 7);
    const periodeStart = `${monat}-01`;
    const periodeEnde = new Date(new Date(periodeStart).setMonth(new Date(periodeStart).getMonth() + 1, 0))
      .toISOString().slice(0, 10);

    // Care Workers abrufen
    const { data: careWorkers } = await supabase
      .from("care_workers")
      .select("id, vorname, nachname, stundensatz_ct, rolle")
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("nachname");

    if (!careWorkers?.length) {
      return NextResponse.json({ perioden: [], monat, careWorkers: [] });
    }

    // Schichten für den Monat
    const { data: schichten } = await supabase
      .from("schichten")
      .select("id, care_worker_id, start_ts, ende_ts, status, stunden_geplant, stundensatz_ct, schichttyp")
      .eq("anbieter_id", anbieter.id)
      .gte("start_ts", `${periodeStart}T00:00:00Z`)
      .lte("start_ts", `${periodeEnde}T23:59:59Z`)
      .in("status", ["bestaetigt", "abgeschlossen"]);

    // Bestehende Lohnperioden laden
    const { data: existingPerioden } = await supabase
      .from("lohnperioden")
      .select("*, care_workers(vorname, nachname, stundensatz_ct)")
      .eq("anbieter_id", anbieter.id)
      .eq("periode_start", periodeStart);

    // Map: care_worker_id → lohnperiode
    const periodeMap = new Map((existingPerioden ?? []).map(p => [p.care_worker_id, p]));

    // Für jeden Worker: Schichten aggregieren
    const perioden = (careWorkers ?? []).map(cw => {
      const cwSchichten = (schichten ?? []).filter(s => s.care_worker_id === cw.id);
      const existing = periodeMap.get(cw.id);

      // Stunden berechnen
      let stundenGeplant = 0;
      let stundenTatsaechlich = 0;
      let zuschlaegeCtCalc = 0;

      for (const s of cwSchichten) {
        const start = new Date(s.start_ts);
        const ende = new Date(s.ende_ts);
        const dauerH = (ende.getTime() - start.getTime()) / 3600000;
        stundenGeplant += s.stunden_geplant ?? dauerH;
        stundenTatsaechlich += s.status === "abgeschlossen" ? dauerH : 0;

        // Nacht-Zuschlag (22–6 Uhr): 25%
        const stunde = start.getHours();
        if (stunde >= 22 || stunde < 6) {
          zuschlaegeCtCalc += Math.round(dauerH * (cw.stundensatz_ct ?? 0) * 0.25);
        }
        // Wochenend-Zuschlag: 20%
        const dow = start.getDay();
        if (dow === 0 || dow === 6) {
          zuschlaegeCtCalc += Math.round(dauerH * (cw.stundensatz_ct ?? 0) * 0.20);
        }
      }

      const stundensatz = cw.stundensatz_ct ?? 0;
      const grundlohnCt = Math.round(stundenGeplant * stundensatz);
      const bruttoCt = grundlohnCt + zuschlaegeCtCalc;

      if (existing) {
        return {
          ...existing,
          care_worker: { vorname: cw.vorname, nachname: cw.nachname, stundensatz_ct: cw.stundensatz_ct, rolle: cw.rolle },
          schichten_anzahl: cwSchichten.length,
          stunden_geplant_berechnet: parseFloat(stundenGeplant.toFixed(2)),
        };
      }

      return {
        id: null,
        anbieter_id: anbieter.id,
        care_worker_id: cw.id,
        care_worker: { vorname: cw.vorname, nachname: cw.nachname, stundensatz_ct: cw.stundensatz_ct, rolle: cw.rolle },
        periode_start: periodeStart,
        periode_ende: periodeEnde,
        schichten_anzahl: cwSchichten.length,
        stunden_geplant: parseFloat(stundenGeplant.toFixed(2)),
        stunden_tatsaechlich: parseFloat(stundenTatsaechlich.toFixed(2)),
        zuschlaege_ct: zuschlaegeCtCalc,
        brutto_ct: bruttoCt,
        status: "offen",
        notizen: null,
        freigegeben_von: null,
        freigegeben_am: null,
        exportiert_am: null,
      };
    });

    // Summen
    const summe = {
      schichten: perioden.reduce((a, p) => a + (p.schichten_anzahl ?? 0), 0),
      stundenGeplant: perioden.reduce((a, p) => a + (p.stunden_geplant ?? 0), 0),
      bruttoCt: perioden.reduce((a, p) => a + (p.brutto_ct ?? 0), 0),
    };

    return NextResponse.json({ perioden, monat, periodeStart, periodeEnde, summe });
  } catch (err) {
    logger.error("[lohnabrechnung GET]", { error: err });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST /api/lohnabrechnung  → Lohnperiode speichern / Status ändern
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Profil" }, { status: 404 });

    const body = await req.json();
    const {
      care_worker_id, periode_start, periode_ende,
      schichten_anzahl, stunden_geplant, stunden_tatsaechlich,
      zuschlaege_ct, brutto_ct, notizen, status,
    } = body;

    const upsertData = {
      anbieter_id: anbieter.id,
      care_worker_id,
      periode_start,
      periode_ende,
      schichten_anzahl: schichten_anzahl ?? 0,
      stunden_geplant: stunden_geplant ?? 0,
      stunden_tatsaechlich: stunden_tatsaechlich ?? 0,
      zuschlaege_ct: zuschlaege_ct ?? 0,
      brutto_ct: brutto_ct ?? 0,
      notizen: notizen ?? null,
      status: status ?? "offen",
      ...(status === "freigegeben" ? { freigegeben_von: profile.id, freigegeben_am: new Date().toISOString() } : {}),
    };

    const { data, error } = await supabase
      .from("lohnperioden")
      .upsert(upsertData, { onConflict: "anbieter_id,care_worker_id,periode_start" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ periode: data });
  } catch (err) {
    logger.error("[lohnabrechnung POST]", { error: err });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
