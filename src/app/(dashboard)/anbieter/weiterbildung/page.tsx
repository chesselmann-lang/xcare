import { Metadata } from "next";
import { WeiterbildungClient } from "@/components/weiterbildung/WeiterbildungClient";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Weiterbildung & Zertifikate | xcare",
  description:
    "Zertifizierte Pflegefortbildungen — Palliativpflege, Demenz, Wundversorgung und mehr",
};

export default async function WeiterbildungPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: kurse } = await supabase
    .from("kurse")
    .select(
      `
      id, titel, beschreibung, kategorie, niveau, format, dauer_stunden,
      preis_regulaer, preis_foerderung, foerderung_moeglich, foerderung_info,
      zertifikat_erhalten, zertifikat_name, lernziele, naechste_termine,
      bewertung_schnitt, anzahl_bewertungen,
      kurs_anbieter(id, name, zertifizierungen)
    `
    )
    .eq("aktiv", true)
    .order("bewertung_schnitt", { ascending: false })
    .limit(30);

  const { data: buchungen } = user
    ? await supabase
        .from("kurs_buchungen")
        .select(
          "id, status, termin_datum, kurs_id, zertifikat_ausgestellt, kurse(titel, kategorie)"
        )
        .eq("user_id", user.id)
        .order("erstellt_am", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Weiterbildung & Zertifikate</h1>
        <p className="text-gray-500 mt-1">
          Zertifizierte Fortbildungen für Pflegefachkräfte — mit Förderungsmöglichkeiten
        </p>
      </div>
      <WeiterbildungClient
        initialKurse={(kurse ?? []) as Parameters<typeof WeiterbildungClient>[0]["initialKurse"]}
        initialBuchungen={(buchungen ?? []) as Parameters<typeof WeiterbildungClient>[0]["initialBuchungen"]}
      />
    </div>
  );
}
