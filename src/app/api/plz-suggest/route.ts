import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const supabase = await createClient();

  // Search by PLZ prefix OR city name (Ort) — return distinct PLZ+Ort pairs
  const isNumeric = /^\d+$/.test(q);

  const query = supabase
    .from("anbieter")
    .select("plz, ort")
    .eq("aktiv", true)
    .not("plz", "is", null)
    .not("ort", "is", null);

  const { data } = isNumeric
    ? await query.ilike("plz", `${q}%`).limit(20)
    : await query.ilike("ort", `${q}%`).limit(20);

  if (!data) return NextResponse.json([]);

  // Deduplicate by PLZ
  const seen = new Set<string>();
  const results: Array<{ plz: string; ort: string }> = [];
  for (const row of data) {
    if (!row.plz || !row.ort) continue;
    if (!seen.has(row.plz)) {
      seen.add(row.plz);
      results.push({ plz: row.plz, ort: row.ort });
    }
  }

  return NextResponse.json(results.slice(0, 6));
}
