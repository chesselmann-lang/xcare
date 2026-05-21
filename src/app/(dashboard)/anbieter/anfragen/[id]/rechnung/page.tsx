import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const metadata = { title: "Rechnung – xcare" };

function rechnungsNummer(anfrageId: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  const short = anfrageId.slice(0, 6).toUpperCase();
  return `XC-${year}-${short}`;
}

export default async function RechnungPage({
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
  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, strasse, plz, ort, email, telefon, traeger")
    .eq("profile_id", profile.id)
    .single();
  if (!anbieter) redirect("/anbieter/profil");

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("*, profiles:familie_id(vorname, nachname, email, telefon, plz, ort)")
    .eq("id", id)
    .eq("anbieter_id", anbieter.id)
    .single();
  if (!anfrage) notFound();

  const familie = anfrage.profiles as {
    vorname: string | null; nachname: string | null; email: string;
    telefon: string | null; plz: string | null; ort: string | null;
  } | null;

  const rechnungNr = rechnungsNummer(anfrage.id, anfrage.created_at);
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const leistungName = (anfrage.lebenslage ?? "").replace(/_/g, " ");

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 pt-4 print:hidden">
        <Breadcrumb
          items={[
            { label: "Anfragen", href: "/anbieter/anfragen" },
            { label: "Anfrage", href: `/anbieter/anfragen/${id}` },
            { label: "Rechnung" },
          ]}
        />
      </div>
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Screen-only nav */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link href={`/anbieter/anfragen/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Zurück zur Anfrage
          </Button>
        </Link>
        <PrintButton />
      </div>

      {/* Invoice document */}
      <div
        id="rechnung"
        className="bg-white border border-[--border] rounded-xl p-10 shadow-sm print:shadow-none print:border-0 print:p-0 print:rounded-none"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-2xl font-bold text-[#1A5276]">❤️ xcare</p>
            <p className="text-xs text-gray-500 mt-0.5">Ihr digitales Pflege-Ökosystem</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-800">RECHNUNG</p>
            <p className="text-sm text-gray-500 mt-1">Nr. {rechnungNr}</p>
            <p className="text-sm text-gray-500">Datum: {today}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rechnungsaussteller</p>
            <p className="font-semibold text-gray-800">{anbieter.name}</p>
            {anbieter.traeger && <p className="text-sm text-gray-600">{anbieter.traeger}</p>}
            {anbieter.strasse && <p className="text-sm text-gray-600">{anbieter.strasse}</p>}
            {(anbieter.plz || anbieter.ort) && (
              <p className="text-sm text-gray-600">{anbieter.plz} {anbieter.ort}</p>
            )}
            {anbieter.email && <p className="text-sm text-gray-600 mt-1">{anbieter.email}</p>}
            {anbieter.telefon && <p className="text-sm text-gray-600">{anbieter.telefon}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Rechnungsempfänger</p>
            {familie ? (
              <>
                <p className="font-semibold text-gray-800">
                  {[familie.vorname, familie.nachname].filter(Boolean).join(" ") || familie.email}
                </p>
                {(familie.plz || familie.ort) && (
                  <p className="text-sm text-gray-600">{familie.plz} {familie.ort}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">{familie.email}</p>
                {familie.telefon && <p className="text-sm text-gray-600">{familie.telefon}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-500">Kundendaten nicht verfügbar</p>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-[#1A5276]">
              <th className="text-left py-2 text-sm font-semibold text-[#1A5276] w-1/2">Leistungsbeschreibung</th>
              <th className="text-center py-2 text-sm font-semibold text-[#1A5276]">Menge</th>
              <th className="text-right py-2 text-sm font-semibold text-[#1A5276]">Einzelpreis</th>
              <th className="text-right py-2 text-sm font-semibold text-[#1A5276]">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <p className="text-sm font-medium text-gray-800 capitalize">{leistungName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Anfrage-Nr.: {anfrage.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-500">Anfragedatum: {formatDate(anfrage.created_at)}</p>
              </td>
              <td className="py-3 text-center text-sm text-gray-700">1</td>
              <td className="py-3 text-right text-sm text-gray-700">—</td>
              <td className="py-3 text-right text-sm font-medium text-gray-800">—</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td colSpan={3} className="py-3 text-right text-sm font-semibold text-gray-700">Zwischensumme (netto)</td>
              <td className="py-3 text-right text-sm font-semibold text-gray-700">—</td>
            </tr>
            <tr>
              <td colSpan={3} className="py-2 text-right text-sm text-gray-500">zzgl. MwSt. 0 % (gemeinnützig)</td>
              <td className="py-2 text-right text-sm text-gray-500">0,00 €</td>
            </tr>
            <tr className="border-t-2 border-[#1A5276]">
              <td colSpan={3} className="pt-3 text-right text-base font-bold text-[#1A5276]">Gesamtbetrag</td>
              <td className="pt-3 text-right text-base font-bold text-[#1A5276]">—</td>
            </tr>
          </tfoot>
        </table>

        {/* Payment instructions */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">Zahlungshinweis</p>
          <p>Bitte begleichen Sie den Rechnungsbetrag innerhalb von 14 Tagen nach Rechnungserhalt.</p>
          <p className="mt-1 text-xs text-gray-500">
            Diese Rechnung wurde über die xcare-Plattform ausgestellt. Bitte tragen Sie den finalen Betrag entsprechend Ihrer Vereinbarung ein.
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm text-gray-600">Anfrage-Status zum Rechnungsdatum:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 capitalize">
            {anfrage.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-6 text-center">
          <p className="text-xs text-gray-400">
            xcare gemeinnützige GmbH · xcare.de · {today}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Diese Rechnung ist maschinell erstellt und ohne Unterschrift gültig.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}