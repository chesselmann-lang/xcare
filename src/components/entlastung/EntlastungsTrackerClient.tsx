'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Euro,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  Trash2,
  Settings,
  BarChart2,
  List,
  X,
  AlertTriangle,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from 'lucide-react'
import {
  MONATLICHES_BUDGET_CENT,
  JAHRESBUDGET_CENT,
  LEISTUNGSARTEN,
  berechneJahresuebersicht,
  formatBetrag,
  getMonatName,
  berechneUebertrag,
  type EntlastungsNutzung,
  type MonatsUebersicht,
} from '@/lib/entlastung/berechnung'

// ─── Typen ────────────────────────────────────────────────────────────────────

interface Einstellungen {
  id?: string
  user_id?: string
  pflegegrad: number | null
  jahresbudget_cent: number
  uebertrag_vorjahr_cent: number
  kasse_name: string | null
  kasse_kundennummer: string | null
  erinnerung_aktiv: boolean
}

interface Props {
  initialNutzungen: EntlastungsNutzung[]
  initialEinstellungen: Einstellungen | null
  initialJahr: number
}

type Tab = 'jahresuebersicht' | 'ausgaben' | 'einstellungen'

// ─── EintragModal ─────────────────────────────────────────────────────────────

interface EintragModalProps {
  jahr: number
  vorselektiertMonat?: number
  onClose: () => void
  onSaved: (nutzung: EntlastungsNutzung) => void
}

