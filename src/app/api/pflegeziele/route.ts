import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("pflegeziele")
      .select("*")
      .eq("profil_id", user.id)
      .order("prioritaet", { ascending: true })
      .order("created_at", { ascending: false });

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
    const { titel, beschreibung, kategorie, prioritaet, ziel_datum } = body;

    if (!titel?.trim()) {
      return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
    }

    const parsedPrioritaet = prioritaet ?? 2;
    if (
      typeof parsedPrioritaet !== "number" ||
      !Number.isInteger(parsedPrioritaet) ||
      parsedPrioritaet < 1 ||
      parsedPrioritaet > 5
    ) {
      return NextResponse.json({ error: "Priorität muss zwischen 1 und 5 liegen" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegeziele")
      .insert({
        profil_id: user.id,
        titel: titel.trim(),
        beschreibung: beschreibung?.trim() || null,
        kategorie: kategorie ?? "allgemein",
        prioritaet: parsedPrioritaet,
        ziel_datum: ziel_datum || null,
        erreicht: false,
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
      .from("pflegeziele")
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
      .from("pflegeziele")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
