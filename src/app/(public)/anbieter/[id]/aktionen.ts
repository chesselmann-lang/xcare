"use server";

import { createClient } from "@/lib/supabase/server";

interface KontaktData {
  name: string;
  email: string;
  telefon?: string;
  nachricht: string;
}

export async function kontaktNachrichtSenden(
  anbieterId: string,
  data: KontaktData
) {
  if (!data.name?.trim() || !data.email?.trim() || !data.nachricht?.trim()) {
    return { error: "Bitte füllen Sie alle Pflichtfelder aus." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." };
  }

  if (data.nachricht.trim().length < 20) {
    return { error: "Ihre Nachricht muss mindestens 20 Zeichen lang sein." };
  }

  const supabase = await createClient();

  // Resolve anbieter → profile_id
  const { data: anbieter, error: anbieterError } = await supabase
    .from("anbieter")
    .select("id, name, profile_id")
    .eq("id", anbieterId)
    .eq("aktiv", true)
    .single();

  if (anbieterError || !anbieter) {
    return { error: "Anbieter nicht gefunden." };
  }

  if (!anbieter.profile_id) {
    return { error: "Anbieter hat kein verknüpftes Profil." };
  }

  // Insert as in-app notification for the anbieter
  const kurzNachricht = data.nachricht.length > 120
    ? `${data.nachricht.substring(0, 117)}…`
    : data.nachricht;

  const telefonInfo = data.telefon ? ` · Tel: ${data.telefon}` : "";

  const { error: insertError } = await supabase
    .from("benachrichtigungen")
    .insert({
      profile_id: anbieter.profile_id,
      typ: "kontakt",
      titel: `Neue Kontaktanfrage von ${data.name}`,
      nachricht: `${data.email}${telefonInfo} — ${kurzNachricht}`,
      link: null,
    });

  if (insertError) {
    return { error: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut." };
  }

  return { success: true };
}
