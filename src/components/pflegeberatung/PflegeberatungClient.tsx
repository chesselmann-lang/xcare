'use client';

import { useState, useEffect, useCallback } from 'react';
import { BUNDESLAENDER, getTraegerTypLabel, formatOeffnungszeiten } from '@/lib/pflegeberatung/suche';

// ── Typdefinitionen ───────────────────────────────────────────────────────────

interface Pflegeberatungsstelle {
  id: string;
  name: string;
  traeger: string | null;
  traeger_typ: 'pflegekasse' | 'vdk' | 'sozialverband' | 'kommune' | 'sonstige' | null;
  strasse: string | null;
  hausnummer: string | null;
  plz: string;
  ort: string;
  bundesland: string | null;
  lat: number | null;
  lng: number | null;
  telefon: string | null;
  email: string | null;
  webseite: string | null;
  oeffnungszeiten: string | null;
  sprachen: string[];
  hausbesuche: boolean;
  video_beratung: boolean;
  zertifiziert: boolean;
}

interface BeratungTermin {
  id: string;
  stelle_id: string;
  wunschtermin: string;
  wunschuhrzeit: string | null;
  beratungsgrund: string | null;
  kontaktart: 'telefon' | 'video' | 'hausbesuch' | 'praesenz';
  status: 'angefragt' | 'bestaetigt' | 'abgesagt' | 'erledigt';
  notizen: string | null;
  erstellt_am: string;
  pflegeberatungsstellen: {
    id: string;
    name: string;
    traeger: string | null;
    traeger_typ: string | null;
    strasse: string | null;
    hausnummer: string | null;
    plz: string;
    ort: string;
    telefon: string | null;
  } | null;
}

interface PflegeberatungClientProps {
  initialStellen?: Pflegeberatungsstelle[];
  isAuthenticated?: boolean;
}

// ── Zeitslots ─────────────────────────────────────────────────────────────────

const ZEITSLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00',
];

// ── Kontaktarten ──────────────────────────────────────────────────────────────

const KONTAKTARTEN: Array<{ value: string; label: string }> = [
  { value: 'praesenz', label: 'Präsenz' },
  { value: 'telefon',  label: 'Telefon' },
  { value: 'video',    label: 'Video' },
  { value: 'hausbesuch', label: 'Hausbesuch' },
];

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function formatDatum(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isZukunft(datum: string): boolean {
  return new Date(datum + 'T23:59:59') >= new Date();
}

function formatAdresse(stelle: Pflegeberatungsstelle): string {
  const teile: string[] = [];
  if (stelle.strasse) {
    teile.push(`${stelle.strasse}${stelle.hausnummer ? ' ' + stelle.hausnummer : ''}`);
  }
  teile.push(`${stelle.plz} ${stelle.ort}`);
  return teile.join(', ');
}

// ── Träger-Typ-Badge ──────────────────────────────────────────────────────────

function TraegerBadge({ typ }: { typ: string | null }) {
  if (!typ) return null;

  const config: Record<string, string> = {
    pflegekasse:  'bg-blue-100 text-blue-700 border-blue-200',
    vdk:          'bg-purple-100 text-purple-700 border-purple-200',
    sozialverband:'bg-teal-100 text-teal-700 border-teal-200',
    kommune:      'bg-orange-100 text-orange-700 border-orange-200',
    sonstige:     'bg-gray-100 text-gray-600 border-gray-200',
  };

  const cls = config[typ] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {getTraegerTypLabel(typ)}
    </span>
  );
}

