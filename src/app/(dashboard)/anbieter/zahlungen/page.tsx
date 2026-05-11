// ============================================================
// /anbieter/zahlungen — Stripe Connect Dashboard
// Onboarding, Stundennachweise anlegen, Zahlungshistorie.
// ============================================================

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnbieterZahlungenClient } from "@/components/zahlungen/AnbieterZahlungenClient";

export const metadata: Metadata = {
  title: "Zahlungen | xcare",
  description: "Stripe Connect Marktplatz-Zahlungen — Stundennachweise und Abrechnungen.",
};

export default async function AnbieterZahlungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, verifiziert")
    .eq("profile_id", profile.id)
    .single();

  // Connect-Konto
  const { data: connectAccount } = await supabase
    .from("stripe_connect_accounts")
    .select("stripe_account_id, charges_enabled, payouts_enabled, onboarding_complete, details_submitted")
    .eq("anbieter_id", anbieter?.id ?? "")
    .single();

  // Care-Worker (für Stundennachweis-Formular)
  const { data: careWorkers } = await supabase
    .from("care_workers")
    .select("id, vorname, nachname, stundensatz_ct, aktiv")
    .eq("anbieter_id", anbieter?.id ?? "")
    .eq("aktiv", true)
    .order("nachname");

  // Stundennachweise (letzte 50)
  const { data: stunden } = await supabase
    .from("stundennachweise")
    .select(`
      id, datum, stunden, stundensatz_ct, betrag_ct, beschreibung, status,
      payment_status, created_at, approved_at, paid_at,
      care_workers (vorname, nachname)
    `)
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("datum", { ascending: false })
    .limit(50);

  // Zahlungs-Log (letzte 20)
  const { data: zahlungen } = await supabase
    .from("zahlungen_log")
    .select("*")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(20);

  // KPIs
  const stundenData = stunden ?? [];
  const kpis = {
    offen: stundenData.filter(s => s.status === "pending").length,
    genehmigt: stundenData.filter(s => s.status === "approved").length,
    bezahlt: stundenData.filter(s => s.status === "paid").length,
    umsatz_ct: (zahlungen ?? [])
      .filter(z => z.status === "succeeded")
      .reduce((sum, z) => sum + z.netto_ct, 0),
  };

  return (
    <AnbieterZahlungenClient
      anbieter={anbieter ?? { id: "", name: "Mein Betrieb", verifiziert: false }}
      connectAccount={connectAccount ?? null}
      careWorkers={careWorkers ?? []}
      stunden={stundenData}
      zahlungen={zahlungen ?? []}
      kpis={kpis}
    />
  );
}
