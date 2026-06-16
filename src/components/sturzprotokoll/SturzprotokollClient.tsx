"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Plus,
  ClipboardList,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  Phone,
  User,
  Calendar,
  Clock,
  MapPin,
  Trash2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Sturzprotokoll {
  id: string;
  datum: string;
  uhrzeit: string | null;
  ort: string;
  umstaende: string | null;
  verletzungen: string | null;
  schweregrad: "kein_schaden" | "leicht" | "mittel" | "schwer";
  massnahmen_sofort: string | null;
  arzt_informiert: boolean;
  arzt_name: string | null;
  angehoerige_informiert: boolean;
  nachbeobachtung: string | null;
  praevention_massnahmen: string | null;
  erstellt_am: string;
}

interface Risikoeinschaetzung {
  id: string;
  datum: string;
  sturzgeschichte: boolean;
  sekundaerdiagnose: boolean;
  gehhilfe: string;
  heparininfusion: boolean;
  gangbild: string;
  mentaler_status: string;
  gesamtpunkte: number;
  risikostufe: "niedrig" | "mittel" | "hoch";
  massnahmen: string[] | null;
}

interface Stats {
  gesamt: number;
  schwereSturzze: number;
  letzterSturz: string | null;
  risikostufe: string | null;
  risikoGesamtpunkte: number | null;
}

