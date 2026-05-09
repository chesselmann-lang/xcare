"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";

interface AnfrageDialogProps {
  anbieterId: string;
  anbieterName: string;
  leistungId?: string;
  leistungName?: string;
  preselectedLebenslage?: LebenslageTyp;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function AnfrageDialog({
  anbieterId,
  anbieterName,
  leistungId,
  leistungName,
  preselectedLebenslage,
  onSuccess,
  trigger,
}: AnfrageDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lebenslage, setLebenslage] = useState<LebenslageTyp | "">(
    preselectedLebenslage ?? ""
  );
  const [beschreibung, setBeschreibung] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lebenslage) { setError("Bitte wählen Sie eine Lebenslage aus."); return; }
    if (beschreibung.trim().length < 20) { setError("Bitte beschreiben Sie Ihren Bedarf in mindestens 20 Zeichen."); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/anfragen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anbieter_id: anbieterId,
          leistung_id: leistungId ?? null,
          lebenslage,
          beschreibung,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Fehler beim Senden der Anfrage.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setBeschreibung("");
      toast.success("Anfrage gesendet!", {
        description: `${anbieterName} wurde benachrichtigt und meldet sich in Kürze.`,
      });
      onSuccess?.();
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 2500);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      toast.error("Fehler beim Senden", { description: "Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Anfrage stellen
          </Button>
        )}
      </div>

      {/* Backdrop + Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6 z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Anfrage stellen</h2>
                <p className="text-sm text-[--muted-foreground] mt-0.5">
                  An: <span className="font-medium text-[--foreground]">{anbieterName}</span>
                  {leistungName && <span> · {leistungName}</span>}
                </p>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[--muted] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-lg">Anfrage gesendet!</p>
                <p className="text-sm text-[--muted-foreground] mt-1">
                  Der Anbieter wird sich in Kürze bei Ihnen melden.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Lebenslage */}
                {!preselectedLebenslage && (
                  <div className="space-y-1.5">
                    <Label htmlFor="lebenslage">Lebenslage *</Label>
                    <select
                      id="lebenslage"
                      value={lebenslage}
                      onChange={(e) => setLebenslage(e.target.value as LebenslageTyp)}
                      className="flex h-9 w-full rounded-lg border border-[--border] bg-[--background] px-3 py-1 text-sm"
                      required
                    >
                      <option value="">Bitte wählen...</option>
                      {Object.entries(LEBENSLAGEN).map(([k, v]) => (
                        <option key={k} value={k}>{v.emoji} {v.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Beschreibung */}
                <div className="space-y-1.5">
                  <Label htmlFor="beschreibung">
                    Ihr Bedarf *
                    <span className="text-[--muted-foreground] font-normal ml-1">
                      ({beschreibung.length}/500)
                    </span>
                  </Label>
                  <Textarea
                    id="beschreibung"
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="Beschreiben Sie Ihren konkreten Bedarf. Je genauer, desto besser kann der Anbieter auf Sie eingehen..."
                    required
                  />
                  <p className="text-xs text-[--muted-foreground]">
                    Mindestens 20 Zeichen. Ihre Kontaktdaten werden automatisch mitgesendet.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={loading || beschreibung.trim().length < 20}
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {loading ? "Wird gesendet..." : "Anfrage senden"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
