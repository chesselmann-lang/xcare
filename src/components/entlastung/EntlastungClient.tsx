'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Heart, Users, Search, MapPin, Globe, Calendar, Phone, Mail, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Plus, Trash2,
  TrendingUp, TrendingDown, Minus, Info, FileText, Euro, ArrowRight,
  Shield, HelpCircle, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ZARIT_FRAGEN,
  ZARIT_ANTWORTEN,
  interpretiereZaritScore,
  berechneZaritScore,
  berechneVerhinderungspflege,
  berechneEntlastungsbetrag,
  centToEuro,
  VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT,
  VERHINDERUNGSPFLEGE_MAX_TAGE,
  ENTLASTUNGSBETRAG_MONAT_CENT,
  ENTLASTUNGSBETRAG_JAHR_CENT,
  ANERKANNTE_LEISTUNGEN_45B,
  type Belastungsstufe,
} from '@/lib/entlastung/zarit'

// ============================================================
// Types
// ============================================================

interface Selbsthilfegruppe {
  id: string
  name: string
  typ: 'praesenz' | 'online' | 'hybrid'
  thema: string
  beschreibung: string | null
  plz: string | null
  ort: string | null
  bundesland: string | null
  treffen_rhythmus: string | null
  kontakt_email: string | null
  kontakt_telefon: string | null
  webseite: string | null
  veranstalter: string | null
}

interface BurnoutScreening {
  id: string
  gesamt_score: number
  belastungsstufe: Belastungsstufe
  empfehlungen: string[] | null
  erstellt_am: string
}

interface VerhinderungspflegePlan {
  id: string
  pflegegrad: number
  jahres_budget_cent: number
  eingesetzt_cent: number
  planung: PlanungsEintrag[] | null
  notizen: string | null
}

interface PlanungsEintrag {
  id: string
  von: string
  bis: string
  grund: 'urlaub' | 'krankheit' | 'beruf' | 'sonstiges'
  vertreter_typ: 'ambulanter_dienst' | 'private_ersatzpflegeperson'
}

interface EntlastungAusgabe {
  id: string
  monat: string
  leistung: string
  anbieter: string | null
  betrag_cent: number
  erstattet_cent: number | null
  anerkannt: boolean
}

interface EntlastungClientProps {
  initialGruppen: Selbsthilfegruppe[]
  lastScreening: BurnoutScreening | null
  screeningHistory: BurnoutScreening[]
  verhinderungPlan: VerhinderungspflegePlan | null
  entlastungAusgaben: EntlastungAusgabe[]
}

// ============================================================
// Constants
// ============================================================

const THEMEN_FILTER = ['Alle', 'Demenz', 'Schlaganfall', 'MS', 'Parkinson', 'Psychiatrie', 'Allgemeine Pflege', 'Englisch']
const FRAGEN_PRO_SEITE = 5

const BELASTUNG_CONFIG: Record<Belastungsstufe, {
  label: string
  farbe: string
  bgFarbe: string
  textFarbe: string
  borderFarbe: string
  icon: typeof CheckCircle2
}> = {
  niedrig: {
    label: 'Niedrige Belastung',
    farbe: 'green',
    bgFarbe: 'bg-green-50',
    textFarbe: 'text-green-800',
    borderFarbe: 'border-green-200',
    icon: CheckCircle2,
  },
  moderat: {
    label: 'Moderate Belastung',
    farbe: 'yellow',
    bgFarbe: 'bg-amber-50',
    textFarbe: 'text-amber-800',
    borderFarbe: 'border-amber-200',
    icon: AlertCircle,
  },
  hoch: {
    label: 'Hohe Belastung',
    farbe: 'orange',
    bgFarbe: 'bg-orange-50',
    textFarbe: 'text-orange-800',
    borderFarbe: 'border-orange-200',
    icon: AlertCircle,
  },
  sehr_hoch: {
    label: 'Sehr hohe Belastung',
    farbe: 'red',
    bgFarbe: 'bg-red-50',
    textFarbe: 'text-red-800',
    borderFarbe: 'border-red-200',
    icon: AlertCircle,
  },
}

function stufeToGaugePercent(score: number): number {
  return Math.round((score / 88) * 100)
}

