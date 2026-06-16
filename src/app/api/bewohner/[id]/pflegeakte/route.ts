import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/** GET /api/bewohner/[id]/pflegeakte — aggregated care file for one resident */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    // Fetch bewohner record (validates ownership via RLS)
    const { data: bewohner, error: bErr } = await supabase
      .from("bewohner")
      .select("*")
      .eq("id", id)
      .eq("anbieter_id", anbieter.id)
      .single();
    if (bErr || !bewohner) {
      return NextResponse.json({ error: "Bewohner nicht gefunden" }, { status: 404 });
    }

    // Fetch tour Einsätze for this resident (most recent 100)
    const { data: einsaetze } = await supabase
      .from("tour_einsaetze")
      .select(`
        id, geplante_ankunft, geplante_abfahrt, tatsaechliche_ankunft, tatsaechliche_abfahrt,
        kunde_name, leistungsart, leistungsminuten, status, prioritaet,
        pflegedokumentation, abwesenheitsgrund, reihenfolge,
        touren!inner(datum, name, fahrzeug, fahrer:profiles!fahrer_id(vorname, nachname))
      `)
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieter.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch Leistungsnachweise for this resident
    const { data: leistungsnachweise } = await supabase
      .from("leistungsnachweise")
      .select(`
        id, leistungsdatum, abrechnungsmonat, leistungsart, leistungsminuten,
        einheit, einzelpreis_ct, menge, gesamtbetrag_ct,
        status, eingereicht_am, genehmigt_am, krankenkasse, abrechnungs_referenz
      `)
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieter.id)
      .order("leistungsdatum", { ascending: false })
      .limit(200);

    // Aggregate stats
    const totalEinsaetze = einsaetze?.length ?? 0;
    const abgeschlosseneEinsaetze = einsaetze?.filter((e) => e.status === "abgeschlossen").length ?? 0;
    const totalMinuten = einsaetze?.reduce((s, e) => s + (e.leistungsminuten ?? 0), 0) ?? 0;
    const totalBetrag = leistungsnachweise?.reduce((s, e) => s + (e.gesamtbetrag_ct ?? 0), 0) ?? 0;
    const genehmigterBetrag = leistungsnachweise?.filter((e) => e.status === "genehmigt")
      .reduce((s, e) => s + (e.gesamtbetrag_ct ?? 0), 0) ?? 0;

    return NextResponse.json({
      bewohner,
      einsaetze: einsaetze ?? [],
      leistungsnachweise: leistungsnachweise ?? [],
      stats: {
        totalEinsaetze,
        abgeschlosseneEinsaetze,
        totalMinuten,
        totalBetrag,
        genehmigterBetrag,
      },
    });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/pflegeakte error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
