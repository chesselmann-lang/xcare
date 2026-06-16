import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QSDashboardClient from "@/components/qualitaet/QSDashboardClient";

export const metadata = { title: "Qualitätssicherungs-Dashboard" };

export default async function QualitaetPage() {
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

  const anbieterId = (anbieter as any).id;
  const now = new Date();
  const heute = now.toISOString().split("T")[0];
  const vor30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const vor90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    bewohnerRes,
    visitenRes,
    therapieRes,
    beschwerdenRes,
    aktivitaetenRes,
    dekubitusRes,
    zieleRes,
  ] = await Promise.all([
    (supabase as any).from("bewohner").select("id, aktiv").eq("anbieter_id", anbieterId),
    (supabase as any).from("pflegevisiten").select("id, status, datum").eq("anbieter_id", anbieterId).gte("datum", vor30),
    (supabase as any).from("therapieplaene").select("id, status, erstellt_am").eq("anbieter_id", anbieterId).gte("erstellt_am", vor30 + "T00:00:00"),
    (supabase as any).from("beschwerden").select("id, status, eingangsdatum").eq("anbieter_id", anbieterId).gte("eingangsdatum", vor90),
    (supabase as any).from("aktivitaeten_teilnahmen").select("id, teilgenommen, datum").eq("anbieter_id", anbieterId).gte("datum", vor30),
    (supabase as any).from("dekubitus_risiko").select("bewohner_id, risikostufe, datum").eq("anbieter_id", anbieterId).order("datum", { ascending: false }),
    (supabase as any).from("qualitaets_ziele").select("*").eq("anbieter_id", anbieterId).eq("aktiv", true),
  ]);

  const bewohner = (bewohnerRes.data || []) as any[];
  const visiten = (visitenRes.data || []) as any[];
  const therapie = (therapieRes.data || []) as any[];
  const beschwerden = (beschwerdenRes.data || []) as any[];
  const aktivitaeten = (aktivitaetenRes.data || []) as any[];
  const allDekubitus = (dekubitusRes.data || []) as any[];
  const ziele = (zieleRes.data || []) as any[];

  // Compute KPIs
  const bewohnerGesamt = bewohner.length;
  const bewohnerAktiv = bewohner.filter((b: any) => b.aktiv !== false).length;

  const visitenGesamt = visiten.length;
  const visitenDurchgefuehrt = visiten.filter((v: any) => v.status === "durchgefuehrt").length;
  const visitenQuote = visitenGesamt > 0 ? Math.round((visitenDurchgefuehrt / visitenGesamt) * 100) : 0;

  const therapieGesamt = therapie.length;
  const therapieAktiv = therapie.filter((t: any) => t.status === "aktiv").length;

  const beschwerdenGesamt = beschwerden.length;
  const beschwerdenOffen = beschwerden.filter((b: any) => ["offen", "in_bearbeitung"].includes(b.status)).length;
  const beschwerdenAbgeschlossen = beschwerden.filter((b: any) => b.status === "abgeschlossen").length;
  const beschwerdenLoesungsQuote = beschwerdenGesamt > 0
    ? Math.round((beschwerdenAbgeschlossen / beschwerdenGesamt) * 100)
    : 100;

  const aktivitaetenGesamt = aktivitaeten.length;
  const aktivitaetenTeilgenommen = aktivitaeten.filter((a: any) => a.teilgenommen === true).length;
  const aktivitaetenQuote = aktivitaetenGesamt > 0
    ? Math.round((aktivitaetenTeilgenommen / aktivitaetenGesamt) * 100)
    : 0;

  // Dekubitus: latest per bewohner
  const latestPerBewohner = new Map<string, any>();
  for (const d of allDekubitus) {
    if (!latestPerBewohner.has(d.bewohner_id)) latestPerBewohner.set(d.bewohner_id, d);
  }
  const dekubitusVerteilung: { kein_risiko: number; maessig: number; hoch: number; sehr_hoch: number } = { kein_risiko: 0, maessig: 0, hoch: 0, sehr_hoch: 0 };
  for (const d of latestPerBewohner.values()) {
    if (d.risikostufe in dekubitusVerteilung) (dekubitusVerteilung as Record<string, number>)[d.risikostufe]++;
  }
  const hochrisikoBewohner = dekubitusVerteilung.hoch + dekubitusVerteilung.sehr_hoch;

  const kpis = {
    bewohnerGesamt, bewohnerAktiv,
    visitenQuote, visitenGesamt,
    therapieAktiv, therapieGesamt,
    beschwerdenOffen, beschwerdenLoesungsQuote,
    aktivitaetenQuote, aktivitaetenGesamt,
    hochrisikoBewohner, dekubitusVerteilung,
  };

  return (
    <QSDashboardClient
      initialKPIs={kpis}
      initialZiele={ziele}
      zeitraum={{ von: vor30, bis: heute }}
    />
  );
}
