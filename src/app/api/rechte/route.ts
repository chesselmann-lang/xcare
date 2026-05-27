// ============================================================
// API: /api/rechte
// GET  — Alle aktiven Pflegeperson-Rechte (public, gecacht)
// POST — Ergebnis einer Rechte-Prüfung speichern (auth required)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// ── GET /api/rechte ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Moderate rate limiting — public endpoint
  const rateLimitResult = await rateLimit(request, { limit: 60, window: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
      { status: 429 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pflegeperson_rechte")
    .select(
      "id, gesetz, paragraph, titel, beschreibung, voraussetzungen, dauer, leistung, antrag_bei, kategorie"
    )
    .eq("aktiv", true)
    .order("kategorie")
    .order("gesetz");

  if (error) {
    console.error("[GET /api/rechte]", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Rechte." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { rechte: data ?? [] },
    {
      headers: {
        // Cache 1 hour — master data changes rarely
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

// ── POST /api/rechte — Speichert eine Rechte-Prüfung ────────────────────────

export async function POST(request: NextRequest) {
  // Auth required — no anonymous saves
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht angemeldet. Bitte zuerst einloggen." },
      { status: 401 }
    );
  }

  // Rate limit per user
  const rateLimitResult = await rateLimit(request, { limit: 20, window: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warten Sie einen Moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("situation" in body) ||
    !("ergebnis" in body)
  ) {
    return NextResponse.json(
      { error: "Fehlende Felder: situation und ergebnis sind erforderlich." },
      { status: 400 }
    );
  }

  const { situation, ergebnis } = body as {
    situation: Record<string, unknown>;
    ergebnis: Record<string, unknown>;
  };

  if (typeof situation !== "object" || typeof ergebnis !== "object") {
    return NextResponse.json(
      { error: "Ungültiges Format für situation oder ergebnis." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("rechte_checks")
    .insert({
      user_id: user.id,
      situation,
      ergebnis,
    })
    .select("id, erstellt_am")
    .single();

  if (error) {
    console.error("[POST /api/rechte]", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Prüfung." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id, erstellt_am: data.erstellt_am });
}
