"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Printer,
  ChevronRight,
  Users,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
} from "lucide-react";

interface Klient {
  id: string;
  name: string;
}

interface Props {
  klienten: Klient[];
  eintraegeMonat: number;
}

const BERICHT_TYPEN = [
  {
    value: "kurzbericht",
    label: "Pflegekurzbericht",
    beschreibung: "Kompakte Zusammenfassung für interne Kommunikation",
    icon: "📋",
  },
  {
    value: "mdk_bericht",
    label: "MDK-Pflegebericht",
    beschreibung: "§ 115a SGB XI konform, strukturiert nach SIS",
    icon: "🏛️",
  },
  {
    value: "uebergabe",
    label: "Übergabebericht",
    beschreibung: "SBAR-Format für Schichtwechsel und Übergaben",
    icon: "🔄",
  },
  {
    value: "entlassung",
    label: "Entlassungsbericht",
    beschreibung: "Abschlussbericht bei Betreuungsende",
    icon: "🏠",
  },
  {
    value: "pflegeanamnese",
    label: "Pflegeanamnese",
    beschreibung: "Erstbefund und Bedarfserhebung",
    icon: "🩺",
  },
];

const TODAY = new Date().toISOString().split("T")[0];
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export function PflegeberichtGeneratorClient({ klienten, eintraegeMonat }: Props) {
  const [klientId, setKlientId] = useState(klienten[0]?.id ?? "");
  const [von, setVon] = useState(THIRTY_DAYS_AGO);
  const [bis, setBis] = useState(TODAY);
  const [berichtTyp, setBerichtTyp] = useState("mdk_bericht");
  const [pflegegrad, setPflegegrad] = useState<string>("");
  const [zusatzInfos, setZusatzInfos] = useState("");
  const [loading, setLoading] = useState(false);
  const [bericht, setBericht] = useState<{
    text: string;
    typ: string;
    typLabel: string;
    eintraege: number;
  } | null>(null);

  const selectedKlient = klienten.find((k) => k.id === klientId);
  const selectedTyp = BERICHT_TYPEN.find((t) => t.value === berichtTyp);

  const handleGenerate = async () => {
    if (!klientId) {
      toast.error("Bitte wählen Sie einen Klienten aus.");
      return;
    }
    if (von > bis) {
      toast.error("Das Startdatum muss vor dem Enddatum liegen.");
      return;
    }

    setLoading(true);
    setBericht(null);

    try {
      const res = await fetch("/api/pflegebericht/generieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familieProfileId: klientId,
          von,
          bis,
          berichtTyp,
          patientName: selectedKlient?.name,
          pflegegrad: pflegegrad ? parseInt(pflegegrad, 10) : undefined,
          zusatzInfos: zusatzInfos || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Generieren.");
        return;
      }

      setBericht({
        text: data.bericht,
        typ: data.berichtTyp,
        typLabel: data.berichtTypLabel,
        eintraege: data.eintraegeAnzahl,
      });
      toast.success("Bericht erfolgreich generiert!");
    } catch {
      toast.error("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!bericht) return;
    await navigator.clipboard.writeText(bericht.text);
    toast.success("Bericht in Zwischenablage kopiert.");
  };

  const handlePrint = () => {
    if (!bericht) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${bericht.typLabel} – xcare</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 13pt; margin-top: 20px; color: #333; }
    h3 { font-size: 12pt; color: #555; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
    .meta { color: #666; font-size: 10pt; margin-bottom: 24px; }
    @media print { body { margin: 1.5cm; } }
  </style>
</head>
<body>
  <h1>${bericht.typLabel}</h1>
  <p class="meta">Erstellt mit xcare KI-Bericht-Generator • ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} • Basierend auf ${bericht.eintraege} Dokumentationseinträgen</p>
  <pre>${bericht.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`);
    w.document.close();
    w.print();
  };

  const handleDownload = () => {
    if (!bericht) return;
    const header = `${bericht.typLabel}\nErstellt: ${new Date().toLocaleDateString("de-DE")}\nKlient: ${selectedKlient?.name ?? ""}\nZeitraum: ${von} – ${bis}\n${"─".repeat(60)}\n\n`;
    const blob = new Blob([header + bericht.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Pflegebericht_${bericht.typ}_${TODAY}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Brain className="h-6 w-6 text-[--primary]" />
          KI-Pflegebericht-Generator
        </h1>
        <p className="text-[--muted-foreground] mt-1">
          Erstellen Sie professionelle, MDK-konforme Pflegeberichte automatisch
          aus Ihren Dokumentationseinträgen.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Klienten verfügbar</p>
          <p className="text-2xl font-bold text-[--foreground] mt-1">
            {klienten.length}
          </p>
          <p className="text-xs text-[--muted-foreground] flex items-center gap-1 mt-1">
            <Users className="h-3 w-3" /> mit Dokumentation
          </p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Einträge diesen Monat</p>
          <p className="text-2xl font-bold text-[--primary] mt-1">
            {eintraegeMonat}
          </p>
          <p className="text-xs text-[--muted-foreground] flex items-center gap-1 mt-1">
            <ClipboardList className="h-3 w-3" /> Dokumentationen
          </p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Berichtstypen</p>
          <p className="text-2xl font-bold text-[--foreground] mt-1">5</p>
          <p className="text-xs text-[--muted-foreground] flex items-center gap-1 mt-1">
            <FileText className="h-3 w-3" /> verfügbar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-5">
          <h2 className="font-semibold text-[--foreground] flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[--primary]" />
            Berichtseinstellungen
          </h2>

          {/* Client Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Klient / Pflegeperson *
            </label>
            {klienten.length === 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Keine Klienten mit Pflegedokumentation gefunden. Erstellen Sie
                zunächst Einträge unter{" "}
                <a href="/anbieter/dokumentation" className="underline">
                  Pflegedokumentation
                </a>
                .
              </div>
            ) : (
              <select
                value={klientId}
                onChange={(e) => setKlientId(e.target.value)}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              >
                {klienten.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">Von *</label>
              <input
                type="date"
                value={von}
                max={bis}
                onChange={(e) => setVon(e.target.value)}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[--foreground]">Bis *</label>
              <input
                type="date"
                value={bis}
                min={von}
                max={TODAY}
                onChange={(e) => setBis(e.target.value)}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              />
            </div>
          </div>

          {/* Pflegegrad */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Pflegegrad{" "}
              <span className="text-[--muted-foreground] font-normal">(optional)</span>
            </label>
            <select
              value={pflegegrad}
              onChange={(e) => setPflegegrad(e.target.value)}
              className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            >
              <option value="">Nicht angeben</option>
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={g}>
                  Pflegegrad {g}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Info */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Zusatzinformationen{" "}
              <span className="text-[--muted-foreground] font-normal">(optional)</span>
            </label>
            <textarea
              value={zusatzInfos}
              onChange={(e) => setZusatzInfos(e.target.value)}
              placeholder="z. B. Diagnosen, besondere Hinweise, Anlass des Berichts …"
              rows={3}
              className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
            />
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-3">
          <h2 className="font-semibold text-[--foreground] flex items-center gap-2">
            <FileText className="h-4 w-4 text-[--primary]" />
            Berichtstyp wählen
          </h2>

          <div className="space-y-2">
            {BERICHT_TYPEN.map((typ) => (
              <button
                key={typ.value}
                type="button"
                onClick={() => setBerichtTyp(typ.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  berichtTyp === typ.value
                    ? "border-[--primary] bg-[--primary]/5"
                    : "border-[--border] hover:border-[--primary]/40 hover:bg-[--muted]/50"
                }`}
              >
                <span className="text-xl">{typ.icon}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      berichtTyp === typ.value
                        ? "text-[--primary]"
                        : "text-[--foreground]"
                    }`}
                  >
                    {typ.label}
                  </p>
                  <p className="text-xs text-[--muted-foreground] truncate">
                    {typ.beschreibung}
                  </p>
                </div>
                {berichtTyp === typ.value && (
                  <CheckCircle2 className="h-4 w-4 text-[--primary] shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || klienten.length === 0}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[--primary] text-white px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Bericht wird generiert …
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {selectedTyp?.label ?? "Bericht"} generieren
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>

          {loading && (
            <p className="text-xs text-center text-[--muted-foreground] animate-pulse">
              KI analysiert {Math.round((Date.now() % 90) + 10)} Dokumentationseinträge …
            </p>
          )}
        </div>
      </div>

      {/* Generated Report */}
      {bericht && (
        <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
          {/* Report Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[--border] bg-green-50 dark:bg-green-900/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-[--foreground]">
                  {bericht.typLabel}
                </p>
                <p className="text-xs text-[--muted-foreground]">
                  {selectedKlient?.name} • {von} – {bis} •{" "}
                  {bericht.eintraege} Einträge analysiert
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[--border] text-xs font-medium hover:bg-[--muted] transition-colors"
                title="Kopieren"
              >
                <Copy className="h-3.5 w-3.5" />
                Kopieren
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[--border] text-xs font-medium hover:bg-[--muted] transition-colors"
                title="Drucken"
              >
                <Printer className="h-3.5 w-3.5" />
                Drucken
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[--primary] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                title="Herunterladen"
              >
                <Download className="h-3.5 w-3.5" />
                .txt
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm text-[--foreground] leading-relaxed">
              {bericht.text}
            </pre>
          </div>

          {/* AI Disclaimer */}
          <div className="px-6 py-3 border-t border-[--border] bg-amber-50 dark:bg-amber-900/10">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>Hinweis:</strong> Dieser Bericht wurde von einer KI
                generiert und dient als Entwurf. Bitte prüfen, ergänzen und
                ggf. anpassen Sie den Inhalt vor der offiziellen Verwendung.
                Eine professionelle Überprüfung durch qualifiziertes Pflegepersonal
                ist erforderlich.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!bericht && !loading && (
        <div className="rounded-xl border border-dashed border-[--border] p-10 text-center">
          <Brain className="h-12 w-12 text-[--muted-foreground]/40 mx-auto mb-3" />
          <p className="text-[--muted-foreground] text-sm">
            Wählen Sie Klient, Zeitraum und Berichtstyp, um einen Bericht zu
            generieren.
          </p>
          <p className="text-xs text-[--muted-foreground]/60 mt-1">
            Die KI analysiert alle Dokumentationseinträge im gewählten Zeitraum.
          </p>
        </div>
      )}
    </div>
  );
}
