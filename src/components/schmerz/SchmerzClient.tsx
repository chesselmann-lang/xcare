'use client'

import { useState, useEffect, useCallback } from 'react'

interface SchmerzEintrag {
  id?: string
  user_id?: string
  erfasst_am?: string
  nrs_wert?: number
  besd_atmung?: number
  besd_lautaeusserungen?: number
  besd_gesichtsausdruck?: number
  besd_koerpersprache?: number
  besd_trost?: number
  besd_gesamt?: number
  charakter?: string[]
  lokalisation?: string[]
  ausstrahlung?: string
  dauer?: string
  ausloeser?: string[]
  lindernd?: string[]
  medikament_gegeben?: boolean
  medikament_name?: string
  medikament_dosis?: string
  wirkung_nach_30min?: number
  uebelkeit?: boolean
  schlafstoerung?: boolean
  massnahmen?: string
  erstellt_von?: string
}

interface Therapieplan {
  id?: string
  bezeichnung?: string
  medikamente?: { name: string; dosis: string; zeitpunkt: string }[]
  nicht_medikamentoes?: string[]
  ziel_nrs?: number
  aktiv?: boolean
}

const SCHMERZ_CHARAKTER = [
  { key: 'dumpf', label: 'Dumpf', emoji: '😶' },
  { key: 'stechend', label: 'Stechend', emoji: '🔪' },
  { key: 'brennend', label: 'Brennend', emoji: '🔥' },
  { key: 'drückend', label: 'Drückend', emoji: '🫷' },
  { key: 'ziehend', label: 'Ziehend', emoji: '↔️' },
  { key: 'pochend', label: 'Pochend', emoji: '💓' },
  { key: 'krampfartig', label: 'Krampfartig', emoji: '⚡' },
  { key: 'kolikartig', label: 'Kolikartig', emoji: '🌀' },
]

const SCHMERZ_LOKALISATION = [
  'Kopf', 'Nacken', 'Schulter links', 'Schulter rechts', 'Brust', 'Rücken oben',
  'Rücken unten', 'Bauch', 'Hüfte links', 'Hüfte rechts', 'Knie links', 'Knie rechts',
  'Bein links', 'Bein rechts', 'Fuß links', 'Fuß rechts', 'Arm links', 'Arm rechts',
  'Ganzkörper', 'Sonstiges',
]

const BESD_ITEMS: Record<string, { label: string; stufen: { value: number; label: string }[] }> = {
  besd_atmung: {
    label: 'Atmung',
    stufen: [
      { value: 0, label: 'Normal' },
      { value: 1, label: 'Gelegentlich angestrengt' },
      { value: 2, label: 'Laut angestrengt / Cheyne-Stokes' },
    ],
  },
  besd_lautaeusserungen: {
    label: 'Lautäußerungen',
    stufen: [
      { value: 0, label: 'Keine' },
      { value: 1, label: 'Gelegentliches Stöhnen' },
      { value: 2, label: 'Lautes Stöhnen / Weinen / Schreien' },
    ],
  },
  besd_gesichtsausdruck: {
    label: 'Gesichtsausdruck',
    stufen: [
      { value: 0, label: 'Entspannt / Lächelnd' },
      { value: 1, label: 'Traurig / Ängstlich / Stirnrunzeln' },
      { value: 2, label: 'Grimassieren' },
    ],
  },
  besd_koerpersprache: {
    label: 'Körpersprache',
    stufen: [
      { value: 0, label: 'Entspannt' },
      { value: 1, label: 'Angespannt / Unruhig / Hin- und Herwiegen' },
      { value: 2, label: 'Starr / Geballte Fäuste / Angezogene Knie' },
    ],
  },
  besd_trost: {
    label: 'Tröstbarkeit',
    stufen: [
      { value: 0, label: 'Kein Trösten erforderlich' },
      { value: 1, label: 'Durch Stimme/Berührung ablenkbar' },
      { value: 2, label: 'Nicht zu trösten' },
    ],
  },
}

