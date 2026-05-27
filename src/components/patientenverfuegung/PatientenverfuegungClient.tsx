'use client'

import { useState, useCallback } from 'react'
import {
  Heart,
  UserCheck,
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  QrCode,
  AlertTriangle,
  FileText,
  Clock,
  Ban,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  PVTyp,
  PatientenverfuegungInhalt,
  VorsorgevollmachtInhalt,
  PV_SCHRITTE,
  VV_SCHRITTE,
  TYP_LABELS,
  STATUS_LABELS,
  defaultPVInhalt,
  defaultVVInhalt,
  defaultBVInhalt,
  BetreuungsverfuegungInhalt,
  BV_SCHRITTE,
} from '@/lib/patientenverfuegung/templates'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Verfuegung {
  id: string
  typ: PVTyp
  status: 'entwurf' | 'fertig' | 'widerrufen'
  inhalt: Record<string, unknown>
  qr_code_token: string
  erstellt_am: string
  aktualisiert_am: string
  widerrufen_am: string | null
  pv_bevollmaechtigte: Array<{
    id: string
    name: string
    beziehung: string | null
    telefon: string | null
    email: string | null
    adresse: string | null
    prioritaet: number
  }>
}

interface Props {
  initialVerfuegungen: Verfuegung[]
}

type ActiveTab = 'uebersicht' | 'assistent' | 'dokumente'

// ─── PDF Generation ──────────────────────────────────────────────────────────

function generatePVText(inhalt: PatientenverfuegungInhalt): string {
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const situationenText = [
    inhalt.situationen.irreversible_bewusstlosigkeit && '- Irreversible Bewusstlosigkeit (z. B. Wachkoma)',
    inhalt.situationen.schwere_hirnschaedigung && '- Schwere Hirnschädigung mit dauerhafter Pflegebedürftigkeit',
    inhalt.situationen.endstadium_erkrankung && '- Endstadium einer unheilbaren Erkrankung',
    inhalt.situationen.demenz_endstadium && '- Schwere Demenz im Endstadium',
    inhalt.situationen.nach_reanimation_schwer_geschaedigt && '- Schwere Schädigung nach Wiederbelebung',
  ].filter(Boolean).join('\n')

  const behandlungText = [
    `Intensivmedizin: ${inhalt.behandlungswuensche.intensivmedizin === 'ja' ? 'gewünscht' : inhalt.behandlungswuensche.intensivmedizin === 'nein' ? 'nicht gewünscht' : 'situationsabhängig'}`,
    `Künstliche Beatmung: ${inhalt.behandlungswuensche.kuenstliche_beatmung}`,
    `Künstliche Ernährung: ${inhalt.behandlungswuensche.kuenstliche_ernaehrung}`,
    `Dialyse: ${inhalt.behandlungswuensche.dialyse}`,
    `Wiederbelebung: ${inhalt.behandlungswuensche.wiederbelebung === 'ja' ? 'gewünscht' : 'nicht gewünscht'}`,
    `Schmerztherapie: ${inhalt.behandlungswuensche.schmerztherapie === 'palliativ' ? 'palliativ (Schmerzlinderung im Vordergrund)' : 'maximal'}`,
    `Hospizversorgung: ${inhalt.behandlungswuensche.hospiz ? 'gewünscht' : 'nicht gewünscht'}`,
    `Organspende: ${inhalt.behandlungswuensche.organspende}`,
  ].map(t => `  - ${t}`).join('\n')

  const zeugenText = inhalt.zeugen.length > 0
    ? inhalt.zeugen.map((z, i) => `Zeuge ${i + 1}: ${z.name}, ${z.adresse}`).join('\n')
    : 'Keine Zeugen angegeben'

  return `PATIENTENVERFÜGUNG

gemäß § 1827 BGB

Erstellt am: ${heute}

═══════════════════════════════════════════════════════════════

1. PERSÖNLICHE ANGABEN

Ich, ${inhalt.vollstaendiger_name},
geboren am: ${inhalt.geburtsdatum ? new Date(inhalt.geburtsdatum).toLocaleDateString('de-DE') : '___________'},
Geburtsort: ${inhalt.geburtsort},
wohnhaft in: ${inhalt.adresse},

bestimme hiermit für den Fall, dass ich meinen Willen nicht mehr bilden oder verständlich äußern kann, folgendes:

═══════════════════════════════════════════════════════════════

2. GELTUNGSBEREICH

Diese Patientenverfügung soll gelten, wenn ich mich in einer der folgenden Situationen befinde:

${situationenText || '(Keine Situationen ausgewählt)'}

═══════════════════════════════════════════════════════════════

3. BEHANDLUNGSWÜNSCHE

In den oben genannten Situationen wünsche ich folgende medizinische Behandlung bzw. lehne ich folgende Maßnahmen ab:

${behandlungText}

═══════════════════════════════════════════════════════════════

4. STERBENSORT UND WEITERE WÜNSCHE

Gewünschter Sterbeort: ${inhalt.wuensche.sterbensort === 'zuhause' ? 'Zu Hause' : inhalt.wuensche.sterbensort === 'hospiz' ? 'Hospiz' : inhalt.wuensche.sterbensort === 'krankenhaus' ? 'Krankenhaus' : 'Pflegeheim'}

${inhalt.wuensche.religioes_weltanschaulich ? `Religiöse/weltanschauliche Wünsche:\n${inhalt.wuensche.religioes_weltanschaulich}\n` : ''}
${inhalt.wuensche.persoenliche_erklaerung ? `Persönliche Erklärung:\n${inhalt.wuensche.persoenliche_erklaerung}\n` : ''}

═══════════════════════════════════════════════════════════════

5. UNTERSCHRIFT UND ZEUGEN

Ort, Datum: ${inhalt.ort_datum}

___________________________
Unterschrift (${inhalt.vollstaendiger_name})

Diese Patientenverfügung wurde in meiner Anwesenheit und nach meiner Bestätigung der Einwilligungsfähigkeit unterzeichnet:

${zeugenText}

═══════════════════════════════════════════════════════════════

HINWEIS: Diese Patientenverfügung ist gemäß § 1827 BGB rechtsverbindlich. Für weitere Gültigkeit empfiehlt sich eine jährliche Bestätigung durch erneute Unterzeichnung. Eine notarielle Beglaubigung ist nicht erforderlich, kann aber empfehlenswert sein.

Erstellt mit xcare — Digitale Pflegeplattform
`
}

