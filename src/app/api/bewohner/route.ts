import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const AngehoerigeSchema = z.object({
  name: z.string().max(200),
  beziehung: z.string().max(100).optional(),
  telefon: z.string().max(50).optional(),
  email: z.string().email().optional(),
  hauptansprechpartner: z.boolean().default(false),
});

const CreateSchema = z.object({
  vorname: z.string().min(1).max(100),
  nachname: z.string().min(1).max(100),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geschlecht: z.enum(["maennlich", "weiblich", "divers", "unbekannt"]).default("unbekannt"),
  geburtsort: z.string().max(200).optional(),
  staatsangehoerigkeit: z.string().max(100).optional(),
  zimmer_nr: z.string().min(1).max(20),
  station: z.string().max(100).optional(),
  aufnahmedatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["aktiv", "beurlaubt", "hospitalisiert", "entlassen", "verstorben"]).default("aktiv"),
  pflegegrad: z.number().int().min(1).max(5).optional(),
  pflegegrad_seit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  naechste_begutachtung: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pflegeeinstufung_notiz: z.string().max(1000).optional(),
  hauptdiagnosen: z.array(z.object({ code: z.string().max(20), bezeichnung: z.string().max(200) })).max(20).default([]),
  allergien: z.array(z.object({ stoff: z.string().max(100), reaktion: z.string().max(200).optional(), schwere: z.string().max(50).optional() })).max(20).default([]),
  medikamenten_hinweis: z.string().max(2000).optional(),
  ernaehrungsbesonderheiten: z.string().max(1000).optional(),
  mobilitaet: z.enum(["selbststaendig", "hilfsmittel", "eingeschraenkt", "bettlaegerig"]).default("selbststaendig"),
  kommunikation: z.enum(["uneingeschraenkt", "eingeschraenkt", "nonverbal", "keine"]).default("uneingeschraenkt"),
  orientierung: z.enum(["vollstaendig", "eingeschraenkt", "desorientiert"]).default("vollstaendig"),
  angehoerige: z.array(AngehoerigeSchema).max(10).default([]),
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

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

/** GET /api/bewohner?status=aktiv&search=Müller */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const pflegegrad = url.searchParams.get("pflegegrad");

    let query = supabase
      .from("bewohner")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, zimmer_nr, station, status, pflegegrad, aufnahmedatum, mobilitaet, kommunikation, notfallkontakt_name, notfallkontakt_telefon, created_at")
      .eq("anbieter_id", anbieterId)
      .order("nachname")
      .order("vorname");

    if (status) query = query.eq("status", status);
    if (pflegegrad) query = query.eq("pflegegrad", parseInt(pflegegrad));
    if (search) query = query.or(`nachname.ilike.%${search}%,vorname.ilike.%${search}%,zimmer_nr.ilike.%${search}%`);

    const { data, error } = await query.limit(200);
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    logger.error("GET /api/bewohner error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/bewohner */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bewohner")
      .insert({ ...parsed.data, anbieter_id: anbieterId })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/bewohner error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
