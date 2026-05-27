"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Scale,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Save,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  SITUATIONS_FRAGEN,
  berechneRechte,
  getRechteKategorieColor,
  getRechteKategorieLabel,
  RECHTE_KEY_TO_PARAGRAPH,
  type RechteKey,
} from "@/lib/rechte/checker";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface PflegepersonRecht {
  id: string;
  gesetz: string;
  paragraph: string | null;
  titel: string;
  beschreibung: string;
  voraussetzungen: string[] | null;
  dauer: string | null;
  leistung: string | null;
  antrag_bei: string | null;
  kategorie: string;
}

type Situation = Record<string, string | boolean>;
type Schritt = 1 | 2 | 3;

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function ProgressBar({ schritt }: { schritt: Schritt }) {
  const schritte = [
    { nr: 1, label: "Ihre Situation" },
    { nr: 2, label: "Ihre Rechte" },
    { nr: 3, label: "Zusammenfassung" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {schritte.map((s, idx) => (
          <div key={s.nr} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  schritt > s.nr
                    ? "bg-green-500 text-white"
                    : schritt === s.nr
                    ? "bg-[--primary] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {schritt > s.nr ? <CheckCircle2 className="w-4 h-4" /> : s.nr}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  schritt >= s.nr ? "text-[--foreground]" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < schritte.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                  schritt > s.nr ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TooltipInfo({ text }: { text: string }) {
  const [offen, setOffen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="text-gray-400 hover:text-[--primary] transition-colors ml-1.5 align-middle"
        aria-label="Hilfe anzeigen"
      >
        <Info className="w-4 h-4" />
      </button>
      {offen && (
        <div className="absolute z-20 bottom-6 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-700 leading-relaxed">
          {text}
          <button
            onClick={() => setOffen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function RechtCard({
  recht,
  anwendbar,
}: {
  recht: PflegepersonRecht;
  anwendbar: boolean;
}) {
  const [ausgeklappt, setAusgeklappt] = useState(anwendbar);
  const katColor = getRechteKategorieColor(recht.kategorie);
  const katLabel = getRechteKategorieLabel(recht.kategorie);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        anwendbar
          ? "border-[--primary]/30 bg-white shadow-sm"
          : "border-gray-200 bg-gray-50 opacity-70"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setAusgeklappt((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <div className="flex-shrink-0 mt-0.5">
          {anwendbar ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 font-mono">
              {recht.gesetz}
            </span>
            {recht.paragraph && (
              <span className="text-xs text-gray-400">{recht.paragraph}</span>
            )}
            <span
              className={`text-xs font-medium border rounded-full px-2 py-0.5 ${katColor}`}
            >
              {katLabel}
            </span>
            {!anwendbar && (
              <span className="text-xs font-medium text-gray-400 border border-gray-200 rounded-full px-2 py-0.5 bg-gray-100">
                Nicht anwendbar
              </span>
            )}
          </div>
          <p
            className={`text-sm font-semibold ${
              anwendbar ? "text-[--foreground]" : "text-gray-500"
            }`}
          >
            {recht.titel}
          </p>
          {!ausgeklappt && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {recht.beschreibung}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-gray-400 mt-0.5">
          {ausgeklappt ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Details */}
      {ausgeklappt && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">
            {recht.beschreibung}
          </p>

          <div className="mt-4 grid gap-3">
            {recht.voraussetzungen && recht.voraussetzungen.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Voraussetzungen
                </h4>
                <ul className="space-y-1">
                  {recht.voraussetzungen.map((v, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-[--primary] mt-0.5 flex-shrink-0">•</span>
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recht.dauer && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">Dauer</p>
                  <p className="text-sm text-gray-800">{recht.dauer}</p>
                </div>
              )}
              {recht.leistung && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700 mb-0.5">Leistung</p>
                  <p className="text-sm text-green-800">{recht.leistung}</p>
                </div>
              )}
            </div>

            {recht.antrag_bei && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Antrag stellen bei</p>
                <p className="text-sm text-blue-800">{recht.antrag_bei}</p>
              </div>
            )}
          </div>

          {anwendbar && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Teilzeit-Pflege/pflege.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[--primary] hover:underline"
              >
                Mehr erfahren (BMAS)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function RechteCheckerClient({
  alleRechte,
  isLoggedIn,
}: {
  alleRechte: PflegepersonRecht[];
  isLoggedIn: boolean;
}) {
  const [schritt, setSchritt] = useState<Schritt>(1);
  const [situation, setSituation] = useState<Situation>({});
  const [anwendbareKeys, setAnwendbareKeys] = useState<RechteKey[]>([]);
  const [analysiert, setAnalysiert] = useState(false);
  const [analyseLaeuft, setAnalyseLaeuft] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [speichernLaeuft, setSpeichernLaeuft] = useState(false);

  // ── Schritt 1: Antworten setzen ────────────────────────────────────────────

  function setAntwort(id: string, wert: string | boolean) {
    setSituation((prev) => ({ ...prev, [id]: wert }));
  }

  const alleFragenBeantwortet = SITUATIONS_FRAGEN.every(
    (f) => situation[f.id] !== undefined && situation[f.id] !== ""
  );

  // ── Schritt 1 → 2: Analyse ─────────────────────────────────────────────────

  async function weiterZuSchritt2() {
    setSchritt(2);
    setAnalysiert(false);
    setAnalyseLaeuft(true);

    // Simulierte Analyse-Verzögerung (1.5s UX-Effekt)
    await new Promise((r) => setTimeout(r, 1500));

    const keys = berechneRechte(situation);
    setAnwendbareKeys(keys);
    setAnalysiert(true);
    setAnalyseLaeuft(false);
  }

  // ── Schritt 2 → 3 ─────────────────────────────────────────────────────────

  function weiterZuSchritt3() {
    setSchritt(3);
  }

  // ── Ergebnis speichern ────────────────────────────────────────────────────

  const speichern = useCallback(async () => {
    if (!isLoggedIn) {
      toast.info("Bitte melden Sie sich an, um Ihr Ergebnis zu speichern.");
      return;
    }

    setSpeichernLaeuft(true);
    try {
      const res = await fetch("/api/rechte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          ergebnis: {
            anwendbare_rechte: anwendbareKeys,
            anzahl: anwendbareKeys.length,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Unbekannter Fehler");
      }

      setGespeichert(true);
      toast.success("Ihr Prüfungsergebnis wurde gespeichert.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Speichern fehlgeschlagen. Bitte versuchen Sie es erneut."
      );
    } finally {
      setSpeichernLaeuft(false);
    }
  }, [isLoggedIn, situation, anwendbareKeys]);

  // ── Neu starten ───────────────────────────────────────────────────────────

  function neuStarten() {
    setSituation({});
    setAnwendbareKeys([]);
    setAnalysiert(false);
    setAnalyseLaeuft(false);
    setGespeichert(false);
    setSpeichernLaeuft(false);
    setSchritt(1);
  }

  // ── Rechte sortieren: anwendbar zuerst ────────────────────────────────────

  const sortierteRechte = analysiert
    ? [
        ...alleRechte.filter((r) =>
          anwendbareKeys.some(
            (k) => RECHTE_KEY_TO_PARAGRAPH[k] === r.paragraph
          )
        ),
        ...alleRechte.filter(
          (r) =>
            !anwendbareKeys.some(
              (k) => RECHTE_KEY_TO_PARAGRAPH[k] === r.paragraph
            )
        ),
      ]
    : alleRechte;

  function istAnwendbar(recht: PflegepersonRecht): boolean {
    return anwendbareKeys.some(
      (k) => RECHTE_KEY_TO_PARAGRAPH[k] === recht.paragraph
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ProgressBar schritt={schritt} />

      {/* ── SCHRITT 1: Situationsfragen ──────────────────────────────────── */}
      {schritt === 1 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[--foreground] flex items-center gap-2">
              <Scale className="w-5 h-5 text-[--primary]" />
              Ihre Pflegesituation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Beantworten Sie alle 8 Fragen, um Ihre gesetzlichen Rechte zu ermitteln.
            </p>
          </div>

          <div className="space-y-6">
            {SITUATIONS_FRAGEN.map((frage, idx) => (
              <div
                key={frage.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-2 mb-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-[--foreground] leading-relaxed">
                    {frage.frage}
                    {frage.hilfe && <TooltipInfo text={frage.hilfe} />}
                  </p>
                </div>

                {frage.typ === "boolean" && (
                  <div className="flex gap-2 ml-8">
                    {["true", "false"].map((val) => {
                      const istJa = val === "true";
                      const ausgewaehlt =
                        situation[frage.id] === (istJa ? true : false);
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAntwort(frage.id, istJa)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                            ausgewaehlt
                              ? istJa
                                ? "bg-[--primary] text-white border-[--primary] shadow-sm"
                                : "bg-red-500 text-white border-red-500 shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {istJa ? "Ja" : "Nein"}
                        </button>
                      );
                    })}
                  </div>
                )}

                {frage.typ === "select" && frage.optionen && (
                  <div className="flex flex-wrap gap-2 ml-8">
                    {frage.optionen.map((opt) => {
                      const ausgewaehlt = situation[frage.id] === opt;
                      const label =
                        opt === "kein" ? "Kein Pflegegrad" : `Pflegegrad ${opt}`;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAntwort(frage.id, opt)}
                          className={`py-1.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                            ausgewaehlt
                              ? "bg-[--primary] text-white border-[--primary] shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={weiterZuSchritt2}
              disabled={!alleFragenBeantwortet}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                alleFragenBeantwortet
                  ? "bg-[--primary] text-white hover:bg-[--primary]/90 shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!alleFragenBeantwortet && (
            <p className="text-xs text-gray-400 text-right mt-2">
              Bitte beantworten Sie alle Fragen, um fortzufahren.
            </p>
          )}
        </div>
      )}

      {/* ── SCHRITT 2: Ergebnis-Analyse ──────────────────────────────────── */}
      {schritt === 2 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[--foreground] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[--primary]" />
              Ihre gesetzlichen Rechte
            </h2>
            {analysiert && (
              <p className="text-sm text-gray-500 mt-1">
                Basierend auf Ihren Angaben treffen{" "}
                <strong className="text-[--primary]">
                  {anwendbareKeys.length} von {alleRechte.length} Rechten
                </strong>{" "}
                auf Ihre Situation zu.
              </p>
            )}
          </div>

          {/* Lade-Animation */}
          {analyseLaeuft && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-[--primary] animate-spin" />
              <div className="text-center">
                <p className="font-semibold text-[--foreground]">
                  Wir analysieren Ihre Situation…
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Prüfung Ihrer Ansprüche nach PflegeZG, FPfZG, SGB XI und ArbSchG
                </p>
              </div>
            </div>
          )}

          {/* Ergebnis */}
          {analysiert && (
            <>
              {/* Zusammenfassungs-Banner */}
              <div
                className={`rounded-xl p-4 mb-6 border ${
                  anwendbareKeys.length > 0
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {anwendbareKeys.length > 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm">
                      {anwendbareKeys.length > 0
                        ? `${anwendbareKeys.length} Recht${anwendbareKeys.length !== 1 ? "e treffen" : " trifft"} auf Ihre Situation zu`
                        : "Keine direkten Rechte ermittelt"}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {anwendbareKeys.length > 0
                        ? "Klappen Sie die einzelnen Rechte auf, um Details, Voraussetzungen und Antragsstellen zu sehen."
                        : "Möglicherweise treffen aufgrund fehlender Voraussetzungen keine der geprüften Rechte zu. Eine persönliche Beratung kann helfen."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rechte-Liste */}
              <div className="space-y-3">
                {sortierteRechte.map((recht) => (
                  <RechtCard
                    key={recht.id}
                    recht={recht}
                    anwendbar={istAnwendbar(recht)}
                  />
                ))}
              </div>

              {/* CTA: Pflegeberatung */}
              {anwendbareKeys.length > 0 && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-blue-900">
                        Persönliche Pflegeberatung buchen
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5 mb-3">
                        Unsere Berater helfen Ihnen, die identifizierten Rechte
                        konkret in Anspruch zu nehmen und Anträge zu stellen.
                      </p>
                      <Link
                        href="/familie/pflegeberatung"
                        className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Termin buchen
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSchritt(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={weiterZuSchritt3}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[--primary] text-white font-semibold text-sm hover:bg-[--primary]/90 transition-colors shadow-sm"
                >
                  Zusammenfassung
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SCHRITT 3: Zusammenfassung & Speichern ───────────────────────── */}
      {schritt === 3 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[--foreground] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[--primary]" />
              Zusammenfassung
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Speichern Sie Ihr Ergebnis oder starten Sie eine neue Prüfung.
            </p>
          </div>

          {/* Situations-Übersicht */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Ihre Angaben
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {SITUATIONS_FRAGEN.map((frage) => {
                const val = situation[frage.id];
                let anzeige = "";
                if (val === true) anzeige = "Ja";
                else if (val === false) anzeige = "Nein";
                else if (typeof val === "string") {
                  if (val === "kein") anzeige = "Kein Pflegegrad";
                  else if (frage.id === "pflegegrad")
                    anzeige = `Pflegegrad ${val}`;
                  else anzeige = val;
                }
                return (
                  <div key={frage.id} className="flex items-start gap-2">
                    <span
                      className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full ${
                        val === true
                          ? "bg-green-400"
                          : val === false
                          ? "bg-red-300"
                          : "bg-blue-400"
                      }`}
                    />
                    <div>
                      <p className="text-xs text-gray-500 leading-tight">
                        {frage.frage.length > 55
                          ? frage.frage.slice(0, 55) + "…"
                          : frage.frage}
                      </p>
                      <p className="text-sm font-medium text-[--foreground]">
                        {anzeige}
                      </p>
                    </div>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Ergebnis-Karte */}
          <div className="bg-gradient-to-r from-[--primary]/5 to-blue-50 border border-[--primary]/20 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[--primary] uppercase tracking-wide mb-1">
                  Ergebnis der Rechte-Prüfung
                </p>
                <p className="text-3xl font-bold text-[--foreground]">
                  {anwendbareKeys.length}
                  <span className="text-lg font-normal text-gray-500 ml-1">
                    / {alleRechte.length} Rechte
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  treffen auf Ihre Situation zu
                </p>
              </div>
              <Shield className="w-12 h-12 text-[--primary]/20" />
            </div>

            {anwendbareKeys.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {anwendbareKeys.map((key) => (
                  <span
                    key={key}
                    className="text-xs bg-white border border-[--primary]/20 text-[--primary] rounded-full px-2.5 py-0.5 font-medium"
                  >
                    {RECHTE_KEY_TO_PARAGRAPH[key]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Aktionen */}
          <div className="space-y-3">
            {/* Speichern */}
            {!gespeichert ? (
              <button
                type="button"
                onClick={speichern}
                disabled={speichernLaeuft}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[--primary] text-white font-semibold text-sm hover:bg-[--primary]/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {speichernLaeuft ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird gespeichert…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Ergebnis speichern
                  </>
                )}
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Ergebnis gespeichert
              </div>
            )}

            {/* Nicht eingeloggt Hinweis */}
            {!isLoggedIn && !gespeichert && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Zum Speichern Ihres Ergebnisses müssen Sie{" "}
                  <Link
                    href="/login"
                    className="underline font-medium"
                  >
                    angemeldet
                  </Link>{" "}
                  sein.
                </p>
              </div>
            )}

            {/* PDF Export (Platzhalter) */}
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "PDF-Export wird vorbereitet. Diese Funktion ist in Kürze verfügbar."
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF exportieren
            </button>

            {/* Neu starten */}
            <button
              type="button"
              onClick={neuStarten}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Neu starten
            </button>
          </div>

          {/* Zurück zu Schritt 2 */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setSchritt(2)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück zur Rechte-Übersicht
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
