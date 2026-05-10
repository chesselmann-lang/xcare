"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, FileText, Syringe, Pill, CheckCircle, ArrowRight } from "lucide-react";

interface DokumentFrist {
  name: string;
  ablaufdatum: string;
  kategorie: string;
}

interface ImpfungFrist {
  impfstoff: string;
  naechste_impfung: string;
}

interface MedikamentFrist {
  name: string;
  bis_datum: string;
}

interface FristItem {
  name: string;
  datum: Date;
  typ: "dokument" | "impfung" | "medikament";
  daysRemaining: number;
  kategorie?: string;
}

interface Props {
  dokumente?: DokumentFrist[];
  impfungen?: ImpfungFrist[];
  medikamente?: MedikamentFrist[];
}

function getDaysRemaining(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(days: number): "rot" | "gelb" | "gruen" {
  if (days < 30) return "rot";
  if (days < 90) return "gelb";
  return "gruen";
}

function UrgencyBadge({ days }: { days: number }) {
  const urgency = getUrgency(days);
  if (urgency === "rot") {
    return (
      <Badge variant="destructive" className="text-xs shrink-0">
        {days <= 0 ? "Abgelaufen" : `${days} Tage`}
      </Badge>
    );
  }
  if (urgency === "gelb") {
    return (
      <Badge className="text-xs shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
        {days} Tage
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs shrink-0">
      {days} Tage
    </Badge>
  );
}

function TypIcon({ typ }: { typ: FristItem["typ"] }) {
  if (typ === "dokument") return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
  if (typ === "impfung") return <Syringe className="h-4 w-4 text-green-500 shrink-0" />;
  return <Pill className="h-4 w-4 text-purple-500 shrink-0" />;
}

function TypLabel({ typ }: { typ: FristItem["typ"] }) {
  if (typ === "dokument") return "Dokument";
  if (typ === "impfung") return "Impfung";
  return "Medikament";
}

export function FristenWarner({ dokumente = [], impfungen = [], medikamente = [] }: Props) {
  const items: FristItem[] = [
    ...dokumente
      .filter((d) => d.ablaufdatum)
      .map((d) => ({
        name: d.name,
        datum: new Date(d.ablaufdatum),
        typ: "dokument" as const,
        daysRemaining: getDaysRemaining(d.ablaufdatum),
        kategorie: d.kategorie,
      })),
    ...impfungen
      .filter((i) => i.naechste_impfung)
      .map((i) => ({
        name: i.impfstoff,
        datum: new Date(i.naechste_impfung),
        typ: "impfung" as const,
        daysRemaining: getDaysRemaining(i.naechste_impfung),
      })),
    ...medikamente
      .filter((m) => m.bis_datum)
      .map((m) => ({
        name: m.name,
        datum: new Date(m.bis_datum),
        typ: "medikament" as const,
        daysRemaining: getDaysRemaining(m.bis_datum),
      })),
  ]
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  const totalCount = dokumente.length + impfungen.length + medikamente.length;
  const hasMore = totalCount > 5;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Fristen & Erinnerungen
          {items.some((i) => i.daysRemaining < 30) && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {items.filter((i) => i.daysRemaining < 30).length} dringend
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-foreground">Nichts fällig</p>
            <p className="text-xs text-muted-foreground">
              Alle Dokumente, Impfungen und Medikamente sind aktuell.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={`${item.typ}-${idx}`}
                  className="flex items-center gap-2.5 py-1.5 border-b border-border/50 last:border-0"
                >
                  <TypIcon typ={item.typ} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{TypLabel({ typ: item.typ })}</p>
                  </div>
                  <UrgencyBadge days={item.daysRemaining} />
                </div>
              ))}
            </div>
            {hasMore && (
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link href="/familie/dokumente">
                  Alle anzeigen ({totalCount})
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
