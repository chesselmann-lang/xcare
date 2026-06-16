import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BeschwerdenClient } from "@/components/beschwerden/BeschwerdenClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Beschwerdemanagement | xcare" };

export default async function BeschwerdenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anbieterRaw } = await supabase
    .from("anbieter")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  const anbieter = anbieterRaw as any;
  if (!anbieter) redirect("/");

  const [{ data: beschwerden }, { data: bewohnerListe }] = await Promise.all([
    (supabase as any)
      .from("beschwerden")
      .select(`id, kategorie, betreff, beschreibung, status, eskalationsstufe,
        frist, einreicher_name, einreicher_typ, erstellt_am, abgeschlossen_am,
        bewohner_id, bewohner:bewohner(vorname, nachname)`)
      .eq("anbieter_id", anbieter.id)
      .order("erstellt_am", { ascending: false }),
    supabase
      .from("bewohner")
      .select("id, vorname, nachname")
      .eq("anbieter_id", anbieter.id)
      .eq("aktiv", true)
      .order("nachname"),
  ]);

  const b = (beschwerden ?? []) as any[];
  const stats = {
    gesamt: b.length,
    eingegangen: b.filter(x => x.status === "eingegangen").length,
    in_bearbeitung: b.filter(x => x.status === "in_bearbeitung").length,
    eskaliert: b.filter(x => x.status === "eskaliert").length,
    abgeschlossen: b.filter(x => x.status === "abgeschlossen").length,
    ueberfaellig: b.filter(x => x.frist && new Date(x.frist) < new Date() && x.status !== "abgeschlossen").length,
  };

  return (
    <BeschwerdenClient
      initialBeschwerden={b as any}
      initialStats={stats}
      bewohnerListe={bewohnerListe ?? []}
    />
  );
}
