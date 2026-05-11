import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SchichtplanClient } from "@/components/schichtplanung/SchichtplanClient";

export const metadata: Metadata = {
  title: "Schichtplanung | xcare",
  description: "Wochenplan, Schichtzuweisung und iCal-Export.",
};

export default async function SchichtplanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/profil");

  // Schichten der nächsten 4 Wochen + letzte 2 Wochen
  const von = new Date(Date.now() - 14 * 86400000).toISOString();
  const bis = new Date(Date.now() + 28 * 86400000).toISOString();

  const [{ data: schichten }, { data: careWorkers }, { data: familieProfiles }] = await Promise.all([
    supabase
      .from("schichten")
      .select(`
        id, start_ts, ende_ts, titel, beschreibung, schichttyp, status,
        stunden_geplant, stundensatz_ct,
        care_worker_id, familie_profile_id,
        care_workers (vorname, nachname, stundensatz_ct),
        profiles!schichten_familie_profile_id_fkey (vorname, nachname)
      `)
      .eq("anbieter_id", anbieter.id)
      .gte("start_ts", von)
      .lte("start_ts", bis)
      .order("start_ts")
      .limit(500),

    supabase
      .from("care_workers")
      .select("id, vorname, nachname, stundensatz_ct")
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("nachname"),

    supabase
      .from("schichten")
      .select("familie_profile_id, profiles:familie_profile_id (id, vorname, nachname)")
      .eq("anbieter_id", anbieter.id)
      .not("familie_profile_id", "is", null)
      .limit(100),
  ]);

  // De-dupliziere Familien
  const familieMap = new Map<string, { id: string; vorname?: string; nachname?: string }>();
  for (const s of (familieProfiles ?? [])) {
    if (!s.familie_profile_id) continue;
    if (!familieMap.has(s.familie_profile_id)) {
      const p = s.profiles as { id: string; vorname?: string; nachname?: string } | null;
      familieMap.set(s.familie_profile_id, {
        id: s.familie_profile_id,
        vorname: p?.vorname,
        nachname: p?.nachname,
      });
    }
  }

  return (
    <SchichtplanClient
      initialSchichten={(schichten ?? []) as Parameters<typeof SchichtplanClient>[0]["initialSchichten"]}
      careWorkers={(careWorkers ?? []) as { id: string; vorname: string; nachname: string; stundensatz_ct?: number }[]}
      familieOptionen={Array.from(familieMap.values())}
      anbieterName={anbieter.name}
    />
  );
}
