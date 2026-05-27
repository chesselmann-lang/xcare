'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import {
  Activity, Plus, X, ChevronDown, ChevronRight, Flag, AlertTriangle,
  Download, Brain, Thermometer, Heart, Droplets, Scale, Wind,
  Pill, Utensils, Moon, Footprints, Stethoscope, FileText,
  CheckCircle, TrendingUp, TrendingDown, Minus, Info,
  ClipboardList, BarChart2, Sparkles,
} from 'lucide-react'
import { ALARMGRENZEN, type VitalTrend, type TagesbuchMuster } from '@/lib/pflegetagebuch/analyse'
import { generiereMDKBericht } from '@/lib/pflegetagebuch/analyse'

// ── Types ─────────────────────────────────────────────────────────────────────

type Kategorie =
  | 'allgemein' | 'mahlzeit' | 'medikament' | 'koerperpflege'
  | 'ausscheidung' | 'schlaf' | 'aktivitaet' | 'arztbesuch'
  | 'sturzgeschehen' | 'schmerzen' | 'stimmung' | 'vitalwerte' | 'sonstiges'

interface DiaryEntry {
  id: string
  datum: string
  uhrzeit?: string | null
  kategorie: Kategorie
  eintrag: string
  schmerz_skala?: number | null
  stimmung_skala?: number | null
  blutdruck_systolisch?: number | null
  blutdruck_diastolisch?: number | null
  puls?: number | null
  temperatur?: number | null
  blutzucker?: number | null
  gewicht?: number | null
  sauerstoffsaettigung?: number | null
  fluessigkeit_ml?: number | null
  schlaf_stunden?: number | null
  schlaf_qualitaet?: string | null
  appetit?: string | null
  mahlzeit_beschreibung?: string | null
  medikamente_eingenommen?: Array<{ name: string; dosis?: string; zeit?: string; gegeben: boolean }> | null
  besonderheit: boolean
  fuer_mdk_bericht: boolean
  erstellt_am: string
}

interface AnalyseResult {
  zeitraum_von: string
  zeitraum_bis: string
  eintraege_count: number
  vitalTrends: VitalTrend[]
  muster: TagesbuchMuster
  warnungen: string[]
  empfehlungen: string[]
  historie: Array<{
    id: string
    analyse_datum: string
    zeitraum_von: string
    zeitraum_bis: string
    warnungen: string[]
    empfehlungen: string[]
    erstellt_am: string
  }>
  cached: boolean
}

interface Props {
  initialEintraege: DiaryEntry[]
  nutzerName: string
}

// ── Category config ───────────────────────────────────────────────────────────

