import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Euro, FileSearch, Calendar } from "lucide-react";
import KlientAnspruchsPruefungClient from "@/components/traeger/KlientAnspruchsPruefungClient";

export default async function KlientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "traeger") redirect("/");

  const { data: traeger } = await supabase
    .from("traeger_profiles").select("id").eq("profile_id", profile.id).single();
  if (!traeger) redirect("/traeger/onboarding");

  const { data: klient } = await supabase
    .from("traeger_klienten")
    .select("*")
    .eq("id", id)
    .eq("traeger_id", traeger.id)
    .single();

  if (!klient) notFound();

  const ergebnis = klient.pruefungs_ergebnis as {
    gesamt_monatlich_eur?: number;
    gesamt_jaehrlich_eur?: number;
    ansprueche?: Array<{ titel: string; betrag_monatlich_eur?: number; voraussetzungen_erfuellt: boolean }>;
  } | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/traeger/klienten" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {klient.vorname ? `${klient.vorname} ${klient.nachname ?? ""}`.trim() : `Fall ${klient.klienten_nr}`}
          </h1>
          <p className="text-sm text-gray-500">Fallnr. {klient.klienten_nr}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Stammdaten */}
        <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Stammdaten</h2>
          {[
            { label: "Geburtsjahr", value: klient.geburtsjahr },
            { label: "PLZ", value: klient.plz },
            { label: "Lebenslage", value: klient.lebenslage },
            { label: "Pflegegrad", value: klient.pflegegrad ? `PG ${klient.pflegegrad}` : null },
            { label: "Status", value: klient.status },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-gray-800 capitalize">{String(value)}</p>
            </div>
          ) : null)}
          {klient.notizen && (
            <div>
              <p className="text-xs text-gray-400">Notizen</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{klient.notizen}</p>
            </div>
          )}
        </div>

        {/* Anspruchs-Ergebnis */}
        <div className="md:col-span-2 space-y-4">
          {ergebnis ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h2 className="font-semibold text-gray-800">Anspruchsprüfung</h2>
                {klient.letzte_pruefung_at && (
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(klient.letzte_pruefung_at).toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Euro className="h-4 w-4 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{ergebnis.gesamt_monatlich_eur ?? 0}€</p>
                  <p className="text-xs text-green-600">pro Monat</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Euro className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{ergebnis.gesamt_jaehrlich_eur ?? 0}€</p>
                  <p className="text-xs text-blue-600">pro Jahr</p>
                </div>
              </div>

              {(ergebnis.ansprueche ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Einzelne Ansprüche</p>
                  {(ergebnis.ansprueche ?? []).filter(a => a.voraussetzungen_erfuellt).map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <p className="text-sm text-gray-800">{a.titel}</p>
                      {a.betrag_monatlich_eur ? (
                        <span className="text-sm font-medium text-green-600">{a.betrag_monatlich_eur}€/Mon</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
              <FileSearch className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="font-medium text-amber-800">Noch keine Anspruchsprüfung</p>
              <p className="text-sm text-amber-600 mt-1">
                Starten Sie die Anspruchsprüfung für diesen Klienten.
              </p>
            </div>
          )}

          {/* Prüfung starten / neu starten */}
          <KlientAnspruchsPruefungClient klientId={klient.id} klient={klient} />
        </div>
      </div>
    </div>
  );
}
