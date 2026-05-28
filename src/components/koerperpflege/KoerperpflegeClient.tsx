'use client'

import { useState, useEffect, useCallback } from 'react'
import { ADL_FELDER, SELBSTAENDIGKEIT, KOERPERPFLEGE_ARTEN, HAUTZUSTAND_OPTIONEN, KOOPERATION_OPTIONEN, adlDurchschnitt, type KoerperpflegeEintrag } from '@/lib/koerperpflege/protokoll'

export default function KoerperpflegeClient() {
  const [activeTab, setActiveTab] = useState(0)
  const [eintraege, setEintraege] = useState<KoerperpflegeEintrag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Formular
  const [adlWerte, setAdlWerte] = useState<Record<string, number>>({})
  const [koerperpflegeArt, setKoerperpflegeArt] = useState('')
  const [zahnprothese, setZahnprothese] = useState(false)
  const [nagelpflege, setNagelpflege] = useState(false)
  const [hautpflege, setHautpflege] = useState(false)
  const [hautpflegeMittel, setHautpflegeMittel] = useState('')
  const [hautzustand, setHautzustand] = useState('')
  const [druckstellen, setDruckstellen] = useState(false)
  const [druckstellenLokalisation, setDruckstellenLokalisation] = useState('')
  const [inkontinenz, setInkontinenz] = useState(false)
  const [inkontinenzArt, setInkontinenzArt] = useState('')
  const [kooperation, setKooperation] = useState('Gut')
  const [dauerMin, setDauerMin] = useState<number | ''>('')
  const [besonderheiten, setBesonderheiten] = useState('')
  const [durchgefuehrtVon, setDurchgefuehrtVon] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/koerperpflege?limit=30')
      if (res.ok) setEintraege(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const setAdl = (key: string, val: number) => setAdlWerte(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const body: KoerperpflegeEintrag = {
      ...adlWerte,
      koerperwaesche_art: koerperpflegeArt || undefined,
      zahnprothese,
      zahnprothese_pflege: zahnprothese ? (adlWerte['zahnprothese_pflege'] ?? 0) : undefined,
      nagelpflege,
      hautpflege,
      hautpflege_mittel: hautpflege ? hautpflegeMittel : undefined,
      hautzustand: hautzustand || undefined,
      druckstellen,
      druckstellen_lokalisation: druckstellen && druckstellenLokalisation ? [druckstellenLokalisation] : undefined,
      inkontinenzversorgung: inkontinenz,
      inkontinenzversorgung_art: inkontinenz ? inkontinenzArt : undefined,
      kooperation,
      dauer_min: dauerMin !== '' ? Number(dauerMin) : undefined,
      besonderheiten: besonderheiten || undefined,
      durchgefuehrt_von: durchgefuehrtVon || undefined,
    }
    try {
      const res = await fetch('/api/koerperpflege', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setMsg('✅ Eintrag gespeichert')
        loadData()
        setAdlWerte({})
        setKoerperpflegeArt('')
        setZahnprothese(false)
        setNagelpflege(false)
        setHautpflege(false)
        setHautpflegeMittel('')
        setHautzustand('')
        setDruckstellen(false)
        setDruckstellenLokalisation('')
        setInkontinenz(false)
        setInkontinenzArt('')
        setDauerMin('')
        setBesonderheiten('')
      } else setMsg('❌ Fehler beim Speichern')
    } catch { setMsg('❌ Netzwerkfehler') }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    await fetch(`/api/koerperpflege?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const tabs = ['📋 Erfassen', '📅 Verlauf', '📊 Auswertung']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" /></div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-gray-900">🚿 Körperpflege & Hygiene</h1>
        <p className="text-gray-500 text-sm mt-1">ADL-Dokumentation · Selbständigkeitsgrade · Hautpflege</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${activeTab === i ? 'bg-white shadow text-sky-600' : 'text-gray-600 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 0: Erfassen */}
      {activeTab === 0 && (
        <div className="space-y-4">
          {/* ADL-Felder */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Selbständigkeitsgrade (ADL)</h2>
            <div className="space-y-4">
              {ADL_FELDER.map(feld => (
                <div key={feld.key}>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">{feld.icon} {feld.label}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map(grad => {
                      const info = SELBSTAENDIGKEIT[grad]
                      return (
                        <button key={grad} onClick={() => setAdl(feld.key, grad)}
                          className={`py-2 rounded-lg border text-xs text-center transition-all ${adlWerte[feld.key] === grad ? 'border-sky-500 bg-sky-50 font-semibold text-sky-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <span className="font-bold block">{grad}</span>
                          <span className="hidden sm:block">{info.short}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">0 = Selbständig · 1 = Überwiegend selbständig · 2 = Überwiegend unselbständig · 3 = Vollständig unselbständig</p>
            </div>
          </div>

          {/* Art der Körperpflege */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Art der Körperpflege</h2>
            <div className="flex flex-wrap gap-2">
              {KOERPERPFLEGE_ARTEN.map(art => (
                <button key={art} onClick={() => setKoerperpflegeArt(art === koerperpflegeArt ? '' : art)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${koerperpflegeArt === art ? 'bg-sky-100 text-sky-700 border border-sky-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {art}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={zahnprothese} onChange={e => setZahnprothese(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Zahnprothese vorhanden</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={nagelpflege} onChange={e => setNagelpflege(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Nagelpflege durchgeführt</span>
              </label>
            </div>
          </div>

          {/* Haut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Hautzustand & Hautpflege</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {HAUTZUSTAND_OPTIONEN.map(z => (
                <button key={z} onClick={() => setHautzustand(z === hautzustand ? '' : z)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${hautzustand === z ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {z}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hautpflege} onChange={e => setHautpflege(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Hautpflege durchgeführt</span>
              </label>
              {hautpflege && (
                <input value={hautpflegeMittel} onChange={e => setHautpflegeMittel(e.target.value)}
                  placeholder="Verwendetes Mittel (z.B. Feuchtigkeitscreme)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none" />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={druckstellen} onChange={e => setDruckstellen(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Druckstellen vorhanden</span>
              </label>
              {druckstellen && (
                <input value={druckstellenLokalisation} onChange={e => setDruckstellenLokalisation(e.target.value)}
                  placeholder="Lokalisation (z.B. Steißbein, Ferse)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none" />
              )}
            </div>
          </div>

          {/* Inkontinenz + Kooperation + Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Sonstiges</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inkontinenz} onChange={e => setInkontinenz(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Inkontinenzversorgung</span>
              </label>
              {inkontinenz && (
                <input value={inkontinenzArt} onChange={e => setInkontinenzArt(e.target.value)}
                  placeholder="Art (Einlage, Pants, Katheter)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none" />
              )}
              <div>
                <label className="text-xs text-gray-500">Kooperation</label>
                <div className="flex gap-2 mt-1">
                  {KOOPERATION_OPTIONEN.map(k => (
                    <button key={k.value} onClick={() => setKooperation(k.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${kooperation === k.value ? k.farbe + ' font-semibold border' : 'bg-gray-100 text-gray-600'}`}>
                      {k.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Dauer (Min.)</label>
                  <input type="number" value={dauerMin} onChange={e => setDauerMin(e.target.value === '' ? '' : Number(e.target.value))} min={1}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none mt-1" placeholder="z.B. 20" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Durchgeführt von</label>
                  <input value={durchgefuehrtVon} onChange={e => setDurchgefuehrtVon(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none mt-1" placeholder="Name / Kürzel" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Besonderheiten</label>
                <textarea value={besonderheiten} onChange={e => setBesonderheiten(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none mt-1 resize-none"
                  placeholder="Auffälligkeiten, Maßnahmen…" />
              </div>
            </div>
          </div>

          {msg && <div className={`rounded-lg p-3 text-sm text-center ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Wird gespeichert…' : '💾 Eintrag speichern'}
          </button>
        </div>
      )}

      {/* Tab 1: Verlauf */}
      {activeTab === 1 && (
        <div className="space-y-3">
          {eintraege.length === 0 && <div className="text-center text-gray-400 py-12">Noch keine Einträge</div>}
          {eintraege.map(e => {
            const avg = adlDurchschnitt(e)
            const avgInfo = avg !== null ? SELBSTAENDIGKEIT[Math.round(avg)] : null
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-400">{e.uhrzeit ? new Date(e.uhrzeit).toLocaleString('de-DE') : e.datum}</p>
                      {e.koerperwaesche_art && <span className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">{e.koerperwaesche_art}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                      {ADL_FELDER.map(f => {
                        const v = (e as Record<string, unknown>)[f.key] as number | undefined
                        if (v === undefined || v === null) return null
                        const info = SELBSTAENDIGKEIT[v]
                        return (
                          <div key={f.key} className="flex items-center gap-1">
                            <span className="text-xs">{f.icon}</span>
                            <span className="text-xs text-gray-600">{f.label.split(' ')[0]}</span>
                            <span className={`text-xs font-semibold ml-auto ${info.farbe}`}>{info.short}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {avgInfo && <span className={`text-xs font-medium ${avgInfo.farbe}`}>Ø {avgInfo.label}</span>}
                      {e.kooperation && <span className="text-xs text-gray-500">Kooperation: {e.kooperation}</span>}
                      {e.druckstellen && <span className="text-xs text-orange-500">⚠️ Druckstellen</span>}
                      {e.durchgefuehrt_von && <span className="text-xs text-gray-400">von {e.durchgefuehrt_von}</span>}
                    </div>
                    {e.besonderheiten && <p className="text-xs text-gray-500 mt-1 italic">{e.besonderheiten}</p>}
                  </div>
                  <button onClick={() => handleDelete(e.id!)} className="text-gray-300 hover:text-red-400 transition-colors ml-2 text-sm">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 2: Auswertung */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {eintraege.length === 0 ? (
            <div className="text-center text-gray-400 py-12">Noch keine Daten</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Einträge gesamt</p>
                  <p className="text-3xl font-bold text-sky-500">{eintraege.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Druckstellen-Einträge</p>
                  <p className="text-3xl font-bold text-orange-500">{eintraege.filter(e => e.druckstellen).length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4">ADL-Selbständigkeit (letzte 7 Einträge)</h3>
                {ADL_FELDER.map(feld => {
                  const werte = eintraege.slice(0, 7).map(e => (e as Record<string, unknown>)[feld.key] as number | undefined).filter(v => v !== undefined) as number[]
                  if (!werte.length) return null
                  const avg = werte.reduce((a, b) => a + b, 0) / werte.length
                  const pct = (avg / 3) * 100
                  const color = avg <= 1 ? 'bg-green-400' : avg <= 2 ? 'bg-yellow-400' : 'bg-red-400'
                  return (
                    <div key={feld.key} className="flex items-center gap-2 mb-2">
                      <span className="text-sm w-28">{feld.icon} {feld.label.split(' ')[0]}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div className={`h-4 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-8 text-right">{avg.toFixed(1)}</span>
                    </div>
                  )
                })}
                <p className="text-xs text-gray-400 mt-2 text-center">0 = Selbständig · 3 = Vollständig unselbständig</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Kooperation (letzte Einträge)</h3>
                {(() => {
                  const counts: Record<string, number> = {}
                  eintraege.slice(0, 10).forEach(e => { if (e.kooperation) counts[e.kooperation] = (counts[e.kooperation] || 0) + 1 })
                  const total = Object.values(counts).reduce((a, b) => a + b, 0)
                  return Object.entries(counts).map(([k, v]) => {
                    const opt = KOOPERATION_OPTIONEN.find(o => o.value === k)
                    return (
                      <div key={k} className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${opt?.farbe || ''}`}>{k}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3">
                          <div className="bg-sky-400 h-3 rounded-full" style={{ width: `${(v / total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round((v / total) * 100)}%</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
