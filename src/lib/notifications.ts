/**
 * Server-side helper to create notifications.
 * Uses Supabase service-role client (bypasses RLS) to insert on behalf of any profile.
 */
import { createClient } from "@/lib/supabase/server";

export type NotificationTyp =
  | "neue_anfrage"
  | "statusupdate"
  | "neue_nachricht"
  | "bewertung"
  | "system";

interface CreateNotificationInput {
  profile_id: string;
  typ: NotificationTyp;
  titel: string;
  nachricht: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("benachrichtigungen").insert({
      profile_id: input.profile_id,
      typ: input.typ,
      titel: input.titel,
      nachricht: input.nachricht,
      link: input.link ?? null,
    });
  } catch (err) {
    // Non-critical — log but don't throw
    console.error("[notifications]", err);
  }
}

export async function createNotificationForAnfrage({
  anbieterProfileId,
  familieProfileId,
  typ,
  titel,
  nachricht,
  link,
}: {
  anbieterProfileId?: string;
  familieProfileId?: string;
  typ: NotificationTyp;
  titel: string;
  nachricht: string;
  link?: string;
}): Promise<void> {
  const promises: Promise<void>[] = [];
  if (anbieterProfileId) {
    promises.push(createNotification({ profile_id: anbieterProfileId, typ, titel, nachricht, link }));
  }
  if (familieProfileId) {
    promises.push(createNotification({ profile_id: familieProfileId, typ, titel, nachricht, link }));
  }
  await Promise.allSettled(promises);
}
