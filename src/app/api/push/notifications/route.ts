import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/push/notifications
 * Called by the service worker after receiving a no-payload push signal.
 * Returns up to 5 unsent notifications for the authenticated profile and marks them sent.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ notifications: [] });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ notifications: [] });

    // Fetch unsent notifications (ordered oldest first)
    const { data: items, error } = await supabase
      .from("push_queue")
      .select("id, titel, nachricht, link")
      .eq("profile_id", profile.id)
      .is("sent_at", null)
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) throw error;

    if (items && items.length > 0) {
      // Mark as sent (fire-and-forget)
      supabase
        .from("push_queue")
        .update({ sent_at: new Date().toISOString() })
        .in("id", items.map((i) => i.id))
        .then(() => {/* ignore */})
        .catch(() => {/* ignore */});
    }

    return NextResponse.json({ notifications: items ?? [] });
  } catch (err) {
    logger.error("GET /api/push/notifications failed", { error: String(err) });
    return NextResponse.json({ notifications: [] });
  }
}
