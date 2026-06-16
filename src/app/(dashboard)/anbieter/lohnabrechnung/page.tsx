import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LohnabrechnungClient } from "@/components/lohnabrechnung/LohnabrechnungClient";

export const metadata: Metadata = {
  title: "Lohnabrechnung | xcare",
  description: "Monatliche Gehaltsabrechnung für Pflegekräfte — mit DATEV/LODAS CSV-Export.",
};

export default async function LohnabrechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/profil");

  const { monat: monatParam } = await searchParams;
  const monat = monatParam ?? new Date().toISOString().slice(0, 7);
  const periodeStart = `${monat}-01`;
  const periodeEndeDate = new Date(
    new Date(periodeStart).setMonth(new Date(periodeStart).getMonth() + 1, 0)
  );
  const periodeEnde = periodeEndeDate.toISOString().slice(0, 10);

  // Care Workers
  const { data: careWorkers } = await supabase
    .from("care_workers")
    .select("id, vorname, nachname, stundensatz_ct, rolle")
    .eq("anbieter_id", anbieter.id)
    .eq("aktiv", true)
    .order("nachname");

  // Schichten für den Monat
  const { data: schichten } = await supabase
    .from("schichten")
    .select("id, care_worker_id, start_ts, ende_ts, status, stunden_geplant, stundensatz_ct, schichttyp")
    .eq("anbieter_id", anbieter.id)
    .gte("start_ts", `${periodeStart}T00:00:00Z`)
    .lte("start_ts", `${periodeEnde}T23:59:59Z`)
    .in("status", ["bestaetigt", "abgeschlossen"]);

  // Bestehende Lohnperioden
  const { data: existingPerioden } = await supabase
    .from("lohnperioden")
    .select("*")
    .eq("anbieter_id", anbieter.id)
    .eq("periode_start", periodeStart);

  const periodeMap = new Map((existingPerioden ?? []).map(p => [p.care_worker_id, p]));

  // Aggregation
  const perioden = (careWorkers ?? []).map(cw => {
    const cwSchichten = (schichten ?? []).filter(s => s.care_worker_id === cw.id);
    const existing = periodeMap.get(cw.id);

    let stundenGeplant = 0;
    let stundenTatsaechlich = 0;
    let zuschlaegeCtCalc = 0;

    for (const s of cwSchichten) {
      const start = new Date(s.start_ts);
      const ende = new Date(s.ende_ts);
      const dauerH = (ende.getTime() - start.getTime()) / 3600000;
      stundenGeplant += Number(s.stunden_geplant ?? dauerH);
      if (s.status === "abgeschlossen") stundenTatsaechlich += dauerH;
      const stunde = start.getHours();
      if (stunde >= 22 || stunde < 6)
        zuschlaegeCtCalc += Math.round(dauerH * (cw.stundensatz_ct ?? 0) * 0.25);
      const dow = start.getDay();
      if (dow === 0 || dow === 6)
        zuschlaegeCtCalc += Math.round(dauerH * (cw.stundensatz_ct ?? 0) * 0.20);
    }

    const grundlohnCt = Math.round(stundenGeplant * (cw.stundensatz_ct ?? 0));
    const bruttoCt = grundlohnCt + zuschlaegeCtCalc;

    if (existing) {
      return {
        ...existing,
        care_worker: { vorname: cw.vorname, nachname: cw.nachname, stundensatz_ct: cw.stundensatz_ct, rolle: cw.rolle },
        schichten_anzahl: cwSchichten.length,
      } as Parameters<typeof LohnabrechnungClient>[0]["initialPerioden"][0];
    }

    return {
      id: null,
      anbieter_id: anbieter.id,
      care_worker_id: cw.id,
      care_worker: { vorname: cw.vorname, nachname: cw.nachname, stundensatz_ct: cw.stundensatz_ct, rolle: cw.rolle },
      periode_start: periodeStart,
      periode_ende: periodeEnde,
      schichten_anzahl: cwSchichten.length,
      stunden_geplant: parseFloat(stundenGeplant.toFixed(2)),
      stunden_tatsaechlich: parseFloat(stundenTatsaechlich.toFixed(2)),
      zuschlaege_ct: zuschlaegeCtCalc,
      brutto_ct: bruttoCt,
      status: "offen" as const,
      notizen: null,
      freigegeben_von: null,
      freigegeben_am: null,
      exportiert_am: null,
    };
  });

  const summe = {
    schichten: perioden.reduce((a, p) => a + (p.schichten_anzahl ?? 0), 0),
    stundenGeplant: perioden.reduce((a, p) => a + (Number(p.stunden_geplant) ?? 0), 0),
    bruttoCt: perioden.reduce((a, p) => a + (p.brutto_ct ?? 0), 0),
  };

  return (
    <LohnabrechnungClient
      initialPerioden={perioden}
      initialMonat={monat}
      initialSumme={summe}
    />
  );
}
