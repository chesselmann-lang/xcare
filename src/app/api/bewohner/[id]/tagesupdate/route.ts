import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("bewohner_tagesupdates")
      .select("*, profiles:erstellt_von(vorname, nachname)")
      .eq("bewohner_id", bewohnerId)
      .order("datum", { ascending: false })
      .limit(30);

    return NextResponse.json({ updates: data ?? [] });
  } catch (err) {
    console.error("[tagesupdate GET]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const {
      datum, allgemeinzustand, stimmung, nachricht,
      aktivitaeten, mahlzeiten_ok, schlaf_ok, besonderheiten,
      sichtbar_fuer_angehoerige,
    } = body;

    const { data, error } = await supabase
      .from("bewohner_tagesupdates")
      .insert({
        bewohner_id: bewohnerId,
        anbieter_id: anbieter.id,
        erstellt_von: profile.id,
        datum: datum ?? new Date().toISOString().slice(0, 10),
        allgemeinzustand: allgemeinzustand ?? "gut",
        stimmung: stimmung ?? null,
        nachricht: nachricht ?? null,
        aktivitaeten: aktivitaeten ?? [],
        mahlzeiten_ok: mahlzeiten_ok ?? null,
        schlaf_ok: schlaf_ok ?? null,
        besonderheiten: besonderheiten ?? null,
        sichtbar_fuer_angehoerige: sichtbar_fuer_angehoerige ?? true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ update: data });
  } catch (err) {
    console.error("[tagesupdate POST]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
