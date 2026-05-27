'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  FileText,
  Phone,
  Globe,
  Mail,
  MapPin,
  Euro,
  Calendar,
  Printer,
  X,
  Info,
  Scale,
  ListChecks,
  Compass,
  Loader2,
  ArrowRight,
  RefreshCw,
  Gavel,
} from 'lucide-react'
import { erstelleAntragsplan, generiereWiderspruchText } from '@/lib/behoerden/rechner'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Sozialleistung {
  id: string
  name: string
  kurzname: string | null
  rechtsgrundlage: string
  behoerde: string
  beschreibung: string | null
  anspruchsvoraussetzungen: string[] | null
  leistungshoehe: string | null
  antragstellungsort: string | null
  bearbeitungszeit_wochen: number | null
  widerspruchsfrist_wochen: number | null
  formulare: unknown
  tipps: string[] | null
  haeufige_fehler: string[] | null
  kategorie: string | null
  prioritaet: number
  aktiv: boolean
}

export interface BehoerdenVorgang {
  id: string
  user_id: string
  leistung_id: string | null
  leistung_name: string
  status:
    | 'geplant'
    | 'antrag_vorbereiten'
    | 'eingereicht'
    | 'nachforderung'
    | 'bewilligt'
    | 'abgelehnt'
    | 'widerspruch'
    | 'klage'
    | 'erledigt'
  behoerde: string | null
  eingereicht_am: string | null
  bescheid_erwartet_am: string | null
  bescheid_erhalten_am: string | null
  widerspruchsfrist_am: string | null
  betrag_bewilligt_cent: number | null
  aktenzeichen: string | null
  notizen: string | null
  dokumente: unknown
  erinnerungen: unknown
  erstellt_am: string
  aktualisiert_am: string
  leistung?: Partial<Sozialleistung> | null
}

export interface BehoerdenEintrag {
  id: string
  name: string
  typ: string
  plz: string | null
  ort: string | null
  strasse: string | null
  telefon: string | null
  email: string | null
  webseite: string | null
  oeffnungszeiten: string | null
  zustaendig_fuer: string[] | null
}

interface Props {
  initialLeistungen: Sozialleistung[]
  initialVorgaenge: BehoerdenVorgang[]
  initialBehoerden: BehoerdenEintrag[]
  isLoggedIn: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = 'finder' | 'vorgaenge' | 'plan' | 'behoerden'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'finder', label: 'Leistungs-Finder', icon: Search },
  { id: 'vorgaenge', label: 'Meine Vorgaenge', icon: ListChecks },
  { id: 'plan', label: 'Antragsplan', icon: Compass },
  { id: 'behoerden', label: 'Behoerden-Finder', icon: Building2 },
]

