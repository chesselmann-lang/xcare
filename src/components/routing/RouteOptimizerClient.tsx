"use client";

import { useState } from "react";
import {
  PlusCircle, Trash2, Loader2, MapPin, Clock, Navigation,
  Printer, Calendar, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Stop {
  lat: number;
  lng: number;
  label?: string;
  arrivalTime: string;
  departureTime: string;
  durationMinutes: number;
}

interface RouteResult {
  datum: string;
  startLocation: { lat: number; lng: number; label?: string };
  route: {
    stops: Stop[];
    totalDistanceKm: number;
    totalDurationMinutes: number;
    segments: Array<{
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      distanceKm: number;
      durationMinutes: number;
    }>;
  };
}

interface RouteOptimizerClientProps {
  initialAdressen?: string[];
  datum?: string;
}

function MapSvg({ result }: { result: RouteResult }) {
  const allPoints = [result.startLocation, ...result.route.stops];
  if (allPoints.length < 2) return null;

  const lats = allPoints.map((p) => p.lat);
  const lngs = allPoints.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const padding = 0.001;
  const latRange = Math.max(maxLat - minLat, padding);
  const lngRange = Math.max(maxLng - minLng, padding);

  const W = 500;
  const H = 300;
  const PAD = 30;

  const toXY = (p: { lat: number; lng: number }) => ({
    x: PAD + ((p.lng - minLng) / lngRange) * (W - PAD * 2),
    y: PAD + ((maxLat - p.lat) / latRange) * (H - PAD * 2),
  });

  const points = allPoints.map(toXY);
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl border border-[--border] bg-slate-50"
      aria-label="Routenkarte"
    >
      {/* Route path */}
      <path
        d={pathD}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeDasharray="6 3"
        opacity="0.7"
      />

      {/* Stop dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 8 : 6}
            fill={i === 0 ? "#10B981" : "#3B82F6"}
            stroke="white"
            strokeWidth="2"
          />
          <text
            x={p.x}
            y={p.y + (i === 0 ? -12 : -10)}
            textAnchor="middle"
            fontSize="10"
            fill="#374151"
            fontWeight="600"
          >
            {i === 0 ? "Start" : i}
          </text>
        </g>
      ))}
    </svg>
  );
}

function generateIcs(result: RouteResult): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//xcare//Route Optimizer//DE",
    "CALSCALE:GREGORIAN",
  ];

  const dateStr = result.datum.replace(/-/g, "");

  result.route.stops.forEach((stop, idx) => {
    const dtStart = `${dateStr}T${stop.arrivalTime.replace(":", "")}00`;
    const dtEnd = `${dateStr}T${stop.departureTime.replace(":", "")}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:xcare-route-${result.datum}-stop-${idx + 1}@xcare`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Klient ${idx + 1} — ${stop.label ?? "Adresse " + (idx + 1)}`,
      `DESCRIPTION:Ankunft: ${stop.arrivalTime} Uhr\nAbfahrt: ${stop.departureTime} Uhr`,
      `LOCATION:${stop.label ?? ""}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function RouteOptimizerClient({ initialAdressen = [], datum }: RouteOptimizerClientProps) {
  const today = datum ?? new Date().toISOString().slice(0, 10);
  const [selectedDatum, setSelectedDatum] = useState(today);
  const [adressen, setAdressen] = useState<string[]>(
    initialAdressen.length > 0 ? initialAdressen : [""]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);

  function addAdresse() {
    setAdressen((prev) => [...prev, ""]);
  }

  function removeAdresse(idx: number) {
    setAdressen((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateAdresse(idx: number, value: string) {
    setAdressen((prev) => prev.map((a, i) => (i === idx ? value : a)));
  }

  async function handleOptimize() {
    const filled = adressen.filter((a) => a.trim().length > 0);
    if (filled.length === 0) {
      setError("Bitte mindestens eine Adresse eingeben.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/route-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum: selectedDatum, klientenAdressen: filled }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler bei der Routenoptimierung");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleIcsDownload() {
    if (!result) return;
    const ics = generateIcs(result);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xcare-route-${result.datum}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalStunden = result
    ? Math.floor(result.route.totalDurationMinutes / 60)
    : 0;
  const totalMinRest = result
    ? result.route.totalDurationMinutes % 60
    : 0;

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-5">
        {/* Date picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[--foreground] mb-1.5">
            Datum
          </label>
          <input
            type="date"
            value={selectedDatum}
            onChange={(e) => setSelectedDatum(e.target.value)}
            className="rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring]"
          />
        </div>

        {/* Address list */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[--foreground] mb-1.5">
            Klientenadressen
          </label>
          <div className="space-y-2">
            {adressen.map((addr, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <input
                  type="text"
                  value={addr}
                  onChange={(e) => updateAdresse(idx, e.target.value)}
                  placeholder={`Adresse ${idx + 1} (z.B. Musterstraße 1, 10115 Berlin)`}
                  className="flex-1 rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring]"
                />
                {adressen.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAdresse(idx)}
                    className="text-[--muted-foreground] hover:text-red-500 transition-colors p-1"
                    aria-label="Adresse entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addAdresse}
            disabled={adressen.length >= 20}
            className="mt-2 flex items-center gap-1.5 text-sm text-[--primary] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <PlusCircle className="h-4 w-4" />
            Adresse hinzufügen
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button onClick={handleOptimize} disabled={loading} className="w-full gap-2">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Route wird berechnet...</>
          ) : (
            <><Navigation className="h-4 w-4" /> Route optimieren</>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-green-800 mb-2">Optimierte Route</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{result.route.stops.length}</span> Klienten
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <Navigation className="h-4 w-4" />
                    <span className="font-medium">{result.route.totalDistanceKm}</span> km
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-green-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      {totalStunden > 0 ? `${totalStunden}h ` : ""}{totalMinRest}min
                    </span>
                    Fahrzeit
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Als PDF drucken
                </Button>
                <Button variant="outline" size="sm" onClick={handleIcsDownload} className="gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Zu Kalender hinzufügen
                </Button>
              </div>
            </div>
          </div>

          {/* SVG Map */}
          <MapSvg result={result} />

          {/* Stop list */}
          <div className="rounded-2xl border border-[--border] bg-[--card] overflow-hidden">
            <div className="px-5 py-3 border-b border-[--border]">
              <h3 className="text-sm font-semibold text-[--foreground]">Reihenfolge der Stopps</h3>
            </div>
            <div className="divide-y divide-[--border]">
              {/* Start */}
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700">Startpunkt</p>
                  <p className="text-sm text-[--foreground] truncate">
                    {result.startLocation.label ?? "Ihr Standort"}
                  </p>
                </div>
                <span className="text-sm font-medium text-[--muted-foreground]">08:00</span>
              </div>

              {/* Stops */}
              {result.route.stops.map((stop, idx) => {
                const seg = result.route.segments[idx];
                return (
                  <div key={idx}>
                    {/* Travel segment */}
                    <div className="px-5 py-1.5 flex items-center gap-3 bg-[--muted]/40">
                      <div className="w-7 shrink-0 flex justify-center">
                        <ChevronRight className="h-3.5 w-3.5 text-[--muted-foreground]" />
                      </div>
                      <p className="text-xs text-[--muted-foreground]">
                        {seg?.distanceKm ?? "–"} km · ca. {seg?.durationMinutes ?? "–"} Min. Fahrt
                      </p>
                    </div>
                    {/* Stop */}
                    <div className="px-5 py-3 flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[--foreground] truncate">
                          {stop.label ?? `Klient ${idx + 1}`}
                        </p>
                        <p className="text-xs text-[--muted-foreground]">
                          Ankunft {stop.arrivalTime} · Abfahrt {stop.departureTime} · {stop.durationMinutes} Min.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
