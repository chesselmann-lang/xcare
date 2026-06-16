import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BewohnerAktivitaetenClient } from "@/components/aktivitaeten/bewohner/BewohnerAktivitaetenClient";

export async function generateMetadata() {
  return { title: "Aktivitäten | xcare" };
}

export default async function BewohnerAktivitaetenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bewohnerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const { data: anbieterRaw } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", _prof?.id ?? "")
    .single();
  const anbieter = anbieterRaw as any;
  if (!anbieter) notFound();

  const { data: bewohner } = await (supabase as any)
    .from("bewohner")
    .select("id, vorname, nachname")
    .eq("id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohner) notFound();

  const [{ data: rawTeilnahmen }, { data: rawAngebote }] = await Promise.all([
    (supabase as any)
      .from("aktivitaeten_teilnahmen")
      .select("*, angebot:aktivitaeten_angebote(id, titel, kategorie)")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter.id)
      .order("datum", { ascending: false })
      .limit(100),
    (supabase as any)
      .from("aktivitaeten_angebote")
      .select("id, titel, kategorie, wochentag, uhrzeit, dauer_min, ort")
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("wochentag"),
  ]);

  const teilnahmen: any[] = rawTeilnahmen ?? [];
  const angebote: any[] = rawAngebote ?? [];
  const stats = {
    gesamt: teilnahmen.length,
    teilgenommen: teilnahmen.filter(t => t.teilgenommen).length,
    abgesagt: teilnahmen.filter(t => t.abgesagt).length,
    letzteAktivitaet: teilnahmen[0]?.datum ?? null,
  };

  return (
    <BewohnerAktivitaetenClient
      bewohnerId={bewohnerId}
      bewohnerName={`${bewohner.vorname} ${bewohner.nachname}`}
      initialTeilnahmen={teilnahmen}
      initialAngebote={angebote}
      stats={stats}
    />
  );
}
