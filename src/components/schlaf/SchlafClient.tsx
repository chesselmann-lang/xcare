'use client'

import { useState, useEffect, useCallback } from 'react'
import { AUFWACHGRUENDE, EINSCHLAFHILFEN, SCHLAFQUALITAET_LABEL, formatDauer, schlafBewertung, type SchlafEintrag, type SchlafZiel } from '@/lib/schlaf/protokoll'

export default function SchlafClient() {
  const [activeTab, setActiveTab] = useState(0)
  const [eintraege, setEintraege] = useState<SchlafEintrag[]>([])
  const [ziel, setZiel] = useState<SchlafZiel>({ ziel_schlafdauer_h: 7, max_aufwachzeiten: 2 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Formular
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [schlafbeginn, setSchlafbeginn] = useState('')
  const [schlafende, setSchlafende] = useState('')
  const [einschlafzeitMin, setEinschlafzeitMin] = useState<number | ''>('')
  const [aufwachzeiten, setAufwachzeiten] = useState(0)
  const [aufwachgruende, setAufwachgruende] = useState<string[]>([])
  const [schlafqualitaet, setSchlafqualitaet] = useState(3)
  const [tagschlafdauerMin, setTagschlafdauerMin] = useState<number | ''>('')
  const [nachtunruhe, setNachtunruhe] = useState(false)
  const [nachtunruheBeschr, setNachtunruheBeschr] = useState('')
  const [albtraeume, setAlbtraeume] = useState(false)
  const [atemaussetzer, setAtemaussetzer] = useState(false)
  const [schmerzenNacht, setSchmerzenNacht] = useState(false)
  const [toilettengangNacht, setToilettengangNacht] = useState(0)
  const [schlafmittel, setSchlafmittel] = useState(false)
  const [schlafmittelName, setSchlafmittelName] = useState('')
  const [einschlafhilfen, setEinschlafhilfen] = useState<string[]>([])
  const [massnahmen, setMassnahmen] = useState('')
  const [beobachtetVon, setBeobachtetVon] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [eRes, zRes] = await Promise.all([
        fetch('/api/schlaf?limit=30'),
        fetch('/api/schlaf/ziele'),
      ])
      if (eRes.ok) setEintraege(await eRes.json())
      if (zRes.ok) { const z = await zRes.json(); if (z?.id) setZiel(z) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  // Berechne Schlafdauer aus Zeiteingaben
  function berechneDauer(): number | null {
    if (!schlafbeginn || !schlafende) return null
    const [bH, bM] = schlafbeginn.split(':').map(Number)
    const [eH, eM] = schlafende.split(':').map(Number)
    let diff = (eH * 60 + eM) - (bH * 60 + bM)
    if (diff < 0) diff += 24 * 60
    return diff
  }

  const dauer = berechneDauer()

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const today = datum || new Date().toISOString().split('T')[0]
    const body: SchlafEintrag = {
      datum: today,
      schlafbeginn: schlafbeginn ? `${today}T${schlafbeginn}:00` : undefined,
      schlafende: schlafende ? `${today}T${schlafende}:00` : undefined,
      einschlafzeit_min: einschlafzeitMin !== '' ? Number(einschlafzeitMin) : undefined,
      aufwachzeiten,
      aufwachgruende: aufwachgruende.length ? aufwachgruende : undefined,
      schlafqualitaet,
      tagschlafdauer_min: tagschlafdauerMin !== '' ? Number(tagschlafdauerMin) : undefined,
      nachtunruhe,
      nachtunruhe_beschreibung: nachtunruhe ? nachtunruheBeschr : undefined,
      albtraeume,
      atemaussetzer,
      schmerzen_nacht: schmerzenNacht,
      toilettengang_nacht: toilettengangNacht,
      schlafmittel_gegeben: schlafmittel,
      schlafmittel_name: schlafmittel ? schlafmittelName : undefined,
      einschlafhilfen: einschlafhilfen.length ? einschlafhilfen : undefined,
      gesamtschlaf_ausreichend: dauer !== null ? dauer >= (ziel.ziel_schlafdauer_h ?? 7) * 60 - 30 : undefined,
      massnahmen: massnahmen || undefined,
      beobachtet_von: beobachtetVon || undefined,
    }
    try {
      const res = await fetch('/api/schlaf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setMsg('✅ Schlafprotokoll gespeichert')
        loadData()
        setSchlafbeginn(''); setSchlafende(''); setEinschlafzeitMin('')
        setAufwachzeiten(0); setAufwachgruende([]); setSchlafqualitaet(3)
        setTagschlafdauerMin(''); setNachtunruhe(false); setNachtunruheBeschr('')
        setAlbtraeume(false); setAtemaussetzer(false); setSchmerzenNacht(false)
        setToilettengangNacht(0); setSchlafmittel(false); setSchlafmittelName('')
        setEinschlafhilfen([]); setMassnahmen(''); setBeobachtetVon('')
      } else setMsg('❌ Fehler beim Speichern')
    } catch { setMsg('❌ Netzwerkfehler') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/schlaf?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const tabs = ['🌙 Erfassen', '📋 Verlauf', '📊 Analyse']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-gray-900">🌙 Schlaf- & Ruheprotokoll</h1>
        <p className="text-gray-500 text-sm mt-1">Schlaftagebuch · Qualität · Nachtunruhe · Auswertung</p>
      </div>

      {/* Schlafdauer-Anzeige */}
      {dauer !== null && (
        <div className={`rounded-xl p-4 text-center ${schlafBewertung(dauer, ziel.ziel_schlafdauer_h).status === 'ausreichend' ? 'bg-green-50 border border-green-200' : schlafBewertung(dauer, ziel.ziel_schlafdauer_h).status === 'zu_wenig' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
          <p className="text-3xl font-bold text-gray-800">{formatDauer(dauer)}</p>
          <p className="text-sm text-gray-600 mt-0.5">{schlafBewertung(dauer, ziel.ziel_schlafdauer_h).label} · Ziel: {ziel.ziel_schlafdauer_h}h</p>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${activeTab === i ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Erfassen */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* Schlafzeiten */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schlafzeiten</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Datum</label>
                <input type="date" value={datum} onChange={e => setDatum(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">🌙 Schlafbeginn</label>
                <input type="time" value={schlafbeginn} onChange={e => setSchlafbeginn(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">☀️ Aufwachen</label>
                <input type="time" value={schlafende} onChange={e => setSchlafende(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500">Einschlafdauer (Min.)</label>
                <input type="number" value={einschlafzeitMin} onChange={e => setEinschlafzeitMin(e.target.value === '' ? '' : Number(e.target.value))} min={0} max={180}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" placeholder="z.B. 15" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tagschlaf (Min.)</label>
                <input type="number" value={tagschlafdauerMin} onChange={e => setTagschlafdauerMin(e.target.value === '' ? '' : Number(e.target.value))} min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" placeholder="z.B. 30" />
              </div>
            </div>
          </div>

          {/* Schlafqualität */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schlafqualität</h2>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(q => {
                const info = SCHLAFQUALITAET_LABEL[q]
                return (
                  <button key={q} onClick={() => setSchlafqualitaet(q)}
                    className={`py-3 rounded-xl border-2 text-center transition-all ${schlafqualitaet === q ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-2xl block">{info.emoji}</span>
                    <span className={`text-xs font-medium mt-1 block ${info.farbe}`}>{q}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-indigo-600 font-medium mt-2">{SCHLAFQUALITAET_LABEL[schlafqualitaet].label}</p>
          </div>

          {/* Unterbrechungen */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schlafunterbrechungen</h2>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-gray-700">Aufwachzeiten:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setAufwachzeiten(Math.max(0, aufwachzeiten - 1))} className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold">−</button>
                <span className="text-xl font-bold w-8 text-center">{aufwachzeiten}</span>
                <button onClick={() => setAufwachzeiten(aufwachzeiten + 1)} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold">+</button>
              </div>
            </div>
            {aufwachzeiten > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Aufwachgründe</p>
                <div className="flex flex-wrap gap-2">
                  {AUFWACHGRUENDE.map(g => (
                    <button key={g} onClick={() => toggleArr(aufwachgruende, setAufwachgruende, g)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${aufwachgruende.includes(g) ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Symptome */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Nachtliche Symptome</h2>
            <div className="space-y-2">
              {[
                { state: nachtunruhe, setState: setNachtunruhe, label: 'Nachtunruhe / Agitiertheit' },
                { state: albtraeume, setState: setAlbtraeume, label: 'Albträume' },
                { state: atemaussetzer, setState: setAtemaussetzer, label: 'Atemaussetzer beobachtet' },
                { state: schmerzenNacht, setState: setSchmerzenNacht, label: 'Schmerzen in der Nacht' },
              ].map(item => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={item.state} onChange={e => item.setState(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
              {nachtunruhe && (
                <input value={nachtunruheBeschr} onChange={e => setNachtunruheBeschr(e.target.value)}
                  placeholder="Beschreibung der Nachtunruhe"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm text-gray-700">Toilettengänge nachts:</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setToilettengangNacht(Math.max(0, toilettengangNacht - 1))} className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold text-sm">−</button>
                  <span className="font-bold w-6 text-center">{toilettengangNacht}</span>
                  <button onClick={() => setToilettengangNacht(toilettengangNacht + 1)} className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Maßnahmen */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Schlafhilfen & Maßnahmen</h2>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={schlafmittel} onChange={e => setSchlafmittel(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Schlafmittel gegeben</span>
            </label>
            {schlafmittel && (
              <input value={schlafmittelName} onChange={e => setSchlafmittelName(e.target.value)}
                placeholder="Medikament / Dosis" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
            )}
            <p className="text-xs text-gray-500 mb-2">Nicht-medikamentöse Schlafhilfen</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {EINSCHLAFHILFEN.map(h => (
                <button key={h} onClick={() => toggleArr(einschlafhilfen, setEinschlafhilfen, h)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${einschlafhilfen.includes(h) ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {h}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Maßnahmen / Notizen</label>
                <textarea value={massnahmen} onChange={e => setMassnahmen(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1 resize-none" placeholder="Besonderheiten…" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Beobachtet von</label>
                <input value={beobachtetVon} onChange={e => setBeobachtetVon(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none mt-1" placeholder="Name / Kürzel" />
              </div>
            </div>
          </div>

          {msg && <div className={`rounded-lg p-3 text-sm text-center ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Wird gespeichert…' : '💾 Schlafprotokoll speichern'}
          </button>
        </div>
      )}

      {/* Tab 1: Verlauf */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {eintraege.length === 0 && <div className="text-center text-gray-400 py-12">Noch keine Einträge</div>}
          {eintraege.map(e => {
            const ql = e.schlafqualitaet ? SCHLAFQUALITAET_LABEL[e.schlafqualitaet] : null
            const bew = e.schlafdauer_min ? schlafBewertung(e.schlafdauer_min, ziel.ziel_schlafdauer_h) : null
            return (
              <div key={e.id} className={`bg-white rounded-xl border shadow-sm p-4 ${bew?.status === 'zu_wenig' ? 'border-l-4 border-l-orange-400' : bew?.status === 'ausreichend' ? 'border-l-4 border-l-green-400' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{e.datum ? new Date(e.datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''}</p>
                      {e.schlafdauer_min ? <span className="text-sm font-bold text-indigo-600">{formatDauer(e.schlafdauer_min)}</span> : null}
                      {ql && <span className="text-lg">{ql.emoji}</span>}
                      {bew && <span className={`text-xs ${bew.status === 'ausreichend' ? 'text-green-600' : 'text-orange-600'}`}>{bew.label}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {e.schlafbeginn && e.schlafende && <span>🌙 {new Date(e.schlafbeginn).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ☀️ {new Date(e.schlafende).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>}
                      {e.aufwachzeiten !== undefined && e.aufwachzeiten > 0 && <span>↑ {e.aufwachzeiten}× aufgewacht</span>}
                      {e.nachtunruhe && <span className="text-orange-500">⚠️ Nachtunruhe</span>}
                      {e.atemaussetzer && <span className="text-red-500">⚠️ Atemaussetzer</span>}
                      {e.beobachtet_von && <span>von {e.beobachtet_von}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(e.id!)} className="text-gray-300 hover:text-red-400 transition-colors ml-2 text-sm">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 2: Analyse */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {eintraege.length === 0 ? (
            <div className="text-center text-gray-400 py-12">Noch keine Daten</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const mitDauer = eintraege.filter(e => e.schlafdauer_min)
                  const avgDauer = mitDauer.length ? Math.round(mitDauer.reduce((s, e) => s + e.schlafdauer_min!, 0) / mitDauer.length) : 0
                  const avgQual = eintraege.filter(e => e.schlafqualitaet).length ? (eintraege.filter(e => e.schlafqualitaet).reduce((s, e) => s + e.schlafqualitaet!, 0) / eintraege.filter(e => e.schlafqualitaet).length).toFixed(1) : '-'
                  return (
                    <>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Ø Schlafdauer</p>
                        <p className="text-2xl font-bold text-indigo-500">{avgDauer ? formatDauer(avgDauer) : '-'}</p>
                        <p className="text-xs text-gray-400 mt-1">Ziel: {ziel.ziel_schlafdauer_h}h</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Ø Schlafqualität</p>
                        <p className="text-2xl font-bold text-indigo-500">{avgQual}<span className="text-sm text-gray-400">/5</span></p>
                        <p className="text-xs text-gray-400 mt-1">{eintraege.filter(e => e.schlafqualitaet).length} Einträge</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Nachtunruhe</p>
                        <p className="text-2xl font-bold text-orange-500">{eintraege.filter(e => e.nachtunruhe).length}</p>
                        <p className="text-xs text-gray-400 mt-1">Nächte</p>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Ausreichend geschlafen</p>
                        <p className="text-2xl font-bold text-green-500">{eintraege.filter(e => e.gesamtschlaf_ausreichend).length}</p>
                        <p className="text-xs text-gray-400 mt-1">von {eintraege.length} Nächten</p>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Schlafdauer-Verlauf</h3>
                {eintraege.filter(e => e.schlafdauer_min).slice(0, 10).reverse().map(e => {
                  const pct = Math.min((e.schlafdauer_min! / (10 * 60)) * 100, 100)
                  const zielPct = Math.min(((ziel.ziel_schlafdauer_h ?? 7) * 60 / (10 * 60)) * 100, 100)
                  const gut = e.schlafdauer_min! >= (ziel.ziel_schlafdauer_h ?? 7) * 60 - 30
                  return (
                    <div key={e.id} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400 w-16">{e.datum ? new Date(e.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                        <div className={`h-4 rounded-full ${gut ? 'bg-indigo-400' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
                        <div className="absolute top-0 h-4 w-0.5 bg-green-500 opacity-60" style={{ left: `${zielPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">{e.schlafdauer_min ? formatDauer(e.schlafdauer_min) : ''}</span>
                    </div>
                  )
                })}
                <p className="text-xs text-gray-400 text-center mt-2">Grüne Linie = Schlafziel</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
