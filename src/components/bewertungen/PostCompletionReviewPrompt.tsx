"use client";

import { useState } from "react";
import { Star, X, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PostCompletionReviewPromptProps {
  anfrageId: string;
  anbieterId: string;
  anbieterName: string;
}

const LABELS = ["", "Nicht gut", "Geht so", "Gut", "Sehr gut", "Hervorragend"];

export function PostCompletionReviewPrompt({
  anfrageId,
  anbieterId,
  anbieterName,
}: PostCompletionReviewPromptProps) {
  const [hovered, setHovered] = useState(0);
  const [sterne, setSterne] = useState(0);
  const [kommentar, setKommentar] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (done) {
    return (
      <div className="relative rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <p className="font-bold text-green-800 text-base">Vielen Dank für Ihre Bewertung!</p>
          <p className="text-sm text-green-700 mt-0.5 opacity-80">
            Sie helfen anderen Familien, den richtigen Anbieter zu finden.
          </p>
        </div>
        <div className="flex gap-1 text-amber-400">
          {Array.from({ length: sterne }).map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-amber-400" />
          ))}
        </div>
      </div>
    );
  }

  const activeLabel = LABELS[hovered || sterne];

  const handleStar = (n: number) => {
    setSterne(n);
    setHovered(0);
  };

  const submit = async () => {
    if (sterne === 0) { toast.error("Bitte wählen Sie eine Bewertung"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/bewertungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anbieter_id: anbieterId, anfrage_id: anfrageId, sterne, kommentar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setDone(true);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Sparkles className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">Wie war Ihre Erfahrung?</p>
          <p className="text-xs text-amber-700 mt-0.5 opacity-80">
            Bewerten Sie <span className="font-medium">{anbieterName}</span> und helfen Sie anderen Familien.
          </p>
        </div>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1.5 mb-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleStar(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="group p-0.5 transition-transform hover:scale-110 active:scale-95"
            aria-label={`${n} Sterne`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                n <= (hovered || sterne)
                  ? "fill-amber-400 text-amber-400"
                  : "text-amber-200 fill-amber-100"
              }`}
            />
          </button>
        ))}
        {activeLabel && (
          <span className="ml-2 text-sm font-medium text-amber-700 animate-in fade-in duration-150">
            {activeLabel}
          </span>
        )}
      </div>

      {/* Comment (shown after star selected) */}
      {sterne > 0 && (
        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <Textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value.slice(0, 1000))}
            rows={2}
            placeholder="Optional: Beschreiben Sie Ihre Erfahrung…"
            className="bg-white/80 border-amber-200 focus:border-amber-400 text-sm resize-none"
          />
          <Button
            onClick={submit}
            disabled={loading}
            size="sm"
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Bewertung absenden
          </Button>
        </div>
      )}
    </div>
  );
}
