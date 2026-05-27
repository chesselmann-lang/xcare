"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  MapPin,
  Phone,
  Clock,
  Package,
  Truck,
  ShieldAlert,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Pill,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  Globe,
  Mail,
  Hash,
  Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Apotheke {
  id: string;
  name: string;
  adresse: string;
  plz: string;
  ort: string;
  telefon?: string;
  email?: string;
  webseite?: string;
  lat?: number;
  lng?: number;
  notdienst_aktiv: boolean;
  lieferservice: boolean;
  distanz_km?: number;
}

interface Bestellung {
  id: string;
  medikament_name: string;
  pzn?: string;
  menge?: number;
  einheit?: string;
  status: string;
  bestellt_am: string;
  apotheke_id?: string;
  apotheken?: { name: string; ort: string } | null;
}

interface Erinnerung {
  id: string;
  medikament_name: string;
  dosierung?: string;
  einnahme_zeiten: string[];
  aktiv: boolean;
}

interface Props {
  initialBestellungen: Bestellung[];
  initialErinnerungen: Erinnerung[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ausstehend:  { label: "Ausstehend",   color: "bg-yellow-100 text-yellow-800" },
  bestaetigt:  { label: "Bestaetigt",   color: "bg-blue-100 text-blue-800"   },
  in_lieferung:{ label: "In Lieferung", color: "bg-purple-100 text-purple-800" },
  geliefert:   { label: "Geliefert",    color: "bg-green-100 text-green-800" },
  storniert:   { label: "Storniert",    color: "bg-red-100 text-red-800"     },
};

const WOCHENTAGE = [
  { key: "mo", label: "Mo" },
  { key: "di", label: "Di" },
  { key: "mi", label: "Mi" },
  { key: "do", label: "Do" },
  { key: "fr", label: "Fr" },
  { key: "sa", label: "Sa" },
  { key: "so", label: "So" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotdienstBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      <ShieldAlert className="h-3 w-3" />
      Notdienst
    </span>
  );
}

function LieferBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      <Truck className="h-3 w-3" />
      Lieferservice
    </span>
  );
}

