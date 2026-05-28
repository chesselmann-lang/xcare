'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BradenAssessment, Lagerungsplan, Lagerungsdokumentation,
  BRADEN_KATEGORIEN, DRUCKENTLASTUNGS_HILFSMITTEL, STANDARD_POSITIONEN,
  leeresBradenAssessment, leererLagerungsplan, generiereTagesplan,
  berechneGesamtscore, bradenRisiko
} from '@/lib/dekubitus/prophylaxe'

type Tab = 'braden' | 'lagerung' | 'protokoll' | 'verlauf'

export default function DekubitusClient() {
  const [tab, setTab] = useState<Tab>('braden')
  const [assessments, setAssessments] = useState<BradenAssessment[]>([])
  const [plaene, setPlaene] = useState<Lagerungsplan[]>([])
  const [dokumentationen, setDokumentationen] = useState<Lagerungsdokumentation[]>([])
  const [aktuellerPlan, setAktuellerPlan] = useState<Lagerungsplan | null>(null)
  const [braden, setBraden] = useState<BradenAssessment>(leeresBradenAssessment())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [neuerEintrag, setNeuerEintrag] = useState<Partial<Lagerungsdokumentation>>({
    durchgefuehrt_am: new Date().toISOString().slice(0,16),
    position: '',
    durchgefuehrt_von: '',
    hautbefund: '',
    besonderheiten: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rB, rP, rD] = await Promise.all([
        fetch('/api/dekubitus/braden'),
        fetch('/api/dekubitus/lagerung'),
        fetch('/api/dekubitus/dokumentation?limit=20')
      ])
      if (rB.ok) { const d = await rB.json(); setAssessments(d.assessments ?? []) }
      if (rP.ok) { const d = await rP.json(); setPlaene(d.plaene ?? []); setAktuellerPlan(d.plaene?.[0] ?? null) }
      if (rD.ok) { const d = await rD.json(); setDokumentationen(d.dokumentationen ?? []) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const livescore = berechneGesamtscore(braden)
  const liverisiko = bradenRisiko(livescore)

  const saveBraden = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/dekubitus/braden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(braden)
      })
      if (r.ok) {
        flash('✅ Braden-Assessment gespeichert')
        const d = await r.json()
        setAssessments(prev => [d.assessment, ...prev])
        setBraden(leeresBradenAssessment())
      } else { flash('❌ Fehler beim Speichern') }
    } finally { setSaving(false) }
  }

  const savePlan = async () => {
    if (!aktuellerPlan) return
    setSaving(true)
    try {
      const method = aktuellerPlan.id ? 'PUT' : 'POST'
      const r = await fetch('/api/dekubitus/lagerung', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aktuellerPlan)
      })
      if (r.ok) {
        flash('✅ Lagerungsplan gespeichert')
        load()
      } else { flash('❌ Fehler') }
    } finally { setSaving(false) }
  }

  const saveDokumentation = async () => {
    if (!neuerEintrag.position) return
    setSaving(true)
    try {
      const r = await fetch('/api/dekubitus/dokumentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...neuerEintrag, plan_id: aktuellerPlan?.id })
      })
      if (r.ok) {
        flash('✅ Lagerung dokumentiert')
        const d = await r.json()
        setDokumentationen(prev => [d.dokumentation, ...prev])
        setNeuerEintrag({ durchgefuehrt_am: new Date().toISOString().slice(0,16), position: '', durchgefuehrt_von: neuerEintrag.durchgefuehrt_von })
      } else { flash('❌ Fehler') }
    } finally { setSaving(false) }
  }

  const updatePlanIntervall = (min: number) => {
    if (!aktuellerPlan) return
    const tagesplan = generiereTagesplan(min, aktuellerPlan.positionen)
    setAktuellerPlan(p => p ? { ...p, intervall_minuten: min, tagesplan } : p)
  }

  // Risikofarbe für score-badges
  const scoreKlasse = (s: number) => {
    const r = bradenRisiko(s)
    return r.stufe
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'braden', label: '🩺 Braden-Skala' },
    { id: 'lagerung', label: '🗓️ Lagerungsplan' },
    { id: 'protokoll', label: '📝 Protokoll' },
    { id: 'verlauf', label: '📈 Verlauf' },
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
                ? 'bg-white border border-b-white border-gray-200 text-teal-600 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Braden-Skala ──────────────────────────────────────────────────── */}
      {tab === 'braden' && (
        <div className="space-y-4">
          {/* Live-Score Card */}
          <div
            className="rounded-xl p-5 text-white flex items-center justify-between"
            style={{ backgroundColor: liverisiko.farbe }}
          >
            <div>
              <p className="text-sm font-medium opacity-90">Braden-Score (live)</p>
              <p className="text-4xl font-bold mt-1">{livescore} <span className="text-xl font-normal">/ 23</span></p>
              <p className="text-lg font-semibold mt-1">{liverisiko.label}</p>
              <p className="text-sm opacity-80 mt-0.5">
                Empfohlenes Lagerungsintervall: alle {liverisiko.intervall} Minuten
              </p>
            </div>
            <div className="text-5xl opacity-30">🛡️</div>
          </div>

          {/* Kategorien */}
          <div className="space-y-3">
            {BRADEN_KATEGORIEN.map(kat => {
              const aktuell = braden[kat.key] as number
              return (
                <div key={kat.key} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{kat.icon}</span>
                    <span className="font-semibold text-gray-800">{kat.label}</span>
                    <span className="ml-auto text-sm font-bold text-teal-600">{aktuell}/{kat.max}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {kat.stufen.map(s => (
                      <button
                        key={s.wert}
                        onClick={() => setBraden(p => ({ ...p, [kat.key]: s.wert }))}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          aktuell === s.wert
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-300'
                            : 'border-gray-200 hover:border-teal-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${aktuell === s.wert ? 'bg-teal-500' : 'bg-gray-300'}`}>
                            {s.wert}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.beschreibung}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Maßnahmen */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h4 className="font-semibold text-gray-800">Prophylaxe-Maßnahmen</h4>

            {/* Hilfsmittel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Druckentlastungs-Hilfsmittel</label>
              <div className="flex flex-wrap gap-2">
                {DRUCKENTLASTUNGS_HILFSMITTEL.map(h => {
                  const selected = braden.druckentlastung_hilfsmittel?.includes(h)
                  return (
                    <button
                      key={h}
                      onClick={() => setBraden(p => ({
                        ...p,
                        druckentlastung_hilfsmittel: selected
                          ? (p.druckentlastung_hilfsmittel ?? []).filter(x => x !== h)
                          : [...(p.druckentlastung_hilfsmittel ?? []), h]
                      }))}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        selected ? 'bg-teal-100 border-teal-400 text-teal-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {selected ? '✓ ' : ''}{h}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lagerungsintervall</label>
                <select
                  value={braden.lagerungsintervall_min ?? 120}
                  onChange={e => setBraden(p => ({ ...p, lagerungsintervall_min: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value={60}>Stündlich (60 min)</option>
                  <option value={90}>Alle 1,5 Std. (90 min)</option>
                  <option value={120}>Alle 2 Std. (120 min)</option>
                  <option value={180}>Alle 3 Std. (180 min)</option>
                  <option value={240}>Alle 4 Std. (240 min)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hautpflege-Mittel</label>
                <input
                  type="text"
                  value={braden.hautpflege_mittel ?? ''}
                  onChange={e => setBraden(p => ({ ...p, hautpflege_mittel: e.target.value }))}
                  placeholder="z.B. Azulon Salbe, Bepanthen"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beurteilende Person</label>
                <input
                  type="text"
                  value={braden.beurteilende_person ?? ''}
                  onChange={e => setBraden(p => ({ ...p, beurteilende_person: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  type="date"
                  value={braden.assessment_datum}
                  onChange={e => setBraden(p => ({ ...p, assessment_datum: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Maßnahmen (Freitext)</label>
                <textarea
                  rows={2}
                  value={braden.massnahmen_freitext ?? ''}
                  onChange={e => setBraden(p => ({ ...p, massnahmen_freitext: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Empfehlungen */}
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-teal-800 mb-2">Empfohlene Maßnahmen für Risiko «{liverisiko.label}»:</p>
              <ul className="space-y-1">
                {liverisiko.massnahmen.map((m, i) => (
                  <li key={i} className="text-sm text-teal-700 flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">•</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={saveBraden}
            disabled={saving}
            className="px-5 py-2 bg-teal-600 text-white rounded font-medium text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern…' : '💾 Assessment speichern'}
          </button>
        </div>
      )}

      {/* ── Lagerungsplan ──────────────────────────────────────────────────── */}
      {tab === 'lagerung' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">🗓️ Lagerungsplan erstellen / bearbeiten</h3>

            {!aktuellerPlan && (
              <button
                onClick={() => setAktuellerPlan(leererLagerungsplan())}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-400 hover:text-teal-600 text-sm transition-colors"
              >
                + Neuen Lagerungsplan erstellen
              </button>
            )}

            {aktuellerPlan && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung</label>
                    <input
                      type="text"
                      value={aktuellerPlan.bezeichnung}
                      onChange={e => setAktuellerPlan(p => p ? { ...p, bezeichnung: e.target.value } : p)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervall</label>
                    <select
                      value={aktuellerPlan.intervall_minuten}
                      onChange={e => updatePlanIntervall(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      <option value={60}>Stündlich (60 min)</option>
                      <option value={90}>Alle 1,5 Std. (90 min)</option>
                      <option value={120}>Alle 2 Std. (120 min)</option>
                      <option value={180}>Alle 3 Std. (180 min)</option>
                      <option value={240}>Alle 4 Std. (240 min)</option>
                    </select>
                  </div>
                </div>

                {/* Positionen auswählen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lagerungspositionen (Reihenfolge)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {STANDARD_POSITIONEN.map(pos => {
                      const aktiv = aktuellerPlan.positionen.some(p => p.id === pos.id)
                      return (
                        <button
                          key={pos.id}
                          onClick={() => {
                            const newPos = aktiv
                              ? aktuellerPlan.positionen.filter(p => p.id !== pos.id)
                              : [...aktuellerPlan.positionen, pos]
                            const tagesplan = generiereTagesplan(aktuellerPlan.intervall_minuten, newPos)
                            setAktuellerPlan(p => p ? { ...p, positionen: newPos, tagesplan } : p)
                          }}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            aktiv ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-2xl">{pos.emoji}</div>
                          <div className="text-xs font-medium text-gray-700 mt-1">{pos.name}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tagesplan-Vorschau */}
                {Object.keys(aktuellerPlan.tagesplan).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tagesplan-Vorschau (24h)</label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                      {Object.entries(aktuellerPlan.tagesplan).map(([zeit, pos]) => {
                        const posInfo = STANDARD_POSITIONEN.find(p => p.name === pos)
                        return (
                          <div key={zeit} className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
                            <div className="text-xs font-mono text-gray-500">{zeit}</div>
                            <div className="text-base">{posInfo?.emoji ?? '🛌'}</div>
                            <div className="text-xs text-gray-600 leading-tight">{pos}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
                  <textarea
                    rows={2}
                    value={aktuellerPlan.notizen ?? ''}
                    onChange={e => setAktuellerPlan(p => p ? { ...p, notizen: e.target.value } : p)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={savePlan}
                    disabled={saving}
                    className="px-5 py-2 bg-teal-600 text-white rounded font-medium text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Speichern…' : '💾 Plan speichern'}
                  </button>
                  <button
                    onClick={() => setAktuellerPlan(leererLagerungsplan())}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                  >
                    Neu
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Gespeicherte Pläne */}
          {plaene.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-gray-700">Gespeicherte Pläne</p>
              </div>
              {plaene.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{p.bezeichnung}</span>
                    <span className="ml-3 text-xs text-gray-400">alle {p.intervall_minuten} Min — {p.positionen.length} Positionen</span>
                  </div>
                  <button
                    onClick={() => setAktuellerPlan(p)}
                    className="text-xs px-3 py-1 bg-teal-50 text-teal-700 rounded hover:bg-teal-100"
                  >
                    Laden
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Protokoll ──────────────────────────────────────────────────────── */}
      {tab === 'protokoll' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">📝 Lagerung dokumentieren</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zeitpunkt *</label>
                <input
                  type="datetime-local"
                  value={neuerEintrag.durchgefuehrt_am ?? ''}
                  onChange={e => setNeuerEintrag(p => ({ ...p, durchgefuehrt_am: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                <div className="grid grid-cols-4 gap-1">
                  {STANDARD_POSITIONEN.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setNeuerEintrag(p => ({ ...p, position: pos.name }))}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        neuerEintrag.position === pos.name ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-lg">{pos.emoji}</div>
                      <div className="text-xs text-gray-600">{pos.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durchgeführt von</label>
                <input
                  type="text"
                  value={neuerEintrag.durchgefuehrt_von ?? ''}
                  onChange={e => setNeuerEintrag(p => ({ ...p, durchgefuehrt_von: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hautbefund</label>
                <input
                  type="text"
                  value={neuerEintrag.hautbefund ?? ''}
                  onChange={e => setNeuerEintrag(p => ({ ...p, hautbefund: e.target.value }))}
                  placeholder="unauffällig / Rötung Sakrum / …"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Besonderheiten</label>
                <textarea
                  rows={2}
                  value={neuerEintrag.besonderheiten ?? ''}
                  onChange={e => setNeuerEintrag(p => ({ ...p, besonderheiten: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
            <button
              onClick={saveDokumentation}
              disabled={saving || !neuerEintrag.position}
              className="px-5 py-2 bg-teal-600 text-white rounded font-medium text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern…' : '✅ Lagerung dokumentieren'}
            </button>
          </div>

          {/* Letzte Einträge */}
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-700">Letzte Lagerungen</p>
            </div>
            {dokumentationen.length === 0 && (
              <p className="text-gray-400 text-sm p-4">Noch keine Lagerungen dokumentiert.</p>
            )}
            {dokumentationen.slice(0, 10).map(d => {
              const pos = STANDARD_POSITIONEN.find(p => p.name === d.position)
              return (
                <div key={d.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-xl">{pos?.emoji ?? '🛌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{d.position}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(d.durchgefuehrt_am).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </span>
                      {d.durchgefuehrt_von && <span className="text-xs text-gray-400">— {d.durchgefuehrt_von}</span>}
                    </div>
                    {d.hautbefund && <p className="text-xs text-gray-500 mt-0.5">Haut: {d.hautbefund}</p>}
                    {d.besonderheiten && <p className="text-xs text-gray-500 mt-0.5 italic">{d.besonderheiten}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Verlauf ────────────────────────────────────────────────────────── */}
      {tab === 'verlauf' && (
        <div className="space-y-4">
          {loading && <p className="text-gray-400 text-sm">Laden…</p>}
          {!loading && assessments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📈</p>
              <p>Noch keine Assessments vorhanden</p>
            </div>
          )}

          {/* Score-Verlauf Chart */}
          {assessments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">📊 Braden-Score-Verlauf</h4>
              <div className="flex items-end gap-2 h-24">
                {[...assessments].reverse().slice(-12).map((a, i) => {
                  const score = a.gesamtscore ?? berechneGesamtscore(a)
                  const risiko = bradenRisiko(score)
                  const h = Math.round((score / 23) * 100)
                  return (
                    <div key={a.id ?? i} className="flex flex-col items-center flex-1" title={`Score ${score} — ${new Date(a.assessment_datum).toLocaleDateString('de-DE')}`}>
                      <span className="text-xs font-bold mb-1" style={{ color: risiko.farbe }}>{score}</span>
                      <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, backgroundColor: risiko.farbe }} />
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(a.assessment_datum).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                {[{l:'≥19 Kein Risiko', c:'#22c55e'},{l:'15-18 Gering', c:'#84cc16'},{l:'13-14 Mittel', c:'#f59e0b'},{l:'10-12 Hoch', c:'#ef4444'},{l:'≤9 Sehr hoch', c:'#7c3aed'}].map(x => (
                  <span key={x.l} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: x.c }} />{x.l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assessment-Liste */}
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {assessments.map(a => {
              const score = a.gesamtscore ?? berechneGesamtscore(a)
              const risiko = bradenRisiko(score)
              return (
                <div key={a.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-800">
                      {new Date(a.assessment_datum).toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'2-digit' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: risiko.farbe }}>{score}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: risiko.farbe + '20', color: risiko.farbe }}>
                        {risiko.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-1 text-xs text-gray-500">
                    <span>Sens: {a.sensorik}</span>
                    <span>Feuch: {a.feuchtigkeit}</span>
                    <span>Akt: {a.aktivitaet}</span>
                    <span>Mob: {a.mobilitaet}</span>
                    <span>Ern: {a.ernaehrung}</span>
                    <span>Reib: {a.reibung_scherkraefte}</span>
                  </div>
                  {a.beurteilende_person && <p className="text-xs text-gray-400 mt-1">👤 {a.beurteilende_person}</p>}
                  {a.massnahmen_freitext && <p className="text-xs text-gray-500 mt-1 italic">{a.massnahmen_freitext}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
