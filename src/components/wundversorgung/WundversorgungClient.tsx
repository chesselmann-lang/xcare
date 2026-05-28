'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wunde, Verbandswechsel,
  WUNDARTEN, WUND_STATUS, EXSUDAT_MENGEN, HEILUNGSFORTSCHRITT,
  LOKALISATION_VORSCHLAEGE, WUNDAUFLAGE_VORSCHLAEGE,
  leereWunde, leererVerbandswechsel,
  wechselFaellig
} from '@/lib/wundversorgung/protokoll'

type Tab = 'wunden' | 'neu' | 'wechsel' | 'verlauf'

export default function WundversorgungClient() {
  const [tab, setTab] = useState<Tab>('wunden')
  const [wunden, setWunden] = useState<Wunde[]>([])
  const [protokolle, setProtokolle] = useState<Verbandswechsel[]>([])
  const [selectedWunde, setSelectedWunde] = useState<Wunde | null>(null)
  const [neueWunde, setNeueWunde] = useState<Wunde>(leereWunde())
  const [neuerWechsel, setNeuerWechsel] = useState<Verbandswechsel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/wundversorgung')
      if (r.ok) {
        const d = await r.json()
        setWunden(d.wunden ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProtokolle = useCallback(async (wundeId: string) => {
    const r = await fetch(`/api/wundversorgung/protokoll?wunde_id=${wundeId}&limit=20`)
    if (r.ok) {
      const d = await r.json()
      setProtokolle(d.protokolle ?? [])
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedWunde?.id) loadProtokolle(selectedWunde.id)
  }, [selectedWunde, loadProtokolle])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const saveWunde = async () => {
    setSaving(true)
    try {
      const method = neueWunde.id ? 'PUT' : 'POST'
      const r = await fetch('/api/wundversorgung', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neueWunde)
      })
      if (r.ok) {
        flash('✅ Wunde gespeichert')
        setNeueWunde(leereWunde())
        setTab('wunden')
        load()
      } else {
        flash('❌ Fehler beim Speichern')
      }
    } finally {
      setSaving(false)
    }
  }

  const saveWechsel = async () => {
    if (!neuerWechsel) return
    setSaving(true)
    try {
      const r = await fetch('/api/wundversorgung/protokoll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(neuerWechsel)
      })
      if (r.ok) {
        flash('✅ Verbandswechsel dokumentiert')
        if (selectedWunde?.id) {
          setNeuerWechsel(leererVerbandswechsel(selectedWunde.id))
          loadProtokolle(selectedWunde.id)
        }
        load()
      } else {
        flash('❌ Fehler beim Speichern')
      }
    } finally {
      setSaving(false)
    }
  }

  const selectWundeForWechsel = (w: Wunde) => {
    setSelectedWunde(w)
    setNeuerWechsel(leererVerbandswechsel(w.id!))
    setTab('wechsel')
  }

  const selectWundeForVerlauf = (w: Wunde) => {
    setSelectedWunde(w)
    setTab('verlauf')
  }

  const editWunde = (w: Wunde) => {
    setNeueWunde({ ...w })
    setTab('neu')
  }

  const statusInfo = (s: string) => WUND_STATUS.find(x => x.value === s) ?? WUND_STATUS[0]
  const fortschrittInfo = (f: string) => HEILUNGSFORTSCHRITT.find(x => x.value === f) ?? HEILUNGSFORTSCHRITT[1]

  const faelligkeitDiff = (w: Wunde) => {
    if (!w.naechster_wechsel) return null
    const d = new Date(w.naechster_wechsel)
    const today = new Date(); today.setHours(0,0,0,0)
    return Math.round((d.getTime() - today.getTime()) / 86400000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'wunden', label: '🩹 Wunden' },
    { id: 'neu', label: '➕ Neue Wunde' },
    { id: 'wechsel', label: '🔄 Verbandswechsel' },
    { id: 'verlauf', label: '📈 Verlauf' }
  ]

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`px-4 py-2 rounded text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              tab === t.id
                ? 'bg-white border border-b-white border-gray-200 text-rose-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Wunden Liste ───────────────────────────────────────────────────── */}
      {tab === 'wunden' && (
        <div className="space-y-3">
          {loading && <p className="text-gray-400 text-sm">Lade Wunden…</p>}
          {!loading && wunden.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🩹</p>
              <p>Noch keine Wunden erfasst</p>
              <button onClick={() => setTab('neu')} className="mt-3 text-rose-600 text-sm underline">
                Erste Wunde anlegen
              </button>
            </div>
          )}
          {wunden.map(w => {
            const st = statusInfo(w.status)
            const diff = faelligkeitDiff(w)
            const fällig = wechselFaellig(w.naechster_wechsel)
            return (
              <div key={w.id} className={`bg-white rounded-lg border p-4 ${fällig ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{w.bezeichnung}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: st.farbe + '20', color: st.farbe }}
                      >
                        {st.label}
                      </span>
                      {w.infektion_zeichen && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                          ⚠️ Infektion
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-3">
                      <span>📍 {w.lokalisation}</span>
                      <span>🏥 {WUNDARTEN.find(x => x.value === w.wundart)?.label ?? w.wundart}</span>
                      {w.groesse_cm2 != null && <span>📐 {w.groesse_cm2} cm²</span>}
                      {w.schmerz_nrs != null && <span>😣 NRS {w.schmerz_nrs}/10</span>}
                    </div>
                    {w.naechster_wechsel && (
                      <div className={`mt-2 text-sm font-medium ${fällig ? 'text-orange-600' : 'text-gray-500'}`}>
                        🔄 Nächster Wechsel: {new Date(w.naechster_wechsel).toLocaleDateString('de-DE')}
                        {diff !== null && (
                          <span className="ml-2">
                            {diff < 0
                              ? `(${Math.abs(diff)} Tag${Math.abs(diff) !== 1 ? 'e' : ''} überfällig!)`
                              : diff === 0 ? '(heute)'
                              : `(in ${diff} Tag${diff !== 1 ? 'en' : ''})`}
                          </span>
                        )}
                      </div>
                    )}
                    {w.wundauflage && <p className="mt-1 text-xs text-gray-400">Auflage: {w.wundauflage}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => selectWundeForWechsel(w)}
                      className="text-xs px-3 py-1 bg-rose-50 text-rose-700 rounded hover:bg-rose-100 transition-colors"
                    >
                      🔄 Wechsel
                    </button>
                    <button
                      onClick={() => selectWundeForVerlauf(w)}
                      className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                    >
                      📈 Verlauf
                    </button>
                    <button
                      onClick={() => editWunde(w)}
                      className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                    >
                      ✏️ Bearb.
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Neue Wunde ─────────────────────────────────────────────────────── */}
      {tab === 'neu' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">{neueWunde.id ? 'Wunde bearbeiten' : 'Neue Wunde anlegen'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung *</label>
              <input
                type="text"
                value={neueWunde.bezeichnung}
                onChange={e => setNeueWunde(p => ({ ...p, bezeichnung: e.target.value }))}
                placeholder="z.B. Sakraldekubitus"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokalisation *</label>
              <input
                type="text"
                value={neueWunde.lokalisation}
                onChange={e => setNeueWunde(p => ({ ...p, lokalisation: e.target.value }))}
                list="lok-list"
                placeholder="Wählen oder eingeben…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              <datalist id="lok-list">
                {LOKALISATION_VORSCHLAEGE.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wundart *</label>
              <select
                value={neueWunde.wundart}
                onChange={e => setNeueWunde(p => ({ ...p, wundart: e.target.value as Wunde['wundart'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              >
                {WUNDARTEN.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={neueWunde.status}
                onChange={e => setNeueWunde(p => ({ ...p, status: e.target.value as Wunde['status'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              >
                {WUND_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ersterfassung *</label>
              <input
                type="date"
                value={neueWunde.ersterfassung_datum}
                onChange={e => setNeueWunde(p => ({ ...p, ersterfassung_datum: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Größe (cm²)</label>
              <input
                type="number" step="0.1" min="0"
                value={neueWunde.groesse_cm2 ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, groesse_cm2: e.target.value ? parseFloat(e.target.value) : undefined }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiefe (mm)</label>
              <input
                type="number" step="0.5" min="0"
                value={neueWunde.tiefe_mm ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, tiefe_mm: e.target.value ? parseFloat(e.target.value) : undefined }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wundgrund</label>
              <input
                type="text"
                value={neueWunde.wundgrund ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, wundgrund: e.target.value }))}
                placeholder="granulierend, nekrotisch, fibrinös…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exsudatmenge</label>
              <select
                value={neueWunde.exsudat_menge ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, exsudat_menge: e.target.value as Wunde['exsudat_menge'] }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- wählen --</option>
                {EXSUDAT_MENGEN.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schmerz NRS: <span className="font-semibold">{neueWunde.schmerz_nrs ?? 0}/10</span>
              </label>
              <input
                type="range" min="0" max="10"
                value={neueWunde.schmerz_nrs ?? 0}
                onChange={e => setNeueWunde(p => ({ ...p, schmerz_nrs: parseInt(e.target.value) }))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>kein Schmerz</span><span>stärkster Schmerz</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="infektion-neu"
                checked={neueWunde.infektion_zeichen}
                onChange={e => setNeueWunde(p => ({ ...p, infektion_zeichen: e.target.checked }))}
                className="w-4 h-4 accent-rose-500"
              />
              <label htmlFor="infektion-neu" className="text-sm font-medium text-gray-700">Infektionszeichen</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wundauflage</label>
              <input
                type="text"
                value={neueWunde.wundauflage ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, wundauflage: e.target.value }))}
                list="auflage-list"
                placeholder="Wählen oder eingeben…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
              <datalist id="auflage-list">
                {WUNDAUFLAGE_VORSCHLAEGE.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wechselintervall (Tage)</label>
              <input
                type="number" min="1" max="14"
                value={neueWunde.wechselintervall_tage}
                onChange={e => setNeueWunde(p => ({ ...p, wechselintervall_tage: parseInt(e.target.value) || 2 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Behandelnder Arzt</label>
              <input
                type="text"
                value={neueWunde.behandelnder_arzt ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, behandelnder_arzt: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pflegeperson</label>
              <input
                type="text"
                value={neueWunde.pflegeperson ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, pflegeperson: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                rows={3}
                value={neueWunde.notizen ?? ''}
                onChange={e => setNeueWunde(p => ({ ...p, notizen: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={saveWunde}
              disabled={saving || !neueWunde.bezeichnung || !neueWunde.lokalisation}
              className="px-5 py-2 bg-rose-600 text-white rounded font-medium text-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern…' : '💾 Wunde speichern'}
            </button>
            <button
              onClick={() => { setNeueWunde(leereWunde()); setTab('wunden') }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Verbandswechsel ────────────────────────────────────────────────── */}
      {tab === 'wechsel' && (
        <div className="space-y-4">
          {!selectedWunde ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Wunde auswählen</h3>
              {wunden.length === 0 ? (
                <p className="text-gray-400 text-sm">Keine Wunden vorhanden.</p>
              ) : wunden.map(w => (
                <button
                  key={w.id}
                  onClick={() => selectWundeForWechsel(w)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded hover:border-rose-300 hover:bg-rose-50 transition-colors text-sm mb-2"
                >
                  <span className="font-medium">{w.bezeichnung}</span>
                  <span className="ml-2 text-gray-500">— {w.lokalisation}</span>
                </button>
              ))}
            </div>
          ) : neuerWechsel && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  🔄 Verbandswechsel: <span className="text-rose-600">{selectedWunde.bezeichnung}</span>
                </h3>
                <button onClick={() => { setSelectedWunde(null); setNeuerWechsel(null) }} className="text-gray-400 hover:text-gray-600 text-sm">
                  ✕ andere Wunde
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <input
                    type="date"
                    value={neuerWechsel.wechsel_datum}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, wechsel_datum: e.target.value } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    value={neuerWechsel.wechsel_zeit ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, wechsel_zeit: e.target.value } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelle Größe (cm²)</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={neuerWechsel.groesse_cm2 ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, groesse_cm2: e.target.value ? parseFloat(e.target.value) : undefined } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelle Tiefe (mm)</label>
                  <input
                    type="number" step="0.5" min="0"
                    value={neuerWechsel.tiefe_mm ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, tiefe_mm: e.target.value ? parseFloat(e.target.value) : undefined } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wundgrund</label>
                  <input
                    type="text"
                    value={neuerWechsel.wundgrund ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, wundgrund: e.target.value } : p)}
                    placeholder="granulierend, nekrotisch…"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exsudatmenge</label>
                  <select
                    value={neuerWechsel.exsudat_menge ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, exsudat_menge: e.target.value as Verbandswechsel['exsudat_menge'] } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- wählen --</option>
                    {EXSUDAT_MENGEN.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schmerz NRS: <span className="font-semibold">{neuerWechsel.schmerz_nrs ?? 0}/10</span>
                  </label>
                  <input
                    type="range" min="0" max="10"
                    value={neuerWechsel.schmerz_nrs ?? 0}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, schmerz_nrs: parseInt(e.target.value) } : p)}
                    className="w-full accent-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entfernte Auflage</label>
                  <input
                    type="text"
                    value={neuerWechsel.wundauflage_entfernt ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, wundauflage_entfernt: e.target.value } : p)}
                    list="auflage-list2"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <datalist id="auflage-list2">
                    {WUNDAUFLAGE_VORSCHLAEGE.map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Neue Auflage</label>
                  <input
                    type="text"
                    value={neuerWechsel.wundauflage_neu ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, wundauflage_neu: e.target.value } : p)}
                    list="auflage-list3"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <datalist id="auflage-list3">
                    {WUNDAUFLAGE_VORSCHLAEGE.map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reinigung</label>
                  <input
                    type="text"
                    value={neuerWechsel.reinigung ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, reinigung: e.target.value } : p)}
                    placeholder="NaCl 0,9%, Octenisept, Prontosan…"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heilungsfortschritt</label>
                  <select
                    value={neuerWechsel.heilungsfortschritt ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, heilungsfortschritt: e.target.value as Verbandswechsel['heilungsfortschritt'] } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">-- wählen --</option>
                    {HEILUNGSFORTSCHRITT.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durchgeführt von</label>
                  <input
                    type="text"
                    value={neuerWechsel.durchgefuehrt_von ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, durchgefuehrt_von: e.target.value } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={neuerWechsel.infektion_zeichen}
                      onChange={e => setNeuerWechsel(p => p ? { ...p, infektion_zeichen: e.target.checked } : p)}
                      className="w-4 h-4 accent-rose-500"
                    />
                    <span className="text-sm text-gray-700">Infektionszeichen vorhanden</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={neuerWechsel.arzt_informiert}
                      onChange={e => setNeuerWechsel(p => p ? { ...p, arzt_informiert: e.target.checked } : p)}
                      className="w-4 h-4 accent-rose-500"
                    />
                    <span className="text-sm text-gray-700">Arzt informiert</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <textarea
                    rows={3}
                    value={neuerWechsel.notizen ?? ''}
                    onChange={e => setNeuerWechsel(p => p ? { ...p, notizen: e.target.value } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveWechsel}
                  disabled={saving}
                  className="px-5 py-2 bg-rose-600 text-white rounded font-medium text-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Speichern…' : '💾 Verbandswechsel dokumentieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Verlauf ────────────────────────────────────────────────────────── */}
      {tab === 'verlauf' && (
        <div className="space-y-4">
          {!selectedWunde ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Wunde auswählen</h3>
              {wunden.map(w => (
                <button
                  key={w.id}
                  onClick={() => selectWundeForVerlauf(w)}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm mb-2"
                >
                  <span className="font-medium">{w.bezeichnung}</span>
                  <span className="ml-2 text-gray-500">— {w.lokalisation}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">📈 Verlauf: {selectedWunde.bezeichnung}</h3>
                <button onClick={() => setSelectedWunde(null)} className="text-gray-400 text-sm hover:text-gray-600">✕ andere Wunde</button>
              </div>

              {/* Größen-Chart */}
              {protokolle.some(p => p.groesse_cm2 != null) && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📐 Wundgröße-Verlauf (cm²)</h4>
                  <div className="flex items-end gap-1 h-24">
                    {[...protokolle].reverse().filter(p => p.groesse_cm2 != null).slice(-12).map((p, i, arr) => {
                      const maxG = Math.max(...arr.map(x => x.groesse_cm2 ?? 0))
                      const h = maxG > 0 ? Math.max(4, Math.round(((p.groesse_cm2 ?? 0) / maxG) * 100)) : 4
                      return (
                        <div key={p.id ?? i} className="flex flex-col items-center flex-1" title={`${p.groesse_cm2} cm² — ${new Date(p.wechsel_datum).toLocaleDateString('de-DE')}`}>
                          <span className="text-xs text-gray-500 mb-1">{p.groesse_cm2}</span>
                          <div className="w-full bg-blue-400 rounded-t transition-all" style={{ height: `${h}%` }} />
                          <span className="text-xs text-gray-400 mt-1">
                            {new Date(p.wechsel_datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Protokoll-Einträge */}
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {protokolle.length === 0 && (
                  <p className="text-gray-400 text-sm p-4">Noch keine Verbandswechsel dokumentiert.</p>
                )}
                {protokolle.map(p => {
                  const fi = p.heilungsfortschritt ? fortschrittInfo(p.heilungsfortschritt) : null
                  return (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-800">
                          {new Date(p.wechsel_datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}
                          {p.wechsel_zeit && <span className="ml-2 text-gray-400 font-normal">{p.wechsel_zeit.slice(0, 5)}</span>}
                        </span>
                        {fi && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: fi.farbe + '20', color: fi.farbe }}
                          >
                            {fi.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {p.groesse_cm2 != null && <span>📐 {p.groesse_cm2} cm²</span>}
                        {p.tiefe_mm != null && <span>📏 {p.tiefe_mm} mm</span>}
                        {p.exsudat_menge && <span>💧 Exsudat: {p.exsudat_menge}</span>}
                        {p.schmerz_nrs != null && <span>😣 NRS {p.schmerz_nrs}</span>}
                        {p.infektion_zeichen && <span className="text-red-500 font-medium">⚠️ Infektion</span>}
                        {p.arzt_informiert && <span className="text-blue-500">👨‍⚕️ Arzt inf.</span>}
                        {p.durchgefuehrt_von && <span>👤 {p.durchgefuehrt_von}</span>}
                      </div>
                      {p.wundauflage_neu && <p className="text-xs text-gray-400 mt-1">Auflage: {p.wundauflage_neu}</p>}
                      {p.notizen && <p className="text-xs text-gray-500 mt-1 italic">{p.notizen}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
