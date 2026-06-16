import { z } from "zod";

// ============================================================
// Primitive validators
// ============================================================
export const NrsWertSchema = z.number().int().min(0).max(10);
export const GewichtKgSchema = z.number().positive().max(499.9);
export const DatumSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Muss YYYY-MM-DD sein");
export const UhrzeitSchema = z.string().regex(/^\d{2}:\d{2}$/, "Muss HH:MM sein").optional();

// ============================================================
// Branded types
// ============================================================
export const BewohnerIdSchema = z.string().uuid().brand<"BewohnerId">();
export const AnbieterIdSchema = z.string().uuid().brand<"AnbieterId">();

export type BewohnerId = z.infer<typeof BewohnerIdSchema>;
export type AnbieterId = z.infer<typeof AnbieterIdSchema>;

// ============================================================
// Schmerz
// ============================================================
export const SchmerzEintragCreateSchema = z.object({
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  datum: DatumSchema,
  uhrzeit: UhrzeitSchema,
  nrs_wert: NrsWertSchema,
  lokalisation: z.string().min(1).max(200).optional(),
  charakter: z.string().max(200).optional(),
  begleiterscheinungen: z.string().max(500).optional(),
  massnahmen: z.string().max(500).optional(),
  massnahmen_wirkung: z.string().max(200).optional(),
  notizen: z.string().max(1000).optional(),
});

export const SchmerzAssessmentCreateSchema = z.object({
  type: z.literal("assessment"),
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  datum: DatumSchema,
  instrument: z.string().min(1).max(100),
  gesamtscore: z.number().int().optional(),
  zielwert_nrs: NrsWertSchema.optional(),
  massnahmenplan: z.string().max(2000).optional(),
  verlauf_kommentar: z.string().max(1000).optional(),
  naechste_bewertung: DatumSchema.optional(),
});

export const SchmerzPostSchema = z.discriminatedUnion("type", [
  SchmerzAssessmentCreateSchema,
  SchmerzEintragCreateSchema.extend({ type: z.literal("eintrag").optional() }),
]);

export type SchmerzEintragCreate = z.infer<typeof SchmerzEintragCreateSchema>;
export type SchmerzAssessmentCreate = z.infer<typeof SchmerzAssessmentCreateSchema>;

// ============================================================
// Gewicht / Vitalwerte
// ============================================================
export const GewichtsEintragCreateSchema = z.object({
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  datum: DatumSchema,
  uhrzeit: UhrzeitSchema,
  gewicht_kg: GewichtKgSchema,
  bmi: z.number().positive().max(80).optional(),
  zustand: z.string().max(200).optional(),
  notizen: z.string().max(500).optional(),
});

export const VitalwertEintragCreateSchema = z.object({
  type: z.literal("vital"),
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  datum: DatumSchema,
  uhrzeit: UhrzeitSchema,
  blutdruck_systolisch: z.number().int().min(50).max(300).optional(),
  blutdruck_diastolisch: z.number().int().min(20).max(200).optional(),
  herzfrequenz: z.number().int().min(20).max(300).optional(),
  temperatur: z.number().min(30).max(45).optional(),
  sauerstoffsaettigung: z.number().int().min(50).max(100).optional(),
  notizen: z.string().max(500).optional(),
});

export const NormwerteUpsertSchema = z.object({
  type: z.literal("normwerte"),
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  zielgewicht_kg: GewichtKgSchema.optional(),
  gewicht_untergrenzen_kg: GewichtKgSchema.optional(),
  gewicht_obergrenzen_kg: GewichtKgSchema.optional(),
  blutdruck_ziel_systolisch: z.number().int().min(50).max(300).optional(),
  blutdruck_ziel_diastolisch: z.number().int().min(20).max(200).optional(),
});

export const GewichtPostSchema = z.discriminatedUnion("type", [
  VitalwertEintragCreateSchema,
  NormwerteUpsertSchema,
  GewichtsEintragCreateSchema.extend({ type: z.literal("gewicht").optional() }),
]);

export type GewichtsEintragCreate = z.infer<typeof GewichtsEintragCreateSchema>;
export type VitalwertEintragCreate = z.infer<typeof VitalwertEintragCreateSchema>;
export type NormwerteUpsert = z.infer<typeof NormwerteUpsertSchema>;

// ============================================================
// Sturzprotokoll
// ============================================================
export const SturzEreignisCreateSchema = z.object({
  bewohner_id: BewohnerIdSchema,
  anbieter_id: AnbieterIdSchema,
  datum: DatumSchema,
  uhrzeit: UhrzeitSchema,
  schweregrad: z.enum(["leicht", "mittel", "schwer", "kritisch"]).optional(),
  ort: z.string().max(200).optional(),
  umstaende: z.string().max(1000).optional(),
  verletzungen: z.string().max(500).optional(),
  massnahmen_sofort: z.string().max(500).optional(),
  arzt_informiert: z.boolean().optional(),
  angehoerige_informiert: z.boolean().optional(),
  notizen: z.string().max(1000).optional(),
});

export type SturzEreignisCreate = z.infer<typeof SturzEreignisCreateSchema>;

// ============================================================
// API Response wrapper
// ============================================================
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(error: string, status?: number): ActionResult<never> {
  return { ok: false, error, status };
}
