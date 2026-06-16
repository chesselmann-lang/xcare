"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  Activity,
  Scale,
  Heart,
  Thermometer,
  Droplets,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface GewichtEintrag {
  id: string;
  bewohner_id: string;
  datum: string;
  uhrzeit: string | null;
  gewicht_kg: number;
  bmi: number | null;
  gemessen_unter: string | null;
  notizen: string | null;
  erstellt_am: string;
}

interface VitalEintrag {
  id: string;
  bewohner_id: string;
  datum: string;
  uhrzeit: string | null;
  rr_systolisch: number | null;
  rr_diastolisch: number | null;
  puls: number | null;
  rhythmus: string | null;
  temperatur_c: number | null;
  temperatur_ort: string | null;
  spo2_prozent: number | null;
  o2_lmin: number | null;
  bz_mmol: number | null;
  bz_zeitpunkt: string | null;
  atemfrequenz: number | null;
  nrs_wert: number | null;
  notizen: string | null;
  erstellt_am: string;
}

interface Normwerte {
  bewohner_id: string;
  zielgewicht_kg: number | null;
  groesse_cm: number | null;
  rr_ziel_sys_min: number | null;
  rr_ziel_sys_max: number | null;
  rr_ziel_dia_min: number | null;
  rr_ziel_dia_max: number | null;
  bz_ziel_min: number | null;
  bz_ziel_max: number | null;
  spo2_ziel_min: number | null;
  notizen: string | null;
}

interface Stats {
  aktuellesGewicht: number | null;
  gewichtDelta: number | null;
  anzahlMessungen: number;
  letzteMessung: string | null;
  letzteVital: VitalEintrag | null;
}

interface Props {
  bewohnerId: string;
  bewohnerName: string;
  initialGewichtEintraege: GewichtEintrag[];
  initialVitalEintraege: VitalEintrag[];
  initialNormwerte: Normwerte | null;
  initialStats: Stats;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function bmiKategorie(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Untergewicht", color: "text-blue-600" };
  if (bmi < 25) return { label: "Normalgewicht", color: "text-green-600" };
  if (bmi < 30) return { label: "Übergewicht", color: "text-yellow-600" };
  return { label: "Adipositas", color: "text-red-600" };
}

function rrStatus(sys: number, dia: number): string {
  if (sys < 90 || dia < 60) return "Hypoton";
  if (sys <= 139 && dia <= 89) return "Normal";
  if (sys <= 159 || dia <= 99) return "Hypertonie Gr. 1";
  return "Hypertonie Gr. 2+";
}

// ─── SVG Gewichtskurve ───────────────────────────────────────────────────────

const GewichtKurve = React.memo(function GewichtKurve({
  eintraege,
  zielgewicht,
}: {
  eintraege: GewichtEintrag[];
  zielgewicht: number | null;
}) {
  if (eintraege.length < 2) return null;

  const W = 600, H = 180, PAD = 50;
  const plotW = W - PAD * 2, plotH = H - PAD;

  const gewichte = eintraege.map((e) => e.gewicht_kg);
  const min = Math.min(...gewichte) - 1;
  const max = Math.max(...gewichte) + 1;
  const range = max - min || 1;

  const minDate = new Date(eintraege[0].datum).getTime();
  const maxDate = new Date(eintraege[eintraege.length - 1].datum).getTime();
  const dateRange = maxDate - minDate || 1;

  const x = (d: string) =>
    PAD + ((new Date(d).getTime() - minDate) / dateRange) * plotW;
  const y = (v: number) => 20 + (1 - (v - min) / range) * plotH;

  const polyline = eintraege.map((e) => `${x(e.datum)},${y(e.gewicht_kg)}`).join(" ");
  // Area fill path
  const areaPath = `M${x(eintraege[0].datum)},${y(eintraege[0].gewicht_kg)} ${eintraege
    .map((e) => `L${x(e.datum)},${y(e.gewicht_kg)}`)
    .join(" ")} L${x(eintraege[eintraege.length - 1].datum)},${20 + plotH} L${PAD},${20 + plotH} Z`;

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) =>
    Math.round((min + (range * i) / ySteps) * 10) / 10
  );

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ minWidth: 280 }}>
        <defs>
          <linearGradient id="gw-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yLabels.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD}
              x2={PAD + plotW}
              y1={y(v)}
              y2={y(v)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
              {v}
            </text>
          </g>
        ))}

        {/* Zielgewicht */}
        {zielgewicht !== null && zielgewicht > min && zielgewicht < max && (
          <line
            x1={PAD}
            x2={PAD + plotW}
            y1={y(zielgewicht)}
            y2={y(zielgewicht)}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Area */}
        <path d={areaPath} fill="url(#gw-gradient)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {eintraege.map((e, i) => (
          <circle
            key={i}
            cx={x(e.datum)}
            cy={y(e.gewicht_kg)}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* X labels */}
        <text x={PAD} y={H + 16} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {fmtDate(eintraege[0].datum)}
        </text>
        <text x={PAD + plotW} y={H + 16} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {fmtDate(eintraege[eintraege.length - 1].datum)}
        </text>
      </svg>
    </div>
  );
});

