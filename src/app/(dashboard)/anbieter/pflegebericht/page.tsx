import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PflegeberichtGeneratorClient } from "@/components/pflegebericht/PflegeberichtGeneratorClient";

export const metadata: Metadata = {
  title: "KI-Pflegebericht-Generator | xcare",
  description:
    "Erstellen Sie MDK-konforme Pflegeberichte automatisch aus Ihren Dokumentationseinträgen.",
};

export default async function PflegeberichtPage() {
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

  // Fetch distinct clients that have pflegedokumentation entries
  const { data: rawKlienten } = await supabase
    .from("pflegedokumentation")
    .select("familie_profile_id, profiles!pflegedokumentation_familie_profile_id_fkey(vorname, nachname, id)")
    .eq("anbieter_id", anbieter.id)
    .not("familie_profile_id", "is", null)
    .order("ereignis_datum", { ascending: false })
    .limit(200);

  // Deduplicate by familie_profile_id
  const seen = new Set<string>();
  const klienten: { id: string; name: string }[] = [];
  for (const row of rawKlienten ?? []) {
    if (!row.familie_profile_id || seen.has(row.familie_profile_id)) continue;
    seen.add(row.familie_profile_id);
    const p = row.profiles as { vorname?: string | null; nachname?: string | null; id?: string } | null;
    const name = p
      ? `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() || "Unbekannt"
      : "Unbekannt";
    klienten.push({ id: row.familie_profile_id, name });
  }

  // Recent reports count for stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const { count: eintraegeMonat } = await supabase
    .from("pflegedokumentation")
    .select("id", { count: "exact", head: true })
    .eq("anbieter_id", anbieter.id)
    .gte("ereignis_datum", monthStart);

  return (
    <PflegeberichtGeneratorClient
      klienten={klienten}
      eintraegeMonat={eintraegeMonat ?? 0}
    />
  );
}