function EintragModal({ jahr, vorselektiertMonat, onClose, onSaved }: EintragModalProps) {
  const aktuellerMonat = new Date().getMonth() + 1
  const [leistungsart, setLeistungsart] = useState('tagespflege')
  const [monat, setMonat] = useState(vorselektiertMonat ?? aktuellerMonat)
  const [betragEuro, setBetragEuro] = useState('')
  const [anbieter, setAnbieter] = useState('')
  const [belegnummer, setBelegnummer] = useState('')
  const [notiz, setNotiz] = useState('')
  const [loading, setLoading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)

    const betragNum = parseFloat(betragEuro.replace(',', '.'))
    if (isNaN(betragNum) || betragNum <= 0) {
      setFehler('Bitte geben Sie einen gültigen Betrag ein.')
      return
    }
    const betrag_cent = Math.round(betragNum * 100)

    setLoading(true)
    try {
      const res = await fetch('/api/entlastung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jahr,
          monat,
          betrag_cent,
          leistungsart,
          anbieter: anbieter.trim() || null,
          belegnummer: belegnummer.trim() || null,
          notiz: notiz.trim() || null,
        }),
      })
      const data = await res.json() as { nutzung?: EntlastungsNutzung; error?: string }
      if (!res.ok) {
        setFehler(data.error ?? 'Fehler beim Speichern.')
        return
      }
      onSaved(data.nutzung!)
      onClose()
    } catch {
      setFehler('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-teal-600" />
            Ausgabe erfassen
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Leistungsart */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Leistungsart <span className="text-red-500">*</span>
            </label>
            <select
              value={leistungsart}
              onChange={e => setLeistungsart(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            >
              {LEISTUNGSARTEN.map(art => (
                <option key={art.id} value={art.id}>
                  {art.icon} {art.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {LEISTUNGSARTEN.find(a => a.id === leistungsart)?.beschreibung}
            </p>
          </div>

          {/* Monat + Jahr */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Monat <span className="text-red-500">*</span>
              </label>
              <select
                value={monat}
                onChange={e => setMonat(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonatName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Jahr
              </label>
              <input
                type="number"
                value={jahr}
                readOnly
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Betrag */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Betrag (€) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={betragEuro}
                onChange={e => setBetragEuro(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          {/* Anbieter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Anbieter / Dienstleister <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={anbieter}
              onChange={e => setAnbieter(e.target.value)}
              placeholder="z.B. Tagespflegeeinrichtung Sonnenschein"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Belegnummer */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Belegnummer <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={belegnummer}
              onChange={e => setBelegnummer(e.target.value)}
              placeholder="Rechnungs- oder Belegnummer"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Notiz */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notiz <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notiz}
              onChange={e => setNotiz(e.target.value)}
              placeholder="Weitere Anmerkungen zur Ausgabe…"
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {fehler && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {fehler}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Erfassen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function EntlastungsTrackerClient({ initialNutzungen, initialEinstellungen, initialJahr }: Props) {
  const [aktuellerTab, setAktuellerTab] = useState<Tab>('jahresuebersicht')
  const [jahr, setJahr] = useState(initialJahr)
  const [nutzungen, setNutzungen] = useState<EntlastungsNutzung[]>(initialNutzungen)
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(
    initialEinstellungen ?? {
      pflegegrad: null,
      jahresbudget_cent: JAHRESBUDGET_CENT,
      uebertrag_vorjahr_cent: 0,
      kasse_name: null,
      kasse_kundennummer: null,
      erinnerung_aktiv: true,
    }
  )
  const [laedt, setLaedt] = useState(false)
  const [modalOffen, setModalOffen] = useState(false)
  const [vorselektiertMonat, setVorselektiertMonat] = useState<number | undefined>(undefined)
  const [ausgabeFilter, setAusgabeFilter] = useState({ monat: 0, leistungsart: '', erstattungsstatus: '' })
  const [loeschBestaetigung, setLoeschBestaetigung] = useState<string | null>(null)
  const [einstellungenSpeichern, setEinstellungenSpeichern] = useState(false)
  const [einstellungenFehler, setEinstellungenFehler] = useState<string | null>(null)
  const [einstellungenErfolg, setEinstellungenErfolg] = useState(false)

  // Jahresübersicht berechnen
  const jahresuebersicht = berechneJahresuebersicht(
    nutzungen,
    einstellungen.jahresbudget_cent,
    einstellungen.uebertrag_vorjahr_cent,
  )

  const aktuellesJahr = new Date().getFullYear()
  const aktuellerMonat = new Date().getMonth() + 1

  // Daten für neues Jahr laden
  const ladeJahr = useCallback(async (neuesJahr: number) => {
    setLaedt(true)
    try {
      const res = await fetch(`/api/entlastung?jahr=${neuesJahr}`)
      const data = await res.json() as {
        nutzungen?: EntlastungsNutzung[]
        einstellungen?: Einstellungen | null
      }
      if (res.ok) {
        setNutzungen(data.nutzungen ?? [])
        if (data.einstellungen) {
          setEinstellungen(data.einstellungen)
        }
      }
    } catch {
      // Netzwerkfehler — behalten aktuelle Daten
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => {
    if (jahr !== initialJahr) {
      void ladeJahr(jahr)
    }
  }, [jahr, initialJahr, ladeJahr])

  // Eintrag gespeichert
  function handleNutzungGespeichert(nutzung: EntlastungsNutzung) {
    setNutzungen(prev => [...prev, nutzung].sort((a, b) => a.monat - b.monat))
  }

  // Erstattungsstatus umschalten
  async function toggleErstattung(id: string, feld: 'erstattung_beantragt' | 'erstattung_erhalten', aktuell: boolean) {
    const neuerWert = !aktuell
    setNutzungen(prev =>
      prev.map(n => n.id === id ? { ...n, [feld]: neuerWert } : n)
    )
    try {
      const res = await fetch('/api/entlastung', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [feld]: neuerWert }),
      })
      if (!res.ok) {
        // Rückgängig machen bei Fehler
        setNutzungen(prev =>
          prev.map(n => n.id === id ? { ...n, [feld]: aktuell } : n)
        )
      }
    } catch {
      setNutzungen(prev =>
        prev.map(n => n.id === id ? { ...n, [feld]: aktuell } : n)
      )
    }
  }

  // Eintrag löschen
  async function handleLoeschen(id: string) {
    setNutzungen(prev => prev.filter(n => n.id !== id))
    setLoeschBestaetigung(null)
    try {
      await fetch(`/api/entlastung?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      // Fehler beim Löschen — Eintrag bleibt lokal entfernt, nächster Reload korrigiert
    }
  }

  // Einstellungen speichern
  async function handleEinstellungenSpeichern(e: React.FormEvent) {
    e.preventDefault()
    setEinstellungenSpeichern(true)
    setEinstellungenFehler(null)
    setEinstellungenErfolg(false)
    try {
      const res = await fetch('/api/entlastung/einstellungen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(einstellungen),
      })
      const data = await res.json() as { einstellungen?: Einstellungen; error?: string }
      if (!res.ok) {
        setEinstellungenFehler(data.error ?? 'Fehler beim Speichern.')
      } else {
        if (data.einstellungen) setEinstellungen(data.einstellungen)
        setEinstellungenErfolg(true)
        setTimeout(() => setEinstellungenErfolg(false), 3000)
      }
    } catch {
      setEinstellungenFehler('Netzwerkfehler. Bitte versuchen Sie es erneut.')
    } finally {
      setEinstellungenSpeichern(false)
    }
  }

  // Gefilterte Ausgaben
  const gefilterteNutzungen = nutzungen.filter(n => {
    if (ausgabeFilter.monat > 0 && n.monat !== ausgabeFilter.monat) return false
    if (ausgabeFilter.leistungsart && n.leistungsart !== ausgabeFilter.leistungsart) return false
    if (ausgabeFilter.erstattungsstatus === 'beantragt' && !n.erstattung_beantragt) return false
    if (ausgabeFilter.erstattungsstatus === 'erhalten' && !n.erstattung_erhalten) return false
    if (ausgabeFilter.erstattungsstatus === 'ausstehend' && (n.erstattung_beantragt || n.erstattung_erhalten)) return false
    return true
  })

  const nutzungProzent = Math.min(
    100,
    Math.round((jahresuebersicht.genutzt / (einstellungen.jahresbudget_cent + einstellungen.uebertrag_vorjahr_cent)) * 100),
  )

  function getLeistungsartLabel(id: string) {
    return LEISTUNGSARTEN.find(a => a.id === id)?.label ?? id
  }
  function getLeistungsartIcon(id: string) {
    return LEISTUNGSARTEN.find(a => a.id === id)?.icon ?? '📋'
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Info-Banner */}
      <div className="flex gap-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 px-4 py-3">
        <Info className="h-5 w-5 flex-shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
        <p className="text-sm text-teal-800 dark:text-teal-300">
          <strong>§45b SGB XI:</strong> Ihr monatlicher Entlastungsbetrag von 125 € kann bis zu 12 Monate ins Folgejahr
          übertragen werden. Nutzen Sie dieses Budget für Tagespflege, Betreuungsleistungen und andere anerkannte
          Entlastungsangebote.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        {([
          { id: 'jahresuebersicht', label: 'Jahresübersicht', icon: BarChart2 },
          { id: 'ausgaben', label: 'Ausgaben', icon: List },
          { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setAktuellerTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              aktuellerTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab 1: Jahresübersicht ─────────────────────────────────────────── */}
      {aktuellerTab === 'jahresuebersicht' && (
        <div className="space-y-6">
          {/* Jahres-Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setJahr(j => j - 1)}
              disabled={jahr <= 2020 || laedt}
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {jahr - 1}
            </button>
            <div className="flex items-center gap-2">
              {laedt && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
              <span className="text-xl font-bold text-gray-900 dark:text-white">{jahr}</span>
              {jahr === aktuellesJahr && (
                <span className="rounded-full bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                  Aktuell
                </span>
              )}
            </div>
            <button
              onClick={() => setJahr(j => j + 1)}
              disabled={jahr >= 2030 || laedt}
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {jahr + 1}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zusammenfassungskarte */}
          <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white shadow-lg">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-teal-100">Jahresbudget (§45b SGB XI)</p>
                <p className="text-3xl font-bold mt-0.5">
                  {formatBetrag(einstellungen.jahresbudget_cent)}
                </p>
              </div>
              <Euro className="h-8 w-8 text-teal-300 opacity-80" />
            </div>

            {einstellungen.uebertrag_vorjahr_cent > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
                <Calendar className="h-4 w-4 text-teal-200" />
                <span className="text-teal-100">
                  Übertrag Vorjahr: <strong className="text-white">{formatBetrag(einstellungen.uebertrag_vorjahr_cent)}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-teal-200 mb-1">Genutzt</p>
                <p className="text-xl font-semibold">{formatBetrag(jahresuebersicht.genutzt)}</p>
              </div>
              <div>
                <p className="text-xs text-teal-200 mb-1">Verbleibend</p>
                <p className={`text-xl font-semibold ${jahresuebersicht.rest > 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {formatBetrag(jahresuebersicht.rest)}
                </p>
              </div>
            </div>

            {/* Fortschrittsbalken */}
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-teal-200">
                <span>Verbrauch</span>
                <span>{nutzungProzent} %</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    nutzungProzent >= 90 ? 'bg-red-400' : nutzungProzent >= 70 ? 'bg-yellow-300' : 'bg-green-400'
                  }`}
                  style={{ width: `${nutzungProzent}%` }}
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <button
              onClick={() => { setVorselektiertMonat(aktuellerMonat); setModalOffen(true) }}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Ausgabe erfassen
            </button>
          </div>

          {/* Monatsraster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jahresuebersicht.monate.map((mon: MonatsUebersicht) => {
              const istAktuell = jahr === aktuellesJahr && mon.monat === aktuellerMonat
              const hatEintraege = mon.eintraege.length > 0
              const prozent = Math.min(100, Math.round((mon.genutztCent / mon.budgetCent) * 100))

              return (
                <button
                  key={mon.monat}
                  onClick={() => {
                    setAusgabeFilter(f => ({ ...f, monat: mon.monat }))
                    setAktuellerTab('ausgaben')
                  }}
                  className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                    istAktuell
                      ? 'border-teal-400 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-400 dark:ring-teal-600'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-teal-300 dark:hover:border-teal-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${istAktuell ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {mon.monatName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {istAktuell && (
                        <span className="rounded-full bg-teal-500 w-2 h-2" />
                      )}
                      {hatEintraege && (
                        <span className={`rounded-full w-2 h-2 ${prozent >= 90 ? 'bg-red-400' : prozent >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`} />
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {hatEintraege
                      ? `${formatBetrag(mon.genutztCent)} von ${formatBetrag(mon.budgetCent)}`
                      : `Budget: ${formatBetrag(mon.budgetCent)}`
                    }
                  </div>

                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        prozent >= 90 ? 'bg-red-400' : prozent >= 70 ? 'bg-yellow-400' : 'bg-teal-400'
                      }`}
                      style={{ width: `${prozent}%` }}
                    />
                  </div>

                  {hatEintraege && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {mon.eintraege.length} {mon.eintraege.length === 1 ? 'Eintrag' : 'Einträge'}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab 2: Ausgaben ────────────────────────────────────────────────── */}
      {aktuellerTab === 'ausgaben' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={ausgabeFilter.monat}
              onChange={e => setAusgabeFilter(f => ({ ...f, monat: parseInt(e.target.value) }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-teal-500 focus:outline-none"
            >
              <option value={0}>Alle Monate</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{getMonatName(m)}</option>
              ))}
            </select>

            <select
              value={ausgabeFilter.leistungsart}
              onChange={e => setAusgabeFilter(f => ({ ...f, leistungsart: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Alle Leistungsarten</option>
              {LEISTUNGSARTEN.map(art => (
                <option key={art.id} value={art.id}>{art.label}</option>
              ))}
            </select>

            <select
              value={ausgabeFilter.erstattungsstatus}
              onChange={e => setAusgabeFilter(f => ({ ...f, erstattungsstatus: e.target.value }))}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:border-teal-500 focus:outline-none"
            >
              <option value="">Alle Erstattungen</option>
              <option value="ausstehend">Ausstehend</option>
              <option value="beantragt">Beantragt</option>
              <option value="erhalten">Erhalten</option>
            </select>

            {(ausgabeFilter.monat > 0 || ausgabeFilter.leistungsart || ausgabeFilter.erstattungsstatus) && (
              <button
                onClick={() => setAusgabeFilter({ monat: 0, leistungsart: '', erstattungsstatus: '' })}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Filter zurücksetzen
              </button>
            )}

            <div className="ml-auto">
              <button
                onClick={() => { setVorselektiertMonat(aktuellerMonat); setModalOffen(true) }}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ausgabe erfassen
              </button>
            </div>
          </div>

          {/* Liste */}
          {gefilterteNutzungen.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-12 text-center">
              <Euro className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Keine Ausgaben gefunden</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {nutzungen.length === 0
                  ? 'Erfassen Sie Ihre erste Ausgabe für dieses Jahr.'
                  : 'Passen Sie den Filter an, um Einträge anzuzeigen.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {gefilterteNutzungen.map(nutzung => (
                <div
                  key={nutzung.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {getLeistungsartIcon(nutzung.leistungsart)}
                    </span>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-teal-100 dark:bg-teal-900/30 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                              {getLeistungsartLabel(nutzung.leistungsart)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {getMonatName(nutzung.monat)} {nutzung.jahr}
                            </span>
                          </div>
                          {nutzung.anbieter && (
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {nutzung.anbieter}
                            </p>
                          )}
                          {nutzung.belegnummer && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Beleg: {nutzung.belegnummer}
                            </p>
                          )}
                          {nutzung.notiz && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                              {nutzung.notiz}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatBetrag(nutzung.betrag_cent)}
                          </p>
                        </div>
                      </div>

                      {/* Erstattungs-Toggles */}
                      <div className="mt-3 flex items-center gap-4 flex-wrap">
                        <button
                          onClick={() => void toggleErstattung(nutzung.id, 'erstattung_beantragt', nutzung.erstattung_beantragt)}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            nutzung.erstattung_beantragt
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {nutzung.erstattung_beantragt
                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                            : <Clock className="h-3.5 w-3.5" />
                          }
                          Beantragt
                        </button>

                        <button
                          onClick={() => void toggleErstattung(nutzung.id, 'erstattung_erhalten', nutzung.erstattung_erhalten)}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            nutzung.erstattung_erhalten
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {nutzung.erstattung_erhalten
                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                            : <Clock className="h-3.5 w-3.5" />
                          }
                          Erstattet
                        </button>

                        <div className="ml-auto">
                          {loeschBestaetigung === nutzung.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Sicher löschen?</span>
                              <button
                                onClick={() => void handleLoeschen(nutzung.id)}
                                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                              >
                                Ja, löschen
                              </button>
                              <button
                                onClick={() => setLoeschBestaetigung(null)}
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setLoeschBestaetigung(nutzung.id)}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summe */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Summe ({gefilterteNutzungen.length} {gefilterteNutzungen.length === 1 ? 'Eintrag' : 'Einträge'})
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatBetrag(gefilterteNutzungen.reduce((s, n) => s + n.betrag_cent, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Einstellungen ───────────────────────────────────────────── */}
      {aktuellerTab === 'einstellungen' && (
        <form onSubmit={e => void handleEinstellungenSpeichern(e)} className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-teal-600" />
              Persönliche Einstellungen
            </h2>

            {/* Pflegegrad */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pflegegrad
              </label>
              <div className="flex gap-2">
                {[null, 1, 2, 3, 4, 5].map(pg => (
                  <button
                    key={pg ?? 'keine'}
                    type="button"
                    onClick={() => setEinstellungen(e => ({ ...e, pflegegrad: pg }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      einstellungen.pflegegrad === pg
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-300 dark:hover:border-teal-700'
                    }`}
                  >
                    {pg ?? '–'}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Wählen Sie Ihren Pflegegrad für die korrekte Budgetberechnung
              </p>
            </div>

            {/* Übertrag Vorjahr */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Übertrag aus Vorjahr (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(einstellungen.uebertrag_vorjahr_cent / 100).toFixed(2)}
                  onChange={e => setEinstellungen(prev => ({
                    ...prev,
                    uebertrag_vorjahr_cent: Math.round(parseFloat(e.target.value || '0') * 100),
                  }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Nicht genutzter Betrag aus dem Vorjahr (kann bis zum 30.06. des Folgejahres genutzt werden)
              </p>
            </div>

            {/* Kasse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name der Pflegekasse
                </label>
                <input
                  type="text"
                  value={einstellungen.kasse_name ?? ''}
                  onChange={e => setEinstellungen(prev => ({ ...prev, kasse_name: e.target.value || null }))}
                  placeholder="z.B. AOK Bayern"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kundennummer / Versicherungsnummer
                </label>
                <input
                  type="text"
                  value={einstellungen.kasse_kundennummer ?? ''}
                  onChange={e => setEinstellungen(prev => ({ ...prev, kasse_kundennummer: e.target.value || null }))}
                  placeholder="Ihre Versicherungsnummer"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Erinnerung */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Monatliche Erinnerung
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Erinnert Sie am Monatsanfang daran, Ihre Entlastungsleistungen zu erfassen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEinstellungen(prev => ({ ...prev, erinnerung_aktiv: !prev.erinnerung_aktiv }))}
                className="flex-shrink-0"
              >
                {einstellungen.erinnerung_aktiv
                  ? <ToggleRight className="h-8 w-8 text-teal-600" />
                  : <ToggleLeft className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                }
              </button>
            </div>
          </div>

          {/* Rechtliche Info */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" />
              Hinweis zu §45b SGB XI
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Das monatliche Budget beträgt 125 € (Pflegegrad 2–5)</li>
              <li>Nicht genutzte Beträge können innerhalb eines Jahres angesammelt und bis zum 30. Juni des Folgejahres genutzt werden</li>
              <li>Anerkannte Leistungen: Tagespflege, Kurzzeitpflege, Betreuungsdienste, Alltagshilfen (§45a SGB XI)</li>
              <li>Stellen Sie Erstattungsanträge direkt bei Ihrer Pflegekasse</li>
            </ul>
          </div>

          {/* Fehler / Erfolg */}
          {einstellungenFehler && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {einstellungenFehler}
            </div>
          )}
          {einstellungenErfolg && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Einstellungen erfolgreich gespeichert.
            </div>
          )}

          <button
            type="submit"
            disabled={einstellungenSpeichern}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
          >
            {einstellungenSpeichern ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Einstellungen speichern
          </button>
        </form>
      )}

      {/* ── Eintrag-Modal ───────────────────────────────────────────────────── */}
      {modalOffen && (
        <EintragModal
          jahr={jahr}
          vorselektiertMonat={vorselektiertMonat}
          onClose={() => { setModalOffen(false); setVorselektiertMonat(undefined) }}
          onSaved={handleNutzungGespeichert}
        />
      )}
    </div>
  )
}
