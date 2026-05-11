"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileText, Heart, Utensils, Pill, Activity, Scissors,
  Brain, MoreHorizontal, CheckCircle2, Clock, Trash2, Pen,
  Thermometer, Droplets, Wind, Weight, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const KATEGORIE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  allgemein:    { label: "Allgemein",       icon: FileText,    color: "bg-gray-100 text-gray-700" },
  koerperpflege:{ label: "Körperpflege",    icon: Heart,       color: "bg-pink-100 text-pink-700" },
  ernaehrung:   { label: "Ernährung",       icon: Utensils,    color: "bg-orange-100 text-orange-700" },
  "mobilität":  { label: "Mobilität",       icon: Activity,    color: "bg-blue-100 text-blue-700" },
  medikamente:  { label: "Medikamente",     icon: Pill,        color: "bg-purple-100 text-purple-700" },
  vitalwerte:   { label: "Vitalwerte",      icon: Activity,    color: "bg-red-100 text-red-700" },
  wunde:        { label: "Wundversorgung",  icon: Scissors,    color: "bg-yellow-100 text-yellow-700" },
  psychosozial: { label: "Psychosozial",    icon: Brain,       color: "bg-teal-100 text-teal-700" },
  sonstiges:    { label: "Sonstiges",       icon: MoreHorizontal, color: "bg-gray-100 text-gray-500" },
};

export type DokuEintrag = {
  id: string;
  kategorie: string;
  titel?: string | null;
  inhalt: string;
  ereignis_datum: string;
  created_at: string;
  // Vitalwerte
  blutdruck_sys?: number | null;
  blutdruck_dia?: number | null;
  puls?: number | null;
  temperatur?: number | null;
  gewicht?: number | null;
  blutzucker?: number | null;
  sauerstoff?: number | null;
  // Medikamente
  medikament_name?: string | null;
  medikament_dosis?: string | null;
  medikament_gegeben?: boolean | null;
  // Meta
  unterschrieben: boolean;
  unterschrift_ts?: string | null;
  care_workers?: { vorname: string; nachname: string } | null;
  profiles?: { vorname: string; nachname: string } | null;
};

interface DokuCardProps {
  eintrag: DokuEintrag;
  isAnbieter: boolean;
  onSigned?: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export function DokuCard({ eintrag: e, isAnbieter, onSigned, onDeleted }: DokuCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const cfg = KATEGORIE_CONFIG[e.kategorie] ?? KATEGORIE_CONFIG.sonstiges;
  const Icon = cfg.icon;

  const worker = e.care_workers;
  const ersteller = e.profiles;
  const verfasser = worker
    ? `${worker.vorname} ${worker.nachname}`
    : ersteller
      ? `${ersteller.vorname} ${ersteller.nachname}`
      : "–";

  const handleSign = async () => {
    if (!confirm("Eintrag digital signieren? Signierte Einträge können nicht mehr gelöscht werden.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dokumentation/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unterschrieben: true }),
      });
      if (!res.ok) throw new Error("Fehler");
      toast.success("Eintrag signiert");
      onSigned?.(e.id);
    } catch {
      toast.error("Signierung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Eintrag löschen?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dokumentation/${e.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      toast.success("Eintrag gelöscht");
      onDeleted?.(e.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const hasVital = e.kategorie === "vitalwerte" && (
    e.blutdruck_sys || e.puls || e.temperatur || e.gewicht || e.blutzucker || e.sauerstoff
  );

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            {e.unterschrieben ? (
              <span className="text-xs text-green-700 flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> Signiert
              </span>
            ) : (
              <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> Unsigniert
              </span>
            )}
          </div>
          {e.titel && <p className="font-semibold text-sm text-gray-900">{e.titel}</p>}
          <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{e.inhalt}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1 rounded hover:bg-gray-100"
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(e.ereignis_datum).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
          <span className="ml-2 text-gray-300">|</span>
          <span>{verfasser}</span>
        </span>
        {isAnbieter && !e.unterschrieben && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-green-700 hover:bg-green-50"
              onClick={handleSign}
              disabled={loading}
            >
              <Pen className="h-3 w-3 mr-1" /> Signieren
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs text-red-500 hover:bg-red-50"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3 text-sm">
          <p className="text-gray-700 whitespace-pre-wrap">{e.inhalt}</p>

          {hasVital && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {e.blutdruck_sys && e.blutdruck_dia && (
                <div className="bg-white rounded-lg p-2.5 border border-red-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Activity className="h-3 w-3" /> Blutdruck</p>
                  <p className="font-semibold text-gray-900">{e.blutdruck_sys}/{e.blutdruck_dia} <span className="text-xs font-normal">mmHg</span></p>
                </div>
              )}
              {e.puls && (
                <div className="bg-white rounded-lg p-2.5 border border-pink-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Heart className="h-3 w-3" /> Puls</p>
                  <p className="font-semibold text-gray-900">{e.puls} <span className="text-xs font-normal">bpm</span></p>
                </div>
              )}
              {e.temperatur && (
                <div className="bg-white rounded-lg p-2.5 border border-orange-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperatur</p>
                  <p className="font-semibold text-gray-900">{e.temperatur} <span className="text-xs font-normal">°C</span></p>
                </div>
              )}
              {e.sauerstoff && (
                <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Wind className="h-3 w-3" /> SpO₂</p>
                  <p className="font-semibold text-gray-900">{e.sauerstoff} <span className="text-xs font-normal">%</span></p>
                </div>
              )}
              {e.gewicht && (
                <div className="bg-white rounded-lg p-2.5 border border-green-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Weight className="h-3 w-3" /> Gewicht</p>
                  <p className="font-semibold text-gray-900">{e.gewicht} <span className="text-xs font-normal">kg</span></p>
                </div>
              )}
              {e.blutzucker && (
                <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Droplets className="h-3 w-3" /> Blutzucker</p>
                  <p className="font-semibold text-gray-900">{e.blutzucker} <span className="text-xs font-normal">mg/dL</span></p>
                </div>
              )}
            </div>
          )}

          {e.kategorie === "medikamente" && e.medikament_name && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${e.medikament_gegeben ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <Pill className={`h-5 w-5 ${e.medikament_gegeben ? "text-green-600" : "text-red-500"}`} />
              <div>
                <p className="font-medium text-gray-900">{e.medikament_name} {e.medikament_dosis && `— ${e.medikament_dosis}`}</p>
                <p className={`text-xs ${e.medikament_gegeben ? "text-green-700" : "text-red-600"}`}>
                  {e.medikament_gegeben ? "✓ Verabreicht" : "✗ Nicht verabreicht"}
                </p>
              </div>
            </div>
          )}

          {e.unterschrift_ts && (
            <p className="text-xs text-green-600">
              Signiert am {new Date(e.unterschrift_ts).toLocaleString("de-DE")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
