import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Pflegetermine der nächsten 7 Tage
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const { data, error } = await supabase
      .from("pflegetermine")
      .select("*")
      .eq("profil_id", user.id)
      .gte("datum", now.toISOString())
      .lte("datum", in7Days.toISOString())
      .order("datum", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST: Pflegetermin erstellen
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      titel,
      beschreibung,
      termin_typ,
      datum,
      dauer_minuten,
      ort,
      erinnerung_tage,
      notizen,
    } = body;

    if (!titel?.trim() || !datum || !termin_typ) {
      return NextResponse.json(
        { error: "Titel, Datum und Typ sind erforderlich" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("pflegetermine")
      .insert({
        profil_id: user.id,
        titel: titel.trim(),
        beschreibung: beschreibung?.trim() || null,
        termin_typ,
        datum,
        dauer_minuten: dauer_minuten ?? 60,
        ort: ort?.trim() || null,
        erinnerung_tage: erinnerung_tage ?? 1,
        notizen: notizen?.trim() || null,
        erledigt: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// PATCH: Termin als erledigt markieren
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, erledigt } = body;

    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegetermine")
      .update({ erledigt })
      .eq("id", id)
      .eq("profil_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// DELETE: Termin löschen
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const { error } = await supabase
      .from("pflegetermine")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
