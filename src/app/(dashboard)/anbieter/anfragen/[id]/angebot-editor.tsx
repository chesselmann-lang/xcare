"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Euro,
  CalendarDays,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnfrageStatus } from "@/lib/types";

type PreisEinheit = "pro_monat" | "einmalig" | "pro_stunde" | "auf_anfrage";

const PREIS_EINHEIT_LABELS: Record<PreisEinheit, string> = {
  pro_monat: "/ Monat",
  einmalig: "einmalig",
  pro_stunde: "/ Stunde",
  auf_anfrage: "auf Anfrage",
};

interface AngebotEditorProps {
  anfrageId: string;
  profileId: string;
  currentStatus: AnfrageStatus;
}

export function AngebotEditor({ anfrageId, profileId, currentStatus }: AngebotEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [preis, setPreis] = useState("");
  const [einheit, setEinheit] = useState<PreisEinheit>("pro_monat");
  const [aufAnfrage, setAufAnfrage] = useState(false);
  const [startdatum, setStartdatum] = useState("");
  const [gueltigBis, setGueltigBis] = useState("");
  const [notizen, setNotizen] = useState("");

  // Only show for actionable statuses
  const isActionable = currentStatus === "offen" || currentStatus === "in_bearbeitung" || currentStatus === "angeboten";
  if (!isActionable) return null;

  const formatAngebotNachricht = () => {
    const preisText = aufAnfrage
      ? "Preis: auf Anfrage"
      : preis
        ? `Preis: ${Number(preis).toLocaleString("de-DE")} € ${PREIS_EINHEIT_LABELS[einheit]}`
        : null;

    const lines = [
      "📋 **Angebot**",
      "",
      preisText,
      startdatum ? `Startdatum: ${new Date(startdatum).toLocaleDateString("de-DE")}` : null,
      gueltigBis ? `Angebot gültig bis: ${new Date(gueltigBis).toLocaleDateString("de-DE")}` : null,
      notizen ? `\n${notizen}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return lines;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    // 1. Send the offer as a structured nachricht
    const inhalt = formatAngebotNachricht();
    const { error: msgError } = await supabase.from("nachrichten").insert({
      anfrage_id: anfrageId,
      sender_id: profileId,
      inhalt,
      gelesen: false,
    });

    if (msgError) {
      toast.error("Angebot konnte nicht gesendet werden", { description: msgError.message });
      setLoading(false);
      return;
    }

    // 2. Update status to "angeboten"
    const { error: statusError } = await supabase
      .from("anfragen")
      .update({ status: "angeboten", updated_at: new Date().toISOString() })
      .eq("id", anfrageId);

    if (statusError) {
      toast.error("Status konnte nicht aktualisiert werden", { description: statusError.message });
    } else {
      toast.success("Angebot gesendet!", {
        description: "Die Familie wird über Ihr Angebot informiert.",
      });
      setOpen(false);
      setPreis("");
      setNotizen("");
      setStartdatum("");
      setGueltigBis("");
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base flex items-center gap-2 text-purple-700">
            <PackageCheck className="h-4 w-4" />
            Angebot erstellen
            {currentStatus === "angeboten" && (
              <Badge variant="default" className="bg-purple-600 text-xs ml-2">
                Angebot laufend
              </Badge>
            )}
          </CardTitle>
          <span className="text-[--muted-foreground]">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
      </CardHeader>

      {open && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preis */}
            <div>
              <label className="text-sm font-medium text-[--foreground] mb-1.5 block">
                Preis
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={preis}
                    onChange={(e) => setPreis(e.target.value)}
                    disabled={aufAnfrage}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/30 disabled:opacity-50"
                  />
                </div>
                <select
                  value={einheit}
                  onChange={(e) => setEinheit(e.target.value as PreisEinheit)}
                  disabled={aufAnfrage}
                  className="px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/30 disabled:opacity-50"
                >
                  {Object.entries(PREIS_EINHEIT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 mt-2 text-sm text-[--muted-foreground] cursor-pointer">
                <input
                  type="checkbox"
                  checked={aufAnfrage}
                  onChange={(e) => setAufAnfrage(e.target.checked)}
                  className="rounded"
                />
                Preis auf Anfrage
              </label>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[--foreground] mb-1.5 flex items-center gap-1.5 block">
                  <CalendarDays className="h-3.5 w-3.5 text-[--muted-foreground]" />
                  Mögliches Startdatum
                </label>
                <input
                  type="date"
                  value={startdatum}
                  onChange={(e) => setStartdatum(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[--foreground] mb-1.5 flex items-center gap-1.5 block">
                  <CalendarDays className="h-3.5 w-3.5 text-[--muted-foreground]" />
                  Angebot gültig bis
                </label>
                <input
                  type="date"
                  value={gueltigBis}
                  onChange={(e) => setGueltigBis(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
                />
              </div>
            </div>

            {/* Freitext */}
            <div>
              <label className="text-sm font-medium text-[--foreground] mb-1.5 flex items-center gap-1.5 block">
                <FileText className="h-3.5 w-3.5 text-[--muted-foreground]" />
                Angebot-Beschreibung
              </label>
              <textarea
                value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                rows={4}
                placeholder="Beschreiben Sie Ihr Angebot: enthaltene Leistungen, Konditionen, besondere Hinweise…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/30 resize-none"
              />
            </div>

            {/* Preview */}
            {(preis || aufAnfrage || notizen) && (
              <div className="bg-[--muted] rounded-lg p-3 text-xs text-[--muted-foreground] space-y-0.5">
                <p className="font-medium text-[--foreground] mb-1">Vorschau der Nachricht:</p>
                <p className="whitespace-pre-wrap font-mono text-xs">{formatAngebotNachricht()}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || (!preis && !aufAnfrage)}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PackageCheck className="h-3.5 w-3.5" />
                )}
                Angebot senden
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
