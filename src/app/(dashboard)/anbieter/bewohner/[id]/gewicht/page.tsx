import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GewichtClient from "@/components/gewicht/GewichtClient";

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
  return { title: `Gewicht & Vitalwerte – ${name}` };
}

export default async function GewichtPage({
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

  const since180d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [gewichtRes, vitalRes, normwerteRes] = await Promise.all([
    (supabase as any)
      .from("gewichts_eintraege")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieterId)
      .gte("datum", since180d)
      .order("datum", { ascending: true }),
    (supabase as any)
      .from("vitalwerte_eintraege")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieterId)
      .gte("datum", since180d)
      .order("datum", { ascending: false })
      .limit(30),
    (supabase as any)
      .from("bewohner_normwerte")
      .select("*")
      .eq("bewohner_id", id)
      .maybeSingle(),
  ]);

  const gewichtEintraege = (gewichtRes.data ?? []) as any[];
  const vitalEintraege = (vitalRes.data ?? []) as any[];
  const normwerte = normwerteRes.data ?? null;

  const gewichte = gewichtEintraege.map((e: any) => e.gewicht_kg as number);
  const aktuellesGewicht = gewichte.length > 0 ? gewichte[gewichte.length - 1] : null;
  const erstesGewicht = gewichte.length > 0 ? gewichte[0] : null;
  const gewichtDelta =
    aktuellesGewicht !== null && erstesGewicht !== null
      ? Math.round((aktuellesGewicht - erstesGewicht) * 10) / 10
      : null;

  const stats = {
    aktuellesGewicht,
    gewichtDelta,
    anzahlMessungen: gewichte.length,
    letzteMessung:
      gewichtEintraege.length > 0 ? gewichtEintraege[gewichtEintraege.length - 1].datum : null,
    letzteVital: vitalEintraege.length > 0 ? vitalEintraege[0] : null,
  };

  return (
    <GewichtClient
      bewohnerId={id}
      bewohnerName={bewohnerName}
      initialGewichtEintraege={gewichtEintraege}
      initialVitalEintraege={vitalEintraege}
      initialNormwerte={normwerte}
      initialStats={stats}
    />
  );
}
