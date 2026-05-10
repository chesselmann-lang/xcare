// ============================================
// API: /api/anspruch
// POST — Berechnet Ansprüche deterministisch
// Kein LLM, kein externer Service, kein Netzwerk.
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { berechneAnsprueche } from "@/lib/anspruch/engine";
import { rateLimit } from "@/lib/rate-limit";

const AnspruchsInputSchema = z.object({
  alter: z.number().int().min(0).max(130),
  familienstand: z.enum(["ledig", "verheiratet", "geschieden", "verwitwet", "eingetragen"]),
  wohnform: z.enum(["privat", "betreutes_wohnen", "wohngemeinschaft", "heim"]),
  versicherungsart: z.enum(["gkv", "pkv", "beihilfe"]),
  pflegegrad: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  gdb: z.union([
    z.literal(20), z.literal(30), z.literal(40), z.literal(50),
    z.literal(60), z.literal(70), z.literal(80), z.literal(90), z.literal(100),
  ]).optional(),
  merkzeichen: z.array(z.enum(["G", "aG", "B", "H", "Bl", "Gl", "TBl", "RF"])).optional(),
  kinder: z.array(z.object({
    alter: z.number().int().min(0).max(25),
    in_kita: z.boolean().optional(),
    in_tagespflege: z.boolean().optional(),
    behinderung: z.boolean().optional(),
    pflegebedarf: z.boolean().optional(),
  })).optional(),
  erwerbstaetig: z.boolean().optional(),
  haushaltshilfe_aufwendungen_eur: z.number().min(0).max(200000).optional(),
  pflege_aufwendungen_eur: z.number().min(0).max(200000).optional(),
  zu_versteuerndes_einkommen_eur: z.number().min(0).optional(),
  pflege_durch_angehoerige: z.boolean().optional(),
  pflegeperson_berufstaetig: z.boolean().optional(),
  verhinderungspflege_genutzt_eur: z.number().min(0).optional(),
  kurzzeitpflege_genutzt_eur: z.number().min(0).optional(),
  lebenslage: z.enum([
    "alter_pflege",
    "eingliederung_behinderung",
    "erwerbsleben_vereinbarkeit",
    "krankheit_genesung",
    "geburt_fruehe_kindheit",
    "schulkind_jugend",
    "hospiz_palliativ",
    "trauer_nachlass",
  ]),
});

export async function POST(request: NextRequest) {
  // Rate-Limit: 30 Anfragen/Minute pro IP
  const rateLimitResult = await rateLimit(request, { limit: 30, window: 60 });
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
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = AnspruchsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Deterministische Berechnung — kein await, kein LLM
  const ergebnis = berechneAnsprueche(parsed.data);

  return NextResponse.json(ergebnis, {
    headers: {
      "Cache-Control": "no-store", // personalisierte Daten niemals cachen
      "X-Computation": "deterministic", // Audit-Trail: kein LLM
    },
  });
}
