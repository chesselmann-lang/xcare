// ============================================
// API: /api/care-workers
// GET  — Suche nach Care-Workern mit PostGIS ST_DWithin Radius-Filter
// POST — Care-Worker anlegen (Anbieter-Auth erforderlich)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// -------- Schemas --------
const SearchSchema = z.object({
  lat:           z.coerce.number().min(-90).max(90).optional(),
  lng:           z.coerce.number().min(-180).max(180).optional(),
  radius_km:     z.coerce.number().min(1).max(200).default(25),
  qualifikation: z.string().optional(),
  sprache:       z.string().optional(),
  max_stundensatz_ct: z.coerce.number().min(0).optional(),
  verfuegbar_ab: z.string().optional(),
  fuehrungszeugnis: z.coerce.boolean().optional(),
  limit:         z.coerce.number().min(1).max(50).default(20),
  offset:        z.coerce.number().min(0).default(0),
});

const CreateSchema = z.object({
  vorname:               z.string().min(1).max(100),
  nachname:              z.string().min(1).max(100),
  geburtsjahr:           z.number().int().min(1900).max(2010).optional(),
  sprachen:              z.array(z.string()).default([]),
  qualifikationen:       z.array(z.string()).default([]),
  zertifikate:           z.array(z.string()).default([]),
  berufserfahrung_jahre: z.number().int().min(0).max(60).optional(),
  stundensatz_ct:        z.number().int().min(0).max(99999),
  verfuegbar_ab:         z.string().optional(),
  max_stunden_woche:     z.number().int().min(1).max(60).optional(),
  fuehrungszeugnis_vorhanden: z.boolean().default(false),
  fuehrungszeugnis_datum: z.string().optional(),
  bio:                   z.string().max(2000).optional(),
  plz:                   z.string().length(5).optional(),
  ort:                   z.string().max(100).optional(),
  lat:                   z.number().min(-90).max(90).optional(),
  lng:                   z.number().min(-180).max(180).optional(),
});

// -------- GET --------
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const url = new URL(request.url);

  const parsed = SearchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Parameter", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const {
    lat, lng, radius_km,
    qualifikation, sprache,
    max_stundensatz_ct, verfuegbar_ab,
    fuehrungszeugnis, limit, offset,
  } = parsed.data;

  // If lat/lng given → use PostGIS ST_DWithin RPC; otherwise plain query
  if (lat != null && lng != null) {
    // RPC function defined below in migration performs the spatial join
    const { data, error } = await supabase.rpc("suche_care_workers_geo", {
      p_lat:              lat,
      p_lng:              lng,
      p_radius_m:         radius_km * 1000,
      p_qualifikation:    qualifikation ?? null,
      p_sprache:          sprache ?? null,
      p_max_stundensatz:  max_stundensatz_ct ?? null,
      p_verfuegbar_ab:    verfuegbar_ab ?? null,
      p_fuehrungszeugnis: fuehrungszeugnis ?? null,
      p_limit:            limit,
      p_offset:           offset,
    });

    if (error) {
      console.error("[care-workers/geo] RPC error:", error.message);
      return NextResponse.json({ error: "Suche fehlgeschlagen" }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  }

  // Fallback: plain filter without geo
  let query = supabase
    .from("care_workers")
    .select(`
      id, vorname, nachname, sprachen, qualifikationen, zertifikate,
      berufserfahrung_jahre, stundensatz_ct, verfuegbar_ab, max_stunden_woche,
      fuehrungszeugnis_vorhanden, bio, plz, ort, aktiv,
      anbieter:anbieter_id (id, name, logo_url, verifiziert)
    `)
    .eq("aktiv", true)
    .order("stundensatz_ct", { ascending: true })
    .range(offset, offset + limit - 1);

  if (qualifikation) {
    query = query.contains("qualifikationen", [qualifikation]);
  }
  if (sprache) {
    query = query.contains("sprachen", [sprache]);
  }
  if (max_stundensatz_ct != null) {
    query = query.lte("stundensatz_ct", max_stundensatz_ct);
  }
  if (fuehrungszeugnis != null) {
    query = query.eq("fuehrungszeugnis_vorhanden", fuehrungszeugnis);
  }
  if (verfuegbar_ab) {
    query = query.or(`verfuegbar_ab.is.null,verfuegbar_ab.lte.${verfuegbar_ab}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[care-workers] query error:", error.message);
    return NextResponse.json({ error: "Suche fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}

// -------- POST --------
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // Find Anbieter for this user
  const { data: anbieter, error: abErr } = await supabase
    .from("anbieter")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (abErr || !anbieter) {
    return NextResponse.json({ error: "Kein Anbieter-Profil gefunden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Daten", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { lat, lng, ...rest } = parsed.data;

  // Build geo point if coordinates provided
  const standort = (lat != null && lng != null)
    ? `SRID=4326;POINT(${lng} ${lat})`
    : null;

  const { data, error } = await supabase
    .from("care_workers")
    .insert({
      ...rest,
      anbieter_id: anbieter.id,
      standort,
      verfuegbar_ab:  rest.verfuegbar_ab ?? null,
      fuehrungszeugnis_datum: rest.fuehrungszeugnis_datum ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[care-workers/post]", error.message);
    return NextResponse.json({ error: "Erstellen fehlgeschlagen", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, created: true }, { status: 201 });
}
