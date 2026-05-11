import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, FileSearch, CheckCircle } from "lucide-react";

export const metadata = { title: "Klienten | xcare Träger" };

export default async function TraegerKlientenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; lebenslage?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "traeger") redirect("/");

  const { data: traeger } = await supabase
    .from("traeger_profiles").select("id").eq("profile_id", profile.id).single();
  if (!traeger) redirect("/traeger/onboarding");

  const { q, status, lebenslage } = await searchParams;

  let query = supabase
    .from("traeger_klienten")
    .select("*")
    .eq("traeger_id", traeger.id)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (lebenslage) query = query.eq("lebenslage", lebenslage);
  if (q) {
    query = query.or(`vorname.ilike.%${q}%,nachname.ilike.%${q}%,klienten_nr.ilike.%${q}%`);
  }

  const { data: klienten } = await query.limit(100);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    aktiv: { label: "Aktiv", color: "bg-green-50 text-green-700" },
    abgeschlossen: { label: "Abgeschlossen", color: "bg-gray-100 text-gray-600" },
    pausiert: { label: "Pausiert", color: "bg-amber-50 text-amber-700" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Klienten</h1>
        <Link
          href="/traeger/klienten/neu"
          className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Neuer Klient
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex-1 min-w-48">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name oder Fallnummer suchen…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
          </div>
        </form>
        {["aktiv", "abgeschlossen", "pausiert"].map((s) => (
          <Link
            key={s}
            href={`/traeger/klienten?status=${s}${q ? `&q=${q}` : ""}`}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              status === s
                ? "bg-[--primary] text-white border-[--primary]"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {STATUS_LABELS[s].label}
          </Link>
        ))}
        {(status || q) && (
          <Link href="/traeger/klienten" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Zurücksetzen
          </Link>
        )}
      </div>

      {/* Liste */}
      {(klienten ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSearch className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Keine Klienten gefunden</p>
          <p className="text-sm text-gray-400 mt-1">
            {q ? `Keine Treffer für „${q}"` : "Legen Sie den ersten Klienten an"}
          </p>
          <Link
            href="/traeger/klienten/neu"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[--primary] hover:underline"
          >
            <Plus className="h-4 w-4" /> Ersten Klienten anlegen
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Klient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fallnr.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lebenslage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ansprüche</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(klienten ?? []).map((k) => {
                const st = STATUS_LABELS[k.status] ?? STATUS_LABELS.aktiv;
                const anspruchsBetrag = k.pruefungs_ergebnis?.gesamt_monatlich_eur;
                return (
                  <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/traeger/klienten/${k.id}`} className="font-medium text-gray-900 hover:text-[--primary]">
                        {k.vorname ? `${k.vorname} ${k.nachname ?? ""}`.trim() : "Anonym"}
                      </Link>
                      {k.geburtsjahr && (
                        <p className="text-xs text-gray-400">Jg. {k.geburtsjahr}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{k.klienten_nr}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {k.lebenslage ?? "—"}
                      {k.pflegegrad && <span className="ml-1 text-xs text-gray-400">PG{k.pflegegrad}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {k.letzte_pruefung_at ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-700 font-medium">
                            {anspruchsBetrag ? `${anspruchsBetrag}€/Mon` : "Geprüft"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-xs">Noch nicht geprüft</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
