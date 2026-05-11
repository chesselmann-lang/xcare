"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { DokuEintrag } from "./DokuCard";

interface VitalChartProps {
  eintraege: DokuEintrag[];
}

type ChartPoint = {
  datum: string;
  sys?: number;
  dia?: number;
  puls?: number;
  temperatur?: number;
  sauerstoff?: number;
};

export function VitalChart({ eintraege }: VitalChartProps) {
  const vitalEintraege = eintraege
    .filter(e => e.kategorie === "vitalwerte")
    .sort((a, b) => new Date(a.ereignis_datum).getTime() - new Date(b.ereignis_datum).getTime());

  if (vitalEintraege.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
        Mindestens 2 Vitalwert-Messungen für Verlaufsdiagramm erforderlich
      </div>
    );
  }

  const data: ChartPoint[] = vitalEintraege.map(e => ({
    datum: new Date(e.ereignis_datum).toLocaleDateString("de-DE", { month: "2-digit", day: "2-digit" }),
    ...(e.blutdruck_sys ? { sys: e.blutdruck_sys } : {}),
    ...(e.blutdruck_dia ? { dia: e.blutdruck_dia } : {}),
    ...(e.puls ? { puls: e.puls } : {}),
    ...(e.temperatur ? { temperatur: Number(e.temperatur) } : {}),
    ...(e.sauerstoff ? { sauerstoff: e.sauerstoff } : {}),
  }));

  const hasSys = data.some(d => d.sys != null);
  const hasDia = data.some(d => d.dia != null);
  const hasPuls = data.some(d => d.puls != null);
  const hasTemp = data.some(d => d.temperatur != null);
  const hasSpo2 = data.some(d => d.sauerstoff != null);

  return (
    <div className="space-y-6">
      {(hasSys || hasDia || hasPuls) && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Blutdruck & Puls</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val: number, name: string) => [
                  `${val} ${name === "puls" ? "bpm" : "mmHg"}`,
                  name === "sys" ? "RR syst." : name === "dia" ? "RR diast." : "Puls",
                ]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {hasSys && <Line type="monotone" dataKey="sys" name="RR syst." stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
              {hasDia && <Line type="monotone" dataKey="dia" name="RR diast." stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
              {hasPuls && <Line type="monotone" dataKey="puls" name="Puls" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(hasTemp || hasSpo2) && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Temperatur & SpO₂</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val: number, name: string) => [
                  `${val}${name === "temperatur" ? " °C" : " %"}`,
                  name === "temperatur" ? "Temperatur" : "SpO₂",
                ]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {hasTemp && <Line type="monotone" dataKey="temperatur" name="Temperatur" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
              {hasSpo2 && <Line type="monotone" dataKey="sauerstoff" name="SpO₂" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
