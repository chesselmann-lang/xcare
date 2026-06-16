import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ErnaehrungClient from "@/components/ernaehrung/ErnaehrungClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase as any).from("bewohner").select("vorname, nachname").eq("id", id).single();
  const d = data as any;
  const name = d ? `${d.vorname} ${d.nachname}` : "Bewohner";
  return { title: `Ernährung & Flüssigkeit – ${name}` };
}

export default async function ErnaehrungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
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
  const heute = new Date().toISOString().split("T")[0];
  const vor90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const vor7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [protokollRes, zieleRes, fluessigkeitRes] = await Promise.all([
    (supabase as any)
      .from("ernaehrungs_protokoll")
      .select("*")
      .eq("bewohner_id", id)
      .gte("datum", vor90)
      .order("datum", { ascending: false })
      .order("mahlzeit", { ascending: true }),
    (supabase as any)
      .from("ernaehrungs_ziele")
      .select("*")
      .eq("bewohner_id", id)
      .maybeSingle(),
    (supabase as any)
      .from("fluessigkeits_protokoll")
      .select("*")
      .eq("bewohner_id", id)
      .gte("datum", vor7)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .limit(200),
  ]);

  const protokoll = (protokollRes.data || []) as any[];
  const ziele = (zieleRes.data || null) as any;
  const fluessigkeit = (fluessigkeitRes.data || []) as any[];

  // Compute stats
  const aufnahmeWerte = protokoll
    .filter((p: any) => p.aufgenommen_prozent !== null)
    .map((p: any) => p.aufgenommen_prozent as number);
  const durchschnittAufnahme =
    aufnahmeWerte.length > 0
      ? Math.round((aufnahmeWerte.reduce((a: number, b: number) => a + b, 0) / aufnahmeWerte.length) * 10) / 10
      : 0;
  const letztesGewichtEntry = protokoll.find((p: any) => p.gewicht_kg !== null);
  const stats = {
    gesamt: protokoll.length,
    durchschnittAufnahme,
    letztesGewicht: letztesGewichtEntry?.gewicht_kg ?? null,
    mnaScore: ziele?.mna_score ?? null,
  };

  // Fluid stats for today
  const einfuhrHeute = fluessigkeit
    .filter((f: any) => f.datum === heute && f.bilanz_typ === "einfuhr")
    .reduce((sum: number, f: any) => sum + (f.menge_ml || 0), 0);
  const ausfuhrHeute = fluessigkeit
    .filter((f: any) => f.datum === heute && f.bilanz_typ === "ausfuhr")
    .reduce((sum: number, f: any) => sum + (f.menge_ml || 0), 0);
  const flStats = {
    einfuhrHeute,
    ausfuhrHeute,
    bilanzHeute: einfuhrHeute - ausfuhrHeute,
  };

  return (
    <ErnaehrungClient
      bewohnerId={id}
      bewohnerName={bewohnerName}
      initialProtokoll={protokoll}
      initialZiele={ziele}
      initialStats={stats}
      initialFluessigkeit={fluessigkeit}
      initialFlStats={flStats}
    />
  );
}
