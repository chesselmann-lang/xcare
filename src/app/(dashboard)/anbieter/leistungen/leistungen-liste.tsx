"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Euro, Clock, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeistungAktionen } from "./leistung-aktionen";
import type { Leistung } from "@/lib/types";

const kategorieLabel: Record<string, string> = {
  pflege_ambulant: "Ambulante Pflege",
  pflege_stationaer: "Stationäre Pflege",
  tagespflege: "Tagespflege",
  kurzzeitpflege: "Kurzzeitpflege",
  beratung: "Beratung",
  foerderung: "Förderung",
  therapie: "Therapie",
  haushaltshilfe: "Haushaltshilfe",
  kinderbetreuung: "Kinderbetreuung",
  jugendhilfe: "Jugendhilfe",
  eingliederungshilfe: "Eingliederungshilfe",
  hospizdienst: "Hospizdienst",
  trauerhilfe: "Trauerhilfe",
  sonstiges: "Sonstiges",
};

const kostentraegerLabel: Record<string, string> = {
  gkv: "GKV",
  sgb_xi: "SGB XI",
  sgb_viii: "SGB VIII",
  sgb_ix: "SGB IX",
  sgb_ii_xii: "SGB II/XII",
  selbstzahler: "Selbstzahler",
  stiftung: "Stiftung",
};

export function LeistungenListe({ initialLeistungen }: { initialLeistungen: Leistung[] }) {
  const [leistungen, setLeistungen] = useState<Leistung[]>(initialLeistungen);

  const handleToggle = (id: string, newAktiv: boolean) => {
    setLeistungen((prev) => prev.map((l) => l.id === id ? { ...l, aktiv: newAktiv } : l));
  };

  const handleDelete = (id: string) => {
    setLeistungen((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDuplicate = (newLeistung: Leistung) => {
    setLeistungen((prev) => [...prev, newLeistung]);
  };

  const aktive = leistungen.filter((l) => l.aktiv);
  const inaktive = leistungen.filter((l) => !l.aktiv);

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[--muted-foreground]">
          {aktive.length} aktiv · {inaktive.length} archiviert
        </p>
        <Link href="/anbieter/leistungen/neu">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Leistung hinzufügen
          </Button>
        </Link>
      </div>

      {/* Aktive Leistungen */}
      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3 text-[--foreground]">Aktive Leistungen</h2>
        {aktive.length > 0 ? (
          <div className="space-y-3">
            {aktive.map((l) => (
              <LeistungCard key={l.id} leistung={l} onToggle={handleToggle} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-[--muted-foreground]">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="mb-3">Noch keine aktiven Leistungen</p>
              <Link href="/anbieter/leistungen/neu">
                <Button size="sm">Erste Leistung anlegen</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Archivierte Leistungen */}
      {inaktive.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 text-[--muted-foreground]">Archiviert</h2>
          <div className="space-y-3 opacity-60">
            {inaktive.map((l) => (
              <LeistungCard key={l.id} leistung={l} onToggle={handleToggle} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LeistungCard({
  leistung: l,
  onToggle,
  onDelete,
  onDuplicate,
}: {
  leistung: Leistung;
  onToggle: (id: string, aktiv: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (newLeistung: Leistung) => void;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium">{l.name}</p>
              <Badge variant={l.aktiv ? "success" : "secondary"} className="text-xs">
                {l.aktiv ? "Aktiv" : "Archiviert"}
              </Badge>
            </div>
            <p className="text-sm text-[--muted-foreground] mb-2">
              {kategorieLabel[l.kategorie] ?? l.kategorie}
              {l.sgb_paragraf && ` · ${l.sgb_paragraf}`}
            </p>
            {l.beschreibung && (
              <p className="text-sm text-[--muted-foreground] line-clamp-2 mb-3">{l.beschreibung}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-[--muted-foreground]">
              {(l.preis_von != null || l.preis_bis != null) && (
                <span className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  {l.preis_von != null && l.preis_bis != null
                    ? `${l.preis_von}–${l.preis_bis} €`
                    : l.preis_von != null
                    ? `ab ${l.preis_von} €`
                    : `bis ${l.preis_bis} €`}
                </span>
              )}
              {l.wartezeit_wochen != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {l.wartezeit_wochen === 0 ? "Sofort verfügbar" : `${l.wartezeit_wochen} Wo. Wartezeit`}
                </span>
              )}
              {l.kapazitaet != null && (
                <span className="flex items-center gap-1">
                  {l.kapazitaet} Plätze
                </span>
              )}
            </div>
            {l.kostentraeger && (l.kostentraeger as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(l.kostentraeger as string[]).map((k) => (
                  <Badge key={k} variant="secondary" className="text-xs">
                    {kostentraegerLabel[k] ?? k}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <LeistungAktionen
            leistungId={l.id}
            leistung={l}
            aktiv={l.aktiv}
            onToggle={onToggle}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </div>
      </CardContent>
    </Card>
  );
}
