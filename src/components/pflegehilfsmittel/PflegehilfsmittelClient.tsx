'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShoppingCart,
  Package,
  Euro,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Info,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  berechneBudget,
  formatPGNummer,
  istVerbrauchshilfsmittel,
  generiereAntragText,
  MONATLICHES_BUDGET_CENT,
} from '@/lib/pflegehilfsmittel/budget'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pflegehilfsmittel {
  id: string
  name: string
  hersteller: string | null
  pg_nummer: string
  pg_bezeichnung: string
  hilfsmittel_nummer: string | null
  beschreibung: string | null
  indikation: string | null
  erstattungsfaehig: boolean
  erstattung_typ: 'verbrauch' | 'leih' | 'kauf'
  preis_cent: number | null
  einheit: string
  pflegegrad_ab: number
  lieferant_name: string | null
  lieferant_url: string | null
  aktiv: boolean
}

interface Antrag {
  id: string
  user_id: string
  hilfsmittel_id: string
  pflegegrad: number
  krankenkasse: string
  ikk_nummer: string | null
  status: 'entwurf' | 'eingereicht' | 'bewilligt' | 'abgelehnt' | 'widerspruch'
  verordnung_vorhanden: boolean
  arzt_name: string | null
  notizen: string | null
  eingereicht_am: string | null
  beschieden_am: string | null
  erstellt_am: string
  hilfsmittel?: Pick<Pflegehilfsmittel, 'id' | 'name' | 'pg_nummer' | 'pg_bezeichnung' | 'erstattung_typ' | 'preis_cent' | 'einheit' | 'hersteller'>
}

interface Ausgabe {
  id: string
  user_id: string
  hilfsmittel_id: string | null
  monat: string
  menge: number
  preis_cent: number | null
  erstattet_cent: number | null
  eigenanteil_cent: number | null
  erstellt_am: string
  hilfsmittel?: Pick<Pflegehilfsmittel, 'id' | 'name' | 'erstattungsfaehig' | 'erstattung_typ'>
}

