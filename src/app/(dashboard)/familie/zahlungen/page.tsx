// ============================================================
// /familie/zahlungen — Familie genehmigt Stunden + zahlt
// ============================================================

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FamilieZahlungenClient } from "@/components/zahlungen/FamilieZahlungenClient";

export const metadata: Metadata = {
  title: "Zahlungen | xcare",
  description: "Pflegestunden genehmigen und Zahlungen verwalten.",
};

export default async function FamilieZahlungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "familie") redirect("/anbieter/zahlungen");

  // Stundennachweise für diese Familie
  const { data: stunden } = await supabase
    .from("stundennachweise")
    .select(`
      id, datum, stunden, stundensatz_ct, betrag_ct, beschreibung, status,
      payment_status, created_at, approved_at, paid_at,
      care_workers (vorname, nachname, qualifikationen),
      anbieter (name, verifiziert)
    `)
    .eq("familie_profile_id", profile.id)
    .order("datum", { ascending: false })
    .limit(50);

  // Zahlungshistorie
  const { data: zahlungen } = await supabase
    .from("zahlungen_log")
    .select("*")
    .eq("familie_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const stundenData = stunden ?? [];
  const kpis = {
    pending: stundenData.filter(s => s.status === "pending").length,
    approved: stundenData.filter(s => s.status === "approved").length,
    paid: stundenData.filter(s => s.status === "paid").length,
    gesamt_ct: (zahlungen ?? [])
      .filter(z => z.status === "succeeded")
      .reduce((sum, z) => sum + z.brutto_ct, 0),
  };

  return (
    <FamilieZahlungenClient
      stunden={stundenData}
      zahlungen={zahlungen ?? []}
      kpis={kpis}
    />
  );
}
