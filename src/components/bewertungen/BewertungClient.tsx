"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const KRITERIEN: Array<{ key: string; label: string; beschreibung: string }> = [
  { key: "zuverlaessigkeit", label: "Zuverlässigkeit", beschreibung: "Pünktlichkeit und Verlässlichkeit" },
  { key: "fachkompetenz", label: "Fachkompetenz", beschreibung: "Qualität der Pflege und Betreuung" },
  { key: "freundlichkeit", label: "Freundlichkeit", beschreibung: "Umgang und Auftreten" },
  { key: "kommunikation", label: "Kommunikation", beschreibung: "Erreichbarkeit und Information" },
  { key: "pünktlichkeit", label: "Pünktlichkeit", beschreibung: "Einhaltung vereinbarter Zeiten" },
];

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      className="flex gap-1"
      onMouseLeave={() => setHovered(0)}
      role="radiogroup"
      aria-label="Sternebewertung"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-2xl leading-none transition-transform hover:scale-110 focus:outline-none ${
            star <= active ? "text-amber-400" : "text-gray-300"
          }`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
        >
          {star <= active ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

interface BewertungClientProps {
  buchungId: string;
  anbieterId: string;
  anbieterName: string;
}

export function BewertungClient({ buchungId, anbieterId, anbieterName }: BewertungClientProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    zuverlaessigkeit: 0,
    fachkompetenz: 0,
    freundlichkeit: 0,
    kommunikation: 0,
    pünktlichkeit: 0,
  });
  const [kommentar, setKommentar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const allFilled = Object.values(scores).every((v) => v > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) {
      setError("Bitte bewerten Sie alle 5 Kriterien.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bewertungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buchung_id: buchungId,
          anbieter_id: anbieterId,
          ...scores,
          kommentar: kommentar.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Unbekannter Fehler");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-green-800 mb-2">Vielen Dank!</h2>
        <p className="text-green-700 text-sm mb-6">
          Ihre Bewertung für <strong>{anbieterName}</strong> wurde erfolgreich gespeichert.
          Verifizierte Bewertungen helfen anderen Familien bei der Wahl des richtigen Pflegeanbieters.
        </p>
        <Link href="/familie/pflegeboerse/buchungen">
          <Button variant="outline" className="border-green-300 text-green-800 hover:bg-green-100">
            Zurück zu meinen Buchungen
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Criteria */}
      <div className="rounded-2xl border border-[--border] bg-[--card] divide-y divide-[--border]">
        {KRITERIEN.map(({ key, label, beschreibung }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[--foreground]">{label}</p>
              <p className="text-xs text-[--muted-foreground]">{beschreibung}</p>
            </div>
            <div className="shrink-0">
              <StarRating
                value={scores[key] ?? 0}
                onChange={(n) => setScores((prev) => ({ ...prev, [key]: n }))}
              />
              {scores[key] > 0 && (
                <p className="text-xs text-center text-[--muted-foreground] mt-0.5">
                  {scores[key]}/5
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Kommentar */}
      <div>
        <label htmlFor="kommentar" className="block text-sm font-medium text-[--foreground] mb-1.5">
          Kommentar{" "}
          <span className="text-[--muted-foreground] font-normal">(optional)</span>
        </label>
        <textarea
          id="kommentar"
          value={kommentar}
          onChange={(e) => setKommentar(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Teilen Sie Ihre Erfahrungen mit anderen Familien..."
          className="w-full rounded-xl border border-[--border] bg-[--background] px-4 py-3 text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] resize-none"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-[--muted-foreground]">
            Ihre Bewertung wird als &ldquo;Verifizierte Buchung&rdquo; gekennzeichnet.
          </p>
          <p className={`text-xs ${kommentar.length >= 900 ? "text-amber-600" : "text-[--muted-foreground]"}`}>
            {kommentar.length}/1000
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={loading || !allFilled}
          className="flex-1 gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Wird gespeichert..." : "Bewertung abgeben"}
        </Button>
        <Link href="/familie/pflegeboerse/buchungen">
          <Button type="button" variant="outline">
            Abbrechen
          </Button>
        </Link>
      </div>

      {!allFilled && (
        <p className="text-xs text-center text-[--muted-foreground]">
          Bitte bewerten Sie alle 5 Kriterien, um fortzufahren.
        </p>
      )}
    </form>
  );
}
