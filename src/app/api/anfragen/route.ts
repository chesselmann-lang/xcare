import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isUuid, isLebenslage, maxLen } from "@/lib/validate";

export async function POST(req: NextRequest) {
  // Rate limit: 5 new Anfragen per 5 minutes per IP to prevent spam
  const rl = await rateLimit(req, { limit: 5, window: 300 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { anbieter_id, leistung_id, lebenslage, beschreibung } = body;

    if (!isUuid(anbieter_id))
      return NextResponse.json({ error: "Ungültige anbieter_id" }, { status: 400 });
    if (!isLebenslage(lebenslage))
      return NextResponse.json({ error: "Ungültige Lebenslage" }, { status: 400 });
    if (!beschreibung?.trim())
      return NextResponse.json({ error: "Beschreibung fehlt" }, { status: 400 });
    if (!maxLen(beschreibung.trim(), 2000))
      return NextResponse.json({ error: "Beschreibung zu lang (max. 2000 Zeichen)" }, { status: 400 });
    if (leistung_id !== undefined && leistung_id !== null && !isUuid(leistung_id))
      return NextResponse.json({ error: "Ungültige leistung_id" }, { status: 400 });

    // Get familie profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 400 });
    }

    if (profile.role === "anbieter") {
      return NextResponse.json({ error: "Anbieter können keine Anfragen stellen" }, { status: 403 });
    }

    // Check if anfrage already exists to prevent duplicates
    const { data: existing } = await supabase
      .from("anfragen")
      .select("id")
      .eq("familie_id", profile.id)
      .eq("anbieter_id", anbieter_id)
      .in("status", ["offen", "in_bearbeitung", "angeboten"])
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Sie haben bereits eine offene Anfrage bei diesem Anbieter." },
        { status: 409 }
      );
    }

    // Create anfrage
    const { data: anfrage, error: insertErr } = await supabase
      .from("anfragen")
      .insert({
        familie_id: profile.id,
        anbieter_id,
        leistung_id: leistung_id ?? null,
        lebenslage,
        beschreibung: beschreibung.trim(),
        status: "offen",
      })
      .select()
      .single();

    if (insertErr) {
      logger.error("Anfrage insert error", { error: insertErr.message });
      return NextResponse.json({ error: "Anfrage konnte nicht erstellt werden" }, { status: 500 });
    }

    // Log initial status to history
    await supabase.from("anfragen_historie").insert({
      anfrage_id: anfrage.id,
      alter_status: null,
      neuer_status: "offen",
      geaendert_von: profile.id,
    }).then(() => {/* ignore */}).catch(() => {/* ignore */});

    // Trigger Inngest event for email notification
    try {
      const { data: anbieterData } = await supabase
        .from("anbieter")
        .select("email, name, profiles!profile_id(vorname, nachname)")
        .eq("id", anbieter_id)
        .single();

      const { data: familieProfile } = await supabase
        .from("profiles")
        .select("vorname, nachname")
        .eq("id", profile.id)
        .single();

      if (anbieterData?.email && process.env.INNGEST_EVENT_KEY) {
        await fetch("https://inn.gs/e/" + process.env.INNGEST_EVENT_KEY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "anfrage/created",
            data: {
              anfrage_id: anfrage.id,
              anbieter_email: anbieterData.email,
              anbieter_name: anbieterData.name,
              familie_name: `${familieProfile?.vorname ?? ""} ${familieProfile?.nachname ?? ""}`.trim() || "Familie",
              lebenslage,
            },
          }),
        });
      }
    } catch (emailErr) {
      // Non-critical: email notification failed, don't fail the request (S279)
      logger.warn("Anfrage email notification failed", { error: String(emailErr) });
    }

    return NextResponse.json({ anfrage }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/anfragen unhandled error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
