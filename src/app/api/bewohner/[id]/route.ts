import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  vorname: z.string().min(1).max(100).optional(),
  nachname: z.string().min(1).max(100).optional(),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  geschlecht: z.enum(["maennlich", "weiblich", "divers", "unbekannt"]).optional(),
  geburtsort: z.string().max(200).optional(),
  staatsangehoerigkeit: z.string().max(100).optional(),
  zimmer_nr: z.string().min(1).max(20).optional(),
  station: z.string().max(100).optional(),
  aufnahmedatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entlassdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["aktiv", "beurlaubt", "hospitalisiert", "entlassen", "verstorben"]).optional(),
  pflegegrad: z.number().int().min(1).max(5).nullable().optional(),
  pflegegrad_seit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  naechste_begutachtung: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  pflegeeinstufung_notiz: z.string().max(1000).optional(),
  hauptdiagnosen: z.array(z.object({ code: z.string().max(20), bezeichnung: z.string().max(200) })).max(20).optional(),
  allergien: z.array(z.object({ stoff: z.string().max(100), reaktion: z.string().max(200).optional(), schwere: z.string().max(50).optional() })).max(20).optional(),
  medikamenten_hinweis: z.string().max(2000).optional(),
  ernaehrungsbesonderheiten: z.string().max(1000).optional(),
  mobilitaet: z.enum(["selbststaendig", "hilfsmittel", "eingeschraenkt", "bettlaegerig"]).optional(),
  kommunikation: z.enum(["uneingeschraenkt", "eingeschraenkt", "nonverbal", "keine"]).optional(),
  orientierung: z.enum(["vollstaendig", "eingeschraenkt", "desorientiert"]).optional(),
  angehoerige: z.array(z.object({
    name: z.string().max(200),
    beziehung: z.string().max(100).optional(),
    telefon: z.string().max(50).optional(),
    email: z.string().email().optional(),
    hauptansprechpartner: z.boolean().default(false),
  })).max(10).optional(),
  notfallkontakt_name: z.string().max(200).optional(),
  notfallkontakt_telefon: z.string().max(50).optional(),
  rechtlicher_betreuer: z.string().max(300).optional(),
  krankenkasse: z.string().max(200).optional(),
  versicherungsnummer: z.string().max(50).optional(),
  pflegekasse: z.string().max(200).optional(),
  religion: z.string().max(100).optional(),
  sprache: z.string().max(100).optional(),
  notizen: z.string().max(3000).optional(),
});

/** GET /api/bewohner/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data, error } = await supabase
      .from("bewohner")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** PATCH /api/bewohner/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bewohner")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    logger.error("PATCH /api/bewohner/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/bewohner/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { error } = await supabase.from("bewohner").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ erfolg: true });
  } catch (err: unknown) {
    logger.error("DELETE /api/bewohner/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
