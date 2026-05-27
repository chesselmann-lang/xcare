import { createClient } from "@/lib/supabase/server";
import { PflegeboerseClient } from "@/components/pflegeboerse/PflegeboerseClient";

export const metadata = {
  title: "Pflegebörse | xcare",
  description:
    "Finden und buchen Sie qualifizierte Pflegekräfte in Ihrer Nähe – mit Echtzeit-Verfügbarkeit.",
};

export default async function PflegeboersePage() {
  const supabase = await createClient();

  // Load all anbieter profiles with their availability for today and the next 7 days
  const heute = new Date().toISOString().slice(0, 10);
  const inSiebenTagen = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const { data: anbieter } = await supabase
    .from("profiles")
    .select(
      `
      id,
      vorname,
      nachname,
      avatar_url,
      beschreibung,
      anbieter_verfuegbarkeit(
        id,
        datum,
        zeit_von,
        zeit_bis,
        status,
        stundensatz
      )
    `
    )
    .eq("rolle", "anbieter")
    .gte("anbieter_verfuegbarkeit.datum", heute)
    .lte("anbieter_verfuegbarkeit.datum", inSiebenTagen)
    .order("nachname");

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pflegebörse</h1>
        <p className="mt-1 text-gray-500">
          Finden und buchen Sie qualifizierte Pflegekräfte in Ihrer Nähe —
          mit Echtzeit-Verfügbarkeit.
        </p>
      </div>

      <PflegeboerseClient initialAnbieter={anbieter ?? []} />
    </div>
  );
}
