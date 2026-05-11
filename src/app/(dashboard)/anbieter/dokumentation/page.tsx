import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnbieterDokuClient } from "@/components/dokumentation/AnbieterDokuClient";

export const metadata: Metadata = {
  title: "Pflegedokumentation | xcare",
  description: "Digitale Verlaufsnotizen, Vitalwerte und Medikamentengabe.",
};

export default async function AnbieterDokuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/profil");

  // Pflegedokumentation der letzten 90 Tage
  const von90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: eintraege }, { data: careWorkers }, { data: familieProfiles }] = await Promise.all([
    supabase
      .from("pflegedokumentation")
      .select(`
        id, kategorie, titel, inhalt, ereignis_datum, created_at,
        blutdruck_sys, blutdruck_dia, puls, temperatur, gewicht, blutzucker, sauerstoff,
        medikament_name, medikament_dosis, medikament_gegeben,
        unterschrieben, unterschrift_ts,
        familie_profile_id,
        care_workers (vorname, nachname),
        profiles!pflegedokumentation_erstellt_von_fkey (vorname, nachname)
      `)
      .eq("anbieter_id", anbieter.id)
      .gte("ereignis_datum", von90)
      .order("ereignis_datum", { ascending: false })
      .limit(200),

    supabase
      .from("care_workers")
      .select("id, vorname, nachname")
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("nachname"),

    // Distinct familie_profile_ids aus Dokumentation
    supabase
      .from("pflegedokumentation")
      .select("familie_profile_id, profiles:familie_profile_id (id, vorname, nachname)")
      .eq("anbieter_id", anbieter.id)
      .not("familie_profile_id", "is", null)
      .limit(100),
  ]);

  // De-dupliziere Familien
  const familieMap = new Map<string, { id: string; vorname?: string; nachname?: string }>();
  for (const e of (familieProfiles ?? [])) {
    if (!e.familie_profile_id) continue;
    if (!familieMap.has(e.familie_profile_id)) {
      const p = e.profiles as { id: string; vorname?: string; nachname?: string } | null;
      familieMap.set(e.familie_profile_id, {
        id: e.familie_profile_id,
        vorname: p?.vorname ?? undefined,
        nachname: p?.nachname ?? undefined,
      });
    }
  }

  return (
    <AnbieterDokuClient
      initialEintraege={(eintraege ?? []) as Parameters<typeof AnbieterDokuClient>[0]["initialEintraege"]}
      familieOptionen={Array.from(familieMap.values())}
      careWorkers={(careWorkers ?? []) as { id: string; vorname: string; nachname: string }[]}
    />
  );
}