const KATEGORIE_CONFIG: Record<Kategorie, { label: string; farbe: string; icon: React.ReactNode }> = {
  allgemein:     { label: 'Allgemein',    farbe: 'bg-gray-100 text-gray-700',       icon: <ClipboardList className="h-3.5 w-3.5" /> },
  mahlzeit:      { label: 'Mahlzeit',     farbe: 'bg-orange-100 text-orange-700',   icon: <Utensils className="h-3.5 w-3.5" /> },
  medikament:    { label: 'Medikament',   farbe: 'bg-purple-100 text-purple-700',   icon: <Pill className="h-3.5 w-3.5" /> },
  koerperpflege: { label: 'Körperpflege', farbe: 'bg-cyan-100 text-cyan-700',       icon: <Droplets className="h-3.5 w-3.5" /> },
  ausscheidung:  { label: 'Ausscheidung', farbe: 'bg-yellow-100 text-yellow-700',   icon: <Activity className="h-3.5 w-3.5" /> },
  schlaf:        { label: 'Schlaf',       farbe: 'bg-indigo-100 text-indigo-700',   icon: <Moon className="h-3.5 w-3.5" /> },
  aktivitaet:    { label: 'Aktivität',    farbe: 'bg-green-100 text-green-700',     icon: <Footprints className="h-3.5 w-3.5" /> },
  arztbesuch:    { label: 'Arztbesuch',   farbe: 'bg-blue-100 text-blue-700',       icon: <Stethoscope className="h-3.5 w-3.5" /> },
  sturzgeschehen:{ label: 'Sturz',        farbe: 'bg-red-100 text-red-700',         icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  schmerzen:     { label: 'Schmerzen',    farbe: 'bg-rose-100 text-rose-700',       icon: <Heart className="h-3.5 w-3.5" /> },
  stimmung:      { label: 'Stimmung',     farbe: 'bg-pink-100 text-pink-700',       icon: <Sparkles className="h-3.5 w-3.5" /> },
  vitalwerte:    { label: 'Vitalwerte',   farbe: 'bg-teal-100 text-teal-700',       icon: <Activity className="h-3.5 w-3.5" /> },
  sonstiges:     { label: 'Sonstiges',    farbe: 'bg-slate-100 text-slate-700',     icon: <Info className="h-3.5 w-3.5" /> },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDatum(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

const STIMMUNG_EMOJI = ['', '😢', '😕', '😐', '🙂', '😊']

// ── Inline SVG Line Chart ─────────────────────────────────────────────────────

interface ChartPoint {
  datum: string
  wert: number
  systolisch?: number
  diastolisch?: number
}

function VitalChart({
  werte,
  einheit,
  alarmHoch,
  alarmNiedrig,
  color = '#0ea5e9',
}: {
  werte: ChartPoint[]
  einheit: string
  alarmHoch?: number
  alarmNiedrig?: number
  color?: string
}) {
  if (werte.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[--muted-foreground]">
        Keine Daten im Zeitraum
      </div>
    )
  }

  const W = 480
  const H = 160
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allVals = werte.map(v => v.wert)
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const pad = Math.max((rawMax - rawMin) * 0.2, 5)
  const yMin = rawMin - pad
  const yMax = rawMax + pad

  const toX = (i: number) => werte.length < 2 ? PAD.left + innerW / 2 : PAD.left + (i / (werte.length - 1)) * innerW
  const toY = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const pathD = werte.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.wert).toFixed(1)}`).join(' ')

  // Y axis labels (4 ticks)
  const yTicks = [0, 1, 2, 3].map(i => yMin + (i / 3) * (yMax - yMin))

  // X axis: show every N-th label
  const xStep = Math.ceil(werte.length / 6)
  const xLabels = werte.map((p, i) => ({ i, label: p.datum.slice(5) })).filter((_, i) => i % xStep === 0)

  const isAlarm = (v: number) =>
    (alarmHoch !== undefined && v >= alarmHoch) ||
    (alarmNiedrig !== undefined && v <= alarmNiedrig)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-40"
      aria-label={`Verlauf in ${einheit}`}
    >
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={PAD.left} y1={toY(t)}
          x2={PAD.left + innerW} y2={toY(t)}
          stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
        />
      ))}

      {/* Alarm threshold lines */}
      {alarmHoch !== undefined && alarmHoch >= yMin && alarmHoch <= yMax && (
        <line
          x1={PAD.left} y1={toY(alarmHoch)}
          x2={PAD.left + innerW} y2={toY(alarmHoch)}
          stroke="#ef4444" strokeDasharray="4 3" strokeWidth="1.5" opacity="0.7"
        />
      )}
      {alarmNiedrig !== undefined && alarmNiedrig >= yMin && alarmNiedrig <= yMax && (
        <line
          x1={PAD.left} y1={toY(alarmNiedrig)}
          x2={PAD.left + innerW} y2={toY(alarmNiedrig)}
          stroke="#f97316" strokeDasharray="4 3" strokeWidth="1.5" opacity="0.7"
        />
      )}

      {/* Y axis labels */}
      {yTicks.map((t, i) => (
        <text
          key={i}
          x={PAD.left - 6} y={toY(t) + 4}
          textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5"
        >
          {Math.round(t)}
        </text>
      ))}

      {/* X axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)} y={H - 4}
          textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5"
        >
          {label}
        </text>
      ))}

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Data points */}
      {werte.map((p, i) => {
        const alarm = isAlarm(p.wert)
        return (
          <circle
            key={i}
            cx={toX(i)} cy={toY(p.wert)} r="3.5"
            fill={alarm ? '#ef4444' : color}
            stroke="white" strokeWidth="1.5"
          />
        )
      })}
    </svg>
  )
}

// ── Quick Capture Bar ─────────────────────────────────────────────────────────

type QuickMode = 'vital' | 'medikament' | 'mahlzeit' | 'allgemein' | null

function VitalQuickForm({ onSave }: { onSave: (d: Partial<DiaryEntry>) => Promise<void> }) {
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [puls, setPuls] = useState('')
  const [temp, setTemp] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!sys && !dia && !puls && !temp) return
    setSaving(true)
    await onSave({
      datum: isoToday(),
      kategorie: 'vitalwerte',
      eintrag: [
        sys && dia ? `RR ${sys}/${dia} mmHg` : '',
        puls ? `Puls ${puls} bpm` : '',
        temp ? `Temp ${temp}°C` : '',
      ].filter(Boolean).join(', '),
      blutdruck_systolisch: sys ? parseInt(sys) : undefined,
      blutdruck_diastolisch: dia ? parseInt(dia) : undefined,
      puls: puls ? parseInt(puls) : undefined,
      temperatur: temp ? parseFloat(temp) : undefined,
    })
    setSys(''); setDia(''); setPuls(''); setTemp('')
    setSaving(false)
  }

  const inp = 'w-20 rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[--primary]'

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-teal-50 rounded-xl border border-teal-200">
      <span className="text-xs font-semibold text-teal-700 mr-1">Vitalwerte</span>
      <div className="flex items-center gap-1">
        <input className={inp} placeholder="sys" value={sys} onChange={e => setSys(e.target.value)} type="number" min="50" max="300" />
        <span className="text-xs text-[--muted-foreground]">/</span>
        <input className={inp} placeholder="dia" value={dia} onChange={e => setDia(e.target.value)} type="number" min="30" max="200" />
        <span className="text-xs text-teal-600 ml-0.5">mmHg</span>
      </div>
      <div className="flex items-center gap-1">
        <input className={inp} placeholder="Puls" value={puls} onChange={e => setPuls(e.target.value)} type="number" min="20" max="300" />
        <span className="text-xs text-teal-600">bpm</span>
      </div>
      <div className="flex items-center gap-1">
        <input className={inp} placeholder="Temp" value={temp} onChange={e => setTemp(e.target.value)} type="number" step="0.1" min="30" max="45" />
        <span className="text-xs text-teal-600">°C</span>
      </div>
      <button
        onClick={handleSave}
        disabled={saving || (!sys && !dia && !puls && !temp)}
        className="ml-auto px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </button>
    </div>
  )
}

function QuickTextForm({
  kategorie,
  label,
  color,
  onSave,
}: {
  kategorie: Kategorie
  label: string
  color: string
  onSave: (d: Partial<DiaryEntry>) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    await onSave({ datum: isoToday(), kategorie, eintrag: text.trim() })
    setText('')
    setSaving(false)
  }

  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${color}`}>
      <span className="text-xs font-semibold shrink-0">{label}</span>
      <input
        className="flex-1 rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
        placeholder={`Kurzer Eintrag...`}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <button
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="px-3 py-1.5 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? '...' : 'OK'}
      </button>
    </div>
  )
}

// ── New Entry Modal ────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  datum: isoToday(),
  uhrzeit: '',
  kategorie: 'allgemein' as Kategorie,
  eintrag: '',
  schmerz_skala: undefined as number | undefined,
  stimmung_skala: undefined as number | undefined,
  blutdruck_systolisch: undefined as number | undefined,
  blutdruck_diastolisch: undefined as number | undefined,
  puls: undefined as number | undefined,
  temperatur: undefined as number | undefined,
  blutzucker: undefined as number | undefined,
  gewicht: undefined as number | undefined,
  sauerstoffsaettigung: undefined as number | undefined,
  fluessigkeit_ml: undefined as number | undefined,
  schlaf_stunden: undefined as number | undefined,
  schlaf_qualitaet: undefined as string | undefined,
  appetit: undefined as string | undefined,
  mahlzeit_beschreibung: '',
  besonderheit: false,
  fuer_mdk_bericht: false,
}

type FormState = typeof EMPTY_FORM

function NewEintragModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: Partial<FormState>
  onClose: () => void
  onSave: (form: FormState) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }, [])

  async function handleSave() {
    if (!form.eintrag.trim()) { setError('Bitte einen Eintrag eingeben.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      setForm({ ...EMPTY_FORM })
      onClose()
    } catch {
      setError('Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const inp = 'w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]'
  const numInp = `${inp} w-24`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[95vh] overflow-y-auto bg-[--background] rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[--background] border-b border-[--border]">
          <h2 className="text-base font-bold">Neuer Eintrag</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[--muted] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Datum + Uhrzeit + Kategorie */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Datum</label>
              <input type="date" className={inp} value={form.datum} onChange={e => set('datum', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Uhrzeit</label>
              <input type="time" className={inp} value={form.uhrzeit} onChange={e => set('uhrzeit', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Kategorie</label>
              <select className={inp} value={form.kategorie} onChange={e => set('kategorie', e.target.value as Kategorie)}>
                {(Object.keys(KATEGORIE_CONFIG) as Kategorie[]).map(k => (
                  <option key={k} value={k}>{KATEGORIE_CONFIG[k].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Text entry */}
          <div>
            <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Eintrag *</label>
            <textarea
              className={`${inp} min-h-[80px] resize-y`}
              placeholder="Beschreibung..."
              value={form.eintrag}
              onChange={e => set('eintrag', e.target.value)}
            />
          </div>

          {/* Category-specific fields */}
          {(form.kategorie === 'schmerzen') && (
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-2">
                Schmerzskala (NRS) — {form.schmerz_skala ?? 'nicht gesetzt'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">0</span>
                <input
                  type="range" min={0} max={10} step={1}
                  className="flex-1"
                  value={form.schmerz_skala ?? 0}
                  onChange={e => set('schmerz_skala', parseInt(e.target.value))}
                />
                <span className="text-sm">10</span>
              </div>
              <div className="flex justify-between text-[10px] text-[--muted-foreground] mt-0.5 px-4">
                <span>Kein Schmerz</span>
                <span>Stärkster Schmerz</span>
              </div>
              {form.schmerz_skala !== undefined && (
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => set('schmerz_skala', i)}
                      className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${
                        form.schmerz_skala === i
                          ? i <= 3 ? 'bg-green-500 text-white' : i <= 6 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-[--muted] text-[--muted-foreground]'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
              {form.schmerz_skala === undefined && (
                <button
                  className="mt-2 text-xs text-[--primary] hover:underline"
                  onClick={() => set('schmerz_skala', 0)}
                >
                  Schmerz erfassen
                </button>
              )}
            </div>
          )}

          {(form.kategorie === 'stimmung') && (
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-2">Stimmung</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => set('stimmung_skala', v)}
                    className={`flex-1 text-2xl py-2 rounded-xl border-2 transition-all ${
                      form.stimmung_skala === v ? 'border-[--primary] bg-[--primary]/10 scale-110' : 'border-[--border]'
                    }`}
                    title={['', 'Sehr schlecht', 'Schlecht', 'Okay', 'Gut', 'Sehr gut'][v]}
                  >
                    {STIMMUNG_EMOJI[v]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(form.kategorie === 'vitalwerte') && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--muted-foreground]">Vitalwerte</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="sys" min={50} max={300}
                    value={form.blutdruck_systolisch ?? ''}
                    onChange={e => set('blutdruck_systolisch', e.target.value ? parseInt(e.target.value) : undefined)} />
                  <span className="text-xs">/</span>
                  <input type="number" className={numInp} placeholder="dia" min={30} max={200}
                    value={form.blutdruck_diastolisch ?? ''}
                    onChange={e => set('blutdruck_diastolisch', e.target.value ? parseInt(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">mmHg</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="Puls" min={20} max={300}
                    value={form.puls ?? ''}
                    onChange={e => set('puls', e.target.value ? parseInt(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">bpm</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="Temp" step={0.1} min={30} max={45}
                    value={form.temperatur ?? ''}
                    onChange={e => set('temperatur', e.target.value ? parseFloat(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="Blutzucker" min={10} max={1000}
                    value={form.blutzucker ?? ''}
                    onChange={e => set('blutzucker', e.target.value ? parseFloat(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">mg/dL</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="Gewicht" step={0.1} min={10} max={300}
                    value={form.gewicht ?? ''}
                    onChange={e => set('gewicht', e.target.value ? parseFloat(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">kg</span>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" className={numInp} placeholder="SpO2" min={70} max={100}
                    value={form.sauerstoffsaettigung ?? ''}
                    onChange={e => set('sauerstoffsaettigung', e.target.value ? parseInt(e.target.value) : undefined)} />
                  <span className="text-xs text-[--muted-foreground]">%</span>
                </div>
              </div>
            </div>
          )}

          {(form.kategorie === 'mahlzeit') && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--muted-foreground]">Ernährung</p>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Appetit</label>
                <div className="flex gap-2">
                  {(['gut', 'maessig', 'schlecht', 'verweigert'] as const).map(a => (
                    <button key={a}
                      onClick={() => set('appetit', a)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.appetit === a ? 'bg-[--primary] text-white border-[--primary]' : 'border-[--border] hover:bg-[--muted]'
                      }`}
                    >
                      {a === 'maessig' ? 'Mäßig' : a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" className={numInp} placeholder="Flüssigkeit" min={0} max={10000}
                  value={form.fluessigkeit_ml ?? ''}
                  onChange={e => set('fluessigkeit_ml', e.target.value ? parseInt(e.target.value) : undefined)} />
                <span className="text-xs text-[--muted-foreground]">ml Flüssigkeit</span>
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Mahlzeit-Beschreibung</label>
                <input type="text" className={inp} placeholder="z.B. Kartoffelsuppe + Joghurt"
                  value={form.mahlzeit_beschreibung}
                  onChange={e => set('mahlzeit_beschreibung', e.target.value)} />
              </div>
            </div>
          )}

          {(form.kategorie === 'schlaf') && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--muted-foreground]">Schlaf</p>
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-[--muted-foreground] mb-1">Schlafstunden</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={16} step={0.5} className="w-32"
                      value={form.schlaf_stunden ?? 7}
                      onChange={e => set('schlaf_stunden', parseFloat(e.target.value))} />
                    <span className="text-sm font-medium w-12">{form.schlaf_stunden ?? 7} h</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Schlafqualität</label>
                <div className="flex gap-2 flex-wrap">
                  {([['gut', 'Gut'], ['unruhig', 'Unruhig'], ['unterbrochen', 'Unterbrochen'], ['sehr_schlecht', 'Sehr schlecht']] as const).map(([v, l]) => (
                    <button key={v}
                      onClick={() => set('schlaf_qualitaet', v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.schlaf_qualitaet === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[--border] hover:bg-[--muted]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Schmerz skala for non-schmerzen categories */}
          {form.kategorie !== 'schmerzen' && form.kategorie !== 'stimmung' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Schmerz (0–10)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={10} step={1} className="flex-1"
                    value={form.schmerz_skala ?? 0}
                    onChange={e => set('schmerz_skala', parseInt(e.target.value))} />
                  <span className="text-sm font-medium w-6">{form.schmerz_skala ?? 0}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Stimmung</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v}
                      onClick={() => set('stimmung_skala', v)}
                      className={`flex-1 rounded text-lg ${form.stimmung_skala === v ? 'bg-pink-100' : 'hover:bg-[--muted]'}`}
                    >
                      {STIMMUNG_EMOJI[v]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded"
                checked={form.besonderheit}
                onChange={e => set('besonderheit', e.target.checked)} />
              <span className="text-sm flex items-center gap-1">
                <Flag className="h-3.5 w-3.5 text-orange-500" />
                Besonderheit
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded"
                checked={form.fuer_mdk_bericht}
                onChange={e => set('fuer_mdk_bericht', e.target.checked)} />
              <span className="text-sm flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                Für MDK-Bericht
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[--background] border-t border-[--border] px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[--border] text-sm font-medium hover:bg-[--muted] transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[--primary] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Entry List Item ───────────────────────────────────────────────────────────

function EintragItem({
  eintrag,
  onToggleBesonderheit,
  onToggleMDK,
}: {
  eintrag: DiaryEntry
  onToggleBesonderheit: (id: string, v: boolean) => void
  onToggleMDK: (id: string, v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = KATEGORIE_CONFIG[eintrag.kategorie]

  return (
    <div className={`rounded-xl border ${eintrag.besonderheit ? 'border-orange-300 bg-orange-50' : 'border-[--border] bg-[--background]'} overflow-hidden`}>
      <button
        className="w-full flex items-start gap-3 p-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Date */}
        <div className="shrink-0 text-center min-w-[44px]">
          <div className="text-xs font-bold text-[--foreground]">
            {eintrag.datum.slice(8)}.{eintrag.datum.slice(5, 7)}.
          </div>
          {eintrag.uhrzeit && (
            <div className="text-[10px] text-[--muted-foreground]">{eintrag.uhrzeit.slice(0, 5)}</div>
          )}
        </div>

        {/* Kategorie badge */}
        <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.farbe}`}>
          {cfg.icon}
          {cfg.label}
        </span>

        {/* Text */}
        <p className="flex-1 text-sm text-[--foreground] line-clamp-2">{eintrag.eintrag}</p>

        {/* Indicators */}
        <div className="shrink-0 flex items-center gap-1 ml-1">
          {eintrag.schmerz_skala !== null && eintrag.schmerz_skala !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${eintrag.schmerz_skala >= 7 ? 'bg-red-100 text-red-700' : eintrag.schmerz_skala >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              S{eintrag.schmerz_skala}
            </span>
          )}
          {eintrag.stimmung_skala && (
            <span className="text-base">{STIMMUNG_EMOJI[eintrag.stimmung_skala]}</span>
          )}
          {eintrag.besonderheit && <Flag className="h-3.5 w-3.5 text-orange-500" />}
          {expanded ? <ChevronDown className="h-4 w-4 text-[--muted-foreground]" /> : <ChevronRight className="h-4 w-4 text-[--muted-foreground]" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[--border] pt-3">
          {/* Full text */}
          <p className="text-sm">{eintrag.eintrag}</p>

          {/* Vitals */}
          {(eintrag.blutdruck_systolisch || eintrag.puls || eintrag.temperatur || eintrag.blutzucker || eintrag.gewicht || eintrag.sauerstoffsaettigung) && (
            <div className="flex flex-wrap gap-2">
              {eintrag.blutdruck_systolisch && (
                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-lg">
                  RR {eintrag.blutdruck_systolisch}/{eintrag.blutdruck_diastolisch} mmHg
                </span>
              )}
              {eintrag.puls && (
                <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-lg">
                  Puls {eintrag.puls} bpm
                </span>
              )}
              {eintrag.temperatur && (
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-lg">
                  {eintrag.temperatur}°C
                </span>
              )}
              {eintrag.blutzucker && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg">
                  BZ {eintrag.blutzucker} mg/dL
                </span>
              )}
              {eintrag.gewicht && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                  {eintrag.gewicht} kg
                </span>
              )}
              {eintrag.sauerstoffsaettigung && (
                <span className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-lg">
                  SpO2 {eintrag.sauerstoffsaettigung}%
                </span>
              )}
            </div>
          )}

          {/* Sleep / Appetite */}
          <div className="flex flex-wrap gap-3 text-xs text-[--muted-foreground]">
            {eintrag.schlaf_stunden && <span>Schlaf: {eintrag.schlaf_stunden} h {eintrag.schlaf_qualitaet ? `(${eintrag.schlaf_qualitaet})` : ''}</span>}
            {eintrag.appetit && <span>Appetit: {eintrag.appetit}</span>}
            {eintrag.fluessigkeit_ml && <span>Flüssigkeit: {eintrag.fluessigkeit_ml} ml</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onToggleBesonderheit(eintrag.id, !eintrag.besonderheit)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                eintrag.besonderheit ? 'bg-orange-100 text-orange-700 border-orange-300' : 'border-[--border] text-[--muted-foreground] hover:bg-[--muted]'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              {eintrag.besonderheit ? 'Besonderheit' : 'Als Besonderheit markieren'}
            </button>
            <button
              onClick={() => onToggleMDK(eintrag.id, !eintrag.fuer_mdk_bericht)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                eintrag.fuer_mdk_bericht ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-[--border] text-[--muted-foreground] hover:bg-[--muted]'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Für MDK-Bericht
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vital Charts Tab ──────────────────────────────────────────────────────────

type VitalMetrik = 'blutdruck' | 'puls' | 'temperatur' | 'blutzucker' | 'gewicht' | 'sauerstoff'

const VITAL_METRIK_CONFIG: Record<VitalMetrik, {
  label: string; einheit: string; icon: React.ReactNode
  alarmHoch?: number; alarmNiedrig?: number; color: string
  extract: (e: DiaryEntry) => number | null | undefined
}> = {
  blutdruck: {
    label: 'Blutdruck', einheit: 'mmHg', color: '#0ea5e9',
    icon: <Heart className="h-4 w-4" />,
    alarmHoch: ALARMGRENZEN.blutdruck_sys_hoch, alarmNiedrig: ALARMGRENZEN.blutdruck_sys_niedrig,
    extract: e => e.blutdruck_systolisch,
  },
  puls: {
    label: 'Puls', einheit: 'bpm', color: '#ec4899',
    icon: <Activity className="h-4 w-4" />,
    alarmHoch: ALARMGRENZEN.puls_hoch, alarmNiedrig: ALARMGRENZEN.puls_niedrig,
    extract: e => e.puls,
  },
  temperatur: {
    label: 'Temperatur', einheit: '°C', color: '#f97316',
    icon: <Thermometer className="h-4 w-4" />,
    alarmHoch: ALARMGRENZEN.temperatur_fieber,
    extract: e => e.temperatur,
  },
  blutzucker: {
    label: 'Blutzucker', einheit: 'mg/dL', color: '#8b5cf6',
    icon: <Droplets className="h-4 w-4" />,
    alarmHoch: ALARMGRENZEN.blutzucker_hoch, alarmNiedrig: ALARMGRENZEN.blutzucker_niedrig,
    extract: e => e.blutzucker,
  },
  gewicht: {
    label: 'Gewicht', einheit: 'kg', color: '#10b981',
    icon: <Scale className="h-4 w-4" />,
    extract: e => e.gewicht,
  },
  sauerstoff: {
    label: 'Sauerstoff', einheit: '%', color: '#06b6d4',
    icon: <Wind className="h-4 w-4" />,
    alarmNiedrig: ALARMGRENZEN.sauerstoff_niedrig,
    extract: e => e.sauerstoffsaettigung,
  },
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PflegetagebuchV2Client({ initialEintraege, nutzerName }: Props) {
  const [activeTab, setActiveTab] = useState<'tagebuch' | 'vitalwerte' | 'ki-analyse' | 'mdk-bericht'>('tagebuch')
  const [eintraege, setEintraege] = useState<DiaryEntry[]>(initialEintraege)
  const [quickMode, setQuickMode] = useState<QuickMode>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitial, setModalInitial] = useState<Partial<FormState>>({})

  // Tab 1 state
  const [vonDate, setVonDate] = useState(isoDaysAgo(7))
  const [bisDate, setBisDate] = useState(isoToday())
  const [filterKategorie, setFilterKategorie] = useState<Kategorie | 'alle'>('alle')
  const [loading, setLoading] = useState(false)

  // Tab 2 state
  const [vitalMetrik, setVitalMetrik] = useState<VitalMetrik>('blutdruck')

  // Tab 3 state
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null)
  const [analyseLoading, setAnalyseLoading] = useState(false)
  const [analyseError, setAnalyseError] = useState('')

  // Tab 4 state
  const [mdkVon, setMdkVon] = useState(isoDaysAgo(30))
  const [mdkBis, setMdkBis] = useState(isoToday())
  const [pflegegrad, setPflegegrad] = useState(2)

  const [, startTransition] = useTransition()

  // ── API helpers ──────────────────────────────────────────────────────────

  async function saveEintrag(partial: Partial<FormState>) {
    const body = {
      datum: partial.datum ?? isoToday(),
      kategorie: partial.kategorie ?? 'allgemein',
      eintrag: partial.eintrag ?? '',
      ...(partial.uhrzeit ? { uhrzeit: partial.uhrzeit } : {}),
      ...(partial.schmerz_skala !== undefined ? { schmerz_skala: partial.schmerz_skala } : {}),
      ...(partial.stimmung_skala !== undefined ? { stimmung_skala: partial.stimmung_skala } : {}),
      ...(partial.blutdruck_systolisch !== undefined ? { blutdruck_systolisch: partial.blutdruck_systolisch } : {}),
      ...(partial.blutdruck_diastolisch !== undefined ? { blutdruck_diastolisch: partial.blutdruck_diastolisch } : {}),
      ...(partial.puls !== undefined ? { puls: partial.puls } : {}),
      ...(partial.temperatur !== undefined ? { temperatur: partial.temperatur } : {}),
      ...(partial.blutzucker !== undefined ? { blutzucker: partial.blutzucker } : {}),
      ...(partial.gewicht !== undefined ? { gewicht: partial.gewicht } : {}),
      ...(partial.sauerstoffsaettigung !== undefined ? { sauerstoffsaettigung: partial.sauerstoffsaettigung } : {}),
      ...(partial.fluessigkeit_ml !== undefined ? { fluessigkeit_ml: partial.fluessigkeit_ml } : {}),
      ...(partial.schlaf_stunden !== undefined ? { schlaf_stunden: partial.schlaf_stunden } : {}),
      ...(partial.schlaf_qualitaet !== undefined ? { schlaf_qualitaet: partial.schlaf_qualitaet } : {}),
      ...(partial.appetit !== undefined ? { appetit: partial.appetit } : {}),
      ...(partial.mahlzeit_beschreibung ? { mahlzeit_beschreibung: partial.mahlzeit_beschreibung } : {}),
      besonderheit: partial.besonderheit ?? false,
      fuer_mdk_bericht: partial.fuer_mdk_bericht ?? false,
    }

    const res = await fetch('/api/pflegetagebuch-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('Speichern fehlgeschlagen')
    const json = await res.json()

    // Optimistically add to list
    const newEntry: DiaryEntry = {
      id: json.eintrag.id,
      datum: body.datum,
      uhrzeit: partial.uhrzeit ?? null,
      kategorie: body.kategorie as Kategorie,
      eintrag: body.eintrag,
      schmerz_skala: partial.schmerz_skala ?? null,
      stimmung_skala: partial.stimmung_skala ?? null,
      blutdruck_systolisch: partial.blutdruck_systolisch ?? null,
      blutdruck_diastolisch: partial.blutdruck_diastolisch ?? null,
      puls: partial.puls ?? null,
      temperatur: partial.temperatur ?? null,
      blutzucker: partial.blutzucker ?? null,
      gewicht: partial.gewicht ?? null,
      sauerstoffsaettigung: partial.sauerstoffsaettigung ?? null,
      fluessigkeit_ml: partial.fluessigkeit_ml ?? null,
      schlaf_stunden: partial.schlaf_stunden ?? null,
      schlaf_qualitaet: partial.schlaf_qualitaet ?? null,
      appetit: partial.appetit ?? null,
      mahlzeit_beschreibung: partial.mahlzeit_beschreibung ?? null,
      medikamente_eingenommen: null,
      besonderheit: body.besonderheit,
      fuer_mdk_bericht: body.fuer_mdk_bericht,
      erstellt_am: new Date().toISOString(),
    }
    setEintraege(prev => [newEntry, ...prev])
  }

  async function toggleFlag(id: string, field: 'besonderheit' | 'fuer_mdk_bericht', value: boolean) {
    setEintraege(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
    await fetch(`/api/pflegetagebuch-v2?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  async function ladeEintraege() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ von: vonDate, bis: bisDate, limit: '100' })
      if (filterKategorie !== 'alle') params.set('kategorie', filterKategorie)
      const res = await fetch(`/api/pflegetagebuch-v2?${params}`)
      const json = await res.json()
      if (json.eintraege) setEintraege(json.eintraege)
    } finally {
      setLoading(false)
    }
  }

  async function starteAnalyse() {
    setAnalyseLoading(true)
    setAnalyseError('')
    try {
      const res = await fetch('/api/pflegetagebuch-v2/analyse?force=1')
      if (!res.ok) throw new Error('Analyse fehlgeschlagen')
      const json = await res.json()
      setAnalyse(json)
    } catch (e) {
      setAnalyseError(e instanceof Error ? e.message : 'Fehler bei der Analyse')
    } finally {
      setAnalyseLoading(false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredEintraege = eintraege.filter(e => {
    if (e.datum < vonDate || e.datum > bisDate) return false
    if (filterKategorie !== 'alle' && e.kategorie !== filterKategorie) return false
    return true
  })

  const vitalCfg = VITAL_METRIK_CONFIG[vitalMetrik]
  const vitalChartData: Array<{ datum: string; wert: number; systolisch?: number; diastolisch?: number }> = eintraege
    .filter(e => vitalCfg.extract(e) != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(-30)
    .map(e => ({
      datum: e.datum,
      wert: vitalCfg.extract(e) as number,
      ...(vitalMetrik === 'blutdruck' ? { systolisch: e.blutdruck_systolisch ?? undefined, diastolisch: e.blutdruck_diastolisch ?? undefined } : {}),
    }))

  const latestVital = vitalChartData.length > 0 ? vitalChartData[vitalChartData.length - 1] : null
  const vitalAlarm = latestVital && (
    (vitalCfg.alarmHoch !== undefined && latestVital.wert >= vitalCfg.alarmHoch) ||
    (vitalCfg.alarmNiedrig !== undefined && latestVital.wert <= vitalCfg.alarmNiedrig)
  )

  // MDK
  const mdkEintraege = eintraege.filter(e => e.datum >= mdkVon && e.datum <= mdkBis)
  const mdkBesonderheiten = mdkEintraege.filter(e => e.besonderheit)
  const mdkKatStats = mdkEintraege.reduce<Record<string, number>>((acc, e) => {
    acc[e.kategorie] = (acc[e.kategorie] ?? 0) + 1
    return acc
  }, {})
  const mdkBericht = generiereMDKBericht({
    zeitraum_von: mdkVon,
    zeitraum_bis: mdkBis,
    eintraege: mdkEintraege.map(e => ({ datum: e.datum, kategorie: e.kategorie, eintrag: e.eintrag, besonderheit: e.besonderheit })),
    nutzer_name: nutzerName,
    pflegegrad,
  })

  function downloadMDK() {
    const blob = new Blob([mdkBericht], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MDK-Bericht_${mdkVon}_${mdkBis}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'tagebuch', label: 'Tagebuch', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'vitalwerte', label: 'Vitalwerte', icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'ki-analyse', label: 'KI-Analyse', icon: <Brain className="h-4 w-4" /> },
    { id: 'mdk-bericht', label: 'MDK-Bericht', icon: <FileText className="h-4 w-4" /> },
  ] as const

  return (
    <div className="space-y-4">
      {/* Quick Capture Bar */}
      <div className="rounded-xl border border-[--border] bg-[--background] p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[--muted-foreground]">Schnellerfassung:</span>
          {([
            { mode: 'vital', icon: <Activity className="h-4 w-4" />, label: 'Vitalwerte', color: 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100' },
            { mode: 'medikament', icon: <Pill className="h-4 w-4" />, label: 'Medikament', color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' },
            { mode: 'mahlzeit', icon: <Utensils className="h-4 w-4" />, label: 'Mahlzeit', color: 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100' },
            { mode: 'allgemein', icon: <FileText className="h-4 w-4" />, label: 'Allgemein', color: 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100' },
          ] as const).map(({ mode, icon, label, color }) => (
            <button
              key={mode}
              onClick={() => setQuickMode(q => q === mode ? null : mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${color} ${quickMode === mode ? 'ring-2 ring-offset-1 ring-[--primary]' : ''}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {quickMode === 'vital' && (
          <VitalQuickForm onSave={saveEintrag} />
        )}
        {quickMode === 'medikament' && (
          <QuickTextForm
            kategorie="medikament"
            label="Medikament"
            color="bg-purple-50 border-purple-200 text-purple-700"
            onSave={async d => { await saveEintrag(d); setQuickMode(null) }}
          />
        )}
        {quickMode === 'mahlzeit' && (
          <QuickTextForm
            kategorie="mahlzeit"
            label="Mahlzeit"
            color="bg-orange-50 border-orange-200 text-orange-700"
            onSave={async d => { await saveEintrag(d); setQuickMode(null) }}
          />
        )}
        {quickMode === 'allgemein' && (
          <QuickTextForm
            kategorie="allgemein"
            label="Allgemein"
            color="bg-gray-50 border-gray-200 text-gray-700"
            onSave={async d => { await saveEintrag(d); setQuickMode(null) }}
          />
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-[--muted] rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === t.id
                ? 'bg-[--background] shadow text-[--foreground]'
                : 'text-[--muted-foreground] hover:text-[--foreground]'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab 1: Tagebuch ─────────────────────────────────────────────────── */}
      {activeTab === 'tagebuch' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={vonDate} onChange={e => setVonDate(e.target.value)}
              className="rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm" />
            <span className="text-xs text-[--muted-foreground]">bis</span>
            <input type="date" value={bisDate} onChange={e => setBisDate(e.target.value)}
              className="rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm" />
            <button
              onClick={ladeEintraege}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-[--primary] text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Laden...' : 'Laden'}
            </button>
          </div>

          {/* Kategorie filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterKategorie('alle')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterKategorie === 'alle' ? 'bg-[--primary] text-white border-[--primary]' : 'border-[--border] hover:bg-[--muted]'
              }`}
            >
              Alle ({eintraege.length})
            </button>
            {(Object.keys(KATEGORIE_CONFIG) as Kategorie[]).map(k => {
              const count = eintraege.filter(e => e.kategorie === k).length
              if (count === 0) return null
              const cfg = KATEGORIE_CONFIG[k]
              return (
                <button
                  key={k}
                  onClick={() => setFilterKategorie(k)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterKategorie === k ? `${cfg.farbe} border-current` : 'border-[--border] hover:bg-[--muted]'
                  }`}
                >
                  {cfg.icon}
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Entry list */}
          <div className="space-y-2">
            {filteredEintraege.length === 0 ? (
              <div className="text-center py-12 text-[--muted-foreground]">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Keine Einträge im gewählten Zeitraum</p>
                <p className="text-xs mt-1">Erstellen Sie den ersten Eintrag über den + Button</p>
              </div>
            ) : (
              filteredEintraege.map(e => (
                <EintragItem
                  key={e.id}
                  eintrag={e}
                  onToggleBesonderheit={(id, v) => toggleFlag(id, 'besonderheit', v)}
                  onToggleMDK={(id, v) => toggleFlag(id, 'fuer_mdk_bericht', v)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Vitalwerte & Charts ──────────────────────────────────────── */}
      {activeTab === 'vitalwerte' && (
        <div className="space-y-4">
          {/* Metric selector */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(VITAL_METRIK_CONFIG) as VitalMetrik[]).map(m => {
              const cfg = VITAL_METRIK_CONFIG[m]
              const hasData = eintraege.some(e => cfg.extract(e) != null)
              return (
                <button
                  key={m}
                  onClick={() => setVitalMetrik(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    vitalMetrik === m
                      ? 'bg-[--primary] text-white border-[--primary]'
                      : hasData
                        ? 'border-[--border] hover:bg-[--muted]'
                        : 'border-[--border] text-[--muted-foreground]/50 cursor-default'
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {!hasData && <span className="text-[10px]">(leer)</span>}
                </button>
              )
            })}
          </div>

          {/* Chart card */}
          <div className="rounded-xl border border-[--border] bg-[--background] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                {vitalCfg.icon}
                {vitalCfg.label}
                <span className="text-xs text-[--muted-foreground] font-normal">({vitalCfg.einheit})</span>
              </h3>
              {latestVital && (
                <div className={`text-lg font-bold ${vitalAlarm ? 'text-red-600' : 'text-[--foreground]'}`}>
                  {vitalMetrik === 'blutdruck' && latestVital.systolisch
                    ? `${latestVital.systolisch}/${latestVital.diastolisch}`
                    : latestVital.wert}
                  <span className="text-xs font-normal text-[--muted-foreground] ml-1">{vitalCfg.einheit}</span>
                </div>
              )}
            </div>

            {vitalAlarm && latestVital && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {vitalCfg.alarmHoch !== undefined && latestVital.wert >= vitalCfg.alarmHoch
                    ? `Wert überschreitet Alarmgrenze (${vitalCfg.alarmHoch} ${vitalCfg.einheit})`
                    : `Wert unterschreitet Alarmgrenze (${vitalCfg.alarmNiedrig} ${vitalCfg.einheit})`
                  }
                </span>
              </div>
            )}

            <VitalChart
              werte={vitalChartData}
              einheit={vitalCfg.einheit}
              alarmHoch={vitalCfg.alarmHoch}
              alarmNiedrig={vitalCfg.alarmNiedrig}
              color={vitalCfg.color}
            />

            {/* Alarm legend */}
            <div className="flex items-center gap-4 text-xs text-[--muted-foreground]">
              {vitalCfg.alarmHoch !== undefined && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
                  Alarmgrenze hoch ({vitalCfg.alarmHoch})
                </span>
              )}
              {vitalCfg.alarmNiedrig !== undefined && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-4 border-t-2 border-dashed border-orange-400" />
                  Alarmgrenze niedrig ({vitalCfg.alarmNiedrig})
                </span>
              )}
            </div>

            {/* Trend summary */}
            {vitalChartData.length >= 2 && (() => {
              const first = vitalChartData[0].wert
              const last = vitalChartData[vitalChartData.length - 1].wert
              const diff = last - first
              const TrendIcon = diff > 1 ? TrendingUp : diff < -1 ? TrendingDown : Minus
              return (
                <div className={`flex items-center gap-2 text-sm ${diff > 1 ? 'text-red-600' : diff < -1 ? 'text-blue-600' : 'text-green-600'}`}>
                  <TrendIcon className="h-4 w-4" />
                  {diff > 1
                    ? `Steigend (${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${vitalCfg.einheit} im Zeitraum)`
                    : diff < -1
                      ? `Fallend (${diff.toFixed(1)} ${vitalCfg.einheit} im Zeitraum)`
                      : `Stabil (Änderung: ${diff.toFixed(1)} ${vitalCfg.einheit})`
                  }
                </div>
              )
            })()}
          </div>

          <button
            onClick={() => { setModalInitial({ kategorie: 'vitalwerte' }); setModalOpen(true) }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[--border] text-sm font-medium text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Vitalwerte erfassen
          </button>
        </div>
      )}

      {/* ── Tab 3: KI-Analyse ───────────────────────────────────────────────── */}
      {activeTab === 'ki-analyse' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[--border] bg-[--background] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[--primary]" />
                  KI-Mustererkennung
                </h3>
                <p className="text-xs text-[--muted-foreground] mt-0.5">
                  Analysiert die letzten 30 Tage Ihrer Einträge auf Muster und Auffälligkeiten.
                </p>
              </div>
              <button
                onClick={starteAnalyse}
                disabled={analyseLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[--primary] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {analyseLoading ? (
                  <>
                    <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Analyse starten
                  </>
                )}
              </button>
            </div>

            {analyseLoading && (
              <p className="text-sm text-[--muted-foreground] animate-pulse">Analysiere letzte 30 Tage...</p>
            )}
            {analyseError && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {analyseError}
              </div>
            )}
          </div>

          {analyse && (
            <div className="space-y-4">
              {/* Meta */}
              <p className="text-xs text-[--muted-foreground]">
                Zeitraum: {formatDatum(analyse.zeitraum_von)} – {formatDatum(analyse.zeitraum_bis)} ·{' '}
                {analyse.eintraege_count} Einträge analysiert
                {analyse.cached ? ' · (Cache)' : ''}
              </p>

              {/* Warnungen */}
              {analyse.warnungen.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                  <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnungen ({analyse.warnungen.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {analyse.warnungen.map((w, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="mt-1 shrink-0 h-1.5 w-1.5 rounded-full bg-red-500" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Muster */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Erkannte Muster
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Schmerz-Trend', value: {
                      'besser': '↓ Besser',
                      'schlechter': '↑ Schlechter',
                      'stabil': '→ Stabil',
                      'nicht_erfasst': 'Nicht erfasst',
                    }[analyse.muster.schmerz_trend] },
                    { label: 'Stimmung Ø', value: analyse.muster.stimmungs_durchschnitt
                      ? `${analyse.muster.stimmungs_durchschnitt.toFixed(1)}/5 ${STIMMUNG_EMOJI[Math.round(analyse.muster.stimmungs_durchschnitt)]}`
                      : 'Nicht erfasst' },
                    { label: 'Schlaf Ø', value: analyse.muster.schlaf_durchschnitt
                      ? `${analyse.muster.schlaf_durchschnitt.toFixed(1)} h`
                      : 'Nicht erfasst' },
                    { label: 'Ernährung', value: {
                      'gut': 'Gut',
                      'maessig': 'Mäßig',
                      'schlecht': 'Schlecht',
                      'nicht_erfasst': 'Nicht erfasst',
                    }[analyse.muster.mahlzeit_qualitaet] },
                    { label: 'Flüssigkeit Ø', value: analyse.muster.fluessigkeit_durchschnitt_ml
                      ? `${analyse.muster.fluessigkeit_durchschnitt_ml} ml/Tag`
                      : 'Nicht erfasst' },
                    { label: 'Aktivität', value: {
                      'aktiv': 'Aktiv',
                      'eingeschraenkt': 'Eingeschränkt',
                      'bettlaegerig': 'Bettlägerig',
                      'nicht_erfasst': 'Nicht erfasst',
                    }[analyse.muster.aktivitaets_niveau] },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-blue-900 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empfehlungen */}
              {analyse.empfehlungen.length > 0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <h4 className="text-sm font-bold text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Empfehlungen ({analyse.empfehlungen.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {analyse.empfehlungen.map((r, i) => (
                      <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Historie */}
              {analyse.historie.length > 1 && (
                <div className="rounded-xl border border-[--border] p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Bisherige Analysen</h4>
                  <div className="space-y-2">
                    {analyse.historie.slice(1).map(h => (
                      <div key={h.id} className="flex items-start justify-between gap-2 text-xs text-[--muted-foreground] border-b border-[--border] pb-2">
                        <span>{formatDatum(h.analyse_datum)}</span>
                        <span>{h.warnungen?.length ?? 0} Warnungen · {h.empfehlungen?.length ?? 0} Empfehlungen</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[--muted-foreground]">
                Hinweis: Die KI-Analyse ersetzt keine ärztliche Einschätzung. Bitte wenden Sie sich bei Bedenken an den behandelnden Arzt.
              </p>
            </div>
          )}

          {!analyse && !analyseLoading && (
            <div className="text-center py-12 text-[--muted-foreground]">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Starten Sie die Analyse, um Muster in Ihren Einträgen zu erkennen.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: MDK-Bericht ──────────────────────────────────────────────── */}
      {activeTab === 'mdk-bericht' && (
        <div className="space-y-4">
          {/* Options */}
          <div className="rounded-xl border border-[--border] bg-[--background] p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              MDK-Bericht konfigurieren
            </h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Von</label>
                <input type="date" value={mdkVon} onChange={e => setMdkVon(e.target.value)}
                  className="rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Bis</label>
                <input type="date" value={mdkBis} onChange={e => setMdkBis(e.target.value)}
                  className="rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">Pflegegrad</label>
                <select
                  value={pflegegrad}
                  onChange={e => setPflegegrad(parseInt(e.target.value))}
                  className="rounded-lg border border-[--border] bg-[--background] px-2 py-1.5 text-sm"
                >
                  {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>Pflegegrad {g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded-xl border border-[--border] bg-[--background] p-4 space-y-3">
            <h3 className="text-sm font-semibold">Pflegeprotokoll-Statistik</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(mdkKatStats).sort((a, b) => b[1] - a[1]).map(([k, count]) => {
                const cfg = KATEGORIE_CONFIG[k as Kategorie]
                return (
                  <div key={k} className={`flex items-center justify-between px-3 py-2 rounded-lg ${cfg?.farbe ?? 'bg-[--muted]'}`}>
                    <span className="text-xs font-medium flex items-center gap-1">
                      {cfg?.icon}
                      {cfg?.label ?? k}
                    </span>
                    <span className="text-xs font-bold">{count}</span>
                  </div>
                )
              })}
              {Object.keys(mdkKatStats).length === 0 && (
                <p className="col-span-3 text-xs text-[--muted-foreground]">Keine Einträge im Zeitraum</p>
              )}
            </div>
            <p className="text-xs text-[--muted-foreground]">
              Gesamt: {mdkEintraege.length} Einträge · {mdkBesonderheiten.length} Besonderheiten
            </p>
          </div>

          {/* Besonderheiten list */}
          {mdkBesonderheiten.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
              <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Besonderheiten im Zeitraum ({mdkBesonderheiten.length})
              </h3>
              <div className="space-y-2">
                {mdkBesonderheiten.map(e => (
                  <div key={e.id} className="bg-white/70 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-orange-700">{formatDatum(e.datum)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${KATEGORIE_CONFIG[e.kategorie].farbe}`}>
                        {KATEGORIE_CONFIG[e.kategorie].label}
                      </span>
                    </div>
                    <p className="text-xs text-[--foreground]">{e.eintrag}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bericht Vorschau */}
          <div className="rounded-xl border border-[--border] bg-[--background] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Berichtsvorschau</h3>
              <button
                onClick={downloadMDK}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[--primary] text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="h-3.5 w-3.5" />
                Als TXT herunterladen
              </button>
            </div>
            <pre className="text-[11px] text-[--foreground] font-mono whitespace-pre-wrap bg-[--muted] rounded-lg p-3 max-h-80 overflow-y-auto">
              {mdkBericht}
            </pre>
          </div>
        </div>
      )}

      {/* FAB — only on tagebuch tab */}
      {activeTab === 'tagebuch' && (
        <button
          onClick={() => { setModalInitial({}); setModalOpen(true) }}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[--primary] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity z-40"
          aria-label="Neuen Eintrag erstellen"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {/* New entry modal */}
      <NewEintragModal
        open={modalOpen}
        initial={modalInitial}
        onClose={() => setModalOpen(false)}
        onSave={saveEintrag}
      />
    </div>
  )
}
