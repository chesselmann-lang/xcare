import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase, user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user, error: null };
}

export async function GET() {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("dsgvo_loeschanfragen")
    .select(`
      id,
      email,
      status,
      angefragt_am,
      erledigt_am,
      notizen,
      profil_id,
      profiles (
        vorname,
        nachname,
        role
      )
    `)
    .order("angefragt_am", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const body = await request.json() as {
    id: string;
    status?: "offen" | "in_bearbeitung" | "erledigt" | "abgelehnt";
    notizen?: string | null;
  };

  const { id, status, notizen } = body;
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notizen !== undefined) updates.notizen = notizen;
  if (status === "erledigt") updates.erledigt_am = new Date().toISOString();

  const { data, error: dbErr } = await supabase
    .from("dsgvo_loeschanfragen")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
