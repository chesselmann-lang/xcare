import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("notfallkontakte")
      .select("*")
      .eq("profil_id", user.id)
      .order("ist_hauptkontakt", { ascending: false })
      .order("sortierung", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    logger.error("GET /api/notfallkontakte failed", { error: String(err) }); // S279
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, beziehung, telefon, email, adresse, ist_hauptkontakt, sortierung } = body;

    if (!name?.trim() || !telefon?.trim()) {
      return NextResponse.json({ error: "Name und Telefon sind erforderlich" }, { status: 400 });
    }

    if (ist_hauptkontakt) {
      await supabase
        .from("notfallkontakte")
        .update({ ist_hauptkontakt: false })
        .eq("profil_id", user.id)
        .eq("ist_hauptkontakt", true);
    }

    const { data, error } = await supabase
      .from("notfallkontakte")
      .insert({
        profil_id: user.id,
        name: name.trim(),
        beziehung: beziehung?.trim() || null,
        telefon: telefon.trim(),
        email: email?.trim() || null,
        adresse: adresse?.trim() || null,
        ist_hauptkontakt: ist_hauptkontakt ?? false,
        sortierung: sortierung ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/notfallkontakte failed", { error: String(err) }); // S279
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

    if (updates.ist_hauptkontakt) {
      await supabase
        .from("notfallkontakte")
        .update({ ist_hauptkontakt: false })
        .eq("profil_id", user.id)
        .eq("ist_hauptkontakt", true)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("notfallkontakte")
      .update(updates)
      .eq("id", id)
      .eq("profil_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    logger.error("PATCH /api/notfallkontakte failed", { error: String(err) }); // S279
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
      .from("notfallkontakte")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/notfallkontakte failed", { error: String(err) }); // S279
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
