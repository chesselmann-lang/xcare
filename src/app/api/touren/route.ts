import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const EinsatzSchema = z.object({
  bewohner_id: z.string().uuid().optional(),
  kunde_name: z.string().min(1).max(200),
  kunde_adresse: z.string().min(1).max(500),
  kunde_telefon: z.string().max(50).optional(),
  geplante_ankunft: z.string().regex(/^\d{2}:\d{2}$/),
  geplante_abfahrt: z.string().regex(/^\d{2}:\d{2}$/),
  leistungsart: z.string().max(200).optional(),
  leistungsminuten: z.number().int().min(1).max(480).optional(),
  prioritaet: z.enum(["normal", "hoch", "dringend"]).default("normal"),
  qualifikation_noetig: z.string().max(100).optional(),
  reihenfolge: z.number().int().min(1).default(1),
});

const CreateTourSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(200),
  fahrer_id: z.string().uuid().optional(),
  fahrzeug: z.string().max(100).optional(),
  start_ort: z.string().max(300).optional(),
  end_ort: z.string().max(300).optional(),
  geplante_km: z.number().min(0).max(9999).optional(),
  notizen: z.string().max(2000).optional(),
  einsaetze: z.array(EinsatzSchema).max(50).default([]),
});

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

/** GET /api/touren?datum=2026-06-12&status=geplant */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    const url = new URL(req.url);
    const datum = url.searchParams.get("datum");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("touren")
      .select(`
        id, datum, name, fahrzeug, status, start_ort, end_ort, geplante_km, tatsaechliche_km, notizen, created_at,
        fahrer:profiles!fahrer_id(vorname, nachname),
        tour_einsaetze(id, kunde_name, kunde_adresse, geplante_ankunft, geplante_abfahrt, status, prioritaet, reihenfolge, leistungsart, leistungsminuten)
      `)
      .eq("anbieter_id", anbieterId)
      .order("datum", { ascending: false })
      .order("name");

    if (datum) query = query.eq("datum", datum);
    if (status) query = query.eq("status", status);

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    logger.error("GET /api/touren error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/touren */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = CreateTourSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { einsaetze, ...tourData } = parsed.data;

    const { data: tour, error: tourErr } = await supabase
      .from("touren")
      .insert({ ...tourData, anbieter_id: anbieterId })
      .select()
      .single();
    if (tourErr) throw tourErr;

    if (einsaetze.length > 0) {
      const rows = einsaetze.map((e) => ({ ...e, tour_id: tour.id, anbieter_id: anbieterId }));
      const { error: eErr } = await supabase.from("tour_einsaetze").insert(rows);
      if (eErr) throw eErr;
    }

    return NextResponse.json(tour, { status: 201 });
  } catch (err) {
    logger.error("POST /api/touren error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
