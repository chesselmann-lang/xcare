import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BuchungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: buchungen } = await supabase
    .from("buchungen")
    .select("*")
    .order("datum", { ascending: true });

  const statusColors: Record<string, string> = {
    angefragt: "bg-yellow-100 text-yellow-700",
    bestaetigt: "bg-green-100 text-green-700",
    abgeschlossen: "bg-gray-100 text-gray-700",
    storniert: "bg-red-100 text-red-700",
    streit: "bg-orange-100 text-orange-700",
  };

  const leistungsartLabels: Record<string, string> = {
    grundpflege: "Grundpflege",
    behandlungspflege: "Behandlungspflege",
    hauswirtschaft: "Hauswirtschaft",
    begleitung: "Begleitung",
    betreuung: "Betreuung",
    nachtpflege: "Nachtpflege",
    verhinderungspflege: "Verhinderungspflege",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Meine Buchungen</h1>
      {(!buchungen || buchungen.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Noch keine Buchungen</p>
          <a href="/familie/pflegeboerse" className="mt-4 inline-block text-blue-600 hover:underline">
            Zur Pflegebörse →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {buchungen.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">
                  {new Date(b.datum).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {b.zeit_von?.slice(0,5)} – {b.zeit_bis?.slice(0,5)} Uhr · {leistungsartLabels[b.leistungsart] || b.leistungsart}
                </div>
                {b.notizen && <div className="text-sm text-gray-400 mt-1 italic">{b.notizen}</div>}
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[b.status] || "bg-gray-100 text-gray-700"}`}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
                {b.gesamtbetrag && (
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {Number(b.gesamtbetrag).toFixed(2)} €
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
