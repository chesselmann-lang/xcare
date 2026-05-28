'use client'

import { useState, useEffect, useCallback } from 'react'

interface Vitalzeichen {
  id?: string
  user_id?: string
  gemessen_am?: string
  blutdruck_systolisch?: number
  blutdruck_diastolisch?: number
  puls?: number
  puls_rhythmus?: string
  temperatur?: number
  temperatur_methode?: string
  spo2?: number
  atemfrequenz?: number
  blutzucker?: number
  blutzucker_einheit?: string
  blutzucker_zeitpunkt?: string
  gewicht?: number
  schmerz_nrs?: number
  bewusstsein?: string
  lage?: string
  messbedingungen?: string
  gemessen_von?: string
}

interface VitalGrenzwert {
  id?: string
  parameter: string
  min_wert: number
  max_wert: number
  einheit?: string
  aktion_bei_ueberschreitung?: string
}

const VITAL_PARAMETER = [
  { key: 'blutdruck', label: 'Blutdruck', einheit: 'mmHg', icon: '🫀', normalMin: 90, normalMax: 140, step: 1 },
  { key: 'puls', label: 'Puls', einheit: '/min', icon: '💓', normalMin: 60, normalMax: 100, step: 1, min: 20, max: 250 },
  { key: 'temperatur', label: 'Temperatur', einheit: '°C', icon: '🌡️', normalMin: 36.1, normalMax: 37.2, step: 0.1, min: 33, max: 42 },
  { key: 'spo2', label: 'SpO₂', einheit: '%', icon: '🫁', normalMin: 95, normalMax: 100, step: 1, min: 60, max: 100 },
  { key: 'atemfrequenz', label: 'Atemfrequenz', einheit: '/min', icon: '💨', normalMin: 12, normalMax: 20, step: 1, min: 5, max: 60 },
  { key: 'blutzucker', label: 'Blutzucker', einheit: 'mmol/L', icon: '🩸', normalMin: 3.9, normalMax: 6.1, step: 0.1, min: 1, max: 30 },
  { key: 'gewicht', label: 'Gewicht', einheit: 'kg', icon: '⚖️', normalMin: 0, normalMax: 999, step: 0.1, min: 20, max: 300 },
]

type AmpelStatus = 'normal' | 'grenzwertig' | 'kritisch'

function pruefAmpel(wert: number, normalMin: number, normalMax: number, grenzwerte?: VitalGrenzwert): AmpelStatus {
  const min = grenzwerte ? grenzwerte.min_wert : normalMin * 0.9
  const max = grenzwerte ? grenzwerte.max_wert : normalMax * 1.1
  if (wert >= normalMin && wert <= normalMax) return 'normal'
  if (wert >= min && wert <= max) return 'grenzwertig'
  return 'kritisch'
}

const AMPEL: Record<AmpelStatus, { bg: string; border: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: 'Normal' },
  grenzwertig: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Grenzwertig' },
  kritisch: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', label: 'Kritisch' },
}

const BEWUSSTSEIN_OPTIONEN = ['Alert', 'Voice (reagiert auf Ansprache)', 'Pain (reagiert auf Schmerz)', 'Unresponsive']
const LAGE_OPTIONEN = ['Sitzend', 'Liegend', 'Stehend', 'Nach Belastung', 'Vor dem Essen', 'Nach dem Essen', 'Nüchtern']
const PULS_RHYTHMUS = ['Regelmäßig', 'Unregelmäßig', 'Arrhythmisch']
const TEMPERATUR_METHODE = ['Axillär', 'Oral', 'Rektal', 'Tympanal', 'Infrarot Stirn']
const BLUTZUCKER_ZEITPUNKT = ['Nüchtern', 'Vor dem Essen', '1h nach Essen', '2h nach Essen', 'Vor dem Schlafen', 'Nachts']

