/**
 * S322: Server-side Web Push sender.
 *
 * Sends a "no-payload" push to all subscriptions of a profile.
 * The service worker receives the push event, fetches /api/push/notifications,
 * and shows the notification from the queue.
 *
 * This avoids AES-128-GCM content encryption (which requires the external
 * web-push library) while remaining fully spec-compliant.
 */
import { createClient } from "@/lib/supabase/server";
import { buildVapidAuthHeader } from "@/lib/vapid";
import { logger } from "@/lib/logger";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ?? `mailto:noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, "") ?? "xcare.de"}`;

/**
 * Enqueue a push notification for a profile and fire push signals to all
 * registered browser subscriptions.
 *
 * @param profileId  The `profiles.id` of the recipient (familie)
 * @param titel      Short notification title
 * @param nachricht  Body text
 * @param link       Optional deep-link URL
 */
export async function sendPushToProfile(
  profileId: string,
  titel: string,
  nachricht: string,
  link?: string
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // VAPID keys not configured — skip silently (no push capability)
    logger.warn("sendPushToProfile: VAPID keys not configured — skipping push", { profileId });
    return;
  }

  try {
    const supabase = await createClient();

    // 1. Enqueue notification in push_queue (service worker reads this)
    const { error: queueErr } = await supabase.from("push_queue").insert({
      profile_id: profileId,
      titel,
      nachricht,
      link: link ?? null,
    });
    if (queueErr) {
      logger.error("sendPushToProfile: push_queue insert failed", { error: queueErr.message });
    }

    // 2. Fetch all active subscriptions for this profile
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("profile_id", profileId);

    if (subsErr) {
      logger.error("sendPushToProfile: fetch subscriptions failed", { error: subsErr.message });
      return;
    }

    if (!subs || subs.length === 0) return; // no push subscribers

    // 3. Send no-payload push to each subscription
    const staleIds: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          const authHeader = await buildVapidAuthHeader(
            sub.endpoint,
            VAPID_SUBJECT,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          );

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              TTL: "86400", // 24 h
            },
            // No body — no content encryption needed
          });

          if (res.status === 410 || res.status === 404) {
            // Subscription expired / gone — remove it
            staleIds.push(sub.id);
          } else if (!res.ok) {
            logger.warn("sendPushToProfile: push endpoint error", {
              status: res.status,
              endpoint: sub.endpoint.slice(0, 60),
            });
          }
        } catch (err) {
          logger.error("sendPushToProfile: push send failed", {
            error: String(err),
            endpoint: sub.endpoint.slice(0, 60),
          });
        }
      })
    );

    // 4. Remove stale subscriptions
    if (staleIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", staleIds);
    }
  } catch (err) {
    logger.error("sendPushToProfile: unexpected error", { error: String(err) });
  }
}
