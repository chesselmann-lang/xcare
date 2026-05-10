"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Euro, ArrowRight, AlertCircle, TrendingUp } from "lucide-react";
import { berechneAnsprueche } from "@/lib/anspruch/engine";
import type { AnspruchsInput } from "@/lib/anspruch/types";

interface Props {
  pflegegrad?: number;
  vorname?: string;
}

function pflegegradZuInput(pflegegrad: number): AnspruchsInput {
  return {
    lebenslage: "alter_pflege",
    alter: 75,
    familienstand: "ledig",
    wohnform: "privat",
    versicherungsart: "gkv",
    pflegegrad: pflegegrad as AnspruchsInput["pflegegrad"],
    pflege_durch_angehoerige: true,
    pflegeperson_berufstaetig: false,
    erwerbstaetig: false,
  };
}

function formatEur(betrag: number): string {
  return betrag.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function AnspruchsWidget({ pflegegrad, vorname }: Props) {
  const ergebnis = useMemo(() => {
    if (!pflegegrad || pflegegrad < 1 || pflegegrad > 5) return null;
    return berechneAnsprueche(pflegegradZuInput(pflegegrad));
  }, [pflegegrad]);

  if (!pflegegrad || !ergebnis) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Euro className="h-4 w-4 text-primary" />
            Ihre Leistungsansprüche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Pflegegrad noch nicht hinterlegt</p>
              <p className="text-xs mt-1 text-amber-700">
                Tragen Sie den Pflegegrad im Profil ein, um Ihre monatlichen Leistungsansprüche zu sehen.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/anspruch">
              Ansprüche berechnen
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const erfuellteAnsprueche = ergebnis.ansprueche
    .filter((a) => a.voraussetzungen_erfuellt && a.betrag_monatlich_eur && a.betrag_monatlich_eur > 0)
    .slice(0, 3);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Euro className="h-4 w-4 text-primary" />
          Leistungsansprüche
          <Badge variant="secondary" className="ml-auto text-xs">
            Pflegegrad {pflegegrad}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gesamtsumme */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Monatlich gesamt</p>
            <p className="text-2xl font-bold text-primary">
              {formatEur(ergebnis.gesamt_monatlich_eur)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Jährlich</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {formatEur(ergebnis.gesamt_jaehrlich_eur)}
            </p>
          </div>
        </div>

        {/* Top 3 Ansprüche */}
        <div className="space-y-2">
          {erfuellteAnsprueche.map((anspruch) => (
            <div
              key={anspruch.id}
              className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-sm text-foreground truncate">{anspruch.titel}</span>
              </div>
              <span className="text-sm font-semibold text-green-700 ml-2 shrink-0">
                {formatEur(anspruch.betrag_monatlich_eur!)}/Mo.
              </span>
            </div>
          ))}
        </div>

        <Button asChild size="sm" className="w-full">
          <Link href="/anspruch">
            Alle Ansprüche berechnen
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
