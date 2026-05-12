import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  care_worker_id: z.string().uuid(),
  zertifikat_name: z.string().min(1).max(200),
  ausstellende_stelle: z.string().max(200).optional(),
  ausstellungsdatum: z.string().optional(),
  ablaufdatum: z.string().optional(),
  zertifikat_nummer: z.string().max(100).optional(),
  notizen: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const careWorkerId = url.searchParams.get("care_worker_id");

    if (profile.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json([]);

    let query = supabase
      .from("care_worker_zertifikate")
      .select(`
        id, zertifikat_name, ausstellende_stelle, ausstellungsdatum,
        ablaufdatum, zertifikat_nummer, notizen, created_at,
        care_workers!inner (id, vorname, nachname, anbieter_id)
      `)
      .eq("care_workers.anbieter_id", anbieter.id)
      .order("ablaufdatum", { ascending: true });

    if (careWorkerId) query = query.eq("care_worker_id", careWorkerId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("zertifikate GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile!.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Konto" }, { status: 403 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    // Verify the care_worker belongs to this anbieter (IDOR prevention)
    const { data: worker } = await supabase
      .from("care_workers").select("id")
      .eq("id", d.care_worker_id)
      .eq("anbieter_id", anbieter.id)
      .single();
    if (!worker) return NextResponse.json({ error: "Pflegekraft nicht gefunden" }, { status: 404 });

    const { data: entry, error } = await supabase
      .from("care_worker_zertifikate")
      .insert(d)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("zertifikate POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
