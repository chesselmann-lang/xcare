"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Loader2, Printer, CheckCircle2, Plus, Trash2 } from "lucide-react";

type Anlass = "erstvorstellung" | "kontrolltermin" | "notfall" | "ueberweisung";

interface Props {
  defaultVorname: string;
  defaultNachname: string;
  defaultMedikamente: string[];
  defaultPflegegrad?: number;
}

const ANLASS_OPTIONS: { value: Anlass; label: string; desc: string }[] = [
  { value: "erstvorstellung", label: "Erstvorstellung", desc: "Patient wird erstmals vorgestellt" },
  { value: "kontrolltermin", label: "Kontrolltermin", desc: "Reguläre Verlaufskontrolle" },
  { value: "notfall", label: "Notfall", desc: "Akute Beschwerden oder Verschlechterung" },
  { value: "ueberweisung", label: "Überweisung", desc: "Weiterleitung zu einem Spezialisten" },
];

export function ArztbriefClient({
  defaultVorname,
  defaultNachname,
  defaultMedikamente,
  defaultPflegegrad,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [generating, setGenerating] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState("");

  // Step 1: Patient data
  const [vorname, setVorname] = useState(defaultVorname);
  const [nachname, setNachname] = useState(defaultNachname);
  const [geburtsdatum, setGeburtsdatum] = useState("");
  const [pflegegrad, setPflegegrad] = useState<string>(
    defaultPflegegrad ? String(defaultPflegegrad) : ""
  );
  const [diagnosen, setDiagnosen] = useState<string[]>([""]);
  const [medikamente, setMedikamente] = useState<string[]>(
    defaultMedikamente.length > 0 ? defaultMedikamente : [""]
  );

  // Step 2: Anlass + Symptome
  const [anlass, setAnlass] = useState<Anlass>("kontrolltermin");
  const [symptome, setSymptome] = useState("");

  function updateListItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) {
    const updated = [...list];
    updated[index] = value;
    setList(updated);
  }

  function addListItem(list: string[], setList: (v: string[]) => void) {
    setList([...list, ""]);
  }

  function removeListItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number
  ) {
    setList(list.filter((_, i) => i !== index));
  }

  async function generateBrief() {
    if (!symptome.trim()) {
      setError("Bitte beschreiben Sie die aktuellen Symptome.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/arztbrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientInfo: {
            vorname,
            nachname,
            geburtsdatum: geburtsdatum || undefined,
            pflegegrad: pflegegrad ? parseInt(pflegegrad) : undefined,
          },
          diagnosen: diagnosen.filter((d) => d.trim()),
          medikamente: medikamente.filter((m) => m.trim()),
          aktuelleSymptome: symptome,
          anlass,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unbekannter Fehler");
      }

      const data = await res.json();
      setBriefText(data.briefText);
      setGeneratedAt(data.generatedAt);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Generieren");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <title>Arztbrief – ${vorname} ${nachname}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin: 2cm 2.5cm; color: #000; }
    h1 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 6px; }
    pre { font-family: inherit; white-space: pre-wrap; }
    .footer { margin-top: 2cm; font-size: 10pt; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
  </style>
</head>
<body>
<pre>${briefText}</pre>
<div class="footer">Erstellt am ${new Date(generatedAt).toLocaleString("de-DE")} via xcare KI-Arztbrief. Dieses Dokument ist kein Ersatz für eine ärztliche Diagnose.</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  // Step indicator
  const steps = [
    { n: 1, label: "Patientendaten" },
    { n: 2, label: "Anlass & Symptome" },
    { n: 3, label: "Brief prüfen" },
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-colors ${
                step === s.n
                  ? "bg-[--primary] text-white"
                  : step > s.n
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span
              className={`text-sm ${
                step === s.n ? "font-semibold text-[--foreground]" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Patientendaten */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Patientendaten bestätigen</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input
                type="text"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input
                type="text"
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
              <input
                type="date"
                value={geburtsdatum}
                onChange={(e) => setGeburtsdatum(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pflegegrad</label>
              <select
                value={pflegegrad}
                onChange={(e) => setPflegegrad(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] bg-white"
              >
                <option value="">Nicht angegeben</option>
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={g}>
                    Pflegegrad {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diagnosen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bekannte Diagnosen
            </label>
            <div className="space-y-2">
              {diagnosen.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={d}
                    onChange={(e) =>
                      updateListItem(diagnosen, setDiagnosen, i, e.target.value)
                    }
                    placeholder="z.B. Diabetes mellitus Typ 2"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                  />
                  {diagnosen.length > 1 && (
                    <button
                      onClick={() => removeListItem(diagnosen, setDiagnosen, i)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addListItem(diagnosen, setDiagnosen)}
                className="flex items-center gap-1 text-sm text-[--primary] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Diagnose hinzufügen
              </button>
            </div>
          </div>

          {/* Medikamente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aktuelle Medikation
            </label>
            <div className="space-y-2">
              {medikamente.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={m}
                    onChange={(e) =>
                      updateListItem(medikamente, setMedikamente, i, e.target.value)
                    }
                    placeholder="z.B. Metformin 500mg (1-0-1)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
                  />
                  {medikamente.length > 1 && (
                    <button
                      onClick={() => removeListItem(medikamente, setMedikamente, i)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addListItem(medikamente, setMedikamente)}
                className="flex items-center gap-1 text-sm text-[--primary] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Medikament hinzufügen
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!vorname.trim() || !nachname.trim()}
              className="flex items-center gap-2 bg-[--primary] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[--primary]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Weiter
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Anlass + Symptome */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Anlass & aktuelle Symptome</h2>

          {/* Anlass Radio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anlass des Termins</label>
            <div className="grid grid-cols-2 gap-2">
              {ANLASS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    anlass === opt.value
                      ? "border-[--primary] bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="anlass"
                    value={opt.value}
                    checked={anlass === opt.value}
                    onChange={() => setAnlass(opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Symptome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aktuelle Symptome & Beschwerden
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              value={symptome}
              onChange={(e) => setSymptome(e.target.value)}
              rows={5}
              placeholder="Beschreiben Sie aktuelle Beschwerden, Veränderungen im Gesundheitszustand, besondere Ereignisse der letzten Wochen..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {symptome.length}/2000 Zeichen
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <button
              onClick={generateBrief}
              disabled={generating || !symptome.trim()}
              className="flex items-center gap-2 bg-[--primary] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[--primary]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  KI generiert...
                </>
              ) : (
                <>
                  Brief generieren
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generated brief */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Arztbrief prüfen & drucken</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" /> Bearbeiten
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-[--primary] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[--primary]/90 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Drucken / PDF
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-200 p-1">
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={20}
              className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none resize-none"
              spellCheck
            />
          </div>

          <p className="text-xs text-gray-400">
            KI-generiert am{" "}
            {generatedAt
              ? new Date(generatedAt).toLocaleString("de-DE")
              : "—"}
            . Bitte vor der Verwendung sorgfältig prüfen. Kein Ersatz für ärztliche Diagnose.
          </p>
        </div>
      )}
    </div>
  );
}
