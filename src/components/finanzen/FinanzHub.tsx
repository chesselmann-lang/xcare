"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Wallet, TrendingUp, Loader2 } from "lucide-react";
import { BudgetTracker } from "./BudgetTracker";
import { SteuerbelegrExport } from "./SteuerbelegrExport";
import { HaushaltsscheckWizard } from "./HaushaltsscheckWizard";

interface KategorienSumme {
  kategorie: string;
  summe: number;
}

interface KostenZeile {
  datum: string;
  beschreibung: string;
  betrag: number;
  kategorie: string;
}

interface KostenZusammenfassung {
  gesamtAktuellesMonat: number;
  gesamtAktuellesJahr: number;
  kategorien: KategorienSumme[];
  letztePosten: KostenZeile[];
}

function KostenUebersicht() {
  const [daten, setDaten] = useState<KostenZusammenfassung | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function laden() {
      setLoading(true);
      try {
        const aktuellesJahr = new Date().getFullYear();
        const aktuellerMonat = `${aktuellesJahr}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

        const [monatRes, steuerRes] = await Promise.all([
          fetch(`/api/pflegekosten?monat=${aktuellerMonat}`),
          fetch(`/api/steuerbescheinigung?jahr=${aktuellesJahr}`),
        ]);

        const monatJson = await monatRes.json() as { data?: Array<{ betrag: number }> };
        const steuerJson = await steuerRes.json() as {
          gesamtbetrag?: number;
          kategorienSummen?: Record<string, number>;
          zeilen?: KostenZeile[];
        };

        const monatDaten = monatJson.data ?? [];
        const gesamtMonat = monatDaten.reduce((s, p) => s + p.betrag, 0);
        const gesamtJahr = steuerJson.gesamtbetrag ?? 0;
        const katSummen = steuerJson.kategorienSummen ?? {};

        const kategorien: KategorienSumme[] = Object.entries(katSummen)
          .map(([kategorie, summe]) => ({ kategorie, summe }))
          .sort((a, b) => b.summe - a.summe);

        const allePosten = steuerJson.zeilen ?? [];
        const letztePosten = [...allePosten].reverse().slice(0, 5);

        setDaten({ gesamtAktuellesMonat: gesamtMonat, gesamtAktuellesJahr: gesamtJahr, kategorien, letztePosten });
      } catch {
        toast.error("Fehler beim Laden der Kosten-Übersicht");
      } finally {
        setLoading(false);
      }
    }
    laden();
  }, []);

  function formatEur(betrag: number): string {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[--muted-foreground] py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Kosten werden geladen...</span>
      </div>
    );
  }

  if (!daten) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[--foreground]">Kosten-Übersicht</h2>
        <p className="text-sm text-[--muted-foreground]">Zusammenfassung aller erfassten Pflegekosten</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">Aktueller Monat</p>
          <p className="text-2xl font-bold text-[--foreground]">{formatEur(daten.gesamtAktuellesMonat)}</p>
        </div>
        <div className="rounded-xl border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground] mb-1">Aktuelles Jahr</p>
          <p className="text-2xl font-bold text-[--foreground]">{formatEur(daten.gesamtAktuellesJahr)}</p>
        </div>
      </div>

      {daten.kategorien.length > 0 && (
        <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3">
          <h3 className="text-sm font-medium text-[--foreground] flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Kosten nach Kategorie (laufendes Jahr)
          </h3>
          <div className="space-y-2">
            {daten.kategorien.map(({ kategorie, summe }) => {
              const pct = daten.gesamtAktuellesJahr > 0
                ? Math.min(100, (summe / daten.gesamtAktuellesJahr) * 100)
                : 0;
              return (
                <div key={kategorie} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-[--foreground]">{kategorie}</span>
                    <span className="text-[--muted-foreground]">{formatEur(summe)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[--muted] overflow-hidden">
                    <div className="h-full rounded-full bg-[--primary]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {daten.letztePosten.length > 0 && (
        <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3">
          <h3 className="text-sm font-medium text-[--foreground]">Letzte Buchungen</h3>
          <div className="divide-y divide-[--border]">
            {daten.letztePosten.map((p, i) => (
              <div key={`${p.datum}-${i}`} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="text-[--foreground]">{p.beschreibung || p.kategorie}</p>
                  <p className="text-xs text-[--muted-foreground]">{p.datum} · {p.kategorie}</p>
                </div>
                <span className="font-medium text-[--foreground]">{formatEur(p.betrag)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {daten.kategorien.length === 0 && daten.letztePosten.length === 0 && (
        <div className="rounded-xl border border-dashed border-[--border] p-8 text-center">
          <p className="text-sm text-[--muted-foreground]">
            Noch keine Pflegekosten erfasst. Nutze den Bereich{" "}
            <span className="font-medium text-[--foreground]">Haushalt</span> um Kosten zu buchen.
          </p>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "budget" as const, label: "Budget-Tracker" },
  { id: "steuer" as const, label: "Steuerbeleg" },
  { id: "haushaltsscheck" as const, label: "Haushaltsscheck" },
  { id: "kosten" as const, label: "Kosten-Übersicht" },
];

type TabId = (typeof TABS)[number]["id"];

export function FinanzHub() {
  const [aktiv, setAktiv] = useState<TabId>("budget");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAktiv(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              aktiv === tab.id
                ? "bg-[--primary] text-[--primary-foreground]"
                : "text-[--muted-foreground] hover:bg-[--muted] hover:text-[--foreground]"
            }`}
          >
            {tab.id === "budget" && <Wallet className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {aktiv === "budget" && <BudgetTracker />}
        {aktiv === "steuer" && <SteuerbelegrExport />}
        {aktiv === "haushaltsscheck" && <HaushaltsscheckWizard />}
        {aktiv === "kosten" && <KostenUebersicht />}
      </div>
    </div>
  );
}
