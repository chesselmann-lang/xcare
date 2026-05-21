import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notfall-Sperrbildschirm exportieren | xcare",
};

export default async function SperrbildschirmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, vorname, nachname")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/familie");

  const [{ data: plan }, { data: kontakte }] = await Promise.all([
    supabase
      .from("notfallplaene")
      .select("blutgruppe, allergien, chronische_erkrankungen, dnr_verfuegung, patientenverfuegung_vorhanden, medikamente_notfall, hausarzt_name, hausarzt_telefon, krankenkasse, versicherungsnummer")
      .eq("familie_profile_id", profile.id)
      .eq("aktiv", true)
      .single(),
    supabase
      .from("notfallkontakte")
      .select("name, beziehung, telefon_1, telefon_2")
      .eq("familie_profile_id", profile.id)
      .order("prioritaet")
      .limit(6),
  ]);

  const name = [profile.vorname, profile.nachname].filter(Boolean).join(" ") || "—";
  const today = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date());

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Screen-only controls */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/familie/notfall" className="text-sm text-gray-500 hover:text-gray-700">
          ← Zurück zum Notfallplan
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            Als PDF speichern: Browser-Druck → "Als PDF speichern"
          </p>
          <button
            onClick={() => window.print()}
            className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            suppressHydrationWarning
          >
            Drucken / Als PDF speichern
          </button>
        </div>
      </div>

      {/* Print instructions (screen only) */}
      <div className="print:hidden max-w-2xl mx-auto mt-6 mb-4 px-6">
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">So exportieren Sie die Karte als PDF:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
            <li>Klicken Sie auf „Drucken / Als PDF speichern"</li>
            <li>Wählen Sie als Drucker „Als PDF speichern" (macOS/Windows)</li>
            <li>Empfehlung: Querformat, randlos oder kleine Ränder</li>
            <li>Drucken und auf Kreditkartengröße zuschneiden oder auf Handy als Wallpaper speichern</li>
          </ol>
        </div>
      </div>

      {/* The printable card */}
      <div className="max-w-2xl mx-auto px-6 pb-12 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-lg print:shadow-none print:rounded-none overflow-hidden">
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #c0392b 0%, #922b21 100%)" }} className="px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-0.5">Notfallkarte · xcare</p>
                <h1 className="text-2xl font-bold">{name}</h1>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-70">Stand: {today}</p>
                <div className="mt-1 bg-white/20 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-xs font-medium opacity-80">ICE – Im Notfall</p>
                  <p className="text-xs opacity-80">In Case of Emergency</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
            {/* Medical Info */}
            <div className="p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3 flex items-center gap-1.5">
                <span className="text-base">🩺</span> Medizinische Informationen
              </h2>
              <dl className="space-y-2 text-sm">
                {plan?.blutgruppe && (
                  <div>
                    <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Blutgruppe</dt>
                    <dd className="font-bold text-red-700 text-lg leading-tight">{plan.blutgruppe}</dd>
                  </div>
                )}
                {plan?.allergien && (
                  <div>
                    <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Allergien</dt>
                    <dd className="text-gray-800 leading-snug">{plan.allergien}</dd>
                  </div>
                )}
                {plan?.chronische_erkrankungen && (
                  <div>
                    <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Erkrankungen</dt>
                    <dd className="text-gray-800 leading-snug">{plan.chronische_erkrankungen}</dd>
                  </div>
                )}
                {plan?.medikamente_notfall && (
                  <div>
                    <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Medikamente (Notfall)</dt>
                    <dd className="text-gray-800 leading-snug">{plan.medikamente_notfall}</dd>
                  </div>
                )}
                {plan?.dnr_verfuegung && (
                  <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2">
                    <p className="text-xs font-bold text-amber-800">⚠ DNR-Verfügung vorhanden</p>
                  </div>
                )}
                {plan?.patientenverfuegung_vorhanden && (
                  <div>
                    <dd className="text-xs text-gray-500">✓ Patientenverfügung vorhanden</dd>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-100">
                  {plan?.hausarzt_name && (
                    <div className="mb-1">
                      <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hausarzt</dt>
                      <dd className="text-gray-800 text-xs">{plan.hausarzt_name}</dd>
                      {plan.hausarzt_telefon && (
                        <dd className="text-gray-600 text-xs font-mono">{plan.hausarzt_telefon}</dd>
                      )}
                    </div>
                  )}
                  {plan?.krankenkasse && (
                    <div>
                      <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Krankenkasse</dt>
                      <dd className="text-gray-800 text-xs">{plan.krankenkasse}
                        {plan.versicherungsnummer && (
                          <span className="text-gray-500"> · {plan.versicherungsnummer}</span>
                        )}
                      </dd>
                    </div>
                  )}
                </div>
                {!plan && (
                  <p className="text-xs text-gray-400 italic">Noch keine Informationen eingetragen</p>
                )}
              </dl>
            </div>

            {/* Emergency Contacts */}
            <div className="p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3 flex items-center gap-1.5">
                <span className="text-base">📞</span> Notfallkontakte
              </h2>
              {(!kontakte || kontakte.length === 0) ? (
                <p className="text-xs text-gray-400 italic">Noch keine Kontakte eingetragen</p>
              ) : (
                <div className="space-y-3">
                  {kontakte.map((k, i) => (
                    <div key={i} className={`${i === 0 ? "bg-red-50 rounded-lg p-3 border border-red-200" : ""}`}>
                      {i === 0 && (
                        <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest mb-1">Primärkontakt</p>
                      )}
                      <p className="text-sm font-bold text-gray-900 leading-tight">{k.name}</p>
                      <p className="text-xs text-gray-500 mb-1">{k.beziehung}</p>
                      <a
                        href={`tel:${k.telefon_1}`}
                        className="text-base font-mono font-bold text-red-700 tracking-wide"
                      >
                        {k.telefon_1}
                      </a>
                      {k.telefon_2 && (
                        <p className="text-xs font-mono text-gray-500">{k.telefon_2}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Standard emergency numbers */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Notrufnummern</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Notruf", num: "112" },
                    { label: "Polizei", num: "110" },
                    { label: "Giftnotruf", num: "19240" },
                  ].map(({ label, num }) => (
                    <div key={num} className="rounded-lg bg-gray-50 border border-gray-200 py-1.5">
                      <p className="text-[9px] text-gray-400 font-medium">{label}</p>
                      <a href={`tel:${num}`} className="text-base font-bold text-gray-800 font-mono">{num}</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Erstellt mit xcare — Digitales Pflege-Ökosystem</p>
            <p className="text-[10px] text-gray-400">Stand: {today}</p>
          </div>
        </div>
      </div>

      {/* Print script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Auto-add print button click handler
            document.addEventListener('DOMContentLoaded', function() {
              var btn = document.querySelector('[data-print]');
              if (btn) btn.addEventListener('click', function() { window.print(); });
            });
          `,
        }}
      />

      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