// ── Status-Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BeratungTermin['status'] }) {
  const config: Record<BeratungTermin['status'], { label: string; cls: string }> = {
    angefragt:  { label: 'Angefragt',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    bestaetigt: { label: 'Bestätigt',  cls: 'bg-green-100 text-green-700 border-green-200' },
    abgesagt:   { label: 'Abgesagt',   cls: 'bg-red-100 text-red-700 border-red-200' },
    erledigt:   { label: 'Erledigt',   cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ── Kontaktart-Label ──────────────────────────────────────────────────────────

function kontaktartLabel(art: string): string {
  const map: Record<string, string> = {
    telefon:   'Telefon',
    video:     'Video',
    hausbesuch:'Hausbesuch',
    praesenz:  'Präsenz',
  };
  return map[art] ?? art;
}

// ── Buchungs-Modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  stelle: Pflegeberatungsstelle;
  onClose: () => void;
  onSuccess: () => void;
}

function BookingModal({ stelle, onClose, onSuccess }: BookingModalProps) {
  const [datum, setDatum] = useState('');
  const [uhrzeit, setUhrzeit] = useState('');
  const [kontaktart, setKontaktart] = useState<string>('praesenz');
  const [beratungsgrund, setBeratungsgrund] = useState('');
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const heute = new Date();
  const minDatumStr = heute.toISOString().split('T')[0];

  // Hausbesuch-Option nur wenn Stelle Hausbesuche anbietet,
  // Video-Option nur wenn Video-Beratung angeboten wird
  const verfuegbareKontaktarten = KONTAKTARTEN.filter((k) => {
    if (k.value === 'hausbesuch' && !stelle.hausbesuche) return false;
    if (k.value === 'video' && !stelle.video_beratung) return false;
    return true;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datum) {
      setFehler('Bitte wählen Sie einen Wunschtermin.');
      return;
    }
    setLoading(true);
    setFehler(null);
    try {
      const res = await fetch('/api/pflegeberatung/termine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stelle_id: stelle.id,
          wunschtermin: datum,
          wunschuhrzeit: uhrzeit || undefined,
          kontaktart,
          beratungsgrund: beratungsgrund.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Terminanfrage fehlgeschlagen');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Terminanfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Termin anfragen</h2>
            <p className="text-sm text-gray-500 mt-0.5">{stelle.name}</p>
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
          {/* Wunschtermin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wunschtermin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              min={minDatumStr}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
          </div>

          {/* Wunschuhrzeit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wunschuhrzeit
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ZEITSLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setUhrzeit(uhrzeit === slot ? '' : slot)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                    uhrzeit === slot
                      ? 'bg-[--primary] text-white border-[--primary]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            {!uhrzeit && (
              <p className="text-xs text-gray-400 mt-1">Optional — kein Zeitwunsch gewählt</p>
            )}
          </div>

          {/* Kontaktart */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beratungsart
            </label>
            <div className="flex flex-wrap gap-2">
              {verfuegbareKontaktarten.map((k) => (
                <label
                  key={k.value}
                  className={`flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    kontaktart === k.value
                      ? 'bg-[--primary] text-white border-[--primary]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="kontaktart"
                    value={k.value}
                    checked={kontaktart === k.value}
                    onChange={() => setKontaktart(k.value)}
                    className="sr-only"
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>

          {/* Beratungsgrund */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beratungsgrund
            </label>
            <textarea
              value={beratungsgrund}
              onChange={(e) => setBeratungsgrund(e.target.value)}
              placeholder="Beschreiben Sie kurz Ihr Anliegen (z.B. Pflegegradantrag, Leistungsberatung, Entlastungsangebote …)"
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
          </div>

          {/* Hinweis */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            Die §7a-Pflegeberatung ist für Sie <strong>kostenlos</strong>. Nach Ihrer Anfrage wird
            sich die Beratungsstelle direkt bei Ihnen melden.
          </div>

          {/* Fehler */}
          {fehler && (
            <p className="text-sm text-red-600 font-medium">{fehler}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !datum}
              className="flex-1 rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Wird gesendet …' : 'Termin anfragen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export function PflegeberatungClient({
  initialStellen = [],
  isAuthenticated = false,
}: PflegeberatungClientProps) {
  const [aktiveTab, setAktiveTab] = useState<'suche' | 'termine'>('suche');

  // ── Suche / Filter ────────────────────────────────────────────────────────
  const [sucheInput, setSucheInput] = useState('');
  const [bundesland, setBundesland] = useState('');
  const [traegerTyp, setTraegerTyp] = useState('');
  const [nurHausbesuche, setNurHausbesuche] = useState(false);
  const [nurVideo, setNurVideo] = useState(false);

  const [stellen, setStellen] = useState<Pflegeberatungsstelle[]>(initialStellen);
  const [laedtStellen, setLaedtStellen] = useState(false);
  const [stellenFehler, setStellenFehler] = useState<string | null>(null);

  // ── Termine ───────────────────────────────────────────────────────────────
  const [termine, setTermine] = useState<BeratungTermin[]>([]);
  const [laedtTermine, setLaedtTermine] = useState(false);
  const [termineFehler, setTermineFehler] = useState<string | null>(null);
  const [storniertId, setStorniertId] = useState<string | null>(null);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [selectedStelle, setSelectedStelle] = useState<Pflegeberatungsstelle | null>(null);

  // ── Stellen laden ─────────────────────────────────────────────────────────

  const ladeStellen = useCallback(async (params?: {
    plz?: string;
    ort?: string;
    bundesland?: string;
    traeger_typ?: string;
    hausbesuche?: boolean;
    video_beratung?: boolean;
  }) => {
    setLaedtStellen(true);
    setStellenFehler(null);
    try {
      const url = new URL('/api/pflegeberatung', window.location.origin);
      if (params?.plz) url.searchParams.set('plz', params.plz);
      if (params?.ort) url.searchParams.set('ort', params.ort);
      if (params?.bundesland) url.searchParams.set('bundesland', params.bundesland);
      if (params?.traeger_typ) url.searchParams.set('traeger_typ', params.traeger_typ);
      if (params?.hausbesuche) url.searchParams.set('hausbesuche', 'true');
      if (params?.video_beratung) url.searchParams.set('video_beratung', 'true');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Fehler beim Laden der Beratungsstellen');
      const data: Pflegeberatungsstelle[] = await res.json();
      setStellen(data);
    } catch (err) {
      setStellenFehler(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLaedtStellen(false);
    }
  }, []);

  // ── Termine laden ─────────────────────────────────────────────────────────

  const ladeTermine = useCallback(async () => {
    if (!isAuthenticated) return;
    setLaedtTermine(true);
    setTermineFehler(null);
    try {
      const res = await fetch('/api/pflegeberatung/termine');
      if (!res.ok) throw new Error('Fehler beim Laden Ihrer Termine');
      const data: BeratungTermin[] = await res.json();
      setTermine(data);
    } catch (err) {
      setTermineFehler(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLaedtTermine(false);
    }
  }, [isAuthenticated]);

  // ── Tab wechseln → Termine nachladen ─────────────────────────────────────
  useEffect(() => {
    if (aktiveTab === 'termine') {
      ladeTermine();
    }
  }, [aktiveTab, ladeTermine]);

  // ── Suche ausführen ───────────────────────────────────────────────────────

  function handleSuche() {
    const eingabe = sucheInput.trim();
    const istPlz = /^\d{5}$/.test(eingabe);
    ladeStellen({
      plz: istPlz ? eingabe : undefined,
      ort: !istPlz && eingabe ? eingabe : undefined,
      bundesland: bundesland || undefined,
      traeger_typ: traegerTyp || undefined,
      hausbesuche: nurHausbesuche || undefined,
      video_beratung: nurVideo || undefined,
    });
  }

  function handleFilterReset() {
    setSucheInput('');
    setBundesland('');
    setTraegerTyp('');
    setNurHausbesuche(false);
    setNurVideo(false);
    ladeStellen();
  }

  // ── Termin stornieren ─────────────────────────────────────────────────────

  async function handleStornieren(terminId: string) {
    setStorniertId(terminId);
    try {
      const res = await fetch('/api/pflegeberatung/termine', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: terminId, status: 'abgesagt' }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Stornierung fehlgeschlagen');
      }
      await ladeTermine();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Stornierung fehlgeschlagen');
    } finally {
      setStorniertId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setAktiveTab('suche')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            aktiveTab === 'suche'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Beratungsstellen finden
        </button>
        <button
          onClick={() => setAktiveTab('termine')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            aktiveTab === 'termine'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Meine Termine
          {termine.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[--primary] text-white text-xs font-bold">
              {termine.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab 1: Beratungsstellen finden ── */}
      {aktiveTab === 'suche' && (
        <div className="space-y-4">
          {/* Suchleiste */}
          <div className="flex gap-2">
            <input
              type="text"
              value={sucheInput}
              onChange={(e) => setSucheInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSuche()}
              placeholder="PLZ oder Ort eingeben …"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            />
            <button
              onClick={handleSuche}
              disabled={laedtStellen}
              className="rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
            >
              {laedtStellen ? 'Suche …' : 'Suchen'}
            </button>
          </div>

          {/* Filterzeile */}
          <div className="flex flex-wrap gap-2">
            {/* Bundesland */}
            <select
              value={bundesland}
              onChange={(e) => setBundesland(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] bg-white"
            >
              <option value="">Alle Bundesländer</option>
              {BUNDESLAENDER.map((bl) => (
                <option key={bl} value={bl}>{bl}</option>
              ))}
            </select>

            {/* Träger-Typ */}
            <select
              value={traegerTyp}
              onChange={(e) => setTraegerTyp(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] bg-white"
            >
              <option value="">Alle Träger</option>
              <option value="pflegekasse">Pflegekasse</option>
              <option value="vdk">VdK Sozialverband</option>
              <option value="sozialverband">Sozialverband</option>
              <option value="kommune">Kommunal</option>
              <option value="sonstige">Freie Träger</option>
            </select>

            {/* Hausbesuche-Toggle */}
            <button
              onClick={() => setNurHausbesuche((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                nurHausbesuche
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`inline-block w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                nurHausbesuche ? 'bg-green-500 border-green-500' : 'border-gray-400'
              }`} />
              Hausbesuche
            </button>

            {/* Video-Beratung-Toggle */}
            <button
              onClick={() => setNurVideo((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                nurVideo
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`inline-block w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${
                nurVideo ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
              }`} />
              Video-Beratung
            </button>

            {/* Reset */}
            {(sucheInput || bundesland || traegerTyp || nurHausbesuche || nurVideo) && (
              <button
                onClick={handleFilterReset}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>

          {/* Ergebnisse */}
          {stellenFehler && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {stellenFehler}
            </div>
          )}

          {!laedtStellen && !stellenFehler && stellen.length === 0 && (
            <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              <p className="text-3xl mb-2">🔍</p>
              <p className="font-medium text-gray-700 mb-1">Keine Beratungsstellen gefunden</p>
              <p>Versuchen Sie eine andere PLZ oder Stadt, oder passen Sie die Filter an.</p>
            </div>
          )}

          {laedtStellen && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {!laedtStellen && stellen.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                {stellen.length} Beratungsstelle{stellen.length !== 1 ? 'n' : ''} gefunden
              </p>
              {stellen.map((stelle) => (
                <StelleCard
                  key={stelle.id}
                  stelle={stelle}
                  onTerminAnfragen={() => setSelectedStelle(stelle)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Meine Termine ── */}
      {aktiveTab === 'termine' && (
        <div className="space-y-3">
          {!isAuthenticated && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-5 text-center text-sm text-blue-800">
              <p className="font-semibold mb-1">Anmeldung erforderlich</p>
              <p>Bitte melden Sie sich an, um Ihre Beratungstermine zu verwalten.</p>
              <a
                href="/login"
                className="mt-3 inline-block rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Jetzt anmelden
              </a>
            </div>
          )}

          {isAuthenticated && termineFehler && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {termineFehler}
            </div>
          )}

          {isAuthenticated && laedtTermine && (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {isAuthenticated && !laedtTermine && !termineFehler && termine.length === 0 && (
            <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              <p className="text-3xl mb-2">📅</p>
              <p className="font-medium text-gray-700 mb-1">Noch keine Termine</p>
              <p className="mb-4">Sie haben noch keine Beratungstermine angefragt.</p>
              <button
                onClick={() => setAktiveTab('suche')}
                className="rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Beratungsstelle finden
              </button>
            </div>
          )}

          {isAuthenticated && !laedtTermine && termine.length > 0 && (
            <div className="space-y-3">
              {termine.map((termin) => (
                <div
                  key={termin.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {termin.pflegeberatungsstellen?.name ?? 'Beratungsstelle'}
                      </p>
                      {termin.pflegeberatungsstellen && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {termin.pflegeberatungsstellen.plz} {termin.pflegeberatungsstellen.ort}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={termin.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-gray-400">Wunschtermin</span>
                      <p className="font-medium">{formatDatum(termin.wunschtermin)}</p>
                    </div>
                    {termin.wunschuhrzeit && (
                      <div>
                        <span className="text-gray-400">Wunschuhrzeit</span>
                        <p className="font-medium">{termin.wunschuhrzeit} Uhr</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Beratungsart</span>
                      <p className="font-medium">{kontaktartLabel(termin.kontaktart)}</p>
                    </div>
                    {termin.pflegeberatungsstellen?.telefon && (
                      <div>
                        <span className="text-gray-400">Telefon</span>
                        <p>
                          <a
                            href={`tel:${termin.pflegeberatungsstellen.telefon.replace(/\s/g, '')}`}
                            className="font-medium text-[--primary] hover:underline"
                          >
                            {termin.pflegeberatungsstellen.telefon}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  {termin.beratungsgrund && (
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="text-gray-400">Beratungsgrund: </span>
                      {termin.beratungsgrund}
                    </div>
                  )}

                  {/* Stornieren-Button für zukünftige, nicht bereits abgesagte Termine */}
                  {isZukunft(termin.wunschtermin) &&
                    termin.status !== 'abgesagt' &&
                    termin.status !== 'erledigt' && (
                    <button
                      onClick={() => handleStornieren(termin.id)}
                      disabled={storniertId === termin.id}
                      className="w-full rounded-lg border border-red-200 text-red-600 px-4 py-2 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {storniertId === termin.id ? 'Wird abgesagt …' : 'Termin absagen'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Buchungs-Modal */}
      {selectedStelle && (
        <BookingModal
          stelle={selectedStelle}
          onClose={() => setSelectedStelle(null)}
          onSuccess={() => {
            ladeTermine();
            // Bei Erfolg auf Termine-Tab wechseln
            setTimeout(() => setAktiveTab('termine'), 300);
          }}
        />
      )}
    </div>
  );
}

// ── Stelle-Card ───────────────────────────────────────────────────────────────

interface StelleCardProps {
  stelle: Pflegeberatungsstelle;
  onTerminAnfragen: () => void;
}

function StelleCard({ stelle, onTerminAnfragen }: StelleCardProps) {
  const [zeigteOeffnungszeiten, setZeigeOeffnungszeiten] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 hover:border-gray-300 transition-colors">
      {/* Kopfzeile */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{stelle.name}</h3>
            {stelle.traeger_typ && <TraegerBadge typ={stelle.traeger_typ} />}
          </div>
          {stelle.traeger && (
            <p className="text-xs text-gray-500 mt-0.5">{stelle.traeger}</p>
          )}
        </div>
      </div>

      {/* Adresse & Kontakt */}
      <div className="space-y-1 text-sm text-gray-600">
        <p>{formatAdresse(stelle)}</p>
        {stelle.telefon && (
          <p>
            <a
              href={`tel:${stelle.telefon.replace(/\s/g, '')}`}
              className="text-[--primary] hover:underline font-medium"
            >
              {stelle.telefon}
            </a>
          </p>
        )}
      </div>

      {/* Öffnungszeiten (einklappbar) */}
      {stelle.oeffnungszeiten && (
        <div>
          <button
            onClick={() => setZeigeOeffnungszeiten((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {zeigteOeffnungszeiten ? '▲ Öffnungszeiten ausblenden' : '▼ Öffnungszeiten anzeigen'}
          </button>
          {zeigteOeffnungszeiten && (
            <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
              {formatOeffnungszeiten(stelle.oeffnungszeiten)}
            </p>
          )}
        </div>
      )}

      {/* Feature-Badges */}
      <div className="flex flex-wrap gap-1.5">
        {stelle.zertifiziert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-medium">
            ✓ Zertifiziert §7a
          </span>
        )}
        {stelle.hausbesuche && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 text-xs font-medium">
            🏠 Hausbesuche
          </span>
        )}
        {stelle.video_beratung && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
            📹 Video-Beratung
          </span>
        )}
        {stelle.sprachen.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-medium">
            🌐 {stelle.sprachen.slice(0, 3).join(', ')}
          </span>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onTerminAnfragen}
          className="flex-1 rounded-lg bg-[--primary] text-white px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Termin anfragen
        </button>
        {stelle.telefon && (
          <a
            href={`tel:${stelle.telefon.replace(/\s/g, '')}`}
            className="flex-1 rounded-lg border border-gray-200 text-gray-700 px-3 py-2 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            Anrufen
          </a>
        )}
      </div>
    </div>
  );
}