const KATEGORIEN = [
  { value: 'pflege', label: 'Pflege' },
  { value: 'sozialhilfe', label: 'Sozialhilfe' },
  { value: 'rente', label: 'Rente' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'wohnen', label: 'Wohnen' },
  { value: 'arbeit', label: 'Arbeit' },
  { value: 'behinderung', label: 'Behinderung' },
  { value: 'kinder', label: 'Kinder' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const STATUS_CONFIG: Record<
  BehoerdenVorgang['status'],
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  geplant:            { label: 'Geplant',            color: 'text-gray-600',  bgColor: 'bg-gray-100',   icon: Clock },
  antrag_vorbereiten: { label: 'In Vorbereitung',    color: 'text-yellow-700',bgColor: 'bg-yellow-100', icon: FileText },
  eingereicht:        { label: 'Eingereicht',         color: 'text-blue-700',  bgColor: 'bg-blue-100',   icon: ArrowRight },
  nachforderung:      { label: 'Nachforderung',       color: 'text-orange-700',bgColor: 'bg-orange-100', icon: AlertTriangle },
  bewilligt:          { label: 'Bewilligt',           color: 'text-green-700', bgColor: 'bg-green-100',  icon: CheckCircle2 },
  abgelehnt:          { label: 'Abgelehnt',           color: 'text-red-700',   bgColor: 'bg-red-100',    icon: XCircle },
  widerspruch:        { label: 'Widerspruch',         color: 'text-amber-700', bgColor: 'bg-amber-100',  icon: Scale },
  klage:              { label: 'Klage',               color: 'text-purple-700',bgColor: 'bg-purple-100', icon: Gavel },
  erledigt:           { label: 'Erledigt',            color: 'text-gray-500',  bgColor: 'bg-gray-50',    icon: CheckCircle2 },
}

const BEHOERDE_COLORS: Record<string, string> = {
  pflegekasse:      'bg-blue-100 text-blue-800',
  sozialamt:        'bg-purple-100 text-purple-800',
  versorgungsamt:   'bg-teal-100 text-teal-800',
  krankenkasse:     'bg-cyan-100 text-cyan-800',
  rentenversicherung:'bg-indigo-100 text-indigo-800',
  arbeitgeber:      'bg-orange-100 text-orange-800',
  notar:            'bg-gray-100 text-gray-800',
  betreuungsgericht:'bg-slate-100 text-slate-800',
  pflegestuetzpunkt:'bg-green-100 text-green-800',
  beratungsstelle:  'bg-lime-100 text-lime-800',
}

function getBehoerdeColor(behoerde: string): string {
  const lower = behoerde.toLowerCase()
  for (const [key, color] of Object.entries(BEHOERDE_COLORS)) {
    if (lower.includes(key)) return color
  }
  return 'bg-gray-100 text-gray-700'
}

function formatCent(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function tageBisZuDatum(datumsStr: string): number {
  const ziel = new Date(datumsStr)
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  return Math.ceil((ziel.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BehoerdenVorgang['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

function WiderspruchModal({
  vorgang,
  onClose,
}: {
  vorgang: BehoerdenVorgang
  onClose: () => void
}) {
  const [absender, setAbsender] = useState({
    name: '',
    adresse: '',
    aktenzeichen: vorgang.aktenzeichen ?? '',
  })
  const [begruendung, setBegruendung] = useState('')
  const [briefText, setBriefText] = useState('')

  function generieren() {
    const text = generiereWiderspruchText({
      absender: {
        name: absender.name || 'Max Mustermann, Musterstr. 1, 12345 Musterstadt',
        adresse: absender.adresse || 'Musterstr. 1\n12345 Musterstadt',
        aktenzeichen: absender.aktenzeichen || '[Aktenzeichen eintragen]',
      },
      behoerde: vorgang.behoerde ?? '[Behoerde eintragen]',
      leistung_name: vorgang.leistung_name,
      ablehnungsdatum: vorgang.bescheid_erhalten_am
        ? formatDate(vorgang.bescheid_erhalten_am)
        : '[Datum des Ablehnungsbescheids]',
      begruendung_widerspruch:
        begruendung || '[Hier Ihre Begruendung eintragen]',
    })
    setBriefText(text)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[--background] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-600" />
            Widerspruch einlegen: {vorgang.leistung_name}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[--muted]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!briefText ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Widerspruchsfrist:</strong> 4 Wochen ab Zugang des Bescheids (§84 SGG).
                {vorgang.widerspruchsfrist_am && (
                  <span className="ml-1 font-semibold">
                    Ihre Frist: {formatDate(vorgang.widerspruchsfrist_am)}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Ihr Name (Absender)</label>
                  <input
                    className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                    placeholder="Max Mustermann"
                    value={absender.name}
                    onChange={(e) => setAbsender((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ihre Adresse</label>
                  <textarea
                    className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                    rows={2}
                    placeholder="Musterstr. 1&#10;12345 Musterstadt"
                    value={absender.adresse}
                    onChange={(e) => setAbsender((p) => ({ ...p, adresse: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Aktenzeichen</label>
                  <input
                    className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                    placeholder="Aus dem Bescheid"
                    value={absender.aktenzeichen}
                    onChange={(e) => setAbsender((p) => ({ ...p, aktenzeichen: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ihre Widerspruchsbegruendung</label>
                  <textarea
                    className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                    rows={5}
                    placeholder="Beschreiben Sie, warum Sie die Ablehnung fuer unrechtmaessig halten. Z.B.: Der Pflegegrad wurde falsch eingestuft, weil..."
                    value={begruendung}
                    onChange={(e) => setBegruendung(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={generieren}
                className="w-full bg-[--primary] text-white rounded-lg px-4 py-2.5 font-medium hover:bg-[--secondary] transition-colors"
              >
                Widerspruchs-Brief generieren
              </button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Brief generiert. Bitte pruefen und ggf. ergaenzen, dann ausdrucken und per Einschreiben senden.
              </div>
              <pre className="bg-[--muted] rounded-lg p-4 text-xs font-mono whitespace-pre-wrap border border-[--border] max-h-80 overflow-y-auto">
                {briefText}
              </pre>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm font-medium hover:bg-[--secondary] transition-colors"
                >
                  <Printer className="w-4 h-4" /> Drucken
                </button>
                <button
                  onClick={() => setBriefText('')}
                  className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Neu generieren
                </button>
                <button
                  onClick={onClose}
                  className="ml-auto px-4 py-2 text-sm text-[--muted-foreground] hover:bg-[--muted] rounded-lg"
                >
                  Schliessen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── LeistungsCard ────────────────────────────────────────────────────────────

function LeistungsCard({
  leistung,
  onAddVorgang,
  adding,
}: {
  leistung: Sozialleistung
  onAddVorgang: (l: Sozialleistung) => void
  adding: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-[--border] rounded-xl overflow-hidden bg-[--background] shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-[--foreground] text-sm">{leistung.name}</h3>
              <span className="text-xs px-1.5 py-0.5 bg-[--muted] text-[--muted-foreground] rounded font-mono">
                {leistung.rechtsgrundlage}
              </span>
            </div>
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${getBehoerdeColor(leistung.behoerde)}`}>
              {leistung.behoerde}
            </span>
          </div>
          <button
            onClick={() => onAddVorgang(leistung)}
            disabled={adding}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[--primary] text-white text-xs rounded-lg hover:bg-[--secondary] transition-colors disabled:opacity-60"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Vorgang
          </button>
        </div>

        {leistung.leistungshoehe && (
          <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-green-700">
            <Euro className="w-4 h-4" />
            {leistung.leistungshoehe}
          </div>
        )}

        {leistung.beschreibung && (
          <p className="mt-2 text-xs text-[--muted-foreground] line-clamp-2">
            {leistung.beschreibung}
          </p>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-[--primary] hover:underline"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Weniger anzeigen</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Details & Tipps</>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[--border] bg-[--muted]/30 p-4 space-y-3">
          {leistung.anspruchsvoraussetzungen && leistung.anspruchsvoraussetzungen.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[--foreground] mb-1.5 uppercase tracking-wide">
                Voraussetzungen
              </h4>
              <ul className="space-y-1">
                {leistung.anspruchsvoraussetzungen.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[--muted-foreground]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {leistung.antragstellungsort && (
            <div>
              <h4 className="text-xs font-semibold text-[--foreground] mb-1 uppercase tracking-wide">
                Wo beantragen
              </h4>
              <p className="text-xs text-[--muted-foreground] flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[--primary]" />
                {leistung.antragstellungsort}
              </p>
            </div>
          )}

          {leistung.bearbeitungszeit_wochen && (
            <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
              <Clock className="w-3.5 h-3.5" />
              Bearbeitungszeit: ca. {leistung.bearbeitungszeit_wochen} Wochen
            </div>
          )}

          {leistung.tipps && leistung.tipps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 mb-1.5 uppercase tracking-wide">
                Tipps
              </h4>
              <ul className="space-y-1">
                {leistung.tipps.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[--muted-foreground]">
                    <Info className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {leistung.haeufige_fehler && leistung.haeufige_fehler.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">
                Haeufige Fehler vermeiden
              </h4>
              <ul className="space-y-1">
                {leistung.haeufige_fehler.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[--muted-foreground]">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── VorgangCard ──────────────────────────────────────────────────────────────

function VorgangCard({
  vorgang,
  onStatusChange,
  onUpdate,
  onWiderspruch,
  updating,
}: {
  vorgang: BehoerdenVorgang
  onStatusChange: (id: string, status: BehoerdenVorgang['status']) => void
  onUpdate: (id: string, patch: Partial<BehoerdenVorgang>) => void
  onWiderspruch: (v: BehoerdenVorgang) => void
  updating: boolean
}) {
  const [editAktz, setEditAktz] = useState(false)
  const [aktzValue, setAktzValue] = useState(vorgang.aktenzeichen ?? '')
  const [editNotiz, setEditNotiz] = useState(false)
  const [notizValue, setNotizValue] = useState(vorgang.notizen ?? '')

  const cfg = STATUS_CONFIG[vorgang.status]
  const StatusIcon = cfg.icon

  const fristTage = vorgang.widerspruchsfrist_am
    ? tageBisZuDatum(vorgang.widerspruchsfrist_am)
    : null

  const fristKritisch = fristTage !== null && fristTage <= 7 && fristTage >= 0
  const fristAbgelaufen = fristTage !== null && fristTage < 0

  const NAECHSTE_STATUS: Record<BehoerdenVorgang['status'], BehoerdenVorgang['status'] | null> = {
    geplant:            'antrag_vorbereiten',
    antrag_vorbereiten: 'eingereicht',
    eingereicht:        'bewilligt',
    nachforderung:      'eingereicht',
    bewilligt:          'erledigt',
    abgelehnt:          'widerspruch',
    widerspruch:        'klage',
    klage:              'erledigt',
    erledigt:           null,
  }

  const naechsterStatus = NAECHSTE_STATUS[vorgang.status]

  return (
    <div className={`border rounded-xl p-4 bg-[--background] shadow-sm ${
      fristKritisch ? 'border-red-400 ring-1 ring-red-300' : 'border-[--border]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-sm text-[--foreground]">{vorgang.leistung_name}</h3>
          {vorgang.behoerde && (
            <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getBehoerdeColor(vorgang.behoerde)}`}>
              {vorgang.behoerde}
            </span>
          )}
        </div>
        <StatusBadge status={vorgang.status} />
      </div>

      {/* Widerspruchsfrist-Warnung */}
      {fristKritisch && (
        <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Widerspruchsfrist laeuft in {fristTage} Tag{fristTage === 1 ? '' : 'en'} ab!
        </div>
      )}
      {fristAbgelaufen && (
        <div className="mb-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
          <Clock className="w-4 h-4 flex-shrink-0" />
          Widerspruchsfrist abgelaufen ({formatDate(vorgang.widerspruchsfrist_am)})
        </div>
      )}

      {/* Datumsgitter */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[--muted-foreground] mb-3">
        {vorgang.eingereicht_am && (
          <>
            <span>Eingereicht:</span>
            <span className="font-medium text-[--foreground]">{formatDate(vorgang.eingereicht_am)}</span>
          </>
        )}
        {vorgang.bescheid_erwartet_am && (
          <>
            <span>Bescheid erwartet:</span>
            <span className="font-medium text-[--foreground]">{formatDate(vorgang.bescheid_erwartet_am)}</span>
          </>
        )}
        {vorgang.bescheid_erhalten_am && (
          <>
            <span>Bescheid erhalten:</span>
            <span className="font-medium text-[--foreground]">{formatDate(vorgang.bescheid_erhalten_am)}</span>
          </>
        )}
        {vorgang.widerspruchsfrist_am && !fristAbgelaufen && (
          <>
            <span>Widerspruchsfrist:</span>
            <span className={`font-medium ${fristKritisch ? 'text-red-600' : 'text-[--foreground]'}`}>
              {formatDate(vorgang.widerspruchsfrist_am)}
            </span>
          </>
        )}
        {vorgang.betrag_bewilligt_cent != null && vorgang.betrag_bewilligt_cent > 0 && (
          <>
            <span>Bewilligter Betrag:</span>
            <span className="font-semibold text-green-700">{formatCent(vorgang.betrag_bewilligt_cent)}</span>
          </>
        )}
      </div>

      {/* Aktenzeichen */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--muted-foreground]">Aktenzeichen:</span>
          {editAktz ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                className="flex-1 text-xs border border-[--border] rounded px-2 py-1 bg-[--background]"
                value={aktzValue}
                onChange={(e) => setAktzValue(e.target.value)}
                placeholder="Aktenzeichen eingeben"
              />
              <button
                onClick={() => {
                  onUpdate(vorgang.id, { aktenzeichen: aktzValue || null })
                  setEditAktz(false)
                }}
                className="text-xs px-2 py-1 bg-[--primary] text-white rounded hover:bg-[--secondary]"
              >
                OK
              </button>
              <button
                onClick={() => { setEditAktz(false); setAktzValue(vorgang.aktenzeichen ?? '') }}
                className="text-xs px-2 py-1 border border-[--border] rounded hover:bg-[--muted]"
              >
                X
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditAktz(true)}
              className="text-xs text-[--primary] hover:underline"
            >
              {vorgang.aktenzeichen || '+ eintragen'}
            </button>
          )}
        </div>
      </div>

      {/* Notizen */}
      <div className="mb-3">
        {editNotiz ? (
          <div className="space-y-1">
            <textarea
              className="w-full text-xs border border-[--border] rounded-lg px-2 py-1.5 bg-[--background] resize-none"
              rows={3}
              value={notizValue}
              onChange={(e) => setNotizValue(e.target.value)}
              placeholder="Notizen..."
            />
            <div className="flex gap-1">
              <button
                onClick={() => {
                  onUpdate(vorgang.id, { notizen: notizValue || null })
                  setEditNotiz(false)
                }}
                className="text-xs px-2 py-1 bg-[--primary] text-white rounded hover:bg-[--secondary]"
              >
                Speichern
              </button>
              <button
                onClick={() => { setEditNotiz(false); setNotizValue(vorgang.notizen ?? '') }}
                className="text-xs px-2 py-1 border border-[--border] rounded hover:bg-[--muted]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditNotiz(true)}
            className="text-xs text-[--muted-foreground] hover:text-[--foreground] text-left w-full"
          >
            {vorgang.notizen ? (
              <span className="line-clamp-2">{vorgang.notizen}</span>
            ) : (
              <span className="text-[--muted-foreground]/60 italic">+ Notiz hinzufuegen</span>
            )}
          </button>
        )}
      </div>

      {/* Aktionen */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-[--border]">
        {naechsterStatus && (
          <button
            onClick={() => onStatusChange(vorgang.id, naechsterStatus)}
            disabled={updating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[--primary] text-white rounded-lg hover:bg-[--secondary] disabled:opacity-60 transition-colors"
          >
            {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
            {STATUS_CONFIG[naechsterStatus].label}
          </button>
        )}
        {(vorgang.status === 'abgelehnt' || vorgang.status === 'nachforderung') && (
          <button
            onClick={() => onWiderspruch(vorgang)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Scale className="w-3 h-3" /> Widerspruch einlegen
          </button>
        )}
        {vorgang.status !== 'bewilligt' && vorgang.status !== 'erledigt' && (
          <button
            onClick={() => onStatusChange(vorgang.id, 'abgelehnt')}
            disabled={updating}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors"
          >
            <XCircle className="w-3 h-3" /> Als abgelehnt markieren
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Tab: LeistungsFinder ─────────────────────────────────────────────────────

function TabFinder({
  leistungen,
  onAddVorgang,
  addingId,
}: {
  leistungen: Sozialleistung[]
  onAddVorgang: (l: Sozialleistung) => Promise<void>
  addingId: string | null
}) {
  const [q, setQ] = useState('')
  const [pflegegrad, setPflegegrad] = useState<string>('')
  const [lebt, setLebt] = useState<string>('')
  const [rolle, setRolle] = useState<string>('')
  const [aktiveKategorien, setAktiveKategorien] = useState<Set<string>>(new Set())

  const toggleKategorie = useCallback((k: string) => {
    setAktiveKategorien((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const gefiltert = useMemo(() => {
    return leistungen.filter((l) => {
      if (q) {
        const ql = q.toLowerCase()
        if (
          !l.name.toLowerCase().includes(ql) &&
          !l.beschreibung?.toLowerCase().includes(ql) &&
          !l.rechtsgrundlage.toLowerCase().includes(ql) &&
          !l.kurzname?.toLowerCase().includes(ql)
        ) return false
      }

      if (aktiveKategorien.size > 0 && l.kategorie) {
        if (!aktiveKategorien.has(l.kategorie)) return false
      }

      if (pflegegrad && pflegegrad !== 'unbekannt') {
        const pg = parseInt(pflegegrad, 10)
        if (l.anspruchsvoraussetzungen) {
          const requiresPG = l.anspruchsvoraussetzungen.some((v) =>
            v.toLowerCase().includes('pflegegrad') || v.toLowerCase().includes('pg')
          )
          if (requiresPG) {
            const ok = l.anspruchsvoraussetzungen.some((v) => {
              const lower = v.toLowerCase()
              if (lower.includes(`pflegegrad ${pg}`) || lower.includes(`pg ${pg}`) || lower.includes(`pg${pg}`)) return true
              const rangeMatch = lower.match(/(\d)-(\d)/)
              if (rangeMatch) return pg >= parseInt(rangeMatch[1]) && pg <= parseInt(rangeMatch[2])
              const plusMatch = lower.match(/(\d)\+/)
              if (plusMatch) return pg >= parseInt(plusMatch[1])
              return false
            })
            if (!ok) return false
          }
        }
      }

      // Heim-Filter: hide home-only leistungen when 'heim' is selected
      if (lebt === 'heim') {
        const heimUngeeignet = ['wohnumfeld', 'verhinderung', 'haeusliche krankenpflege']
        if (heimUngeeignet.some((k) => l.name.toLowerCase().includes(k))) return false
      }

      // Rolle-Filter: pflegender Angehöriger vs pflegebeduerftiger
      if (rolle === 'angehoerig') {
        // Show leistungen relevant to caregivers
        const angehoerigerRelevant =
          l.kategorie === 'rente' ||
          l.kategorie === 'arbeit' ||
          l.name.toLowerCase().includes('kurs') ||
          l.name.toLowerCase().includes('pflegegeld') ||
          l.name.toLowerCase().includes('verhinderung') ||
          l.name.toLowerCase().includes('familien')
        if (!angehoerigerRelevant) return false
      }

      return true
    })
  }, [leistungen, q, aktiveKategorien, pflegegrad, lebt, rolle])

  return (
    <div className="space-y-5">
      {/* Filter Panel */}
      <div className="bg-[--muted]/30 rounded-xl p-4 border border-[--border] space-y-4">
        {/* Suchfeld */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
            placeholder="Leistung suchen... (z.B. Pflegegeld, Wohnumbau, Rente)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pflegegrad */}
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Pflegegrad</label>
            <select
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
              value={pflegegrad}
              onChange={(e) => setPflegegrad(e.target.value)}
            >
              <option value="">Alle / Unbekannt</option>
              <option value="unbekannt">Noch nicht festgestellt</option>
              <option value="1">Pflegegrad 1</option>
              <option value="2">Pflegegrad 2</option>
              <option value="3">Pflegegrad 3</option>
              <option value="4">Pflegegrad 4</option>
              <option value="5">Pflegegrad 5</option>
            </select>
          </div>

          {/* Wohnform */}
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Wohnform</label>
            <select
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
              value={lebt}
              onChange={(e) => setLebt(e.target.value)}
            >
              <option value="">Alle</option>
              <option value="zuhause">Zuhause</option>
              <option value="heim">Im Heim</option>
              <option value="beides">Beides (Uebergang)</option>
            </select>
          </div>

          {/* Rolle */}
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Ich bin...</label>
            <select
              className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
              value={rolle}
              onChange={(e) => setRolle(e.target.value)}
            >
              <option value="">Alle anzeigen</option>
              <option value="pflegebed">Pflegebeduerftiger</option>
              <option value="angehoerig">Pflegender Angehoeriger</option>
              <option value="beides">Beides</option>
            </select>
          </div>
        </div>

        {/* Kategorie-Chips */}
        <div>
          <label className="block text-xs font-medium text-[--muted-foreground] mb-2">Kategorie</label>
          <div className="flex flex-wrap gap-2">
            {KATEGORIEN.map((k) => (
              <button
                key={k.value}
                onClick={() => toggleKategorie(k.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  aktiveKategorien.has(k.value)
                    ? 'bg-[--primary] text-white'
                    : 'bg-[--muted] text-[--muted-foreground] hover:bg-[--border]'
                }`}
              >
                {k.label}
              </button>
            ))}
            {aktiveKategorien.size > 0 && (
              <button
                onClick={() => setAktiveKategorien(new Set())}
                className="px-3 py-1 rounded-full text-xs text-[--muted-foreground] hover:bg-[--muted] flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Alle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ergebnisse */}
      <div className="text-sm text-[--muted-foreground] mb-2">
        {gefiltert.length} Leistung{gefiltert.length !== 1 ? 'en' : ''} gefunden
      </div>

      <div className="space-y-3">
        {gefiltert.map((l) => (
          <LeistungsCard
            key={l.id}
            leistung={l}
            onAddVorgang={onAddVorgang}
            adding={addingId === l.id}
          />
        ))}
        {gefiltert.length === 0 && (
          <div className="text-center py-12 text-[--muted-foreground]">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Leistungen gefunden. Filter anpassen.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Meine Vorgaenge ─────────────────────────────────────────────────────

function TabVorgaenge({
  vorgaenge,
  onStatusChange,
  onUpdate,
  onWiderspruch,
  updatingId,
}: {
  vorgaenge: BehoerdenVorgang[]
  onStatusChange: (id: string, status: BehoerdenVorgang['status']) => void
  onUpdate: (id: string, patch: Partial<BehoerdenVorgang>) => void
  onWiderspruch: (v: BehoerdenVorgang) => void
  updatingId: string | null
}) {
  const totalBewilligt = vorgaenge
    .filter((v) => v.status === 'bewilligt' && v.betrag_bewilligt_cent)
    .reduce((sum, v) => sum + (v.betrag_bewilligt_cent ?? 0), 0)

  if (vorgaenge.length === 0) {
    return (
      <div className="text-center py-16 text-[--muted-foreground]">
        <ListChecks className="w-14 h-14 mx-auto mb-4 opacity-25" />
        <p className="font-medium mb-1">Noch keine Vorgaenge</p>
        <p className="text-sm">Besuche den Leistungs-Finder und fuege Leistungen als Vorgang hinzu.</p>
      </div>
    )
  }

  const offen = vorgaenge.filter((v) => !['erledigt', 'bewilligt'].includes(v.status))
  const abgeschlossen = vorgaenge.filter((v) => ['erledigt', 'bewilligt'].includes(v.status))

  return (
    <div className="space-y-5">
      {/* Zusammenfassung */}
      {totalBewilligt > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Bewilligte Leistungen gesamt</p>
            <p className="text-xl font-bold text-green-700">{formatCent(totalBewilligt)}/Monat</p>
          </div>
        </div>
      )}

      {offen.length > 0 && (
        <>
          <h3 className="font-semibold text-sm text-[--foreground]">
            Offene Vorgaenge ({offen.length})
          </h3>
          <div className="space-y-3">
            {offen.map((v) => (
              <VorgangCard
                key={v.id}
                vorgang={v}
                onStatusChange={onStatusChange}
                onUpdate={onUpdate}
                onWiderspruch={onWiderspruch}
                updating={updatingId === v.id}
              />
            ))}
          </div>
        </>
      )}

      {abgeschlossen.length > 0 && (
        <>
          <h3 className="font-semibold text-sm text-[--muted-foreground] mt-6">
            Abgeschlossen ({abgeschlossen.length})
          </h3>
          <div className="space-y-3 opacity-75">
            {abgeschlossen.map((v) => (
              <VorgangCard
                key={v.id}
                vorgang={v}
                onStatusChange={onStatusChange}
                onUpdate={onUpdate}
                onWiderspruch={onWiderspruch}
                updating={updatingId === v.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Antragsplan ─────────────────────────────────────────────────────────

function TabAntragsplan({
  leistungen,
  onAddVorgang,
  addingId,
}: {
  leistungen: Sozialleistung[]
  onAddVorgang: (l: Sozialleistung) => Promise<void>
  addingId: string | null
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [plan, setPlan] = useState<ReturnType<typeof erstelleAntragsplan> | null>(null)

  function toggleLeistung(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function generierePlan() {
    const selectedLeistungen = leistungen
      .filter((l) => selected.has(l.id))
      .map((l) => ({
        name: l.name,
        behoerde: l.behoerde,
        rechtsgrundlage: l.rechtsgrundlage,
      }))
    setPlan(erstelleAntragsplan(selectedLeistungen))
  }

  const leistungByName = useMemo(() => {
    const map = new Map<string, Sozialleistung>()
    leistungen.forEach((l) => map.set(l.name, l))
    return map
  }, [leistungen])

  if (plan) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Ihr persoenlicher Antragsplan</h3>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 border border-[--border] rounded-lg text-sm hover:bg-[--muted] transition-colors"
            >
              <Printer className="w-4 h-4" /> Drucken
            </button>
            <button
              onClick={() => setPlan(null)}
              className="flex items-center gap-2 px-3 py-1.5 border border-[--border] rounded-lg text-sm hover:bg-[--muted] transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Neu erstellen
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {plan.map((schritt) => {
            const leistung = leistungByName.get(schritt.leistung_name)
            return (
              <div
                key={schritt.reihenfolge}
                className="flex gap-4 bg-[--background] border border-[--border] rounded-xl p-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--primary] text-white flex items-center justify-center text-sm font-bold">
                  {schritt.reihenfolge}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="font-semibold text-sm">{schritt.leistung_name}</h4>
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${getBehoerdeColor(schritt.behoerde)}`}>
                        {schritt.behoerde}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
                      <Clock className="w-3.5 h-3.5" />
                      ca. {schritt.zeitaufwand_std} Std. Aufwand
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-[--muted-foreground]">{schritt.warum_jetzt}</p>

                  {schritt.voraussetzung_fuer && schritt.voraussetzung_fuer.length > 0 && (
                    <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1.5">
                      Voraussetzung fuer: {schritt.voraussetzung_fuer.slice(0, 3).join(', ')}
                      {schritt.voraussetzung_fuer.length > 3 && ` +${schritt.voraussetzung_fuer.length - 3} weitere`}
                    </div>
                  )}

                  {leistung && (
                    <button
                      onClick={() => onAddVorgang(leistung)}
                      disabled={addingId === leistung.id}
                      className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[--primary] text-white rounded-lg hover:bg-[--secondary] disabled:opacity-60 transition-colors"
                    >
                      {addingId === leistung.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Vorgang anlegen
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>So funktioniert der Antragsplan:</strong> Waehlen Sie alle Leistungen aus, die fuer Sie in Frage kommen.
        Der Navigator empfiehlt Ihnen dann die optimale Reihenfolge der Antragstellung.
      </div>

      <div>
        <h3 className="font-semibold mb-3 text-sm">
          Schritt 1: Welche Leistungen benoetigen Sie?
          {selected.size > 0 && (
            <span className="ml-2 text-[--primary] font-normal">{selected.size} ausgewaehlt</span>
          )}
        </h3>
        <div className="space-y-2">
          {leistungen.map((l) => (
            <label
              key={l.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.has(l.id)
                  ? 'border-[--primary] bg-[--primary]/5'
                  : 'border-[--border] hover:bg-[--muted]/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(l.id)}
                onChange={() => toggleLeistung(l.id)}
                className="rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{l.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-[--muted] text-[--muted-foreground] rounded font-mono">
                    {l.rechtsgrundlage}
                  </span>
                </div>
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${getBehoerdeColor(l.behoerde)}`}>
                  {l.behoerde}
                </span>
              </div>
              {l.leistungshoehe && (
                <span className="text-xs text-green-700 font-medium flex-shrink-0 hidden sm:block">
                  {l.leistungshoehe.split('|')[0].trim()}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={generierePlan}
        disabled={selected.size === 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[--primary] text-white rounded-xl font-semibold hover:bg-[--secondary] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Compass className="w-5 h-5" />
        Antragsplan generieren ({selected.size} Leistungen)
      </button>
    </div>
  )
}

// ─── Tab: Behoerden-Finder ────────────────────────────────────────────────────

function TabBehoerden({ behoerden }: { behoerden: BehoerdenEintrag[] }) {
  const [q, setQ] = useState('')

  const gefiltert = useMemo(() => {
    if (!q) return behoerden
    const ql = q.toLowerCase()
    return behoerden.filter(
      (b) =>
        b.name.toLowerCase().includes(ql) ||
        b.typ.toLowerCase().includes(ql) ||
        b.ort?.toLowerCase().includes(ql) ||
        b.plz?.includes(q)
    )
  }, [behoerden, q])

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
          placeholder="Nach PLZ, Ort oder Typ suchen..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Hinweisbox kostenlose Beratung */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4" /> Kostenlose Beratung bundesweit
        </div>
        <ul className="space-y-1 text-xs mt-2">
          <li>Pflegestuetzpunkte (bundesweit): Kostenlose, neutrale Pflegeberatung nach §7a SGB XI</li>
          <li>VdK Sozialrechtsberatung: 0800 282 00 9 (kostenlos, Mo-Fr)</li>
          <li>Pflegetelefon BMFSFJ: 030 20179131 (Mo-Do 9-18 Uhr)</li>
          <li>Verbraucherzentrale: Rechtsberatung zu Pflegevertraegen</li>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {gefiltert.map((b) => (
          <div
            key={b.id}
            className="border border-[--border] rounded-xl p-4 bg-[--background] space-y-3"
          >
            <div>
              <h3 className="font-semibold text-sm">{b.name}</h3>
              <span className={`inline-flex mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${getBehoerdeColor(b.typ)}`}>
                {b.typ}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-[--muted-foreground]">
              {(b.strasse || b.ort) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {b.strasse && <span>{b.strasse}, </span>}
                    {b.plz && <span>{b.plz} </span>}
                    {b.ort && <span>{b.ort}</span>}
                  </span>
                </div>
              )}
              {b.telefon && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <a href={`tel:${b.telefon.replace(/\s/g, '')}`} className="hover:text-[--primary] hover:underline">
                    {b.telefon}
                  </a>
                </div>
              )}
              {b.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <a href={`mailto:${b.email}`} className="hover:text-[--primary] hover:underline truncate">
                    {b.email}
                  </a>
                </div>
              )}
              {b.webseite && (
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  <a
                    href={b.webseite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[--primary] hover:underline truncate"
                  >
                    {b.webseite.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {b.oeffnungszeiten && (
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{b.oeffnungszeiten}</span>
                </div>
              )}
            </div>

            {b.zustaendig_fuer && b.zustaendig_fuer.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[--muted-foreground] mb-1">Zustaendig fuer:</p>
                <div className="flex flex-wrap gap-1">
                  {b.zustaendig_fuer.slice(0, 4).map((z, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-[--muted] rounded text-[--muted-foreground]">
                      {z}
                    </span>
                  ))}
                  {b.zustaendig_fuer.length > 4 && (
                    <span className="text-xs px-1.5 py-0.5 text-[--muted-foreground]">
                      +{b.zustaendig_fuer.length - 4} weitere
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {gefiltert.length === 0 && (
          <div className="col-span-2 text-center py-10 text-[--muted-foreground]">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Behoerde gefunden. Suchbegriff anpassen.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BehoerdenNavigatorClient({
  initialLeistungen,
  initialVorgaenge,
  initialBehoerden,
  isLoggedIn,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('finder')
  const [leistungen] = useState<Sozialleistung[]>(initialLeistungen)
  const [vorgaenge, setVorgaenge] = useState<BehoerdenVorgang[]>(initialVorgaenge)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [widerspruchVorgang, setWiderspruchVorgang] = useState<BehoerdenVorgang | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleAddVorgang = useCallback(
    async (leistung: Sozialleistung) => {
      if (!isLoggedIn) {
        showToast('Bitte anmelden um Vorgaenge zu speichern.', 'error')
        return
      }
      setAddingId(leistung.id)
      try {
        const res = await fetch('/api/behoerden/vorgaenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leistung_id: leistung.id,
            leistung_name: leistung.name,
            behoerde: leistung.behoerde,
          }),
        })
        if (!res.ok) throw new Error('Fehler beim Erstellen')
        const { vorgang } = await res.json()
        setVorgaenge((prev) => [{ ...vorgang, leistung }, ...prev])
        showToast(`"${leistung.name}" als Vorgang angelegt`)
        setActiveTab('vorgaenge')
      } catch {
        showToast('Fehler beim Erstellen des Vorgangs', 'error')
      } finally {
        setAddingId(null)
      }
    },
    [isLoggedIn]
  )

  const handleStatusChange = useCallback(
    async (id: string, status: BehoerdenVorgang['status']) => {
      setUpdatingId(id)
      try {
        const res = await fetch('/api/behoerden/vorgaenge', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        })
        if (!res.ok) throw new Error('Fehler')
        const { vorgang } = await res.json()
        setVorgaenge((prev) => prev.map((v) => (v.id === id ? { ...v, ...vorgang } : v)))
        showToast(`Status geaendert: ${STATUS_CONFIG[status].label}`)
      } catch {
        showToast('Fehler beim Aktualisieren', 'error')
      } finally {
        setUpdatingId(null)
      }
    },
    []
  )

  const handleUpdate = useCallback(
    async (id: string, patch: Partial<BehoerdenVorgang>) => {
      setUpdatingId(id)
      try {
        const res = await fetch('/api/behoerden/vorgaenge', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...patch }),
        })
        if (!res.ok) throw new Error('Fehler')
        const { vorgang } = await res.json()
        setVorgaenge((prev) => prev.map((v) => (v.id === id ? { ...v, ...vorgang } : v)))
        showToast('Gespeichert')
      } catch {
        showToast('Fehler beim Speichern', 'error')
      } finally {
        setUpdatingId(null)
      }
    },
    []
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Widerspruch Modal */}
      {widerspruchVorgang && (
        <WiderspruchModal
          vorgang={widerspruchVorgang}
          onClose={() => setWiderspruchVorgang(null)}
        />
      )}

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[--primary]/10">
            <Compass className="w-6 h-6 text-[--primary]" />
          </div>
          <h1 className="text-2xl font-bold text-[--foreground]">Behoerden-Navigator</h1>
        </div>
        <p className="text-[--muted-foreground] text-sm leading-relaxed max-w-2xl">
          Ihr Wegweiser durch den Antragsdschungel: Pflegekasse, Sozialamt, Versorgungsamt, Rentenversicherung
          und mehr. Finden Sie alle Leistungen, behalten Sie Ihre Antraege im Blick und erhalten Sie
          Schritt-fuer-Schritt-Unterstuetzung.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[--border] mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-[--primary] text-[--primary]'
                    : 'border-transparent text-[--muted-foreground] hover:text-[--foreground] hover:border-[--border]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'vorgaenge' && vorgaenge.length > 0 && (
                  <span className="text-xs bg-[--primary] text-white rounded-full px-1.5 py-0.5 leading-none">
                    {vorgaenge.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'finder' && (
          <TabFinder
            leistungen={leistungen}
            onAddVorgang={handleAddVorgang}
            addingId={addingId}
          />
        )}
        {activeTab === 'vorgaenge' && (
          <TabVorgaenge
            vorgaenge={vorgaenge}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
            onWiderspruch={setWiderspruchVorgang}
            updatingId={updatingId}
          />
        )}
        {activeTab === 'plan' && (
          <TabAntragsplan
            leistungen={leistungen}
            onAddVorgang={handleAddVorgang}
            addingId={addingId}
          />
        )}
        {activeTab === 'behoerden' && (
          <TabBehoerden behoerden={initialBehoerden} />
        )}
      </div>

      {/* Persistente Tipp-Box */}
      <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Wichtig:</strong> Reichen Sie Antraege immer <strong>SCHRIFTLICH</strong> ein
            und notieren Sie Datum und Aktenzeichen. Widerspruchsfristen sind meist{' '}
            <strong>4 Wochen nach Bescheiderhalt</strong> (§84 SGG) — lassen Sie diese nie
            verstreichen! Bei Unklarheiten wenden Sie sich an einen Pflegestuetzpunkt (kostenlos,
            bundesweit) oder den VdK: <strong>0800 282 00 9</strong>.
          </div>
        </div>
      </div>
    </div>
  )
}