function nrsBewertung(nrs: number): { label: string; farbe: string; bg: string } {
  if (nrs === 0) return { label: 'Kein Schmerz', farbe: 'text-green-700', bg: 'bg-green-50' }
  if (nrs <= 3) return { label: 'Leicht', farbe: 'text-green-600', bg: 'bg-green-50' }
  if (nrs <= 6) return { label: 'Mäßig', farbe: 'text-yellow-600', bg: 'bg-yellow-50' }
  if (nrs <= 9) return { label: 'Stark', farbe: 'text-orange-600', bg: 'bg-orange-50' }
  return { label: 'Unerträglich', farbe: 'text-red-700', bg: 'bg-red-50' }
}

function besdBewertung(gesamt: number): { label: string; farbe: string } {
  if (gesamt <= 1) return { label: 'Kein / minimaler Schmerz', farbe: 'text-green-600' }
  if (gesamt <= 3) return { label: 'Leichter Schmerz', farbe: 'text-yellow-600' }
  if (gesamt <= 6) return { label: 'Mäßiger Schmerz', farbe: 'text-orange-600' }
  return { label: 'Starker Schmerz', farbe: 'text-red-600' }
}

export default function SchmerzClient() {
  const [activeTab, setActiveTab] = useState(0)
  const [eintraege, setEintraege] = useState<SchmerzEintrag[]>([])
  const [therapieplaene, setTherapieplaene] = useState<Therapieplan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Form state
  const [bewertungsTyp, setBewertungsTyp] = useState<'nrs' | 'besd'>('nrs')
  const [nrsWert, setNrsWert] = useState(0)
  const [besdWerte, setBesdWerte] = useState<Record<string, number>>({
    besd_atmung: 0, besd_lautaeusserungen: 0, besd_gesichtsausdruck: 0,
    besd_koerpersprache: 0, besd_trost: 0,
  })
  const [charakter, setCharakter] = useState<string[]>([])
  const [lokalisation, setLokalisation] = useState<string[]>([])
  const [ausstrahlung, setAusstrahlung] = useState('')
  const [dauer, setDauer] = useState('')
  const [ausloeser, setAusloeser] = useState('')
  const [lindernd, setLindernd] = useState('')
  const [medikamentGegeben, setMedikamentGegeben] = useState(false)
  const [medikamentName, setMedikamentName] = useState('')
  const [medikamentDosis, setMedikamentDosis] = useState('')
  const [wirkungNach30, setWirkungNach30] = useState<number | ''>('')
  const [uebelkeit, setUebelkeit] = useState(false)
  const [schlafstoerung, setSchlafstoerung] = useState(false)
  const [massnahmen, setMassnahmen] = useState('')
  const [erstelltVon, setErstelltVon] = useState('')

  const besdGesamt = Object.values(besdWerte).reduce((a, b) => a + b, 0)
  const nrsBew = nrsBewertung(nrsWert)
  const besdBew = besdBewertung(besdGesamt)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [eRes, tRes] = await Promise.all([
        fetch('/api/schmerz?limit=30'),
        fetch('/api/schmerz/therapieplan'),
      ])
      if (eRes.ok) setEintraege(await eRes.json())
      if (tRes.ok) setTherapieplaene(await tRes.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const body: SchmerzEintrag = {
      nrs_wert: bewertungsTyp === 'nrs' ? nrsWert : undefined,
      ...(bewertungsTyp === 'besd' ? besdWerte : {}),
      charakter: charakter.length ? charakter : undefined,
      lokalisation: lokalisation.length ? lokalisation : undefined,
      ausstrahlung: ausstrahlung || undefined,
      dauer: dauer || undefined,
      ausloeser: ausloeser ? ausloeser.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      lindernd: lindernd ? lindernd.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      medikament_gegeben: medikamentGegeben,
      medikament_name: medikamentGegeben ? medikamentName : undefined,
      medikament_dosis: medikamentGegeben ? medikamentDosis : undefined,
      wirkung_nach_30min: wirkungNach30 !== '' ? Number(wirkungNach30) : undefined,
      uebelkeit,
      schlafstoerung,
      massnahmen: massnahmen || undefined,
      erstellt_von: erstelltVon || undefined,
    }
    try {
      const res = await fetch('/api/schmerz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setMsg('✅ Eintrag gespeichert')
        loadData()
        // Reset
        setNrsWert(0)
        setBesdWerte({ besd_atmung: 0, besd_lautaeusserungen: 0, besd_gesichtsausdruck: 0, besd_koerpersprache: 0, besd_trost: 0 })
        setCharakter([])
        setLokalisation([])
        setAusstrahlung('')
        setDauer('')
        setAusloeser('')
        setLindernd('')
        setMedikamentGegeben(false)
        setMedikamentName('')
        setMedikamentDosis('')
        setWirkungNach30('')
        setUebelkeit(false)
        setSchlafstoerung(false)
        setMassnahmen('')
      } else {
        setMsg('❌ Fehler beim Speichern')
      }
    } catch { setMsg('❌ Netzwerkfehler') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/schmerz?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const tabs = ['📝 Erfassung', '📋 Verlauf', '💊 Therapieplan', '📊 Analyse']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-gray-900">🩺 Schmerzmanagement</h1>
        <p className="text-gray-500 text-sm mt-1">NRS & BESD-Skala · Schmerzprotokoll · Therapieplan</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${activeTab === i ? 'bg-white shadow text-rose-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Erfassung */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* Bewertungstyp */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Bewertungsmethode</h2>
            <div className="flex gap-3">
              <button onClick={() => setBewertungsTyp('nrs')}
                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${bewertungsTyp === 'nrs' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600'}`}>
                NRS-Skala<br /><span className="text-xs font-normal">Für kommunikationsfähige Pflegebedürftige</span>
              </button>
              <button onClick={() => setBewertungsTyp('besd')}
                className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${bewertungsTyp === 'besd' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600'}`}>
                BESD-Skala<br /><span className="text-xs font-normal">Für Personen mit Demenz</span>
              </button>
            </div>
          </div>

          {/* NRS */}
          {bewertungsTyp === 'nrs' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Numerische Rating-Skala (NRS)</h2>
              <div className={`rounded-lg p-3 mb-4 text-center ${nrsBew.bg}`}>
                <span className="text-3xl font-bold">{nrsWert}</span>
                <span className="text-gray-500 text-sm">/10</span>
                <p className={`text-sm font-semibold mt-1 ${nrsBew.farbe}`}>{nrsBew.label}</p>
              </div>
              <input type="range" min={0} max={10} step={1} value={nrsWert} onChange={e => setNrsWert(Number(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-green-300 via-yellow-300 to-red-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 - Kein Schmerz</span><span>5 - Mäßig</span><span>10 - Unerträglich</span>
              </div>
              <div className="grid grid-cols-11 gap-0.5 mt-3">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} onClick={() => setNrsWert(i)}
                    className={`aspect-square rounded text-xs font-bold transition-all ${nrsWert === i ? 'bg-rose-500 text-white scale-110' : i <= 3 ? 'bg-green-100 text-green-700 hover:bg-green-200' : i <= 6 ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BESD */}
          {bewertungsTyp === 'besd' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">BESD-Skala</h2>
                <div className="text-right">
                  <span className="text-2xl font-bold">{besdGesamt}</span>
                  <span className="text-gray-500 text-sm">/10</span>
                  <p className={`text-xs font-semibold ${besdBew.farbe}`}>{besdBew.label}</p>
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(BESD_ITEMS).map(([key, item]) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-700 mb-1.5">{item.label}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {item.stufen.map(s => (
                        <button key={s.value} onClick={() => setBesdWerte(prev => ({ ...prev, [key]: s.value }))}
                          className={`py-1.5 px-2 rounded-lg border text-xs text-left transition-all ${besdWerte[key] === s.value ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          <span className="font-bold block">{s.value}</span>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charakteristik */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schmerzcharakter</h2>
            <div className="flex flex-wrap gap-2">
              {SCHMERZ_CHARAKTER.map(c => (
                <button key={c.key} onClick={() => toggleArr(charakter, setCharakter, c.key)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${charakter.includes(c.key) ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lokalisation */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schmerzlokalisation</h2>
            <div className="flex flex-wrap gap-2">
              {SCHMERZ_LOKALISATION.map(l => (
                <button key={l} onClick={() => toggleArr(lokalisation, setLokalisation, l)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${lokalisation.includes(l) ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Weitere Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ausstrahlung</label>
                <input value={ausstrahlung} onChange={e => setAusstrahlung(e.target.value)}
                  placeholder="z.B. in die Schulter" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Dauer</label>
                <input value={dauer} onChange={e => setDauer(e.target.value)}
                  placeholder="z.B. dauerhaft, 30 Min." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Auslöser (kommagetrennt)</label>
                <input value={ausloeser} onChange={e => setAusloeser(e.target.value)}
                  placeholder="z.B. Bewegung, Kälte" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Lindernde Faktoren</label>
                <input value={lindernd} onChange={e => setLindernd(e.target.value)}
                  placeholder="z.B. Wärme, Ruhe" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={uebelkeit} onChange={e => setUebelkeit(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Übelkeit</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={schlafstoerung} onChange={e => setSchlafstoerung(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Schlafstörung</span>
              </label>
            </div>
          </div>

          {/* Medikament */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Medikation</h2>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={medikamentGegeben} onChange={e => setMedikamentGegeben(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Schmerzmedikament verabreicht</span>
            </label>
            {medikamentGegeben && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Medikament</label>
                  <input value={medikamentName} onChange={e => setMedikamentName(e.target.value)}
                    placeholder="z.B. Ibuprofen" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Dosis</label>
                  <input value={medikamentDosis} onChange={e => setMedikamentDosis(e.target.value)}
                    placeholder="z.B. 400mg" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">NRS-Wert nach 30 Min.</label>
                  <input type="number" min={0} max={10} value={wirkungNach30} onChange={e => setWirkungNach30(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0-10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
                </div>
              </div>
            )}
          </div>

          {/* Maßnahmen + Erstellt von */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Maßnahmen / Notizen</label>
                <textarea value={massnahmen} onChange={e => setMassnahmen(e.target.value)} rows={2}
                  placeholder="Durchgeführte Maßnahmen, Besonderheiten…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Erstellt von</label>
                <input value={erstelltVon} onChange={e => setErstelltVon(e.target.value)}
                  placeholder="Name / Kürzel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:outline-none mt-1" />
              </div>
            </div>
          </div>

          {msg && <div className={`rounded-lg p-3 text-sm text-center ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Wird gespeichert…' : '💾 Eintrag speichern'}
          </button>
        </div>
      )}

      {/* Tab 1: Verlauf */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {eintraege.length === 0 && <div className="text-center text-gray-400 py-12">Noch keine Schmerzeinträge</div>}
          {eintraege.map(e => {
            const hatNrs = e.nrs_wert !== undefined && e.nrs_wert !== null
            const bew = hatNrs ? nrsBewertung(e.nrs_wert!) : besdBewertung(e.besd_gesamt ?? 0)
            return (
              <div key={e.id} className={`bg-white rounded-xl border shadow-sm p-4 ${hatNrs ? 'border-l-4 ' + (e.nrs_wert! <= 3 ? 'border-l-green-400' : e.nrs_wert! <= 6 ? 'border-l-yellow-400' : 'border-l-red-400') : 'border-l-4 border-l-purple-400'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {hatNrs ? (
                        <span className="text-2xl font-bold text-gray-800">NRS {e.nrs_wert}<span className="text-sm text-gray-400">/10</span></span>
                      ) : (
                        <span className="text-2xl font-bold text-gray-800">BESD {e.besd_gesamt}<span className="text-sm text-gray-400">/10</span></span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bew.farbe} bg-opacity-10`}>{bew.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{e.erfasst_am ? new Date(e.erfasst_am).toLocaleString('de-DE') : ''}{e.erstellt_von ? ` · ${e.erstellt_von}` : ''}</p>
                    {e.lokalisation?.length ? <p className="text-xs text-blue-600 mt-1">📍 {e.lokalisation.join(', ')}</p> : null}
                    {e.charakter?.length ? <p className="text-xs text-gray-500 mt-0.5">Charakter: {e.charakter.join(', ')}</p> : null}
                    {e.medikament_gegeben && <p className="text-xs text-purple-600 mt-0.5">💊 {e.medikament_name} {e.medikament_dosis}{e.wirkung_nach_30min !== undefined ? ` → NRS ${e.wirkung_nach_30min} nach 30min` : ''}</p>}
                  </div>
                  <button onClick={() => handleDelete(e.id!)} className="text-gray-300 hover:text-red-400 transition-colors ml-2 text-sm">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 2: Therapieplan */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {therapieplaene.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-gray-400 mb-2">Noch kein Therapieplan angelegt</p>
              <p className="text-sm text-gray-400">Therapiepläne werden vom Pflegepersonal erstellt</p>
            </div>
          )}
          {therapieplaene.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-5 ${p.aktiv ? 'border-rose-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{p.bezeichnung}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.aktiv ? 'Aktiv' : 'Inaktiv'}</span>
              </div>
              {p.ziel_nrs !== undefined && <p className="text-sm text-gray-600 mb-2">🎯 Ziel: NRS ≤ {p.ziel_nrs}</p>}
              {p.medikamente?.length ? (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">MEDIKAMENTE</p>
                  {p.medikamente.map((m, i) => (
                    <div key={i} className="text-sm text-gray-700">💊 {m.name} {m.dosis} – {m.zeitpunkt}</div>
                  ))}
                </div>
              ) : null}
              {p.nicht_medikamentoes?.length ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">NICHT-MEDIKAMENTÖSE MAßNAHMEN</p>
                  {p.nicht_medikamentoes.map((m, i) => <div key={i} className="text-sm text-gray-700">• {m}</div>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Analyse */}
      {activeTab === 3 && (
        <div className="space-y-4">
          {eintraege.length === 0 ? (
            <div className="text-center text-gray-400 py-12">Noch keine Daten für Analyse</div>
          ) : (
            <>
              {/* Statistiken */}
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const nrsEintraege = eintraege.filter(e => e.nrs_wert !== undefined && e.nrs_wert !== null)
                  const besdEintraege = eintraege.filter(e => e.besd_gesamt !== undefined && e.besd_gesamt !== null)
                  const nrsDurchschnitt = nrsEintraege.length ? (nrsEintraege.reduce((s, e) => s + e.nrs_wert!, 0) / nrsEintraege.length).toFixed(1) : '-'
                  const nrsMax = nrsEintraege.length ? Math.max(...nrsEintraege.map(e => e.nrs_wert!)) : '-'
                  return (
                    <>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">NRS Ø</p>
                        <p className="text-3xl font-bold text-rose-500">{nrsDurchschnitt}</p>
                        <p className="text-xs text-gray-400 mt-1">{nrsEintraege.length} Messungen</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">NRS Max</p>
                        <p className="text-3xl font-bold text-orange-500">{nrsMax}</p>
                        <p className="text-xs text-gray-400 mt-1">Höchster Wert</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">BESD Einträge</p>
                        <p className="text-3xl font-bold text-purple-500">{besdEintraege.length}</p>
                        <p className="text-xs text-gray-400 mt-1">Demenz-Beobachtungen</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Medikation</p>
                        <p className="text-3xl font-bold text-blue-500">{eintraege.filter(e => e.medikament_gegeben).length}</p>
                        <p className="text-xs text-gray-400 mt-1">Verabreichungen</p>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Verlaufsdiagramm NRS */}
              {eintraege.filter(e => e.nrs_wert !== undefined && e.nrs_wert !== null).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">NRS-Verlauf (letzte Einträge)</h3>
                  <div className="space-y-2">
                    {[...eintraege].filter(e => e.nrs_wert !== undefined && e.nrs_wert !== null).slice(0, 10).reverse().map(e => {
                      const bew = nrsBewertung(e.nrs_wert!)
                      const pct = (e.nrs_wert! / 10) * 100
                      return (
                        <div key={e.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-20 flex-shrink-0">{e.erfasst_am ? new Date(e.erfasst_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                            <div className={`h-5 rounded-full transition-all ${e.nrs_wert! <= 3 ? 'bg-green-400' : e.nrs_wert! <= 6 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-6 text-right ${bew.farbe}`}>{e.nrs_wert}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Häufigste Lokalisation */}
              {(() => {
                const lokCount: Record<string, number> = {}
                eintraege.forEach(e => e.lokalisation?.forEach(l => { lokCount[l] = (lokCount[l] || 0) + 1 }))
                const sorted = Object.entries(lokCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
                if (!sorted.length) return null
                return (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Häufigste Schmerzstellen</h3>
                    {sorted.map(([lok, count]) => (
                      <div key={lok} className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-gray-700 w-32">{lok}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div className="bg-blue-400 h-3 rounded-full" style={{ width: `${(count / (sorted[0][1] || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-6 text-right">{count}×</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
