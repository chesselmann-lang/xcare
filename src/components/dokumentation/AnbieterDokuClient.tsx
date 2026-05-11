"use client";

import { useState, useMemo } from "react";
import { FileDown, Filter, BarChart2, List } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DokuCard, type DokuEintrag } from "./DokuCard";
import { DokuForm } from "./DokuForm";
import { VitalChart } from "./VitalChart";

const KATEGORIEN = [
  { value: "", label: "Alle Kategorien" },
  { value: "allgemein",     label: "Allgemein" },
  { value: "koerperpflege", label: "Körperpflege" },
  { value: "ernaehrung",    label: "Ernährung" },
  { value: "mobilität",     label: "Mobilität" },
  { value: "medikamente",   label: "Medikamente" },
  { value: "vitalwerte",    label: "Vitalwerte" },
  { value: "wunde",         label: "Wundversorgung" },
  { value: "psychosozial",  label: "Psychosozial" },
  { value: "sonstiges",     label: "Sonstiges" },
];

interface FamilieOption {
  id: string;
  vorname?: string;
  nachname?: string;
}

interface CareWorker {
  id: string;
  vorname: string;
  nachname: string;
}

interface Props {
  initialEintraege: DokuEintrag[];
  familieOptionen: FamilieOption[];
  careWorkers: CareWorker[];
}

export function AnbieterDokuClient({ initialEintraege, familieOptionen, careWorkers }: Props) {
  const [eintraege, setEintraege] = useState<DokuEintrag[]>(initialEintraege);
  const [selectedFamilie, setSelectedFamilie] = useState("");
  const [selectedKategorie, setSelectedKategorie] = useState("");
  const [ansicht, setAnsicht] = useState<"liste" | "vitalwerte">("liste");

  const filtered = useMemo(() => {
    return eintraege.filter(e => {
      if (selectedFamilie && e.familie_profile_id !== selectedFamilie) return false;
      if (selectedKategorie && e.kategorie !== selectedKategorie) return false;
      return true;
    });
  }, [eintraege, selectedFamilie, selectedKategorie]);

  const handleCreated = (entry: DokuEintrag) => {
    setEintraege(prev => [entry, ...prev]);
  };

  const handleSigned = (id: string) => {
    setEintraege(prev => prev.map(e =>
      e.id === id ? { ...e, unterschrieben: true, unterschrift_ts: new Date().toISOString() } : e
    ));
  };

  const handleDeleted = (id: string) => {
    setEintraege(prev => prev.filter(e => e.id !== id));
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (selectedFamilie) params.set("familie_profile_id", selectedFamilie);
    window.open(`/api/dokumentation/export?${params.toString()}`, "_blank");
  };

  const kpis = {
    gesamt: eintraege.length,
    signiert: eintraege.filter(e => e.unterschrieben).length,
    vitalwerte: eintraege.filter(e => e.kategorie === "vitalwerte").length,
    medikamente: eintraege.filter(e => e.kategorie === "medikamente").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pflegedokumentation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Digitale Verlaufsnotizen, Vitalwerte und Medikamentengabe — MDK-konform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2 text-sm">
            <FileDown className="h-4 w-4" /> Bericht exportieren
          </Button>
          <DokuForm
            familieProfileId={selectedFamilie || undefined}
            careWorkers={careWorkers}
            onCreated={handleCreated}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Einträge gesamt</p>
          <p className="text-2xl font-bold text-gray-900">{kpis.gesamt}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Signiert</p>
          <p className="text-2xl font-bold text-green-600">{kpis.signiert}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Vitalwerte</p>
          <p className="text-2xl font-bold text-red-600">{kpis.vitalwerte}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Medikamente</p>
          <p className="text-2xl font-bold text-purple-600">{kpis.medikamente}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        {familieOptionen.length > 0 && (
          <select
            value={selectedFamilie}
            onChange={e => setSelectedFamilie(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Pflegepersonen</option>
            {familieOptionen.map(f => (
              <option key={f.id} value={f.id}>
                {f.vorname} {f.nachname}
              </option>
            ))}
          </select>
        )}
        <select
          value={selectedKategorie}
          onChange={e => setSelectedKategorie(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {KATEGORIEN.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-1 border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setAnsicht("liste")}
            className={`p-1.5 rounded ${ansicht === "liste" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnsicht("vitalwerte")}
            className={`p-1.5 rounded ${ansicht === "vitalwerte" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-600"}`}
          >
            <BarChart2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inhalt */}
      {ansicht === "vitalwerte" ? (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Vitalwert-Verlauf</h3>
          <VitalChart eintraege={filtered} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              <FileDown className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Noch keine Einträge. Legen Sie den ersten Pflegeeintrag an.
            </div>
          ) : (
            filtered.map(e => (
              <DokuCard
                key={e.id}
                eintrag={e}
                isAnbieter
                onSigned={handleSigned}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
