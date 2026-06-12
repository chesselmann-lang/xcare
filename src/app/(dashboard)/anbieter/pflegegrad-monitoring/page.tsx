import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PflegegradMonitoringClient } from "@/components/pflegegrad/PflegegradMonitoringClient";

export const metadata: Metadata = {
  title: "Pflegegrad-Monitoring | xcare",
  description:
    "Überwachen Sie Pflegegrade Ihrer Klienten und erhalten Sie KI-gestützte Wiederholungsprüfungs-Empfehlungen.",
};

export default async function PflegegradMonitoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) redirect("/anbieter/profil");

  // Get all families with their latest pflegegrad assessment
  const { data: rawEinschaetzungen } = await supabase
    .from("pflegegrad_einschaetzungen")
    .select(
      "id, familie_profile_id, einschaetzung_datum, aktueller_pflegegrad, pflegegrad_empfehlung, gesamtpunkte, notizen, profiles!pflegegrad_einschaetzungen_familie_profile_id_fkey(vorname, nachname, id)"
    )
    .eq("anbieter_id", anbieter.id)
    .order("einschaetzung_datum", { ascending: false })
    .limit(500);

  // Deduplicate: keep only latest assessment per client
  const seen = new Set<string>();
  const klientenMap = new Map<
    string,
    {
      familieProfileId: string;
      name: string;
      letzteEinschaetzung: string;
      aktuellerPflegegrad: number | null;
      pflegegradEmpfehlung: number | null;
      gesamtpunkte: number | null;
      notizen: string | null;
      anzahlEinschaetzungen: number;
    }
  >();

  for (const row of rawEinschaetzungen ?? []) {
    if (!row.familie_profile_id) continue;
    const countKey = row.familie_profile_id;
    if (!klientenMap.has(countKey)) {
      const p = row.profiles as {
        vorname?: string | null;
        nachname?: string | null;
      } | null;
      klientenMap.set(countKey, {
        familieProfileId: row.familie_profile_id,
        name: p ? `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() || "Unbekannt" : "Unbekannt",
        letzteEinschaetzung: row.einschaetzung_datum,
        aktuellerPflegegrad: row.aktueller_pflegegrad,
        pflegegradEmpfehlung: row.pflegegrad_empfehlung,
        gesamtpunkte: row.gesamtpunkte,
        notizen: row.notizen,
        anzahlEinschaetzungen: 0,
      });
    }
    const entry = klientenMap.get(countKey)!;
    entry.anzahlEinschaetzungen += 1;
    seen.add(countKey);
  }

  const klienten = Array.from(klientenMap.values()).sort((a, b) => {
    // Sort by days since last assessment descending (most overdue first)
    const aAge = Date.now() - new Date(a.letzteEinschaetzung).getTime();
    const bAge = Date.now() - new Date(b.letzteEinschaetzung).getTime();
    return bAge - aAge;
  });

  // Stats
  const heute = new Date();
  const sechsMonate = 6 * 30 * 24 * 60 * 60 * 1000;
  const dreiMonate = 3 * 30 * 24 * 60 * 60 * 1000;

  const stats = {
    gesamt: klienten.length,
    ueberfaellig: klienten.filter(
      (k) => Date.now() - new Date(k.letzteEinschaetzung).getTime() > sechsMonate
    ).length,
    baldFaellig: klienten.filter((k) => {
      const age = Date.now() - new Date(k.letzteEinschaetzung).getTime();
      return age > dreiMonate && age <= sechsMonate;
    }).length,
    aktuell: klienten.filter(
      (k) => Date.now() - new Date(k.letzteEinschaetzung).getTime() <= dreiMonate
    ).length,
  };

  return (
    <PflegegradMonitoringClient
      klienten={klienten}
      stats={stats}
    />
  );
}
