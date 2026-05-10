"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnspruchsErgebnis, AnspruchsInput } from "@/lib/anspruch/types";
import {
  CheckCircle,
  AlertCircle,
  Euro,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
} from "lucide-react";

interface Props {
  lebenslage: AnspruchsInput["lebenslage"];
  /** Vorbefüllte Werte aus Onboarding-Wizard */
  prefill?: Partial<AnspruchsInput>;
}

interface FormState {
  alter: string;
  pflegegrad: string;
  gdb: string;
  familienstand: AnspruchsInput["familienstand"];
  wohnform: AnspruchsInput["wohnform"];
  kinderAnzahl: string;
  haushaltshilfeEur: string;
  pflegeEur: string;
  zvE: string;
  pflegeDurchAngehoerige: boolean;
  pflegepersonBerufstaetig: boolean;
  erwerbstaetig: boolean;
}

export function AnspruchsRechner({ lebenslage, prefill }: Props) {
  const [schritt, setSchritt] = useState<"eingabe" | "ergebnis">("eingabe");
  const [loading, setLoading] = useState(false);
  const [ergebnis, setErgebnis] = useState<AnspruchsErgebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufgeklappt, setAufgeklappt] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<FormState>({
    alter: "",
    pflegegrad: "",
    gdb: "",
    familienstand: "ledig",
    wohnform: "privat",
    kinderAnzahl: "0",
    haushaltshilfeEur: "",
    pflegeEur: "",
    zvE: "",
    pflegeDurchAngehoerige: true,
    pflegepersonBerufstaetig: false,
    erwerbstaetig: false,
  });

  const handleBerechnen = async () => {
    if (!form.alter) {
      setFehler("Bitte geben Sie das Alter an.");
      return;
    }
    setFehler(null);
    setLoading(true);

    const input: AnspruchsInput = {
      lebenslage,
      alter: Number(form.alter),
      familienstand: form.familienstand,
      wohnform: form.wohnform,
      versicherungsart: "gkv",
      pflegegrad: form.pflegegrad
        ? (Number(form.pflegegrad) as AnspruchsInput["pflegegrad"])
        : undefined,
      gdb: form.gdb ? (Number(form.gdb) as AnspruchsInput["gdb"]) : undefined,
      kinder:
        Number(form.kinderAnzahl) > 0
          ? Array.from({ length: Number(form.kinderAnzahl) }, (_, i) => ({ alter: 5 + i }))
          : undefined,
      haushaltshilfe_aufwendungen_eur: form.haushaltshilfeEur
        ? Number(form.haushaltshilfeEur)
        : undefined,
      pflege_aufwendungen_eur: form.pflegeEur ? Number(form.pflegeEur) : undefined,
      zu_versteuerndes_einkommen_eur: form.zvE ? Number(form.zvE) : undefined,
      pflege_durch_angehoerige: form.pflegeDurchAngehoerige,
      pflegeperson_berufstaetig: form.pflegepersonBerufstaetig,
      erwerbstaetig: form.erwerbstaetig,
    };

    try {
      const res = await fetch("/api/anspruch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Fehler bei der Berechnung");
      }

      const data: AnspruchsErgebnis = await res.json();
      setErgebnis(data);
      setSchritt("ergebnis");
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const toggleAufgeklappt = (id: string) => {
    setAufgeklappt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (schritt === "ergebnis" && ergebnis) {
    return <ErgebnisAnsicht ergebnis={ergebnis} aufgeklappt={aufgeklappt} toggle={toggleAufgeklappt} onZurueck={() => setSchritt("eingabe")} />;
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Anspruchs-Rechner</h2>
        <p className="text-sm text-gray-500 mt-1">
          Deterministisch · Kein KI-Urteil · Stand 2025 · Kein Datenschutz-Risiko
        </p>
      </div>

      <div className="space-y-4">
        {/* Alter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alter der pflegebedürftigen Person *
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={form.alter}
            onChange={(e) => setForm((f) => ({ ...f, alter: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="z.B. 75"
          />
        </div>

        {/* Pflegegrad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pflegegrad (falls vorhanden)
          </label>
          <select
            value={form.pflegegrad}
            onChange={(e) => setForm((f) => ({ ...f, pflegegrad: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Noch kein Pflegegrad / Unbekannt</option>
            <option value="1">Pflegegrad 1</option>
            <option value="2">Pflegegrad 2</option>
            <option value="3">Pflegegrad 3</option>
            <option value="4">Pflegegrad 4</option>
            <option value="5">Pflegegrad 5</option>
          </select>
        </div>

        {/* Familienstand */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Familienstand</label>
          <select
            value={form.familienstand}
            onChange={(e) =>
              setForm((f) => ({ ...f, familienstand: e.target.value as AnspruchsInput["familienstand"] }))
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="ledig">Ledig / Alleinstehend</option>
            <option value="verheiratet">Verheiratet / in Lebenspartnerschaft</option>
            <option value="geschieden">Geschieden</option>
            <option value="verwitwet">Verwitwet</option>
          </select>
        </div>

        {/* Wohnform */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wohnform</label>
          <select
            value={form.wohnform}
            onChange={(e) =>
              setForm((f) => ({ ...f, wohnform: e.target.value as AnspruchsInput["wohnform"] }))
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="privat">Eigene Wohnung / Haus</option>
            <option value="wohngemeinschaft">Ambulant betreute Pflege-WG</option>
            <option value="betreutes_wohnen">Betreutes Wohnen</option>
            <option value="heim">Pflegeheim (stationär)</option>
          </select>
        </div>

        {/* GdB */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grad der Behinderung (GdB) – falls anerkannt
          </label>
          <select
            value={form.gdb}
            onChange={(e) => setForm((f) => ({ ...f, gdb: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Kein / Unbekannt</option>
            <option value="20">GdB 20</option>
            <option value="30">GdB 30</option>
            <option value="40">GdB 40</option>
            <option value="50">GdB 50 (Schwerbehindert)</option>
            <option value="60">GdB 60</option>
            <option value="70">GdB 70</option>
            <option value="80">GdB 80</option>
            <option value="90">GdB 90</option>
            <option value="100">GdB 100</option>
          </select>
        </div>

        {/* Haushaltshilfe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Jährliche Ausgaben für Haushaltshilfe (€) – für § 35a EStG
          </label>
          <input
            type="number"
            min={0}
            value={form.haushaltshilfeEur}
            onChange={(e) => setForm((f) => ({ ...f, haushaltshilfeEur: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="z.B. 3600"
          />
        </div>

        {/* Kinder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anzahl minderjähriger Kinder
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={form.kinderAnzahl}
            onChange={(e) => setForm((f) => ({ ...f, kinderAnzahl: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Pflege durch Angehörige */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.pflegeDurchAngehoerige}
            onChange={(e) => setForm((f) => ({ ...f, pflegeDurchAngehoerige: e.target.checked }))}
            className="rounded border-gray-300"
          />
          Pflege wird durch Angehörige/Freunde erbracht (nicht beruflich)
        </label>
      </div>

      {fehler && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {fehler}
        </div>
      )}

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
        <Info className="w-4 h-4 flex-shrink-0" />
        Diese Berechnung erfolgt deterministisch nach geltendem Recht. Kein KI-Modell trifft die
        Entscheidung. Ergebnis ersetzt keine individuelle Rechtsberatung.
      </div>

      <Button onClick={handleBerechnen} disabled={loading} className="w-full">
        {loading ? "Berechne..." : "Ansprüche berechnen"}
        {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
      </Button>
    </Card>
  );
}

function ErgebnisAnsicht({
  ergebnis,
  aufgeklappt,
  toggle,
  onZurueck,
}: {
  ergebnis: AnspruchsErgebnis;
  aufgeklappt: Set<string>;
  toggle: (id: string) => void;
  onZurueck: () => void;
}) {
  const kategorieLabel: Record<string, string> = {
    pflegeversicherung: "Pflegeversicherung (SGB XI)",
    sozialhilfe: "Sozialhilfe (SGB XII)",
    eingliederungshilfe: "Eingliederungshilfe (SGB IX)",
    jugendhilfe: "Kinder- & Jugendhilfe (SGB VIII)",
    steuer: "Steuerliche Leistungen",
    rentenversicherung: "Rentenversicherung",
    unfallversicherung: "Unfallversicherung",
    haushaltshilfe: "Haushaltshilfe",
  };

  const erfuellte = ergebnis.ansprueche.filter((a) => a.voraussetzungen_erfuellt);
  const nichtErfuellt = ergebnis.ansprueche.filter((a) => !a.voraussetzungen_erfuellt);

  return (
    <div className="space-y-6">
      {/* Zusammenfassung */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h2 className="text-lg font-semibold text-green-900 mb-3">
          Ihre möglichen Ansprüche (Stand 2025)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-700">
              {ergebnis.gesamt_monatlich_eur.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-500 mt-1">monatliche Leistungen</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="text-2xl font-bold text-green-700">
              {ergebnis.gesamt_jaehrlich_eur.toLocaleString("de-DE")} €
            </div>
            <div className="text-xs text-gray-500 mt-1">jährliche Leistungen</div>
          </div>
          {ergebnis.steuerersparnis_eur > 0 && (
            <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {ergebnis.steuerersparnis_eur.toLocaleString("de-DE")} €
              </div>
              <div className="text-xs text-gray-500 mt-1">Steuerersparnis/Jahr</div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Berechnet am {new Date(ergebnis.berechnungsdatum).toLocaleDateString("de-DE")} · Deterministisch nach SGB XI/XII, EStG, SGB VIII/IX · Kein KI-Urteil
        </p>
      </Card>

      {/* Erfüllte Ansprüche */}
      {erfuellte.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            ✅ {erfuellte.length} Ansprüche identifiziert
          </h3>
          {erfuellte.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <button
                onClick={() => toggle(a.id)}
                className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{a.titel}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {kategorieLabel[a.kategorie] ?? a.kategorie}
                      </span>
                    </div>
                    {a.betrag_monatlich_eur !== undefined && (
                      <div className="flex items-center gap-1 mt-1 text-green-700 font-semibold text-sm">
                        <Euro className="w-3.5 h-3.5" />
                        {a.betrag_monatlich_eur.toLocaleString("de-DE")} €/Monat
                      </div>
                    )}
                    {a.betrag_jaehrlich_eur !== undefined && !a.betrag_monatlich_eur && (
                      <div className="flex items-center gap-1 mt-1 text-green-700 font-semibold text-sm">
                        <Euro className="w-3.5 h-3.5" />
                        {a.betrag_jaehrlich_eur.toLocaleString("de-DE")} €/Jahr
                      </div>
                    )}
                    {a.betrag_einmalig_eur !== undefined && (
                      <div className="flex items-center gap-1 mt-1 text-blue-700 font-semibold text-sm">
                        <Euro className="w-3.5 h-3.5" />
                        bis {a.betrag_einmalig_eur.toLocaleString("de-DE")} € (einmalig)
                      </div>
                    )}
                    {a.betrag_hinweis && !a.betrag_monatlich_eur && !a.betrag_jaehrlich_eur && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{a.betrag_hinweis}</p>
                    )}
                  </div>
                </div>
                {aufgeklappt.has(a.id) ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {aufgeklappt.has(a.id) && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 pt-3">{a.beschreibung}</p>
                  {a.betrag_hinweis && (
                    <p className="text-xs text-gray-500 italic">{a.betrag_hinweis}</p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Rechtsgrundlage
                    </p>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      {a.rechtsgrundlage}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Voraussetzungen
                    </p>
                    <ul className="space-y-0.5">
                      {a.voraussetzungen_details.map((v, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Antrag bei: </span>
                      {a.antrag_bei}
                      {a.antrag_hinweis && (
                        <p className="mt-1 text-blue-600">{a.antrag_hinweis}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Nächste Schritte */}
      {ergebnis.naechste_schritte.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">🗂️ Empfohlene nächste Schritte</h3>
          {ergebnis.naechste_schritte.map((s) => (
            <div
              key={s.reihenfolge}
              className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <span className="flex-shrink-0 w-6 h-6 bg-amber-400 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {s.reihenfolge}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{s.titel}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.beschreibung}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.dringlichkeit === "sofort"
                      ? "bg-red-100 text-red-700"
                      : s.dringlichkeit === "diese_woche"
                      ? "bg-orange-100 text-orange-700"
                      : s.dringlichkeit === "diesen_monat"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {s.dringlichkeit === "sofort" ? "⚡ Sofort" :
                     s.dringlichkeit === "diese_woche" ? "Diese Woche" :
                     s.dringlichkeit === "diesen_monat" ? "Diesen Monat" : "Langfristig"}
                  </span>
                  <span className="text-xs text-gray-500">→ {s.zustaendig}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offene Fragen */}
      {ergebnis.offene_fragen.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            ℹ️ Für eine genauere Berechnung beantworten Sie:
          </h3>
          <ul className="space-y-1">
            {ergebnis.offene_fragen.map((f, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">›</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Haftungshinweis */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
        Diese Berechnung ist eine Orientierungshilfe und ersetzt keine individuelle Rechts- oder
        Steuerberatung. Die tatsächlichen Ansprüche können im Einzelfall abweichen. Wenden Sie sich
        an Ihren Pflegestützpunkt oder einen Sozialrechts-Experten (VdK, SoVD, Caritasverband).
      </div>

      <Button variant="outline" onClick={onZurueck} className="w-full">
        ← Neue Berechnung
      </Button>
    </div>
  );
}
