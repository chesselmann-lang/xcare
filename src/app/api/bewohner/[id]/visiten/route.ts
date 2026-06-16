import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return (data as any)?.id ?? null;
}

// GET /api/bewohner/[id]/visiten
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: rawVisiten, error } = await (supabase as any)
      .from("pflegevisiten")
      .select("*, aufgaben:visite_aufgaben(id, aufgabe, verantwortlich, faellig_bis, prioritaet, erledigt)")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieterId)
      .order("datum", { ascending: false });

    if (error) throw error;
    const visiten = (rawVisiten ?? []) as any[];

    const stats = {
      gesamt: visiten.length,
      geplant: visiten.filter((v: any) => v.status === "geplant").length,
      durchgefuehrt: visiten.filter((v: any) => v.status === "durchgefuehrt").length,
      offeneAufgaben: visiten.flatMap((v: any) => v.aufgaben ?? []).filter((a: any) => !a.erledigt).length,
    };

    return NextResponse.json({ visiten, stats });
  } catch (err) {
    logger.error("GET /api/bewohner/[id]/visiten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/bewohner/[id]/visiten
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { datum, uhrzeit, typ, teilnehmer, allgemeinzustand, befunde, probleme,
            massnahmen, ziele, naechste_visite, hinweise, aufgaben } = body;

    const { data: raw, error } = await (supabase as any)
      .from("pflegevisiten")
      .insert({
        anbieter_id: anbieterId,
        bewohner_id: bewohnerId,
        datum: datum || new Date().toISOString().slice(0, 10),
        uhrzeit: uhrzeit || null,
        typ: typ || "regelvisite",
        status: "geplant",
        teilnehmer: teilnehmer || [],
        allgemeinzustand: allgemeinzustand || null,
        befunde: befunde || null,
        probleme: probleme || null,
        massnahmen: massnahmen || null,
        ziele: ziele || null,
        naechste_visite: naechste_visite || null,
        hinweise: hinweise || null,
        erstellt_von: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    const visite = raw as any;

    // Aufgaben anlegen
    if (Array.isArray(aufgaben) && aufgaben.length > 0) {
      await (supabase as any).from("visite_aufgaben").insert(
        aufgaben.filter((a: any) => a.aufgabe?.trim()).map((a: any) => ({
          visite_id: visite.id,
          anbieter_id: anbieterId,
          aufgabe: a.aufgabe.trim(),
          verantwortlich: a.verantwortlich || null,
          faellig_bis: a.faellig_bis || null,
          prioritaet: a.prioritaet || "normal",
        }))
      );
    }

    return NextResponse.json({ visite }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/bewohner/[id]/visiten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
