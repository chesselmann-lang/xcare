import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DekubitusClient from "@/components/dekubitus/DekubitusClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any).from("bewohner").select("vorname, nachname").eq("id", id).single();
  const name = data ? `${(data as any).vorname} ${(data as any).nachname}` : "Bewohner";
  return { title: `Dekubitus-Risiko & Lagerung – ${name}` };
}

export default async function DekubitusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anbieter } = await (supabase as any).from("anbieter").select("id").eq("owner_id", user.id).single();
  if (!anbieter) redirect("/anbieter/onboarding");

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", id)
    .eq("anbieter_id", (anbieter as any).id)
    .single();
  if (!bewohner) notFound();

  const bewohnerName = `${(bewohner as any).vorname} ${(bewohner as any).nachname}`;
  const heute = new Date().toISOString().split("T")[0];
  const vor3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [risikenRes, lagerungsplanRes, lagerungRes] = await Promise.all([
    (supabase as any)
      .from("dekubitus_risiko")
      .select("*")
      .eq("bewohner_id", id)
      .order("datum", { ascending: false })
      .limit(20),
    (supabase as any)
      .from("lagerungsplan")
      .select("*")
      .eq("bewohner_id", id)
      .maybeSingle(),
    (supabase as any)
      .from("lagerungsprotokoll")
      .select("*")
      .eq("bewohner_id", id)
      .gte("datum", vor3)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .limit(100),
  ]);

  const risiken = (risikenRes.data || []) as any[];
  const lagerungsplan = (lagerungsplanRes.data || null) as any;
  const lagerung = (lagerungRes.data || []) as any[];

  const stats = {
    anzahlEinschaetzungen: risiken.length,
    letzterBradenScore: risiken[0]?.braden_score ?? null,
    aktuelleRisikostufe: risiken[0]?.risikostufe ?? null,
    naechsteEinschaetzung: risiken[0]?.naechste_einschaetzung ?? null,
  };

  const heuteAnzahl = lagerung.filter((l: any) => l.datum === heute).length;
  const lagerungStats = {
    heuteAnzahl,
    letztePosition: lagerung[0]?.position ?? null,
    letzteHautinspektion: lagerung[0]?.hautinspektion ?? null,
  };

  return (
    <DekubitusClient
      bewohnerId={id}
      bewohnerName={bewohnerName}
      initialRisiken={risiken}
      initialLagerungsplan={lagerungsplan}
      initialStats={stats}
      initialLagerung={lagerung}
      initialLagerungStats={lagerungStats}
    />
  );
}
