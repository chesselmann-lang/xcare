'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Widerspruchsverfahren, WiderspruchArgument,
  VERFAHRENSSTATUS, BEGRUENDUNGS_KATEGORIEN, DOKUMENTE_CHECKLISTE,
  ARGUMENT_VORLAGEN, PFLEGEGRAD_BESCHREIBUNG,
  leererWiderspruch, berechneFrist, fristStatus, generiereWiderspruchsbrief
} from '@/lib/widerspruch/assistent'

type Tab = 'uebersicht' | 'neu' | 'argumente' | 'brief' | 'checkliste'

export default function WiderspruchClient() {
  const [tab, setTab] = useState<Tab>('uebersicht')
  const [verfahren, setVerfahren] = useState<Widerspruchsverfahren[]>([])
  const [selected, setSelected] = useState<Widerspruchsverfahren | null>(null)
  const [argumente, setArgumente] = useState<WiderspruchArgument[]>([])
  const [formData, setFormData] = useState<Widerspruchsverfahren>(leererWiderspruch())
  const [neuesArg, setNeuesArg] = useState<Partial<WiderspruchArgument>>({ kategorie: '', argument: '', belege: '', prioritaet: 2 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [briefText, setBriefText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/widerspruch')
      if (r.ok) {
        const d = await r.json()
        setVerfahren(d.verfahren ?? [])
      }
    } finally { setLoading(false) }
  }, [])

  const loadArgumente = useCallback(async (wid: string) => {
    const r = await fetch(`/api/widerspruch/argumente?widerspruch_id=${wid}`)
    if (r.ok) {
      const d = await r.json()
      setArgumente(d.argumente ?? [])
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (selected?.id) loadArgumente(selected.id)
  }, [selected, loadArgumente])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const saveVerfahren = async () => {
    setSaving(true)
    try {
      const method = formData.id ? 'PUT' : 'POST'
      const r = await fetch('/api/widerspruch', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (r.ok) {
        const d = await r.json()
        flash('✅ Verfahren gespeichert')
        setSelected(d.verfahren)
        setTab('argumente')
        load()
      } else { flash('❌ Fehler beim Speichern') }
    } finally { setSaving(false) }
  }

  const saveArgument = async () => {
    if (!selected?.id || !neuesArg.kategorie || !neuesArg.argument) return
    setSaving(true)
    try {
      const r = await fetch('/api/widerspruch/argumente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...neuesArg, widerspruch_id: selected.id })
      })
      if (r.ok) {
        flash('✅ Argument gespeichert')
        setNeuesArg({ kategorie: '', argument: '', belege: '', prioritaet: 2 })
        loadArgumente(selected.id)
      } else { flash('❌ Fehler') }
    } finally { setSaving(false) }
  }

  const deleteArgument = async (id: string) => {
    await fetch(`/api/widerspruch/argumente?id=${id}`, { method: 'DELETE' })
    if (selected?.id) loadArgumente(selected.id)
  }

  const updateDokument = async (key: string, checked: boolean) => {
    if (!selected) return
    const updated = { ...selected, dokumente_checkliste: { ...selected.dokumente_checkliste, [key]: checked } }
    setSelected(updated)
    await fetch('/api/widerspruch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
  }

  const updateStatus = async (s: Widerspruchsverfahren['status']) => {
    if (!selected) return
    const updated = { ...selected, status: s }
    setSelected(updated)
    setVerfahren(v => v.map(x => x.id === selected.id ? updated : x))
    await fetch('/api/widerspruch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
    flash('✅ Status aktualisiert')
  }

  const generierebrief = () => {
    if (!selected) return
    const text = generiereWiderspruchsbrief(selected, argumente)
    setBriefText(text)
    setTab('brief')
  }

  const kopiereBrief = () => {
    navigator.clipboard.writeText(briefText)
    flash('✅ Brief in Zwischenablage kopiert')
  }

  const selectVerfahren = (v: Widerspruchsverfahren) => {
    setSelected(v)
    setTab('argumente')
  }

  const statusInfo = (s: string) => VERFAHRENSSTATUS.find(x => x.value === s) ?? VERFAHRENSSTATUS[0]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'uebersicht', label: '📋 Übersicht' },
    { id: 'neu', label: selected?.id ? '✏️ Bearbeiten' : '➕ Neu' },
    { id: 'argumente', label: '💬 Argumente' },
    { id: 'checkliste', label: '✅ Checkliste' },
    { id: 'brief', label: '📄 Brief' },
  ]

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`px-4 py-2 rounded text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* Frist-Warnung wenn Verfahren gewählt */}
      {selected?.widerspruchsfrist && (() => {
        const fs = fristStatus(selected.widerspruchsfrist)
        if (!fs || fs.abgelaufen) return null
        if (!fs.kritisch) return null
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-semibold text-orange-800">Widerspruchsfrist läuft ab!</p>
              <p className="text-sm text-orange-700">
                Noch {fs.tage} Tag{fs.tage !== 1 ? 'e' : ''} bis {new Date(selected.widerspruchsfrist).toLocaleDateString('de-DE')} — bitte schnell handeln!
              </p>
            </div>
          </div>
        )
      })()}

      {/* Tab Bar */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-white border border-b-white border-gray-200 text-indigo-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Übersicht ─────────────────────────────────────────────────────── */}
      {tab === 'uebersicht' && (
        <div className="space-y-3">
          {loading && <p className="text-gray-400 text-sm">Laden…</p>}
          {!loading && verfahren.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">⚖️</p>
              <p>Noch kein Widerspruchsverfahren angelegt</p>
              <button onClick={() => { setFormData(leererWiderspruch()); setSelected(null); setTab('neu') }} className="mt-3 text-indigo-600 text-sm underline">
                Widerspruch starten
              </button>
            </div>
          )}
          {verfahren.map(v => {
            const st = statusInfo(v.status)
            const fs = fristStatus(v.widerspruchsfrist)
            return (
              <div key={v.id} className={`bg-white rounded-lg border p-4 ${fs?.kritisch ? 'border-orange-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{v.titel}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: st.farbe + '20', color: st.farbe }}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-3">
                      <span>Bescheid: {new Date(v.bescheid_datum).toLocaleDateString('de-DE')}</span>
                      {v.aktueller_pflegegrad !== undefined && <span>PG {v.aktueller_pflegegrad} → PG {v.beantragter_pflegegrad}</span>}
                      {v.pflegekasse_name && <span>🏛️ {v.pflegekasse_name}</span>}
                    </div>
                    {v.widerspruchsfrist && (
                      <div className={`mt-1 text-xs font-medium ${fs?.kritisch ? 'text-orange-600' : fs?.abgelaufen ? 'text-red-500' : 'text-gray-400'}`}>
                        Frist: {new Date(v.widerspruchsfrist).toLocaleDateString('de-DE')}
                        {fs && !fs.abgelaufen && ` (noch ${fs.tage} Tage)`}
                        {fs?.abgelaufen && ' (abgelaufen)'}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => selectVerfahren(v)}
                    className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    Öffnen →
                  </button>
                </div>
              </div>
            )
          })}
          <button
            onClick={() => { setFormData(leererWiderspruch()); setSelected(null); setTab('neu') }}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm"
          >
            + Neuen Widerspruch anlegen
          </button>
        </div>
      )}

      {/* ── Neu / Bearbeiten ──────────────────────────────────────────────── */}
      {tab === 'neu' && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <h3 className="font-semibold text-gray-800">Widerspruchsverfahren anlegen</h3>

          {/* Info-Box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800">
            <p className="font-semibold mb-1">ℹ️ Wichtige Fristen</p>
            <p>Der Widerspruch muss <strong>innerhalb von 4 Wochen</strong> nach Zugang des Bescheids eingereicht werden (§ 84 SGG). Handeln Sie schnell!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel des Verfahrens</label>
              <input
                type="text"
                value={formData.titel}
                onChange={e => setFormData(p => ({ ...p, titel: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aktuell zuerkannter Pflegegrad</label>
              <select
                value={formData.aktueller_pflegegrad ?? ''}
                onChange={e => setFormData(p => ({ ...p, aktueller_pflegegrad: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- wählen --</option>
                {[0,1,2,3,4,5].map(n => <option key={n} value={n}>Pflegegrad {n}</option>)}
              </select>
              {formData.aktueller_pflegegrad !== undefined && (
                <p className="text-xs text-gray-400 mt-1">{PFLEGEGRAD_BESCHREIBUNG[formData.aktueller_pflegegrad]}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beantragter / angestrebter Pflegegrad</label>
              <select
                value={formData.beantragter_pflegegrad ?? ''}
                onChange={e => setFormData(p => ({ ...p, beantragter_pflegegrad: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- wählen --</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>Pflegegrad {n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum des Bescheids *</label>
              <input
                type="date"
                value={formData.bescheid_datum}
                onChange={e => setFormData(p => ({ ...p, bescheid_datum: e.target.value, widerspruchsfrist: berechneFrist(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Widerspruchsfrist (automatisch)</label>
              <input
                type="date"
                value={formData.widerspruchsfrist ?? ''}
                readOnly
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">4 Wochen nach Bescheiddatum</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum der MDK-Begutachtung</label>
              <input
                type="date"
                value={formData.begutachtung_datum ?? ''}
                onChange={e => setFormData(p => ({ ...p, begutachtung_datum: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name des Gutachters</label>
              <input
                type="text"
                value={formData.gutachter_name ?? ''}
                onChange={e => setFormData(p => ({ ...p, gutachter_name: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pflegekasse</label>
              <input
                type="text"
                value={formData.pflegekasse_name ?? ''}
                onChange={e => setFormData(p => ({ ...p, pflegekasse_name: e.target.value }))}
                placeholder="z.B. AOK Bayern"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aktenzeichen</label>
              <input
                type="text"
                value={formData.aktenzeichen ?? ''}
                onChange={e => setFormData(p => ({ ...p, aktenzeichen: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="gutachten-erhalten"
                checked={formData.gutachten_erhalten}
                onChange={e => setFormData(p => ({ ...p, gutachten_erhalten: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500"
              />
              <label htmlFor="gutachten-erhalten" className="text-sm font-medium text-gray-700">MDK-Gutachten liegt vor</label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                rows={3}
                value={formData.notizen ?? ''}
                onChange={e => setFormData(p => ({ ...p, notizen: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={saveVerfahren}
              disabled={saving || !formData.bescheid_datum}
              className="px-5 py-2 bg-indigo-600 text-white rounded font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern…' : '💾 Verfahren speichern & weiter zu Argumenten'}
            </button>
          </div>
        </div>
      )}

      {/* ── Argumente ─────────────────────────────────────────────────────── */}
      {tab === 'argumente' && (
        <div className="space-y-4">
          {!selected ? (
            <p className="text-gray-400 text-sm">Bitte zuerst ein Verfahren auswählen oder neu anlegen.</p>
          ) : (
            <>
              {/* Status-Stepper */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Verfahrensstand</p>
                <div className="flex flex-wrap gap-2">
                  {VERFAHRENSSTATUS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => updateStatus(s.value)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                        selected.status === s.value
                          ? 'text-white border-transparent'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300'
                      }`}
                      style={selected.status === s.value ? { backgroundColor: s.farbe, borderColor: s.farbe } : {}}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kategorie-Auswahl */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Begründungs-Kategorien auswählen</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {BEGRUENDUNGS_KATEGORIEN.map(k => {
                    const active = neuesArg.kategorie === k.value
                    return (
                      <button
                        key={k.value}
                        onClick={() => {
                          setNeuesArg(p => ({
                            ...p,
                            kategorie: k.value,
                            argument: ARGUMENT_VORLAGEN[k.value]?.[0] ?? ''
                          }))
                        }}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          active ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{k.icon}</span>
                          <span className="text-sm font-medium text-gray-800">{k.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-6">{k.beschreibung}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Argument-Formular */}
              {neuesArg.kategorie && (
                <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-indigo-800">
                    {BEGRUENDUNGS_KATEGORIEN.find(k => k.value === neuesArg.kategorie)?.icon}{' '}
                    Argument zu: {BEGRUENDUNGS_KATEGORIEN.find(k => k.value === neuesArg.kategorie)?.label}
                  </p>

                  {/* Vorlagen */}
                  {ARGUMENT_VORLAGEN[neuesArg.kategorie] && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 mb-1">Vorlage auswählen:</p>
                      {ARGUMENT_VORLAGEN[neuesArg.kategorie].map((vorl, i) => (
                        <button
                          key={i}
                          onClick={() => setNeuesArg(p => ({ ...p, argument: vorl }))}
                          className="w-full text-left text-xs p-2 mb-1 bg-white border border-indigo-200 rounded hover:bg-indigo-100 transition-colors text-gray-700"
                        >
                          {vorl}
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Argument (bearbeiten/ergänzen)</label>
                    <textarea
                      rows={4}
                      value={neuesArg.argument ?? ''}
                      onChange={e => setNeuesArg(p => ({ ...p, argument: e.target.value }))}
                      className="w-full border border-indigo-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Belege / Dokumente (optional)</label>
                    <input
                      type="text"
                      value={neuesArg.belege ?? ''}
                      onChange={e => setNeuesArg(p => ({ ...p, belege: e.target.value }))}
                      placeholder="z.B. Arztbrief Dr. Müller vom 01.05.2026, Pflegetagebuch S. 12"
                      className="w-full border border-indigo-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Priorität</label>
                    <div className="flex gap-2">
                      {[1,2,3].map(p => (
                        <button
                          key={p}
                          onClick={() => setNeuesArg(prev => ({ ...prev, prioritaet: p as 1|2|3 }))}
                          className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                            neuesArg.prioritaet === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p === 1 ? '🔴 Hoch' : p === 2 ? '🟡 Mittel' : '🟢 Niedrig'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={saveArgument}
                    disabled={saving || !neuesArg.argument}
                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Speichern…' : '+ Argument hinzufügen'}
                  </button>
                </div>
              )}

              {/* Argumente-Liste */}
              {argumente.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">{argumente.length} Argument{argumente.length !== 1 ? 'e' : ''}</p>
                    <button onClick={generierebrief} className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                      📄 Brief generieren
                    </button>
                  </div>
                  {argumente.map(a => {
                    const k = BEGRUENDUNGS_KATEGORIEN.find(x => x.value === a.kategorie)
                    const prioritaetFarbe = a.prioritaet === 1 ? '#ef4444' : a.prioritaet === 2 ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={a.id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-700">{k?.icon} {k?.label}</span>
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: prioritaetFarbe }} />
                            </div>
                            <p className="text-sm text-gray-800">{a.argument}</p>
                            {a.belege && <p className="text-xs text-gray-400 mt-1">📎 {a.belege}</p>}
                          </div>
                          <button
                            onClick={() => a.id && deleteArgument(a.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Checkliste ────────────────────────────────────────────────────── */}
      {tab === 'checkliste' && (
        <div className="space-y-3">
          {!selected ? (
            <p className="text-gray-400 text-sm">Bitte zuerst ein Verfahren auswählen.</p>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">📋 Dokumente-Checkliste</h3>
                <div className="space-y-3">
                  {DOKUMENTE_CHECKLISTE.map(d => {
                    const checked = selected.dokumente_checkliste?.[d.key] ?? false
                    return (
                      <label key={d.key} className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors ${checked ? 'bg-green-50 border-green-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => updateDokument(d.key, e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-green-500"
                        />
                        <div>
                          <span className={`text-sm font-medium ${checked ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                            {d.label}
                          </span>
                          {d.pflicht && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pflicht</span>}
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Erledigt:</span>
                    <span className="font-semibold text-green-700">
                      {Object.values(selected.dokumente_checkliste ?? {}).filter(Boolean).length} / {DOKUMENTE_CHECKLISTE.length}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(Object.values(selected.dokumente_checkliste ?? {}).filter(Boolean).length / DOKUMENTE_CHECKLISTE.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tipps */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-2">💡 Wichtige Tipps</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>Widerspruch immer per <strong>Einschreiben mit Rückschein</strong> einsenden</li>
                  <li>Alle Dokumente als <strong>beglaubigte Kopien</strong> beifügen</li>
                  <li>Eingang schriftlich bestätigen lassen</li>
                  <li>Kostenfreie Pflegeberatung nach <strong>§7a SGB XI</strong> nutzen</li>
                  <li>Bei Ablehnung: <strong>Klage beim Sozialgericht</strong> innerhalb von 1 Monat</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Brief ─────────────────────────────────────────────────────────── */}
      {tab === 'brief' && (
        <div className="space-y-4">
          {!selected ? (
            <p className="text-gray-400 text-sm">Bitte zuerst ein Verfahren mit Argumenten anlegen.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">📄 Widerspruchsbrief</h3>
                <div className="flex gap-2">
                  <button
                    onClick={generierebrief}
                    className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    🔄 Neu generieren
                  </button>
                  {briefText && (
                    <button
                      onClick={kopiereBrief}
                      className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      📋 Kopieren
                    </button>
                  )}
                </div>
              </div>
              {!briefText ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📄</p>
                  <p className="mb-3">Noch kein Brief generiert</p>
                  <button onClick={generierebrief} className="text-indigo-600 text-sm underline">
                    Brief jetzt generieren
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
                    ⚠️ Dieser Brief ist eine Vorlage. Bitte alle Platzhalter in eckigen Klammern [_] ausfüllen und von einem Rechtskundigen prüfen lassen.
                  </div>
                  <textarea
                    value={briefText}
                    onChange={e => setBriefText(e.target.value)}
                    rows={30}
                    className="w-full border border-gray-300 rounded px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 resize-y"
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
