'use client';

import { useState, useEffect, useCallback } from 'react';
import { FACHGEBIETE_LISTE, formatTermin } from '@/lib/telemedizin/termine';

// ── Typdefinitionen ───────────────────────────────────────────────────────────

interface TelemedizinAnbieter {
  id: string;
  name: string;
  slug: string;
  beschreibung: string | null;
  fachgebiete: string[];
  sprachen: string[];
  verfuegbar_ab: string;
  verfuegbar_bis: string;
  preis_pro_sitzung_cent: number;
  versicherung_direkt: boolean;
  bewertung_schnitt: number | null;
  anzahl_bewertungen: number;
  bild_url: string | null;
}

interface TelemedizinTermin {
  id: string;
  anbieter_id: string;
  termin_datum: string;
  termin_uhrzeit: string;
  dauer_minuten: number;
  grund: string | null;
  status: 'geplant' | 'bestaetigt' | 'laufend' | 'abgeschlossen' | 'storniert';
  video_link: string | null;
  notizen: string | null;
  arztbrief_url: string | null;
  erstellt_am: string;
  telemedizin_anbieter: {
    id: string;
    name: string;
    slug: string;
    fachgebiete: string[];
    bild_url: string | null;
  } | null;
}

interface ArztKoordination {
  id: string;
  arzt_name: string;
  arzt_fachrichtung: string | null;
  praxis_name: string | null;
  praxis_telefon: string | null;
  praxis_adresse: string | null;
  naechster_termin: string | null;
  letzte_behandlung: string | null;
  chronische_diagnosen: string[];
  aktuelle_medikamente: string[];
  notizen: string | null;
  erstellt_am: string;
  aktualisiert_am: string;
}

// ── Zeitslots ─────────────────────────────────────────────────────────────────

const ZEITSLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
];

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function formatPreis(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function formatDatum(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDatumLang(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isZukunft(datum: string): boolean {
  return new Date(datum + 'T23:59:59') >= new Date();
}

// ── Statusbadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TelemedizinTermin['status'] }) {
  const config: Record<TelemedizinTermin['status'], { label: string; cls: string }> = {
    geplant:       { label: 'Geplant',       cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    bestaetigt:    { label: 'Bestätigt',      cls: 'bg-green-100 text-green-700 border-green-200' },
    laufend:       { label: 'Läuft',          cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    abgeschlossen: { label: 'Abgeschlossen',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
    storniert:     { label: 'Storniert',      cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ── BuchungsModal ─────────────────────────────────────────────────────────────

interface BuchungsModalProps {
  anbieter: TelemedizinAnbieter;
  onClose: () => void;
  onSuccess: () => void;
}

function BuchungsModal({ anbieter, onClose, onSuccess }: BuchungsModalProps) {
  const [datum, setDatum] = useState('');
  const [uhrzeit, setUhrzeit] = useState('');
  const [grund, setGrund] = useState('');
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  // Minimum date: tomorrow
  const minDatum = new Date();
  minDatum.setDate(minDatum.getDate() + 1);
  const minDatumStr = minDatum.toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datum || !uhrzeit) {
      setFehler('Bitte wählen Sie Datum und Uhrzeit.');
      return;
    }
    setLoading(true);
    setFehler(null);
    try {
      const res = await fetch('/api/telemedizin/termine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anbieter_id: anbieter.id,
          termin_datum: datum,
          termin_uhrzeit: uhrzeit,
          dauer_minuten: 30,
          grund: grund.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Buchung fehlgeschlagen');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Buchung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Termin buchen</h2>
            <p className="text-sm text-gray-500 mt-0.5">{anbieter.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={minDatumStr}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Zeitslot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uhrzeit <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ZEITSLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setUhrzeit(slot)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                    uhrzeit === slot
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Grund */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grund der Konsultation
            </label>
            <textarea
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              placeholder="Beschreiben Sie kurz Ihr Anliegen..."
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preisinfo */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-medium">Kosten:</span> {formatPreis(anbieter.preis_pro_sitzung_cent)} / Sitzung
            {anbieter.versicherung_direkt && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Direktabrechnung Kasse
              </span>
            )}
          </div>

          {fehler && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {fehler}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !datum || !uhrzeit}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Buche…' : 'Termin buchen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── ArztModal ─────────────────────────────────────────────────────────────────

interface ArztModalProps {
  arzt: ArztKoordination | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ArztModal({ arzt, onClose, onSuccess }: ArztModalProps) {
  const isBearbeiten = !!arzt;
  const [form, setForm] = useState({
    arzt_name: arzt?.arzt_name ?? '',
    arzt_fachrichtung: arzt?.arzt_fachrichtung ?? '',
    praxis_name: arzt?.praxis_name ?? '',
    praxis_telefon: arzt?.praxis_telefon ?? '',
    praxis_adresse: arzt?.praxis_adresse ?? '',
    naechster_termin: arzt?.naechster_termin ?? '',
    notizen: arzt?.notizen ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.arzt_name.trim()) {
      setFehler('Bitte geben Sie den Namen des Arztes ein.');
      return;
    }
    setLoading(true);
    setFehler(null);
    try {
      const payload: Record<string, unknown> = {
        arzt_name: form.arzt_name.trim(),
        arzt_fachrichtung: form.arzt_fachrichtung.trim() || undefined,
        praxis_name: form.praxis_name.trim() || undefined,
        praxis_telefon: form.praxis_telefon.trim() || undefined,
        praxis_adresse: form.praxis_adresse.trim() || undefined,
        naechster_termin: form.naechster_termin || undefined,
        notizen: form.notizen.trim() || undefined,
      };

      if (isBearbeiten) {
        payload.id = arzt!.id;
      }

      const res = await fetch('/api/arzt-koordination', {
        method: isBearbeiten ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Speichern fehlgeschlagen');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isBearbeiten ? 'Arzt bearbeiten' : 'Neuen Arzt hinzufügen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arztname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="arzt_name"
                value={form.arzt_name}
                onChange={handleChange}
                placeholder="Dr. Max Mustermann"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fachrichtung</label>
              <input
                type="text"
                name="arzt_fachrichtung"
                value={form.arzt_fachrichtung}
                onChange={handleChange}
                placeholder="z. B. Kardiologie"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Praxisname</label>
              <input
                type="text"
                name="praxis_name"
                value={form.praxis_name}
                onChange={handleChange}
                placeholder="Gemeinschaftspraxis Am Park"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                name="praxis_telefon"
                value={form.praxis_telefon}
                onChange={handleChange}
                placeholder="030 1234567"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nächster Termin</label>
              <input
                type="date"
                name="naechster_termin"
                value={form.naechster_termin}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Praxisadresse</label>
              <input
                type="text"
                name="praxis_adresse"
                value={form.praxis_adresse}
                onChange={handleChange}
                placeholder="Musterstraße 1, 10115 Berlin"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                name="notizen"
                value={form.notizen}
                onChange={handleChange}
                placeholder="Besonderheiten, Erinnerungen..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {fehler && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {fehler}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Speichere…' : isBearbeiten ? 'Änderungen speichern' : 'Arzt hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AnbieterKarte ─────────────────────────────────────────────────────────────

interface AnbieterKarteProps {
  anbieter: TelemedizinAnbieter;
  onBuchen: (anbieter: TelemedizinAnbieter) => void;
}

function AnbieterKarte({ anbieter, onBuchen }: AnbieterKarteProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
          {anbieter.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{anbieter.name}</h3>
            {anbieter.bewertung_schnitt && (
              <div className="flex items-center gap-1 text-sm text-amber-600 flex-shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">{anbieter.bewertung_schnitt.toFixed(1)}</span>
                <span className="text-gray-400">({anbieter.anzahl_bewertungen})</span>
              </div>
            )}
          </div>

          {/* Fachgebiete */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {anbieter.fachgebiete.map((f) => (
              <span
                key={f}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {anbieter.beschreibung && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{anbieter.beschreibung}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{formatPreis(anbieter.preis_pro_sitzung_cent)}</span>
            <span className="text-gray-400">/ Sitzung</span>
            {anbieter.versicherung_direkt && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                Kasse
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Verfügbar {anbieter.verfuegbar_ab.slice(0, 5)}–{anbieter.verfuegbar_bis.slice(0, 5)} Uhr
            {anbieter.sprachen.length > 0 && ` · ${anbieter.sprachen.join(', ')}`}
          </p>
        </div>

        <button
          onClick={() => onBuchen(anbieter)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Termin buchen
        </button>
      </div>
    </div>
  );
}

// ── TerminKarte ───────────────────────────────────────────────────────────────

function TerminKarte({ termin, onTerminKarte }: { termin: TelemedizinTermin; onTerminKarte: (id: string) => void }) {
  const kannStornieren = ['geplant', 'bestaetigt'].includes(termin.status);
  const [stornierend, setStornierend] = useState(false);

  async function handleStornieren() {
    if (!confirm('Möchten Sie diesen Termin wirklich stornieren?')) return;
    setStornierend(true);
    try {
      await fetch(`/api/telemedizin/termine?id=${termin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'storniert' }),
      });
      onTerminKarte(termin.id);
    } finally {
      setStornierend(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">
            {termin.telemedizin_anbieter?.name ?? 'Anbieter'}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDatumLang(termin.termin_datum)} um {termin.termin_uhrzeit.slice(0, 5)} Uhr
            <span className="text-gray-400"> · {termin.dauer_minuten} Min.</span>
          </p>
        </div>
        <StatusBadge status={termin.status} />
      </div>

      {termin.telemedizin_anbieter?.fachgebiete && (
        <div className="flex flex-wrap gap-1.5">
          {termin.telemedizin_anbieter.fachgebiete.map((f) => (
            <span
              key={f}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {termin.grund && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium">Grund: </span>{termin.grund}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        {termin.video_link && termin.status !== 'storniert' && termin.status !== 'abgeschlossen' && (
          <a
            href={termin.video_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            Video beitreten
          </a>
        )}

        {termin.arztbrief_url && (
          <a
            href={termin.arztbrief_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Arztbrief
          </a>
        )}

        {kannStornieren && (
          <button
            onClick={handleStornieren}
            disabled={stornierend}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
          >
            {stornierend ? 'Storniere…' : 'Stornieren'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── ArztKarte ─────────────────────────────────────────────────────────────────

function ArztKarte({
  arzt,
  onBearbeiten,
  onLoeschen,
}: {
  arzt: ArztKoordination;
  onBearbeiten: (arzt: ArztKoordination) => void;
  onLoeschen: (id: string) => void;
}) {
  const [loeschend, setLoeschend] = useState(false);

  async function handleLoeschen() {
    if (!confirm(`Möchten Sie den Eintrag für ${arzt.arzt_name} wirklich löschen?`)) return;
    setLoeschend(true);
    try {
      await fetch(`/api/arzt-koordination?id=${arzt.id}`, { method: 'DELETE' });
      onLoeschen(arzt.id);
    } finally {
      setLoeschend(false);
    }
  }

  const hatNaechstenTermin = !!arzt.naechster_termin;
  const terminInZukunft = hatNaechstenTermin && isZukunft(arzt.naechster_termin!);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{arzt.arzt_name}</p>
          {arzt.arzt_fachrichtung && (
            <p className="text-sm text-blue-600 font-medium">{arzt.arzt_fachrichtung}</p>
          )}
          {arzt.praxis_name && (
            <p className="text-sm text-gray-500">{arzt.praxis_name}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onBearbeiten(arzt)}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={handleLoeschen}
            disabled={loeschend}
            className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {arzt.praxis_telefon && (
          <a
            href={`tel:${arzt.praxis_telefon}`}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {arzt.praxis_telefon}
          </a>
        )}

        {arzt.naechster_termin && (
          <div className={`flex items-center gap-2 ${terminInZukunft ? 'text-green-700' : 'text-gray-500'}`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Nächster Termin: {formatDatum(arzt.naechster_termin)}</span>
          </div>
        )}

        {arzt.praxis_adresse && (
          <p className="flex items-start gap-2 text-gray-500 sm:col-span-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {arzt.praxis_adresse}
          </p>
        )}
      </div>

      {arzt.notizen && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">{arzt.notizen}</p>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export function TelemedizinClient() {
  const [aktiveTab, setAktiveTab] = useState<'anbieter' | 'termine' | 'koordination'>('anbieter');

  // Anbieter state
  const [anbieter, setAnbieter] = useState<TelemedizinAnbieter[]>([]);
  const [anbieterLaden, setAnbieterLaden] = useState(true);
  const [suche, setSuche] = useState('');
  const [aktiverFilter, setAktiverFilter] = useState<string | null>(null);
  const [buchungsAnbieter, setBuchungsAnbieter] = useState<TelemedizinAnbieter | null>(null);

  // Termine state
  const [termine, setTermine] = useState<TelemedizinTermin[]>([]);
  const [termineLaden, setTermineLaden] = useState(false);
  const [termineAnsicht, setTermineAnsicht] = useState<'kommend' | 'vergangen'>('kommend');
  const [termineBuchenErfolg, setTermineBuchenErfolg] = useState(false);

  // Arzt-Koordination state
  const [aerzte, setAerzte] = useState<ArztKoordination[]>([]);
  const [aerzteLaden, setAerzteLaden] = useState(false);
  const [arztModal, setArztModal] = useState<{ open: boolean; arzt: ArztKoordination | null }>({
    open: false,
    arzt: null,
  });

  // ── Laden Anbieter ─────────────────────────────────────────────────────────

  const ladeAnbieter = useCallback(async () => {
    setAnbieterLaden(true);
    try {
      const params = new URLSearchParams();
      if (aktiverFilter) params.set('fachgebiet', aktiverFilter);
      if (suche.trim()) params.set('q', suche.trim());
      const res = await fetch(`/api/telemedizin?${params}`);
      if (res.ok) setAnbieter(await res.json());
    } finally {
      setAnbieterLaden(false);
    }
  }, [aktiverFilter, suche]);

  useEffect(() => {
    if (aktiveTab === 'anbieter') {
      const timer = setTimeout(ladeAnbieter, 300);
      return () => clearTimeout(timer);
    }
  }, [aktiveTab, suche, aktiverFilter, ladeAnbieter]);

  useEffect(() => {
    if (aktiveTab === 'anbieter' && anbieter.length === 0 && !suche && !aktiverFilter) {
      ladeAnbieter();
    }
  }, [aktiveTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Laden Termine ──────────────────────────────────────────────────────────

  const ladeTermine = useCallback(async () => {
    setTermineLaden(true);
    try {
      const res = await fetch('/api/telemedizin/termine');
      if (res.ok) setTermine(await res.json());
    } finally {
      setTermineLaden(false);
    }
  }, []);

  useEffect(() => {
    if (aktiveTab === 'termine') ladeTermine();
  }, [aktiveTab, ladeTermine]);

  // ── Laden Ärzte ────────────────────────────────────────────────────────────

  const ladeAerzte = useCallback(async () => {
    setAerzteLaden(true);
    try {
      const res = await fetch('/api/arzt-koordination');
      if (res.ok) setAerzte(await res.json());
    } finally {
      setAerzteLaden(false);
    }
  }, []);

  useEffect(() => {
    if (aktiveTab === 'koordination') ladeAerzte();
  }, [aktiveTab, ladeAerzte]);

  // ── Gefilterte Termine ─────────────────────────────────────────────────────

  const gefilterteTermine = termine.filter((t) => {
    const inZukunft = isZukunft(t.termin_datum) && t.status !== 'storniert' && t.status !== 'abgeschlossen';
    return termineAnsicht === 'kommend' ? inZukunft : !inZukunft;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { key: typeof aktiveTab; label: string }[] = [
    { key: 'anbieter',      label: 'Anbieter-Suche' },
    { key: 'termine',       label: 'Meine Termine' },
    { key: 'koordination',  label: 'Arzt-Koordination' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab-Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setAktiveTab(tab.key)}
            className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              aktiveTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Anbieter-Suche ─────────────────────────────────────────────── */}
      {aktiveTab === 'anbieter' && (
        <div className="space-y-5">
          {/* Suchleiste */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Anbieter oder Fachgebiet suchen…"
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fachgebiet-Filter-Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAktiverFilter(null)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                aktiverFilter === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            {FACHGEBIETE_LISTE.slice(0, 12).map((fg) => (
              <button
                key={fg}
                onClick={() => setAktiverFilter(aktiverFilter === fg ? null : fg)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  aktiverFilter === fg
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {fg}
              </button>
            ))}
          </div>

          {/* Anbieter-Liste */}
          {anbieterLaden ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : anbieter.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Keine Anbieter gefunden</p>
              <p className="text-sm mt-1">Versuchen Sie andere Suchbegriffe oder Filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{anbieter.length} Anbieter gefunden</p>
              {anbieter.map((a) => (
                <AnbieterKarte
                  key={a.id}
                  anbieter={a}
                  onBuchen={setBuchungsAnbieter}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Meine Termine ──────────────────────────────────────────────── */}
      {aktiveTab === 'termine' && (
        <div className="space-y-5">
          {termineBuchenErfolg && (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ihr Termin wurde erfolgreich gebucht!
              <button
                onClick={() => setTermineBuchenErfolg(false)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}

          {/* Ansicht-Toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(['kommend', 'vergangen'] as const).map((ansicht) => (
              <button
                key={ansicht}
                onClick={() => setTermineAnsicht(ansicht)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  termineAnsicht === ansicht
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {ansicht === 'kommend' ? 'Kommende' : 'Vergangene'}
              </button>
            ))}
          </div>

          {termineLaden ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse h-32" />
              ))}
            </div>
          ) : gefilterteTermine.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">
                {termineAnsicht === 'kommend' ? 'Keine kommenden Termine' : 'Keine vergangenen Termine'}
              </p>
              {termineAnsicht === 'kommend' && (
                <button
                  onClick={() => setAktiveTab('anbieter')}
                  className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                >
                  Jetzt Termin buchen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {gefilterteTermine.map((termin) => (
                <TerminKarte
                  key={termin.id}
                  termin={termin}
                  onTerminKarte={(id) => {
                    setTermine((prev) =>
                      prev.map((t) => t.id === id ? { ...t, status: 'storniert' } : t)
                    );
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Arzt-Koordination ──────────────────────────────────────────── */}
      {aktiveTab === 'koordination' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {aerzte.length > 0
                ? `${aerzte.length} ${aerzte.length === 1 ? 'Arzt' : 'Ärzte'} gespeichert`
                : 'Ihre behandelnden Ärzte an einem Ort verwalten'}
            </p>
            <button
              onClick={() => setArztModal({ open: true, arzt: null })}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Arzt hinzufügen
            </button>
          </div>

          {aerzteLaden ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : aerzte.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="font-medium">Noch keine Ärzte eingetragen</p>
              <p className="text-sm mt-1">Fügen Sie Ihre behandelnden Ärzte hinzu, um den Überblick zu behalten.</p>
              <button
                onClick={() => setArztModal({ open: true, arzt: null })}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Ersten Arzt hinzufügen
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {aerzte.map((arzt) => (
                <ArztKarte
                  key={arzt.id}
                  arzt={arzt}
                  onBearbeiten={(a) => setArztModal({ open: true, arzt: a })}
                  onLoeschen={(id) => setAerzte((prev) => prev.filter((a) => a.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Buchungs-Modal ────────────────────────────────────────────────────── */}
      {buchungsAnbieter && (
        <BuchungsModal
          anbieter={buchungsAnbieter}
          onClose={() => setBuchungsAnbieter(null)}
          onSuccess={() => {
            setBuchungsAnbieter(null);
            setTermineBuchenErfolg(true);
            if (aktiveTab === 'termine') ladeTermine();
          }}
        />
      )}

      {/* ── Arzt-Modal ────────────────────────────────────────────────────────── */}
      {arztModal.open && (
        <ArztModal
          arzt={arztModal.arzt}
          onClose={() => setArztModal({ open: false, arzt: null })}
          onSuccess={ladeAerzte}
        />
      )}
    </div>
  );
}
