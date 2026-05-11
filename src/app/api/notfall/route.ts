import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PlanSchema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  blutgruppe: z.string().max(10).optional(),
  allergien: z.string().max(2000).optional(),
  chronische_erkrankungen: z.string().max(2000).optional(),
  implantate: z.string().max(1000).optional(),
  dnr_verfuegung: z.boolean().optional(),
  patientenverfuegung_vorhanden: z.boolean().optional(),
  besondere_hinweise: z.string().max(2000).optional(),
  medikamente_notfall: z.string().max(2000).optional(),
  krankenhaus_name: z.string().max(200).optional(),
  krankenhaus_adresse: z.string().max(500).optional(),
  hausarzt_name: z.string().max(200).optional(),
  hausarzt_telefon: z.string().max(50).optional(),
  krankenkasse: z.string().max(200).optional(),
  versicherungsnummer: z.string().max(100).optional(),
});

const KontaktSchema = z.object({
  familie_profile_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  beziehung: z.string().max(100),
  telefon_1: z.string().min(1).max(50),
  telefon_2: z.string().max(50).optional(),
  email: z.string().email().optional(),
  erreichbar_von: z.string().max(200).optional(),
  prioritaet: z.number().int().min(1).max(10).default(1),
  ist_bevollmaechtigt: z.boolean().optional(),
  notizen: z.string().max(1000).optional(),
});

/**
 * GET /api/notfall — Notfallplan + Kontakte für eine Familie
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();

    const url = new URL(req.url);
    const familieId = url.searchParams.get("familie_profile_id");

    let targetFamilieId = familieId;
    if (profile?.role !== "anbieter") targetFamilieId = profile?.id;

    if (!targetFamilieId) return NextResponse.json({ error: "familie_profile_id erforderlich" }, { status: 400 });

    const [{ data: plan }, { data: kontakte }] = await Promise.all([
      supabase
        .from("notfallplaene")
        .select("*")
        .eq("familie_profile_id", targetFamilieId)
        .eq("aktiv", true)
        .single(),
      supabase
        .from("notfallkontakte")
        .select("*")
        .eq("familie_profile_id", targetFamilieId)
        .order("prioritaet"),
    ]);

    return NextResponse.json({ plan: plan ?? null, kontakte: kontakte ?? [] });
  } catch (err) {
    logger.error("notfall GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/notfall — Notfallplan upsert
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const body = await req.json();

    // Kontakt erstellen vs Plan upserten
    if (body._type === "kontakt") {
      const parsed = KontaktSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
      const d = parsed.data;

      let anbieterId: string | null = null;
      if (profile.role === "anbieter") {
        const { data: a } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
        anbieterId = a?.id ?? null;
      }

      const { data: k, error } = await supabase
        .from("notfallkontakte")
        .insert({ ...d, anbieter_id: anbieterId })
        .select().single();

      if (error) throw error;
      return NextResponse.json(k, { status: 201 });
    }

    // Plan upsert
    const parsed = PlanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    let familieProfileId = d.familie_profile_id;
    let anbieterId: string | null = null;

    if (profile.role === "anbieter") {
      if (!familieProfileId) return NextResponse.json({ error: "familie_profile_id erforderlich" }, { status: 422 });
      const { data: a } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
      anbieterId = a?.id ?? null;
    } else {
      familieProfileId = profile.id;
    }

    const { data: plan, error } = await supabase
      .from("notfallplaene")
      .upsert({ ...d, familie_profile_id: familieProfileId, anbieter_id: anbieterId, aktiv: true },
        { onConflict: "familie_profile_id" })
      .select().single();

    if (error) throw error;
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    logger.error("notfall POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
