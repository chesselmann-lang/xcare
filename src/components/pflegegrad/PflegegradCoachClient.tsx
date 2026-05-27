"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  ClipboardList,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Antworten = Record<string, number>;

interface Ergebnis {
  pflegegrad: number;
  nbiPunkte: number;
  begruendung: string;
  empfehlungen: string[];
  warnhinweise: string[];
}

interface PreviousSession {
  id: string;
  geschaetzter_pflegegrad: number | null;
  nbi_gesamt_punkte: number | null;
  ki_begruendung: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Props {
  sessionId?: string;
  savedAnswers: Antworten;
  previousSessions: PreviousSession[];
}

// ─── NBI Module definitions ───────────────────────────────────────────────────

const SCALE = [
  { v: 0, label: "Selbstständig" },
  { v: 1, label: "Überwiegend selbstständig" },
  { v: 2, label: "Überwiegend unselbstständig" },
  { v: 3, label: "Unselbstständig" },
];

const MODULE = [
  {
    key: "m1",
    label: "Mobilität",
    gewicht: 10,
    farbe: "blue",
    beschreibung: "Wie gut kann sich die Person körperlich fortbewegen?",
    items: [
      { key: "m1_bettpositionswechsel", label: "Positionswechsel im Bett", hint: "Dreht sich, richtet sich auf etc." },
      { key: "m1_halten_sitzposition", label: "Stabile Sitzposition halten", hint: "Aufrecht sitzen ohne Unterstützung" },
      { key: "m1_umsetzen", label: "Umsetzen", hint: "Vom Bett in den Stuhl wechseln" },
      { key: "m1_fortbewegung_innen", label: "Fortbewegung innerhalb des Wohnbereichs", hint: "Gehen oder Rollstuhl fahren" },
      { key: "m1_treppensteigen", label: "Treppensteigen", hint: "Mindestens eine Treppe, ein Stockwerk" },
    ],
  },
  {
    key: "m2",
    label: "Kognition & Kommunikation",
    gewicht: 15,
    farbe: "purple",
    beschreibung: "Wie gut ist die Orientierung und das Denkvermögen?",
    items: [
      { key: "m2_personen_erkennen", label: "Personen der Nahwelt erkennen", hint: "Familie, Pflegepersonen" },
      { key: "m2_oertliche_orientierung", label: "Örtliche Orientierung", hint: "Kennt die eigene Wohnung / Einrichtung" },
      { key: "m2_zeitliche_orientierung", label: "Zeitliche Orientierung", hint: "Weiß Tageszeit, Wochentag, Jahr" },
      { key: "m2_alltagsgegenstaende", label: "Alltagsgegenstände erkennen", hint: "Besteck, Telefon, Kleidung" },
      { key: "m2_risiken_erkennen", label: "Risiken und Gefahren erkennen", hint: "Heißes, scharfe Kanten, Verkehr" },
    ],
  },
  {
    key: "m3",
    label: "Verhaltensweisen & psych. Problemlagen",
    gewicht: 15,
    farbe: "yellow",
    beschreibung: "Gibt es Verhaltensauffälligkeiten oder psychische Belastungen?",
    items: [
      { key: "m3_motorische_unruhe", label: "Motorische Unruhe / Umherwandern", hint: "Ziellos laufen, nicht zur Ruhe kommen" },
      { key: "m3_naechtliche_unruhe", label: "Nächtliche Unruhe", hint: "Schläft schlecht, weckt andere" },
      { key: "m3_abwehrverhalten", label: "Abwehr pflegerischer Maßnahmen", hint: "Widersetzt sich Waschen, Anziehen etc." },
    ],
  },
  {
    key: "m4",
    label: "Selbstversorgung",
    gewicht: 40,
    farbe: "green",
    beschreibung: "Welche Körperpflege und Alltagsaktivitäten können selbst erledigt werden?",
    items: [
      { key: "m4_waschen_gesicht", label: "Waschen des vorderen Oberkörpers", hint: "Gesicht, Hals, Brust, Arme" },
      { key: "m4_koerperpflege", label: "Körperpflege im Bereich Kopf", hint: "Haare kämmen/waschen, Zähne putzen, Rasur" },
      { key: "m4_an_auskleiden", label: "An- und Auskleiden Oberkörper", hint: "Hemd, Bluse, Pullover" },
      { key: "m4_an_auskleiden_uk", label: "An- und Auskleiden Unterkörper", hint: "Hose, Unterwäsche, Schuhe, Strümpfe" },
      { key: "m4_ernaehrung", label: "Essen mundgerecht zubereiten & aufnehmen", hint: "Zerkleinern, zum Mund führen, kauen" },
      { key: "m4_trinken", label: "Trinken", hint: "Glas aufnehmen, zum Mund führen, schlucken" },
      { key: "m4_toilettennutzung", label: "Toilette / Toilettenstuhl benutzen", hint: "Hinsetzen, Hygiene, Aufstehen" },
    ],
  },
  {
    key: "m5",
    label: "Umgang mit krankheitsbedingten Anforderungen",
    gewicht: 20,
    farbe: "red",
    beschreibung: "Wie gut können krankheitsbedingte Aufgaben bewältigt werden?",
    items: [
      { key: "m5_medikamente", label: "Medikamente einnehmen", hint: "Richtig dosieren und selbst nehmen" },
      { key: "m5_arztbesuche", label: "Arzt- / Therapiebesuche organisieren", hint: "Termine machen, hinfahren, Informationen weitergeben" },
      { key: "m5_hilfsmittel", label: "Hilfsmittel nutzen und versorgen", hint: "Rollator, Hörgerät, Prothese etc." },
      { key: "m5_wundversorgung", label: "Wundversorgung / med. Maßnahmen", hint: "Verbandswechsel, Injektionen etc." },
    ],
  },
  {
    key: "m6",
    label: "Alltagsleben & soziale Kontakte",
    gewicht: 0,
    farbe: "teal",
    beschreibung: "Kann der Tagesablauf selbst gestaltet und soziale Kontakte gepflegt werden?",
    items: [
      { key: "m6_tagesstruktur", label: "Gestaltung des Tagesablaufs", hint: "Plant Aktivitäten, hält Routine ein" },
      { key: "m6_freizeitgestaltung", label: "Freizeitgestaltung / Hobbys", hint: "Lesen, Fernsehen, Spazieren etc." },
      { key: "m6_kontakte", label: "Kontakte zu Personen pflegen", hint: "Gespräche führen, Beziehungen aufrechterhalten" },
    ],
  },
];

// ─── NBI Score Calculation ────────────────────────────────────────────────────

function berechneNbiPunkte(antworten: Antworten): number {
  // Module 1: max raw 15, scale to 10%
  const m1Items = ["m1_bettpositionswechsel", "m1_halten_sitzposition", "m1_umsetzen", "m1_fortbewegung_innen", "m1_treppensteigen"];
  const m1Raw = m1Items.reduce((s, k) => s + (antworten[k] ?? 0), 0);
  const m1Score = (m1Raw / 15) * 10;

  // Module 2: max raw 15, scale to 15%
  const m2Items = ["m2_personen_erkennen", "m2_oertliche_orientierung", "m2_zeitliche_orientierung", "m2_alltagsgegenstaende", "m2_risiken_erkennen"];
  const m2Raw = m2Items.reduce((s, k) => s + (antworten[k] ?? 0), 0);
  const m2Score = (m2Raw / 15) * 15;

  // Module 3: max raw 9, scale to 15%
  const m3Items = ["m3_motorische_unruhe", "m3_naechtliche_unruhe", "m3_abwehrverhalten"];
  const m3Raw = m3Items.reduce((s, k) => s + (antworten[k] ?? 0), 0);
  const m3Score = (m3Raw / 9) * 15;

  // Module 4: max raw 21, scale to 40%
  const m4Items = ["m4_waschen_gesicht", "m4_koerperpflege", "m4_an_auskleiden", "m4_an_auskleiden_uk", "m4_ernaehrung", "m4_trinken", "m4_toilettennutzung"];
  const m4Raw = m4Items.reduce((s, k) => s + (antworten[k] ?? 0), 0);
  const m4Score = (m4Raw / 21) * 40;

  // Module 5: max raw 12, scale to 20%
  const m5Items = ["m5_medikamente", "m5_arztbesuche", "m5_hilfsmittel", "m5_wundversorgung"];
  const m5Raw = m5Items.reduce((s, k) => s + (antworten[k] ?? 0), 0);
  const m5Score = (m5Raw / 12) * 20;

  // Module 6: not weighted in total but relevant for PG5
  // (included in prompt for AI context)

  return Math.round((m1Score + m2Score + m3Score + m4Score + m5Score) * 100) / 100;
}

function punkteZuPflegegrad(punkte: number): number {
  if (punkte < 12.5) return 0; // kein Pflegegrad
  if (punkte < 27) return 1;
  if (punkte < 47.5) return 2;
  if (punkte < 70) return 3;
  if (punkte < 90) return 4;
  return 5;
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

const PG_STYLES: Record<number, { badge: string; ring: string; label: string }> = {
  0: { badge: "bg-gray-100 text-gray-700", ring: "ring-gray-200", label: "Kein Pflegegrad" },
  1: { badge: "bg-green-100 text-green-800", ring: "ring-green-200", label: "Pflegegrad 1" },
  2: { badge: "bg-yellow-100 text-yellow-800", ring: "ring-yellow-200", label: "Pflegegrad 2" },
  3: { badge: "bg-orange-100 text-orange-800", ring: "ring-orange-200", label: "Pflegegrad 3" },
  4: { badge: "bg-red-100 text-red-800", ring: "ring-red-200", label: "Pflegegrad 4" },
  5: { badge: "bg-purple-100 text-purple-800", ring: "ring-purple-200", label: "Pflegegrad 5" },
};

const MODUL_FARBE: Record<string, string> = {
  blue:   "bg-blue-50 border-blue-200 text-blue-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  green:  "bg-green-50 border-green-200 text-green-800",
  red:    "bg-red-50 border-red-200 text-red-800",
  teal:   "bg-teal-50 border-teal-200 text-teal-800",
};

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Schritt {current} von {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RadioOption({
  value,
  selected,
  label,
  onChange,
}: {
  value: number;
  selected: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
        selected
          ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400"
          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onChange}
        className="sr-only"
      />
      <div
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
        }`}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${selected ? "text-blue-900" : "text-gray-700"}`}>
          {label}
        </span>
      </div>
    </label>
  );
}

