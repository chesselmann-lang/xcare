"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Info } from "lucide-react";

interface SteuerZeile {
  datum: string;
  beschreibung: string;
  betrag: number;
  kategorie: string;
  rechtsgrundlage: string;
}

interface SteuerResponse {
  jahr: number;
  zeilen: SteuerZeile[];
  kategorienSummen: Record<string, number>;
  gesamtbetrag: number;
  hinweis: string;
  error?: string;
}

function formatEur(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag);
}

function buildCsv(data: SteuerResponse): string {
  const header = ["Datum", "Beschreibung", "Betrag (EUR)", "Kategorie", "Rechtsgrundlage"];
  const rows: string[][] = data.zeilen.map((z) => [
    z.datum,
    `"${z.beschreibung.replace(/"/g, '""')}"`,
    z.betrag.toFixed(2).replace(".", ","),
    `"${z.kategorie}"`,
    `"${z.rechtsgrundlage}"`,
  ]);

  rows.push([]);
  rows.push(["", "GESAMT", data.gesamtbetrag.toFixed(2).replace(".", ","), "", ""]);
  rows.push([]);
  rows.push(["", "Summen je Kategorie", "", "", ""]);
  for (const [kat, summe] of Object.entries(data.kategorienSummen)) {
    rows.push(["", `"${kat}"`, summe.toFixed(2).replace(".", ","), "", ""]);
  }

  return [header.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
}

export function SteuerbelegrExport() {
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [letzterExport, setLetzterExport] = useState<SteuerResponse | null>(null);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/steuerbescheinigung?jahr=${jahr}`);
      const data = await res.json() as SteuerResponse;

      if (!res.ok) throw new Error(data.error ?? "Fehler beim Generieren");

      setLetzterExport(data);

      if (data.zeilen.length === 0) {
        toast.info(`Keine Daten für ${jahr} vorhanden`);
        return;
      }

      const csv = buildCsv(data);
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xcare_steuerbeleg_${jahr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Steuerbeleg ${jahr} heruntergeladen`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Export");
    } finally {
      setLoading(false);
    }
  }

  const aktuellesJahr = new Date().getFullYear();
  const jahreOptionen = Array.from({ length: 5 }, (_, i) => aktuellesJahr - i);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[--foreground]">Jahressteuerbeleg</h2>
        <p className="text-sm text-[--muted-foreground]">CSV-Export aller Pflegekosten für die Steuererklärung</p>
      </div>

      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p className="font-medium">Für § 35a EStG — Haushaltsnahe Dienstleistungen</p>
          <p>
            Pflegeleistungen durch anerkannte Dienstleister können als haushaltsnahe Dienstleistungen
            (§ 35a Abs. 2 EStG) oder außergewöhnliche Belastungen (§ 33 EStG) steuerlich geltend
            gemacht werden. Reichen Sie diesen Beleg als Anlage zur Steuererklärung ein.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-[--foreground] mb-1.5">Steuerjahr</label>
          <select
            value={jahr}
            onChange={(e) => setJahr(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
          >
            {jahreOptionen.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-[--primary] text-[--primary-foreground] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Jahressteuerbeleg {jahr} herunterladen
        </button>
      </div>

      {letzterExport && letzterExport.zeilen.length > 0 && (
        <div className="rounded-xl border border-[--border] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[--foreground]">Zusammenfassung {letzterExport.jahr}</h3>
            <span className="text-sm font-bold text-[--foreground]">
              Gesamt: {formatEur(letzterExport.gesamtbetrag)}
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(letzterExport.kategorienSummen).map(([kat, summe]) => (
              <div key={kat} className="flex items-center justify-between text-sm">
                <span className="text-[--muted-foreground]">{kat}</span>
                <span className="font-medium text-[--foreground]">{formatEur(summe)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[--muted-foreground]">{letzterExport.hinweis}</p>
        </div>
      )}

      {letzterExport && letzterExport.zeilen.length === 0 && (
        <div className="rounded-xl border border-dashed border-[--border] p-8 text-center">
          <p className="text-sm text-[--muted-foreground]">
            Für das Jahr {letzterExport.jahr} wurden keine Kosten erfasst.
          </p>
        </div>
      )}
    </div>
  );
}
