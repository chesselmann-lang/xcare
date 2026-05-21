import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** POST /api/push/subscribe — register a push subscription for the authenticated user */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const body: SubscribeBody = await req.json();

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "Ungültige Subscription" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id: profile.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      { onConflict: "profile_id,endpoint" }
    );

    if (error) throw error;

    logger.info("push subscription registered", { profileId: profile.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/push/subscribe failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/push/subscribe — unregister a push subscription */
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Endpoint fehlt" }, { status: 400 });

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("profile_id", profile.id)
      .eq("endpoint", endpoint);

    logger.info("push subscription removed", { profileId: profile.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("DELETE /api/push/subscribe failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
