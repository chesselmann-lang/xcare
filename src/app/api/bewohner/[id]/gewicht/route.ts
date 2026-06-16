import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const since =
    url.searchParams.get("since") ??
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [gewichtRes, vitalRes, normwerteRes] = await Promise.all([
    (supabase as any)
      .from("gewichts_eintraege")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", since)
      .order("datum", { ascending: true }),
    (supabase as any)
      .from("vitalwerte_eintraege")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", since)
      .order("datum", { ascending: false }),
    (supabase as any)
      .from("bewohner_normwerte")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .maybeSingle(),
  ]);

  const gewichtEintraege = (gewichtRes.data ?? []) as any[];
  const vitalEintraege = (vitalRes.data ?? []) as any[];
  const normwerte = normwerteRes.data ?? null;

  // Stats
  const gewichte = gewichtEintraege.map((e: any) => e.gewicht_kg as number);
  const aktuellesGewicht = gewichte.length > 0 ? gewichte[gewichte.length - 1] : null;
  const erstesGewicht = gewichte.length > 0 ? gewichte[0] : null;
  const gewichtDelta =
    aktuellesGewicht !== null && erstesGewicht !== null
      ? Math.round((aktuellesGewicht - erstesGewicht) * 10) / 10
      : null;

  const letzteVital = vitalEintraege.length > 0 ? vitalEintraege[0] : null;

  const stats = {
    aktuellesGewicht,
    gewichtDelta,
    anzahlMessungen: gewichte.length,
    letzteMessung:
      gewichtEintraege.length > 0 ? gewichtEintraege[gewichtEintraege.length - 1].datum : null,
    letzteVital,
  };

  return NextResponse.json({ gewichtEintraege, vitalEintraege, normwerte, stats });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const body = await request.json();
  const anbieterId = (anbieter as any).id;

  if (body.type === "vital") {
    const { type: _t, ...vitalData } = body;
    const { data, error } = await (supabase as any)
      .from("vitalwerte_eintraege")
      .insert({ ...vitalData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ eintrag: data }, { status: 201 });
  }

  if (body.type === "normwerte") {
    const { type: _t, ...normData } = body;
    // upsert
    const { data, error } = await (supabase as any)
      .from("bewohner_normwerte")
      .upsert(
        { ...normData, bewohner_id: bewohnerId, anbieter_id: anbieterId, aktualisiert_von: user.id, aktualisiert_am: new Date().toISOString() },
        { onConflict: "bewohner_id" }
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ normwerte: data }, { status: 200 });
  }

  // Default: gewicht
  if (!body.gewicht_kg) {
    return NextResponse.json({ error: "Gewicht ist erforderlich" }, { status: 400 });
  }

  const { type: _t, bmi: _bmi, ...gewichtData } = body;
  // BMI berechnen wenn Größe bekannt (aus normwerten)
  let berechneterBmi: number | null = null;
  if (body.groesse_cm) {
    const h = (body.groesse_cm as number) / 100;
    berechneterBmi = Math.round((body.gewicht_kg / (h * h)) * 10) / 10;
  }

  const { data, error } = await (supabase as any)
    .from("gewichts_eintraege")
    .insert({
      ...gewichtData,
      bewohner_id: bewohnerId,
      anbieter_id: anbieterId,
      bmi: berechneterBmi,
      erfasst_von: user.id,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ eintrag: data }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const table = url.searchParams.get("tabelle") ?? "gewicht";
  const eintragId = url.searchParams.get("eintrag_id");
  if (!eintragId) return NextResponse.json({ error: "eintrag_id fehlt" }, { status: 400 });

  const tableName = table === "vital" ? "vitalwerte_eintraege" : "gewichts_eintraege";
  const { error } = await (supabase as any)
    .from(tableName)
    .delete()
    .eq("id", eintragId)
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", (anbieter as any).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