interface Props {
  initialProdukte: Pflegehilfsmittel[]
  initialAntraege: Antrag[]
  initialAusgaben: Ausgabe[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PG_OPTIONEN = [
  { value: '', label: 'Alle Produktgruppen' },
  { value: '54', label: 'PG 54 – Inkontinenzmaterial' },
  { value: '51', label: 'PG 51 – Verbrauchshilfsmittel' },
  { value: '26', label: 'PG 26 – Badehilfen' },
  { value: '22', label: 'PG 22 – Gehhilfen' },
  { value: '18', label: 'PG 18 – Pflegebetten' },
  { value: '11', label: 'PG 11 – Kompressionsstrümpfe' },
  { value: '50', label: 'PG 50 – Orthesen' },
  { value: '99', label: 'PG 99 – Sonstiges' },
]

const ERSTATTUNG_TYP_OPTIONEN = [
  { value: '', label: 'Alle Erstattungstypen' },
  { value: 'verbrauch', label: 'Zum Verbrauch (§40)' },
  { value: 'leih', label: 'Leihweise' },
  { value: 'kauf', label: 'Kauf' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  entwurf:      { label: 'Entwurf',       color: 'bg-gray-100 text-gray-700',   icon: <Clock className="h-3.5 w-3.5" /> },
  eingereicht:  { label: 'Eingereicht',   color: 'bg-blue-100 text-blue-700',   icon: <ArrowRight className="h-3.5 w-3.5" /> },
  bewilligt:    { label: 'Bewilligt',     color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  abgelehnt:    { label: 'Abgelehnt',     color: 'bg-red-100 text-red-700',     icon: <XCircle className="h-3.5 w-3.5" /> },
  widerspruch:  { label: 'Widerspruch',   color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
}

const PG_FARBEN: Record<string, string> = {
  '54': 'bg-blue-100 text-blue-800 border-blue-200',
  '51': 'bg-green-100 text-green-800 border-green-200',
  '26': 'bg-purple-100 text-purple-800 border-purple-200',
  '22': 'bg-orange-100 text-orange-800 border-orange-200',
  '18': 'bg-red-100 text-red-800 border-red-200',
  '11': 'bg-teal-100 text-teal-800 border-teal-200',
  '50': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  '99': 'bg-gray-100 text-gray-700 border-gray-200',
}

const ERSTATTUNG_BADGE: Record<string, string> = {
  verbrauch: 'bg-emerald-100 text-emerald-800',
  leih:      'bg-sky-100 text-sky-800',
  kauf:      'bg-gray-100 text-gray-700',
}

const ERSTATTUNG_LABEL: Record<string, string> = {
  verbrauch: 'Verbrauch §40',
  leih:      'Leihweise',
  kauf:      'Kauf',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCent(cent: number | null | undefined): string {
  if (cent == null) return '—'
  if (cent === 0) return 'kostenlos'
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function aktuellerMonat(): string {
  return new Date().toISOString().slice(0, 7)
}

function monatsNavigation(monat: string, delta: number): string {
  const [y, m] = monat.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monatsLabel(monat: string): string {
  const [y, m] = monat.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HilfsmittelCard({
  produkt,
  onAntragStellen,
}: {
  produkt: Pflegehilfsmittel
  onAntragStellen: (p: Pflegehilfsmittel) => void
}) {
  const pgFarbe = PG_FARBEN[produkt.pg_nummer] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${pgFarbe}`}>
            <Tag className="h-3 w-3" />
            {formatPGNummer(produkt.pg_nummer)}
          </span>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${ERSTATTUNG_BADGE[produkt.erstattung_typ]}`}>
            {ERSTATTUNG_LABEL[produkt.erstattung_typ]}
          </span>
          {!produkt.erstattungsfaehig && (
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              Nicht erstattbar
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{produkt.name}</h3>
        {produkt.hersteller && (
          <p className="text-xs text-gray-500 mb-2">{produkt.hersteller}</p>
        )}
        {produkt.beschreibung && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-3">{produkt.beschreibung}</p>
        )}
        {produkt.indikation && (
          <p className="text-xs text-gray-500 italic mb-2">
            <span className="font-medium not-italic">Indikation:</span> {produkt.indikation}
          </p>
        )}
      </div>

      <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex items-center justify-between gap-2 mt-auto">
        <div>
          <span className="text-lg font-bold text-gray-900">{formatCent(produkt.preis_cent)}</span>
          {produkt.preis_cent !== 0 && (
            <span className="text-xs text-gray-500 ml-1">/ {produkt.einheit}</span>
          )}
          {produkt.pflegegrad_ab > 1 && (
            <p className="text-xs text-gray-400">ab Pflegegrad {produkt.pflegegrad_ab}</p>
          )}
        </div>
        <button
          onClick={() => onAntragStellen(produkt)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Antrag stellen
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.entwurf
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Antrag Modal ─────────────────────────────────────────────────────────────

interface AntragModalProps {
  produkt: Pflegehilfsmittel
  onClose: () => void
  onSuccess: (antrag: Antrag) => void
}

function AntragModal({ produkt, onClose, onSuccess }: AntragModalProps) {
  const [schritt, setSchritt] = useState<1 | 2>(1)
  const [pflegegrad, setPflegegrad] = useState<number>(2)
  const [krankenkasse, setKrankenkasse] = useState('')
  const [ikkNummer, setIkkNummer] = useState('')
  const [verordnung, setVerordnung] = useState(false)
  const [arztName, setArztName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState<Antrag | null>(null)

  const handleSubmit = async () => {
    if (!krankenkasse.trim()) {
      setFehler('Bitte Krankenkasse angeben.')
      return
    }
    setLoading(true)
    setFehler(null)
    try {
      const res = await fetch('/api/pflegehilfsmittel/antraege', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hilfsmittel_id: produkt.id,
          pflegegrad,
          krankenkasse: krankenkasse.trim(),
          ikk_nummer: ikkNummer.trim() || undefined,
          verordnung_vorhanden: verordnung,
          arzt_name: arztName.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Fehler')
      setErfolg(json.antrag)
      onSuccess(json.antrag)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const handlePDFDownload = () => {
    const text = generiereAntragText({
      nutzer: {
        name: '(Ihr Name)',
        geburtsdatum: '(Ihr Geburtsdatum)',
        adresse: '(Ihre Adresse)',
        krankenkasse,
      },
      hilfsmittel: {
        name: produkt.name,
        pg_nummer: produkt.pg_nummer,
        hilfsmittel_nummer: produkt.hilfsmittel_nummer ?? undefined,
      },
      pflegegrad,
      arzt: { name: arztName || '(Name des Arztes)' },
    })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Antrag_Pflegehilfsmittel_${produkt.name.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-base">Antrag stellen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {erfolg ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h3 className="font-semibold text-gray-900">Antrag wurde gespeichert!</h3>
                <p className="text-sm text-gray-500 text-center">
                  Ihr Antrag für <strong>{produkt.name}</strong> wurde als Entwurf angelegt.
                  Reichen Sie ihn bei Ihrer Krankenkasse ein.
                </p>
              </div>
              <button
                onClick={handlePDFDownload}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2.5 rounded-xl transition-colors"
              >
                <Download className="h-4 w-4" />
                Antrag als Textdatei herunterladen
              </button>
            </div>
          ) : (
            <>
              {/* Schritt-Anzeige */}
              <div className="flex items-center gap-2 mb-4">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      s === schritt ? 'bg-indigo-600 text-white' : s < schritt ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {s < schritt ? '✓' : s}
                    </div>
                    {s < 2 && <div className="h-px w-8 bg-gray-200" />}
                  </div>
                ))}
                <span className="text-xs text-gray-500 ml-1">
                  {schritt === 1 ? 'Produktdetails' : 'Antragsdaten'}
                </span>
              </div>

              {schritt === 1 ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <h3 className="font-semibold text-gray-900">{produkt.name}</h3>
                    {produkt.hersteller && <p className="text-sm text-gray-500">{produkt.hersteller}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ERSTATTUNG_BADGE[produkt.erstattung_typ]}`}>
                        {ERSTATTUNG_LABEL[produkt.erstattung_typ]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PG_FARBEN[produkt.pg_nummer] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {formatPGNummer(produkt.pg_nummer)}
                      </span>
                    </div>
                    {produkt.preis_cent != null && (
                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        {formatCent(produkt.preis_cent)} / {produkt.einheit}
                      </p>
                    )}
                  </div>

                  {produkt.indikation && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Indikation</p>
                      <p className="text-sm text-gray-600">{produkt.indikation}</p>
                    </div>
                  )}

                  {produkt.beschreibung && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Beschreibung</p>
                      <p className="text-sm text-gray-600">{produkt.beschreibung}</p>
                    </div>
                  )}

                  {istVerbrauchshilfsmittel(produkt.erstattung_typ) && produkt.erstattungsfaehig && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-800">§40 SGB XI – Erstattungsfähig</p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Dieses Produkt ist ein zum Verbrauch bestimmtes Pflegehilfsmittel.
                            Ihre Pflegekasse übernimmt die Kosten bis zu 40 € pro Monat.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pflegegrad <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pflegegrad}
                      onChange={(e) => setPflegegrad(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5].map((pg) => (
                        <option key={pg} value={pg}>Pflegegrad {pg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Krankenkasse <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={krankenkasse}
                      onChange={(e) => setKrankenkasse(e.target.value)}
                      placeholder="z. B. AOK Bayern"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      IKK-Nummer (optional)
                    </label>
                    <input
                      type="text"
                      value={ikkNummer}
                      onChange={(e) => setIkkNummer(e.target.value)}
                      placeholder="Institutionskennzeichen"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={verordnung}
                      onClick={() => setVerordnung((v) => !v)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        verordnung ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                          verordnung ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700">Ärztliche Verordnung vorhanden</span>
                  </div>

                  {verordnung && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Name des Arztes / der Ärztin
                      </label>
                      <input
                        type="text"
                        value={arztName}
                        onChange={(e) => setArztName(e.target.value)}
                        placeholder="Dr. Musterfrau"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  {fehler && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{fehler}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!erfolg && (
          <div className="px-6 py-4 border-t flex justify-between gap-2">
            {schritt === 1 ? (
              <>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2">
                  Abbrechen
                </button>
                <button
                  onClick={() => setSchritt(2)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  Weiter <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSchritt(1)} className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2 flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Antrag erstellen
                </button>
              </>
            )}
          </div>
        )}

        {erfolg && (
          <div className="px-6 py-4 border-t flex justify-end">
            <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Ausgabe Modal ────────────────────────────────────────────────────────────

interface AusgabeModalProps {
  produkte: Pflegehilfsmittel[]
  monat: string
  onClose: () => void
  onSuccess: (ausgabe: Ausgabe) => void
}

function AusgabeModal({ produkte, monat, onClose, onSuccess }: AusgabeModalProps) {
  const [hilfsmittelId, setHilfsmittelId] = useState('')
  const [menge, setMenge] = useState(1)
  const [preisCent, setPreisCent] = useState('')
  const [erstattungCent, setErstattungCent] = useState('')
  const [loading, setLoading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async () => {
    if (!hilfsmittelId) { setFehler('Bitte Produkt wählen.'); return }
    if (!preisCent) { setFehler('Bitte Preis eingeben.'); return }

    setLoading(true)
    setFehler(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const pCent = Math.round(parseFloat(preisCent.replace(',', '.')) * 100)
      const eCent = erstattungCent ? Math.round(parseFloat(erstattungCent.replace(',', '.')) * 100) : 0

      const { data, error } = await supabase
        .from('hilfsmittel_ausgaben')
        .insert({
          user_id:        user.id,
          hilfsmittel_id: hilfsmittelId,
          monat:          `${monat}-01`,
          menge,
          preis_cent:     pCent,
          erstattet_cent: eCent,
        })
        .select('*, hilfsmittel:pflegehilfsmittel(id, name, erstattungsfaehig, erstattung_typ)')
        .single()

      if (error) throw error
      onSuccess(data as Ausgabe)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">Ausgabe hinzufügen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Produkt *</label>
            <select
              value={hilfsmittelId}
              onChange={(e) => setHilfsmittelId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Produkt wählen —</option>
              {produkte.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Menge</label>
            <input
              type="number"
              min={1}
              value={menge}
              onChange={(e) => setMenge(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Preis (€) *</label>
            <input
              type="text"
              value={preisCent}
              onChange={(e) => setPreisCent(e.target.value)}
              placeholder="z. B. 3,99"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Erstattungsbetrag (€)</label>
            <input
              type="text"
              value={erstattungCent}
              onChange={(e) => setErstattungCent(e.target.value)}
              placeholder="z. B. 3,99 oder leer lassen"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {fehler && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />{fehler}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t flex justify-between gap-2">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2">Abbrechen</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2 rounded-lg flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 1: Produktkatalog ────────────────────────────────────────────────────

function ProduktTab({
  produkte,
  loading,
  onAntragErfolgreich,
}: {
  produkte: Pflegehilfsmittel[]
  loading: boolean
  onAntragErfolgreich: (a: Antrag) => void
}) {
  const [suchbegriff, setSuchbegriff]       = useState('')
  const [pgFilter, setPgFilter]             = useState('')
  const [typFilter, setTypFilter]           = useState('')
  const [nurErstattbar, setNurErstattbar]   = useState(false)
  const [maxPreis, setMaxPreis]             = useState(500)
  const [antragProdukt, setAntragProdukt]   = useState<Pflegehilfsmittel | null>(null)
  const [filterOffen, setFilterOffen]       = useState(false)

  const gefiltert = useMemo(() => {
    return produkte.filter((p) => {
      if (pgFilter && p.pg_nummer !== pgFilter) return false
      if (typFilter && p.erstattung_typ !== typFilter) return false
      if (nurErstattbar && !p.erstattungsfaehig) return false
      if (p.preis_cent != null && p.preis_cent > 0 && p.preis_cent > maxPreis * 100) return false
      if (suchbegriff) {
        const q = suchbegriff.toLowerCase()
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.beschreibung ?? '').toLowerCase().includes(q) &&
          !(p.hersteller ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [produkte, pgFilter, typFilter, nurErstattbar, maxPreis, suchbegriff])

  return (
    <div>
      {/* Suchzeile */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
            placeholder="Produkt suchen..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {suchbegriff && (
            <button onClick={() => setSuchbegriff('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFilterOffen((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
            filterOffen ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filter
          {filterOffen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Filter-Panel */}
      {filterOffen && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Produktgruppe</label>
            <select
              value={pgFilter}
              onChange={(e) => setPgFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PG_OPTIONEN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Erstattungstyp</label>
            <select
              value={typFilter}
              onChange={(e) => setTypFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ERSTATTUNG_TYP_OPTIONEN.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max. Preis: {maxPreis >= 500 ? '500€+' : `${maxPreis} €`}
            </label>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={maxPreis}
              onChange={(e) => setMaxPreis(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <button
              type="button"
              role="switch"
              aria-checked={nurErstattbar}
              onClick={() => setNurErstattbar((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${
                nurErstattbar ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                nurErstattbar ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-sm text-gray-700">Nur erstattungsfähig</span>
          </div>
        </div>
      )}

      {/* Ergebnis-Anzahl */}
      <p className="text-xs text-gray-500 mb-3">
        {loading ? 'Lade Produkte…' : `${gefiltert.length} Produkte gefunden`}
      </p>

      {/* Produkt-Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : gefiltert.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500 font-medium">Keine Produkte gefunden</p>
          <p className="text-sm text-gray-400">Bitte Filter anpassen oder Suchbegriff ändern.</p>
          <button
            onClick={() => { setSuchbegriff(''); setPgFilter(''); setTypFilter(''); setNurErstattbar(false); setMaxPreis(500) }}
            className="text-indigo-600 hover:underline text-sm flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefiltert.map((p) => (
            <HilfsmittelCard key={p.id} produkt={p} onAntragStellen={setAntragProdukt} />
          ))}
        </div>
      )}

      {antragProdukt && (
        <AntragModal
          produkt={antragProdukt}
          onClose={() => setAntragProdukt(null)}
          onSuccess={(a) => { onAntragErfolgreich(a); setAntragProdukt(null) }}
        />
      )}
    </div>
  )
}

// ─── Tab 2: Budget-Tracker ───────────────────────────────────────────────────

function BudgetTab({
  produkte,
  initialAusgaben,
}: {
  produkte: Pflegehilfsmittel[]
  initialAusgaben: Ausgabe[]
}) {
  const [monat, setMonat] = useState(aktuellerMonat())
  const [alleAusgaben, setAlleAusgaben] = useState<Ausgabe[]>(initialAusgaben)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const monatsAusgaben = useMemo(() =>
    alleAusgaben.filter((a) => a.monat.startsWith(monat)),
    [alleAusgaben, monat]
  )

  const ladeAusgaben = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('hilfsmittel_ausgaben')
      .select('*, hilfsmittel:pflegehilfsmittel(id, name, erstattungsfaehig, erstattung_typ)')
      .eq('user_id', user.id)
      .order('erstellt_am', { ascending: false })

    if (data) setAlleAusgaben(data as Ausgabe[])
    setLoading(false)
  }, [supabase])

  // Jahresausgaben
  const jahr = monat.slice(0, 4)
  const jahresAusgaben = useMemo(() =>
    alleAusgaben.filter((a) => a.monat.startsWith(jahr)),
    [alleAusgaben, jahr]
  )

  const budget = useMemo(() => {
    if (monatsAusgaben.length === 0) {
      return {
        monat,
        budget_gesamt: MONATLICHES_BUDGET_CENT,
        ausgaben_erstattungsfaehig: 0,
        ausgaben_eigenanteil: 0,
        budget_verbleibend: MONATLICHES_BUDGET_CENT,
        jahresbudget_verbleibend: MONATLICHES_BUDGET_CENT * 12,
      }
    }
    return berechneBudget(
      monatsAusgaben.map((a) => ({
        preis_cent: a.preis_cent ?? 0,
        erstattet_cent: a.erstattet_cent ?? 0,
        monat: a.monat,
        hilfsmittel: {
          erstattungsfaehig: a.hilfsmittel?.erstattungsfaehig ?? false,
          erstattung_typ: a.hilfsmittel?.erstattung_typ ?? 'kauf',
        },
      }))
    )
  }, [monatsAusgaben, monat])

  const verbrauchProzent = Math.min(100,
    Math.round((budget.ausgaben_erstattungsfaehig / MONATLICHES_BUDGET_CENT) * 100)
  )

  const jahresVerbrauch = jahresAusgaben.reduce((s, a) => s + (a.erstattet_cent ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Monatsnavigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => setMonat((m) => monatsNavigation(m, -1))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-base font-semibold text-gray-800 min-w-36 text-center">{monatsLabel(monat)}</h3>
        <button onClick={() => setMonat((m) => monatsNavigation(m, 1))} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
        <button onClick={ladeAusgaben} disabled={loading} className="ml-auto text-gray-400 hover:text-gray-600 p-2 rounded-lg">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Budget-Karte */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">§40 Monatsbudget</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">40,00 €</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Verbleibend</p>
            <p className={`text-xl font-bold ${budget.budget_verbleibend <= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCent(budget.budget_verbleibend)}
            </p>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${verbrauchProzent >= 100 ? 'bg-red-500' : verbrauchProzent >= 80 ? 'bg-orange-400' : 'bg-emerald-500'}`}
            style={{ width: `${verbrauchProzent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-500">
          <span>Erstattet: {formatCent(budget.ausgaben_erstattungsfaehig)}</span>
          <span>{verbrauchProzent}% verbraucht</span>
        </div>
        {budget.ausgaben_eigenanteil > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Eigenanteil diesen Monat: <strong>{formatCent(budget.ausgaben_eigenanteil)}</strong>
          </p>
        )}
      </div>

      {/* Ausgaben-Liste */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h4 className="font-semibold text-gray-800 text-sm">Ausgaben {monatsLabel(monat)}</h4>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" /> Ausgabe hinzufügen
          </button>
        </div>

        {monatsAusgaben.length === 0 ? (
          <div className="py-10 text-center">
            <Euro className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine Ausgaben in diesem Monat</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {monatsAusgaben.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.hilfsmittel?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">Menge: {a.menge}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-800">{formatCent(a.preis_cent)}</p>
                  <p className="text-xs text-green-600">Erstattet: {formatCent(a.erstattet_cent)}</p>
                  {(a.eigenanteil_cent ?? 0) > 0 && (
                    <p className="text-xs text-red-500">Eigenanteil: {formatCent(a.eigenanteil_cent)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jahresübersicht */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
        <h4 className="font-semibold text-indigo-900 text-sm mb-2">Jahresübersicht {jahr}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-indigo-600">§40-Budget genutzt YTD</p>
            <p className="text-lg font-bold text-indigo-900">{formatCent(jahresVerbrauch)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-600">Jahresbudget gesamt</p>
            <p className="text-lg font-bold text-indigo-900">{formatCent(MONATLICHES_BUDGET_CENT * 12)}</p>
          </div>
        </div>
      </div>

      {showModal && (
        <AusgabeModal
          produkte={produkte}
          monat={monat}
          onClose={() => setShowModal(false)}
          onSuccess={(a) => { setAlleAusgaben((prev) => [a, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

// ─── Tab 3: Meine Anträge ─────────────────────────────────────────────────────

function AntraegeTab({ initialAntraege }: { initialAntraege: Antrag[] }) {
  const [antraege, setAntraege] = useState<Antrag[]>(initialAntraege)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const ladeAntraege = useCallback(async () => {
    const res = await fetch('/api/pflegehilfsmittel/antraege')
    if (res.ok) {
      const json = await res.json()
      setAntraege(json.antraege ?? [])
    }
  }, [])

  const statusAendern = async (id: string, status: Antrag['status']) => {
    setLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/pflegehilfsmittel/antraege', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        const json = await res.json()
        setAntraege((prev) => prev.map((a) => a.id === id ? { ...a, ...json.antrag } : a))
      }
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (antraege.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <FileText className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Noch keine Anträge</p>
        <p className="text-sm text-gray-400">Stellen Sie einen Antrag über den Produktkatalog.</p>
        <button onClick={ladeAntraege} className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Aktualisieren
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={ladeAntraege} className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Aktualisieren
        </button>
      </div>

      {antraege.map((antrag) => {
        const isExpanded = expandedId === antrag.id
        const busy = loading[antrag.id] ?? false

        return (
          <div key={antrag.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : antrag.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {antrag.hilfsmittel?.name ?? 'Pflegehilfsmittel'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Erstellt: {new Date(antrag.erstellt_am).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={antrag.status} />
                {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-4 border-t border-gray-100 space-y-3">
                {/* Status-Timeline */}
                <div className="flex items-center gap-2 pt-3 flex-wrap">
                  {['entwurf', 'eingereicht', 'bewilligt'].map((s, i) => {
                    const steps = ['entwurf', 'eingereicht', 'bewilligt', 'abgelehnt']
                    const currentIdx = steps.indexOf(antrag.status)
                    const stepIdx = i
                    const done = stepIdx <= currentIdx && antrag.status !== 'abgelehnt'
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span className="text-xs text-gray-500 capitalize">{STATUS_CONFIG[s]?.label}</span>
                        {i < 2 && <div className="h-px w-4 bg-gray-200" />}
                      </div>
                    )
                  })}
                  {antrag.status === 'abgelehnt' && (
                    <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Abgelehnt
                    </span>
                  )}
                  {antrag.status === 'widerspruch' && (
                    <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Widerspruch eingelegt
                    </span>
                  )}
                </div>

                {/* Detaildaten */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div>
                    <span className="font-medium text-gray-600">Krankenkasse:</span>{' '}
                    <span className="text-gray-800">{antrag.krankenkasse}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Pflegegrad:</span>{' '}
                    <span className="text-gray-800">{antrag.pflegegrad}</span>
                  </div>
                  {antrag.hilfsmittel && (
                    <div>
                      <span className="font-medium text-gray-600">Produktgruppe:</span>{' '}
                      <span className="text-gray-800">{formatPGNummer(antrag.hilfsmittel.pg_nummer)}</span>
                    </div>
                  )}
                  {antrag.arzt_name && (
                    <div>
                      <span className="font-medium text-gray-600">Arzt/Ärztin:</span>{' '}
                      <span className="text-gray-800">{antrag.arzt_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-600">Verordnung:</span>{' '}
                    <span className="text-gray-800">{antrag.verordnung_vorhanden ? 'Ja' : 'Nein'}</span>
                  </div>
                  {antrag.eingereicht_am && (
                    <div>
                      <span className="font-medium text-gray-600">Eingereicht am:</span>{' '}
                      <span className="text-gray-800">{new Date(antrag.eingereicht_am).toLocaleDateString('de-DE')}</span>
                    </div>
                  )}
                </div>

                {/* Aktions-Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {antrag.status === 'entwurf' && (
                    <button
                      onClick={() => statusAendern(antrag.id, 'eingereicht')}
                      disabled={busy}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      Eingereicht melden
                    </button>
                  )}
                  {antrag.status === 'abgelehnt' && (
                    <button
                      onClick={() => statusAendern(antrag.id, 'widerspruch')}
                      disabled={busy}
                      className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      Widerspruch einlegen
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Haupt-Client-Komponente ─────────────────────────────────────────────────

export function PflegehilfsmittelClient({
  initialProdukte,
  initialAntraege,
  initialAusgaben,
}: Props) {
  const [aktiveTab, setAktiveTab] = useState<'katalog' | 'budget' | 'antraege'>('katalog')
  const [produkte, setProdukte] = useState<Pflegehilfsmittel[]>(initialProdukte)
  const [antraege, setAntraege] = useState<Antrag[]>(initialAntraege)
  const [loading, setLoading] = useState(false)

  // Budget-Chip: aktueller Monat Verbrauch
  const aktMonat = aktuellerMonat()
  const aktAusgaben = initialAusgaben.filter((a) => a.monat.startsWith(aktMonat))
  const budgetVerbraucht = aktAusgaben.reduce((s, a) => s + (a.erstattet_cent ?? 0), 0)
  const budgetVerbleibend = Math.max(0, MONATLICHES_BUDGET_CENT - budgetVerbraucht)

  const ladeProdukte = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pflegehilfsmittel')
      if (res.ok) {
        const json = await res.json()
        setProdukte(json.produkte ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialProdukte.length === 0) {
      ladeProdukte()
    }
  }, [initialProdukte.length, ladeProdukte])

  const tabs = [
    { key: 'katalog' as const,  label: 'Produktkatalog', icon: <Package className="h-4 w-4" /> },
    { key: 'budget' as const,   label: 'Budget-Tracker', icon: <Euro className="h-4 w-4" /> },
    { key: 'antraege' as const, label: 'Meine Anträge',  icon: <FileText className="h-4 w-4" />, badge: antraege.filter((a) => a.status === 'entwurf').length || undefined },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pflegehilfsmittel-Marktplatz</h1>
          <p className="text-sm text-gray-500 mt-1">
            Beantragen Sie Pflegehilfsmittel nach §40 SGB XI und verwalten Sie Ihr monatliches Budget.
          </p>
        </div>
        {/* Budget-Chip */}
        <div className="flex-shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-0.5">Monatliches Budget (§40)</p>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-gray-900">40,00 €</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-emerald-700 font-medium">
              noch {formatCent(budgetVerbleibend)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAktiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
                aktiveTab === tab.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className="ml-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div>
        {aktiveTab === 'katalog' && (
          <ProduktTab
            produkte={produkte}
            loading={loading}
            onAntragErfolgreich={(a) => setAntraege((prev) => [a, ...prev])}
          />
        )}
        {aktiveTab === 'budget' && (
          <BudgetTab
            produkte={produkte}
            initialAusgaben={initialAusgaben}
          />
        )}
        {aktiveTab === 'antraege' && (
          <AntraegeTab initialAntraege={antraege} />
        )}
      </div>

      {/* Info-Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">§40 SGB XI – Ihr Anspruch auf Pflegehilfsmittel</p>
            <p className="text-sm text-blue-800 leading-relaxed">
              Sie haben Anspruch auf zum Verbrauch bestimmte Pflegehilfsmittel (z. B. Einmalhandschuhe,
              Desinfektionsmittel) bis zu <strong>40 € monatlich</strong> von Ihrer Pflegekasse. Zusätzlich
              können technische Hilfsmittel (z. B. Rollator, Pflegebett) leihweise oder als Kauf beantragt
              werden. Für Verbrauchsmittel ist in der Regel keine ärztliche Verordnung erforderlich.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
