import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get current profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
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
      console.error("[nachrichten POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[nachrichten POST] unexpected:", err);
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
    console.error("[nachrichten GET] unexpected:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
