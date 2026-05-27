import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("antraege")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    logger.error("GET /api/antraege failed", { error: String(e) });
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { typ, formulardaten } = body;

    if (!typ) {
      return NextResponse.json({ error: "Antragstyp fehlt" }, { status: 400 });
    }

    // Load profile data for prefilling
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, vorname, nachname, telefon, plz, ort")
      .eq("user_id", user.id)
      .single();

    // Merge profile data into formulardaten
    const prefilled = {
      antragsteller_vorname: profile?.vorname ?? "",
      antragsteller_nachname: profile?.nachname ?? "",
      antragsteller_email: user.email ?? "",
      antragsteller_telefon: profile?.telefon ?? "",
      antragsteller_plz: profile?.plz ?? "",
      antragsteller_ort: profile?.ort ?? "",
      datum: new Date().toLocaleDateString("de-DE"),
      ...formulardaten,
    };

    const { data, error } = await supabase
      .from("antraege")
      .insert({
        familie_id: profile?.id ?? user.id,
        typ,
        formulardaten: prefilled,
        status: "entwurf",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    logger.error("POST /api/antraege failed", { error: String(e) });
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