interface Props {
  bewohnerId: string;
  bewohnerName: string;
  initialProtokolle: Sturzprotokoll[];
  initialRisikoeinschaetzung: Risikoeinschaetzung | null;
  initialStats: Stats;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCHWEREGRAD_LABELS: Record<string, string> = {
  kein_schaden: "Kein Schaden",
  leicht: "Leicht",
  mittel: "Mittel",
  schwer: "Schwer",
};

const SCHWEREGRAD_COLORS: Record<string, string> = {
  kein_schaden: "bg-green-100 text-green-800",
  leicht: "bg-yellow-100 text-yellow-800",
  mittel: "bg-orange-100 text-orange-800",
  schwer: "bg-red-100 text-red-800",
};

const RISIKO_COLORS: Record<string, string> = {
  niedrig: "text-green-700 bg-green-50 border-green-200",
  mittel: "text-yellow-700 bg-yellow-50 border-yellow-200",
  hoch: "text-red-700 bg-red-50 border-red-200",
};

const RISIKO_LABELS: Record<string, string> = {
  niedrig: "Niedriges Risiko",
  mittel: "Mittleres Risiko",
  hoch: "Hohes Risiko",
};

function formatDatum(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── MFS-Punkte Berechnung ─────────────────────────────────────────────────────

function berechneMFSPunkte(form: {
  sturzgeschichte: boolean;
  sekundaerdiagnose: boolean;
  gehhilfe: string;
  heparininfusion: boolean;
  gangbild: string;
  mentaler_status: string;
}): { punkte: number; risikostufe: "niedrig" | "mittel" | "hoch" } {
  let punkte = 0;
  if (form.sturzgeschichte) punkte += 25;
  if (form.sekundaerdiagnose) punkte += 15;
  if (form.heparininfusion) punkte += 20;
  if (form.gehhilfe === "gehhilfe" || form.gehhilfe === "moebel") punkte += 15;
  if (form.gangbild === "schwaechlich") punkte += 10;
  if (form.gangbild === "beeintraechtigt") punkte += 20;
  if (form.mentaler_status === "vergesslich") punkte += 15;

  const risikostufe: "niedrig" | "mittel" | "hoch" =
    punkte < 25 ? "niedrig" : punkte < 50 ? "mittel" : "hoch";
  return { punkte, risikostufe };
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SturzCard({
  eintrag,
  onDelete,
}: {
  eintrag: Sturzprotokoll;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              {formatDatum(eintrag.datum)}
              {eintrag.uhrzeit ? ` · ${eintrag.uhrzeit.slice(0, 5)} Uhr` : ""}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                SCHWEREGRAD_COLORS[eintrag.schweregrad]
              }`}
            >
              {SCHWEREGRAD_LABELS[eintrag.schweregrad]}
            </span>
            {eintrag.arzt_informiert && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Arzt info.
              </span>
            )}
            {eintrag.angehoerige_informiert && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Angehörige info.
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{eintrag.ort}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {eintrag.umstaende && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Umstände
              </p>
              <p className="text-sm text-gray-800 mt-1">{eintrag.umstaende}</p>
            </div>
          )}
          {eintrag.verletzungen && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Verletzungen
              </p>
              <p className="text-sm text-gray-800 mt-1">{eintrag.verletzungen}</p>
            </div>
          )}
          {eintrag.massnahmen_sofort && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sofortmaßnahmen
              </p>
              <p className="text-sm text-gray-800 mt-1">{eintrag.massnahmen_sofort}</p>
            </div>
          )}
          {eintrag.arzt_informiert && eintrag.arzt_name && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>Arzt informiert: {eintrag.arzt_name}</span>
            </div>
          )}
          {eintrag.nachbeobachtung && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Nachbeobachtung
              </p>
              <p className="text-sm text-gray-800 mt-1">{eintrag.nachbeobachtung}</p>
            </div>
          )}
          {eintrag.praevention_massnahmen && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Präventionsmaßnahmen
              </p>
              <p className="text-sm text-gray-800 mt-1">{eintrag.praevention_massnahmen}</p>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onDelete(eintrag.id)}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SturzprotokollClient({
  bewohnerId,
  bewohnerName,
  initialProtokolle,
  initialRisikoeinschaetzung,
  initialStats,
}: Props) {
  const [tab, setTab] = useState<"protokoll" | "risiko">("protokoll");
  const [protokolle, setProtokolle] = useState<Sturzprotokoll[]>(initialProtokolle);
  const [risikoeinschaetzung, setRisikoeinschaetzung] =
    useState<Risikoeinschaetzung | null>(initialRisikoeinschaetzung);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [showRisikoForm, setShowRisikoForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sturzprotokoll form state
  const [form, setForm] = useState({
    datum: new Date().toISOString().split("T")[0],
    uhrzeit: "",
    ort: "",
    umstaende: "",
    verletzungen: "",
    schweregrad: "kein_schaden",
    massnahmen_sofort: "",
    arzt_informiert: false,
    arzt_name: "",
    angehoerige_informiert: false,
    nachbeobachtung: "",
    praevention_massnahmen: "",
  });

  // Risiko form state
  const [risikoForm, setRisikoForm] = useState({
    sturzgeschichte: false,
    sekundaerdiagnose: false,
    gehhilfe: "keine",
    heparininfusion: false,
    gangbild: "normal",
    mentaler_status: "orientiert",
    massnahmen: [] as string[],
  });
  const [neuerMassnahme, setNeuerMassnahme] = useState("");

  const mfsResult = berechneMFSPunkte(risikoForm);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  function handleDelete(protokollId: string) {
    if (!confirm("Sturzprotokoll wirklich löschen?")) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/bewohner/${bewohnerId}/sturzprotokoll?protokoll_id=${protokollId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError("Fehler beim Löschen.");
        return;
      }
      const removed = protokolle.filter((p) => p.id !== protokollId);
      setProtokolle(removed);
      setStats((s) => ({
        ...s,
        gesamt: removed.length,
        schwereSturzze: removed.filter(
          (p) => p.schweregrad === "mittel" || p.schweregrad === "schwer"
        ).length,
        letzterSturz: removed.length > 0 ? removed[0].datum : null,
      }));
    });
  }

  function handleSubmitProtokoll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bewohner/${bewohnerId}/sturzprotokoll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          uhrzeit: form.uhrzeit || null,
          arzt_name: form.arzt_informiert ? form.arzt_name || null : null,
        }),
      });
      if (!res.ok) {
        setError("Fehler beim Speichern.");
        return;
      }
      const saved = (await res.json()) as Sturzprotokoll;
      const updated = [saved, ...protokolle];
      setProtokolle(updated);
      setStats((s) => ({
        ...s,
        gesamt: updated.length,
        schwereSturzze: updated.filter(
          (p) => p.schweregrad === "mittel" || p.schweregrad === "schwer"
        ).length,
        letzterSturz: updated[0].datum,
      }));
      setForm({
        datum: new Date().toISOString().split("T")[0],
        uhrzeit: "",
        ort: "",
        umstaende: "",
        verletzungen: "",
        schweregrad: "kein_schaden",
        massnahmen_sofort: "",
        arzt_informiert: false,
        arzt_name: "",
        angehoerige_informiert: false,
        nachbeobachtung: "",
        praevention_massnahmen: "",
      });
      setShowForm(false);
      flashSuccess("Sturzprotokoll gespeichert.");
    });
  }

  function handleSubmitRisiko(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { punkte, risikostufe } = mfsResult;
      const res = await fetch(`/api/bewohner/${bewohnerId}/sturzprotokoll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "risiko",
          ...risikoForm,
          gesamtpunkte: punkte,
          risikostufe,
          datum: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) {
        setError("Fehler beim Speichern der Risikoeinschätzung.");
        return;
      }
      const saved = (await res.json()) as Risikoeinschaetzung;
      setRisikoeinschaetzung(saved);
      setStats((s) => ({
        ...s,
        risikostufe: saved.risikostufe,
        risikoGesamtpunkte: saved.gesamtpunkte,
      }));
      setShowRisikoForm(false);
      flashSuccess("Risikoeinschätzung gespeichert.");
    });
  }

  function addMassnahme() {
    const t = neuerMassnahme.trim();
    if (!t) return;
    setRisikoForm((f) => ({ ...f, massnahmen: [...f.massnahmen, t] }));
    setNeuerMassnahme("");
  }

  function removeMassnahme(i: number) {
    setRisikoForm((f) => ({
      ...f,
      massnahmen: f.massnahmen.filter((_, idx) => idx !== i),
    }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sturzprotokoll</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bewohnerName}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setTab("protokoll");
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus className="h-4 w-4" />
          Sturz erfassen
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={ClipboardList}
          label="Stürze (12 Mon.)"
          value={stats.gesamt}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={AlertTriangle}
          label="Mit Verletzung"
          value={stats.schwereSturzze}
          color="bg-orange-100 text-orange-700"
        />
        <StatCard
          icon={Calendar}
          label="Letzter Sturz"
          value={stats.letzterSturz ? formatDatum(stats.letzterSturz) : "–"}
          color="bg-gray-100 text-gray-600"
        />
        <StatCard
          icon={Shield}
          label="Risikostufe"
          value={
            stats.risikostufe
              ? RISIKO_LABELS[stats.risikostufe] ?? stats.risikostufe
              : "Nicht erfasst"
          }
          color={
            stats.risikostufe === "hoch"
              ? "bg-red-100 text-red-700"
              : stats.risikostufe === "mittel"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }
          sub={stats.risikoGesamtpunkte !== null ? `MFS: ${stats.risikoGesamtpunkte} Punkte` : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {[
          { key: "protokoll", label: "Protokoll", icon: ClipboardList },
          { key: "risiko", label: "Risikoeinschätzung", icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition ${
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Protokoll ── */}
      {tab === "protokoll" && (
        <div className="space-y-4">
          {/* New entry form */}
          {showForm && (
            <form
              onSubmit={handleSubmitProtokoll}
              className="bg-white rounded-xl border border-red-200 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Sturzereignis erfassen
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Datum *</label>
                  <input
                    type="date"
                    required
                    value={form.datum}
                    onChange={(e) => setForm({ ...form, datum: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Uhrzeit</label>
                  <input
                    type="time"
                    value={form.uhrzeit}
                    onChange={(e) => setForm({ ...form, uhrzeit: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Ort *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Zimmer, Flur, Bad"
                    value={form.ort}
                    onChange={(e) => setForm({ ...form, ort: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Schweregrad *</label>
                  <select
                    value={form.schweregrad}
                    onChange={(e) => setForm({ ...form, schweregrad: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="kein_schaden">Kein Schaden</option>
                    <option value="leicht">Leicht</option>
                    <option value="mittel">Mittel</option>
                    <option value="schwer">Schwer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Umstände / Hergang</label>
                <textarea
                  rows={2}
                  placeholder="Wie kam es zum Sturz?"
                  value={form.umstaende}
                  onChange={(e) => setForm({ ...form, umstaende: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Verletzungen</label>
                <textarea
                  rows={2}
                  placeholder="Beschreibung der Verletzungen (oder ‚Keine')"
                  value={form.verletzungen}
                  onChange={(e) => setForm({ ...form, verletzungen: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Sofortmaßnahmen</label>
                <textarea
                  rows={2}
                  placeholder="Eingeleitete Maßnahmen"
                  value={form.massnahmen_sofort}
                  onChange={(e) => setForm({ ...form, massnahmen_sofort: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              {/* Benachrichtigungen */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.arzt_informiert}
                      onChange={(e) =>
                        setForm({ ...form, arzt_informiert: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Arzt informiert</span>
                  </label>
                  {form.arzt_informiert && (
                    <input
                      type="text"
                      placeholder="Name des Arztes"
                      value={form.arzt_name}
                      onChange={(e) => setForm({ ...form, arzt_name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.angehoerige_informiert}
                      onChange={(e) =>
                        setForm({ ...form, angehoerige_informiert: e.target.checked })
                      }
                      className="rounded border-gray-300 text-purple-600"
                    />
                    <span className="text-sm text-gray-700">Angehörige informiert</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Nachbeobachtung</label>
                <textarea
                  rows={2}
                  placeholder="Beobachtungen in den Stunden nach dem Sturz"
                  value={form.nachbeobachtung}
                  onChange={(e) => setForm({ ...form, nachbeobachtung: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Präventionsmaßnahmen</label>
                <textarea
                  rows={2}
                  placeholder="Maßnahmen zur Prävention weiterer Stürze"
                  value={form.praevention_massnahmen}
                  onChange={(e) =>
                    setForm({ ...form, praevention_massnahmen: e.target.value })
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {isPending ? "Speichert…" : "Speichern"}
                </button>
              </div>
            </form>
          )}

          {/* List */}
          {protokolle.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Stürze erfasst</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Ersten Sturz erfassen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {protokolle.map((p) => (
                <SturzCard key={p.id} eintrag={p} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Risikoeinschätzung ── */}
      {tab === "risiko" && (
        <div className="space-y-4">
          {/* Current risiko display */}
          {risikoeinschaetzung && !showRisikoForm && (
            <div
              className={`border rounded-xl p-5 ${
                RISIKO_COLORS[risikoeinschaetzung.risikostufe] ?? "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                    Aktuelle Risikoeinschätzung
                  </p>
                  <p className="text-xs opacity-60 mt-0.5">
                    Erfasst am {formatDatum(risikoeinschaetzung.datum)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{risikoeinschaetzung.gesamtpunkte}</p>
                  <p className="text-xs opacity-70">MFS-Punkte</p>
                </div>
              </div>
              <p className="text-lg font-semibold">
                {RISIKO_LABELS[risikoeinschaetzung.risikostufe]}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      risikoeinschaetzung.sturzgeschichte ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                  Sturzgeschichte: {risikoeinschaetzung.sturzgeschichte ? "Ja" : "Nein"}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      risikoeinschaetzung.sekundaerdiagnose ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                  Sekundärdiagnose: {risikoeinschaetzung.sekundaerdiagnose ? "Ja" : "Nein"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Gehhilfe: {risikoeinschaetzung.gehhilfe}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Gangbild: {risikoeinschaetzung.gangbild}
                </div>
              </div>

              {risikoeinschaetzung.massnahmen && risikoeinschaetzung.massnahmen.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-2">
                    Präventionsmaßnahmen
                  </p>
                  <ul className="space-y-1">
                    {risikoeinschaetzung.massnahmen.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 opacity-70" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowRisikoForm(true)}
                className="mt-4 text-sm underline opacity-70 hover:opacity-100"
              >
                Neue Einschätzung erfassen
              </button>
            </div>
          )}

          {/* No risiko yet */}
          {!risikoeinschaetzung && !showRisikoForm && (
            <div className="text-center py-12 text-gray-400">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Risikoeinschätzung erfasst</p>
              <button
                onClick={() => setShowRisikoForm(true)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Risikoeinschätzung erstellen
              </button>
            </div>
          )}

          {/* Risiko Form */}
          {showRisikoForm && (
            <form
              onSubmit={handleSubmitRisiko}
              className="bg-white rounded-xl border border-blue-200 p-5 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Morse Fall Scale – Risikoeinschätzung
                </h2>
                <button
                  type="button"
                  onClick={() => setShowRisikoForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Morse-Scale items */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Sturzgeschichte</p>
                    <p className="text-xs text-gray-500">Sturz in den letzten 3 Monaten</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">+25 Pkt.</span>
                    <input
                      type="checkbox"
                      checked={risikoForm.sturzgeschichte}
                      onChange={(e) =>
                        setRisikoForm({ ...risikoForm, sturzgeschichte: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 h-4 w-4"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Sekundärdiagnose</p>
                    <p className="text-xs text-gray-500">Mehr als eine Diagnose</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">+15 Pkt.</span>
                    <input
                      type="checkbox"
                      checked={risikoForm.sekundaerdiagnose}
                      onChange={(e) =>
                        setRisikoForm({ ...risikoForm, sekundaerdiagnose: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 h-4 w-4"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Heparin-/IV-Infusion</p>
                    <p className="text-xs text-gray-500">IV-Zugang oder Heparintherapie</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">+20 Pkt.</span>
                    <input
                      type="checkbox"
                      checked={risikoForm.heparininfusion}
                      onChange={(e) =>
                        setRisikoForm({ ...risikoForm, heparininfusion: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 h-4 w-4"
                    />
                  </div>
                </label>

                <div className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Gehhilfe</p>
                      <p className="text-xs text-gray-500">Art der Fortbewegung</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {risikoForm.gehhilfe === "gehhilfe" || risikoForm.gehhilfe === "moebel"
                        ? "+15 Pkt."
                        : "+0 Pkt."}
                    </span>
                  </div>
                  <select
                    value={risikoForm.gehhilfe}
                    onChange={(e) =>
                      setRisikoForm({ ...risikoForm, gehhilfe: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="keine">Keine / Bettruhe</option>
                    <option value="rollstuhl">Rollstuhl</option>
                    <option value="gehhilfe">Gehhilfe (Gehstock, Rollator)</option>
                    <option value="moebel">An Möbeln abstützen</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Gangbild</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {risikoForm.gangbild === "schwaechlich"
                        ? "+10 Pkt."
                        : risikoForm.gangbild === "beeintraechtigt"
                        ? "+20 Pkt."
                        : "+0 Pkt."}
                    </span>
                  </div>
                  <select
                    value={risikoForm.gangbild}
                    onChange={(e) =>
                      setRisikoForm({ ...risikoForm, gangbild: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="normal">Normal / Bettruhe / Rollstuhl</option>
                    <option value="schwaechlich">Schwächlich (schleicht)</option>
                    <option value="beeintraechtigt">Beeinträchtigt (unsicher)</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Mentaler Status</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {risikoForm.mentaler_status === "vergesslich" ? "+15 Pkt." : "+0 Pkt."}
                    </span>
                  </div>
                  <select
                    value={risikoForm.mentaler_status}
                    onChange={(e) =>
                      setRisikoForm({ ...risikoForm, mentaler_status: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="orientiert">Orientiert (kennt eigene Fähigkeiten)</option>
                    <option value="vergesslich">Vergesslich / desorientiert</option>
                  </select>
                </div>
              </div>

              {/* Score preview */}
              <div
                className={`rounded-xl p-4 border ${
                  RISIKO_COLORS[mfsResult.risikostufe]
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {RISIKO_LABELS[mfsResult.risikostufe]}
                    </p>
                    <p className="text-xs opacity-70 mt-0.5">
                      Morse Fall Scale Score
                    </p>
                  </div>
                  <p className="text-3xl font-bold">{mfsResult.punkte}</p>
                </div>
                <div className="mt-2 text-xs opacity-60">
                  &lt;25 = Niedrig · 25–44 = Mittel · ≥45 = Hoch
                </div>
              </div>

              {/* Maßnahmen */}
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Präventionsmaßnahmen
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Maßnahme hinzufügen…"
                    value={neuerMassnahme}
                    onChange={(e) => setNeuerMassnahme(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMassnahme();
                      }
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    type="button"
                    onClick={addMassnahme}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {risikoForm.massnahmen.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {risikoForm.massnahmen.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="flex-1">{m}</span>
                        <button
                          type="button"
                          onClick={() => removeMassnahme(i)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRisikoForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {isPending ? "Speichert…" : "Einschätzung speichern"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
