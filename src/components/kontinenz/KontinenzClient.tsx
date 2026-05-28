'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  KontinenzAssessment, Miktionseintrag, INKONTINENZTYPEN, HILFSMITTEL_OPTIONEN,
  ICIQ_HAEUFIGKEIT, ICIQ_MENGE, INKONTINENZ_SCHAETZUNG, iciqSchweregrad,
  leeresAssessment, leerenMiktionseintrag, berechneTagesbilanz,
} from '@/lib/kontinenz/management'

const TABS = ['📋 Assessment', '🚽 Protokoll', '📅 Tagesübersicht', '📈 Verlauf'] as const
type Tab = typeof TABS[number]

export default function KontinenzClient() {
  const [tab, setTab] = useState<Tab>('📋 Assessment')
  const [assessments, setAssessments] = useState<KontinenzAssessment[]>([])
  const [eintraege, setEintraege] = useState<Miktionseintrag[]>([])
  const [assessment, setAssessment] = useState<KontinenzAssessment>(leeresAssessment())
  const [eintrag, setEintrag] = useState<Miktionseintrag>(leerenMiktionseintrag())
  const [selectedDatum, setSelectedDatum] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadAssessments = useCallback(async () => {
    const r = await fetch('/api/kontinenz')
    if (r.ok) setAssessments(await r.json())
  }, [])

  const loadEintraege = useCallback(async () => {
    const r = await fetch(`/api/kontinenz/tagesbilanz?datum=${selectedDatum}`)
    if (r.ok) setEintraege(await r.json())
  }, [selectedDatum])

  useEffect(() => { loadAssessments(); loadEintraege() }, [loadAssessments, loadEintraege])

  const iciqScore = (assessment.iciq_haeufigkeit || 0) + (assessment.iciq_menge || 0) + (assessment.iciq_beeintraechtigung || 0)
  const schwere = iciqSchweregrad(iciqScore)

  async function saveAssessment() {
    setSaving(true); setMsg('')
    const r = await fetch('/api/kontinenz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment),
    })
    setSaving(false)
    if (r.ok) { setMsg('Assessment gespeichert ✓'); loadAssessments() }
    else setMsg('Fehler beim Speichern')
  }

  async function saveEintrag() {
    setSaving(true); setMsg('')
    const r = await fetch('/api/kontinenz/tagesbilanz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eintrag),
    })
    setSaving(false)
    if (r.ok) { setMsg('Eintrag gespeichert ✓'); setEintrag(leerenMiktionseintrag()); loadEintraege() }
    else setMsg('Fehler beim Speichern')
  }

  async function deleteEintrag(id: string) {
    await fetch(`/api/kontinenz/tagesbilanz?id=${id}`, { method: 'DELETE' })
    loadEintraege()
  }

  function toggleHilfsmittel(h: string) {
    const list = assessment.hilfsmittel || []
    setAssessment({ ...assessment, hilfsmittel: list.includes(h) ? list.filter(x => x !== h) : [...list, h] })
  }

  const tagesbilanz = berechneTagesbilanz(eintraege)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {msg && <div className={`p-3 rounded-lg text-sm ${msg.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      {/* ASSESSMENT TAB */}
      {tab === '📋 Assessment' && (
        <div className="space-y-4">
          {/* ICIQ Score Display */}
          <div className={`p-4 rounded-xl border-2 ${schwere.farbe === 'green' ? 'border-green-200 bg-green-50' : schwere.farbe === 'lime' ? 'border-lime-200 bg-lime-50' : schwere.farbe === 'amber' ? 'border-amber-200 bg-amber-50' : schwere.farbe === 'orange' ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{iciqScore} / 21</div>
                <div className="text-sm font-medium">ICIQ-SF Score — {schwere.label}</div>
              </div>
              <div className="text-4xl">🚽</div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input type="date" value={assessment.assessment_datum}
                onChange={e => setAssessment({ ...assessment, assessment_datum: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            {/* ICIQ-1: Häufigkeit */}
            <div className="border rounded-xl p-4 space-y-2">
              <div className="font-medium text-sm">ICIQ-1: Wie oft verlieren Sie unfreiwillig Urin?</div>
              {Object.entries(ICIQ_HAEUFIGKEIT).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="iciq1" checked={assessment.iciq_haeufigkeit === Number(v)}
                    onChange={() => setAssessment({ ...assessment, iciq_haeufigkeit: Number(v) })} />
                  <span className="text-sm">{v} — {l}</span>
                </label>
              ))}
            </div>

            {/* ICIQ-2: Menge */}
            <div className="border rounded-xl p-4 space-y-2">
              <div className="font-medium text-sm">ICIQ-2: Wie viel Urin verlieren Sie üblicherweise?</div>
              {Object.entries(ICIQ_MENGE).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="iciq2" checked={assessment.iciq_menge === Number(v)}
                    onChange={() => setAssessment({ ...assessment, iciq_menge: Number(v) })} />
                  <span className="text-sm">{v} — {l}</span>
                </label>
              ))}
            </div>

            {/* ICIQ-3: Beeinträchtigung */}
            <div className="border rounded-xl p-4 space-y-2">
              <div className="font-medium text-sm">ICIQ-3: Wie sehr beeinträchtigt der Urinverlust Ihr Leben? (0–10)</div>
              <input type="range" min={0} max={10} value={assessment.iciq_beeintraechtigung || 0}
                onChange={e => setAssessment({ ...assessment, iciq_beeintraechtigung: Number(e.target.value) })}
                className="w-full" />
              <div className="text-center text-lg font-bold">{assessment.iciq_beeintraechtigung || 0}</div>
            </div>

            {/* Inkontinenztyp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inkontinenztyp</label>
              <select value={assessment.inkontinenztyp || ''}
                onChange={e => setAssessment({ ...assessment, inkontinenztyp: e.target.value as KontinenzAssessment['inkontinenztyp'] })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(INKONTINENZTYPEN).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {assessment.inkontinenztyp && (
                <div className="mt-1 text-xs text-gray-500">{INKONTINENZTYPEN[assessment.inkontinenztyp]?.beschreibung}</div>
              )}
            </div>

            {/* Hilfsmittel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hilfsmittel</label>
              <div className="flex flex-wrap gap-2">
                {HILFSMITTEL_OPTIONEN.map(h => (
                  <button key={h} onClick={() => toggleHilfsmittel(h)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${(assessment.hilfsmittel || []).includes(h) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'}`}>
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Training + Intervall */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3">
                <input type="checkbox" checked={assessment.blasentraining || false}
                  onChange={e => setAssessment({ ...assessment, blasentraining: e.target.checked })} />
                <span className="text-sm">Blasentraining</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3">
                <input type="checkbox" checked={assessment.beckenbodentraining || false}
                  onChange={e => setAssessment({ ...assessment, beckenbodentraining: e.target.checked })} />
                <span className="text-sm">Beckenbodentraining</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miktionsintervall (Minuten)</label>
              <input type="number" min={30} max={480} step={15} value={assessment.miktionsintervall_min || ''}
                onChange={e => setAssessment({ ...assessment, miktionsintervall_min: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="z.B. 120" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkungen</label>
              <textarea value={assessment.bemerkungen || ''} rows={3}
                onChange={e => setAssessment({ ...assessment, bemerkungen: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <button onClick={saveAssessment} disabled={saving}
              className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Speichere...' : '💾 Assessment speichern'}
            </button>
          </div>

          {/* Assessment-Verlauf */}
          {assessments.length > 0 && (
            <div className="mt-4 border rounded-xl divide-y">
              <div className="p-3 font-medium text-sm bg-gray-50 rounded-t-xl">Bisherige Assessments</div>
              {assessments.slice(0, 5).map(a => {
                const s = iciqSchweregrad(a.iciq_gesamt || 0)
                return (
                  <div key={a.id} className="p-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{a.assessment_datum}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{a.iciq_gesamt || 0}/21</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.farbe === 'green' ? 'bg-green-100 text-green-700' : s.farbe === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PROTOKOLL TAB */}
      {tab === '🚽 Protokoll' && (
        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-3">
            <h3 className="font-medium">Neuer Eintrag</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zeitpunkt</label>
              <input type="datetime-local" value={eintrag.zeitpunkt}
                onChange={e => setEintrag({ ...eintrag, zeitpunkt: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Miktionsmenge (ml)</label>
                <input type="number" min={0} max={800} value={eintrag.miktion_ml || ''}
                  onChange={e => setEintrag({ ...eintrag, miktion_ml: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="z.B. 200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trinkmenge (ml)</label>
                <input type="number" min={0} max={1000} value={eintrag.trinkmenge_ml || ''}
                  onChange={e => setEintrag({ ...eintrag, trinkmenge_ml: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="z.B. 250" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Getränk</label>
              <input type="text" list="getraenke-list" value={eintrag.getraenk || ''}
                onChange={e => setEintrag({ ...eintrag, getraenk: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="z.B. Wasser, Tee..." />
              <datalist id="getraenke-list">
                {['Wasser', 'Tee', 'Kaffee', 'Saft', 'Suppe', 'Milch'].map(g => <option key={g} value={g} />)}
              </datalist>
            </div>

            <div className="border-t pt-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eintrag.inkontinenz}
                  onChange={e => setEintrag({ ...eintrag, inkontinenz: e.target.checked })} />
                <span className="text-sm font-medium text-red-700">🔴 Inkontinenz-Ereignis</span>
              </label>
              {eintrag.inkontinenz && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Geschätzte Menge</label>
                    <div className="flex gap-2">
                      {Object.entries(INKONTINENZ_SCHAETZUNG).map(([v, info]) => (
                        <button key={v} onClick={() => setEintrag({ ...eintrag, inkontinenz_ml_schaetzung: Number(v) })}
                          className={`flex-1 py-1.5 rounded-lg text-xs border ${eintrag.inkontinenz_ml_schaetzung === Number(v) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                          {info.label}<br /><span className="text-xs opacity-75">{info.ml}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Art der Inkontinenz</label>
                    <div className="flex gap-2 flex-wrap">
                      {[['stress','Belastung'],['drang','Drang'],['nicht_erreicht','Nicht erreicht'],['unbekannt','Unbekannt']].map(([v,l]) => (
                        <button key={v} onClick={() => setEintrag({ ...eintrag, inkontinenz_art: v as Miktionseintrag['inkontinenz_art'] })}
                          className={`px-2 py-1 rounded-lg text-xs border ${eintrag.inkontinenz_art === v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eintrag.einlage_gewechselt}
                  onChange={e => setEintrag({ ...eintrag, einlage_gewechselt: e.target.checked })} />
                <span className="text-sm">Einlage gewechselt</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eintrag.schmerzen}
                  onChange={e => setEintrag({ ...eintrag, schmerzen: e.target.checked })} />
                <span className="text-sm">Schmerzen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={eintrag.brennen}
                  onChange={e => setEintrag({ ...eintrag, brennen: e.target.checked })} />
                <span className="text-sm">Brennen</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bemerkungen</label>
              <input type="text" value={eintrag.bemerkungen || ''}
                onChange={e => setEintrag({ ...eintrag, bemerkungen: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Optional..." />
            </div>

            <button onClick={saveEintrag} disabled={saving}
              className="w-full bg-teal-600 text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Speichere...' : '➕ Eintrag speichern'}
            </button>
          </div>

          {/* Heutige Einträge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">Einträge für {selectedDatum}</h3>
              <input type="date" value={selectedDatum}
                onChange={e => setSelectedDatum(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            {eintraege.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">Noch keine Einträge für diesen Tag</div>
            ) : (
              <div className="border rounded-xl divide-y">
                {eintraege.map(e => (
                  <div key={e.id} className="p-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${e.inkontinenz ? 'bg-red-500' : 'bg-teal-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {e.zeitpunkt ? new Date(e.zeitpunkt).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {e.inkontinenz && <span className="ml-2 text-red-600 text-xs">Inkontinenz</span>}
                      </div>
                      <div className="text-xs text-gray-500 flex gap-3">
                        {e.miktion_ml ? <span>🚽 {e.miktion_ml} ml</span> : null}
                        {e.trinkmenge_ml ? <span>🥤 {e.trinkmenge_ml} ml</span> : null}
                        {e.einlage_gewechselt && <span>🔄 Einlage</span>}
                        {e.schmerzen && <span>⚠️ Schmerzen</span>}
                      </div>
                    </div>
                    <button onClick={() => e.id && deleteEintrag(e.id)}
                      className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAGESÜBERSICHT TAB */}
      {tab === '📅 Tagesübersicht' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum auswählen</label>
            <input type="date" value={selectedDatum}
              onChange={e => setSelectedDatum(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Miktionsmenge', value: `${tagesbilanz.gesamtmenge_ml || 0} ml`, icon: '🚽', color: 'teal' },
              { label: 'Trinkmenge', value: `${tagesbilanz.trinkmenge_ml || 0} ml`, icon: '🥤', color: 'blue' },
              { label: 'Inkontinenz-Episoden', value: `${tagesbilanz.inkontinenz_episoden || 0}×`, icon: '🔴', color: 'red' },
              { label: 'Einlagen-Verbrauch', value: `${tagesbilanz.einlagen_verbrauch || 0}×`, icon: '🔄', color: 'amber' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className={`border-2 ${color === 'teal' ? 'border-teal-200 bg-teal-50' : color === 'blue' ? 'border-blue-200 bg-blue-50' : color === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'} rounded-xl p-3 text-center`}>
                <div className="text-2xl">{icon}</div>
                <div className="text-xl font-bold mt-1">{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>

          {/* Trinkmengenziel */}
          <div className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Trinkmengenziel (1500–2000 ml/Tag)</span>
              <span className={`text-sm font-bold ${(tagesbilanz.trinkmenge_ml || 0) >= 1500 ? 'text-green-600' : 'text-amber-600'}`}>
                {(tagesbilanz.trinkmenge_ml || 0) >= 1500 ? '✓ Erreicht' : 'Noch nicht erreicht'}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((tagesbilanz.trinkmenge_ml || 0) / 2000) * 100)}%` }} />
            </div>
            <div className="text-xs text-gray-500 mt-1">{tagesbilanz.trinkmenge_ml || 0} / 2000 ml</div>
          </div>
        </div>
      )}

      {/* VERLAUF TAB */}
      {tab === '📈 Verlauf' && (
        <div className="space-y-4">
          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-3">ICIQ-SF Verlauf</h3>
            {assessments.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">Noch keine Assessments vorhanden</div>
            ) : (
              <div className="space-y-2">
                {assessments.slice(0, 10).reverse().map(a => {
                  const s = iciqSchweregrad(a.iciq_gesamt || 0)
                  const pct = ((a.iciq_gesamt || 0) / 21) * 100
                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{a.assessment_datum}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.farbe === 'green' ? 'bg-green-400' : s.farbe === 'lime' ? 'bg-lime-400' : s.farbe === 'amber' ? 'bg-amber-400' : s.farbe === 'orange' ? 'bg-orange-400' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{a.iciq_gesamt || 0}/21</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border rounded-xl p-4">
            <h3 className="font-medium mb-2 text-sm">Inkontinenztyp-Erklärungen</h3>
            <div className="space-y-2">
              {Object.entries(INKONTINENZTYPEN).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${v.farbe === 'blue' ? 'bg-blue-100 text-blue-700' : v.farbe === 'orange' ? 'bg-orange-100 text-orange-700' : v.farbe === 'purple' ? 'bg-purple-100 text-purple-700' : v.farbe === 'red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{v.label}</span>
                  <span className="text-xs text-gray-600">{v.beschreibung}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
