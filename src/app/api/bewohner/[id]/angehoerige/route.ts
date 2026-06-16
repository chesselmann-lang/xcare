import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

// GET /api/bewohner/[id]/angehoerige
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const { data } = await supabase
      .from("bewohner_angehoerige")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter.id)
      .order("erstellt_am");

    return NextResponse.json({ angehoerige: data ?? [] });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/angehoerige", { bewohnerId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// POST /api/bewohner/[id]/angehoerige  → Angehörigen einladen
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const { email, name, beziehung, sieht_pflegebericht, sieht_vitalwerte, sieht_medikamente, sieht_pflegeplanung } = body;

    if (!email?.trim()) return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });

    // Token generieren
    const token = randomBytes(32).toString("hex");

    // Prüfe ob bereits ein Profil mit dieser E-Mail existiert
    const { data: existingProfile } = await supabase
      .from("profiles").select("id").eq("email", email.trim().toLowerCase()).single();

    const { data, error } = await supabase
      .from("bewohner_angehoerige")
      .upsert({
        bewohner_id: bewohnerId,
        anbieter_id: anbieter.id,
        profile_id: existingProfile?.id ?? null,
        email: email.trim().toLowerCase(),
        name: name?.trim() ?? null,
        beziehung: beziehung ?? "sonstiges",
        sieht_pflegebericht: sieht_pflegebericht ?? true,
        sieht_vitalwerte: sieht_vitalwerte ?? true,
        sieht_medikamente: sieht_medikamente ?? false,
        sieht_pflegeplanung: sieht_pflegeplanung ?? false,
        einladungs_token: token,
        aktiv: true,
      }, { onConflict: "bewohner_id,email" })
      .select()
      .single();

    if (error) {
      logger.error("angehoerige upsert error", { bewohnerId, error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 400 });
    }

    return NextResponse.json({ angehoeriger: data, token });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/angehoerige", { bewohnerId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// DELETE /api/bewohner/[id]/angehoerige?angehoerigen_id=...
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();

    const angehoerigId = req.nextUrl.searchParams.get("angehoerigen_id");
    if (!angehoerigId) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

    await supabase
      .from("bewohner_angehoerige")
      .update({ aktiv: false })
      .eq("id", angehoerigId)
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter!.id);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logger.error("DELETE /api/bewohner/[id]/angehoerige", { bewohnerId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