function generateVVText(inhalt: VorsorgevollmachtInhalt): string {
  const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const bevollmaechtigteText = inhalt.bevollmaechtigte.map((b, i) =>
    `${i + 1}. ${b.name} (${b.beziehung}), ${b.adresse}${b.gemeinschaftlich ? ' — handelt gemeinschaftlich' : ''}`
  ).join('\n')

  const befugnisseText = [
    inhalt.befugnisse.gesundheitssorge && '- Gesundheitssorge (inkl. Entscheidungen über ärztliche Behandlungen)',
    inhalt.befugnisse.aufenthaltsbestimmung && '- Aufenthaltsbestimmung',
    inhalt.befugnisse.vermoegensverwaltung && '- Vermögensverwaltung',
    inhalt.befugnisse.immobilien && '- Immobiliengeschäfte (inkl. Kauf, Verkauf, Belastung)',
    inhalt.befugnisse.bankgeschaefte && '- Bankgeschäfte',
    inhalt.befugnisse.post_telekommunikation && '- Post- und Telekommunikation',
    inhalt.befugnisse.behoerden && '- Vertretung gegenüber Behörden und Ämtern',
    inhalt.befugnisse.gerichtlich && '- Gerichtliche Vertretung',
  ].filter(Boolean).join('\n')

  return `VORSORGEVOLLMACHT

Erstellt am: ${heute}

═══════════════════════════════════════════════════════════════

1. VOLLMACHTGEBER

Ich, ${inhalt.vollmachtgeber.name},
geboren am: ${inhalt.vollmachtgeber.geburtsdatum ? new Date(inhalt.vollmachtgeber.geburtsdatum).toLocaleDateString('de-DE') : '___________'},
wohnhaft in: ${inhalt.vollmachtgeber.adresse},

erteile hiermit Vollmacht an:

═══════════════════════════════════════════════════════════════

2. BEVOLLMÄCHTIGTE PERSONEN

${bevollmaechtigteText || '(Keine Bevollmächtigten angegeben)'}

═══════════════════════════════════════════════════════════════

3. UMFANG DER VOLLMACHT

Die bevollmächtigte Person ist berechtigt, mich in folgenden Bereichen zu vertreten:

${befugnisseText || '(Keine Befugnisse ausgewählt)'}

${inhalt.untervollmacht ? '4. UNTERVOLLMACHT\n\nDie bevollmächtigte Person ist berechtigt, Untervollmachten zu erteilen.\n\n' : ''}
${inhalt.befreiung_selbstkontrahierung ? '5. BEFREIUNG VON § 181 BGB\n\nDie bevollmächtigte Person ist von den Beschränkungen des § 181 BGB (Insichgeschäfte) befreit.\n\n' : ''}

═══════════════════════════════════════════════════════════════

UNTERSCHRIFT

Ort, Datum: ${inhalt.ort_datum}

___________________________
Unterschrift des Vollmachtgebers (${inhalt.vollmachtgeber.name})

═══════════════════════════════════════════════════════════════

HINWEIS: Diese Vorsorgevollmacht sollte beim Zentralen Vorsorgeregister der Bundesnotarkammer registriert werden. Eine notarielle Beglaubigung oder Beurkundung ist für Grundstücksgeschäfte und Bankgeschäfte empfohlen.

Erstellt mit xcare — Digitale Pflegeplattform
`
}

