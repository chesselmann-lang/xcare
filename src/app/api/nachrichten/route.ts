import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { anfrage_id, inhalt } = body as { anfrage_id: string; inhalt: string };

    if (!anfrage_id || !inhalt?.trim()) {
      return NextResponse.json({ error: "anfrage_id und inhalt sind erforderlich" }, { status: 400 });
    }

    if (inhalt.trim().length > 2000) {
      return NextResponse.json({ error: "Nachricht zu lang (max. 2000 Zeichen)" }, { status: 400 });
    }

    // Get current profile (include name fields for notification sender label)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, vorname, nachname")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    // Verify sender is party to this anfrage
    const { data: anfrage } = await supabase
      .from("anfragen")
      .select("id, familie_id, anbieter_id")
      .eq("id", anfrage_id)
      .single();

    if (!anfrage) {
      return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
    }

    let isParty = false;
    if (profile.role === "familie" && anfrage.familie_id === profile.id) {
      isParty = true;
    } else if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter")
        .select("id")
        .eq("profile_id", profile.id)
        .single();
      if (anbieter && anfrage.anbieter_id === anbieter.id) {
        isParty = true;
      }
    }

    if (!isParty) {
      return NextResponse.json({ error: "Kein Zugriff auf diese Anfrage" }, { status: 403 });
    }

    // Insert message
    const { data, error } = await supabase
      .from("nachrichten")
      .insert({
        anfrage_id,
        sender_id: profile.id,
        inhalt: inhalt.trim(),
      })
      .select()
      .single();

    if (error) {
      logger.error("nachrichten POST error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fire email notification to the other party (non-blocking)
    if (process.env.INNGEST_EVENT_KEY) {
      try {
        // Determine the recipient (the other party in the anfrage)
        let empfaengerEmail: string | null = null;
        let empfaengerName: string | null = null;

        const senderName = `${profile.vorname ?? ""} ${profile.nachname ?? ""}`.trim() || "xcare-Nutzer";

        if (profile.role === "familie") {
          // Sender is familie → notify anbieter
          const { data: anbieterData } = await supabase
            .from("anbieter")
            .select("email, name")
            .eq("id", anfrage.anbieter_id)
            .single();
          empfaengerEmail = anbieterData?.email ?? null;
          empfaengerName = anbieterData?.name ?? null;
        } else if (profile.role === "anbieter") {
          // Sender is anbieter → notify familie
          const { data: familieProfile } = await supabase
            .from("profiles")
            .select("email, vorname, nachname")
            .eq("id", anfrage.familie_id)
            .single();
          empfaengerEmail = (familieProfile as { email?: string })?.email ?? null;
          empfaengerName = familieProfile
            ? `${familieProfile.vorname ?? ""} ${familieProfile.nachname ?? ""}`.trim() || "Familie"
            : null;
        }

        if (empfaengerEmail && empfaengerName) {
          fetch("https://inn.gs/e/" + process.env.INNGEST_EVENT_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "nachricht/created",
              data: {
                anfrage_id,
                empfaenger_email: empfaengerEmail,
                empfaenger_name: empfaengerName,
                sender_name: senderName,
                vorschau: inhalt.trim(),
              },
            }),
          }).catch(() => {});
        }
      } catch {
        // Non-critical — notification failure doesn't block message delivery
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    logger.error("nachrichten POST unexpected error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const anfrage_id = searchParams.get("anfrage_id");

    if (!anfrage_id) {
      return NextResponse.json({ error: "anfrage_id erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("nachrichten")
      .select("*, sender:profiles!sender_id(vorname, nachname, role)")
      .eq("anfrage_id", anfrage_id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    logger.error("nachrichten GET unexpected error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
