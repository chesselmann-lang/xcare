"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PflegegradEintrag {
  id: string;
  einschaetzung_datum: string;
  aktueller_pflegegrad?: number | null;
  pflegegrad_empfehlung: number;
  gesamtpunkte: number;
  notizen?: string | null;
}

interface Props {
  eintraege: PflegegradEintrag[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

type ModulKey =
  | "m1_bettpositionswechsel" | "m1_halten_sitzposition" | "m1_umsetzen" | "m1_fortbewegung_innen" | "m1_treppensteigen"
  | "m2_personen_erkennen" | "m2_oertliche_orientierung" | "m2_zeitliche_orientierung" | "m2_alltagsgegenstaende" | "m2_risiken_erkennen"
  | "m3_motorische_unruhe" | "m3_naechtliche_unruhe" | "m3_abwehrverhalten"
  | "m4_waschen_gesicht" | "m4_koerperpflege" | "m4_an_auskleiden" | "m4_ernaehrung" | "m4_trinken" | "m4_toilettennutzung"
  | "m5_medikamente" | "m5_arztbesuche" | "m5_hilfsmittel"
  | "m6_tagesstruktur" | "m6_freizeitgestaltung" | "m6_kontakte";

const MODULE = [
  {
    key: "m1", label: "M1 – Mobilität", gewicht: "10%",
    items: [
      { key: "m1_bettpositionswechsel", label: "Positionswechsel im Bett" },
      { key: "m1_halten_sitzposition", label: "Stabile Sitzposition halten" },
      { key: "m1_umsetzen", label: "Umsetzen" },
      { key: "m1_fortbewegung_innen", label: "Fortbewegen innerhalb des Wohnbereichs" },
      { key: "m1_treppensteigen", label: "Treppensteigen" },
    ],
  },
  {
    key: "m2", label: "M2 – Kognitive & kommunikative Fähigkeiten", gewicht: "15%",
    items: [
      { key: "m2_personen_erkennen", label: "Personen der Nahwelt erkennen" },
      { key: "m2_oertliche_orientierung", label: "Örtliche Orientierung" },
      { key: "m2_zeitliche_orientierung", label: "Zeitliche Orientierung" },
      { key: "m2_alltagsgegenstaende", label: "Alltagsgegenstände erkennen" },
      { key: "m2_risiken_erkennen", label: "Risiken und Gefahren erkennen" },
    ],
  },
  {
    key: "m3", label: "M3 – Verhaltensweisen & psych. Problemlagen", gewicht: "10%",
    items: [
      { key: "m3_motorische_unruhe", label: "Motorisch geprägte Verhaltensauffälligkeiten" },
      { key: "m3_naechtliche_unruhe", label: "Nächtliche Unruhe" },
      { key: "m3_abwehrverhalten", label: "Abwehr pflegerischer Maßnahmen" },
    ],
  },
  {
    key: "m4", label: "M4 – Selbstversorgung", gewicht: "40%",
    items: [
      { key: "m4_waschen_gesicht", label: "Waschen des vorderen Oberkörpers" },
      { key: "m4_koerperpflege", label: "Körperpflege im Bereich Kopf" },
      { key: "m4_an_auskleiden", label: "An- und Auskleiden des Oberkörpers" },
      { key: "m4_ernaehrung", label: "Essen mundgerecht zubereiten, Nahrung aufnehmen" },
      { key: "m4_trinken", label: "Trinken" },
      { key: "m4_toilettennutzung", label: "Toilette/Toilettenstuhl benutzen" },
    ],
  },
  {
    key: "m5", label: "M5 – Umgang mit krankheitsbedingten Anforderungen", gewicht: "20%",
    items: [
      { key: "m5_medikamente", label: "Medikamente" },
      { key: "m5_arztbesuche", label: "Arzt- / Therapiebesuche" },
      { key: "m5_hilfsmittel", label: "Hilfsmittel nutzen und versorgen" },
    ],
  },
  {
    key: "m6", label: "M6 – Gestaltung des Alltagslebens", gewicht: "15%",
    items: [
      { key: "m6_tagesstruktur", label: "Gestaltung des Tagesablaufs" },
      { key: "m6_freizeitgestaltung", label: "Ruhen und Schlafen" },
      { key: "m6_kontakte", label: "Kontakte pflegen" },
    ],
  },
];

const WERT_OPTIONS = [
  { v: 0, label: "0 – Selbstständig" },
  { v: 1, label: "1 – Überwiegend selbstständig" },
  { v: 2, label: "2 – Überwiegend unselbstständig" },
  { v: 3, label: "3 – Unselbstständig" },
];

const PG_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
  5: "bg-red-200 text-red-800",
};

function initForm(): Record<ModulKey, number | null> {
  return MODULE.flatMap((m) => m.items).reduce((acc, item) => {
    acc[item.key as ModulKey] = null;
    return acc;
  }, {} as Record<ModulKey, number | null>);
}

export default function PflegegradClient({ eintraege: initial, isAnbieter, familieProfileId }: Props) {
  const [eintraege, setEintraege] = useState(initial);
  const [view, setView] = useState<"einschaetzen" | "verlauf">("verlauf");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Record<ModulKey, number | null>>(initForm());
  const [meta, setMeta] = useState({ aktueller_pflegegrad: "", notizen: "", einschaetzung_datum: new Date().toISOString().slice(0, 10) });
  const [result, setResult] = useState<{ gesamtpunkte: number; pflegegrad_empfehlung: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleModule(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  async function handleSubmit() {
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        ...meta,
        aktueller_pflegegrad: meta.aktueller_pflegegrad ? parseInt(meta.aktueller_pflegegrad) : undefined,
        ...(isAnbieter && familieProfileId ? { familie_profile_id: familieProfileId } : {}),
      };
      const res = await fetch("/api/pflegegrad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setResult({ gesamtpunkte: entry.gesamtpunkte, pflegegrad_empfehlung: entry.pflegegrad_empfehlung });
      setEintraege((prev) => [entry, ...prev]);
      setMsg("✓ Einschätzung gespeichert");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const filledCount = Object.values(form).filter((v) => v !== null).length;
  const totalItems = MODULE.flatMap((m) => m.items).length;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setView("verlauf")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === "verlauf" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Einschätzungen
        </button>
        <button
          onClick={() => setView("einschaetzen")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === "einschaetzen" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Neue Einschätzung
        </button>
      </div>

      {view === "verlauf" && (
        <div className="space-y-4">
          {eintraege.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              Noch keine Einschätzungen vorhanden
            </div>
          ) : (
            eintraege.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">
                      {format(parseISO(e.einschaetzung_datum), "dd. MMMM yyyy", { locale: de })}
                    </div>
                    {e.aktueller_pflegegrad && (
                      <div className="text-xs text-gray-400 mt-0.5">Aktueller PG: {e.aktueller_pflegegrad}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Gesamtpunkte</div>
                      <div className="text-lg font-bold text-gray-800">{e.gesamtpunkte}</div>
                    </div>
                    <div className={`text-2xl font-bold px-4 py-2 rounded-xl ${PG_COLORS[e.pflegegrad_empfehlung]}`}>
                      PG {e.pflegegrad_empfehlung}
                    </div>
                  </div>
                </div>
                {e.notizen && <div className="mt-3 text-sm text-gray-600 italic">{e.notizen}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {view === "einschaetzen" && (
        <div className="space-y-4">
          {result && (
            <div className={`p-5 rounded-xl border-2 text-center ${PG_COLORS[result.pflegegrad_empfehlung]} border-current`}>
              <div className="text-4xl font-bold">PG {result.pflegegrad_empfehlung}</div>
              <div className="text-sm mt-1">Empfehlung basierend auf {result.gesamtpunkte} Gesamtpunkten (NBI)</div>
            </div>
          )}

          {msg && (
            <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {msg}
            </div>
          )}

          {/* Meta */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Datum</label>
              <input type="date" value={meta.einschaetzung_datum} onChange={(e) => setMeta((m) => ({ ...m, einschaetzung_datum: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Aktueller Pflegegrad</label>
              <select value={meta.aktueller_pflegegrad} onChange={(e) => setMeta((m) => ({ ...m, aktueller_pflegegrad: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— kein /unbekannt</option>
                {[1,2,3,4,5].map((v) => <option key={v} value={v}>PG {v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Notizen</label>
              <input type="text" value={meta.notizen} onChange={(e) => setMeta((m) => ({ ...m, notizen: e.target.value }))}
                placeholder="Freie Anmerkungen..."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="text-sm text-gray-500 text-right">{filledCount} / {totalItems} Items bewertet</div>

          {MODULE.map((modul) => {
            const isOpen = expanded[modul.key] !== false; // open by default
            const modulFilled = modul.items.filter((i) => form[i.key as ModulKey] !== null).length;
            return (
              <div key={modul.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleModule(modul.key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800 text-sm">{modul.label}</span>
                    <span className="text-xs text-gray-400">Gewicht {modul.gewicht}</span>
                    {modulFilled > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {modulFilled}/{modul.items.length}
                      </span>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
                    {modul.items.map((item) => (
                      <div key={item.key}>
                        <div className="text-sm text-gray-700 mb-1">{item.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {WERT_OPTIONS.map(({ v, label }) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, [item.key]: v }))}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                form[item.key as ModulKey] === v
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "border-gray-300 text-gray-600 hover:border-blue-400"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Berechnung läuft…" : "Pflegegrad berechnen & speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
