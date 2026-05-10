import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnspruchsWidget } from "./AnspruchsWidget";
import { FristenWarner } from "./FristenWarner";
import { MonatsKosten } from "./MonatsKosten";
import { SchnellaktionenWidget } from "./SchnellaktionenWidget";

/**
 * DashboardWidgetRow – Server Component
 *
 * Lädt Profil-, Fristen- und Kostendaten aus der Datenbank und
 * rendert das vollständige Widget-Raster für das Familie-Dashboard 2.0.
 *
 * Verwendung in familie/page.tsx:
 *   import { DashboardWidgetRow } from "@/components/dashboard/DashboardWidgetRow";
 *   <DashboardWidgetRow />
 */
export async function DashboardWidgetRow() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil laden
  const { data: profil } = await supabase
    .from("profiles")
    .select("pflegegrad, vorname, geburtsdatum")
    .eq("user_id", user.id)
    .single();

  // Dokumente mit Ablaufdatum (nächste 90 Tage)
  const in90Tagen = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: dokumenteRaw } = await supabase
    .from("dokumente")
    .select("name, ablaufdatum, kategorie")
    .eq("profil_id", user.id)
    .not("ablaufdatum", "is", null)
    .lt("ablaufdatum", in90Tagen)
    .order("ablaufdatum", { ascending: true });

  // Impfungen mit nächster Fälligkeit (nächste 90 Tage)
  const { data: impfungenRaw } = await supabase
    .from("impfungen")
    .select("impfstoff, naechste_impfung")
    .eq("profil_id", user.id)
    .not("naechste_impfung", "is", null)
    .lt("naechste_impfung", in90Tagen)
    .order("naechste_impfung", { ascending: true });

  // Medikamente mit Enddatum (nächste 90 Tage, nur aktive)
  const { data: medikamenteRaw } = await supabase
    .from("medikamente")
    .select("name, bis_datum")
    .eq("profil_id", user.id)
    .eq("aktiv", true)
    .not("bis_datum", "is", null)
    .lt("bis_datum", in90Tagen)
    .order("bis_datum", { ascending: true });

  // Pflegekosten diesen Monat
  const monatsBeginn = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const { data: pflegekostenRaw } = await supabase
    .from("pflegekosten")
    .select("kategorie, betrag, erstattung")
    .eq("profil_id", user.id)
    .gte("buchungsdatum", monatsBeginn);

  // Pflegekosten nach Kategorien aggregieren
  type KostenEintrag = { kategorie: string; betrag: number; erstattung: number };
  const kategorienMap = new Map<string, KostenEintrag>();

  for (const k of pflegekostenRaw ?? []) {
    const betrag = Number(k.betrag ?? 0);
    const erstattung = Number(k.erstattung ?? 0);
    const existing = kategorienMap.get(k.kategorie) ?? {
      kategorie: k.kategorie,
      betrag: 0,
      erstattung: 0,
    };
    kategorienMap.set(k.kategorie, {
      kategorie: k.kategorie,
      betrag: existing.betrag + betrag,
      erstattung: existing.erstattung + erstattung,
    });
  }

  const kostenKategorien = Array.from(kategorienMap.values());

  return (
    <div className="space-y-4">
      {/* Zeile 1: Ansprüche + Fristen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnspruchsWidget
          pflegegrad={profil?.pflegegrad ?? undefined}
          vorname={profil?.vorname ?? undefined}
        />
        <FristenWarner
          dokumente={(dokumenteRaw ?? []).map((d) => ({
            name: d.name,
            ablaufdatum: d.ablaufdatum!,
            kategorie: d.kategorie ?? "",
          }))}
          impfungen={(impfungenRaw ?? []).map((i) => ({
            impfstoff: i.impfstoff,
            naechste_impfung: i.naechste_impfung!,
          }))}
          medikamente={(medikamenteRaw ?? []).map((m) => ({
            name: m.name,
            bis_datum: m.bis_datum!,
          }))}
        />
      </div>

      {/* Zeile 2: Monatskosten (volle Breite) */}
      <MonatsKosten kosten={kostenKategorien} />

      {/* Zeile 3: Schnellaktionen (volle Breite) */}
      <SchnellaktionenWidget />
    </div>
  );
}
