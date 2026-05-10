import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/haushalt/mitglieder — Mitglieder des eigenen Haushalts laden
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
    return NextResponse.json({ mitglieder: [] });
  }

  const { data: mitglieder, error } = await supabase
    .from("haushaltsmitglieder")
    .select("*")
    .eq("haushalt_id", profile.haushalt_id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mitglieder: mitglieder ?? [] });
}

// POST /api/haushalt/mitglieder — Mitglied hinzufügen
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
  const { vorname, nachname, rolle, pflegegrad, geburtsdatum } = body;

  if (!vorname || !nachname || !rolle) {
    return NextResponse.json(
      { error: "Vorname, Nachname und Rolle sind erforderlich" },
      { status: 400 }
    );
  }

  const { data: mitglied, error } = await supabase
    .from("haushaltsmitglieder")
    .insert({
      haushalt_id: profile.haushalt_id,
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      rolle,
      pflegegrad: pflegegrad ?? null,
      geburtsdatum: geburtsdatum ?? null,
      kann_anfragen_sehen: false,
      kann_dokumente_sehen: false,
      kann_verwalten: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mitglied }, { status: 201 });
}
