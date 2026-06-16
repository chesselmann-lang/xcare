import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await (supabase as any)
        .from("anbieter")
        .select("id")
        .eq("profile_id", _prof?.id ?? "")
        .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const anbieterId = (anbieter as any).id;
    const now = new Date();
    const heute = now.toISOString().split("T")[0];
    const vor30Tagen = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const vor90Tagen = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    // Parallel fetches using Promise.all:
    // 1. bewohner count (all, aktiv via aktiv=true or count all)
    // 2. pflegevisiten last 30 days (count by status)
    // 3. therapieplaene last 30 days 
    // 4. beschwerden last 90 days
    // 5. aktivitaeten_teilnahmen last 30 days
    // 6. dekubitus_risiko (latest per bewohner — fetch all, take most recent per bewohner)
    // 7. qualitaets_ziele for this anbieter
    
    const [
      bewohnerResult,
      visitenResult,
      therapieResult,
      beschwerdenResult,
      aktivitaetenResult,
      dekubitusResult,
      zieleResult,
    ] = await Promise.all([
      (supabase as any).from("bewohner").select("id, aktiv").eq("anbieter_id", anbieterId),
      (supabase as any).from("pflegevisiten").select("id, status, datum").eq("anbieter_id", anbieterId).gte("datum", vor30Tagen),
      (supabase as any).from("therapieplaene").select("id, status, erstellt_am").eq("anbieter_id", anbieterId).gte("erstellt_am", vor30Tagen + "T00:00:00"),
      (supabase as any).from("beschwerden").select("id, status, eingangsdatum").eq("anbieter_id", anbieterId).gte("eingangsdatum", vor90Tagen),
      (supabase as any).from("aktivitaeten_teilnahmen").select("id, teilgenommen, datum").eq("anbieter_id", anbieterId).gte("datum", vor30Tagen),
      (supabase as any).from("dekubitus_risiko").select("bewohner_id, risikostufe, datum").eq("anbieter_id", anbieterId).order("datum", { ascending: false }),
      (supabase as any).from("qualitaets_ziele").select("*").eq("anbieter_id", anbieterId).eq("aktiv", true),
    ]);
    
    // Compute KPIs in JS:
    const bewohner = (bewohnerResult.data || []) as any[];
    const visiten = (visitenResult.data || []) as any[];
    const therapie = (therapieResult.data || []) as any[];
    const beschwerden = (beschwerdenResult.data || []) as any[];
    const aktivitaeten = (aktivitaetenResult.data || []) as any[];
    const allDekubitus = (dekubitusResult.data || []) as any[];
    const ziele = (zieleResult.data || []) as any[];
    
    // Bewohner KPIs
    const bewohnerGesamt = bewohner.length;
    const bewohnerAktiv = bewohner.filter((b: any) => b.aktiv !== false).length;
    
    // Visite KPIs
    const visitenGesamt = visiten.length;
    const visitenDurchgefuehrt = visiten.filter((v: any) => v.status === "durchgefuehrt").length;
    const visitenQuote = visitenGesamt > 0 ? Math.round((visitenDurchgefuehrt / visitenGesamt) * 100) : 0;
    
    // Therapie KPIs
    const therapieGesamt = therapie.length;
    const therapieAktiv = therapie.filter((t: any) => t.status === "aktiv").length;
    
    // Beschwerde KPIs
    const beschwerdenGesamt = beschwerden.length;
    const beschwerdenOffen = beschwerden.filter((b: any) => b.status === "offen" || b.status === "in_bearbeitung").length;
    const beschwerdenAbgeschlossen = beschwerden.filter((b: any) => b.status === "abgeschlossen").length;
    const beschwerdenLoesungsQuote = beschwerdenGesamt > 0 ? Math.round((beschwerdenAbgeschlossen / beschwerdenGesamt) * 100) : 100;
    
    // Aktivitäten KPIs
    const aktivitaetenGesamt = aktivitaeten.length;
    const aktivitaetenTeilgenommen = aktivitaeten.filter((a: any) => a.teilgenommen === true).length;
    const aktivitaetenQuote = aktivitaetenGesamt > 0 ? Math.round((aktivitaetenTeilgenommen / aktivitaetenGesamt) * 100) : 0;
    
    // Dekubitus Risiko-Verteilung (latest per bewohner)
    const latestPerBewohner = new Map<string, any>();
    for (const d of allDekubitus) {
      if (!latestPerBewohner.has(d.bewohner_id)) {
        latestPerBewohner.set(d.bewohner_id, d);
      }
    }
    const dekubitusVerteilung: { kein_risiko: number; maessig: number; hoch: number; sehr_hoch: number } = {
      kein_risiko: 0, maessig: 0, hoch: 0, sehr_hoch: 0
    };
    for (const d of latestPerBewohner.values()) {
      if (d.risikostufe in dekubitusVerteilung) {
        (dekubitusVerteilung as Record<string, number>)[d.risikostufe]++;
      }
    }
    const hochrisikoBewohner = dekubitusVerteilung.hoch + dekubitusVerteilung.sehr_hoch;
    
    return NextResponse.json({
      kpis: {
        bewohnerGesamt,
        bewohnerAktiv,
        visitenQuote,
        visitenGesamt,
        therapieAktiv,
        therapieGesamt,
        beschwerdenOffen,
        beschwerdenLoesungsQuote,
        aktivitaetenQuote,
        aktivitaetenGesamt,
        hochrisikoBewohner,
        dekubitusVerteilung,
      },
      ziele,
      zeitraum: { von: vor30Tagen, bis: heute },
    });
  } catch (err) {
    logger.error("GET /api/qualitaet", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