function StreamingText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );
}

function ErgebnisKarte({ ergebnis }: { ergebnis: Ergebnis }) {
  const style = PG_STYLES[ergebnis.pflegegrad] ?? PG_STYLES[0];
  return (
    <div className={`rounded-2xl ring-2 p-6 space-y-4 ${style.ring} bg-white`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">KI-Einschätzung</h3>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${style.badge}`}>
          {style.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-600">
        <ClipboardList className="h-4 w-4 flex-shrink-0" />
        <span>Geschätzte NBI-Gesamtpunkte: <strong>{ergebnis.nbiPunkte.toFixed(1)}</strong> / 100</span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-sm text-gray-700 leading-relaxed">{ergebnis.begruendung}</p>
      </div>

      {ergebnis.empfehlungen.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500" /> Empfehlungen
          </h4>
          <ul className="space-y-1.5">
            {ergebnis.empfehlungen.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ergebnis.warnhinweise.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" /> Hinweise
          </h4>
          <ul className="space-y-1.5">
            {ergebnis.warnhinweise.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
        Diese KI-Einschätzung ist unverbindlich und ersetzt kein offizielles Gutachten des MDK / MEDICPROOF.
      </p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PflegegradCoachClient({
  sessionId,
  savedAnswers,
  previousSessions,
}: Props) {
  const STEPS = MODULE.length; // 6 module steps + result shown inline

  const [step, setStep] = useState(0); // 0-indexed, 0 = Begrüßung, 1-6 = Module, 7 = Ergebnis
  const [antworten, setAntworten] = useState<Antworten>(savedAnswers);
  const [aiText, setAiText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const messagesRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const aiTextRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const currentModule = step >= 1 && step <= STEPS ? MODULE[step - 1] : null;

  // Check if current module is complete
  const moduleComplete = currentModule
    ? currentModule.items.every((item) => antworten[item.key] !== undefined)
    : step === 0;

  const setAntwort = (key: string, value: number) => {
    setAntworten((prev) => ({ ...prev, [key]: value }));
  };

  const streamAiResponse = useCallback(
    async (userMsg: string) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      messagesRef.current = [
        ...messagesRef.current,
        { role: "user", content: userMsg },
      ];

      setAiText("");
      aiTextRef.current = "";
      setIsStreaming(true);

      try {
        const res = await fetch("/api/ki/pflegegrad", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            messages: messagesRef.current,
            antworten,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("API-Fehler");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("Kein Stream");

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6);
              if (payload === "[DONE]") break;
              try {
                const { text } = JSON.parse(payload);
                aiTextRef.current += text;
                setAiText(aiTextRef.current);
              } catch {
                // ignore parse errors
              }
            }
          }
        }

        // Add assistant reply to message history
        messagesRef.current = [
          ...messagesRef.current,
          { role: "assistant", content: aiTextRef.current },
        ];

        // Try to parse result JSON from final step
        if (step === STEPS) {
          const match = aiTextRef.current.match(/```json\s*([\s\S]+?)\s*```/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]) as Ergebnis;
              setErgebnis(parsed);
            } catch {
              // JSON parse failed — show text only
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("KI-Verbindung fehlgeschlagen. Bitte erneut versuchen.");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [step, sessionId, antworten, STEPS]
  );

  const buildModulSummary = (mod: (typeof MODULE)[0]) => {
    const lines = mod.items.map((item) => {
      const val = antworten[item.key] ?? 0;
      const scaleLabel = SCALE[val]?.label ?? "Unbekannt";
      return `- ${item.label}: ${val} (${scaleLabel})`;
    });
    return `Modul ${mod.key.toUpperCase()} – ${mod.label}:\n${lines.join("\n")}`;
  };

  const handleNext = async () => {
    if (step === 0) {
      // Begrüßungsschritt → erster Modul
      setStep(1);
      await streamAiResponse(
        "Ich möchte den Pflegegrad meiner pflegebedürftigen Person einschätzen lassen. Bitte erkläre kurz, wie das funktioniert, und führe mich durch die Befragung."
      );
      return;
    }

    if (!moduleComplete) {
      toast.warning("Bitte beantworten Sie alle Fragen in diesem Modul.");
      return;
    }

    if (step <= STEPS) {
      const mod = MODULE[step - 1];
      const summary = buildModulSummary(mod);

      if (step < STEPS) {
        const nextMod = MODULE[step];
        setStep(step + 1);
        await streamAiResponse(
          `${summary}\n\nBitte kommentiere kurz diese Angaben und leite dann über zu Modul ${nextMod.key.toUpperCase()} – ${nextMod.label}.`
        );
      } else {
        // Letzter Modul → Ergebnis anfordern
        const nbi = berechneNbiPunkte(antworten);
        const pg = punkteZuPflegegrad(nbi);
        setStep(STEPS + 1);
        await streamAiResponse(
          `${summary}\n\nDamit sind alle 6 Module abgeschlossen. Die vorläufige NBI-Punktzahl berechnet sich zu ${nbi.toFixed(1)} von 100 Punkten (entspricht rechnerisch Pflegegrad ${pg}).\n\nBitte gib deine abschließende KI-Einschätzung inklusive Begründung, 3–4 konkreter Empfehlungen und wichtiger Warnhinweise. Schreibe das Ergebnis-JSON in einen \`\`\`json ... \`\`\` Block.`
        );
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setAiText("");
      setErgebnis(null);
    }
  };

  const handleNeuStarten = () => {
    if (abortRef.current) abortRef.current.abort();
    setStep(0);
    setAntworten({});
    setAiText("");
    aiTextRef.current = "";
    messagesRef.current = [];
    setErgebnis(null);
    setSaved(false);
    // Create new session via page reload to get fresh sessionId
    window.location.reload();
  };

  const handleSpeichern = async () => {
    if (!ergebnis || !sessionId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/ki/pflegegrad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ergebnis }),
      });
      if (!res.ok) throw new Error();
      toast.success("Einschätzung gespeichert!");
      setSaved(true);
    } catch {
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* History toggle */}
      {previousSessions.length > 0 && (
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <History className="h-4 w-4" />
          {showHistory ? "Verlauf ausblenden" : `${previousSessions.length} frühere Einschätzung(en) anzeigen`}
        </button>
      )}

      {showHistory && (
        <div className="space-y-2">
          {previousSessions.map((s) => {
            const style = PG_STYLES[s.geschaetzter_pflegegrad ?? 0] ?? PG_STYLES[0];
            return (
              <div key={s.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.badge}`}>
                  {style.label}
                </span>
                <span className="text-sm text-gray-600 flex-1">
                  {s.nbi_gesamt_punkte != null && `${s.nbi_gesamt_punkte} Punkte · `}
                  {s.completed_at
                    ? format(parseISO(s.completed_at), "d. MMM yyyy", { locale: de })
                    : format(parseISO(s.created_at), "d. MMM yyyy", { locale: de })}
                </span>
                {s.ki_begruendung && (
                  <span className="text-xs text-gray-400 hidden sm:block max-w-[220px] truncate">
                    {s.ki_begruendung}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                {step === 0
                  ? "Willkommen"
                  : step <= STEPS
                  ? `Modul ${step} von ${STEPS}`
                  : "Ergebnis"}
              </p>
              <h2 className="text-base font-semibold leading-tight">
                {step === 0
                  ? "KI Pflegegrad-Coach"
                  : step <= STEPS
                  ? MODULE[step - 1].label
                  : "KI-Einschätzung abgeschlossen"}
              </h2>
            </div>
          </div>

          {step >= 1 && step <= STEPS && (
            <ProgressBar current={step} total={STEPS} />
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 0: Begrüßung */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p className="font-medium">So funktioniert der Pflegegrad-Coach:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>✓ 6 Module des Neuen Begutachtungs-Instruments (NBI)</li>
                  <li>✓ Einfache Einschätzung auf Skala von 0–3</li>
                  <li>✓ KI erklärt jeden Schritt und gibt Tipps</li>
                  <li>✓ Abschließende Pflegegrad-Prognose mit Begründung</li>
                </ul>
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                <p>Diese Einschätzung ist unverbindlich und ersetzt kein Gutachten des MDK / MEDICPROOF.</p>
              </div>
            </div>
          )}

          {/* Step 1-6: Module questions */}
          {step >= 1 && step <= STEPS && currentModule && (
            <div className="space-y-4">
              <div className={`rounded-xl border px-4 py-2 text-sm font-medium ${MODUL_FARBE[currentModule.farbe]}`}>
                {currentModule.beschreibung}
                {currentModule.gewicht > 0 && (
                  <span className="ml-2 opacity-70">(Gewichtung: {currentModule.gewicht}%)</span>
                )}
              </div>

              <div className="space-y-5">
                {currentModule.items.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.hint}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SCALE.map((opt) => (
                        <RadioOption
                          key={opt.v}
                          value={opt.v}
                          label={`${opt.v} – ${opt.label}`}
                          selected={antworten[item.key] === opt.v}
                          onChange={() => setAntwort(item.key, opt.v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI streaming commentary */}
          {(aiText || isStreaming) && (
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <Brain className="h-3.5 w-3.5 text-blue-500" />
                KI-Kommentar
                {isStreaming && <Loader2 className="h-3 w-3 animate-spin text-blue-400" />}
              </div>
              <StreamingText text={aiText} />
            </div>
          )}

          {/* Final result */}
          {step > STEPS && ergebnis && !isStreaming && (
            <ErgebnisKarte ergebnis={ergebnis} />
          )}

          {/* Raw AI text when no JSON parsed yet */}
          {step > STEPS && !ergebnis && !isStreaming && aiText && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <StreamingText text={aiText} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          {/* Back */}
          {step > 0 && step <= STEPS && !isStreaming && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </Button>
          )}

          {/* Next / Start */}
          {step <= STEPS && (
            <Button
              onClick={handleNext}
              disabled={isStreaming || (step > 0 && !moduleComplete)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  KI denkt nach…
                </>
              ) : step === 0 ? (
                "Befragung starten"
              ) : step === STEPS ? (
                <>
                  Einschätzung anfordern
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}

          {/* Save & restart on result page */}
          {step > STEPS && !isStreaming && (
            <>
              {ergebnis && !saved && (
                <Button
                  onClick={handleSpeichern}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Ergebnis speichern
                </Button>
              )}
              {saved && (
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Gespeichert
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleNeuStarten}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" /> Neu starten
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