function downloadAsText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'entwurf' | 'fertig' | 'widerrufen' }) {
  const map = {
    entwurf: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    fertig: 'bg-green-100 text-green-800 border-green-200',
    widerrufen: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {status === 'fertig' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'entwurf' && <Clock className="h-3 w-3" />}
      {status === 'widerrufen' && <Ban className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  )
}

function TypBadge({ typ }: { typ: PVTyp }) {
  const map: Record<PVTyp, string> = {
    patientenverfuegung: 'bg-blue-100 text-blue-800 border-blue-200',
    vorsorgevollmacht: 'bg-purple-100 text-purple-800 border-purple-200',
    betreuungsverfuegung: 'bg-orange-100 text-orange-800 border-orange-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[typ]}`}>
      {TYP_LABELS[typ]}
    </span>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full bg-[--muted] rounded-full h-2">
      <div
        className="bg-[--primary] h-2 rounded-full transition-all duration-300"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  )
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[--border] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[--muted] hover:bg-[--accent] text-sm font-medium text-[--foreground] transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-[--muted-foreground]" /> : <ChevronDown className="h-4 w-4 text-[--muted-foreground]" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-[--muted-foreground] bg-[--background]">{children}</div>}
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[--background] border border-[--border] rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold text-[--foreground]">{title}</h3>
        </div>
        <p className="text-sm text-[--muted-foreground] mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-[--border] rounded-lg hover:bg-[--muted] text-[--foreground] transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird widerrufen…' : 'Ja, widerrufen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Wizard: Patientenverfügung ───────────────────────────────────────────────

function PVWizard({ onFinish, onCancel }: { onFinish: (v: Verfuegung) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inhalt, setInhalt] = useState<PatientenverfuegungInhalt>(defaultPVInhalt())

  const totalSteps = PV_SCHRITTE.length

  function updateInhalt(partial: Partial<PatientenverfuegungInhalt>) {
    setInhalt(prev => ({ ...prev, ...partial }))
  }

  function updateSituation(key: keyof PatientenverfuegungInhalt['situationen'], val: boolean) {
    setInhalt(prev => ({ ...prev, situationen: { ...prev.situationen, [key]: val } }))
  }

  function updateBehandlung<K extends keyof PatientenverfuegungInhalt['behandlungswuensche']>(
    key: K,
    val: PatientenverfuegungInhalt['behandlungswuensche'][K]
  ) {
    setInhalt(prev => ({ ...prev, behandlungswuensche: { ...prev.behandlungswuensche, [key]: val } }))
  }

  function updateWunsch<K extends keyof PatientenverfuegungInhalt['wuensche']>(
    key: K,
    val: PatientenverfuegungInhalt['wuensche'][K]
  ) {
    setInhalt(prev => ({ ...prev, wuensche: { ...prev.wuensche, [key]: val } }))
  }

  function addZeuge() {
    if (inhalt.zeugen.length >= 2) return
    setInhalt(prev => ({ ...prev, zeugen: [...prev.zeugen, { name: '', adresse: '' }] }))
  }

  function updateZeuge(index: number, field: 'name' | 'adresse', val: string) {
    setInhalt(prev => {
      const updated = [...prev.zeugen]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, zeugen: updated }
    })
  }

  function removeZeuge(index: number) {
    setInhalt(prev => ({ ...prev, zeugen: prev.zeugen.filter((_, i) => i !== index) }))
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      // Save as 'fertig'
      const createRes = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'patientenverfuegung', inhalt }),
      })
      if (!createRes.ok) {
        const d = await createRes.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await createRes.json()

      // Mark as fertig
      await fetch(`/api/patientenverfuegung/${verfuegung.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inhalt, status: 'fertig' }),
      })

      // Download
      downloadAsText(generatePVText(inhalt), `Patientenverfuegung_${inhalt.vollstaendiger_name || 'xcare'}.txt`)

      onFinish({ ...verfuegung, status: 'fertig', pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'patientenverfuegung', inhalt }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await res.json()
      onFinish({ ...verfuegung, pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  const labelCls = 'block text-sm font-medium text-[--foreground] mb-1'
  const inputCls = 'w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]'

  const jaNeinBefristet = ['ja', 'nein', 'befristet'] as const
  const jaNeinSituationsabh = ['ja', 'nein', 'situationsabhaengig'] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[--muted-foreground]">
            Schritt {step + 1} von {totalSteps}: <strong>{PV_SCHRITTE[step].titel}</strong>
          </span>
          <button onClick={onCancel} className="text-sm text-[--muted-foreground] hover:text-[--foreground]">
            Abbrechen
          </button>
        </div>
        <ProgressBar current={step} total={totalSteps} />
        <p className="mt-2 text-sm text-[--muted-foreground]">{PV_SCHRITTE[step].beschreibung}</p>
      </div>

      {/* Step 0: Persönliche Daten */}
      {step === 0 && (
        <div className="space-y-4">
          <InfoBox>
            Ihre persönlichen Daten werden ausschließlich in die Patientenverfügung eingetragen und nicht für andere Zwecke verwendet.
          </InfoBox>
          <div>
            <label className={labelCls}>Vollständiger Name *</label>
            <input className={inputCls} value={inhalt.vollstaendiger_name} onChange={e => updateInhalt({ vollstaendiger_name: e.target.value })} placeholder="Vorname Nachname" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Geburtsdatum *</label>
              <input type="date" className={inputCls} value={inhalt.geburtsdatum} onChange={e => updateInhalt({ geburtsdatum: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Geburtsort</label>
              <input className={inputCls} value={inhalt.geburtsort} onChange={e => updateInhalt({ geburtsort: e.target.value })} placeholder="z. B. Berlin" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Aktuelle Adresse *</label>
            <textarea className={inputCls} rows={3} value={inhalt.adresse} onChange={e => updateInhalt({ adresse: e.target.value })} placeholder="Straße, Hausnummer, PLZ, Stadt" />
          </div>
        </div>
      )}

      {/* Step 1: Situationen */}
      {step === 1 && (
        <div className="space-y-4">
          <InfoBox>
            Wählen Sie die medizinischen Situationen, in denen Ihre Patientenverfügung gelten soll. Sie können mehrere auswählen.
          </InfoBox>
          {[
            { key: 'irreversible_bewusstlosigkeit' as const, label: 'Irreversible Bewusstlosigkeit', detail: 'Ein dauerhafter Zustand der Bewusstlosigkeit, aus dem keine Rückkehr zu erwartendem Bewusstsein möglich ist (z. B. apallisches Syndrom / Wachkoma).' },
            { key: 'schwere_hirnschaedigung' as const, label: 'Schwere Hirnschädigung', detail: 'Dauerhafte, schwere Hirnschädigungen mit dauerhafter Pflegebedürftigkeit und ohne erkennbare Leidensfähigkeit.' },
            { key: 'endstadium_erkrankung' as const, label: 'Endstadium einer unheilbaren Erkrankung', detail: 'Unheilbare, zum Tode führende Erkrankung in einem weit fortgeschrittenen Stadium, z. B. Krebs im Endstadium.' },
            { key: 'demenz_endstadium' as const, label: 'Schwere Demenz im Endstadium', detail: 'Fortgeschrittene Demenzerkrankung mit vollständigem Verlust von Orientierung, Sprache und Selbständigkeit.' },
            { key: 'nach_reanimation_schwer_geschaedigt' as const, label: 'Schwere Schädigung nach Wiederbelebung', detail: 'Zustand nach Wiederbelebung mit dauerhafter schwerer Hirnschädigung ohne realistische Aussicht auf Besserung.' },
          ].map(({ key, label, detail }) => (
            <div key={key} className="border border-[--border] rounded-lg p-4 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inhalt.situationen[key]}
                  onChange={e => updateSituation(key, e.target.checked)}
                  className="h-4 w-4 rounded border-[--border] text-[--primary]"
                />
                <span className="text-sm font-medium text-[--foreground]">{label}</span>
              </label>
              <Accordion title="Medizinische Erklärung">
                {detail}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Behandlungswünsche */}
      {step === 2 && (
        <div className="space-y-5">
          <InfoBox>
            Legen Sie fest, welche medizinischen Maßnahmen Sie in den oben gewählten Situationen wünschen oder ablehnen.
          </InfoBox>

          {/* Intensivmedizin */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Intensivmedizinische Behandlung</label>
            <div className="flex gap-3 flex-wrap">
              {jaNeinSituationsabh.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="intensivmedizin" value={opt} checked={inhalt.behandlungswuensche.intensivmedizin === opt} onChange={() => updateBehandlung('intensivmedizin', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja' : opt === 'nein' ? 'Nein' : 'Situationsabhängig'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Beatmung */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Künstliche Beatmung</label>
            <div className="flex gap-3 flex-wrap">
              {jaNeinBefristet.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="beatmung" value={opt} checked={inhalt.behandlungswuensche.kuenstliche_beatmung === opt} onChange={() => updateBehandlung('kuenstliche_beatmung', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja' : opt === 'nein' ? 'Nein' : 'Befristet / versuchsweise'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ernährung */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Künstliche Ernährung (z. B. PEG-Sonde)</label>
            <div className="flex gap-3 flex-wrap">
              {jaNeinBefristet.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ernaehrung" value={opt} checked={inhalt.behandlungswuensche.kuenstliche_ernaehrung === opt} onChange={() => updateBehandlung('kuenstliche_ernaehrung', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja' : opt === 'nein' ? 'Nein' : 'Befristet / versuchsweise'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dialyse */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Dialyse (Blutwäsche)</label>
            <div className="flex gap-3 flex-wrap">
              {jaNeinBefristet.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="dialyse" value={opt} checked={inhalt.behandlungswuensche.dialyse === opt} onChange={() => updateBehandlung('dialyse', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja' : opt === 'nein' ? 'Nein' : 'Befristet / versuchsweise'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Wiederbelebung */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Wiederbelebung (Reanimation)</label>
            <div className="flex gap-3 flex-wrap">
              {(['ja', 'nein'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wiederbelebung" value={opt} checked={inhalt.behandlungswuensche.wiederbelebung === opt} onChange={() => updateBehandlung('wiederbelebung', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja, gewünscht' : 'Nein, nicht gewünscht'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Schmerztherapie */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Schmerztherapie</label>
            <div className="flex gap-3 flex-wrap">
              {(['palliativ', 'maximal'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="schmerz" value={opt} checked={inhalt.behandlungswuensche.schmerztherapie === opt} onChange={() => updateBehandlung('schmerztherapie', opt)} />
                  <span className="text-sm">{opt === 'palliativ' ? 'Palliativ (Schmerzlinderung im Vordergrund)' : 'Maximal (alle verfügbaren Mittel)'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hospiz */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={inhalt.behandlungswuensche.hospiz} onChange={e => updateBehandlung('hospiz', e.target.checked)} className="h-4 w-4 rounded" />
              <span className="text-sm font-medium text-[--foreground]">Hospizversorgung gewünscht</span>
            </label>
          </div>

          {/* Organspende */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Organspende</label>
            <div className="flex gap-3 flex-wrap">
              {(['ja', 'nein', 'bereits_geregelt'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="organspende" value={opt} checked={inhalt.behandlungswuensche.organspende === opt} onChange={() => updateBehandlung('organspende', opt)} />
                  <span className="text-sm">{opt === 'ja' ? 'Ja, Spender' : opt === 'nein' ? 'Nein, kein Spender' : 'Bereits anderweitig geregelt'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Weitere Wünsche */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">Gewünschter Sterbeort</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'zuhause', label: 'Zu Hause' },
                { value: 'hospiz', label: 'Hospiz' },
                { value: 'krankenhaus', label: 'Krankenhaus' },
                { value: 'pflegeheim', label: 'Pflegeheim' },
              ] as const).map(({ value, label }) => (
                <label key={value} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${inhalt.wuensche.sterbensort === value ? 'border-[--primary] bg-[--accent]' : 'border-[--border] hover:bg-[--muted]'}`}>
                  <input type="radio" name="sterbensort" value={value} checked={inhalt.wuensche.sterbensort === value} onChange={() => updateWunsch('sterbensort', value)} className="sr-only" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Religiöse oder weltanschauliche Wünsche</label>
            <textarea
              className={inputCls}
              rows={3}
              value={inhalt.wuensche.religioes_weltanschaulich}
              onChange={e => updateWunsch('religioes_weltanschaulich', e.target.value)}
              placeholder="z. B. Ich wünsche priesterlichen Beistand, Gebete, bestimmte Rituale…"
            />
          </div>
          <div>
            <label className={labelCls}>Persönliche Erklärung</label>
            <p className="text-xs text-[--muted-foreground] mb-2">
              Hier können Sie in eigenen Worten erläutern, was Ihnen in der beschriebenen Situation wichtig ist.
            </p>
            <textarea
              className={inputCls}
              rows={5}
              value={inhalt.wuensche.persoenliche_erklaerung}
              onChange={e => updateWunsch('persoenliche_erklaerung', e.target.value)}
              placeholder="Meine persönliche Wertvorstellung und was mir in dieser Situation wichtig wäre…"
            />
          </div>
        </div>
      )}

      {/* Step 4: Abschluss */}
      {step === 4 && (
        <div className="space-y-5">
          <InfoBox>
            Die Patientenverfügung muss eigenhändig unterschrieben werden. Mit dem Absenden bestätigen Sie, dass Sie das Dokument unterschrieben haben. Bitte fügen Sie bis zu 2 Zeugen hinzu (empfohlen).
          </InfoBox>
          <div>
            <label className={labelCls}>Ort und Datum der Unterzeichnung *</label>
            <input className={inputCls} value={inhalt.ort_datum} onChange={e => updateInhalt({ ort_datum: e.target.value })} placeholder="z. B. Berlin, 27.05.2026" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[--foreground]">Zeugen (empfohlen, max. 2)</label>
              {inhalt.zeugen.length < 2 && (
                <button type="button" onClick={addZeuge} className="text-sm text-[--primary] hover:underline flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Zeuge hinzufügen
                </button>
              )}
            </div>
            {inhalt.zeugen.length === 0 && (
              <p className="text-sm text-[--muted-foreground]">Keine Zeugen hinzugefügt.</p>
            )}
            {inhalt.zeugen.map((zeuge, i) => (
              <div key={i} className="border border-[--border] rounded-lg p-4 mb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Zeuge {i + 1}</span>
                  <button type="button" onClick={() => removeZeuge(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input className={inputCls} value={zeuge.name} onChange={e => updateZeuge(i, 'name', e.target.value)} placeholder="Vollständiger Name" />
                <input className={inputCls} value={zeuge.adresse} onChange={e => updateZeuge(i, 'adresse', e.target.value)} placeholder="Adresse" />
              </div>
            ))}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inhalt.unterschrift_bestaetigt}
              onChange={e => updateInhalt({ unterschrift_bestaetigt: e.target.checked })}
              className="h-4 w-4 mt-0.5 rounded border-[--border]"
            />
            <span className="text-sm text-[--foreground]">
              Ich bestätige, dass ich dieses Dokument eigenhändig unterschrieben habe und in vollem Bewusstsein meiner Entscheidungsfähigkeit handle.
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--foreground] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
        )}
        <div className="flex-1" />
        {step < totalSteps - 1 ? (
          <>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--muted-foreground] transition-colors"
            >
              Entwurf speichern
            </button>
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving || !inhalt.unterschrift_bestaetigt || !inhalt.ort_datum.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Wird gespeichert…' : (
              <>
                <Download className="h-4 w-4" /> Fertigstellen &amp; PDF herunterladen
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Wizard: Vorsorgevollmacht ────────────────────────────────────────────────

function VVWizard({ onFinish, onCancel }: { onFinish: (v: Verfuegung) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inhalt, setInhalt] = useState<VorsorgevollmachtInhalt>(defaultVVInhalt())

  const totalSteps = VV_SCHRITTE.length

  const labelCls = 'block text-sm font-medium text-[--foreground] mb-1'
  const inputCls = 'w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]'

  function updateVG(field: keyof VorsorgevollmachtInhalt['vollmachtgeber'], val: string) {
    setInhalt(prev => ({ ...prev, vollmachtgeber: { ...prev.vollmachtgeber, [field]: val } }))
  }

  function addBevollmaechtigter() {
    setInhalt(prev => ({
      ...prev,
      bevollmaechtigte: [...prev.bevollmaechtigte, { name: '', beziehung: '', adresse: '', gemeinschaftlich: false }],
    }))
  }

  function removeBevollmaechtigter(i: number) {
    setInhalt(prev => ({ ...prev, bevollmaechtigte: prev.bevollmaechtigte.filter((_, idx) => idx !== i) }))
  }

  function updateBevollmaechtigter(i: number, field: keyof VorsorgevollmachtInhalt['bevollmaechtigte'][number], val: string | boolean) {
    setInhalt(prev => {
      const updated = [...prev.bevollmaechtigte]
      updated[i] = { ...updated[i], [field]: val }
      return { ...prev, bevollmaechtigte: updated }
    })
  }

  function updateBefugnis(key: keyof VorsorgevollmachtInhalt['befugnisse'], val: boolean) {
    setInhalt(prev => ({ ...prev, befugnisse: { ...prev.befugnisse, [key]: val } }))
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const createRes = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'vorsorgevollmacht', inhalt }),
      })
      if (!createRes.ok) {
        const d = await createRes.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await createRes.json()

      await fetch(`/api/patientenverfuegung/${verfuegung.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inhalt, status: 'fertig' }),
      })

      downloadAsText(generateVVText(inhalt), `Vorsorgevollmacht_${inhalt.vollmachtgeber.name || 'xcare'}.txt`)
      onFinish({ ...verfuegung, status: 'fertig', pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'vorsorgevollmacht', inhalt }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await res.json()
      onFinish({ ...verfuegung, pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[--muted-foreground]">
            Schritt {step + 1} von {totalSteps}: <strong>{VV_SCHRITTE[step].titel}</strong>
          </span>
          <button onClick={onCancel} className="text-sm text-[--muted-foreground] hover:text-[--foreground]">Abbrechen</button>
        </div>
        <ProgressBar current={step} total={totalSteps} />
        <p className="mt-2 text-sm text-[--muted-foreground]">{VV_SCHRITTE[step].beschreibung}</p>
      </div>

      {/* Step 0: Vollmachtgeber */}
      {step === 0 && (
        <div className="space-y-4">
          <InfoBox>
            Der Vollmachtgeber ist die Person, die die Vollmacht erteilt — also Sie selbst.
          </InfoBox>
          <div>
            <label className={labelCls}>Vollständiger Name *</label>
            <input className={inputCls} value={inhalt.vollmachtgeber.name} onChange={e => updateVG('name', e.target.value)} placeholder="Vorname Nachname" />
          </div>
          <div>
            <label className={labelCls}>Geburtsdatum</label>
            <input type="date" className={inputCls} value={inhalt.vollmachtgeber.geburtsdatum} onChange={e => updateVG('geburtsdatum', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Adresse *</label>
            <textarea className={inputCls} rows={3} value={inhalt.vollmachtgeber.adresse} onChange={e => updateVG('adresse', e.target.value)} placeholder="Straße, Hausnummer, PLZ, Stadt" />
          </div>
        </div>
      )}

      {/* Step 1: Bevollmächtigte */}
      {step === 1 && (
        <div className="space-y-4">
          <InfoBox>
            Bevollmächtigte sind die Personen, die in Ihrem Namen handeln dürfen. Sie können mehrere Personen angeben.
          </InfoBox>
          {inhalt.bevollmaechtigte.map((b, i) => (
            <div key={i} className="border border-[--border] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[--foreground]">Bevollmächtigte Person {i + 1}</span>
                <button type="button" onClick={() => removeBevollmaechtigter(i)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input className={inputCls} value={b.name} onChange={e => updateBevollmaechtigter(i, 'name', e.target.value)} placeholder="Vollständiger Name" />
              <input className={inputCls} value={b.beziehung} onChange={e => updateBevollmaechtigter(i, 'beziehung', e.target.value)} placeholder="Beziehung (z. B. Ehefrau, Sohn, Freund)" />
              <textarea className={inputCls} rows={2} value={b.adresse} onChange={e => updateBevollmaechtigter(i, 'adresse', e.target.value)} placeholder="Adresse" />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={b.gemeinschaftlich} onChange={e => updateBevollmaechtigter(i, 'gemeinschaftlich', e.target.checked)} className="h-4 w-4 rounded" />
                <span>Nur gemeinschaftlich mit anderen Bevollmächtigten handeln</span>
              </label>
            </div>
          ))}
          <button type="button" onClick={addBevollmaechtigter} className="flex items-center gap-2 px-4 py-2 border border-dashed border-[--border] rounded-lg text-sm text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary] w-full justify-center transition-colors">
            <Plus className="h-4 w-4" /> Person hinzufügen
          </button>
        </div>
      )}

      {/* Step 2: Befugnisse */}
      {step === 2 && (
        <div className="space-y-4">
          <InfoBox>
            Wählen Sie, welche Entscheidungen die bevollmächtigte Person in Ihrem Namen treffen darf.
          </InfoBox>
          {[
            { key: 'gesundheitssorge' as const, label: 'Gesundheitssorge', detail: 'Entscheidungen über ärztliche Untersuchungen, Behandlungen und Pflegemaßnahmen, einschließlich der Einwilligung oder Verweigerung.' },
            { key: 'aufenthaltsbestimmung' as const, label: 'Aufenthaltsbestimmung', detail: 'Bestimmung des Aufenthaltsortes, z. B. Einweisung in ein Pflegeheim oder Krankenhaus.' },
            { key: 'vermoegensverwaltung' as const, label: 'Vermögensverwaltung', detail: 'Verwaltung von Konten, Wertpapieren, Versicherungen und sonstigem Vermögen.' },
            { key: 'immobilien' as const, label: 'Immobiliengeschäfte', detail: 'Kauf, Verkauf, Belastung oder Verwaltung von Grundstücken und Immobilien (notarielle Beurkundung erforderlich).' },
            { key: 'bankgeschaefte' as const, label: 'Bankgeschäfte', detail: 'Überweisungen, Abhebungen, Kontoführung und weitere Bankgeschäfte.' },
            { key: 'post_telekommunikation' as const, label: 'Post und Telekommunikation', detail: 'Empfang und Öffnen von Post sowie Nutzung von Telefon und digitalen Kommunikationsmitteln.' },
            { key: 'behoerden' as const, label: 'Behördenvertretung', detail: 'Vertretung gegenüber Behörden, Ämtern, Gerichten und Versicherungen.' },
            { key: 'gerichtlich' as const, label: 'Gerichtliche Vertretung', detail: 'Führung von Rechtsstreitigkeiten und Vertretung vor Gericht.' },
          ].map(({ key, label, detail }) => (
            <div key={key} className="border border-[--border] rounded-lg p-4 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={inhalt.befugnisse[key]} onChange={e => updateBefugnis(key, e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium text-[--foreground]">{label}</span>
              </label>
              <Accordion title="Rechtliche Erklärung">
                {detail}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Abschluss */}
      {step === 3 && (
        <div className="space-y-5">
          <InfoBox>
            Die Vorsorgevollmacht wird mit Ihrer Unterschrift wirksam. Für Immobilien- und Bankgeschäfte empfiehlt sich eine notarielle Beglaubigung.
          </InfoBox>
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <input type="checkbox" checked={inhalt.untervollmacht} onChange={e => setInhalt(prev => ({ ...prev, untervollmacht: e.target.checked }))} className="h-4 w-4 rounded" />
              <span className="text-sm text-[--foreground]">Bevollmächtigte dürfen Untervollmachten erteilen</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={inhalt.befreiung_selbstkontrahierung} onChange={e => setInhalt(prev => ({ ...prev, befreiung_selbstkontrahierung: e.target.checked }))} className="h-4 w-4 mt-0.5 rounded" />
              <span className="text-sm text-[--foreground]">
                Befreiung von § 181 BGB (Insichgeschäfte) — Die bevollmächtigte Person darf auch Geschäfte mit sich selbst abschließen.
              </span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Ort und Datum der Unterzeichnung *</label>
            <input className={inputCls} value={inhalt.ort_datum} onChange={e => setInhalt(prev => ({ ...prev, ort_datum: e.target.value }))} placeholder="z. B. München, 27.05.2026" />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={inhalt.unterschrift_bestaetigt} onChange={e => setInhalt(prev => ({ ...prev, unterschrift_bestaetigt: e.target.checked }))} className="h-4 w-4 mt-0.5 rounded" />
            <span className="text-sm text-[--foreground]">
              Ich bestätige, dass ich dieses Dokument eigenhändig unterschrieben habe und in vollem Bewusstsein meiner Entscheidungsfähigkeit handle.
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--foreground] transition-colors">
            <ChevronLeft className="h-4 w-4" /> Zurück
          </button>
        )}
        <div className="flex-1" />
        {step < totalSteps - 1 ? (
          <>
            <button type="button" onClick={handleSaveDraft} disabled={saving} className="px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--muted-foreground] transition-colors">
              Entwurf speichern
            </button>
            <button type="button" onClick={() => setStep(s => s + 1)} className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm hover:opacity-90">
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving || !inhalt.unterschrift_bestaetigt || !inhalt.ort_datum.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Wird gespeichert…' : <><Download className="h-4 w-4" /> Fertigstellen &amp; PDF herunterladen</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Wizard: Betreuungsverfügung ──────────────────────────────────────────────

function BVWizard({ onFinish, onCancel }: { onFinish: (v: Verfuegung) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [inhalt, setInhalt] = useState<BetreuungsverfuegungInhalt>(defaultBVInhalt())

  const totalSteps = BV_SCHRITTE.length
  const labelCls = 'block text-sm font-medium text-[--foreground] mb-1'
  const inputCls = 'w-full px-3 py-2 border border-[--border] rounded-lg bg-[--background] text-[--foreground] text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]'

  function addBetreuer() {
    setInhalt(prev => ({ ...prev, gewuenschte_betreuer: [...prev.gewuenschte_betreuer, { name: '', beziehung: '', adresse: '', telefon: '' }] }))
  }

  function removeBetreuer(i: number) {
    setInhalt(prev => ({ ...prev, gewuenschte_betreuer: prev.gewuenschte_betreuer.filter((_, idx) => idx !== i) }))
  }

  function updateBetreuer(i: number, field: keyof BetreuungsverfuegungInhalt['gewuenschte_betreuer'][number], val: string) {
    setInhalt(prev => {
      const updated = [...prev.gewuenschte_betreuer]
      updated[i] = { ...updated[i], [field]: val }
      return { ...prev, gewuenschte_betreuer: updated }
    })
  }

  function generateBVText(): string {
    const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const betreuerText = inhalt.gewuenschte_betreuer.map((b, i) =>
      `${i + 1}. ${b.name} (${b.beziehung}), ${b.adresse}, Tel.: ${b.telefon}`
    ).join('\n')
    return `BETREUUNGSVERFÜGUNG\n\nErstellt am: ${heute}\n\nVerfasserin / Verfasser: ${inhalt.vollstaendiger_name}\nGeboren am: ${inhalt.geburtsdatum || '___________'}\nWohnhaft in: ${inhalt.adresse}\n\nGewünschte Betreuer:\n${betreuerText || '(Keine angegeben)'}\n\nAbgelehnte Betreuer:\n${inhalt.abgelehnte_betreuer || '(Keine Angabe)'}\n\nWünsche zur Betreuung:\n${inhalt.wuensche_zur_betreuung || '(Keine Angabe)'}\n\nGewünschter Aufenthaltsort: ${inhalt.aufenthaltsort}\n\nBesondere Wünsche:\n${inhalt.besondere_wuensche || '(Keine Angabe)'}\n\nOrt, Datum: ${inhalt.ort_datum}\n\n___________________________\nUnterschrift\n\nErstellt mit xcare\n`
  }

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const createRes = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'betreuungsverfuegung', inhalt }),
      })
      if (!createRes.ok) {
        const d = await createRes.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await createRes.json()
      await fetch(`/api/patientenverfuegung/${verfuegung.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inhalt, status: 'fertig' }),
      })
      downloadAsText(generateBVText(), `Betreuungsverfuegung_${inhalt.vollstaendiger_name || 'xcare'}.txt`)
      onFinish({ ...verfuegung, status: 'fertig', pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    try {
      const res = await fetch('/api/patientenverfuegung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'betreuungsverfuegung', inhalt }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Fehler')
      }
      const { verfuegung } = await res.json()
      onFinish({ ...verfuegung, pv_bevollmaechtigte: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[--muted-foreground]">Schritt {step + 1} von {totalSteps}: <strong>{BV_SCHRITTE[step].titel}</strong></span>
          <button onClick={onCancel} className="text-sm text-[--muted-foreground] hover:text-[--foreground]">Abbrechen</button>
        </div>
        <ProgressBar current={step} total={totalSteps} />
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <InfoBox>Die Betreuungsverfügung richtet sich an das Gericht und gibt an, wen Sie als Betreuer wünschen, falls das Gericht einen Betreuer bestellen muss.</InfoBox>
          <div><label className={labelCls}>Vollständiger Name *</label><input className={inputCls} value={inhalt.vollstaendiger_name} onChange={e => setInhalt(prev => ({ ...prev, vollstaendiger_name: e.target.value }))} placeholder="Vorname Nachname" /></div>
          <div><label className={labelCls}>Geburtsdatum</label><input type="date" className={inputCls} value={inhalt.geburtsdatum} onChange={e => setInhalt(prev => ({ ...prev, geburtsdatum: e.target.value }))} /></div>
          <div><label className={labelCls}>Adresse *</label><textarea className={inputCls} rows={3} value={inhalt.adresse} onChange={e => setInhalt(prev => ({ ...prev, adresse: e.target.value }))} placeholder="Straße, Hausnummer, PLZ, Stadt" /></div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {inhalt.gewuenschte_betreuer.map((b, i) => (
            <div key={i} className="border border-[--border] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">Betreuer {i + 1}</span><button type="button" onClick={() => removeBetreuer(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div>
              <input className={inputCls} value={b.name} onChange={e => updateBetreuer(i, 'name', e.target.value)} placeholder="Vollständiger Name" />
              <input className={inputCls} value={b.beziehung} onChange={e => updateBetreuer(i, 'beziehung', e.target.value)} placeholder="Beziehung" />
              <input className={inputCls} value={b.adresse} onChange={e => updateBetreuer(i, 'adresse', e.target.value)} placeholder="Adresse" />
              <input className={inputCls} value={b.telefon} onChange={e => updateBetreuer(i, 'telefon', e.target.value)} placeholder="Telefon" />
            </div>
          ))}
          <button type="button" onClick={addBetreuer} className="flex items-center gap-2 px-4 py-2 border border-dashed border-[--border] rounded-lg text-sm text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary] w-full justify-center">
            <Plus className="h-4 w-4" /> Betreuer hinzufügen
          </button>
          <div><label className={labelCls}>Personen, die ich als Betreuer ablehne</label><textarea className={inputCls} rows={2} value={inhalt.abgelehnte_betreuer} onChange={e => setInhalt(prev => ({ ...prev, abgelehnte_betreuer: e.target.value }))} placeholder="Namen und Begründung (optional)" /></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div><label className={labelCls}>Gewünschter Aufenthaltsort</label>
            <div className="grid grid-cols-2 gap-3">
              {([{ value: 'zuhause', label: 'Zu Hause' }, { value: 'pflegeheim', label: 'Pflegeheim' }, { value: 'betreutes_wohnen', label: 'Betreutes Wohnen' }, { value: 'keine_angabe', label: 'Keine Angabe' }] as const).map(({ value, label }) => (
                <label key={value} className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer ${inhalt.aufenthaltsort === value ? 'border-[--primary] bg-[--accent]' : 'border-[--border] hover:bg-[--muted]'}`}>
                  <input type="radio" name="aufenthaltsort" value={value} checked={inhalt.aufenthaltsort === value} onChange={() => setInhalt(prev => ({ ...prev, aufenthaltsort: value }))} className="sr-only" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>Wünsche zur Betreuung</label><textarea className={inputCls} rows={4} value={inhalt.wuensche_zur_betreuung} onChange={e => setInhalt(prev => ({ ...prev, wuensche_zur_betreuung: e.target.value }))} placeholder="Ihre Wünsche zum Umgang, zur Pflege, zu Entscheidungen…" /></div>
          <div><label className={labelCls}>Besondere Wünsche</label><textarea className={inputCls} rows={3} value={inhalt.besondere_wuensche} onChange={e => setInhalt(prev => ({ ...prev, besondere_wuensche: e.target.value }))} placeholder="Religiöse Wünsche, Hobbys, persönliche Vorlieben…" /></div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <InfoBox>Die Betreuungsverfügung muss unterschrieben sein. Sie müssen nicht notariell beglaubigt werden, wird aber dem zuständigen Betreuungsgericht vorgelegt.</InfoBox>
          <div><label className={labelCls}>Ort und Datum *</label><input className={inputCls} value={inhalt.ort_datum} onChange={e => setInhalt(prev => ({ ...prev, ort_datum: e.target.value }))} placeholder="z. B. Hamburg, 27.05.2026" /></div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={inhalt.unterschrift_bestaetigt} onChange={e => setInhalt(prev => ({ ...prev, unterschrift_bestaetigt: e.target.checked }))} className="h-4 w-4 mt-0.5 rounded" />
            <span className="text-sm text-[--foreground]">Ich bestätige die eigenhändige Unterzeichnung.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--foreground]"><ChevronLeft className="h-4 w-4" /> Zurück</button>}
        <div className="flex-1" />
        {step < totalSteps - 1 ? (
          <>
            <button type="button" onClick={handleSaveDraft} disabled={saving} className="px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] text-[--muted-foreground]">Entwurf speichern</button>
            <button type="button" onClick={() => setStep(s => s + 1)} className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm hover:opacity-90">Weiter <ChevronRight className="h-4 w-4" /></button>
          </>
        ) : (
          <button type="button" onClick={handleFinish} disabled={saving || !inhalt.unterschrift_bestaetigt || !inhalt.ort_datum.trim()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Wird gespeichert…' : <><Download className="h-4 w-4" /> Fertigstellen &amp; herunterladen</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientenverfuegungClient({ initialVerfuegungen }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('uebersicht')
  const [verfuegungen, setVerfuegungen] = useState<Verfuegung[]>(initialVerfuegungen)
  const [wizardTyp, setWizardTyp] = useState<PVTyp | null>(null)
  const [confirmWiderrufId, setConfirmWiderrufId] = useState<string | null>(null)
  const [widerrufLoading, setWiderrufLoading] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [versions, setVersions] = useState<Record<string, Array<{ id: string; version_nr: number; erstellt_am: string }>>>({})

  function startWizard(typ: PVTyp) {
    setWizardTyp(typ)
    setActiveTab('assistent')
  }

  function handleWizardFinish(v: Verfuegung) {
    setVerfuegungen(prev => [v, ...prev])
    setWizardTyp(null)
    setActiveTab('dokumente')
  }

  function handleWizardCancel() {
    setWizardTyp(null)
    setActiveTab('uebersicht')
  }

  async function handleWiderruf(id: string) {
    setWiderrufLoading(true)
    try {
      const res = await fetch(`/api/patientenverfuegung/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVerfuegungen(prev =>
          prev.map(v => v.id === id ? { ...v, status: 'widerrufen', widerrufen_am: new Date().toISOString() } : v)
        )
      }
    } finally {
      setWiderrufLoading(false)
      setConfirmWiderrufId(null)
    }
  }

  const toggleVersions = useCallback(async (id: string) => {
    if (expandedVersions.has(id)) {
      setExpandedVersions(prev => { const s = new Set(prev); s.delete(id); return s })
      return
    }
    setExpandedVersions(prev => new Set([...prev, id]))
    if (!versions[id]) {
      const res = await fetch(`/api/patientenverfuegung/${id}`)
      if (res.ok) {
        const { verfuegung } = await res.json()
        setVersions(prev => ({ ...prev, [id]: verfuegung.pv_versionen ?? [] }))
      }
    }
  }, [expandedVersions, versions])

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'uebersicht', label: 'Übersicht' },
    { id: 'assistent', label: 'Assistent' },
    { id: 'dokumente', label: 'Meine Dokumente' },
  ]

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmWiderrufId !== null}
        title="Verfügung widerrufen?"
        description="Diese Aktion kann nicht rückgängig gemacht werden. Die Verfügung wird als widerrufen markiert und ist nicht mehr gültig."
        onConfirm={() => confirmWiderrufId && handleWiderruf(confirmWiderrufId)}
        onCancel={() => setConfirmWiderrufId(null)}
        loading={widerrufLoading}
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[--border]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'assistent') setWizardTyp(null) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-[--primary] text-[--primary]' : 'border-transparent text-[--muted-foreground] hover:text-[--foreground]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Übersicht ── */}
      {activeTab === 'uebersicht' && (
        <div className="space-y-8">
          {/* Hero */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[--foreground] mb-2">Was ist eine Patientenverfügung?</h2>
            <p className="text-sm text-[--muted-foreground] leading-relaxed">
              Eine Patientenverfügung ist eine schriftliche Willensäußerung, in der Sie festlegen, welche medizinischen Maßnahmen Sie in bestimmten Situationen wünschen oder ablehnen. Sie hilft Ärzten und Angehörigen, Ihren Willen zu respektieren, wenn Sie sich nicht mehr äußern können.
            </p>
          </div>

          {/* Document type cards */}
          <div>
            <h3 className="text-base font-semibold text-[--foreground] mb-4">Dokument erstellen</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                {
                  typ: 'patientenverfuegung' as const,
                  icon: Heart,
                  color: 'text-blue-600 bg-blue-100',
                  title: 'Patientenverfügung',
                  desc: 'Regelt medizinische Behandlungswünsche für den Fall der Einwilligungsunfähigkeit.',
                  basis: 'gemäß § 1827 BGB',
                },
                {
                  typ: 'vorsorgevollmacht' as const,
                  icon: UserCheck,
                  color: 'text-purple-600 bg-purple-100',
                  title: 'Vorsorgevollmacht',
                  desc: 'Bevollmächtigt eine Vertrauensperson, in Ihrem Namen Entscheidungen zu treffen.',
                  basis: 'gemäß §§ 164 ff. BGB',
                },
                {
                  typ: 'betreuungsverfuegung' as const,
                  icon: Users,
                  color: 'text-orange-600 bg-orange-100',
                  title: 'Betreuungsverfügung',
                  desc: 'Äußert Wünsche für den Fall einer gerichtlich angeordneten Betreuung.',
                  basis: 'gemäß § 1358 BGB',
                },
              ]).map(({ typ, icon: Icon, color, title, desc, basis }) => (
                <div key={typ} className="border border-[--border] rounded-xl p-5 space-y-4 hover:shadow-sm transition-shadow">
                  <div className={`inline-flex p-2.5 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[--foreground]">{title}</h4>
                    <p className="text-xs text-[--muted-foreground] mt-1 mb-0.5">{desc}</p>
                    <p className="text-xs text-[--muted-foreground] italic">{basis}</p>
                  </div>
                  <button
                    onClick={() => startWizard(typ)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[--primary] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> Neue erstellen
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Verfügungen */}
          {verfuegungen.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-[--foreground] mb-4">Meine Verfügungen</h3>
              <div className="space-y-3">
                {verfuegungen.map(v => (
                  <div key={v.id} className="border border-[--border] rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[--muted-foreground] shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypBadge typ={v.typ} />
                          <StatusBadge status={v.status} />
                        </div>
                        <p className="text-xs text-[--muted-foreground] mt-1">
                          Erstellt: {new Date(v.erstellt_am).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.status === 'fertig' && (
                        <div className="flex items-center gap-1 text-xs text-[--muted-foreground]" title={`QR-Code: https://xcare.app/notfall/${v.qr_code_token}`}>
                          <QrCode className="h-4 w-4" />
                          <span className="hidden sm:inline">QR</span>
                        </div>
                      )}
                      {v.status !== 'widerrufen' && (
                        <button
                          onClick={() => setConfirmWiderrufId(v.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors"
                        >
                          Widerrufen
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Assistent ── */}
      {activeTab === 'assistent' && (
        <div>
          {wizardTyp === null && (
            <div className="space-y-4">
              <p className="text-sm text-[--muted-foreground]">Wählen Sie den Dokumenttyp, den Sie erstellen möchten:</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['patientenverfuegung', 'vorsorgevollmacht', 'betreuungsverfuegung'] as PVTyp[]).map(typ => (
                  <button key={typ} onClick={() => setWizardTyp(typ)} className="border border-[--border] rounded-xl p-4 text-left hover:border-[--primary] hover:bg-[--accent] transition-colors">
                    <span className="text-sm font-medium text-[--foreground]">{TYP_LABELS[typ]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {wizardTyp === 'patientenverfuegung' && (
            <PVWizard onFinish={handleWizardFinish} onCancel={handleWizardCancel} />
          )}
          {wizardTyp === 'vorsorgevollmacht' && (
            <VVWizard onFinish={handleWizardFinish} onCancel={handleWizardCancel} />
          )}
          {wizardTyp === 'betreuungsverfuegung' && (
            <BVWizard onFinish={handleWizardFinish} onCancel={handleWizardCancel} />
          )}
        </div>
      )}

      {/* ── Tab 3: Meine Dokumente ── */}
      {activeTab === 'dokumente' && (
        <div className="space-y-4">
          {verfuegungen.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Verfügungen erstellt.</p>
              <button onClick={() => setActiveTab('uebersicht')} className="mt-4 text-sm text-[--primary] hover:underline">
                Jetzt erstellen
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[--border] text-left text-[--muted-foreground] text-xs">
                    <th className="pb-3 pr-4 font-medium">Typ</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Erstellt</th>
                    <th className="pb-3 pr-4 font-medium">Aktualisiert</th>
                    <th className="pb-3 font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]">
                  {verfuegungen.map(v => (
                    <>
                      <tr key={v.id} className="group">
                        <td className="py-4 pr-4">
                          <TypBadge typ={v.typ} />
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge status={v.status} />
                          {v.widerrufen_am && (
                            <p className="text-xs text-[--muted-foreground] mt-1">
                              {new Date(v.widerrufen_am).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-[--muted-foreground]">
                          {new Date(v.erstellt_am).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-4 pr-4 text-[--muted-foreground]">
                          {new Date(v.aktualisiert_am).toLocaleDateString('de-DE')}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {v.status === 'fertig' && (
                              <div
                                title={`QR: https://xcare.app/notfall/${v.qr_code_token}`}
                                className="flex items-center gap-1 px-2 py-1 text-xs border border-[--border] rounded-lg text-[--muted-foreground] cursor-default"
                              >
                                <QrCode className="h-3 w-3" />
                                QR-Code
                              </div>
                            )}
                            {v.status !== 'widerrufen' && (
                              <button
                                onClick={() => setConfirmWiderrufId(v.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" /> Widerrufen
                              </button>
                            )}
                            <button
                              onClick={() => toggleVersions(v.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs border border-[--border] rounded-lg text-[--muted-foreground] hover:bg-[--muted] transition-colors"
                            >
                              {expandedVersions.has(v.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              Versionen
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedVersions.has(v.id) && (
                        <tr key={`${v.id}-versions`}>
                          <td colSpan={5} className="pb-4 pt-1">
                            <div className="bg-[--muted] rounded-lg p-4 ml-4">
                              <p className="text-xs font-medium text-[--muted-foreground] mb-3">Versionsverlauf</p>
                              {(versions[v.id] ?? []).length === 0 ? (
                                <p className="text-xs text-[--muted-foreground]">Keine Versionen geladen.</p>
                              ) : (
                                <div className="space-y-2">
                                  {(versions[v.id] ?? []).map(ver => (
                                    <div key={ver.id} className="flex items-center gap-3 text-xs text-[--muted-foreground]">
                                      <span className="font-mono">v{ver.version_nr}</span>
                                      <span>{new Date(ver.erstellt_am).toLocaleString('de-DE')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
