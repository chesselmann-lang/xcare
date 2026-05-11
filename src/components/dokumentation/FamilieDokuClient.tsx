"use client";

import { useState, useMemo } from "react";
import { BarChart2, List, Filter, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DokuCard, type DokuEintrag } from "./DokuCard";
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

interface Props {
  eintraege: DokuEintrag[];
}

export function FamilieDokuClient({ eintraege }: Props) {
  const [selectedKategorie, setSelectedKategorie] = useState("");
  const [ansicht, setAnsicht] = useState<"liste" | "vitalwerte">("liste");

  const filtered = useMemo(() => {
    if (!selectedKategorie) return eintraege;
    return eintraege.filter(e => e.kategorie === selectedKategorie);
  }, [eintraege, selectedKategorie]);

  const kpis = {
    gesamt: eintraege.length,
    vitalwerte: eintraege.filter(e => e.kategorie === "vitalwerte").length,
    medikamente: eintraege.filter(e => e.kategorie === "medikamente").length,
    letzteMessung: eintraege.find(e => e.kategorie === "vitalwerte"),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pflegedokumentation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Einsicht in Ihre persönliche Pflegedokumentation — schreibgeschützt.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Einträge (90 Tage)</p>
          <p className="text-2xl font-bold text-gray-900">{kpis.gesamt}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Vitalwert-Messungen</p>
          <p className="text-2xl font-bold text-red-600">{kpis.vitalwerte}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Medikamentengaben</p>
          <p className="text-2xl font-bold text-purple-600">{kpis.medikamente}</p>
        </Card>
      </div>

      {/* Letzte Vitalwerte Snapshot */}
      {kpis.letzteMessung && (
        <Card className="p-4 border-red-100 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-900">Letzte Vitalwerte</p>
            <span className="text-xs text-red-500 ml-auto">
              {new Date(kpis.letzteMessung.ereignis_datum).toLocaleDateString("de-DE")}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {kpis.letzteMessung.blutdruck_sys && kpis.letzteMessung.blutdruck_dia && (
              <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
                <span className="text-gray-400 text-xs">RR</span>{" "}
                <strong>{kpis.letzteMessung.blutdruck_sys}/{kpis.letzteMessung.blutdruck_dia}</strong>{" "}
                <span className="text-gray-400 text-xs">mmHg</span>
              </span>
            )}
            {kpis.letzteMessung.puls && (
              <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
                <span className="text-gray-400 text-xs">Puls</span>{" "}
                <strong>{kpis.letzteMessung.puls}</strong>{" "}
                <span className="text-gray-400 text-xs">bpm</span>
              </span>
            )}
            {kpis.letzteMessung.temperatur && (
              <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
                <span className="text-gray-400 text-xs">Temp</span>{" "}
                <strong>{kpis.letzteMessung.temperatur}</strong>{" "}
                <span className="text-gray-400 text-xs">°C</span>
              </span>
            )}
            {kpis.letzteMessung.sauerstoff && (
              <span className="bg-white px-3 py-1 rounded-lg shadow-sm">
                <span className="text-gray-400 text-xs">SpO₂</span>{" "}
                <strong>{kpis.letzteMessung.sauerstoff}</strong>{" "}
                <span className="text-gray-400 text-xs">%</span>
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Filter + Ansicht */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
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
          <h3 className="font-semibold text-gray-900 mb-4">Vitalwert-Verlauf (90 Tage)</h3>
          <VitalChart eintraege={eintraege} />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              Noch keine Einträge vorhanden.
            </div>
          ) : (
            filtered.map(e => (
              <DokuCard
                key={e.id}
                eintrag={e}
                isAnbieter={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
