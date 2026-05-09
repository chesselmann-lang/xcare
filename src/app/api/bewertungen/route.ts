import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { anbieter_id, anfrage_id, sterne, kommentar } = await request.json();
  if (!anbieter_id || !sterne || sterne < 1 || sterne > 5)
    return NextResponse.json({ error: "Ungültige Bewertung" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();

  if (!profile || profile.role !== "familie")
    return NextResponse.json({ error: "Nur Familien können bewerten" }, { status: 403 });

  // Verify anfrage was abgeschlossen and belongs to this familie
  if (anfrage_id) {
    const { data: anfrage } = await supabase
      .from("anfragen")
      .select("id, status")
      .eq("id", anfrage_id)
      .eq("familie_id", profile.id)
      .single();
    if (!anfrage || anfrage.status !== "abgeschlossen")
      return NextResponse.json({ error: "Anfrage muss abgeschlossen sein" }, { status: 400 });
  }

  const { data, error } = await supabase.from("bewertungen")
    .upsert({ anbieter_id, familie_id: profile.id, anfrage_id: anfrage_id ?? null, sterne, kommentar: kommentar?.trim() || null },
      { onConflict: "familie_id,anbieter_id" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const anbieter_id = searchParams.get("anbieter_id");
  if (!anbieter_id) return NextResponse.json({ error: "anbieter_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("bewertungen")
    .select("*, familie:profiles!familie_id(vorname)")
    .eq("anbieter_id", anbieter_id)
    .order("created_at", { ascending: false })
    .limit(20);

  const avg = data?.length ? data.reduce((s, b) => s + b.sterne, 0) / data.length : 0;
  return NextResponse.json({ data: data ?? [], average: avg, count: data?.length ?? 0 });
}
