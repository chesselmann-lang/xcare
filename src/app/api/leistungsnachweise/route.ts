import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  bewohner_id: z.string().uuid().nullable().optional(),
  tour_einsatz_id: z.string().uuid().nullable().optional(),
  leistungsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  abrechnungsmonat: z.string().regex(/^\d{4}-\d{2}$/),
  kunde_name: z.string().min(1).max(200),
  kunde_adresse: z.string().max(500).optional(),
  krankenkasse: z.string().max(200).optional(),
  versicherungsnummer: z.string().max(50).optional(),
  leistungsart: z.string().min(1).max(200),
  leistungsminuten: z.number().int().min(1).max(480).optional(),
  einheit: z.enum(["Minuten", "Einsatz", "Stunden"]).optional(),
  einzelpreis_ct: z.number().int().min(0).optional(),
  menge: z.number().min(0.01).max(9999).optional(),
  status: z.enum(["offen", "eingereicht", "genehmigt", "abgelehnt", "storniert"]).optional(),
  eingereicht_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  genehmigt_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  abrechnungs_referenz: z.string().max(100).optional(),
  ik_anbieter: z.string().max(20).optional(),
  ik_kasse: z.string().max(20).optional(),
  notizen: z.string().max(1000).optional(),
});

/** GET /api/leistungsnachweise — list with filters */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const monat = searchParams.get("monat");       // 'YYYY-MM'
    const status = searchParams.get("status");
    const bewohnerId = searchParams.get("bewohner_id");
    const krankenkasse = searchParams.get("krankenkasse");

    let query = supabase
      .from("leistungsnachweise")
      .select(`
        id, leistungsdatum, abrechnungsmonat, kunde_name, kunde_adresse,
        krankenkasse, versicherungsnummer, leistungsart, leistungsminuten,
        einheit, einzelpreis_ct, menge, gesamtbetrag_ct,
        status, eingereicht_am, genehmigt_am, abrechnungs_referenz,
        ik_anbieter, ik_kasse, notizen, bewohner_id, tour_einsatz_id, created_at
      `)
      .eq("anbieter_id", anbieter.id)
      .order("leistungsdatum", { ascending: false })
      .limit(500);

    if (monat) query = query.eq("abrechnungsmonat", monat);
    if (status) query = query.eq("status", status);
    if (bewohnerId) query = query.eq("bewohner_id", bewohnerId);
    if (krankenkasse) query = query.ilike("krankenkasse", `%${krankenkasse}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/leistungsnachweise error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/leistungsnachweise — create entry */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leistungsnachweise")
      .insert({ ...parsed.data, anbieter_id: anbieter.id })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/leistungsnachweise error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
