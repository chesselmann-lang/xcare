import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid, maxLen, trimOrNull } from "@/lib/validate";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { anbieter_id, anfrage_id, sterne, kommentar } = await request.json();

  if (!isUuid(anbieter_id))
    return NextResponse.json({ error: "Ungültige anbieter_id" }, { status: 400 });
  if (!sterne || sterne < 1 || sterne > 5)
    return NextResponse.json({ error: "Ungültige Bewertung (sterne 1–5)" }, { status: 400 });
  if (kommentar !== undefined && kommentar !== null && !maxLen(kommentar, 1000))
    return NextResponse.json({ error: "Kommentar zu lang (max. 1000 Zeichen)" }, { status: 400 });
  if (anfrage_id !== undefined && anfrage_id !== null && !isUuid(anfrage_id))
    return NextResponse.json({ error: "Ungültige anfrage_id" }, { status: 400 });

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

    // One-per-Anfrage enforcement: reject if a bewertung already exists for this anfrage
    const { data: existing } = await supabase
      .from("bewertungen")
      .select("id")
      .eq("anfrage_id", anfrage_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Für diese Anfrage wurde bereits eine Bewertung abgegeben." },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase.from("bewertungen")
    .upsert(
      {
        anbieter_id,
        familie_id: profile.id,
        anfrage_id: anfrage_id ?? null,
        sterne,
        kommentar: trimOrNull(kommentar),
      },
      { onConflict: "familie_id,anbieter_id" }
    )
    .select()
    .single();

  if (error) {
    // Handle DB-level unique violation on anfrage_id (belt-and-suspenders)
    if (error.code === "23505" && error.message.includes("bewertungen_anfrage_id")) {
      return NextResponse.json(
        { error: "Für diese Anfrage wurde bereits eine Bewertung abgegeben." },
        { status: 409 }
      );
    }
    logger.error("bewertungen POST: insert error", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bust cache so the public anbieter profile and testimonials carousel
  // reflect the new/updated bewertung without waiting for the TTL.
  revalidateTag(`anbieter-${anbieter_id}`);
  revalidateTag("anbieter-list");
  revalidateTag("testimonials");

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
