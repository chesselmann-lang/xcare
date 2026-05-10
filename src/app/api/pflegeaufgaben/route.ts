import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("pflegeaufgaben")
      .select("*")
      .eq("profil_id", user.id)
      .eq("aktiv", true)
      .order("haeufigkeit", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { titel, beschreibung, haeufigkeit, uhrzeit, verantwortlich, ziel_id } = body;

    if (!titel?.trim()) {
      return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegeaufgaben")
      .insert({
        profil_id: user.id,
        titel: titel.trim(),
        beschreibung: beschreibung?.trim() || null,
        haeufigkeit: haeufigkeit ?? "taeglich",
        uhrzeit: uhrzeit?.trim() || null,
        verantwortlich: verantwortlich?.trim() || null,
        ziel_id: ziel_id || null,
        erledigt_heute: false,
        aktiv: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const { data, error } = await supabase
      .from("pflegeaufgaben")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("profil_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const { error } = await supabase
      .from("pflegeaufgaben")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
