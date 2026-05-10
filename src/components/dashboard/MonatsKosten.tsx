"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowRight, PlusCircle, TrendingDown } from "lucide-react";

interface KostenEintrag {
  kategorie: string;
  betrag: number;
  erstattung: number;
}

interface Props {
  kosten?: KostenEintrag[];
}

function formatEur(betrag: number): string {
  return betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

const KATEGORIE_FARBEN: Record<string, string> = {
  ambulante_pflege: "bg-blue-500",
  stationaere_pflege: "bg-violet-500",
  haushaltshilfe: "bg-emerald-500",
  hilfsmittel: "bg-amber-500",
  medikamente: "bg-red-500",
  transport: "bg-cyan-500",
  sonstiges: "bg-gray-400",
};

function kategorieLabel(kategorie: string): string {
  const labels: Record<string, string> = {
    ambulante_pflege: "Ambulante Pflege",
    stationaere_pflege: "Stationäre Pflege",
    haushaltshilfe: "Haushaltshilfe",
    hilfsmittel: "Hilfsmittel",
    medikamente: "Medikamente",
    transport: "Transport",
    sonstiges: "Sonstiges",
  };
  return labels[kategorie] ?? kategorie;
}

export function MonatsKosten({ kosten = [] }: Props) {
  if (kosten.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Kosten diesen Monat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Noch keine Kosten erfasst</p>
            <p className="text-xs text-muted-foreground">
              Tragen Sie Pflegekosten ein, um Ausgaben und Erstattungen im Überblick zu behalten.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/familie/pflegeplan">
              <PlusCircle className="mr-2 h-3.5 w-3.5" />
              Kosten erfassen
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalAusgaben = kosten.reduce((sum, k) => sum + k.betrag, 0);
  const totalErstattungen = kosten.reduce((sum, k) => sum + k.erstattung, 0);
  const nettoKosten = totalAusgaben - totalErstattungen;
  const maxBetrag = Math.max(...kosten.map((k) => k.betrag));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Kosten diesen Monat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Zusammenfassung */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-center">
            <p className="text-xs text-red-600 font-medium">Ausgaben</p>
            <p className="text-base font-bold text-red-700">{formatEur(totalAusgaben)}</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
            <p className="text-xs text-green-600 font-medium">Erstattungen</p>
            <p className="text-base font-bold text-green-700">{formatEur(totalErstattungen)}</p>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center">
            <p className="text-xs text-primary font-medium flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Netto
            </p>
            <p className="text-base font-bold text-foreground">{formatEur(nettoKosten)}</p>
          </div>
        </div>

        {/* Balken pro Kategorie */}
        <div className="space-y-3">
          {kosten.map((eintrag, idx) => {
            const barBreite = maxBetrag > 0 ? (eintrag.betrag / maxBetrag) * 100 : 0;
            const erstattungBreite = eintrag.betrag > 0 ? (eintrag.erstattung / eintrag.betrag) * barBreite : 0;
            const farbe = KATEGORIE_FARBEN[eintrag.kategorie] ?? "bg-gray-400";
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{kategorieLabel(eintrag.kategorie)}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{formatEur(eintrag.betrag)}</span>
                    {eintrag.erstattung > 0 && (
                      <Badge variant="secondary" className="text-xs py-0 h-4 text-green-700 bg-green-100">
                        -{formatEur(eintrag.erstattung)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${farbe} opacity-80 transition-all`}
                    style={{ width: `${barBreite}%` }}
                  />
                </div>
                {eintrag.erstattung > 0 && (
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${erstattungBreite}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/familie/pflegeplan">
            Kostenübersicht öffnen
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
