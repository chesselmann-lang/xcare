import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/dokumente — eigene Dokumente laden
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data: dokumente, error } = await supabase
    .from("dokumente")
    .select("*")
    .eq("profil_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dokumente: dokumente ?? [] });
}

// POST /api/dokumente — Dokument-Metadaten anlegen (Upload via Client direkt an Storage)
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    kategorie,
    storage_path,
    mime_type,
    groesse_bytes,
    ablaufdatum,
    notizen,
    haushalt_id,
  } = body;

  if (!name || !kategorie || !storage_path) {
    return NextResponse.json(
      { error: "Name, Kategorie und Storage-Pfad sind erforderlich" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("haushalt_id")
    .eq("user_id", user.id)
    .single();

  const { data: dokument, error } = await supabase
    .from("dokumente")
    .insert({
      profil_id: user.id,
      haushalt_id: haushalt_id ?? profile?.haushalt_id ?? null,
      name: name.trim(),
      kategorie,
      storage_path,
      mime_type: mime_type ?? null,
      groesse_bytes: groesse_bytes ?? null,
      ablaufdatum: ablaufdatum || null,
      notizen: notizen?.trim() || null,
      // TODO: Implement client-side AES-256 encryption before upload
      verschluesselt: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dokument }, { status: 201 });
}
