import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const KATEGORIEN = [
  "allgemein","koerperpflege","ernaehrung","mobilität",
  "medikamente","vitalwerte","wunde","psychosozial","sonstiges",
] as const;

const CreateSchema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  care_worker_id: z.string().uuid().optional(),
  kategorie: z.enum(KATEGORIEN),
  titel: z.string().max(200).optional(),
  inhalt: z.string().min(1).max(5000),
  ereignis_datum: z.string().datetime().optional(),
  // Vitalwerte
  blutdruck_sys: z.number().int().min(50).max(300).optional(),
  blutdruck_dia: z.number().int().min(30).max(200).optional(),
  puls: z.number().int().min(20).max(300).optional(),
  temperatur: z.number().min(30).max(45).optional(),
  gewicht: z.number().min(1).max(500).optional(),
  blutzucker: z.number().int().min(10).max(1000).optional(),
  sauerstoff: z.number().int().min(50).max(100).optional(),
  // Medikamente
  medikament_name: z.string().max(200).optional(),
  medikament_dosis: z.string().max(100).optional(),
  medikament_gegeben: z.boolean().optional(),
});

/**
 * GET /api/dokumentation
 * Anbieter: eigene Einträge (alle Bewohner); Familie: eigene.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const kategorie = url.searchParams.get("kategorie");
    const familieId = url.searchParams.get("familie_profile_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
    const vonDate = url.searchParams.get("von");  // ISO date
    const bisDate = url.searchParams.get("bis");

    let query = supabase
      .from("pflegedokumentation")
      .select(`
        id, kategorie, titel, inhalt, ereignis_datum, created_at,
        blutdruck_sys, blutdruck_dia, puls, temperatur, gewicht, blutzucker, sauerstoff,
        medikament_name, medikament_dosis, medikament_gegeben,
        unterschrieben, unterschrift_ts,
        familie_profile_id,
        care_worker_id,
        care_workers (vorname, nachname),
        erstellt_von,
        profiles!pflegedokumentation_erstellt_von_fkey (vorname, nachname)
      `)
      .order("ereignis_datum", { ascending: false })
      .limit(limit);

    if (kategorie) query = query.eq("kategorie", kategorie);
    if (vonDate) query = query.gte("ereignis_datum", vonDate);
    if (bisDate) query = query.lte("ereignis_datum", bisDate + "T23:59:59Z");

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
      if (familieId) query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("dokumentation GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/dokumentation
 * Anbieter legt neuen Dokumentations-Eintrag an.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    // Vitalwerte nur bei Kategorie vitalwerte
    const vitalFields = d.kategorie === "vitalwerte" ? {
      blutdruck_sys: d.blutdruck_sys,
      blutdruck_dia: d.blutdruck_dia,
      puls: d.puls,
      temperatur: d.temperatur,
      gewicht: d.gewicht,
      blutzucker: d.blutzucker,
      sauerstoff: d.sauerstoff,
    } : {};

    const medFields = d.kategorie === "medikamente" ? {
      medikament_name: d.medikament_name,
      medikament_dosis: d.medikament_dosis,
      medikament_gegeben: d.medikament_gegeben ?? false,
    } : {};

    const { data: entry, error } = await supabase
      .from("pflegedokumentation")
      .insert({
        anbieter_id: anbieter.id,
        familie_profile_id: d.familie_profile_id ?? null,
        care_worker_id: d.care_worker_id ?? null,
        kategorie: d.kategorie,
        titel: d.titel ?? null,
        inhalt: d.inhalt,
        ereignis_datum: d.ereignis_datum ?? new Date().toISOString(),
        erstellt_von: profile.id,
        ...vitalFields,
        ...medFields,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("dokumentation POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
