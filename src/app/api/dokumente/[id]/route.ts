import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// DELETE /api/dokumente/[id] — Dokument löschen
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: dokument } = await supabase
    .from("dokumente")
    .select("id, profil_id, storage_path")
    .eq("id", id)
    .eq("profil_id", user.id)
    .single();

  if (!dokument) {
    return NextResponse.json(
      { error: "Dokument nicht gefunden oder kein Zugriff" },
      { status: 404 }
    );
  }

  if (dokument.storage_path) {
    await supabase.storage.from("dokumente").remove([dokument.storage_path]);
  }

  const { error } = await supabase
    .from("dokumente")
    .delete()
    .eq("id", id)
    .eq("profil_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/dokumente/[id] — Metadaten aktualisieren
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();
  const { name, kategorie, ablaufdatum, notizen, geteilt_mit } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (kategorie !== undefined) updates.kategorie = kategorie;
  if (ablaufdatum !== undefined) updates.ablaufdatum = ablaufdatum || null;
  if (notizen !== undefined) updates.notizen = notizen?.trim() || null;
  if (geteilt_mit !== undefined) updates.geteilt_mit = geteilt_mit;

  const { data: dokument, error } = await supabase
    .from("dokumente")
    .update(updates)
    .eq("id", id)
    .eq("profil_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dokument) {
    return NextResponse.json(
      { error: "Dokument nicht gefunden oder kein Zugriff" },
      { status: 404 }
    );
  }

  return NextResponse.json({ dokument });
}
