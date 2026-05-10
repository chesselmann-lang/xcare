import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/haushalt/vollmachten — Vollmachten des eigenen Haushalts laden
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.haushalt_id) {
    return NextResponse.json({ vollmachten: [] });
  }

  const { data: vollmachten, error } = await supabase
    .from("vollmachten")
    .select("*")
    .eq("haushalt_id", profile.haushalt_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vollmachten: vollmachten ?? [] });
}

// POST /api/haushalt/vollmachten — Vollmacht erstellen
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.haushalt_id) {
    return NextResponse.json(
      { error: "Kein Haushalt gefunden. Bitte zuerst einen Haushalt erstellen." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    typ,
    titel,
    beschreibung,
    gueltig_ab,
    gueltig_bis,
    notariell,
    registriert_beim,
  } = body;

  if (!typ || !titel) {
    return NextResponse.json(
      { error: "Typ und Titel sind erforderlich" },
      { status: 400 }
    );
  }

  const { data: vollmacht, error } = await supabase
    .from("vollmachten")
    .insert({
      haushalt_id: profile.haushalt_id,
      typ,
      titel: titel.trim(),
      beschreibung: beschreibung?.trim() || null,
      gueltig_ab: gueltig_ab || null,
      gueltig_bis: gueltig_bis || null,
      notariell: notariell ?? false,
      registriert_beim: registriert_beim?.trim() || null,
      aktiv: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vollmacht }, { status: 201 });
}
