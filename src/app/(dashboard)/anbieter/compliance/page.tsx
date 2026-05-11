import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComplianceClient } from "@/components/compliance/ComplianceClient";

export const metadata: Metadata = {
  title: "Qualitätssicherung & MDK-Compliance | xcare",
  description: "Compliance-Dashboard für ambulante Pflegedienste — MDK-Prüfkatalog, Qualitätsprüfungen.",
};

export default async function AnbieterCompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/profil");

  const [{ data: checks }, { data: pruefungen }, { data: beschwerden }] = await Promise.all([
    supabase
      .from("compliance_checks")
      .select("*")
      .eq("anbieter_id", anbieter.id)
      .order("faellig_am", { ascending: true }),

    supabase
      .from("qualitaetspruefungen")
      .select("id, pruefung_typ, pruefung_datum, ergebnis, note_gesamt, massnahmen")
      .eq("anbieter_id", anbieter.id)
      .order("pruefung_datum", { ascending: false })
      .limit(10),

    supabase
      .from("beschwerden")
      .select("id, kategorie, schweregrad, status, beschreibung, eingegangen_am, frist_am")
      .eq("anbieter_id", anbieter.id)
      .order("eingegangen_am", { ascending: false })
      .limit(20),
  ]);

  return (
    <ComplianceClient
      initialChecks={(checks ?? []) as Parameters<typeof ComplianceClient>[0]["initialChecks"]}
      pruefungen={(pruefungen ?? []) as Parameters<typeof ComplianceClient>[0]["pruefungen"]}
      beschwerden={(beschwerden ?? []) as Parameters<typeof ComplianceClient>[0]["beschwerden"]}
      anbieterName={anbieter.name}
    />
  );
}