export default function VitalzeichenClient() {
  const [activeTab, setActiveTab] = useState(0)
  const [eintraege, setEintraege] = useState<Vitalzeichen[]>([])
  const [grenzwerte, setGrenzwerte] = useState<VitalGrenzwert[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Formularfelder
  const [blutdruckS, setBlutdruckS] = useState<number | ''>('')
  const [blutdruckD, setBlutdruckD] = useState<number | ''>('')
  const [puls, setPuls] = useState<number | ''>('')
  const [pulsRhythmus, setPulsRhythmus] = useState('Regelmäßig')
  const [temperatur, setTemperatur] = useState<number | ''>('')
  const [temperaturMethode, setTemperaturMethode] = useState('Axillär')
  const [spo2, setSpo2] = useState<number | ''>('')
  const [atemfrequenz, setAtemfrequenz] = useState<number | ''>('')
  const [blutzucker, setBlutzucker] = useState<number | ''>('')
  const [blutzuckerZeitpunkt, setBlutzuckerZeitpunkt] = useState('Nüchtern')
  const [gewicht, setGewicht] = useState<number | ''>('')
  const [schmerzNrs, setSchmerzNrs] = useState<number | ''>('')
  const [bewusstsein, setBewusstsein] = useState('Alert')
  const [lage, setLage] = useState('Sitzend')
  const [messbedingungen, setMessbedingungen] = useState('')
  const [gemessenVon, setGemessenVon] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, gRes] = await Promise.all([
        fetch('/api/vitalzeichen?limit=50'),
        fetch('/api/vitalzeichen/grenzwerte'),
      ])
      if (vRes.ok) setEintraege(await vRes.json())
      if (gRes.ok) setGrenzwerte(await gRes.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const getGrenzwert = (param: string) => grenzwerte.find(g => g.parameter === param)

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const body: Vitalzeichen = {
      blutdruck_systolisch: blutdruckS !== '' ? Number(blutdruckS) : undefined,
      blutdruck_diastolisch: blutdruckD !== '' ? Number(blutdruckD) : undefined,
      puls: puls !== '' ? Number(puls) : undefined,
      puls_rhythmus: puls !== '' ? pulsRhythmus : undefined,
      temperatur: temperatur !== '' ? Number(temperatur) : undefined,
      temperatur_methode: temperatur !== '' ? temperaturMethode : undefined,
      spo2: spo2 !== '' ? Number(spo2) : undefined,
      atemfrequenz: atemfrequenz !== '' ? Number(atemfrequenz) : undefined,
      blutzucker: blutzucker !== '' ? Number(blutzucker) : undefined,
      blutzucker_einheit: blutzucker !== '' ? 'mmol/L' : undefined,
      blutzucker_zeitpunkt: blutzucker !== '' ? blutzuckerZeitpunkt : undefined,
      gewicht: gewicht !== '' ? Number(gewicht) : undefined,
      schmerz_nrs: schmerzNrs !== '' ? Number(schmerzNrs) : undefined,
      bewusstsein,
      lage,
      messbedingungen: messbedingungen || undefined,
      gemessen_von: gemessenVon || undefined,
    }
    try {
      const res = await fetch('/api/vitalzeichen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setMsg('✅ Vitalzeichen gespeichert')
        loadData()
        setBlutdruckS(''); setBlutdruckD(''); setPuls(''); setTemperatur(''); setSpo2(''); setAtemfrequenz(''); setBlutzucker(''); setGewicht(''); setSchmerzNrs('')
        setMessbedingungen(''); setGemessenVon('')
      } else {
        setMsg('❌ Fehler beim Speichern')
      }
    } catch { setMsg('❌ Netzwerkfehler') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/vitalzeichen?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  // Ampel für aktuelle Eingabe
  function inputAmpel(key: string, wert: number | ''): AmpelStatus | null {
    if (wert === '') return null
    const param = VITAL_PARAMETER.find(p => p.key === key)
    if (!param) return null
    const gw = getGrenzwert(key)
    return pruefAmpel(Number(wert), param.normalMin, param.normalMax, gw)
  }

  // Letzter Eintrag
  const letzter = eintraege[0]

  function ampelFuerLetzten(key: string): AmpelStatus | null {
    if (!letzter) return null
    const wert = (letzter as Record<string, unknown>)[key] as number | undefined
    if (wert === undefined || wert === null) return null
    const param = VITAL_PARAMETER.find(p => p.key === key)
    if (!param) return null
    const gw = getGrenzwert(key)
    return pruefAmpel(wert, param.normalMin, param.normalMax, gw)
  }

  const tabs = ['📊 Erfassen', '📋 Verlauf', '🚨 Ampel', '📈 Trends']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-gray-900">📊 Vitalzeichen-Protokoll</h1>
        <p className="text-gray-500 text-sm mt-1">Messung · Ampelsystem · Grenzwerte · Verlauf</p>
      </div>

      {/* Ampel-Übersicht (letzter Eintrag) */}
      {letzter && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-2">Letzte Messung: {letzter.gemessen_am ? new Date(letzter.gemessen_am).toLocaleString('de-DE') : ''}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'BD', value: letzter.blutdruck_systolisch ? `${letzter.blutdruck_systolisch}/${letzter.blutdruck_diastolisch}` : null, ampelKey: 'blutdruck', einheit: 'mmHg', icon: '🫀' },
              { label: 'Puls', value: letzter.puls, ampelKey: 'puls', einheit: '/min', icon: '💓' },
              { label: 'Temp.', value: letzter.temperatur, ampelKey: 'temperatur', einheit: '°C', icon: '🌡️' },
              { label: 'SpO₂', value: letzter.spo2, ampelKey: 'spo2', einheit: '%', icon: '🫁' },
              { label: 'AF', value: letzter.atemfrequenz, ampelKey: 'atemfrequenz', einheit: '/min', icon: '💨' },
              { label: 'BZ', value: letzter.blutzucker, ampelKey: 'blutzucker', einheit: 'mmol/L', icon: '🩸' },
            ].map(item => {
              if (!item.value && item.value !== 0) return null
              const status = ampelFuerLetzten(item.ampelKey) || 'normal'
              const a = AMPEL[status]
              return (
                <div key={item.label} className={`rounded-lg p-2.5 border ${a.bg} ${a.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.icon} {item.label}</span>
                    <span className={`text-xs font-semibold px-1 rounded ${a.text}`}>{a.label}</span>
                  </div>
                  <p className={`text-lg font-bold mt-0.5 ${a.text}`}>{item.value} <span className="text-xs font-normal">{item.einheit}</span></p>
                </div>
              )
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-1 rounded-md text-xs font-medium transition-all ${activeTab === i ? 'bg-white shadow text-teal-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Erfassen */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* Blutdruck */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">🫀 Blutdruck</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Systolisch (mmHg)</label>
                <input type="number" value={blutdruckS} onChange={e => setBlutdruckS(e.target.value === '' ? '' : Number(e.target.value))} min={50} max={300}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1 ${blutdruckS !== '' ? (inputAmpel('blutdruck', blutdruckS) === 'kritisch' ? 'border-red-400 bg-red-50' : inputAmpel('blutdruck', blutdruckS) === 'grenzwertig' ? 'border-yellow-400' : 'border-gray-200') : 'border-gray-200'}`}
                  placeholder="120" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Diastolisch (mmHg)</label>
                <input type="number" value={blutdruckD} onChange={e => setBlutdruckD(e.target.value === '' ? '' : Number(e.target.value))} min={30} max={200}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1" placeholder="80" />
              </div>
            </div>
          </div>

          {/* Puls */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">💓 Puls</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Puls (/min)</label>
                <input type="number" value={puls} onChange={e => setPuls(e.target.value === '' ? '' : Number(e.target.value))} min={20} max={250}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1 ${puls !== '' && inputAmpel('puls', puls) === 'kritisch' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  placeholder="72" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Rhythmus</label>
                <select value={pulsRhythmus} onChange={e => setPulsRhythmus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1">
                  {PULS_RHYTHMUS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Temperatur */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">🌡️ Temperatur</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Temperatur (°C)</label>
                <input type="number" value={temperatur} onChange={e => setTemperatur(e.target.value === '' ? '' : Number(e.target.value))} min={33} max={42} step={0.1}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1 ${temperatur !== '' && inputAmpel('temperatur', temperatur) === 'kritisch' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  placeholder="36.6" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Messmethode</label>
                <select value={temperaturMethode} onChange={e => setTemperaturMethode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1">
                  {TEMPERATUR_METHODE.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* SpO2 + AF */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">🫁 SpO₂ (%)</label>
                <input type="number" value={spo2} onChange={e => setSpo2(e.target.value === '' ? '' : Number(e.target.value))} min={60} max={100}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1 ${spo2 !== '' && inputAmpel('spo2', spo2) === 'kritisch' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  placeholder="98" />
              </div>
              <div>
                <label className="text-xs text-gray-500">💨 Atemfrequenz (/min)</label>
                <input type="number" value={atemfrequenz} onChange={e => setAtemfrequenz(e.target.value === '' ? '' : Number(e.target.value))} min={5} max={60}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1" placeholder="16" />
              </div>
            </div>
          </div>

          {/* Blutzucker + Gewicht */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">🩸 Blutzucker (mmol/L)</label>
                <input type="number" value={blutzucker} onChange={e => setBlutzucker(e.target.value === '' ? '' : Number(e.target.value))} min={1} max={30} step={0.1}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1 ${blutzucker !== '' && inputAmpel('blutzucker', blutzucker) === 'kritisch' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  placeholder="5.5" />
                <select value={blutzuckerZeitpunkt} onChange={e => setBlutzuckerZeitpunkt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mt-1.5">
                  {BLUTZUCKER_ZEITPUNKT.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">⚖️ Gewicht (kg)</label>
                <input type="number" value={gewicht} onChange={e => setGewicht(e.target.value === '' ? '' : Number(e.target.value))} min={20} max={300} step={0.1}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1" placeholder="72.5" />
                <label className="text-xs text-gray-500 block mt-1.5">NRS Schmerz (0-10)</label>
                <input type="number" value={schmerzNrs} onChange={e => setSchmerzNrs(e.target.value === '' ? '' : Number(e.target.value))} min={0} max={10}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mt-0.5" placeholder="0-10" />
              </div>
            </div>
          </div>

          {/* Allgemeinzustand */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Allgemeinzustand</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Bewusstsein (AVPU)</label>
                <select value={bewusstsein} onChange={e => setBewusstsein(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1">
                  {BEWUSSTSEIN_OPTIONEN.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Lage / Situation</label>
                <select value={lage} onChange={e => setLage(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1">
                  {LAGE_OPTIONEN.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Messbedingungen / Notizen</label>
                <input value={messbedingungen} onChange={e => setMessbedingungen(e.target.value)}
                  placeholder="z.B. nach Aufregung, Fieber seit gestern"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Gemessen von</label>
                <input value={gemessenVon} onChange={e => setGemessenVon(e.target.value)}
                  placeholder="Name / Kürzel"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none mt-1" />
              </div>
            </div>
          </div>

          {msg && <div className={`rounded-lg p-3 text-sm text-center ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Wird gespeichert…' : '💾 Vitalzeichen speichern'}
          </button>
        </div>
      )}

      {/* Tab 1: Verlauf */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {eintraege.length === 0 && <div className="text-center text-gray-400 py-12">Noch keine Messungen</div>}
          {eintraege.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400">{e.gemessen_am ? new Date(e.gemessen_am).toLocaleString('de-DE') : ''}{e.gemessen_von ? ` · ${e.gemessen_von}` : ''}</p>
                  <p className="text-xs text-gray-400">{e.lage}{e.bewusstsein && e.bewusstsein !== 'Alert' ? ` · ${e.bewusstsein}` : ''}</p>
                </div>
                <button onClick={() => handleDelete(e.id!)} className="text-gray-300 hover:text-red-400 transition-colors text-sm">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                {e.blutdruck_systolisch && <span className="text-gray-700">🫀 {e.blutdruck_systolisch}/{e.blutdruck_diastolisch} mmHg</span>}
                {e.puls && <span className="text-gray-700">💓 {e.puls}/min {e.puls_rhythmus === 'Unregelmäßig' ? '⚠️' : ''}</span>}
                {e.temperatur && <span className="text-gray-700">🌡️ {e.temperatur}°C</span>}
                {e.spo2 && <span className={`${e.spo2 < 90 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>🫁 {e.spo2}%</span>}
                {e.atemfrequenz && <span className="text-gray-700">💨 {e.atemfrequenz}/min</span>}
                {e.blutzucker && <span className="text-gray-700">🩸 {e.blutzucker} mmol/L</span>}
                {e.gewicht && <span className="text-gray-700">⚖️ {e.gewicht} kg</span>}
                {e.schmerz_nrs !== undefined && e.schmerz_nrs !== null && <span className="text-gray-700">🩺 NRS {e.schmerz_nrs}</span>}
              </div>
              {e.messbedingungen && <p className="text-xs text-gray-400 mt-1.5 italic">{e.messbedingungen}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Ampel */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">🚨 Ampelsystem — Letzte Messung</h2>
            {!letzter ? (
              <p className="text-gray-400 text-center py-8">Noch keine Messungen vorhanden</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Blutdruck systolisch', icon: '🫀', key: 'blutdruck', wert: letzter.blutdruck_systolisch, einheit: 'mmHg', normalMin: 90, normalMax: 140 },
                  { label: 'Puls', icon: '💓', key: 'puls', wert: letzter.puls, einheit: '/min', normalMin: 60, normalMax: 100 },
                  { label: 'Temperatur', icon: '🌡️', key: 'temperatur', wert: letzter.temperatur, einheit: '°C', normalMin: 36.1, normalMax: 37.2 },
                  { label: 'SpO₂', icon: '🫁', key: 'spo2', wert: letzter.spo2, einheit: '%', normalMin: 95, normalMax: 100 },
                  { label: 'Atemfrequenz', icon: '💨', key: 'atemfrequenz', wert: letzter.atemfrequenz, einheit: '/min', normalMin: 12, normalMax: 20 },
                  { label: 'Blutzucker', icon: '🩸', key: 'blutzucker', wert: letzter.blutzucker, einheit: 'mmol/L', normalMin: 3.9, normalMax: 6.1 },
                ].map(item => {
                  if (!item.wert && item.wert !== 0) return null
                  const gw = getGrenzwert(item.key)
                  const status = pruefAmpel(item.wert, item.normalMin, item.normalMax, gw)
                  const a = AMPEL[status]
                  return (
                    <div key={item.key} className={`flex items-center justify-between rounded-lg p-3 border ${a.bg} ${a.border}`}>
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{item.label}</p>
                          <p className="text-xs text-gray-500">Normal: {item.normalMin}–{item.normalMax} {item.einheit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${a.text}`}>{item.wert} <span className="text-xs font-normal">{item.einheit}</span></p>
                        <p className={`text-xs font-semibold ${a.text}`}>{a.label}</p>
                      </div>
                    </div>
                  )
                }).filter(Boolean)}
              </div>
            )}
          </div>

          {/* Legende */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Ampel-Legende</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400" /><span className="text-xs text-gray-600">Normal — innerhalb der Normalwerte</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-xs text-gray-600">Grenzwertig — erhöhte Aufmerksamkeit, ggf. Arzt informieren</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-gray-600">Kritisch — sofortige Maßnahmen erforderlich</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Trends */}
      {activeTab === 3 && (
        <div className="space-y-4">
          {eintraege.length < 2 ? (
            <div className="text-center text-gray-400 py-12">Mindestens 2 Messungen für Trendanalyse erforderlich</div>
          ) : (
            <>
              {[
                { label: 'Blutdruck systolisch', key: 'blutdruck_systolisch', einheit: 'mmHg', normalMin: 90, normalMax: 140, color: (v: number) => v <= 140 && v >= 90 ? 'bg-green-400' : 'bg-red-400' },
                { label: 'Puls', key: 'puls', einheit: '/min', normalMin: 60, normalMax: 100, color: (v: number) => v <= 100 && v >= 60 ? 'bg-green-400' : 'bg-red-400' },
                { label: 'SpO₂', key: 'spo2', einheit: '%', normalMin: 95, normalMax: 100, color: (v: number) => v >= 95 ? 'bg-green-400' : 'bg-red-400' },
                { label: 'Temperatur', key: 'temperatur', einheit: '°C', normalMin: 36.1, normalMax: 37.2, color: (v: number) => v <= 37.2 && v >= 36.1 ? 'bg-green-400' : 'bg-yellow-400' },
              ].map(param => {
                const vals = eintraege.filter(e => (e as Record<string, unknown>)[param.key] !== undefined && (e as Record<string, unknown>)[param.key] !== null)
                  .slice(0, 10).reverse()
                if (!vals.length) return null
                const maxV = Math.max(...vals.map(e => (e as Record<string, unknown>)[param.key] as number))
                return (
                  <div key={param.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{param.label}</h3>
                      <span className="text-xs text-gray-400">Normal: {param.normalMin}–{param.normalMax} {param.einheit}</span>
                    </div>
                    <div className="space-y-1.5">
                      {vals.map(e => {
                        const v = (e as Record<string, unknown>)[param.key] as number
                        const pct = Math.min((v / (maxV * 1.1)) * 100, 100)
                        return (
                          <div key={e.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-16 flex-shrink-0">{e.gemessen_am ? new Date(e.gemessen_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                              <div className={`h-4 rounded-full ${param.color(v)}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold w-12 text-right text-gray-700">{v} {param.einheit}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }).filter(Boolean)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
