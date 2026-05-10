import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/haushalt — eigenen Haushalt laden
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
  }

  if (!profile.haushalt_id) {
    return NextResponse.json({ haushalt: null });
  }

  const { data: haushalt, error } = await supabase
    .from("haushalte")
    .select("*")
    .eq("id", profile.haushalt_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ haushalt });
}

// POST /api/haushalt — neuen Haushalt erstellen
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();
  const { name, plz, ort } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("haushalt_id")
    .eq("user_id", user.id)
    .single();

  if (profile?.haushalt_id) {
    return NextResponse.json(
      { error: "Es existiert bereits ein Haushalt für dieses Profil" },
      { status: 409 }
    );
  }

  const { data: haushalt, error: haushaltError } = await supabase
    .from("haushalte")
    .insert({
      name: name.trim(),
      plz: plz?.trim() || null,
      ort: ort?.trim() || null,
      erstellt_von: user.id,
    })
    .select()
    .single();

  if (haushaltError) {
    return NextResponse.json({ error: haushaltError.message }, { status: 500 });
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ haushalt_id: haushalt.id })
    .eq("user_id", user.id);

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ haushalt }, { status: 201 });
}
