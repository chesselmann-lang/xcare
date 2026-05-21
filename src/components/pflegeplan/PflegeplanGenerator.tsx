"use client";

import { useState } from "react";
import {
  Sparkles, Loader2, ChevronRight, AlertCircle,
  CheckCircle2, Clock, ArrowRight, Building2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";

type Prioritaet = "hoch" | "mittel" | "niedrig";

interface Massnahme {
  titel: string;
  beschreibung: string;
  prioritaet: Prioritaet;
  zeitrahmen: string;
  kategorie: string;
}

interface PflegeplanErgebnis {
  zusammenfassung: string;
  massnahmen: Massnahme[];
  ansprueche: string[];
  naechsteSchritte: string[];
  anbieterTypen: string[];
  hinweis?: string;
}

const PFLEGEGRADE = ["kein Pflegegrad", "1", "2", "3", "4", "5"];

const PRIORITAET_STYLE: Record<Prioritaet, string> = {
  hoch: "bg-red-50 border-red-200 text-red-700",
  mittel: "bg-amber-50 border-amber-200 text-amber-700",
  niedrig: "bg-green-50 border-green-200 text-green-700",
};

const PRIORITAET_LABEL: Record<Prioritaet, string> = {
  hoch: "Hoch",
  mittel: "Mittel",
  niedrig: "Niedrig",
};

export function PflegeplanGenerator() {
  const [lebenslage, setLebenslage] = useState<LebenslageTyp | "">("");
  const [anamnese, setAnamnese] = useState("");
  const [alter, setAlter] = useState("");
  const [pflegegrad, setPflegegrad] = useState("");
  const [ziele, setZiele] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PflegeplanErgebnis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!lebenslage) {
      toast.error("Bitte wählen Sie eine Lebenslage aus");
      return;
    }
    if (!anamnese.trim()) {
      toast.error("Bitte beschreiben Sie die Situation");
      return;
    }
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/pflegeplan/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lebenslage,
          anamnese,
          alter: alter ? Number(alter) : undefined,
          pflegegrad: pflegegrad !== "kein Pflegegrad" ? pflegegrad : undefined,
          ziele,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fehler bei der Generierung");
      }

      const data = await res.json();
      setPlan(data.plan as PflegeplanErgebnis);
      toast.success("Pflegeplan wurde erstellt");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPlan(null);
    setError(null);
  }

  if (plan) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[--primary]" />
            <h2 className="text-lg font-semibold">Ihr individueller Pflegeplan</h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              "border border-[--border] text-[--muted-foreground] hover:bg-[--muted]/30 transition-colors"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Neu erstellen
          </button>
        </div>

        {/* Zusammenfassung */}
        <div className="rounded-xl border border-[--primary]/30 bg-[--primary-light]/50 p-4">
          <p className="text-sm leading-relaxed text-[--foreground]">
            {plan.zusammenfassung}
          </p>
        </div>

        {/* Hinweis */}
        {plan.hinweis && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{plan.hinweis}</p>
          </div>
        )}

        {/* Maßnahmen */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[--foreground]">
            Empfohlene Maßnahmen
          </h3>
          <div className="space-y-2">
            {plan.massnahmen.map((m, i) => (
              <div
                key={i}
                className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-2"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-medium text-sm flex-1">{m.titel}</span>
                  <span
                    className={cn(
                      "text-xs rounded-full px-2 py-0.5 border font-medium shrink-0",
                      PRIORITAET_STYLE[m.prioritaet as Prioritaet] ??
                        PRIORITAET_STYLE.mittel
                    )}
                  >
                    {PRIORITAET_LABEL[m.prioritaet as Prioritaet] ?? m.prioritaet}
                  </span>
                </div>
                <p className="text-xs text-[--muted-foreground] leading-relaxed">
                  {m.beschreibung}
                </p>
                <div className="flex items-center gap-3 flex-wrap text-xs text-[--muted-foreground]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {m.zeitrahmen}
                  </span>
                  <span className="rounded-full bg-[--muted]/60 px-2 py-0.5">
                    {m.kategorie}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ansprüche */}
        {plan.ansprueche.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[--foreground]">
              Mögliche Leistungsansprüche
            </h3>
            <ul className="space-y-1.5">
              {plan.ansprueche.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-[--foreground]">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nächste Schritte */}
        {plan.naechsteSchritte.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[--foreground]">
              Nächste Schritte
            </h3>
            <ol className="space-y-1.5">
              {plan.naechsteSchritte.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[--primary] text-[--primary-foreground] text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-[--foreground]">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Anbietertypen */}
        {plan.anbieterTypen.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[--foreground]">
              Empfohlene Anbieter suchen
            </h3>
            <div className="flex flex-wrap gap-2">
              {plan.anbieterTypen.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[--border] bg-[--muted]/30 px-3 py-1.5 text-xs text-[--foreground]"
                >
                  <Building2 className="h-3 w-3 text-[--muted-foreground]" />
                  {t}
                </span>
              ))}
            </div>
            <a
              href="/suche"
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity"
              )}
            >
              Anbieter in meiner Nähe suchen
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        <p className="text-xs text-[--muted-foreground] border-t border-[--border] pt-4">
          Dieser Plan wurde von einer KI generiert und ersetzt keine professionelle Pflegeberatung.
          Wenden Sie sich an Ihre Pflegekasse oder einen zugelassenen Pflegeberater (§ 7a SGB XI).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[--primary]" />
        <h2 className="text-lg font-semibold">KI-Pflegeplan erstellen</h2>
      </div>
      <p className="text-sm text-[--muted-foreground]">
        Beschreiben Sie die Situation. Die KI erstellt einen individuellen Pflegeplan
        mit konkreten Maßnahmen, möglichen Leistungsansprüchen und nächsten Schritten.
      </p>

      <div className="space-y-4">
        {/* Lebenslage */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[--foreground]">
            Lebenslage <span className="text-red-500">*</span>
          </label>
          <select
            value={lebenslage}
            onChange={(e) => setLebenslage(e.target.value as LebenslageTyp)}
            className={cn(
              "w-full rounded-lg border border-[--border] bg-[--background]",
              "px-3 py-2 text-sm text-[--foreground]"
            )}
          >
            <option value="">Bitte wählen…</option>
            {(Object.entries(LEBENSLAGEN) as [LebenslageTyp, typeof LEBENSLAGEN[LebenslageTyp]][]).map(
              ([key, meta]) => (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              )
            )}
          </select>
        </div>

        {/* Alter + Pflegegrad */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Alter{" "}
              <span className="text-[--muted-foreground] font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={alter}
              onChange={(e) => setAlter(e.target.value)}
              placeholder="z.B. 78"
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Pflegegrad{" "}
              <span className="text-[--muted-foreground] font-normal">(optional)</span>
            </label>
            <select
              value={pflegegrad}
              onChange={(e) => setPflegegrad(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm text-[--foreground]"
              )}
            >
              <option value="">Nicht bekannt</option>
              {PFLEGEGRADE.map((pg) => (
                <option key={pg} value={pg}>
                  {pg === "kein Pflegegrad" ? "Kein Pflegegrad" : `Pflegegrad ${pg}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Anamnese */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[--foreground]">
            Situation / Anamnese <span className="text-red-500">*</span>
          </label>
          <textarea
            value={anamnese}
            onChange={(e) => setAnamnese(e.target.value)}
            rows={5}
            placeholder="Beschreiben Sie die aktuelle Situation: Welche Einschränkungen bestehen? Welche Unterstützung wird bereits geleistet? Welche Herausforderungen gibt es? (min. 30 Zeichen)"
            className={cn(
              "w-full rounded-lg border border-[--border] bg-[--background]",
              "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]",
              "resize-none"
            )}
          />
          <p className="text-xs text-[--muted-foreground] text-right">
            {anamnese.length}/2000
          </p>
        </div>

        {/* Ziele */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[--foreground]">
            Ziele / Wünsche{" "}
            <span className="text-[--muted-foreground] font-normal">(optional)</span>
          </label>
          <textarea
            value={ziele}
            onChange={(e) => setZiele(e.target.value)}
            rows={2}
            placeholder="z.B. möglichst lange zu Hause bleiben, Entlastung der pflegenden Angehörigen"
            className={cn(
              "w-full rounded-lg border border-[--border] bg-[--background]",
              "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]",
              "resize-none"
            )}
          />
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !lebenslage || anamnese.trim().length < 30}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
            "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Pflegeplan wird erstellt…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Pflegeplan erstellen
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="text-xs text-[--muted-foreground]">
          Die KI-Analyse dauert ca. 10–20 Sekunden. Dieser Service ersetzt keine
          professionelle Pflegeberatung.
        </p>
      </div>
    </div>
  );
}
