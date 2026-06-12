import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InteropHubClient } from "@/components/interoperabilitaet/InteropHubClient";

export const metadata: Metadata = {
  title: "Interoperabilitäts-Hub | xcare",
  description:
    "FHIR R4 Export, KV-Connect Kommunikation und Standards-Compliance für Ihre Pflegedaten.",
};

export default async function InteroperabilitaetPage() {
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

  // Fetch all families that have at least one pflegedokumentation entry
  // (i.e. those for whom we can export meaningful FHIR data)
  const { data: dokuRows } = await supabase
    .from("pflegedokumentation")
    .select("familie_profile_id, ereignis_datum, profiles!pflegedokumentation_familie_profile_id_fkey(id, vorname, nachname)")
    .eq("anbieter_id", anbieter.id)
    .order("ereignis_datum", { ascending: false })
    .limit(1000);

  // Deduplicate by familie_profile_id, keep latest event date
  const seenMap = new Map<string, { familieProfileId: string; name: string; letztesDatum: string | null }>();
  for (const row of dokuRows ?? []) {
    if (!row.familie_profile_id) continue;
    if (!seenMap.has(row.familie_profile_id)) {
      const p = row.profiles as { id?: string; vorname?: string | null; nachname?: string | null } | null;
      seenMap.set(row.familie_profile_id, {
        familieProfileId: row.familie_profile_id,
        name: p ? `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() || "Unbekannt" : "Unbekannt",
        letztesDatum: row.ereignis_datum ?? null,
      });
    }
  }

  const klienten = Array.from(seenMap.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));

  return <InteropHubClient klienten={klienten} />;
}
