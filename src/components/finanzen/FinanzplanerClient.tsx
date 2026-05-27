'use client'

// ============================================================
// F31: Pflege-Finanzplaner & Steuer-Optimierer — Client UI
// Five-tab comprehensive financial planner for care costs
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Euro, Plus, Trash2, ChevronDown, ChevronUp, Download, Printer,
  Copy, AlertTriangle, CheckCircle, Info, TrendingUp,
  FileText, Home, Car, Pill, Wrench, Clock, ShieldCheck,
  Calculator, ClipboardList, Users, X, Loader2,
} from 'lucide-react'
import {
  berechneSteuervorteile,
  berechneMonatsuebersicht,
  pruefeMinijobStatus,
  generiereSteuerbericht,
  PARA35A_KATEGORIEN,
  PARA33_KATEGORIEN,
  PFLEGEPAUSCHBETRAG,
  MINIJOB_GRENZE_CENT,
  type SteuerBerechnung,
  type MonatsKosten,
} from '@/lib/finanzen/steuer'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PflegeAusgabe {
  id: string
  user_id: string
  datum: string
  kategorie: string
  bezeichnung: string
  betrag_cent: number
  erstattung_kasse_cent: number
  erstattung_sonstige_cent: number
  steuerlich_paragraph: string | null
  belegnummer: string | null
  anbieter: string | null
  notiz: string | null
  jahressteuererklaerung_jahr: number | null
  erstellt_am: string
}

interface HaushaltshilfeVertrag {
  id: string
  user_id: string
  name: string
  beginn_datum: string
  ende_datum: string | null
  monatslohn_cent: number
  wochenstunden: number | null
  minijob_angemeldet: boolean
  sv_beitraege_arbeitgeber_cent: number
  erstellt_am: string
}

interface Props {
  initialAusgaben: PflegeAusgabe[]
  initialVertraege: HaushaltshilfeVertrag[]
  initialBerechnung: SteuerBerechnung | null
  pflegegrad: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

type Kategorie =
  | 'ambulante_pflege' | 'stationaere_pflege' | 'hilfsmittel' | 'medikamente'
  | 'haushaltshilfe' | 'fahrtkosten' | 'umbaumassnahmen' | 'kurzzeitpflege'
  | 'tagespflege' | 'verhinderungspflege' | 'sonstiges'

const KATEGORIE_CONFIG: Record<Kategorie, { label: string; icon: React.ReactNode; farbe: string; gruppe: string }> = {
  ambulante_pflege:    { label: 'Ambulante Pflege',    icon: <ShieldCheck className="h-4 w-4" />, farbe: 'bg-blue-100 text-blue-700',   gruppe: 'Pflege' },
  stationaere_pflege:  { label: 'Stationäre Pflege',   icon: <Home className="h-4 w-4" />,        farbe: 'bg-indigo-100 text-indigo-700', gruppe: 'Pflege' },
  hilfsmittel:         { label: 'Hilfsmittel',          icon: <Wrench className="h-4 w-4" />,      farbe: 'bg-cyan-100 text-cyan-700',    gruppe: 'Medizin' },
  medikamente:         { label: 'Medikamente',           icon: <Pill className="h-4 w-4" />,        farbe: 'bg-purple-100 text-purple-700', gruppe: 'Medizin' },
  haushaltshilfe:      { label: 'Haushaltshilfe',        icon: <Home className="h-4 w-4" />,        farbe: 'bg-green-100 text-green-700',  gruppe: 'Haushalt' },
  fahrtkosten:         { label: 'Fahrtkosten',            icon: <Car className="h-4 w-4" />,         farbe: 'bg-yellow-100 text-yellow-700', gruppe: 'Fahrt' },
  umbaumassnahmen:     { label: 'Umbaumaßnahmen',         icon: <Wrench className="h-4 w-4" />,      farbe: 'bg-orange-100 text-orange-700', gruppe: 'Haushalt' },
  kurzzeitpflege:      { label: 'Kurzzeitpflege',         icon: <Clock className="h-4 w-4" />,       farbe: 'bg-pink-100 text-pink-700',    gruppe: 'Pflege' },
  tagespflege:         { label: 'Tagespflege',             icon: <Clock className="h-4 w-4" />,       farbe: 'bg-rose-100 text-rose-700',    gruppe: 'Pflege' },
  verhinderungspflege: { label: 'Verhinderungspflege',    icon: <Users className="h-4 w-4" />,       farbe: 'bg-teal-100 text-teal-700',    gruppe: 'Pflege' },
  sonstiges:           { label: 'Sonstiges',               icon: <FileText className="h-4 w-4" />,    farbe: 'bg-slate-100 text-slate-700',  gruppe: 'Sonstiges' },
}

const AKTUELLE_KATEGORIEN = Object.keys(KATEGORIE_CONFIG) as Kategorie[]

const PARAGRAPHEN_VORSCHLAG: Record<string, string> = {
  ambulante_pflege:    '§35a',
  haushaltshilfe:      '§35a',
  tagespflege:         '§35a',
  verhinderungspflege: '§35a',
  stationaere_pflege:  '§33',
  medikamente:         '§33',
  fahrtkosten:         '§33',
  hilfsmittel:         '§33',
  kurzzeitpflege:      '§33',
}

const TABS = [
  { id: 'ausgaben',    label: 'Ausgaben',        icon: <Euro className="h-4 w-4" /> },
  { id: 'steuer',      label: 'Steuer-Optimierer', icon: <Calculator className="h-4 w-4" /> },
  { id: 'jahres',      label: 'Jahres-Übersicht', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'haushalt',    label: 'Haushaltshilfe',   icon: <Home className="h-4 w-4" /> },
  { id: 'export',      label: 'Steuerberater-Export', icon: <Download className="h-4 w-4" /> },
] as const

type TabId = typeof TABS[number]['id']

const QUICK_FILTER_GRUPPEN = ['Alle', 'Pflege', 'Haushalt', 'Medizin', 'Fahrt'] as const
type FilterGruppe = typeof QUICK_FILTER_GRUPPEN[number]

const VERFUEGBARE_JAHRE = [2024, 2025, 2026]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEur(cent: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cent / 100)
}

