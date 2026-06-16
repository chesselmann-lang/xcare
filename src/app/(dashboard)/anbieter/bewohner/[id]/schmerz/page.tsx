import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SchmerzClient from "@/components/schmerz/SchmerzClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("bewohner")
    .select("vorname, nachname")
    .eq("id", id)
    .single();
  const d = data as any;
  const name = d ? `${d.vorname} ${d.nachname}` : "Bewohner";
  return { title: `Schmerzprotokoll – ${name}` };
}

export default async function SchmerzPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  if (!anbieter) redirect("/anbieter/onboarding");

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", id)
    .eq("anbieter_id", (anbieter as any).id)
    .single();
  if (!bewohner) notFound();

  const bewohnerName = `${(bewohner as any).vorname} ${(bewohner as any).nachname}`;
  const anbieterId = (anbieter as any).id;

  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [eintraegeRes, assessmentRes] = await Promise.all([
    (supabase as any)
      .from("schmerz_eintraege")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieterId)
      .gte("datum", since90d)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false }),
    (supabase as any)
      .from("schmerz_assessments")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieterId)
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const eintraege = (eintraegeRes.data ?? []) as any[];
  const latestAssessment = assessmentRes.data ?? null;

  const nrsWerte = eintraege.map((e: any) => e.nrs_wert as number);
  const avgNrs =
    nrsWerte.length > 0
      ? Math.round((nrsWerte.reduce((a, b) => a + b, 0) / nrsWerte.length) * 10) / 10
      : null;

  const stats = {
    gesamt: eintraege.length,
    avgNrs,
    maxNrs: nrsWerte.length > 0 ? Math.max(...nrsWerte) : null,
    hochschmerzEintraege: eintraege.filter((e: any) => e.nrs_wert >= 7).length,
    mitMedikament: eintraege.filter((e: any) => e.medikament_gegeben).length,
    letzterEintrag: eintraege.length > 0 ? eintraege[0].datum : null,
    zielwertNrs: (latestAssessment as any)?.zielwert_nrs ?? null,
  };

  return (
    <SchmerzClient
      bewohnerId={id}
      bewohnerName={bewohnerName}
      initialEintraege={eintraege}
      initialAssessment={latestAssessment}
      initialStats={stats}
    />
  );
}
