import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/haushaltsscheck
export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { data, error } = await supabase
      .from("haushaltsscheck_daten")
      .select("*")
      .eq("profil_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ haushaltsscheck: data ?? [] });
  } catch (err) {
    console.error("[GET /api/haushaltsscheck]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/haushaltsscheck
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json() as {
      arbeitgeber_name: string;
      arbeitgeber_adresse: string;
      arbeitnehmer_name: string;
      arbeitnehmer_svnr: string;
      stundenlohn: number;
      stunden_pro_woche: number;
      beginn_datum: string;
    };

    const required = [
      "arbeitgeber_name",
      "arbeitgeber_adresse",
      "arbeitnehmer_name",
      "arbeitnehmer_svnr",
      "beginn_datum",
    ] as const;

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} ist erforderlich` }, { status: 400 });
      }
    }

    if (!body.stundenlohn || !body.stunden_pro_woche) {
      return NextResponse.json({ error: "stundenlohn und stunden_pro_woche sind erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("haushaltsscheck_daten")
      .insert({
        profil_id: user.id,
        arbeitgeber_name: body.arbeitgeber_name,
        arbeitgeber_adresse: body.arbeitgeber_adresse,
        arbeitnehmer_name: body.arbeitnehmer_name,
        arbeitnehmer_svnr: body.arbeitnehmer_svnr,
        stundenlohn: body.stundenlohn,
        stunden_pro_woche: body.stunden_pro_woche,
        beginn_datum: body.beginn_datum,
        aktiv: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ haushaltsscheck: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/haushaltsscheck]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH /api/haushaltsscheck
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json() as {
      id: string;
      arbeitgeber_name?: string;
      arbeitgeber_adresse?: string;
      arbeitnehmer_name?: string;
      arbeitnehmer_svnr?: string;
      stundenlohn?: number;
      stunden_pro_woche?: number;
      beginn_datum?: string;
      aktiv?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });
    }

    const { id, ...updateFields } = body;

    const { data, error } = await supabase
      .from("haushaltsscheck_daten")
      .update(updateFields)
      .eq("id", id)
      .eq("profil_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Datensatz nicht gefunden" }, { status: 404 });

    return NextResponse.json({ haushaltsscheck: data });
  } catch (err) {
    console.error("[PATCH /api/haushaltsscheck]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
