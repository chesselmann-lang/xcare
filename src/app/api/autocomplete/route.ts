import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();

  const [{ data: anbieter }, { data: leistungen }] = await Promise.all([
    supabase
      .from("anbieter")
      .select("id, name, ort, verifiziert")
      .eq("aktiv", true)
      .ilike("name", `%${q}%`)
      .limit(5),
    supabase
      .from("leistungen")
      .select("id, name, anbieter_id, anbieter(name)")
      .eq("aktiv", true)
      .ilike("name", `%${q}%`)
      .limit(5),
  ]);

  const results = [
    ...(anbieter ?? []).map((a) => ({
      type: "anbieter" as const,
      id: a.id,
      label: a.name,
      sublabel: a.ort ?? "",
      verifiziert: a.verifiziert,
      href: `/anbieter/${a.id}`,
    })),
    ...(leistungen ?? []).map((l) => ({
      type: "leistung" as const,
      id: l.id,
      label: l.name,
      sublabel: (l.anbieter as { name: string } | null)?.name ?? "",
      verifiziert: false,
      href: `/anbieter/${l.anbieter_id}`,
    })),
  ];

  const response = NextResponse.json({ results });
  // Cache autocomplete results at the CDN edge for 30 seconds — anbieter names
  // update infrequently but freshness matters more than for static PLZ data.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=30, stale-while-revalidate=10"
  );
  return response;
}
