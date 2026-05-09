"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SterneRating } from "./SterneRating";

interface BewertungAbgebenProps {
  anbieterId: string;
  anbieterName: string;
  familieId?: string;
  anfrageId?: string;
  initialSterne?: number | null;
  initialKommentar?: string | null;
  onSuccess?: () => void;
}

export function BewertungAbgeben({
  anbieterId,
  anbieterName,
  familieId,
  anfrageId,
  initialSterne,
  initialKommentar,
  onSuccess,
}: BewertungAbgebenProps) {
  const [sterne, setSterne] = useState(initialSterne ?? 0);
  const [kommentar, setKommentar] = useState(initialKommentar ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const isUpdate = (initialSterne ?? 0) > 0;

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
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      toast.success("Vielen Dank für Ihre Bewertung!");
      onSuccess?.();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <p className="text-sm text-green-700 font-medium">
          {isUpdate ? "Bewertung aktualisiert — Danke!" : "Bewertung abgegeben — Danke!"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          {isUpdate ? `${anbieterName} erneut bewerten` : `${anbieterName} bewerten`}
        </h3>
        <p className="text-xs text-[--muted-foreground] mt-0.5">
          {isUpdate
            ? "Sie haben diesen Anbieter bereits bewertet. Sie können Ihre Bewertung aktualisieren."
            : "Helfen Sie anderen Familien mit Ihrer Erfahrung."}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Sterne *</p>
        <SterneRating value={sterne} onChange={setSterne} size="lg" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="kommentar">
          Kommentar <span className="text-[--muted-foreground] font-normal">({kommentar.length}/1000)</span>
        </label>
        <Textarea
          id="kommentar"
          value={kommentar}
          onChange={(e) => setKommentar(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Wie war Ihre Erfahrung mit diesem Anbieter?"
        />
      </div>

      <Button onClick={submit} disabled={loading || sterne === 0} className="w-full gap-2">
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {isUpdate ? "Bewertung aktualisieren" : "Bewertung absenden"}
      </Button>
    </div>
  );
}