function formatDatum(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function scoreToTrend(current: number, previous: number | undefined): 'up' | 'down' | 'same' {
  if (previous === undefined) return 'same'
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'same'
}

// ============================================================
// Sub-components
// ============================================================

function NotfallKontakte() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="h-4 w-4 text-blue-700 shrink-0" />
        <p className="text-sm font-semibold text-blue-900">Beratung & Notfall</p>
      </div>
      <div className="space-y-2 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Pflegetelefon:</span>{' '}
            <a href="tel:+49302064590" className="underline underline-offset-2 hover:text-blue-900 transition-colors">
              030 206 459 0
            </a>{' '}
            <span className="text-blue-600 text-xs">(Mo–Fr)</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">KDA Beratung:</span>{' '}
            <a href="tel:08002200000" className="underline underline-offset-2 hover:text-blue-900 transition-colors">
              0800 220 0000
            </a>{' '}
            <span className="text-blue-600 text-xs">(kostenlos)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BudgetMeter({ used, total, label, colorClass }: {
  used: number
  total: number
  label: string
  colorClass: string
}) {
  const pct = Math.min(100, Math.round((used / total) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-[--muted-foreground] mb-1">
        <span>{label}</span>
        <span>{pct}% verwendet</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
// Tab 1: Selbsthilfegruppen
// ============================================================

function SelbsthilfegruppenTab({ initialGruppen }: { initialGruppen: Selbsthilfegruppe[] }) {
  const [typFilter, setTypFilter] = useState<string>('alle')
  const [themaFilter, setThemaFilter] = useState<string>('Alle')
  const [plzSuche, setPlzSuche] = useState('')
  const [suchtext, setSuchtext] = useState('')
  const [erweiterteIds, setErweiterteIds] = useState<Set<string>>(new Set())
  const [gruppen, setGruppen] = useState<Selbsthilfegruppe[]>(initialGruppen)
  const [isLoading, setIsLoading] = useState(false)

  const toggleErweitert = useCallback((id: string) => {
    setErweiterteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSearch = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typFilter !== 'alle') params.set('typ', typFilter)
      if (themaFilter !== 'Alle') params.set('thema', themaFilter)
      if (plzSuche.trim()) params.set('plz', plzSuche.trim())
      if (suchtext.trim()) params.set('q', suchtext.trim())

      const res = await fetch(`/api/entlastung/gruppen?${params.toString()}`)
      if (res.ok) {
        const json = await res.json() as { gruppen: Selbsthilfegruppe[] }
        setGruppen(json.gruppen)
      }
    } finally {
      setIsLoading(false)
    }
  }, [typFilter, themaFilter, plzSuche, suchtext])

  const typBadge = (typ: Selbsthilfegruppe['typ']) => {
    const config = {
      praesenz: { label: 'Präsenz', cls: 'bg-green-100 text-green-800' },
      online: { label: 'Online', cls: 'bg-blue-100 text-blue-800' },
      hybrid: { label: 'Hybrid', cls: 'bg-purple-100 text-purple-800' },
    }[typ]
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.cls}`}>
        {typ === 'praesenz' && <MapPin className="h-3 w-3" />}
        {typ === 'online' && <Globe className="h-3 w-3" />}
        {typ === 'hybrid' && <Users className="h-3 w-3" />}
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
              <input
                type="text"
                value={suchtext}
                onChange={(e) => setSuchtext(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Gruppe oder Organisation suchen …"
                className="w-full pl-9 pr-3 py-2 text-sm border border-[--border] rounded-lg bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/20 focus:border-[--primary]"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
              <input
                type="text"
                value={plzSuche}
                onChange={(e) => setPlzSuche(e.target.value)}
                placeholder="PLZ"
                maxLength={5}
                className="w-24 pl-9 pr-3 py-2 text-sm border border-[--border] rounded-lg bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/20 focus:border-[--primary]"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-[--primary] text-white rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Suche …' : 'Suchen'}
            </button>
          </div>

          {/* Typ filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'alle', label: 'Alle' },
              { key: 'praesenz', label: 'Präsenz' },
              { key: 'online', label: 'Online' },
              { key: 'hybrid', label: 'Hybrid' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTypFilter(t.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  typFilter === t.key
                    ? 'bg-[--primary] text-white border-[--primary]'
                    : 'bg-white text-[--foreground] border-[--border] hover:border-[--primary]/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Thema filter */}
          <div className="flex flex-wrap gap-2">
            {THEMEN_FILTER.map((thema) => (
              <button
                key={thema}
                onClick={() => setThemaFilter(thema)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  themaFilter === thema
                    ? 'bg-[--primary]/10 text-[--primary] border-[--primary]/30'
                    : 'bg-white text-[--muted-foreground] border-[--border] hover:border-[--primary]/20'
                }`}
              >
                {thema}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {gruppen.length === 0 ? (
        <div className="text-center py-12 text-[--muted-foreground]">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">Keine Gruppe gefunden</p>
          <p className="text-sm">Keine Gruppe in Ihrer Nähe? Erwägen Sie, selbst eine zu gründen.</p>
          <a
            href="https://www.nakos.de/selbsthilfe-gruenden"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[--primary] hover:underline"
          >
            So gründen Sie eine Selbsthilfegruppe <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {gruppen.map((gruppe) => {
            const expanded = erweiterteIds.has(gruppe.id)
            return (
              <Card key={gruppe.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleErweitert(gruppe.id)}
                    className="w-full text-left p-4 hover:bg-[--muted]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold text-[--foreground]">{gruppe.name}</h3>
                          {typBadge(gruppe.typ)}
                          <span className="text-xs text-[--muted-foreground] bg-[--muted] px-2 py-0.5 rounded-full">
                            {gruppe.thema}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[--muted-foreground]">
                          {(gruppe.ort || gruppe.plz) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {gruppe.ort ?? gruppe.plz}
                            </span>
                          )}
                          {gruppe.typ === 'online' && !gruppe.ort && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Online bundesweit
                            </span>
                          )}
                          {gruppe.treffen_rhythmus && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {gruppe.treffen_rhythmus}
                            </span>
                          )}
                        </div>
                        {gruppe.veranstalter && (
                          <p className="text-xs text-[--muted-foreground] mt-1">{gruppe.veranstalter}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-[--muted-foreground]">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {expanded && (
                    <div className="px-4 pb-4 border-t border-[--border] pt-3 space-y-3">
                      {gruppe.beschreibung && (
                        <p className="text-sm text-[--foreground] leading-relaxed">{gruppe.beschreibung}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {gruppe.kontakt_email && (
                          <a
                            href={`mailto:${gruppe.kontakt_email}`}
                            className="flex items-center gap-1.5 text-[--primary] hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {gruppe.kontakt_email}
                          </a>
                        )}
                        {gruppe.kontakt_telefon && (
                          <a
                            href={`tel:${gruppe.kontakt_telefon}`}
                            className="flex items-center gap-1.5 text-[--primary] hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {gruppe.kontakt_telefon}
                          </a>
                        )}
                        {gruppe.webseite && (
                          <a
                            href={gruppe.webseite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[--primary] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Webseite besuchen
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <NotfallKontakte />
    </div>
  )
}

// ============================================================
// Tab 2: Burnout-Screening (Zarit)
// ============================================================

function BurnoutScreeningTab({
  lastScreening,
  screeningHistory,
}: {
  lastScreening: BurnoutScreening | null
  screeningHistory: BurnoutScreening[]
}) {
  const [phase, setPhase] = useState<'intro' | 'fragen' | 'ergebnis'>(
    lastScreening ? 'ergebnis' : 'intro'
  )
  const [aktuelleSeite, setAktuelleSeite] = useState(0)
  const [antworten, setAntworten] = useState<Record<number, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedScreening, setSavedScreening] = useState<BurnoutScreening | null>(lastScreening)
  const [history, setHistory] = useState<BurnoutScreening[]>(screeningHistory)
  const [saveError, setSaveError] = useState<string | null>(null)

  const seitenAnzahl = Math.ceil(ZARIT_FRAGEN.length / FRAGEN_PRO_SEITE)
  const fragenAufSeite = ZARIT_FRAGEN.slice(
    aktuelleSeite * FRAGEN_PRO_SEITE,
    (aktuelleSeite + 1) * FRAGEN_PRO_SEITE
  )
  const beantwortetAufSeite = fragenAufSeite.every((f) => antworten[f.id] !== undefined)
  const alleBeantwortet = ZARIT_FRAGEN.every((f) => antworten[f.id] !== undefined)
  const gesamtScore = useMemo(() => berechneZaritScore(
    Object.fromEntries(Object.entries(antworten).map(([k, v]) => [k, v]))
  ), [antworten])

  const handleAntwort = (frageId: number, wert: number) => {
    setAntworten((prev) => ({ ...prev, [frageId]: wert }))
  }

  const handleWeiter = () => {
    if (aktuelleSeite < seitenAnzahl - 1) {
      setAktuelleSeite((p) => p + 1)
    } else {
      handleAbschicken()
    }
  }

  const handleAbschicken = async () => {
    if (!alleBeantwortet) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/entlastung/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          antworten: Object.fromEntries(
            Object.entries(antworten).map(([k, v]) => [k, v])
          ),
        }),
      })
      if (res.ok) {
        const json = await res.json() as { screening: BurnoutScreening }
        setSavedScreening(json.screening)
        setHistory((prev) => [json.screening, ...prev].slice(0, 5))
        setPhase('ergebnis')
      } else {
        const err = await res.json() as { error: string }
        setSaveError(err.error ?? 'Fehler beim Speichern')
      }
    } catch {
      setSaveError('Verbindungsfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNeustart = () => {
    setAntworten({})
    setAktuelleSeite(0)
    setPhase('fragen')
    setSaveError(null)
  }

  const interpretation = savedScreening
    ? interpretiereZaritScore(savedScreening.gesamt_score)
    : null

  if (phase === 'intro') {
    return (
      <div className="space-y-5">
        <Card className="border-[--primary]/20 bg-[--primary]/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-[--primary] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[--foreground] mb-2">Wie belastet fühlen Sie sich?</h3>
                <p className="text-sm text-[--foreground] leading-relaxed">
                  Die Pflege eines nahestehenden Menschen ist eine der bedeutsamsten, aber auch herausforderndsten
                  Aufgaben im Leben. Es ist ganz normal, dass diese Aufgabe manchmal auch belastend sein kann.
                </p>
                <p className="text-sm text-[--foreground] leading-relaxed mt-2">
                  Dieser Fragebogen (Zarit Burden Interview) hilft Ihnen, Ihre persönliche Belastungssituation
                  einzuschätzen. Es gibt keine richtigen oder falschen Antworten – wichtig ist allein Ihre
                  ehrliche Einschätzung.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-[--muted-foreground]">
                  <Shield className="h-3.5 w-3.5" />
                  Ihre Antworten sind vertraulich und nur für Sie sichtbar.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white border border-[--border] rounded-xl p-4">
            <p className="text-2xl font-bold text-[--primary]">22</p>
            <p className="text-xs text-[--muted-foreground] mt-1">Fragen</p>
          </div>
          <div className="bg-white border border-[--border] rounded-xl p-4">
            <p className="text-2xl font-bold text-[--primary]">~5</p>
            <p className="text-xs text-[--muted-foreground] mt-1">Minuten</p>
          </div>
          <div className="bg-white border border-[--border] rounded-xl p-4">
            <p className="text-2xl font-bold text-[--primary]">100%</p>
            <p className="text-xs text-[--muted-foreground] mt-1">Vertraulich</p>
          </div>
        </div>

        <button
          onClick={() => setPhase('fragen')}
          className="w-full py-3 bg-[--primary] text-white font-semibold rounded-xl hover:bg-[--primary]/90 transition-colors"
        >
          Fragebogen starten
        </button>

        <NotfallKontakte />
      </div>
    )
  }

  if (phase === 'fragen') {
    const frageNrStart = aktuelleSeite * FRAGEN_PRO_SEITE + 1
    return (
      <div className="space-y-5">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-[--muted-foreground] mb-2">
            <span>Frage {frageNrStart} bis {Math.min(frageNrStart + FRAGEN_PRO_SEITE - 1, 22)} von 22</span>
            <span>Seite {aktuelleSeite + 1} von {seitenAnzahl}</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[--primary] rounded-full transition-all duration-300"
              style={{ width: `${((aktuelleSeite + (beantwortetAufSeite ? 1 : 0)) / seitenAnzahl) * 100}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {fragenAufSeite.map((frage, idx) => {
            const frageNr = aktuelleSeite * FRAGEN_PRO_SEITE + idx + 1
            const beantwortet = antworten[frage.id] !== undefined
            return (
              <Card key={frage.id} className={beantwortet ? 'border-[--primary]/20 bg-[--primary]/3' : ''}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-[--foreground] mb-3">
                    <span className="text-[--muted-foreground] font-normal mr-1">{frageNr}.</span>
                    {frage.text}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ZARIT_ANTWORTEN.map((antwort) => (
                      <button
                        key={antwort.wert}
                        onClick={() => handleAntwort(frage.id, antwort.wert)}
                        className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all text-center ${
                          antworten[frage.id] === antwort.wert
                            ? 'bg-[--primary] text-white border-[--primary]'
                            : 'bg-white text-[--foreground] border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/5'
                        }`}
                      >
                        <span className="block text-[10px] opacity-60 mb-0.5">{antwort.wert}</span>
                        {antwort.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}

        <div className="flex gap-3">
          {aktuelleSeite > 0 && (
            <button
              onClick={() => setAktuelleSeite((p) => p - 1)}
              className="px-5 py-2.5 text-sm font-medium border border-[--border] rounded-xl hover:bg-[--muted] transition-colors"
            >
              Zurück
            </button>
          )}
          <button
            onClick={handleWeiter}
            disabled={!beantwortetAufSeite || isSaving}
            className="flex-1 py-2.5 text-sm font-semibold bg-[--primary] text-white rounded-xl hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? 'Wird gespeichert …'
              : aktuelleSeite < seitenAnzahl - 1
              ? 'Weiter'
              : 'Fragebogen abschicken'}
          </button>
        </div>
      </div>
    )
  }

  // phase === 'ergebnis'
  const stufe = savedScreening?.belastungsstufe ?? 'niedrig'
  const config = BELASTUNG_CONFIG[stufe]
  const BelastungIcon = config.icon
  const gaugePercent = savedScreening ? stufeToGaugePercent(savedScreening.gesamt_score) : 0

  return (
    <div className="space-y-5">
      {/* Result card */}
      <Card className={`border ${config.borderFarbe} ${config.bgFarbe}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <BelastungIcon className={`h-5 w-5 shrink-0 mt-0.5 ${config.textFarbe}`} />
            <div>
              <p className={`font-semibold ${config.textFarbe}`}>{interpretation?.bezeichnung}</p>
              <p className={`text-sm mt-1 ${config.textFarbe} opacity-90 leading-relaxed`}>
                {interpretation?.beschreibung}
              </p>
            </div>
          </div>

          {/* Score gauge */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className={config.textFarbe}>Ihr Score: {savedScreening?.gesamt_score} / 88</span>
              <span className="text-[--muted-foreground] text-xs">0 = keine Belastung · 88 = maximale Belastung</span>
            </div>
            <div className="w-full h-4 rounded-full overflow-hidden relative" style={{
              background: 'linear-gradient(to right, #22c55e 0%, #eab308 25%, #f97316 50%, #ef4444 75%, #dc2626 100%)',
            }}>
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-md transition-all duration-700"
                style={{ left: `calc(${gaugePercent}% - 3px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[--muted-foreground] mt-1">
              <span>Niedrig</span>
              <span>Moderat</span>
              <span>Hoch</span>
              <span>Sehr hoch</span>
            </div>
          </div>

          {savedScreening?.erstellt_am && (
            <p className="text-xs text-[--muted-foreground]">
              Durchgeführt am {formatDatum(savedScreening.erstellt_am)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {interpretation && interpretation.empfehlungen.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[--primary]" />
              Empfehlungen für Sie
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2.5">
              {interpretation.empfehlungen.map((emp, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[--foreground]">
                  <span className="w-5 h-5 rounded-full bg-[--primary]/10 text-[--primary] text-xs flex items-center justify-center shrink-0 font-medium mt-0.5">
                    {i + 1}
                  </span>
                  {emp}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Frühere Screenings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {history.slice(1).map((s, idx) => {
              const prev = history[idx + 2]
              const trend = scoreToTrend(s.gesamt_score, prev?.gesamt_score)
              const cfg = BELASTUNG_CONFIG[s.belastungsstufe]
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-[--border] last:border-0">
                  <div>
                    <p className="text-xs text-[--muted-foreground]">{formatDatum(s.erstellt_am)}</p>
                    <p className={`text-sm font-medium ${cfg.textFarbe}`}>{cfg.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.gesamt_score}/88</span>
                    {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                    {trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                    {trend === 'same' && <Minus className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <button
        onClick={handleNeustart}
        className="w-full py-2.5 text-sm font-medium border border-[--border] rounded-xl hover:bg-[--muted] transition-colors"
      >
        Fragebogen erneut ausfüllen
      </button>

      <NotfallKontakte />
    </div>
  )
}

// ============================================================
// Tab 3: Verhinderungspflege §39 SGB XI
// ============================================================

const VERTRETER_TYP_LABELS: Record<PlanungsEintrag['vertreter_typ'], string> = {
  ambulanter_dienst: 'Ambulanter Pflegedienst',
  private_ersatzpflegeperson: 'Private Ersatzpflegeperson',
}

const GRUND_LABELS: Record<PlanungsEintrag['grund'], string> = {
  urlaub: 'Urlaub',
  krankheit: 'Krankheit / Arzttermin',
  beruf: 'Berufliche Verpflichtung',
  sonstiges: 'Sonstiger Grund',
}

function VerhinderungspflegeTab({ plan: initialPlan }: { plan: VerhinderungspflegePlan | null }) {
  const [pflegegrad, setPflegegrad] = useState<number>(initialPlan?.pflegegrad ?? 2)
  const [eingesetzt, setEingesetzt] = useState<number>(initialPlan?.eingesetzt_cent ?? 0)
  const [planung, setPlanung] = useState<PlanungsEintrag[]>(initialPlan?.planung ?? [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [neuerEintrag, setNeuerEintrag] = useState<Partial<PlanungsEintrag>>({
    grund: 'urlaub',
    vertreter_typ: 'ambulanter_dienst',
  })
  const [showAufstockungInfo, setShowAufstockungInfo] = useState(false)

  const berechnung = useMemo(
    () => berechneVerhinderungspflege({ eingesetzt_cent: eingesetzt, pflegegrad }),
    [eingesetzt, pflegegrad]
  )

  const handleAddEintrag = () => {
    if (!neuerEintrag.von || !neuerEintrag.bis) return
    const entry: PlanungsEintrag = {
      id: crypto.randomUUID(),
      von: neuerEintrag.von,
      bis: neuerEintrag.bis,
      grund: neuerEintrag.grund ?? 'urlaub',
      vertreter_typ: neuerEintrag.vertreter_typ ?? 'ambulanter_dienst',
    }
    setPlanung((prev) => [...prev, entry])
    setNeuerEintrag({ grund: 'urlaub', vertreter_typ: 'ambulanter_dienst' })
    setShowAddForm(false)
  }

  const handleRemoveEintrag = (id: string) => {
    setPlanung((prev) => prev.filter((e) => e.id !== id))
  }

  const meterColor = berechnung.anteil_eingesetzt_prozent > 80
    ? 'bg-red-500'
    : berechnung.anteil_eingesetzt_prozent > 50
    ? 'bg-amber-500'
    : 'bg-green-500'

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Verhinderungspflege (§39 SGB XI)</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                Wenn Sie als pflegende Angehörige verhindert sind – durch Urlaub, Krankheit oder berufliche Verpflichtungen –
                übernimmt die Pflegeversicherung die Kosten einer Ersatzpflege bis zu{' '}
                <strong>1.612 € pro Jahr</strong> (maximal 42 Tage). Voraussetzung ist Pflegegrad 2 oder höher.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-4 w-4" />
            Budget-Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <BudgetMeter
            used={eingesetzt}
            total={VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT}
            label="Jahresbudget verwendet"
            colorClass={meterColor}
          />

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-lg font-bold">{centToEuro(berechnung.jahresbudget_cent)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Jahresbudget</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-lg font-bold text-amber-600">{centToEuro(berechnung.eingesetzt_cent)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verwendet</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-lg font-bold text-green-600">{centToEuro(berechnung.verbleibend_cent)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verfügbar</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[--muted-foreground]">Verbleibende Tage (max. {VERHINDERUNGSPFLEGE_MAX_TAGE})</span>
            <span className="font-semibold">{berechnung.tage_verbleibend} Tage</span>
          </div>

          {/* Pflegegrad selector */}
          <div>
            <label className="text-sm font-medium text-[--foreground] block mb-2">Pflegegrad</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPflegegrad(pg)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    pflegegrad === pg
                      ? 'bg-[--primary] text-white border-[--primary]'
                      : 'bg-white text-[--foreground] border-[--border] hover:border-[--primary]/40'
                  }`}
                >
                  PG {pg}
                </button>
              ))}
            </div>
          </div>

          {/* Manual budget input */}
          <div>
            <label className="text-sm font-medium text-[--foreground] block mb-1.5">
              Bereits eingesetzt (in €)
            </label>
            <input
              type="number"
              min={0}
              max={1612}
              step={1}
              value={eingesetzt / 100}
              onChange={(e) => setEingesetzt(Math.round(parseFloat(e.target.value || '0') * 100))}
              className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20 focus:border-[--primary]"
              placeholder="0"
            />
          </div>

          {/* Aufstockung info */}
          <button
            onClick={() => setShowAufstockungInfo((v) => !v)}
            className="w-full text-left text-sm text-[--primary] flex items-center gap-1.5 hover:underline"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            Aufstockung durch Kurzzeitpflege (§42 SGB XI)
            {showAufstockungInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAufstockungInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 leading-relaxed">
              Wenn das Kurzzeitpflege-Budget (§42 SGB XI) nicht voll genutzt wird, kann der verbleibende Betrag
              für die Verhinderungspflege eingesetzt werden – bis zu{' '}
              <strong>zusätzlichen 1.612 €</strong>. Das ergibt ein Gesamtbudget von bis zu{' '}
              <strong>{centToEuro(berechnung.gesamtbudget_mit_aufstockung_cent)}</strong>.
              Sprechen Sie dazu mit Ihrer Pflegekasse.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planung */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Abwesenheits-Planung
            </CardTitle>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[--primary] hover:bg-[--primary]/5 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Hinzufügen
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {showAddForm && (
            <div className="border border-[--border] rounded-xl p-4 space-y-3 bg-[--muted]/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[--foreground] block mb-1">Von</label>
                  <input
                    type="date"
                    value={neuerEintrag.von ?? ''}
                    onChange={(e) => setNeuerEintrag((p) => ({ ...p, von: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--foreground] block mb-1">Bis</label>
                  <input
                    type="date"
                    value={neuerEintrag.bis ?? ''}
                    onChange={(e) => setNeuerEintrag((p) => ({ ...p, bis: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[--foreground] block mb-1">Grund der Verhinderung</label>
                <select
                  value={neuerEintrag.grund ?? 'urlaub'}
                  onChange={(e) => setNeuerEintrag((p) => ({ ...p, grund: e.target.value as PlanungsEintrag['grund'] }))}
                  className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
                >
                  {Object.entries(GRUND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[--foreground] block mb-1">Art der Ersatzpflege</label>
                <select
                  value={neuerEintrag.vertreter_typ ?? 'ambulanter_dienst'}
                  onChange={(e) => setNeuerEintrag((p) => ({ ...p, vertreter_typ: e.target.value as PlanungsEintrag['vertreter_typ'] }))}
                  className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
                >
                  {Object.entries(VERTRETER_TYP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-sm border border-[--border] rounded-lg hover:bg-[--muted] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddEintrag}
                  disabled={!neuerEintrag.von || !neuerEintrag.bis}
                  className="flex-1 py-2 text-sm font-medium bg-[--primary] text-white rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
            </div>
          )}

          {planung.length === 0 ? (
            <div className="text-center py-8 text-[--muted-foreground]">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Noch keine Abwesenheiten geplant</p>
            </div>
          ) : (
            <div className="space-y-2">
              {planung.map((eintrag) => (
                <div key={eintrag.id} className="flex items-start justify-between gap-3 p-3 border border-[--border] rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {formatDatum(eintrag.von)} – {formatDatum(eintrag.bis)}
                      </span>
                      <Badge variant="secondary" className="text-xs">{GRUND_LABELS[eintrag.grund]}</Badge>
                    </div>
                    <p className="text-xs text-[--muted-foreground]">{VERTRETER_TYP_LABELS[eintrag.vertreter_typ]}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveEintrag(eintrag.id)}
                    className="text-[--muted-foreground] hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* PDF button */}
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border border-[--border] rounded-xl hover:bg-[--muted] transition-colors mt-2"
          >
            <FileText className="h-4 w-4" />
            Antrag als PDF drucken
          </button>
        </CardContent>
      </Card>

      <NotfallKontakte />
    </div>
  )
}

// ============================================================
// Tab 4: Entlastungsbetrag §45b SGB XI
// ============================================================

interface AusgabeModalProps {
  onClose: () => void
  onSave: (ausgabe: Omit<EntlastungAusgabe, 'id' | 'erstellt_am'>) => void
}

function AusgabeModal({ onClose, onSave }: AusgabeModalProps) {
  const heute = new Date()
  const monatStr = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-01`

  const [leistung, setLeistung] = useState('')
  const [anbieter, setAnbieter] = useState('')
  const [betrag, setBetrag] = useState('')
  const [erstattet, setErstattet] = useState(false)

  const handleSave = () => {
    if (!leistung || !betrag) return
    onSave({
      monat: monatStr,
      leistung,
      anbieter: anbieter || null,
      betrag_cent: Math.round(parseFloat(betrag) * 100),
      erstattet_cent: erstattet ? Math.round(parseFloat(betrag) * 100) : null,
      anerkannt: false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ausgabe erfassen</h3>
          <button onClick={onClose} className="text-[--muted-foreground] hover:text-[--foreground] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Leistung *</label>
          <input
            type="text"
            value={leistung}
            onChange={(e) => setLeistung(e.target.value)}
            placeholder="z.B. Alltagsbegleitung"
            className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Anbieter</label>
          <input
            type="text"
            value={anbieter}
            onChange={(e) => setAnbieter(e.target.value)}
            placeholder="Name des Anbieters"
            className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Betrag (€) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            className="w-full px-3 py-2 text-sm border border-[--border] rounded-lg focus:outline-none focus:ring-2 focus:ring-[--primary]/20"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-[--border]">
          <div>
            <p className="text-sm font-medium">Bereits erstattet</p>
            <p className="text-xs text-[--muted-foreground]">Wurde der Betrag von der Pflegekasse erstattet?</p>
          </div>
          <button
            onClick={() => setErstattet((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors ${erstattet ? 'bg-green-500' : 'bg-gray-300'} relative`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${erstattet ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-[--border] rounded-xl hover:bg-[--muted] transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!leistung || !betrag}
            className="flex-1 py-2.5 text-sm font-medium bg-[--primary] text-white rounded-xl hover:bg-[--primary]/90 transition-colors disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function EntlastungsbetragTab({ initialAusgaben }: { initialAusgaben: EntlastungAusgabe[] }) {
  const [ausgaben, setAusgaben] = useState<EntlastungAusgabe[]>(initialAusgaben)
  const [showModal, setShowModal] = useState(false)
  const [showAnerkannte, setShowAnerkannte] = useState(false)

  const heute = new Date()
  const aktuellerMonatStr = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}`

  const aktuellerMonatAusgaben = useMemo(
    () => ausgaben.filter((a) => a.monat.startsWith(aktuellerMonatStr)),
    [ausgaben, aktuellerMonatStr]
  )

  const aktuellerMonatTotal = useMemo(
    () => aktuellerMonatAusgaben.reduce((s, a) => s + a.betrag_cent, 0),
    [aktuellerMonatAusgaben]
  )

  const jahresTotal = useMemo(
    () => ausgaben.filter((a) => a.monat.startsWith(heute.getFullYear().toString())).reduce((s, a) => s + a.betrag_cent, 0),
    [ausgaben, heute]
  )

  const monatBerechnung = useMemo(
    () => berechneEntlastungsbetrag(aktuellerMonatTotal),
    [aktuellerMonatTotal]
  )

  const handleSaveAusgabe = (ausgabe: Omit<EntlastungAusgabe, 'id' | 'erstellt_am'>) => {
    const neu: EntlastungAusgabe = {
      ...ausgabe,
      id: crypto.randomUUID(),
      erstellt_am: new Date().toISOString(),
    }
    setAusgaben((prev) => [neu, ...prev])
  }

  const handleRemoveAusgabe = (id: string) => {
    setAusgaben((prev) => prev.filter((a) => a.id !== id))
  }

  const meterColor = monatBerechnung.anteil_eingesetzt_prozent > 80
    ? 'bg-amber-500'
    : 'bg-green-500'

  const monatName = heute.toLocaleString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {showModal && (
        <AusgabeModal onClose={() => setShowModal(false)} onSave={handleSaveAusgabe} />
      )}

      {/* Explainer */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900 mb-1">Entlastungsbetrag (§45b SGB XI)</p>
              <p className="text-sm text-green-800 leading-relaxed">
                Sie erhalten monatlich <strong>125 €</strong> für Betreuungs- und Entlastungsleistungen –
                zum Beispiel Tagespflege, Alltagsbegleitung oder Haushaltshilfe. Nicht genutzter Betrag
                kann im Kalenderjahr angespart und übertragen werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aktueller Monat */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Aktueller Monat: {monatName}</CardTitle>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-[--primary] hover:bg-[--primary]/5 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ausgabe
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <BudgetMeter
            used={aktuellerMonatTotal}
            total={ENTLASTUNGSBETRAG_MONAT_CENT}
            label="Monatliches Budget"
            colorClass={meterColor}
          />

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold">{centToEuro(ENTLASTUNGSBETRAG_MONAT_CENT)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Budget</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold text-amber-600">{centToEuro(aktuellerMonatTotal)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verwendet</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold text-green-600">{centToEuro(monatBerechnung.verbleibend_cent)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verfügbar</p>
            </div>
          </div>

          {monatBerechnung.uebertrag_moeglich && monatBerechnung.verbleibend_cent > 0 && (
            <div className="flex items-start gap-2 text-xs text-[--muted-foreground] bg-[--muted] rounded-lg p-3">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Der nicht genutzte Betrag von{' '}
                <strong>{centToEuro(monatBerechnung.verbleibend_cent)}</strong> kann im laufenden
                Kalenderjahr angespart werden.
              </span>
            </div>
          )}

          {/* Ausgaben Liste */}
          {aktuellerMonatAusgaben.length > 0 ? (
            <div className="space-y-2">
              {aktuellerMonatAusgaben.map((ausgabe) => (
                <div key={ausgabe.id} className="flex items-center justify-between gap-3 p-3 border border-[--border] rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ausgabe.leistung}</p>
                    {ausgabe.anbieter && (
                      <p className="text-xs text-[--muted-foreground]">{ausgabe.anbieter}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ausgabe.erstattet_cent != null && (
                      <span className="text-xs text-green-600 font-medium">Erstattet</span>
                    )}
                    <span className="text-sm font-semibold">{centToEuro(ausgabe.betrag_cent)}</span>
                    <button
                      onClick={() => handleRemoveAusgabe(ausgabe.id)}
                      className="text-[--muted-foreground] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[--muted-foreground]">
              <Euro className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Noch keine Ausgaben für diesen Monat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jahresübersicht */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Jahresübersicht {heute.getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <BudgetMeter
            used={jahresTotal}
            total={ENTLASTUNGSBETRAG_JAHR_CENT}
            label="Jahresbudget (12 × 125 €)"
            colorClass="bg-blue-500"
          />
          <div className="grid grid-cols-3 gap-3 text-center mt-4">
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold">{centToEuro(ENTLASTUNGSBETRAG_JAHR_CENT)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Jahresbudget</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold text-amber-600">{centToEuro(jahresTotal)}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verwendet</p>
            </div>
            <div className="bg-[--muted] rounded-xl p-3">
              <p className="text-base font-bold text-green-600">{centToEuro(Math.max(0, ENTLASTUNGSBETRAG_JAHR_CENT - jahresTotal))}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Verfügbar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anerkannte Leistungen */}
      <Card>
        <CardContent className="p-4">
          <button
            onClick={() => setShowAnerkannte((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Anerkannte Leistungen nach §45b SGB XI
            </span>
            {showAnerkannte ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showAnerkannte && (
            <ul className="mt-3 space-y-1.5">
              {ANERKANNTE_LEISTUNGEN_45B.map((leistung) => (
                <li key={leistung} className="flex items-center gap-2 text-sm text-[--foreground]">
                  <ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {leistung}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NotfallKontakte />
    </div>
  )
}

// ============================================================
// Main component
// ============================================================

type TabId = 'gruppen' | 'screening' | 'verhinderung' | 'entlastung'

const TABS: { id: TabId; label: string; icon: typeof Heart }[] = [
  { id: 'gruppen', label: 'Selbsthilfegruppen', icon: Users },
  { id: 'screening', label: 'Burnout-Screening', icon: Heart },
  { id: 'verhinderung', label: 'Verhinderungspflege', icon: Calendar },
  { id: 'entlastung', label: 'Entlastungsbetrag', icon: Euro },
]

export function EntlastungClient({
  initialGruppen,
  lastScreening,
  screeningHistory,
  verhinderungPlan,
  entlastungAusgaben,
}: EntlastungClientProps) {
  const [aktuellerTab, setAktuellerTab] = useState<TabId>('gruppen')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--foreground] mb-1">Angehörigen-Entlastung</h1>
        <p className="text-[--muted-foreground] text-sm leading-relaxed">
          Unterstützung für pflegende Angehörige: Selbsthilfegruppen finden, Belastung einschätzen
          und Ihre gesetzlichen Leistungen verwalten.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-[--muted] p-1 rounded-xl">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setAktuellerTab(tab.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                aktuellerTab === tab.id
                  ? 'bg-white text-[--foreground] shadow-sm'
                  : 'text-[--muted-foreground] hover:text-[--foreground]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {aktuellerTab === 'gruppen' && (
        <SelbsthilfegruppenTab initialGruppen={initialGruppen} />
      )}
      {aktuellerTab === 'screening' && (
        <BurnoutScreeningTab lastScreening={lastScreening} screeningHistory={screeningHistory} />
      )}
      {aktuellerTab === 'verhinderung' && (
        <VerhinderungspflegeTab plan={verhinderungPlan} />
      )}
      {aktuellerTab === 'entlastung' && (
        <EntlastungsbetragTab initialAusgaben={entlastungAusgaben} />
      )}
    </div>
  )
}