function DistanzBadge({ km }: { km: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
      <MapPin className="h-3 w-3" />
      {km} km
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-600",
    error:   "bg-red-600",
    info:    "bg-blue-600",
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${colors[type]} max-w-sm`}>
      {type === "success" && <CheckCircle2 className="h-5 w-5 shrink-0" />}
      {type === "error" && <AlertCircle className="h-5 w-5 shrink-0" />}
      {type === "info" && <Bell className="h-5 w-5 shrink-0" />}
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-auto shrink-0 opacity-80 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Order Modal ──────────────────────────────────────────────────────────────

interface BestellModalProps {
  apotheke: Apotheke;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function BestellModal({ apotheke, onClose, onSuccess, onError }: BestellModalProps) {
  const [form, setForm] = useState({
    medikament_name: "",
    pzn: "",
    menge: 1,
    einheit: "Packung",
    rezept_pflicht: false,
    liefer_adresse: "",
    notizen: "",
  });
  const [loading, setLoading] = useState(false);
  const [pznInfo, setPznInfo] = useState<string | null>(null);
  const pznTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(field: string, value: string | number | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // PZN auto-lookup with debounce
  useEffect(() => {
    if (form.pzn.replace(/\D/g, "").length < 8) {
      setPznInfo(null);
      return;
    }
    if (pznTimeout.current) clearTimeout(pznTimeout.current);
    pznTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/apotheken/pzn?pzn=${encodeURIComponent(form.pzn)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.name) setPznInfo(`${data.name}${data.hersteller ? ` – ${data.hersteller}` : ""}`);
        }
      } catch { /* silent */ }
    }, 500);
    return () => { if (pznTimeout.current) clearTimeout(pznTimeout.current); };
  }, [form.pzn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.medikament_name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/apotheken/bestellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apotheke_id: apotheke.id,
          medikament_name: form.medikament_name.trim(),
          pzn: form.pzn.replace(/\D/g, "") || undefined,
          menge: form.menge,
          einheit: form.einheit,
          rezept_pflicht: form.rezept_pflicht,
          liefer_adresse: form.liefer_adresse.trim() || undefined,
          notizen: form.notizen.trim() || undefined,
        }),
      });
      if (res.ok) {
        onSuccess(`Bestellung bei ${apotheke.name} aufgegeben`);
        onClose();
      } else {
        const json = await res.json();
        onError(json.error ?? "Bestellung fehlgeschlagen");
      }
    } catch {
      onError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Medikament bestellen</h2>
            <p className="text-sm text-gray-500">{apotheke.name}, {apotheke.ort}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medikament Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medikament <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.medikament_name}
              onChange={e => handleChange("medikament_name", e.target.value)}
              placeholder="z.B. Ibuprofen 400mg"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* PZN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PZN (Pharmazentralnummer)
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={form.pzn}
                onChange={e => handleChange("pzn", e.target.value)}
                placeholder="z.B. 01234567"
                maxLength={10}
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {pznInfo && (
              <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {pznInfo}
              </p>
            )}
          </div>

          {/* Menge + Einheit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menge</label>
              <input
                type="number"
                min={1}
                max={99}
                value={form.menge}
                onChange={e => handleChange("menge", parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Einheit</label>
              <select
                value={form.einheit}
                onChange={e => handleChange("einheit", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option>Packung</option>
                <option>Tabletten</option>
                <option>Kapseln</option>
                <option>ml</option>
                <option>Ampullen</option>
                <option>Stueck</option>
              </select>
            </div>
          </div>

          {/* Rezeptpflichtig */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.rezept_pflicht}
              onChange={e => handleChange("rezept_pflicht", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">Rezeptpflichtig (Rezept liegt vor)</span>
          </label>

          {/* Lieferadresse */}
          {apotheke.lieferservice && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieferadresse (optional)
              </label>
              <input
                type="text"
                value={form.liefer_adresse}
                onChange={e => handleChange("liefer_adresse", e.target.value)}
                placeholder="Straße, Hausnummer, PLZ Ort"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Notizen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={form.notizen}
              onChange={e => handleChange("notizen", e.target.value)}
              rows={2}
              placeholder="Besondere Hinweise, Allergien, etc."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !form.medikament_name.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {loading ? "Wird bestellt..." : "Bestellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reminder Modal ───────────────────────────────────────────────────────────

interface ErinnerungModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

function ErinnerungModal({ onClose, onSuccess, onError }: ErinnerungModalProps) {
  const [form, setForm] = useState({
    medikament_name: "",
    dosierung: "",
    einnahme_zeiten: ["08:00"],
    tage: ["mo", "di", "mi", "do", "fr", "sa", "so"],
    vorrat_einheiten: "",
    nachbestellung_ab: "7",
  });
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setForm(prev => ({
      ...prev,
      tage: prev.tage.includes(tag) ? prev.tage.filter(t => t !== tag) : [...prev.tage, tag],
    }));
  }

  function addZeit() {
    setForm(prev => ({ ...prev, einnahme_zeiten: [...prev.einnahme_zeiten, "12:00"] }));
  }

  function removeZeit(idx: number) {
    setForm(prev => ({ ...prev, einnahme_zeiten: prev.einnahme_zeiten.filter((_, i) => i !== idx) }));
  }

  function updateZeit(idx: number, val: string) {
    setForm(prev => {
      const zeiten = [...prev.einnahme_zeiten];
      zeiten[idx] = val;
      return { ...prev, einnahme_zeiten: zeiten };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.medikament_name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/apotheken/erinnerungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medikament_name: form.medikament_name.trim(),
          dosierung: form.dosierung.trim() || undefined,
          einnahme_zeiten: form.einnahme_zeiten,
          tage: form.tage,
          vorrat_einheiten: form.vorrat_einheiten ? parseInt(form.vorrat_einheiten) : undefined,
          nachbestellung_ab: parseInt(form.nachbestellung_ab) || 7,
        }),
      });
      if (res.ok) {
        onSuccess("Erinnerung erstellt");
        onClose();
      } else {
        const json = await res.json();
        onError(json.error ?? "Fehler beim Erstellen");
      }
    } catch {
      onError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Einnahme-Erinnerung</h2>
            <p className="text-sm text-gray-500">Regelmaessige Medikamentenerinnerung einrichten</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Medikament <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.medikament_name}
              onChange={e => setForm(prev => ({ ...prev, medikament_name: e.target.value }))}
              placeholder="z.B. Ramipril 5mg"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dosierung</label>
            <input
              type="text"
              value={form.dosierung}
              onChange={e => setForm(prev => ({ ...prev, dosierung: e.target.value }))}
              placeholder="z.B. 1 Tablette morgens"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Einnahmezeiten */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Einnahmezeiten</label>
              <button
                type="button"
                onClick={addZeit}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Zeit hinzufuegen
              </button>
            </div>
            <div className="space-y-2">
              {form.einnahme_zeiten.map((zeit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    type="time"
                    value={zeit}
                    onChange={e => updateZeit(idx, e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {form.einnahme_zeiten.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeZeit(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wochentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wochentage</label>
            <div className="flex gap-1.5 flex-wrap">
              {WOCHENTAGE.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTag(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.tage.includes(key)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Vorrat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vorrat (Einheiten)
              </label>
              <input
                type="number"
                min={0}
                value={form.vorrat_einheiten}
                onChange={e => setForm(prev => ({ ...prev, vorrat_einheiten: e.target.value }))}
                placeholder="z.B. 30"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nachbestellen ab (Tage)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.nachbestellung_ab}
                onChange={e => setForm(prev => ({ ...prev, nachbestellung_ab: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !form.medikament_name.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              {loading ? "Wird gespeichert..." : "Erinnerung erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Apotheke Card ────────────────────────────────────────────────────────────

interface ApothekeCardProps {
  apotheke: Apotheke;
  onBestellen: (apotheke: Apotheke) => void;
}

function ApothekeCard({ apotheke, onBestellen }: ApothekeCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
      apotheke.notdienst_aktiv ? "border-red-200" : "border-gray-200"
    }`}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{apotheke.name}</h3>
              {apotheke.notdienst_aktiv && <NotdienstBadge />}
              {apotheke.lieferservice && <LieferBadge />}
              {apotheke.distanz_km !== undefined && <DistanzBadge km={apotheke.distanz_km} />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {apotheke.adresse}, {apotheke.plz} {apotheke.ort}
            </p>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label={expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Phone */}
        {apotheke.telefon && (
          <a
            href={`tel:${apotheke.telefon}`}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            {apotheke.telefon}
          </a>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            {apotheke.email && (
              <a href={`mailto:${apotheke.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                {apotheke.email}
              </a>
            )}
            {apotheke.webseite && (
              <a href={apotheke.webseite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                {apotheke.webseite.replace(/^https?:\/\//, "")}
              </a>
            )}
            {apotheke.lat && apotheke.lng && (
              <a
                href={`https://maps.google.com/?q=${apotheke.lat},${apotheke.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                Auf Google Maps oeffnen
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onBestellen(apotheke)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            Jetzt bestellen
          </button>
          {apotheke.telefon && (
            <a
              href={`tel:${apotheke.telefon}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              Anrufen
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ActiveTab = "suche" | "bestellungen" | "erinnerungen";

export function ApothekenClient({ initialBestellungen, initialErinnerungen }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("suche");

  // Search state
  const [searchPLZ, setSearchPLZ] = useState("");
  const [searchOrt, setSearchOrt] = useState("");
  const [nurNotdienst, setNurNotdienst] = useState(false);
  const [nurLieferservice, setNurLieferservice] = useState(false);
  const [apotheken, setApotheken] = useState<Apotheke[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Geolocation
  const [userLat, setUserLat] = useState<number | undefined>(undefined);
  const [userLng, setUserLng] = useState<number | undefined>(undefined);
  const [geoLoading, setGeoLoading] = useState(false);

  // Current time for Notdienst
  const [currentTime, setCurrentTime] = useState<string>("");

  // Orders
  const [bestellungen, setBestellungen] = useState<Bestellung[]>(initialBestellungen);
  const [bestellungenLoading, setBestellungenLoading] = useState(false);

  // Reminders
  const [erinnerungen, setErinnerungen] = useState<Erinnerung[]>(initialErinnerungen);

  // Modals
  const [bestellApotheke, setBestellApotheke] = useState<Apotheke | null>(null);
  const [showErinnerungModal, setShowErinnerungModal] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  }, []);

  // Update clock every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Geolocation
  function requestGeo() {
    if (!navigator.geolocation) {
      showToast("Standortermittlung nicht verfuegbar", "error");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGeoLoading(false);
        showToast("Standort ermittelt", "success");
      },
      () => {
        setGeoLoading(false);
        showToast("Standort konnte nicht ermittelt werden", "error");
      }
    );
  }

  // Search
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!searchPLZ.trim() && !searchOrt.trim()) {
      setSearchError("Bitte PLZ oder Ort eingeben");
      return;
    }
    setSearchError(null);
    setSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchPLZ.trim()) params.set("plz", searchPLZ.trim());
      if (searchOrt.trim()) params.set("ort", searchOrt.trim());
      if (nurNotdienst) params.set("notdienst", "true");
      if (nurLieferservice) params.set("lieferservice", "true");
      if (userLat !== undefined) params.set("lat", String(userLat));
      if (userLng !== undefined) params.set("lng", String(userLng));

      const res = await fetch(`/api/apotheken?${params.toString()}`);
      if (!res.ok) throw new Error("Suche fehlgeschlagen");
      const json = await res.json();
      setApotheken(json.apotheken ?? []);
    } catch {
      setSearchError("Suche fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSearching(false);
    }
  }

  // Quick Notdienst search
  async function handleNotdienstSuche() {
    if (!searchPLZ.trim()) {
      showToast("Bitte zuerst PLZ eingeben", "info");
      return;
    }
    setNurNotdienst(true);
    setSearching(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ plz: searchPLZ.trim(), notdienst: "true" });
      const res = await fetch(`/api/apotheken?${params.toString()}`);
      const json = await res.json();
      setApotheken(json.apotheken ?? []);
      if ((json.apotheken ?? []).length === 0) {
        showToast("Keine Notdienstapotheke gefunden", "info");
      }
    } catch {
      setSearchError("Suche fehlgeschlagen");
    } finally {
      setSearching(false);
    }
  }

  // Reload orders
  const reloadBestellungen = useCallback(async () => {
    setBestellungenLoading(true);
    try {
      const res = await fetch("/api/apotheken/bestellen");
      if (res.ok) {
        const json = await res.json();
        setBestellungen(json.bestellungen ?? []);
      }
    } catch { /* silent */ } finally {
      setBestellungenLoading(false);
    }
  }, []);

  // Toggle reminder active state
  async function toggleErinnerung(id: string, aktiv: boolean) {
    try {
      const res = await fetch(`/api/apotheken/erinnerungen/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: !aktiv }),
      });
      if (res.ok) {
        setErinnerungen(prev => prev.map(e => e.id === id ? { ...e, aktiv: !aktiv } : e));
        showToast(!aktiv ? "Erinnerung aktiviert" : "Erinnerung pausiert", "success");
      }
    } catch {
      showToast("Fehler beim Aktualisieren", "error");
    }
  }

  // Delete reminder
  async function deleteErinnerung(id: string) {
    try {
      const res = await fetch(`/api/apotheken/erinnerungen/${id}`, { method: "DELETE" });
      if (res.ok) {
        setErinnerungen(prev => prev.filter(e => e.id !== id));
        showToast("Erinnerung geloescht", "success");
      }
    } catch {
      showToast("Fehler beim Loeschen", "error");
    }
  }

  const TABS: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "suche",        label: "Apotheken-Suche", icon: <Search className="h-4 w-4" /> },
    { key: "bestellungen", label: "Bestellungen",     icon: <ClipboardList className="h-4 w-4" />, count: bestellungen.length },
    { key: "erinnerungen", label: "Erinnerungen",     icon: <Bell className="h-4 w-4" />, count: erinnerungen.filter(e => e.aktiv).length },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Apotheken-Suche ── */}
      {activeTab === "suche" && (
        <div className="space-y-4">
          {/* Notdienst Banner */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-800">Notdienst jetzt finden</p>
                  <p className="text-sm text-red-600">
                    Aktuelle Uhrzeit: <span className="font-mono font-bold">{currentTime}</span>
                    {" "}· PLZ eingeben und Notdienstapotheke finden
                  </p>
                </div>
              </div>
              <button
                onClick={handleNotdienstSuche}
                disabled={searching}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                Notdienst suchen
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PLZ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchPLZ}
                    onChange={e => setSearchPLZ(e.target.value.replace(/\D/g, "").substring(0, 5))}
                    placeholder="z.B. 10117"
                    maxLength={5}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchOrt}
                    onChange={e => setSearchOrt(e.target.value)}
                    placeholder="z.B. Berlin"
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Filter toggles */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNurNotdienst(n => !n)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  nurNotdienst
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Nur Notdienst
              </button>
              <button
                type="button"
                onClick={() => setNurLieferservice(n => !n)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  nurLieferservice
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                Nur Lieferservice
              </button>
              <button
                type="button"
                onClick={requestGeo}
                disabled={geoLoading}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  userLat !== undefined
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                {userLat !== undefined ? "Standort aktiv" : "Standort nutzen"}
              </button>
            </div>

            {searchError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {searchError}
              </p>
            )}

            <button
              type="submit"
              disabled={searching}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? "Suche laeuft..." : "Apotheken suchen"}
            </button>
          </form>

          {/* Results */}
          {hasSearched && (
            <div>
              {apotheken.length === 0 && !searching ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                  <Pill className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Keine Apotheken gefunden</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Versuchen Sie einen anderen Suchbegriff oder erweitern Sie den Suchbereich.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {apotheken.length} Apotheke{apotheken.length !== 1 ? "n" : ""} gefunden
                    </p>
                    {nurNotdienst && (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> Nur Notdienst
                      </span>
                    )}
                  </div>
                  {apotheken.map(apotheke => (
                    <ApothekeCard
                      key={apotheke.id}
                      apotheke={apotheke}
                      onBestellen={setBestellApotheke}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Apotheke in Ihrer Naehe finden</p>
              <p className="text-sm text-gray-400 mt-1">
                PLZ oder Ort eingeben und nach Apotheken suchen
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Bestellungen ── */}
      {activeTab === "bestellungen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Meine Bestellungen</h2>
            <button
              onClick={reloadBestellungen}
              disabled={bestellungenLoading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${bestellungenLoading ? "animate-spin" : ""}`} />
              Aktualisieren
            </button>
          </div>

          {bestellungen.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Noch keine Bestellungen</p>
              <p className="text-sm text-gray-400 mt-1">
                Suchen Sie eine Apotheke und bestellen Sie Ihr Medikament.
              </p>
              <button
                onClick={() => setActiveTab("suche")}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Apotheke suchen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bestellungen.map(bestellung => (
                <div key={bestellung.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{bestellung.medikament_name}</span>
                        <StatusBadge status={bestellung.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {bestellung.menge && bestellung.einheit && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {bestellung.menge} {bestellung.einheit}
                          </span>
                        )}
                        {bestellung.pzn && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            PZN {bestellung.pzn}
                          </span>
                        )}
                        {bestellung.apotheken && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {bestellung.apotheken.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(bestellung.bestellt_am).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "2-digit", year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Erinnerungen ── */}
      {activeTab === "erinnerungen" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Einnahme-Erinnerungen</h2>
            <button
              onClick={() => setShowErinnerungModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Neue Erinnerung
            </button>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-start gap-2.5">
            <Bell className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Richten Sie Einnahme-Erinnerungen fuer Ihre Medikamente ein. Sie erhalten eine Benachrichtigung,
              wenn ein Medikament eingenommen werden soll oder der Vorrat zur Neige geht.
            </p>
          </div>

          {erinnerungen.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Keine Erinnerungen</p>
              <p className="text-sm text-gray-400 mt-1">
                Erstellen Sie Einnahme-Erinnerungen fuer Ihre Medikamente.
              </p>
              <button
                onClick={() => setShowErinnerungModal(true)}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Erinnerung erstellen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {erinnerungen.map(erinnerung => (
                <div
                  key={erinnerung.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    erinnerung.aktiv ? "border-gray-200" : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="font-medium text-gray-900">{erinnerung.medikament_name}</span>
                        {!erinnerung.aktiv && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Pausiert</span>
                        )}
                      </div>
                      {erinnerung.dosierung && (
                        <p className="text-sm text-gray-500 mt-0.5 ml-6">{erinnerung.dosierung}</p>
                      )}
                      {erinnerung.einnahme_zeiten?.length > 0 && (
                        <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                          {erinnerung.einnahme_zeiten.map((zeit, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              <Clock className="h-3 w-3" />
                              {zeit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleErinnerung(erinnerung.id, erinnerung.aktiv)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          erinnerung.aktiv
                            ? "text-blue-600 hover:bg-blue-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={erinnerung.aktiv ? "Pausieren" : "Aktivieren"}
                      >
                        {erinnerung.aktiv ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteErinnerung(erinnerung.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Loeschen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {bestellApotheke && (
        <BestellModal
          apotheke={bestellApotheke}
          onClose={() => setBestellApotheke(null)}
          onSuccess={msg => {
            showToast(msg, "success");
            reloadBestellungen();
          }}
          onError={msg => showToast(msg, "error")}
        />
      )}

      {showErinnerungModal && (
        <ErinnerungModal
          onClose={() => setShowErinnerungModal(false)}
          onSuccess={msg => {
            showToast(msg, "success");
            // Reload reminders
            fetch("/api/apotheken/erinnerungen")
              .then(r => r.json())
              .then(d => setErinnerungen(d.erinnerungen ?? []))
              .catch(() => {});
          }}
          onError={msg => showToast(msg, "error")}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default ApothekenClient;
