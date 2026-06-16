import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

function weekRange(refDate?: string): { von: string; bis: string } {
  const d = refDate ? new Date(refDate) : new Date();
  const day = d.getDay(); // 0=So
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { von: fmt(monday), bis: fmt(sunday) };
}

// GET /api/bewohner/[id]/wochenbericht?woche=YYYY-MM-DD
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const refWoche = searchParams.get("woche");
    const { von, bis } = weekRange(refWoche ?? undefined);

    // Lade Protokolldaten der Woche
    const [
      { data: vitalzeichen },
      { data: medikamente },
      { data: aktivitaeten },
      { data: schlaf },
      { data: mahlzeiten },
      { data: wohlbefinden },
      { data: tagesupdates },
      { data: bestehendesBericht },
      { data: frühereBerichteListe },
    ] = await Promise.all([
      ((supabase as any).from("vitalzeichen_eintraege") as any)
        .select("messung_datum, systolisch, diastolisch, puls, temperatur, sauerstoffsaettigung, blutzucker")
        .eq("bewohner_id", bewohnerId)
        .gte("messung_datum", von).lte("messung_datum", bis),
      ((supabase as any).from("medikamentengaben") as any)
        .select("gegeben_am, status, medikament:medikamentenplaene(bezeichnung)")
        .eq("bewohner_id", bewohnerId)
        .gte("gegeben_am", von).lte("gegeben_am", bis),
      ((supabase as any).from("bewohner_tagesupdates") as any)
        .select("datum, aktivitaeten, allgemeinzustand, stimmung")
        .eq("bewohner_id", bewohnerId)
        .gte("datum", von).lte("datum", bis),
      ((supabase as any).from("schlaf_protokolle") as any)
        .select("datum, schlafdauer_h, schlafqualitaet, besonderheiten")
        .eq("bewohner_id", bewohnerId)
        .gte("datum", von).lte("datum", bis)
        .limit(7),
      ((supabase as any).from("ernaehrungs_protokolle") as any)
        .select("datum, fluessigkeit_ml, mahlzeiten_anzahl, appetit")
        .eq("bewohner_id", bewohnerId)
        .gte("datum", von).lte("datum", bis)
        .limit(7),
      ((supabase as any).from("wohlbefinden_eintraege") as any)
        .select("datum, gesamtwert, stimmung, schmerzen, erschoepfung, notizen")
        .eq("bewohner_id", bewohnerId)
        .gte("datum", von).lte("datum", bis),
      ((supabase as any).from("bewohner_tagesupdates") as any)
        .select("datum, allgemeinzustand, aktivitaeten, notizen, sichtbar_fuer_angehoerige")
        .eq("bewohner_id", bewohnerId)
        .gte("datum", von).lte("datum", bis),
      ((supabase as any).from("bewohner_wochenberichte") as any)
        .select("*")
        .eq("bewohner_id", bewohnerId)
        .eq("woche_von", von)
        .maybeSingle(),
      ((supabase as any).from("bewohner_wochenberichte") as any)
        .select("id, woche_von, woche_bis, status, allgemeinzustand, highlights, erstellt_am")
        .eq("bewohner_id", bewohnerId)
        .eq("anbieter_id", anbieterId)
        .order("woche_von", { ascending: false })
        .limit(8),
    ]);

    // Vitalwerte-Summary
    const vitalSummary = vitalzeichen?.length ? {
      anzahl_messungen: vitalzeichen.length,
      avg_systolisch: Math.round((vitalzeichen.reduce((s: number, v: any) => s + (v.systolisch || 0), 0)) / vitalzeichen.filter((v: any) => v.systolisch).length) || null,
      avg_puls: Math.round((vitalzeichen.reduce((s: number, v: any) => s + (v.puls || 0), 0)) / vitalzeichen.filter((v: any) => v.puls).length) || null,
      avg_temp: (vitalzeichen.reduce((s: number, v: any) => s + (v.temperatur || 0), 0) / vitalzeichen.filter((v: any) => v.temperatur).length).toFixed(1) || null,
    } : {};

    // Medikamente-Summary
    const medGesamt = medikamente?.length ?? 0;
    const medGegeben = medikamente?.filter((m: any) => m.status === "gegeben").length ?? 0;
    const medSummary = { gesamt: medGesamt, gegeben: medGegeben, compliance_pct: medGesamt ? Math.round((medGegeben / medGesamt) * 100) : null };

    // Schlaf-Summary
    const schlafMittel = schlaf?.length
      ? (schlaf.reduce((s: number, x: any) => s + (x.schlafdauer_h || 0), 0) / schlaf.length).toFixed(1)
      : null;
    const schlafSummary = { avg_dauer_h: schlafMittel, eintraege: schlaf?.length ?? 0 };

    // Wohlbefinden-Summary
    const wbMittel = wohlbefinden?.length
      ? Math.round(wohlbefinden.reduce((s: number, x: any) => s + (x.gesamtwert || 0), 0) / wohlbefinden.length)
      : null;
    const wbSummary = { avg_gesamtwert: wbMittel, eintraege: wohlbefinden?.length ?? 0 };

    // Aktivitäten sammeln
    const alleAktivitaeten = (aktivitaeten ?? []).flatMap((a: any) => a.aktivitaeten ?? []);
    const aktUniq = [...new Set(alleAktivitaeten)];

    return NextResponse.json({
      von, bis,
      bestehendesBericht: bestehendesBericht ?? null,
      frühereBerichteListe: frühereBerichteListe ?? [],
      zusammenfassung: {
        vitalwerte: vitalSummary,
        medikamente: medSummary,
        schlaf: schlafSummary,
        wohlbefinden: wbSummary,
        aktivitaeten: aktUniq,
        tagesupdates: tagesupdates ?? [],
      },
    });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/wochenbericht", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/bewohner/[id]/wochenbericht — upsert + freigeben
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { von, bis, allgemeinzustand, highlights, besonderheiten, hinweise_angehoerige,
            termine_naechste_woche, status, vitalwerte_summary, medikamente_summary,
            aktivitaeten_summary, schlaf_summary, wohlbefinden_summary } = body;

    const upsertData: Record<string, unknown> = {
      anbieter_id: anbieterId,
      bewohner_id: bewohnerId,
      woche_von: von,
      woche_bis: bis,
      allgemeinzustand: allgemeinzustand ?? null,
      highlights: highlights ?? null,
      besonderheiten: besonderheiten ?? null,
      hinweise_angehoerige: hinweise_angehoerige ?? null,
      termine_naechste_woche: termine_naechste_woche ?? [],
      status: status ?? "entwurf",
      erstellt_von: user.id,
      vitalwerte_summary: vitalwerte_summary ?? {},
      medikamente_summary: medikamente_summary ?? {},
      aktivitaeten_summary: aktivitaeten_summary ?? {},
      schlaf_summary: schlaf_summary ?? {},
      wohlbefinden_summary: wohlbefinden_summary ?? {},
    };
    if (status === "freigegeben") upsertData.freigegeben_am = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("bewohner_wochenberichte")
      .upsert(upsertData, { onConflict: "bewohner_id,woche_von" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ bericht: data }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/wochenbericht", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
