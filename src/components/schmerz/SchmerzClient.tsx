"use client";

import { useState, useTransition, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Pill,
  ClipboardList,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SchmerzEintrag {
  id: string;
  bewohner_id: string;
  datum: string;
  uhrzeit: string | null;
  nrs_wert: number;
  lokalisation: string | null;
  schmerzart: string | null;
  charakter: string | null;
  ausstrahlung: string | null;
  beeintraechtigung: string | null;
  massnahmen: string | null;
  wirksamkeit: number | null;
  medikament_gegeben: boolean;
  medikament_name: string | null;
  medikament_dosis: string | null;
  arzt_informiert: boolean;
  notizen: string | null;
  erstellt_am: string;
}

interface SchmerzAssessment {
  id: string;
  datum: string;
  assessment_typ: string;
  gesamtwert: number | null;
  zielwert_nrs: number | null;
  schmerz_diagnose: string | null;
  behandlungsplan: string | null;
  naechste_bewertung: string | null;
}

interface Stats {
  gesamt: number;
  avgNrs: number | null;
  maxNrs: number | null;
  hochschmerzEintraege: number;
  mitMedikament: number;
  letzterEintrag: string | null;
  zielwertNrs: number | null;
}

interface Props {
  bewohnerId: string;
  bewohnerName: string;
  initialEintraege: SchmerzEintrag[];
  initialAssessment: SchmerzAssessment | null;
  initialStats: Stats;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function nrsColor(v: number): string {
  if (v <= 3) return "bg-green-500";
  if (v <= 6) return "bg-yellow-500";
  return "bg-red-500";
}

function nrsBg(v: number): string {
  if (v <= 3) return "bg-green-50 text-green-800 border-green-200";
  if (v <= 6) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-red-50 text-red-800 border-red-200";
}

function nrsLabel(v: number): string {
  if (v === 0) return "Kein Schmerz";
  if (v <= 3) return "Leicht";
  if (v <= 6) return "Mäßig";
  if (v <= 9) return "Stark";
  return "Stärkster Schmerz";
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const SCHMERZART_LABELS: Record<string, string> = {
  brennend: "Brennend",
  stechend: "Stechend",
  dumpf: "Dumpf",
  ziehend: "Ziehend",
  klopfend: "Klopfend",
  krampfartig: "Krampfartig",
  sonstig: "Sonstig",
};

// ─── NRS Scale Visual ────────────────────────────────────────────────────────

function NrsScale({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i)}
            className={`flex-1 h-10 rounded text-sm font-bold transition-all border-2
              ${
                value === i
                  ? `${nrsColor(i)} text-white border-transparent scale-110 shadow-md`
                  : `bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200`
              }
              ${readonly ? "cursor-default" : "cursor-pointer"}`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Kein Schmerz</span>
        <span>Stärkster vorstellbarer Schmerz</span>
      </div>
    </div>
  );
}

// ─── SVG Verlaufsgraph ───────────────────────────────────────────────────────

function SchmerzVerlauf({
  eintraege,
  zielwert,
}: {
  eintraege: SchmerzEintrag[];
  zielwert: number | null;
}) {
  const sorted = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum));
  if (sorted.length < 2) return null;

  const W = 600,
    H = 200,
    PAD = 40;
  const plotW = W - PAD * 2,
    plotH = H - PAD * 2;

  const minDate = new Date(sorted[0].datum).getTime();
  const maxDate = new Date(sorted[sorted.length - 1].datum).getTime();
  const dateRange = maxDate - minDate || 1;

  const x = (d: string) =>
    PAD + ((new Date(d).getTime() - minDate) / dateRange) * plotW;
  const y = (v: number) => PAD + (1 - v / 10) * plotH;

  const polyline = sorted.map((e) => `${x(e.datum)},${y(e.nrs_wert)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-full"
        style={{ minWidth: 300 }}
      >
        {/* Color bands */}
        <rect
          x={PAD}
          y={PAD}
          width={plotW}
          height={(plotH * 3) / 10}
          fill="#fee2e2"
          opacity="0.4"
        />
        <rect
          x={PAD}
          y={PAD + (plotH * 3) / 10}
          width={plotW}
          height={(plotH * 4) / 10}
          fill="#fef9c3"
          opacity="0.4"
        />
        <rect
          x={PAD}
          y={PAD + (plotH * 7) / 10}
          width={plotW}
          height={(plotH * 3) / 10}
          fill="#dcfce7"
          opacity="0.4"
        />

        {/* Grid Y */}
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <g key={v}>
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

        {/* Zielwert */}
        {zielwert !== null && (
          <line
            x1={PAD}
            x2={PAD + plotW}
            y1={y(zielwert)}
            y2={y(zielwert)}
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {sorted.map((e, i) => (
          <circle
            key={i}
            cx={x(e.datum)}
            cy={y(e.nrs_wert)}
            r="4"
            fill={e.nrs_wert >= 7 ? "#ef4444" : e.nrs_wert >= 4 ? "#f59e0b" : "#22c55e"}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* X Labels */}
        <text
          x={PAD}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#9ca3af"
        >
          {fmtDate(sorted[0].datum)}
        </text>
        <text
          x={PAD + plotW}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#9ca3af"
        >
          {fmtDate(sorted[sorted.length - 1].datum)}
        </text>
      </svg>
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color ?? "bg-white border-gray-200"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── EintragCard ────────────────────────────────────────────────────────────

function EintragCard({
  eintrag,
  onDelete,
}: {
  eintrag: SchmerzEintrag;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border ${nrsBg(eintrag.nrs_wert)} overflow-hidden`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${nrsColor(eintrag.nrs_wert)}`}
          >
            {eintrag.nrs_wert}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {nrsLabel(eintrag.nrs_wert)}
              {eintrag.schmerzart && (
                <span className="font-normal">
                  {" "}– {SCHMERZART_LABELS[eintrag.schmerzart] ?? eintrag.schmerzart}
                </span>
              )}
            </p>
            <p className="text-xs opacity-70">
              {fmtDate(eintrag.datum)}
              {eintrag.uhrzeit && ` · ${eintrag.uhrzeit.slice(0, 5)}`}
              {eintrag.lokalisation && ` · ${eintrag.lokalisation}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {eintrag.medikament_gegeben && <Pill className="h-4 w-4 opacity-60" />}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-current border-opacity-20 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {eintrag.charakter && (
              <div>
                <span className="font-medium">Charakter:</span> {eintrag.charakter}
              </div>
            )}
            {eintrag.ausstrahlung && (
              <div>
                <span className="font-medium">Ausstrahlung:</span> {eintrag.ausstrahlung}
              </div>
            )}
            {eintrag.beeintraechtigung && (
              <div className="col-span-2">
                <span className="font-medium">Beeinträchtigung:</span>{" "}
                {eintrag.beeintraechtigung}
              </div>
            )}
            {eintrag.massnahmen && (
              <div className="col-span-2">
                <span className="font-medium">Maßnahmen:</span> {eintrag.massnahmen}
              </div>
            )}
            {eintrag.wirksamkeit !== null && (
              <div>
                <span className="font-medium">Wirksamkeit:</span> NRS {eintrag.wirksamkeit}{" "}
                nach Maßnahme
              </div>
            )}
            {eintrag.medikament_gegeben && (
              <div className="col-span-2 flex items-center gap-1">
                <Pill className="h-4 w-4" />
                <span className="font-medium">Medikament:</span> {eintrag.medikament_name}{" "}
                {eintrag.medikament_dosis && `(${eintrag.medikament_dosis})`}
              </div>
            )}
            {eintrag.arzt_informiert && (
              <div className="col-span-2 text-blue-700 font-medium">✓ Arzt informiert</div>
            )}
            {eintrag.notizen && (
              <div className="col-span-2 italic opacity-70">{eintrag.notizen}</div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!confirm("Eintrag löschen?")) return;
                onDelete(eintrag.id);
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
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SchmerzClient({
  bewohnerId,
  bewohnerName,
  initialEintraege,
  initialAssessment,
  initialStats,
}: Props) {
  const [tab, setTab] = useState<"verlauf" | "neu" | "assessment">("verlauf");
  const [eintraege, setEintraege] = useState<SchmerzEintrag[]>(initialEintraege);
  const [assessment, setAssessment] = useState<SchmerzAssessment | null>(initialAssessment);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultForm = {
    datum: new Date().toISOString().split("T")[0],
    uhrzeit: new Date().toTimeString().slice(0, 5),
    nrs_wert: 0,
    lokalisation: "",
    schmerzart: "",
    charakter: "",
    ausstrahlung: "",
    beeintraechtigung: "",
    massnahmen: "",
    wirksamkeit: "" as string | number,
    medikament_gegeben: false,
    medikament_name: "",
    medikament_dosis: "",
    arzt_informiert: false,
    notizen: "",
  };
  const [form, setForm] = useState({ ...defaultForm });

  const defaultAss = {
    datum: new Date().toISOString().split("T")[0],
    zielwert_nrs: "" as string | number,
    schmerz_diagnose: "",
    behandlungsplan: "",
    naechste_bewertung: "",
  };
  const [assForm, setAssForm] = useState({ ...defaultAss });

  const trend = useMemo(() => {
    if (eintraege.length < 3) return null;
    const sorted = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum));
    const recent3 = sorted.slice(-3).map((e) => e.nrs_wert);
    const avg3 = recent3.reduce((a, b) => a + b, 0) / 3;
    const prev3 = sorted.slice(-6, -3);
    if (prev3.length < 2) return null;
    const avgPrev = prev3.reduce((a, b) => a + b.nrs_wert, 0) / prev3.length;
    if (avg3 < avgPrev - 0.5) return "besser";
    if (avg3 > avgPrev + 0.5) return "schlechter";
    return "stabil";
  }, [eintraege]);

  const recalcStats = (list: SchmerzEintrag[]) => {
    const nrs = list.map((e) => e.nrs_wert);
    setStats((s) => ({
      ...s,
      gesamt: list.length,
      avgNrs:
        nrs.length
          ? Math.round((nrs.reduce((a, b) => a + b, 0) / nrs.length) * 10) / 10
          : null,
      maxNrs: nrs.length ? Math.max(...nrs) : null,
      hochschmerzEintraege: list.filter((e) => e.nrs_wert >= 7).length,
      mitMedikament: list.filter((e) => e.medikament_gegeben).length,
      letzterEintrag: list.length > 0 ? list[0].datum : null,
    }));
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/bewohner/${bewohnerId}/schmerz?eintrag_id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Löschen fehlgeschlagen");
        return;
      }
      setEintraege((prev) => {
        const neu = prev.filter((e) => e.id !== id);
        recalcStats(neu);
        return neu;
      });
    });
  };

  const handleSubmitEintrag = () => {
    setError(null);
    startTransition(async () => {
      const body = {
        ...form,
        nrs_wert: Number(form.nrs_wert),
        wirksamkeit: form.wirksamkeit !== "" ? Number(form.wirksamkeit) : null,
        schmerzart: form.schmerzart || null,
        uhrzeit: form.uhrzeit || null,
        lokalisation: form.lokalisation || null,
        charakter: form.charakter || null,
        ausstrahlung: form.ausstrahlung || null,
        beeintraechtigung: form.beeintraechtigung || null,
        massnahmen: form.massnahmen || null,
        medikament_name: form.medikament_name || null,
        medikament_dosis: form.medikament_dosis || null,
        notizen: form.notizen || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/schmerz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      const neuer = json.eintrag as SchmerzEintrag;
      setEintraege((prev) => {
        const neu = [neuer, ...prev];
        recalcStats(neu);
        return neu;
      });
      setForm({ ...defaultForm });
      setSuccess("Schmerz-Eintrag gespeichert");
      setTab("verlauf");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  const handleSubmitAssessment = () => {
    setError(null);
    startTransition(async () => {
      const body = {
        type: "assessment",
        ...assForm,
        zielwert_nrs: assForm.zielwert_nrs !== "" ? Number(assForm.zielwert_nrs) : null,
        naechste_bewertung: assForm.naechste_bewertung || null,
        schmerz_diagnose: assForm.schmerz_diagnose || null,
        behandlungsplan: assForm.behandlungsplan || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/schmerz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Fehler");
        return;
      }
      setAssessment(json.assessment as SchmerzAssessment);
      if (json.assessment?.zielwert_nrs !== undefined) {
        setStats((s) => ({ ...s, zielwertNrs: json.assessment.zielwert_nrs }));
      }
      setAssForm({ ...defaultAss });
      setSuccess("Assessment gespeichert");
      setTab("verlauf");
      setTimeout(() => setSuccess(null), 3000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schmerzprotokoll</h1>
          <p className="text-sm text-gray-500">{bewohnerName} · letzte 90 Tage</p>
        </div>
        <div className="flex items-center gap-1">
          {trend === "besser" && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full">
              <TrendingDown className="h-4 w-4" />
              Verbessert
            </span>
          )}
          {trend === "schlechter" && (
            <span className="flex items-center gap-1 text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded-full">
              <TrendingUp className="h-4 w-4" />
              Verschlechtert
            </span>
          )}
          {trend === "stabil" && (
            <span className="flex items-center gap-1 text-gray-600 text-sm font-medium bg-gray-50 px-3 py-1 rounded-full">
              <Minus className="h-4 w-4" />
              Stabil
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Einträge (90 Tage)"
          value={stats.gesamt}
          sub={stats.letzterEintrag ? `Zuletzt: ${fmtDate(stats.letzterEintrag)}` : "Noch keine"}
        />
        <StatCard
          label="Ø NRS-Wert"
          value={stats.avgNrs !== null ? stats.avgNrs : "–"}
          sub={stats.zielwertNrs !== null ? `Ziel: ≤ ${stats.zielwertNrs}` : undefined}
          color={
            stats.avgNrs !== null
              ? stats.avgNrs >= 7
                ? "bg-red-50 border-red-200"
                : stats.avgNrs >= 4
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
              : undefined
          }
        />
        <StatCard
          label="Max. NRS"
          value={stats.maxNrs !== null ? stats.maxNrs : "–"}
          sub="im Zeitraum"
        />
        <StatCard
          label="NRS ≥ 7"
          value={stats.hochschmerzEintraege}
          sub={`${stats.mitMedikament} mit Medikament`}
          color={stats.hochschmerzEintraege > 0 ? "bg-red-50 border-red-200" : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(
            [
              { key: "verlauf", label: "Verlauf & Einträge", icon: Activity },
              { key: "neu", label: "Neuer Eintrag", icon: Plus },
              { key: "assessment", label: "Assessment", icon: ClipboardList },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab: Verlauf ─── */}
      {tab === "verlauf" && (
        <div className="space-y-4">
          {eintraege.length >= 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">NRS-Verlauf</h2>
              <SchmerzVerlauf eintraege={eintraege} zielwert={stats.zielwertNrs} />
              {stats.zielwertNrs !== null && (
                <p className="text-xs text-indigo-600 mt-1">
                  ── Zielwert: NRS ≤ {stats.zielwertNrs}
                </p>
              )}
            </div>
          )}

          {assessment && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-indigo-800 mb-1">
                Aktuelles Assessment · {fmtDate(assessment.datum)}
              </p>
              {assessment.schmerz_diagnose && (
                <p className="text-indigo-700">
                  <span className="font-medium">Diagnose:</span> {assessment.schmerz_diagnose}
                </p>
              )}
              {assessment.behandlungsplan && (
                <p className="text-indigo-700">
                  <span className="font-medium">Behandlungsplan:</span>{" "}
                  {assessment.behandlungsplan}
                </p>
              )}
              {assessment.zielwert_nrs !== null && (
                <p className="text-indigo-700">
                  <span className="font-medium">Ziel-NRS:</span> ≤ {assessment.zielwert_nrs}
                </p>
              )}
              {assessment.naechste_bewertung && (
                <p className="text-indigo-500 text-xs mt-1">
                  Nächste Bewertung: {fmtDate(assessment.naechste_bewertung)}
                </p>
              )}
            </div>
          )}

          {eintraege.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Schmerz-Einträge im Zeitraum</p>
              <button
                onClick={() => setTab("neu")}
                className="mt-3 text-sm text-orange-600 hover:underline"
              >
                Ersten Eintrag erfassen →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {eintraege.map((e) => (
                <EintragCard key={e.id} eintrag={e} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Neuer Eintrag ─── */}
      {tab === "neu" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Schmerz erfassen</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={form.datum}
                onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
              <input
                type="time"
                value={form.uhrzeit}
                onChange={(e) => setForm((f) => ({ ...f, uhrzeit: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NRS-Schmerzwert:{" "}
              <span className="font-bold text-orange-600">{form.nrs_wert}</span> –{" "}
              {nrsLabel(form.nrs_wert)}
            </label>
            <NrsScale
              value={form.nrs_wert}
              onChange={(v) => setForm((f) => ({ ...f, nrs_wert: v }))}
            />
          </div>

          {form.nrs_wert > 0 && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${nrsBg(form.nrs_wert)}`}
            >
              Schmerzintensität: <strong>{nrsLabel(form.nrs_wert)}</strong>
              {form.nrs_wert >= 7 && " – Ärztliche Information empfohlen!"}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokalisation
              </label>
              <input
                type="text"
                value={form.lokalisation}
                onChange={(e) => setForm((f) => ({ ...f, lokalisation: e.target.value }))}
                placeholder="z.B. linke Schulter, Rücken"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schmerzart</label>
              <select
                value={form.schmerzart}
                onChange={(e) => setForm((f) => ({ ...f, schmerzart: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">– auswählen –</option>
                {Object.entries(SCHMERZART_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Charakter</label>
              <input
                type="text"
                value={form.charakter}
                onChange={(e) => setForm((f) => ({ ...f, charakter: e.target.value }))}
                placeholder="dauerhaft / wiederkehrend"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ausstrahlung</label>
              <input
                type="text"
                value={form.ausstrahlung}
                onChange={(e) => setForm((f) => ({ ...f, ausstrahlung: e.target.value }))}
                placeholder="z.B. in den Arm"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beeinträchtigung
            </label>
            <input
              type="text"
              value={form.beeintraechtigung}
              onChange={(e) => setForm((f) => ({ ...f, beeintraechtigung: e.target.value }))}
              placeholder="z.B. Schlaf, Mobilisation, Stimmung"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maßnahmen</label>
            <textarea
              value={form.massnahmen}
              onChange={(e) => setForm((f) => ({ ...f, massnahmen: e.target.value }))}
              placeholder="Durchgeführte Maßnahmen (Lagerung, Wärme, ...)"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wirksamkeit nach Maßnahme (NRS)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={form.wirksamkeit}
              onChange={(e) => setForm((f) => ({ ...f, wirksamkeit: e.target.value }))}
              placeholder="0–10"
              className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.medikament_gegeben}
                onChange={(e) =>
                  setForm((f) => ({ ...f, medikament_gegeben: e.target.checked }))
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Medikament verabreicht</span>
            </label>
            {form.medikament_gegeben && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Medikament</label>
                  <input
                    type="text"
                    value={form.medikament_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, medikament_name: e.target.value }))
                    }
                    placeholder="Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dosis</label>
                  <input
                    type="text"
                    value={form.medikament_dosis}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, medikament_dosis: e.target.value }))
                    }
                    placeholder="z.B. 500mg"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.arzt_informiert}
              onChange={(e) =>
                setForm((f) => ({ ...f, arzt_informiert: e.target.checked }))
              }
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Arzt informiert</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={form.notizen}
              onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmitEintrag}
            disabled={isPending}
            className="w-full bg-orange-600 text-white rounded-xl py-3 font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Speichern..." : "Eintrag speichern"}
          </button>
        </div>
      )}

      {/* Tab: Assessment */}
      {tab === "assessment" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-purple-600" />
            Schmerz-Assessment
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={assForm.datum}
                onChange={(e) => setAssForm((f) => ({ ...f, datum: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naechste Bewertung
              </label>
              <input
                type="date"
                value={assForm.naechste_bewertung}
                onChange={(e) =>
                  setAssForm((f) => ({ ...f, naechste_bewertung: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schmerzziel (NRS)
            </label>
            <NrsScale
              value={Number(assForm.zielwert_nrs) || 0}
              onChange={(v) => setAssForm((f) => ({ ...f, zielwert_nrs: v }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schmerzdiagnose
            </label>
            <input
              type="text"
              value={assForm.schmerz_diagnose}
              onChange={(e) =>
                setAssForm((f) => ({ ...f, schmerz_diagnose: e.target.value }))
              }
              placeholder="z.B. Neuropathischer Schmerz, Arthralgien"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Behandlungsplan
            </label>
            <textarea
              value={assForm.behandlungsplan}
              onChange={(e) =>
                setAssForm((f) => ({ ...f, behandlungsplan: e.target.value }))
              }
              rows={3}
              placeholder="Medikamentoese und nicht-medikamentoese Massnahmen..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmitAssessment}
            disabled={isPending}
            className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Speichern..." : "Assessment speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
