import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";
import { ArztbriefClient } from "@/components/arztbrief/ArztbriefClient";

export const metadata = {
  title: "KI-Arztbrief | xcare Familie",
};

export default async function ArztbriefPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, vorname, nachname, id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  // Load diagnosen from ePA or health records if available
  const { data: medikamente } = await supabase
    .from("medikamentenplaene")
    .select("medikament_name, staerke, dosierung_morgens, dosierung_mittags, dosierung_abends, dosierung_nachts, einheit, dauermedikation")
    .eq("familie_profile_id", profile.id)
    .eq("aktiv", true)
    .order("medikament_name")
    .limit(30);

  const medikamenteListe = (medikamente ?? []).map((m) => {
    const dosierungen: string[] = [];
    if (m.dosierung_morgens) dosierungen.push(`${m.dosierung_morgens} morgens`);
    if (m.dosierung_mittags) dosierungen.push(`${m.dosierung_mittags} mittags`);
    if (m.dosierung_abends) dosierungen.push(`${m.dosierung_abends} abends`);
    if (m.dosierung_nachts) dosierungen.push(`${m.dosierung_nachts} nachts`);
    const dosis = dosierungen.length > 0 ? ` (${dosierungen.join(", ")} ${m.einheit ?? ""})`.trim() : "";
    const staerke = m.staerke ? ` ${m.staerke}` : "";
    return `${m.medikament_name}${staerke}${dosis}`;
  });

  // Try to load pflegegrad
  const { data: pgData } = await supabase
    .from("pflegegrad_einschaetzungen")
    .select("aktueller_pflegegrad")
    .eq("familie_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <FileText className="h-6 w-6 text-[--primary]" />
          KI-Arztbrief
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Strukturierten Arztbrief für den nächsten Termin erstellen — KI fasst Gesundheitsdaten zusammen.
        </p>
      </div>

      <ArztbriefClient
        defaultVorname={profile.vorname ?? ""}
        defaultNachname={profile.nachname ?? ""}
        defaultMedikamente={medikamenteListe}
        defaultPflegegrad={pgData?.aktueller_pflegegrad ?? undefined}
      />
    </div>
  );
}