// ─── StatCard ────────────────────────────────────────────────────────────────

const StatCard = React.memo(function StatCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color ?? "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
});

// ─── VitalCard ───────────────────────────────────────────────────────────────

const VitalCard = React.memo(function VitalCard({
  vital,
  onDelete,
}: {
  vital: VitalEintrag;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasRr = vital.rr_systolisch !== null && vital.rr_diastolisch !== null;
  const rrSt = hasRr ? rrStatus(vital.rr_systolisch!, vital.rr_diastolisch!) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">
              {hasRr && `${vital.rr_systolisch}/${vital.rr_diastolisch} mmHg`}
              {vital.puls !== null && ` · ${vital.puls} bpm`}
              {vital.temperatur_c !== null && ` · ${vital.temperatur_c}°C`}
              {vital.spo2_prozent !== null && ` · SpO₂ ${vital.spo2_prozent}%`}
            </p>
            <p className="text-xs text-gray-400">
              {fmtDate(vital.datum)}
              {vital.uhrzeit && ` · ${vital.uhrzeit.slice(0, 5)}`}
              {rrSt && ` · ${rrSt}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {hasRr && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Blutdruck</p>
                <p className="font-semibold">
                  {vital.rr_systolisch}/{vital.rr_diastolisch} mmHg
                </p>
                {vital.rhythmus && (
                  <p className="text-xs text-gray-400">{vital.rhythmus}</p>
                )}
              </div>
            )}
            {vital.puls !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Puls</p>
                <p className="font-semibold">{vital.puls} bpm</p>
              </div>
            )}
            {vital.temperatur_c !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Temperatur</p>
                <p className="font-semibold">{vital.temperatur_c}°C</p>
                {vital.temperatur_ort && (
                  <p className="text-xs text-gray-400">{vital.temperatur_ort}</p>
                )}
              </div>
            )}
            {vital.spo2_prozent !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">SpO₂</p>
                <p className={`font-semibold ${vital.spo2_prozent < 92 ? "text-red-600" : ""}`}>
                  {vital.spo2_prozent}%
                </p>
                {vital.o2_lmin !== null && (
                  <p className="text-xs text-gray-400">{vital.o2_lmin} L/min</p>
                )}
              </div>
            )}
            {vital.bz_mmol !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Blutzucker</p>
                <p className="font-semibold">{vital.bz_mmol} mmol/L</p>
                {vital.bz_zeitpunkt && (
                  <p className="text-xs text-gray-400">{vital.bz_zeitpunkt}</p>
                )}
              </div>
            )}
            {vital.atemfrequenz !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Atemfrequenz</p>
                <p className="font-semibold">{vital.atemfrequenz}/min</p>
              </div>
            )}
            {vital.nrs_wert !== null && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">NRS (Schmerz)</p>
                <p className="font-semibold">{vital.nrs_wert}/10</p>
              </div>
            )}
          </div>
          {vital.notizen && (
            <p className="mt-2 text-sm text-gray-500 italic">{vital.notizen}</p>
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                if (!confirm("Vitalzeichen löschen?")) return;
                onDelete(vital.id);
              }}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── GewichtCard ─────────────────────────────────────────────────────────────

const GewichtCard = React.memo(function GewichtCard({
  eintrag,
  onDelete,
}: {
  eintrag: GewichtEintrag;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center gap-3">
        <Scale className="h-5 w-5 text-blue-400" />
        <div>
          <p className="font-semibold text-sm text-gray-900">{eintrag.gewicht_kg} kg</p>
          <p className="text-xs text-gray-400">
            {fmtDate(eintrag.datum)}
            {eintrag.uhrzeit && ` · ${eintrag.uhrzeit.slice(0, 5)}`}
            {eintrag.gemessen_unter && eintrag.gemessen_unter !== "normal" && (
              <> · {eintrag.gemessen_unter}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {eintrag.bmi !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-400">BMI</p>
            <p className={`text-sm font-semibold ${bmiKategorie(eintrag.bmi).color}`}>
              {eintrag.bmi}
            </p>
          </div>
        )}
        <button
          onClick={() => {
            if (!confirm("Messung löschen?")) return;
            onDelete(eintrag.id);
          }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GewichtClient({
  bewohnerId,
  bewohnerName,
  initialGewichtEintraege,
  initialVitalEintraege,
  initialNormwerte,
  initialStats,
}: Props) {
  const [tab, setTab] = useState<"gewicht" | "vital" | "normwerte">("gewicht");
  const [showGewichtForm, setShowGewichtForm] = useState(false);
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [gewichtEintraege, setGewichtEintraege] =
    useState<GewichtEintrag[]>(initialGewichtEintraege);
  const [vitalEintraege, setVitalEintraege] =
    useState<VitalEintrag[]>(initialVitalEintraege);
  const [normwerte, setNormwerte] = useState<Normwerte | null>(initialNormwerte);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─ Gewicht form
  const defaultGw = {
    datum: new Date().toISOString().split("T")[0],
    uhrzeit: "",
    gewicht_kg: "" as string | number,
    gemessen_unter: "normal",
    notizen: "",
    groesse_cm: "" as string | number, // for BMI calc — not stored in gewicht table
  };
  const [gwForm, setGwForm] = useState({ ...defaultGw });

  // ─ Vital form
  const defaultVital = {
    datum: new Date().toISOString().split("T")[0],
    uhrzeit: new Date().toTimeString().slice(0, 5),
    rr_systolisch: "" as string | number,
    rr_diastolisch: "" as string | number,
    puls: "" as string | number,
    rhythmus: "",
    temperatur_c: "" as string | number,
    temperatur_ort: "",
    spo2_prozent: "" as string | number,
    o2_lmin: "" as string | number,
    bz_mmol: "" as string | number,
    bz_zeitpunkt: "",
    atemfrequenz: "" as string | number,
    nrs_wert: "" as string | number,
    notizen: "",
  };
  const [vitalForm, setVitalForm] = useState({ ...defaultVital });

  // ─ Normwerte form
  const defaultNorm = {
    zielgewicht_kg: normwerte?.zielgewicht_kg?.toString() ?? "",
    groesse_cm: normwerte?.groesse_cm?.toString() ?? "",
    rr_ziel_sys_min: normwerte?.rr_ziel_sys_min?.toString() ?? "",
    rr_ziel_sys_max: normwerte?.rr_ziel_sys_max?.toString() ?? "",
    rr_ziel_dia_min: normwerte?.rr_ziel_dia_min?.toString() ?? "",
    rr_ziel_dia_max: normwerte?.rr_ziel_dia_max?.toString() ?? "",
    bz_ziel_min: normwerte?.bz_ziel_min?.toString() ?? "",
    bz_ziel_max: normwerte?.bz_ziel_max?.toString() ?? "",
    spo2_ziel_min: normwerte?.spo2_ziel_min?.toString() ?? "",
    notizen: normwerte?.notizen ?? "",
  };
  const [normForm, setNormForm] = useState({ ...defaultNorm });

  // ─ Handlers

  const handleDeleteGewicht = (id: string) => {
    startTransition(async () => {
      await fetch(
        `/api/bewohner/${bewohnerId}/gewicht?tabelle=gewicht&eintrag_id=${id}`,
        { method: "DELETE" }
      );
      setGewichtEintraege((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const handleDeleteVital = (id: string) => {
    startTransition(async () => {
      await fetch(
        `/api/bewohner/${bewohnerId}/gewicht?tabelle=vital&eintrag_id=${id}`,
        { method: "DELETE" }
      );
      setVitalEintraege((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const stats = useMemo<Stats>(() => {
    const gewichte = gewichtEintraege.map((e) => e.gewicht_kg);
    const aktuell = gewichte.length > 0 ? gewichte[gewichte.length - 1] : null;
    const erstes = gewichte.length > 0 ? gewichte[0] : null;
    return {
      aktuellesGewicht: aktuell,
      gewichtDelta:
        aktuell !== null && erstes !== null
          ? Math.round((aktuell - erstes) * 10) / 10
          : null,
      anzahlMessungen: gewichte.length,
      letzteMessung: gewichtEintraege.length > 0 ? gewichtEintraege[gewichtEintraege.length - 1].datum : null,
      letzteVital: vitalEintraege.length > 0 ? vitalEintraege[0] : null,
    };
  }, [gewichtEintraege, vitalEintraege]);

  const handleSubmitGewicht = () => {
    setError(null);
    if (!gwForm.gewicht_kg) { setError("Gewicht ist erforderlich"); return; }
    startTransition(async () => {
      const body: Record<string, unknown> = {
        datum: gwForm.datum,
        uhrzeit: gwForm.uhrzeit || null,
        gewicht_kg: Number(gwForm.gewicht_kg),
        gemessen_unter: gwForm.gemessen_unter,
        notizen: gwForm.notizen || null,
      };
      // Pass groesse for BMI
      if (gwForm.groesse_cm) body.groesse_cm = Number(gwForm.groesse_cm);
      else if (normwerte?.groesse_cm) body.groesse_cm = normwerte.groesse_cm;

      const res = await fetch(`/api/bewohner/${bewohnerId}/gewicht`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Fehler"); return; }
      const neuer = json.eintrag as GewichtEintrag;
      setGewichtEintraege((prev) =>
        [...prev, neuer].sort((a, b) => a.datum.localeCompare(b.datum))
      );
      setGwForm({ ...defaultGw });
      setShowGewichtForm(false);
      setSuccess("Gewicht gespeichert");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const handleSubmitVital = () => {
    setError(null);
    startTransition(async () => {
      const n = (v: string | number) => (v !== "" ? Number(v) : null);
      const body = {
        type: "vital",
        datum: vitalForm.datum,
        uhrzeit: vitalForm.uhrzeit || null,
        rr_systolisch: n(vitalForm.rr_systolisch),
        rr_diastolisch: n(vitalForm.rr_diastolisch),
        puls: n(vitalForm.puls),
        rhythmus: vitalForm.rhythmus || null,
        temperatur_c: n(vitalForm.temperatur_c),
        temperatur_ort: vitalForm.temperatur_ort || null,
        spo2_prozent: n(vitalForm.spo2_prozent),
        o2_lmin: n(vitalForm.o2_lmin),
        bz_mmol: n(vitalForm.bz_mmol),
        bz_zeitpunkt: vitalForm.bz_zeitpunkt || null,
        atemfrequenz: n(vitalForm.atemfrequenz),
        nrs_wert: n(vitalForm.nrs_wert),
        notizen: vitalForm.notizen || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/gewicht`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Fehler"); return; }
      const neuer = json.eintrag as VitalEintrag;
      setVitalEintraege((prev) => [neuer, ...prev]);
      setVitalForm({ ...defaultVital });
      setShowVitalForm(false);
      setSuccess("Vitalwerte gespeichert");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const handleSubmitNormwerte = () => {
    setError(null);
    startTransition(async () => {
      const n = (v: string) => (v !== "" ? Number(v) : null);
      const body = {
        type: "normwerte",
        zielgewicht_kg: n(normForm.zielgewicht_kg),
        groesse_cm: n(normForm.groesse_cm),
        rr_ziel_sys_min: n(normForm.rr_ziel_sys_min),
        rr_ziel_sys_max: n(normForm.rr_ziel_sys_max),
        rr_ziel_dia_min: n(normForm.rr_ziel_dia_min),
        rr_ziel_dia_max: n(normForm.rr_ziel_dia_max),
        bz_ziel_min: n(normForm.bz_ziel_min),
        bz_ziel_max: n(normForm.bz_ziel_max),
        spo2_ziel_min: n(normForm.spo2_ziel_min),
        notizen: normForm.notizen || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/gewicht`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Fehler"); return; }
      setNormwerte(json.normwerte as Normwerte);
      setSuccess("Normwerte gespeichert");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const aktuellBmi =
    stats.aktuellesGewicht !== null && normwerte?.groesse_cm
      ? Math.round(
          (stats.aktuellesGewicht /
            ((normwerte.groesse_cm / 100) * (normwerte.groesse_cm / 100))) *
            10
        ) / 10
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gewicht & Vitalwerte</h1>
          <p className="text-sm text-gray-500">{bewohnerName} · letzte 180 Tage</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.gewichtDelta !== null && (
            <span
              className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
                stats.gewichtDelta > 0
                  ? "bg-yellow-50 text-yellow-700"
                  : stats.gewichtDelta < 0
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {stats.gewichtDelta > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : stats.gewichtDelta < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              {stats.gewichtDelta > 0 ? "+" : ""}
              {stats.gewichtDelta} kg
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Aktuelles Gewicht"
          value={stats.aktuellesGewicht !== null ? `${stats.aktuellesGewicht} kg` : "–"}
          sub={stats.letzteMessung ? fmtDate(stats.letzteMessung) : "Keine Messung"}
          icon={Scale}
          color="bg-blue-50 border-blue-200"
        />
        <StatCard
          label="BMI"
          value={aktuellBmi !== null ? aktuellBmi : "–"}
          sub={aktuellBmi !== null ? bmiKategorie(aktuellBmi).label : undefined}
          icon={Activity}
        />
        <StatCard
          label="Letzter RR"
          value={
            stats.letzteVital?.rr_systolisch && stats.letzteVital?.rr_diastolisch
              ? `${stats.letzteVital.rr_systolisch}/${stats.letzteVital.rr_diastolisch}`
              : "–"
          }
          sub={
            stats.letzteVital?.rr_systolisch && stats.letzteVital?.rr_diastolisch
              ? rrStatus(stats.letzteVital.rr_systolisch, stats.letzteVital.rr_diastolisch)
              : undefined
          }
          icon={Heart}
        />
        <StatCard
          label="SpO₂ / Puls"
          value={
            stats.letzteVital?.spo2_prozent
              ? `${stats.letzteVital.spo2_prozent}%`
              : stats.letzteVital?.puls
              ? `${stats.letzteVital.puls} bpm`
              : "–"
          }
          sub={
            stats.letzteVital?.spo2_prozent && stats.letzteVital?.puls
              ? `Puls: ${stats.letzteVital.puls} bpm`
              : undefined
          }
          icon={Droplets}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(
            [
              { key: "gewicht", label: "Gewichtsverlauf", icon: Scale },
              { key: "vital", label: "Vitalwerte", icon: Heart },
              { key: "normwerte", label: "Zielwerte", icon: Settings },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab: Gewicht ─── */}
      {tab === "gewicht" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowGewichtForm((v) => !v)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Messung erfassen
            </button>
          </div>

          {showGewichtForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Neue Gewichtsmessung</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={gwForm.datum}
                    onChange={(e) => setGwForm((f) => ({ ...f, datum: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    value={gwForm.uhrzeit}
                    onChange={(e) => setGwForm((f) => ({ ...f, uhrzeit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gewicht (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={gwForm.gewicht_kg}
                    onChange={(e) => setGwForm((f) => ({ ...f, gewicht_kg: e.target.value }))}
                    placeholder="z.B. 72.5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                {!normwerte?.groesse_cm && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Größe (cm) für BMI
                    </label>
                    <input
                      type="number"
                      value={gwForm.groesse_cm}
                      onChange={(e) =>
                        setGwForm((f) => ({ ...f, groesse_cm: e.target.value }))
                      }
                      placeholder="z.B. 168"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gemessen unter
                  </label>
                  <select
                    value={gwForm.gemessen_unter}
                    onChange={(e) =>
                      setGwForm((f) => ({ ...f, gemessen_unter: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="nüchtern">Nüchtern</option>
                    <option value="nach_mahlzeit">Nach Mahlzeit</option>
                    <option value="mit_hilfsmittel">Mit Hilfsmittel</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <input
                  type="text"
                  value={gwForm.notizen}
                  onChange={(e) => setGwForm((f) => ({ ...f, notizen: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitGewicht}
                  disabled={isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {isPending ? "Speichern…" : "Speichern"}
                </button>
                <button
                  onClick={() => { setGwForm({ ...defaultGw }); setShowGewichtForm(false); }}
                  className="px-4 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {gewichtEintraege.length >= 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Verlauf (180 Tage)</h3>
              <GewichtKurve
                eintraege={gewichtEintraege}
                zielgewicht={normwerte?.zielgewicht_kg ?? null}
              />
              {normwerte?.zielgewicht_kg && (
                <p className="text-xs text-green-600 mt-1">
                  ── Zielgewicht: {normwerte.zielgewicht_kg} kg
                </p>
              )}
            </div>
          )}

          {gewichtEintraege.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Gewichtsmessungen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...gewichtEintraege]
                .sort((a, b) => b.datum.localeCompare(a.datum))
                .map((e) => (
                  <GewichtCard key={e.id} eintrag={e} onDelete={handleDeleteGewicht} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Vitalwerte ─── */}
      {tab === "vital" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowVitalForm((v) => !v)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              Vitalzeichen erfassen
            </button>
          </div>

          {showVitalForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Vitalzeichen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={vitalForm.datum}
                    onChange={(e) => setVitalForm((f) => ({ ...f, datum: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    value={vitalForm.uhrzeit}
                    onChange={(e) => setVitalForm((f) => ({ ...f, uhrzeit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Blutdruck */}
              <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Heart className="h-3 w-3" /> Blutdruck & Puls
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Systolisch (mmHg)</label>
                    <input
                      type="number"
                      value={vitalForm.rr_systolisch}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, rr_systolisch: e.target.value }))
                      }
                      placeholder="120"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Diastolisch (mmHg)</label>
                    <input
                      type="number"
                      value={vitalForm.rr_diastolisch}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, rr_diastolisch: e.target.value }))
                      }
                      placeholder="80"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Puls (bpm)</label>
                    <input
                      type="number"
                      value={vitalForm.puls}
                      onChange={(e) => setVitalForm((f) => ({ ...f, puls: e.target.value }))}
                      placeholder="72"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rhythmus</label>
                  <select
                    value={vitalForm.rhythmus}
                    onChange={(e) => setVitalForm((f) => ({ ...f, rhythmus: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">–</option>
                    <option value="regelmäßig">Regelmäßig</option>
                    <option value="unregelmäßig">Unregelmäßig</option>
                    <option value="nicht_beurteilbar">Nicht beurteilbar</option>
                  </select>
                </div>
              </div>

              {/* Temperatur */}
              <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="h-3 w-3" /> Temperatur & SpO₂
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Temperatur (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitalForm.temperatur_c}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, temperatur_c: e.target.value }))
                      }
                      placeholder="36.8"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Messstelle</label>
                    <select
                      value={vitalForm.temperatur_ort}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, temperatur_ort: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">–</option>
                      <option value="axillär">Axillär</option>
                      <option value="oral">Oral</option>
                      <option value="rektal">Rektal</option>
                      <option value="Ohr">Ohr</option>
                      <option value="Stirn">Stirn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SpO₂ (%)</label>
                    <input
                      type="number"
                      value={vitalForm.spo2_prozent}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, spo2_prozent: e.target.value }))
                      }
                      placeholder="98"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">O₂-Zufuhr (L/min)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={vitalForm.o2_lmin}
                      onChange={(e) =>
                        setVitalForm((f) => ({ ...f, o2_lmin: e.target.value }))
                      }
                      placeholder="2.0"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Blutzucker + Atemfrequenz */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blutzucker (mmol/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalForm.bz_mmol}
                    onChange={(e) => setVitalForm((f) => ({ ...f, bz_mmol: e.target.value }))}
                    placeholder="5.5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BZ-Zeitpunkt</label>
                  <select
                    value={vitalForm.bz_zeitpunkt}
                    onChange={(e) =>
                      setVitalForm((f) => ({ ...f, bz_zeitpunkt: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">–</option>
                    <option value="nüchtern">Nüchtern</option>
                    <option value="postprandial">Postprandial</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Atemfrequenz (/min)
                  </label>
                  <input
                    type="number"
                    value={vitalForm.atemfrequenz}
                    onChange={(e) =>
                      setVitalForm((f) => ({ ...f, atemfrequenz: e.target.value }))
                    }
                    placeholder="16"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NRS (Schmerz)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={vitalForm.nrs_wert}
                    onChange={(e) =>
                      setVitalForm((f) => ({ ...f, nrs_wert: e.target.value }))
                    }
                    placeholder="0–10"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                <textarea
                  value={vitalForm.notizen}
                  onChange={(e) => setVitalForm((f) => ({ ...f, notizen: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitVital}
                  disabled={isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50"
                >
                  {isPending ? "Speichern…" : "Vitalwerte speichern"}
                </button>
                <button
                  onClick={() => { setVitalForm({ ...defaultVital }); setShowVitalForm(false); }}
                  className="px-4 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {vitalEintraege.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Heart className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Vitalzeichen erfasst</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vitalEintraege.map((v) => (
                <VitalCard key={v.id} vital={v} onDelete={handleDeleteVital} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Normwerte / Zielwerte ─── */}
      {tab === "normwerte" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Individuelle Zielwerte</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Größe (cm)</label>
              <input
                type="number"
                value={normForm.groesse_cm}
                onChange={(e) => setNormForm((f) => ({ ...f, groesse_cm: e.target.value }))}
                placeholder="168"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zielgewicht (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={normForm.zielgewicht_kg}
                onChange={(e) => setNormForm((f) => ({ ...f, zielgewicht_kg: e.target.value }))}
                placeholder="70.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Blutdruck-Zielbereich</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Systolisch Min</label>
                <input
                  type="number"
                  value={normForm.rr_ziel_sys_min}
                  onChange={(e) =>
                    setNormForm((f) => ({ ...f, rr_ziel_sys_min: e.target.value }))
                  }
                  placeholder="110"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Systolisch Max</label>
                <input
                  type="number"
                  value={normForm.rr_ziel_sys_max}
                  onChange={(e) =>
                    setNormForm((f) => ({ ...f, rr_ziel_sys_max: e.target.value }))
                  }
                  placeholder="140"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Diastolisch Min</label>
                <input
                  type="number"
                  value={normForm.rr_ziel_dia_min}
                  onChange={(e) =>
                    setNormForm((f) => ({ ...f, rr_ziel_dia_min: e.target.value }))
                  }
                  placeholder="60"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Diastolisch Max</label>
                <input
                  type="number"
                  value={normForm.rr_ziel_dia_max}
                  onChange={(e) =>
                    setNormForm((f) => ({ ...f, rr_ziel_dia_max: e.target.value }))
                  }
                  placeholder="90"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BZ min (mmol/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={normForm.bz_ziel_min}
                onChange={(e) => setNormForm((f) => ({ ...f, bz_ziel_min: e.target.value }))}
                placeholder="4.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BZ max (mmol/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={normForm.bz_ziel_max}
                onChange={(e) => setNormForm((f) => ({ ...f, bz_ziel_max: e.target.value }))}
                placeholder="8.0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SpO₂ min (%)
              </label>
              <input
                type="number"
                value={normForm.spo2_ziel_min}
                onChange={(e) =>
                  setNormForm((f) => ({ ...f, spo2_ziel_min: e.target.value }))
                }
                placeholder="92"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={normForm.notizen}
              onChange={(e) => setNormForm((f) => ({ ...f, notizen: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Besonderheiten, ärztliche Vorgaben..."
            />
          </div>

          <button
            onClick={handleSubmitNormwerte}
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
          >
            {isPending ? "Speichern…" : "Zielwerte speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