function formatDatum(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function monatLabel(monat: string): string {
  const [y, m] = monat.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function groupByMonth(ausgaben: PflegeAusgabe[]): Map<string, PflegeAusgabe[]> {
  const map = new Map<string, PflegeAusgabe[]>()
  for (const a of ausgaben) {
    const monat = a.datum.slice(0, 7)
    if (!map.has(monat)) map.set(monat, [])
    map.get(monat)!.push(a)
  }
  // Sort months descending
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])))
}

// ── Modal: Ausgabe anlegen ─────────────────────────────────────────────────────

interface AusgabeModalProps {
  onClose: () => void
  onSave: (ausgabe: PflegeAusgabe) => void
}

function AusgabeModal({ onClose, onSave }: AusgabeModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    datum: isoToday(),
    kategorie: 'ambulante_pflege' as Kategorie,
    bezeichnung: '',
    betrag: '',
    erstattung_kasse: '',
    erstattung_sonstige: '',
    steuerlich_paragraph: '§35a' as string,
    belegnummer: '',
    anbieter: '',
    notiz: '',
  })

  function handleKategorieChange(kat: Kategorie) {
    setForm(f => ({
      ...f,
      kategorie: kat,
      steuerlich_paragraph: PARAGRAPHEN_VORSCHLAG[kat] ?? '',
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const betrag_cent = Math.round(parseFloat(form.betrag.replace(',', '.')) * 100)
    const erstattung_kasse_cent = Math.round(parseFloat(form.erstattung_kasse.replace(',', '.') || '0') * 100)
    const erstattung_sonstige_cent = Math.round(parseFloat(form.erstattung_sonstige.replace(',', '.') || '0') * 100)

    if (isNaN(betrag_cent) || betrag_cent <= 0) {
      toast.error('Bitte einen gültigen Betrag eingeben')
      return
    }
    if (erstattung_kasse_cent + erstattung_sonstige_cent > betrag_cent) {
      toast.error('Erstattungen dürfen den Betrag nicht übersteigen')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/finanzen/ausgaben', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datum: form.datum,
          kategorie: form.kategorie,
          bezeichnung: form.bezeichnung,
          betrag_cent,
          erstattung_kasse_cent,
          erstattung_sonstige_cent,
          steuerlich_paragraph: form.steuerlich_paragraph || null,
          belegnummer: form.belegnummer || null,
          anbieter: form.anbieter || null,
          notiz: form.notiz || null,
        }),
      })
      const json = await res.json() as { ausgabe?: PflegeAusgabe; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Fehler beim Speichern'); return }
      toast.success('Ausgabe gespeichert')
      onSave(json.ausgabe!)
      onClose()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[--background] border border-[--border] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <h2 className="text-lg font-semibold text-[--foreground] flex items-center gap-2">
            <Plus className="h-5 w-5 text-[--primary]" />
            Neue Ausgabe erfassen
          </h2>
          <button onClick={onClose} className="text-[--muted-foreground] hover:text-[--foreground] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Datum + Kategorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Datum *</label>
              <input
                type="date"
                required
                value={form.datum}
                onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Kategorie *</label>
              <select
                required
                value={form.kategorie}
                onChange={e => handleKategorieChange(e.target.value as Kategorie)}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              >
                {AKTUELLE_KATEGORIEN.map(k => (
                  <option key={k} value={k}>{KATEGORIE_CONFIG[k].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bezeichnung */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">Bezeichnung *</label>
            <input
              type="text"
              required
              placeholder="z.B. Pflegedienst Muster GmbH – Oktober"
              value={form.bezeichnung}
              onChange={e => setForm(f => ({ ...f, bezeichnung: e.target.value }))}
              className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
            />
          </div>

          {/* Betrag + Erstattungen */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Betrag (€) *</label>
              <input
                type="text"
                required
                placeholder="0,00"
                value={form.betrag}
                onChange={e => setForm(f => ({ ...f, betrag: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Erstattung Kasse</label>
              <input
                type="text"
                placeholder="0,00"
                value={form.erstattung_kasse}
                onChange={e => setForm(f => ({ ...f, erstattung_kasse: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Erstattung Sonst.</label>
              <input
                type="text"
                placeholder="0,00"
                value={form.erstattung_sonstige}
                onChange={e => setForm(f => ({ ...f, erstattung_sonstige: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
          </div>

          {/* Paragraph + Belegnummer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Steuerl. Paragraph</label>
              <select
                value={form.steuerlich_paragraph}
                onChange={e => setForm(f => ({ ...f, steuerlich_paragraph: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              >
                <option value="">— keine Angabe —</option>
                <option value="§35a">§35a EStG (Haushaltsnahe DL)</option>
                <option value="§33">§33 EStG (Außergewöhnl. Belastung)</option>
                <option value="§33b">§33b EStG (Pauschbetrag)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Belegnummer</label>
              <input
                type="text"
                placeholder="RE-2026-042"
                value={form.belegnummer}
                onChange={e => setForm(f => ({ ...f, belegnummer: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
          </div>

          {/* Anbieter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">Anbieter</label>
            <input
              type="text"
              placeholder="Name des Pflegedienstes / Anbieters"
              value={form.anbieter}
              onChange={e => setForm(f => ({ ...f, anbieter: e.target.value }))}
              className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
            />
          </div>

          {/* Notiz */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">Notiz</label>
            <textarea
              rows={2}
              placeholder="Interne Bemerkung (optional)"
              value={form.notiz}
              onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))}
              className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 resize-none"
            />
          </div>

          {/* §35a Hinweis */}
          {(form.steuerlich_paragraph === '§35a' || PARA35A_KATEGORIEN.includes(form.kategorie)) && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                §35a EStG: Zahlung muss per Überweisung oder Karte erfolgen (kein Bargeld), Rechnung erforderlich.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[--border] text-[--foreground] px-4 py-2 text-sm font-medium hover:bg-[--muted]/50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:bg-[--primary]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal: Haushaltshilfe-Vertrag ─────────────────────────────────────────────

interface VertragModalProps {
  onClose: () => void
  onSave: (v: HaushaltshilfeVertrag) => void
}

function VertragModal({ onClose, onSave }: VertragModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    beginn_datum: isoToday(),
    ende_datum: '',
    monatslohn: '',
    wochenstunden: '',
    minijob_angemeldet: false,
  })

  const monatslohn_cent = Math.round(parseFloat(form.monatslohn.replace(',', '.') || '0') * 100)
  const pruefung = pruefeMinijobStatus(monatslohn_cent)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (monatslohn_cent <= 0) { toast.error('Bitte gültigen Monatslohn eingeben'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/finanzen/haushaltshilfe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          beginn_datum: form.beginn_datum,
          ende_datum: form.ende_datum || null,
          monatslohn_cent,
          wochenstunden: form.wochenstunden ? parseFloat(form.wochenstunden.replace(',', '.')) : null,
          minijob_angemeldet: form.minijob_angemeldet,
          sv_beitraege_arbeitgeber_cent: pruefung.arbeitgeber_pauschalbeitrag_cent,
        }),
      })
      const json = await res.json() as { vertrag?: HaushaltshilfeVertrag; error?: string }
      if (!res.ok) { toast.error(json.error ?? 'Fehler'); return }
      toast.success('Vertrag angelegt')
      onSave(json.vertrag!)
      onClose()
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[--background] border border-[--border] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <h2 className="text-lg font-semibold text-[--foreground] flex items-center gap-2">
            <Users className="h-5 w-5 text-[--primary]" />
            Neuen Vertrag anlegen
          </h2>
          <button onClick={onClose} className="text-[--muted-foreground] hover:text-[--foreground]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-1">Name der Haushaltshilfe *</label>
            <input
              type="text"
              required
              placeholder="Vorname Nachname"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Beginn *</label>
              <input
                type="date"
                required
                value={form.beginn_datum}
                onChange={e => setForm(f => ({ ...f, beginn_datum: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Ende (optional)</label>
              <input
                type="date"
                value={form.ende_datum}
                onChange={e => setForm(f => ({ ...f, ende_datum: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Monatslohn (€) *</label>
              <input
                type="text"
                required
                placeholder="538,00"
                value={form.monatslohn}
                onChange={e => setForm(f => ({ ...f, monatslohn: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-1">Wochenstunden</label>
              <input
                type="text"
                placeholder="10,0"
                value={form.wochenstunden}
                onChange={e => setForm(f => ({ ...f, wochenstunden: e.target.value }))}
                className="w-full rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
              />
            </div>
          </div>

          {/* Minijob-Status Live-Check */}
          {monatslohn_cent > 0 && (
            <div className={`rounded-lg px-3 py-2 border text-sm ${
              pruefung.ist_minijob
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {pruefung.ist_minijob ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {pruefung.ist_minijob ? 'Minijob ✓' : 'Kein Minijob — SVP-pflichtig!'}
              </div>
              {pruefung.ist_minijob && (
                <p className="mt-1 text-xs">
                  AG-Pauschalbeitrag: ~{formatEur(pruefung.arbeitgeber_pauschalbeitrag_cent)}/Monat (~24,3%)
                </p>
              )}
              {pruefung.warnung && <p className="mt-1 text-xs">{pruefung.warnung}</p>}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-[--foreground] cursor-pointer">
            <input
              type="checkbox"
              checked={form.minijob_angemeldet}
              onChange={e => setForm(f => ({ ...f, minijob_angemeldet: e.target.checked }))}
              className="rounded border-[--border]"
            />
            Bei der Minijob-Zentrale angemeldet
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[--border] text-[--foreground] px-4 py-2 text-sm font-medium hover:bg-[--muted]/50 transition-colors">
              Abbrechen
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:bg-[--primary]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── SVG Bar Chart (12-month trend) ────────────────────────────────────────────

interface BarChartProps {
  daten: MonatsKosten[]
}

function MonatsBarChart({ daten }: BarChartProps) {
  if (daten.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[--muted-foreground] text-sm">
        Keine Ausgaben für diesen Zeitraum
      </div>
    )
  }

  const maxVal = Math.max(...daten.map(d => d.ausgaben_cent), 1)
  const W = 700
  const H = 200
  const padL = 60
  const padR = 10
  const padT = 16
  const padB = 40
  const barW_total = (W - padL - padR) / daten.length
  const barW = Math.max(barW_total * 0.6, 6)
  const barGap = (barW_total - barW) / 2

  function scaleY(val: number) {
    return padT + (H - padT - padB) * (1 - val / maxVal)
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: scaleY(f * maxVal), val: f * maxVal }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-52" aria-label="Monatliche Pflegekosten">
      {/* Grid lines */}
      {gridLines.map(({ y, val }) => (
        <g key={val}>
          <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
          <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">
            {Math.round(val / 100)}€
          </text>
        </g>
      ))}

      {/* Bars */}
      {daten.map((d, i) => {
        const x = padL + i * barW_total + barGap
        const yTotal = scaleY(d.ausgaben_cent)
        const yErstattung = scaleY(d.erstattungen_cent)
        const yEigenanteil = scaleY(d.eigenanteil_cent)
        const bodenY = scaleY(0)
        const labelShort = d.monat.slice(5) // "05"
        return (
          <g key={d.monat}>
            {/* Erstattung (green) */}
            <rect
              x={x}
              y={yErstattung}
              width={barW}
              height={bodenY - yErstattung}
              fill="#22c55e"
              opacity="0.7"
              rx="2"
            />
            {/* Eigenanteil (blue) on top */}
            <rect
              x={x}
              y={yEigenanteil}
              width={barW}
              height={yErstattung - yEigenanteil}
              fill="#3b82f6"
              opacity="0.8"
              rx="2"
            />
            {/* X-label */}
            <text
              x={x + barW / 2}
              y={H - padB + 14}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.6"
            >
              {labelShort}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${padL}, ${H - 8})`}>
        <rect width="8" height="8" fill="#3b82f6" opacity="0.8" rx="1" />
        <text x="10" y="7" fontSize="8" fill="currentColor" opacity="0.6">Eigenanteil</text>
        <rect x="72" width="8" height="8" fill="#22c55e" opacity="0.7" rx="1" />
        <text x="82" y="7" fontSize="8" fill="currentColor" opacity="0.6">Kassenerst.</text>
      </g>
    </svg>
  )
}

// ── SVG Pie Chart (category breakdown) ────────────────────────────────────────

interface PieChartProps {
  ausgaben: PflegeAusgabe[]
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#64748b', '#0ea5e9', '#a3e635']

function KategoriePieChart({ ausgaben }: PieChartProps) {
  const sumByKat = new Map<string, number>()
  for (const a of ausgaben) {
    sumByKat.set(a.kategorie, (sumByKat.get(a.kategorie) ?? 0) + a.betrag_cent)
  }
  const sorted = [...sumByKat.entries()].sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((s, [, v]) => s + v, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[--muted-foreground] text-sm">
        Keine Ausgaben vorhanden
      </div>
    )
  }

  const R = 70
  const cx = 90
  const cy = 90
  let angle = -Math.PI / 2

  const slices = sorted.map(([kat, val], i) => {
    const sweep = (val / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle)
    const y1 = cy + R * Math.sin(angle)
    angle += sweep
    const x2 = cx + R * Math.cos(angle)
    const y2 = cy + R * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`
    return { kat, val, d, color: PIE_COLORS[i % PIE_COLORS.length] }
  })

  return (
    <div className="flex flex-wrap items-start gap-6">
      <svg viewBox="0 0 180 180" className="w-40 h-40 shrink-0">
        {slices.map(s => (
          <path key={s.kat} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map(s => {
          const label = KATEGORIE_CONFIG[s.kat as Kategorie]?.label ?? s.kat
          const pct = ((s.val / total) * 100).toFixed(1)
          return (
            <div key={s.kat} className="flex items-center gap-2 text-xs text-[--foreground]">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="truncate flex-1">{label}</span>
              <span className="text-[--muted-foreground] shrink-0">{pct}%</span>
              <span className="font-medium shrink-0">{formatEur(s.val)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab 1: Ausgaben-Erfassung ──────────────────────────────────────────────────

function AusgabenTab({ ausgaben, onDelete, onNew }: {
  ausgaben: PflegeAusgabe[]
  onDelete: (id: string) => void
  onNew: () => void
}) {
  const [filter, setFilter] = useState<FilterGruppe>('Alle')
  const [sortField, setSortField] = useState<'datum' | 'betrag'>('datum')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function toggleSort(field: 'datum' | 'betrag') {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = ausgaben.filter(a => {
    if (filter === 'Alle') return true
    return KATEGORIE_CONFIG[a.kategorie as Kategorie]?.gruppe === filter
  })

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === 'desc' ? -1 : 1
    if (sortField === 'datum') return mul * a.datum.localeCompare(b.datum)
    return mul * (a.betrag_cent - b.betrag_cent)
  })

  const grouped = groupByMonth(sorted)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/finanzen/ausgaben?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Fehler beim Löschen'); return }
      toast.success('Ausgabe gelöscht')
      onDelete(id)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTER_GRUPPEN.map(g => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === g
                  ? 'bg-[--primary] text-white'
                  : 'bg-[--muted]/50 text-[--muted-foreground] hover:bg-[--muted]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={onNew}
            className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[--primary]/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neue Ausgabe
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <Euro className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Ausgaben erfasst</p>
          <p className="text-xs mt-1">Klicken Sie auf "Neue Ausgabe" um zu beginnen</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([monat, posten]) => {
            const gesamtBrutto = posten.reduce((s, a) => s + a.betrag_cent, 0)
            const gesamtErstattung = posten.reduce((s, a) => s + a.erstattung_kasse_cent + a.erstattung_sonstige_cent, 0)
            const eigenanteil = Math.max(0, gesamtBrutto - gesamtErstattung)
            return (
              <div key={monat} className="rounded-xl border border-[--border] overflow-hidden">
                {/* Month header */}
                <div className="flex flex-wrap items-center justify-between bg-[--muted]/30 px-4 py-2.5 gap-2">
                  <span className="font-semibold text-sm text-[--foreground]">{monatLabel(monat)}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-red-600 font-medium">{formatEur(gesamtBrutto)} Ausgaben</span>
                    <span className="text-green-600 font-medium">−{formatEur(gesamtErstattung)} Erstattung</span>
                    <span className="text-blue-600 font-medium">{formatEur(eigenanteil)} Eigenanteil</span>
                  </div>
                </div>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[--muted]/10 text-[--muted-foreground]">
                      <tr>
                        <th
                          className="text-left px-3 py-2 font-medium cursor-pointer hover:text-[--foreground] transition-colors"
                          onClick={() => toggleSort('datum')}
                        >
                          <span className="flex items-center gap-1">
                            Datum
                            {sortField === 'datum' && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th className="text-left px-3 py-2 font-medium">Kategorie</th>
                        <th className="text-left px-3 py-2 font-medium">Bezeichnung</th>
                        <th
                          className="text-right px-3 py-2 font-medium cursor-pointer hover:text-[--foreground] transition-colors"
                          onClick={() => toggleSort('betrag')}
                        >
                          <span className="flex items-center justify-end gap-1">
                            Betrag
                            {sortField === 'betrag' && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                          </span>
                        </th>
                        <th className="text-right px-3 py-2 font-medium">Erstattung</th>
                        <th className="text-right px-3 py-2 font-medium">Eigenanteil</th>
                        <th className="text-center px-3 py-2 font-medium">Para.</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--border]">
                      {posten.map(a => {
                        const katCfg = KATEGORIE_CONFIG[a.kategorie as Kategorie]
                        const erstattung = a.erstattung_kasse_cent + a.erstattung_sonstige_cent
                        const eig = Math.max(0, a.betrag_cent - erstattung)
                        return (
                          <tr key={a.id} className="hover:bg-[--muted]/20 transition-colors">
                            <td className="px-3 py-2.5 text-[--muted-foreground] whitespace-nowrap">
                              {formatDatum(a.datum)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${katCfg?.farbe ?? 'bg-gray-100 text-gray-700'}`}>
                                {katCfg?.icon}
                                {katCfg?.label ?? a.kategorie}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[--foreground]">
                              <div className="max-w-[200px] truncate" title={a.bezeichnung}>{a.bezeichnung}</div>
                              {a.anbieter && <div className="text-xs text-[--muted-foreground] truncate">{a.anbieter}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-[--foreground] whitespace-nowrap">
                              {formatEur(a.betrag_cent)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-green-600 whitespace-nowrap">
                              {erstattung > 0 ? `−${formatEur(erstattung)}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right text-blue-600 font-medium whitespace-nowrap">
                              {formatEur(eig)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {a.steuerlich_paragraph ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                  {a.steuerlich_paragraph}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => handleDelete(a.id)}
                                disabled={deletingId === a.id}
                                className="text-[--muted-foreground] hover:text-red-600 transition-colors disabled:opacity-40"
                                title="Ausgabe löschen"
                              >
                                {deletingId === a.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Steuer-Optimierer ───────────────────────────────────────────────────

function SteuerTab({ ausgaben, pflegegrad }: { ausgaben: PflegeAusgabe[]; pflegegrad: number }) {
  const [jahr, setJahr] = useState(new Date().getFullYear())
  const [istPflegeperson, setIstPflegeperson] = useState(pflegegrad >= 2)
  const [expandedHinweise, setExpandedHinweise] = useState(false)

  const ausgabenImJahr = ausgaben.filter(a => a.datum.startsWith(String(jahr)))

  const berechnung = berechneSteuervorteile({
    ausgaben: ausgabenImJahr.map(a => ({
      kategorie: a.kategorie,
      betrag_cent: a.betrag_cent,
      erstattung_kasse_cent: a.erstattung_kasse_cent,
      erstattung_sonstige_cent: a.erstattung_sonstige_cent,
    })),
    pflegegrad,
    jahr,
    ist_pflegeperson: istPflegeperson,
  })

  // Belegcheckliste
  const hatAmbulanteP = ausgabenImJahr.some(a => a.kategorie === 'ambulante_pflege')
  const hatHaushalt   = ausgabenImJahr.some(a => a.kategorie === 'haushaltshilfe')
  const hatFahrt      = ausgabenImJahr.some(a => a.kategorie === 'fahrtkosten')
  const hatBelegnr    = ausgabenImJahr.some(a => a.belegnummer)
  const checklist = [
    { label: 'Belege ambulanter Pflegedienst (Rechnung vorhanden)', ok: hatAmbulanteP },
    { label: 'Haushaltshilfe auf Rechnung (kein Bargeld!)', ok: hatHaushalt },
    { label: 'Fahrtkosten-Nachweis (Fahrtenprotokoll)', ok: hatFahrt },
    { label: 'Belegnummern erfasst', ok: hatBelegnr },
    { label: 'Pflegegrad-Bescheinigung vorliegen', ok: pflegegrad >= 2 },
  ]

  function handleExport() {
    const text = generiereSteuerbericht({
      ausgaben: ausgabenImJahr.map(a => ({
        datum: a.datum,
        kategorie: a.kategorie,
        bezeichnung: a.bezeichnung,
        betrag_cent: a.betrag_cent,
        erstattung_kasse_cent: a.erstattung_kasse_cent,
        erstattung_sonstige_cent: a.erstattung_sonstige_cent,
        belegnummer: a.belegnummer ?? undefined,
      })),
      jahr,
      pflegegrad,
    })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Pflegekosten_Steuerbericht_${jahr}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Bericht heruntergeladen')
  }

  return (
    <div className="space-y-6">
      {/* Jahr + Pflegeperson Toggle */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[--foreground]">Steuerjahr:</label>
          <select
            value={jahr}
            onChange={e => setJahr(parseInt(e.target.value))}
            className="rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          >
            {VERFUEGBARE_JAHRE.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-[--foreground] cursor-pointer">
          <input
            type="checkbox"
            checked={istPflegeperson}
            onChange={e => setIstPflegeperson(e.target.checked)}
            className="rounded border-[--border]"
          />
          Ich pflege selbst (§33b Pflegepauschbetrag)
        </label>
      </div>

      {/* Savings badge */}
      {berechnung.gesamte_steuerersparnis_cent > 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">
              Sie sparen voraussichtlich {formatEur(berechnung.gesamte_steuerersparnis_cent)} Steuern
            </p>
            <p className="text-xs text-green-600 mt-0.5">Schätzung basierend auf Ihren erfassten Ausgaben für {jahr}</p>
          </div>
        </div>
      )}

      {ausgabenImJahr.length === 0 && (
        <div className="text-center py-10 text-[--muted-foreground] text-sm">
          Keine Ausgaben für {jahr} erfasst. Wechseln Sie zur Ausgaben-Tab und erfassen Sie Ihre Pflegekosten.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* §35a */}
        <div className={`rounded-xl border p-4 ${berechnung.para35a_steuerminderung_cent > 0 ? 'border-green-200 bg-green-50' : 'border-[--border] bg-[--muted]/20'}`}>
          <div className="text-xs text-[--muted-foreground] font-medium mb-1">§35a EStG</div>
          <div className="text-sm text-[--foreground] mb-2">Haushaltsnahe Dienstleistungen</div>
          <div className="text-sm text-[--muted-foreground]">
            Basis: <span className="font-semibold text-[--foreground]">{formatEur(berechnung.para35a_basis_cent)}</span>
          </div>
          <div className={`text-lg font-bold mt-1 ${berechnung.para35a_steuerminderung_cent > 0 ? 'text-green-700' : 'text-[--muted-foreground]'}`}>
            {berechnung.para35a_steuerminderung_cent > 0 ? '−' : ''}{formatEur(berechnung.para35a_steuerminderung_cent)}
            <span className="text-xs font-normal ml-1">Steuerminderung</span>
          </div>
          {berechnung.para35a_steuerminderung_cent === 0 && (
            <p className="text-xs text-[--muted-foreground] mt-1">Keine §35a-fähigen Ausgaben erfasst</p>
          )}
        </div>

        {/* §33b */}
        <div className={`rounded-xl border p-4 ${berechnung.para33b_pflegepauschbetrag_cent > 0 ? 'border-blue-200 bg-blue-50' : 'border-[--border] bg-[--muted]/20'}`}>
          <div className="text-xs text-[--muted-foreground] font-medium mb-1">§33b Abs. 6 EStG</div>
          <div className="text-sm text-[--foreground] mb-2">Pflegepauschbetrag</div>
          {pflegegrad >= 2 ? (
            <>
              <div className="text-sm text-[--muted-foreground]">
                PG {pflegegrad}: <span className="font-semibold text-[--foreground]">{formatEur(PFLEGEPAUSCHBETRAG[pflegegrad] ?? 0)}</span>
              </div>
              <div className={`text-lg font-bold mt-1 ${istPflegeperson ? 'text-blue-700' : 'text-[--muted-foreground]'}`}>
                {istPflegeperson ? formatEur(berechnung.para33b_pflegepauschbetrag_cent) : '— (nicht aktiviert)'}
              </div>
            </>
          ) : (
            <p className="text-xs text-[--muted-foreground] mt-2">Kein Anspruch bei PG 0/1</p>
          )}
        </div>

        {/* §33 */}
        <div className="rounded-xl border border-[--border] bg-[--muted]/20 p-4">
          <div className="text-xs text-[--muted-foreground] font-medium mb-1">§33 EStG</div>
          <div className="text-sm text-[--foreground] mb-2">Außergewöhnl. Belastungen</div>
          <div className="text-sm text-[--muted-foreground]">
            Brutto (netto nach Erstattung):
          </div>
          <div className="text-lg font-bold text-[--foreground] mt-1">
            {formatEur(berechnung.para33_aussergew_belastung_cent)}
          </div>
          <p className="text-xs text-[--muted-foreground] mt-1">
            Abhängig von Zumutbarkeitsgrenze (Einkommen) — mit Steuerberater prüfen
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-[--border] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-[--muted]/20 text-sm font-medium text-[--foreground] hover:bg-[--muted]/40 transition-colors"
          onClick={() => setExpandedHinweise(h => !h)}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[--primary]" />
            Belege-Checkliste für den Steuerberater
          </span>
          {expandedHinweise ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {expandedHinweise && (
          <div className="px-4 py-3 space-y-2">
            {checklist.map(item => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.ok
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
                <span className={item.ok ? 'text-[--foreground]' : 'text-[--muted-foreground]'}>{item.label}</span>
              </div>
            ))}
            {berechnung.hinweise.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[--border] space-y-2">
                {berechnung.hinweise.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[--muted-foreground]">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[--primary]/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Bericht für Steuerberater
        </button>
      </div>
    </div>
  )
}

// ── Tab 3: Jahres-Übersicht ────────────────────────────────────────────────────

function JahresTab({ ausgaben }: { ausgaben: PflegeAusgabe[] }) {
  const [jahr, setJahr] = useState(new Date().getFullYear())
  const [verglJahr, setVerglJahr] = useState<number | null>(null)

  const ausgabenImJahr = ausgaben.filter(a => a.datum.startsWith(String(jahr)))
  const ausgabenVerglJahr = verglJahr
    ? ausgaben.filter(a => a.datum.startsWith(String(verglJahr)))
    : []

  const monatsDaten = berechneMonatsuebersicht(
    ausgabenImJahr.map(a => ({ ...a, datum: a.datum }))
  )

  const gesamtJahr = ausgabenImJahr.reduce((s, a) => s + a.betrag_cent, 0)
  const eigenanteilJahr = ausgabenImJahr.reduce(
    (s, a) => s + Math.max(0, a.betrag_cent - a.erstattung_kasse_cent - a.erstattung_sonstige_cent),
    0
  )
  const erstattungenJahr = ausgabenImJahr.reduce(
    (s, a) => s + a.erstattung_kasse_cent + a.erstattung_sonstige_cent,
    0
  )

  const gesamtVergl = ausgabenVerglJahr.reduce((s, a) => s + a.betrag_cent, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[--foreground]">Jahr:</label>
          <select
            value={jahr}
            onChange={e => setJahr(parseInt(e.target.value))}
            className="rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          >
            {VERFUEGBARE_JAHRE.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[--foreground]">Vergleich mit:</label>
          <select
            value={verglJahr ?? ''}
            onChange={e => setVerglJahr(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          >
            <option value="">— kein Vergleich —</option>
            {VERFUEGBARE_JAHRE.filter(j => j !== jahr).map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>

      {/* Year totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[--border] bg-[--muted]/20 p-4">
          <div className="text-xs text-[--muted-foreground] mb-1">Gesamtausgaben {jahr}</div>
          <div className="text-2xl font-bold text-[--foreground]">{formatEur(gesamtJahr)}</div>
          {verglJahr && gesamtVergl > 0 && (
            <div className={`text-xs mt-1 ${gesamtJahr > gesamtVergl ? 'text-red-500' : 'text-green-600'}`}>
              {gesamtJahr > gesamtVergl ? '+' : ''}{formatEur(gesamtJahr - gesamtVergl)} ggü. {verglJahr}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs text-green-600 mb-1">Kassenerstat&shy;tungen {jahr}</div>
          <div className="text-2xl font-bold text-green-700">{formatEur(erstattungenJahr)}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs text-blue-600 mb-1">Eigenanteil {jahr}</div>
          <div className="text-2xl font-bold text-blue-700">{formatEur(eigenanteilJahr)}</div>
        </div>
      </div>

      {/* 12-month bar chart */}
      <div className="rounded-xl border border-[--border] p-4">
        <h3 className="text-sm font-semibold text-[--foreground] mb-3">Monatlicher Kostenverlauf {jahr}</h3>
        <MonatsBarChart daten={monatsDaten} />
      </div>

      {/* Category pie chart */}
      <div className="rounded-xl border border-[--border] p-4">
        <h3 className="text-sm font-semibold text-[--foreground] mb-3">Ausgaben nach Kategorie {jahr}</h3>
        <KategoriePieChart ausgaben={ausgabenImJahr} />
      </div>
    </div>
  )
}

// ── Tab 4: Haushaltshilfe-Manager ─────────────────────────────────────────────

function HaushaltshilfeTab({ vertraege, onNew, onDelete }: {
  vertraege: HaushaltshilfeVertrag[]
  onNew: () => void
  onDelete: (id: string) => void
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/finanzen/haushaltshilfe?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Fehler beim Löschen'); return }
      toast.success('Vertrag gelöscht')
      onDelete(id)
    } catch {
      toast.error('Netzwerkfehler')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[--primary]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Neuen Vertrag anlegen
        </button>
      </div>

      {vertraege.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Haushaltshilfe-Verträge erfasst</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vertraege.map(v => {
            const pruefung = pruefeMinijobStatus(v.monatslohn_cent)
            const jahreskosten = v.monatslohn_cent * 12
            const jahresSvAg = v.sv_beitraege_arbeitgeber_cent * 12
            const steuerVorteil = pruefung.ist_minijob
              ? Math.min(Math.round(v.monatslohn_cent * 12 * 0.2), 400_000)
              : 0

            return (
              <div key={v.id} className="rounded-xl border border-[--border] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[--foreground]">{v.name}</span>
                      {pruefung.ist_minijob ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle className="h-3 w-3" /> Minijob
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          <AlertTriangle className="h-3 w-3" /> SVP-pflichtig
                        </span>
                      )}
                      {v.minijob_angemeldet && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          Angemeldet
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[--muted-foreground] mt-0.5">
                      ab {formatDatum(v.beginn_datum)}
                      {v.ende_datum && ` bis ${formatDatum(v.ende_datum)}`}
                      {v.wochenstunden != null && ` · ${v.wochenstunden} Std/Woche`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    className="text-[--muted-foreground] hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    {deletingId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>

                {pruefung.warnung && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{pruefung.warnung}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-[--muted-foreground]">Monatslohn</div>
                    <div className="font-semibold text-[--foreground]">{formatEur(v.monatslohn_cent)}</div>
                  </div>
                  {pruefung.ist_minijob && (
                    <div>
                      <div className="text-xs text-[--muted-foreground]">AG-Pauschale/Monat</div>
                      <div className="font-semibold text-[--foreground]">~{formatEur(pruefung.arbeitgeber_pauschalbeitrag_cent)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-[--muted-foreground]">Jahreskosten gesamt</div>
                    <div className="font-semibold text-[--foreground]">{formatEur(jahreskosten + jahresSvAg)}</div>
                  </div>
                  {steuerVorteil > 0 && (
                    <div>
                      <div className="text-xs text-green-600">§35a Steuerminderung/Jahr</div>
                      <div className="font-semibold text-green-700">~{formatEur(steuerVorteil)}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Minijob info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Minijob-Hinweise (Stand 2024)
        </h4>
        <ul className="space-y-1 text-xs text-amber-700">
          <li>• Minijob-Grenze: 538 €/Monat (ab Oktober 2022 dauerhaft)</li>
          <li>• AG-Pauschalbeitrag: ~24,3% (KV 13%, RV 15%, Pauschsteuer 2%, Umlagen ~2,9%)</li>
          <li>• Über 538 €/Monat: Sozialversicherungspflicht prüfen (Midijob bis 2.000 €)</li>
          <li>• Anmeldung: Minijob-Zentrale (Deutsche Rentenversicherung Knappschaft-Bahn-See)</li>
          <li>• Steuerlich: §35a EStG, 20% der Kosten absetzbar, max. 4.000 € Steuerminderung/Jahr</li>
        </ul>
      </div>
    </div>
  )
}

// ── Tab 5: Steuerberater-Export ────────────────────────────────────────────────

function ExportTab({ ausgaben, pflegegrad }: { ausgaben: PflegeAusgabe[]; pflegegrad: number }) {
  const [jahr, setJahr] = useState(new Date().getFullYear())

  const ausgabenImJahr = ausgaben.filter(a => a.datum.startsWith(String(jahr)))

  const berichtText = generiereSteuerbericht({
    ausgaben: ausgabenImJahr.map(a => ({
      datum: a.datum,
      kategorie: a.kategorie,
      bezeichnung: a.bezeichnung,
      betrag_cent: a.betrag_cent,
      erstattung_kasse_cent: a.erstattung_kasse_cent,
      erstattung_sonstige_cent: a.erstattung_sonstige_cent,
      belegnummer: a.belegnummer ?? undefined,
    })),
    jahr,
    pflegegrad,
  })

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(berichtText)
      toast.success('Bericht in Zwischenablage kopiert')
    } catch {
      toast.error('Kopieren nicht möglich')
    }
  }

  function handleDownload() {
    const blob = new Blob([berichtText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Pflegekosten_Steuerbericht_${jahr}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Bericht heruntergeladen')
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    if (!win) { toast.error('Popup wurde blockiert'); return }
    win.document.write(`
      <html>
        <head><title>Pflegekosten Steuerbericht ${jahr}</title>
        <style>
          body { font-family: monospace; font-size: 12px; white-space: pre-wrap; padding: 2cm; color: #111; }
          @media print { body { margin: 0; padding: 1.5cm; } }
        </style>
        </head>
        <body>${berichtText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[--foreground]">Steuerjahr:</label>
          <select
            value={jahr}
            onChange={e => setJahr(parseInt(e.target.value))}
            className="rounded-lg border border-[--border] bg-[--background] text-[--foreground] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          >
            {VERFUEGBARE_JAHRE.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 border border-[--border] text-[--foreground] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[--muted]/50 transition-colors"
          >
            <Copy className="h-4 w-4" />
            Als Text kopieren
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 border border-[--border] text-[--foreground] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[--muted]/50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Herunterladen
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[--primary] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[--primary]/90 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Als PDF drucken
          </button>
        </div>
      </div>

      {ausgabenImJahr.length === 0 ? (
        <div className="text-center py-12 text-[--muted-foreground] text-sm">
          Keine Ausgaben für {jahr} — bitte zuerst Ausgaben erfassen.
        </div>
      ) : (
        <div className="rounded-xl border border-[--border] bg-[--muted]/10 overflow-hidden">
          <div className="px-4 py-2 border-b border-[--border] text-xs text-[--muted-foreground] font-medium">
            Vorschau — Steuerbericht {jahr} ({ausgabenImJahr.length} Ausgaben)
          </div>
          <pre className="px-4 py-4 text-xs text-[--foreground] leading-relaxed overflow-x-auto whitespace-pre font-mono">
            {berichtText}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function FinanzplanerClient({ initialAusgaben, initialVertraege, initialBerechnung, pflegegrad }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('ausgaben')
  const [ausgaben, setAusgaben] = useState<PflegeAusgabe[]>(initialAusgaben)
  const [vertraege, setVertraege] = useState<HaushaltshilfeVertrag[]>(initialVertraege)
  const [showAusgabeModal, setShowAusgabeModal] = useState(false)
  const [showVertragModal, setShowVertragModal] = useState(false)

  // Year summary for header
  const aktuellesJahr = new Date().getFullYear()
  const ausgabenAktuellesJahr = ausgaben.filter(a => a.datum.startsWith(String(aktuellesJahr)))
  const gesamtAktuellesJahr = ausgabenAktuellesJahr.reduce((s, a) => s + a.betrag_cent, 0)
  const eigenanteilAktuellesJahr = ausgabenAktuellesJahr.reduce(
    (s, a) => s + Math.max(0, a.betrag_cent - a.erstattung_kasse_cent - a.erstattung_sonstige_cent),
    0
  )

  const berechnung = initialBerechnung ?? berechneSteuervorteile({
    ausgaben: ausgabenAktuellesJahr.map(a => ({
      kategorie: a.kategorie,
      betrag_cent: a.betrag_cent,
      erstattung_kasse_cent: a.erstattung_kasse_cent,
      erstattung_sonstige_cent: a.erstattung_sonstige_cent,
    })),
    pflegegrad,
    jahr: aktuellesJahr,
    ist_pflegeperson: pflegegrad >= 2,
  })

  function handleAusgabeAdded(ausgabe: PflegeAusgabe) {
    setAusgaben(prev => [ausgabe, ...prev])
  }

  function handleAusgabeDeleted(id: string) {
    setAusgaben(prev => prev.filter(a => a.id !== id))
  }

  function handleVertragAdded(v: HaushaltshilfeVertrag) {
    setVertraege(prev => [v, ...prev])
  }

  function handleVertragDeleted(id: string) {
    setVertraege(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* ── Overview Header ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[--border] bg-[--muted]/20 px-5 py-4">
          <div className="text-xs text-[--muted-foreground] font-medium">Pflegekosten {aktuellesJahr}</div>
          <div className="text-2xl font-bold text-[--foreground] mt-1">{formatEur(gesamtAktuellesJahr)}</div>
          <div className="text-xs text-[--muted-foreground] mt-0.5">Eigenanteil: {formatEur(eigenanteilAktuellesJahr)}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="text-xs text-green-600 font-medium">§35a Steuerminderung {aktuellesJahr}</div>
          <div className="text-2xl font-bold text-green-700 mt-1">
            {berechnung.para35a_steuerminderung_cent > 0
              ? `${formatEur(berechnung.para35a_steuerminderung_cent)}`
              : '—'}
          </div>
          <div className="text-xs text-green-600 mt-0.5">Direkte Steuerminderung (20%)</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="text-xs text-blue-600 font-medium">Gesamte Steuerersparnis</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            ~{formatEur(berechnung.gesamte_steuerersparnis_cent)}
          </div>
          <div className="text-xs text-blue-600 mt-0.5">
            {berechnung.gesamte_steuerersparnis_cent > 0
              ? 'Sie sparen voraussichtlich diese Steuern'
              : 'Ausgaben erfassen für Schätzung'}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex flex-wrap gap-1 border-b border-[--border]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[--primary] text-[--primary]'
                : 'border-transparent text-[--muted-foreground] hover:text-[--foreground] hover:border-[--border]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="min-h-[400px]">
        {activeTab === 'ausgaben' && (
          <AusgabenTab
            ausgaben={ausgaben}
            onDelete={handleAusgabeDeleted}
            onNew={() => setShowAusgabeModal(true)}
          />
        )}
        {activeTab === 'steuer' && (
          <SteuerTab ausgaben={ausgaben} pflegegrad={pflegegrad} />
        )}
        {activeTab === 'jahres' && (
          <JahresTab ausgaben={ausgaben} />
        )}
        {activeTab === 'haushalt' && (
          <HaushaltshilfeTab
            vertraege={vertraege}
            onNew={() => setShowVertragModal(true)}
            onDelete={handleVertragDeleted}
          />
        )}
        {activeTab === 'export' && (
          <ExportTab ausgaben={ausgaben} pflegegrad={pflegegrad} />
        )}
      </div>

      {/* ── Modals ── */}
      {showAusgabeModal && (
        <AusgabeModal
          onClose={() => setShowAusgabeModal(false)}
          onSave={handleAusgabeAdded}
        />
      )}
      {showVertragModal && (
        <VertragModal
          onClose={() => setShowVertragModal(false)}
          onSave={handleVertragAdded}
        />
      )}
    </div>
  )
}
