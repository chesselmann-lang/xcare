import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("pflegetagebuch")
      .select("*")
      .eq("profil_id", user.id)
      .order("eintrag_datum", { ascending: false })
      .limit(30);

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
    const { eintrag_datum, stimmung, schlaf_stunden, schmerzen, aktivitaeten, notizen, erstellt_von } = body;

    const { data, error } = await supabase
      .from("pflegetagebuch")
      .insert({
        profil_id: user.id,
        eintrag_datum: eintrag_datum ?? new Date().toISOString().split("T")[0],
        stimmung: stimmung ?? null,
        schlaf_stunden: schlaf_stunden ?? null,
        schmerzen: schmerzen ?? null,
        aktivitaeten: aktivitaeten?.trim() || null,
        notizen: notizen?.trim() || null,
        erstellt_von: erstellt_von?.trim() || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
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
      .from("pflegetagebuch")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
