// ============================================
// API: /api/care-workers/[id]
// GET    — Einzelnen Care-Worker laden
// PATCH  — Care-Worker aktualisieren (Anbieter-Auth)
// DELETE — Care-Worker löschen (Anbieter-Auth)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const UpdateSchema = z.object({
  vorname:               z.string().min(1).max(100).optional(),
  nachname:              z.string().min(1).max(100).optional(),
  geburtsjahr:           z.number().int().optional(),
  sprachen:              z.array(z.string()).optional(),
  qualifikationen:       z.array(z.string()).optional(),
  zertifikate:           z.array(z.string()).optional(),
  berufserfahrung_jahre: z.number().int().optional(),
  stundensatz_ct:        z.number().int().min(0).optional(),
  verfuegbar_ab:         z.string().nullable().optional(),
  max_stunden_woche:     z.number().int().optional(),
  fuehrungszeugnis_vorhanden: z.boolean().optional(),
  fuehrungszeugnis_datum: z.string().nullable().optional(),
  bio:                   z.string().max(2000).nullable().optional(),
  plz:                   z.string().length(5).nullable().optional(),
  ort:                   z.string().max(100).nullable().optional(),
  lat:                   z.number().nullable().optional(),
  lng:                   z.number().nullable().optional(),
  aktiv:                 z.boolean().optional(),
  abwesend_bis:          z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("care_workers")
    .select(`
      *,
      anbieter:anbieter_id (id, name, logo_url, verifiziert, adresse, plz, ort)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;

  // Resolve caller's anbieter
  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Konto" }, { status: 403 });

  // Verify the worker belongs to this anbieter
  const { data: worker } = await supabase
    .from("care_workers")
    .select("id, anbieter_id")
    .eq("id", id)
    .eq("anbieter_id", anbieter.id)
    .single();

  if (!worker) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten", details: parsed.error.flatten() }, { status: 422 });
  }

  const { lat, lng, ...rest } = parsed.data;

  const updatePayload: Record<string, unknown> = { ...rest };
  if (lat != null && lng != null) {
    updatePayload.standort = `SRID=4326;POINT(${lng} ${lat})`;
  } else if (lat === null && lng === null) {
    updatePayload.standort = null;
  }

  const { data, error } = await supabase
    .from("care_workers")
    .update(updatePayload)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("[care-workers/patch]", error.message);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, updated: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;

  // Resolve caller's anbieter — only the owner may delete their worker
  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter-Konto" }, { status: 403 });

  const { error } = await supabase
    .from("care_workers")
    .delete()
    .eq("id", id)
    .eq("anbieter_id", anbieter.id); // ownership gate

  if (error) {
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
