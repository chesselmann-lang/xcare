import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PflegeakteClient } from "@/components/bewohner/PflegeakteClient";
import { ClipboardList, ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Pflegeakte ${id.slice(0, 8)} | xcare` };
}

export default async function PflegeaktePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/dashboard");

  // Load bewohner
  const { data: bewohner } = await supabase
    .from("bewohner")
    .select("*")
    .eq("id", id)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!bewohner) notFound();

  // Load einsaetze
  const { data: einsaetzeRaw } = await supabase
    .from("tour_einsaetze")
    .select(`
      id, geplante_ankunft, geplante_abfahrt, tatsaechliche_ankunft, tatsaechliche_abfahrt,
      leistungsart, leistungsminuten, status, prioritaet,
      pflegedokumentation, abwesenheitsgrund, reihenfolge,
      touren!inner(datum, name, fahrzeug, fahrer:profiles!fahrer_id(vorname, nachname))
    `)
    .eq("bewohner_id", id)
    .eq("anbieter_id", anbieter.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Load leistungsnachweise
  const { data: leistungsnachweise } = await supabase
    .from("leistungsnachweise")
    .select(`
      id, leistungsdatum, abrechnungsmonat, leistungsart, leistungsminuten,
      einheit, einzelpreis_ct, menge, gesamtbetrag_ct,
      status, eingereicht_am, genehmigt_am, krankenkasse, abrechnungs_referenz
    `)
    .eq("bewohner_id", id)
    .eq("anbieter_id", anbieter.id)
    .order("leistungsdatum", { ascending: false })
    .limit(200);

  const einsaetze = einsaetzeRaw ?? [];
  const ln = leistungsnachweise ?? [];

  const stats = {
    totalEinsaetze: einsaetze.length,
    abgeschlosseneEinsaetze: einsaetze.filter((e) => e.status === "abgeschlossen").length,
    totalMinuten: einsaetze.reduce((s, e) => s + (e.leistungsminuten ?? 0), 0),
    totalBetrag: ln.reduce((s, l) => s + (l.gesamtbetrag_ct ?? 0), 0),
    genehmigterBetrag: ln.filter((l) => l.status === "genehmigt").reduce((s, l) => s + (l.gesamtbetrag_ct ?? 0), 0),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/anbieter/bewohner"
          className="mt-1 p-2 rounded-lg hover:bg-[--muted] transition-colors text-[--muted-foreground]"
          aria-label="Zurück zur Bewohner-Liste"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-12 h-12 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
          <ClipboardList className="w-6 h-6 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">
            Pflegeakte: {bewohner.vorname} {bewohner.nachname}
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Zimmer {bewohner.zimmer_nr ?? "–"} · {bewohner.station ?? anbieter.name}
            {bewohner.pflegegrad ? ` · Pflegegrad ${bewohner.pflegegrad}` : ""}
          </p>
        </div>
      </div>
      <PflegeakteClient
        bewohner={bewohner}
        einsaetze={einsaetze}
        leistungsnachweise={ln}
        stats={stats}
      />
    </div>
  );
}
