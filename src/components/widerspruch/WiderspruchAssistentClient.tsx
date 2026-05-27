"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Scale,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Clock,
  Printer,
  CheckCircle2,
  FileText,
  Building2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type BezugTyp = "pflegegrad" | "leistung" | "antrag" | "bescheid";

interface FormData {
  bezugTyp: BezugTyp;
  bescheidDatum: string;
  aktenzeichen: string;
  pflegekasse: string;
  pflegegrad: string;
  ablehnungGrund: string;
  eigenArgumente: string;
}

const INITIAL_FORM: FormData = {
  bezugTyp: "pflegegrad",
  bescheidDatum: "",
  aktenzeichen: "",
  pflegekasse: "",
  pflegegrad: "",
  ablehnungGrund: "",
  eigenArgumente: "",
};

// ─── Frist-Berechnung ────────────────────────────────────────────────────────

function berechneFrist(bescheidDatum: string): Date | null {
  if (!bescheidDatum) return null;
  const d = new Date(bescheidDatum);
  if (isNaN(d.getTime())) return null;
  const frist = new Date(d);
  frist.setMonth(frist.getMonth() + 1);
  return frist;
}

function tageBisZuDatum(datum: Date): number {
  const diff = datum.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { label: "Bescheid", icon: Building2 },
  { label: "Argumentation", icon: MessageSquare },
  { label: "Brief generieren", icon: Sparkles },
  { label: "Vorschau", icon: FileText },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-0 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? "bg-[--primary] border-[--primary] text-white"
                    : active
                    ? "border-[--primary] text-[--primary] bg-[--primary]/10"
                    : "border-[--border] text-[--muted-foreground] bg-[--muted]/30"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active ? "text-[--primary]" : "text-[--muted-foreground]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${
                  done ? "bg-[--primary]" : "bg-[--border]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WiderspruchAssistentClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [generatedText, setGeneratedText] = useState("");
  const [fristDatum, setFristDatum] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const fristDate = berechneFrist(form.bescheidDatum);
  const tageBisFrist = fristDate ? tageBisZuDatum(fristDate) : null;
  const istDringend = tageBisFrist !== null && tageBisFrist <= 14;

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Step 1 Validierung ─────────────────────────────────────────────────
  function step1Valid() {
    return (
      form.bezugTyp &&
      form.bescheidDatum &&
      form.pflegekasse.trim().length >= 2
    );
  }

  // ─── Step 2 Validierung ─────────────────────────────────────────────────
  function step2Valid() {
    return form.ablehnungGrund.trim().length >= 10;
  }

  // ─── KI-Generierung ─────────────────────────────────────────────────────
  function handleGenerieren() {
    startGenerating(async () => {
      try {
        const res = await fetch("/api/widerspruch/generieren", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bescheidDatum: form.bescheidDatum,
            pflegekasse: form.pflegekasse,
            ablehnungGrund: form.ablehnungGrund,
            eigenArgumente: form.eigenArgumente,
            pflegegrad: form.pflegegrad ? parseInt(form.pflegegrad) : undefined,
            bezugTyp: form.bezugTyp,
            aktenzeichen: form.aktenzeichen || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Generierung fehlgeschlagen");
        }

        const data = await res.json();
        setGeneratedText(data.generatedText);
        setFristDatum(data.fristDatum);
        setSavedId(data.id);
        setStep(3);
      } catch (err) {
        toast.error(String(err instanceof Error ? err.message : err));
      }
    });
  }

  // ─── Drucken ────────────────────────────────────────────────────────────
  function handleDrucken() {
    window.print();
  }

  // ─── Fertig ─────────────────────────────────────────────────────────────
  function handleFertig() {
    toast.success("Widerspruch gespeichert.");
    router.push("/familie/widerspruch");
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Scale className="h-6 w-6 text-[--primary]" />
          Widerspruch erstellen
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          KI-gestützter Assistent nach SGB XI § 78 ff.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* Frist-Warnung */}
      {fristDate && istDringend && (
        <Card className="border-destructive/50 bg-destructive/5 print:hidden">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              Frist läuft am{" "}
              {fristDate.toLocaleDateString("de-DE")} ab — noch{" "}
              <strong>{tageBisFrist} {tageBisFrist === 1 ? "Tag" : "Tage"}</strong>!
              Reichen Sie den Widerspruch rechtzeitig ein.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Bescheid-Details ────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Bescheid-Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Art des Bescheids <span className="text-destructive">*</span></Label>
              <Select
                value={form.bezugTyp}
                onValueChange={(v) => update("bezugTyp", v as BezugTyp)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pflegegrad">Pflegegrad-Einstufung</SelectItem>
                  <SelectItem value="leistung">Leistungsbescheid</SelectItem>
                  <SelectItem value="antrag">Antragsbescheid</SelectItem>
                  <SelectItem value="bescheid">Sonstiger Bescheid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bescheidDatum">
                  Datum des Bescheids <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bescheidDatum"
                  type="date"
                  value={form.bescheidDatum}
                  onChange={(e) => update("bescheidDatum", e.target.value)}
                  max={new Date().toISOString().substring(0, 10)}
                />
                {fristDate && (
                  <p className="text-xs text-[--muted-foreground] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Frist: {fristDate.toLocaleDateString("de-DE")}
                    {tageBisFrist !== null && (
                      <Badge
                        variant={istDringend ? "destructive" : "secondary"}
                        className="ml-1 text-xs"
                      >
                        {tageBisFrist <= 0
                          ? "Abgelaufen"
                          : `${tageBisFrist} ${tageBisFrist === 1 ? "Tag" : "Tage"}`}
                      </Badge>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aktenzeichen">Aktenzeichen (optional)</Label>
                <Input
                  id="aktenzeichen"
                  placeholder="z.B. 12345/2026/PG"
                  value={form.aktenzeichen}
                  onChange={(e) => update("aktenzeichen", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pflegekasse">
                Name der Pflegekasse <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pflegekasse"
                placeholder="z.B. AOK Bayern — Die Gesundheitskasse"
                value={form.pflegekasse}
                onChange={(e) => update("pflegekasse", e.target.value)}
              />
            </div>

            {form.bezugTyp === "pflegegrad" && (
              <div className="space-y-1.5">
                <Label htmlFor="pflegegrad">Beantragter Pflegegrad</Label>
                <Select
                  value={form.pflegegrad}
                  onValueChange={(v) => update("pflegegrad", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((pg) => (
                      <SelectItem key={pg} value={String(pg)}>
                        Pflegegrad {pg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)} disabled={!step1Valid()}>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Ablehnungsgrund + Argumente ─────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Ablehnungsgrund & Ihre Argumente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ablehnungGrund">
                Begründung der Pflegekasse für die Ablehnung{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="ablehnungGrund"
                placeholder="Aus dem Bescheid: 'Die Begutachtung durch den MDK hat ergeben, dass…'"
                value={form.ablehnungGrund}
                onChange={(e) => update("ablehnungGrund", e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-[--muted-foreground]">
                Kopieren Sie die Begründung aus dem Bescheid oder fassen Sie sie zusammen.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eigenArgumente">
                Ihre eigenen Argumente (optional, aber empfohlen)
              </Label>
              <Textarea
                id="eigenArgumente"
                placeholder="z.B. 'Meine Mutter benötigt täglich Unterstützung beim Aufstehen, beim Waschen und bei der Medikamenteneinnahme. Der MDK-Gutachter war nur 45 Minuten vor Ort und hat…'"
                value={form.eigenArgumente}
                onChange={(e) => update("eigenArgumente", e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-[--muted-foreground]">
                Konkrete Beispiele aus dem Alltag stärken den Widerspruch erheblich.
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              <Button onClick={() => setStep(2)} disabled={!step2Valid()}>
                Weiter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: KI generiert Brief ──────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              KI-Generierung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-[--muted]/20 p-4 text-sm space-y-2">
              <p className="font-medium text-[--foreground]">Zusammenfassung Ihrer Angaben:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[--muted-foreground]">
                <span>Pflegekasse:</span>
                <span className="text-[--foreground]">{form.pflegekasse}</span>
                <span>Bescheiddatum:</span>
                <span className="text-[--foreground]">
                  {form.bescheidDatum
                    ? new Date(form.bescheidDatum).toLocaleDateString("de-DE")
                    : "—"}
                </span>
                {form.aktenzeichen && (
                  <>
                    <span>Aktenzeichen:</span>
                    <span className="text-[--foreground]">{form.aktenzeichen}</span>
                  </>
                )}
                {fristDate && (
                  <>
                    <span>Widerspruchsfrist:</span>
                    <span
                      className={
                        istDringend ? "text-destructive font-bold" : "text-[--foreground]"
                      }
                    >
                      {fristDate.toLocaleDateString("de-DE")}
                      {istDringend && " ⚠ Dringend!"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Card className="border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-[--muted-foreground]">
                  Der generierte Brief ist ein KI-Entwurf nach geltendem SGB XI.
                  Lassen Sie ihn vor Einreichung von einem Anwalt für Sozialrecht prüfen.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              <Button
                onClick={handleGenerieren}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Brief wird erstellt…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Widerspruchsbrief generieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Vorschau + Druck ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Widerspruchsbrief
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDrucken}
                  className="gap-1.5 print:hidden"
                >
                  <Printer className="h-4 w-4" />
                  Drucken / PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Brief-Kopf */}
              <div className="border rounded-lg p-6 bg-white dark:bg-[--card] space-y-4 font-serif text-sm leading-relaxed print:border-0 print:p-0">
                <div className="text-right text-xs text-[--muted-foreground]">
                  <p>{new Date().toLocaleDateString("de-DE")}</p>
                </div>

                <div className="text-xs text-[--muted-foreground] space-y-0.5">
                  <p className="font-semibold text-[--foreground]">{form.pflegekasse}</p>
                  <p>— Widerspruchsausschuss —</p>
                </div>

                <Textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  rows={25}
                  className="font-mono text-sm resize-y border-dashed"
                />
                <p className="text-xs text-[--muted-foreground] italic">
                  Sie können den Text oben direkt bearbeiten.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Hinweise */}
          <Card className="border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10 print:hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-[--foreground]">
                  Wichtiger Hinweis
                </p>
                <p className="text-[--muted-foreground]">
                  Dieser Brief ist KI-generiert. Lassen Sie ihn vor Einreichung
                  von einem Anwalt für Sozialrecht prüfen. Kostenlose Beratung
                  bieten VdK, VdAB und die Verbraucherzentrale an.
                </p>
                {fristDate && (
                  <p
                    className={`font-medium ${istDringend ? "text-destructive" : "text-[--muted-foreground]"}`}
                  >
                    <Clock className="inline h-3 w-3 mr-1" />
                    Einreichefrist: {fristDate.toLocaleDateString("de-DE")}
                    {tageBisFrist !== null && (
                      <span>
                        {" "}
                        (noch {tageBisFrist} {tageBisFrist === 1 ? "Tag" : "Tage"})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between print:hidden">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
            <Button onClick={handleFertig} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Fertig — Zur Übersicht
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
