// ============================================
// API: /api/anspruch/save
// POST — Speichert ein Anspruchs-Ergebnis für den eingeloggten Nutzer.
// Authenticated. Deterministisch gespeichert (kein LLM-Output).
// ============================================

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SaveSchema = z.object({
  ergebnis: z.record(z.unknown()),    // vollständiges AnspruchsErgebnis
  lebenslage: z.string().min(1),
  bezeichnung: z.string().max(100).optional(),
  gesamt_monatlich_eur: z.number().optional(),
  gesamt_jaehrlich_eur: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Daten", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { ergebnis, lebenslage, bezeichnung, gesamt_monatlich_eur, gesamt_jaehrlich_eur } = parsed.data;

  const { data, error } = await supabase
    .from("anspruchs_profile")
    .insert({
      user_id: user.id,
      lebenslage,
      bezeichnung: bezeichnung ?? null,
      ergebnis,
      gesamt_monatlich_eur: gesamt_monatlich_eur ?? null,
      gesamt_jaehrlich_eur: gesamt_jaehrlich_eur ?? null,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("[anspruch/save] DB error:", error.message);
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, saved: true }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lebenslage = url.searchParams.get("lebenslage");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 50);

  let query = supabase
    .from("anspruchs_profile")
    .select("id, lebenslage, bezeichnung, gesamt_monatlich_eur, gesamt_jaehrlich_eur, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (lebenslage) {
    query = query.eq("lebenslage", lebenslage);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  }

  const { error } = await supabase
    .from("anspruchs_profile")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // RLS + doppelte Sicherheit

  if (error) {
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
