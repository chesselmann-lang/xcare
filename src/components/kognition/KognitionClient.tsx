'use client'

import { useState, useEffect, useCallback } from 'react'
import { mmseEinstufung, orientierungsScore, BPSD_ITEMS, AKTIVITAET_KATEGORIEN, AKTIVITAET_VORSCHLAEGE } from '@/lib/kognition/aktivierung'

// ── Types ────────────────────────────────────────────────────────────────────
interface Assessment {
  id: string
  created_at: string
  orientierung_zeit: number
  orientierung_ort: number
  orientierung_person: number
  orientierung_situation: number
  mmse_score: number | null
  bpsd_agitation: boolean
  bpsd_aggression: boolean
  bpsd_depression: boolean
  bpsd_angst: boolean
  bpsd_halluzinationen: boolean
  bpsd_wahnvorstellungen: boolean
  bpsd_apathie: boolean
  bpsd_enthemmung: boolean
  bpsd_weglauftendenz: boolean
  bpsd_beschreibung: string | null
  kommunikation: string | null
  verstaendnis: string | null
  stimmung: string | null
  tagesform: string | null
  bemerkungen: string | null
  beurteilt_von: string | null
}

interface Aktivierung {
  id: string
  created_at: string
  aktivitaet: string
  kategorie: string | null
  dauer_min: number | null
  teilnahme: string | null
  reaktion: string | null
  besonderheiten: string | null
  durchgefuehrt_von: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────
const KOMMUNIKATION_OPTIONS = ['Gut', 'Eingeschränkt', 'Nonverbal', 'Kaum möglich']
const VERSTAENDNIS_OPTIONS = ['Vollständig', 'Überwiegend', 'Teilweise', 'Kaum']
const STIMMUNG_OPTIONS = ['Ausgeglichen', 'Fröhlich', 'Traurig', 'Ängstlich', 'Agitiert', 'Apathisch']
const TAGESFORM_OPTIONS = ['Sehr gut', 'Gut', 'Mittelmäßig', 'Schlecht', 'Sehr schlecht']
const TEILNAHME_OPTIONS = ['Aktiv', 'Passiv', 'Ablehnend', 'Wechselnd']
const REAKTION_OPTIONS = ['Sehr positiv', 'Positiv', 'Neutral', 'Negativ']

const ORIENTIERUNG_LABELS = [
  { key: 'orientierung_zeit', label: 'Zeit', sub: 'Tag, Datum, Monat, Jahr' },
  { key: 'orientierung_ort', label: 'Ort', sub: 'Wo befinde ich mich?' },
  { key: 'orientierung_person', label: 'Person', sub: 'Wer bin ich? Wer sind Sie?' },
  { key: 'orientierung_situation', label: 'Situation', sub: 'Was geschieht gerade?' },
]

const ORIENT_STUFEN = [
  { val: 2, label: 'Orientiert', color: '#22c55e' },
  { val: 1, label: 'Teilweise', color: '#f59e0b' },
  { val: 0, label: 'Desorientiert', color: '#ef4444' },
]

// ── Helper ────────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, '0') }
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function MmseBar({ score }: { score: number }) {
  const pct = (score / 30) * 100
  const { label, farbe } = mmseEinstufung(score)
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontWeight:600 }}>MMSE: {score}/30</span>
        <span style={{ color: farbe, fontWeight:600 }}>{label}</span>
      </div>
      <div style={{ height:12, background:'#e5e7eb', borderRadius:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background: farbe, borderRadius:6, transition:'width 0.3s' }}/>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function KognitionClient() {
  const [tab, setTab] = useState<'assessment'|'aktivierung'|'verlauf'|'analyse'>('assessment')

  // Assessment form state
  const [orientierung, setOrientierung] = useState({ zeit: 2, ort: 2, person: 2, situation: 2 })
  const [mmseScore, setMmseScore] = useState(27)
  const [mmseEingabe, setMmseEingabe] = useState(true)
  const [bpsd, setBpsd] = useState<Record<string, boolean>>({})
  const [bpsdBeschreibung, setBpsdBeschreibung] = useState('')
  const [kommunikation, setKommunikation] = useState('')
  const [verstaendnis, setVerstaendnis] = useState('')
  const [stimmung, setStimmung] = useState('')
  const [tagesform, setTagesform] = useState('')
  const [bemerkungen, setBemerkungen] = useState('')
  const [beurteiltVon, setBeurteiltVon] = useState('')
  const [savingA, setSavingA] = useState(false)
  const [msgA, setMsgA] = useState('')

  // Aktivierung form state
  const [aktivitaet, setAktivitaet] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [dauerMin, setDauerMin] = useState(30)
  const [teilnahme, setTeilnahme] = useState('')
  const [reaktion, setReaktion] = useState('')
  const [besonderheiten, setBesonderheiten] = useState('')
  const [durchgefuehrtVon, setDurchgefuehrtVon] = useState('')
  const [savingB, setSavingB] = useState(false)
  const [msgB, setMsgB] = useState('')

  // Data
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [aktivierungen, setAktivierungen] = useState<Aktivierung[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ra, rb] = await Promise.all([
        fetch('/api/kognition'),
        fetch('/api/aktivierung'),
      ])
      if (ra.ok) setAssessments(await ra.json())
      if (rb.ok) setAktivierungen(await rb.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Save Assessment ─────────────────────────────────────────────────────────
  async function saveAssessment() {
    setSavingA(true); setMsgA('')
    try {
      const body = {
        orientierung_zeit: orientierung.zeit,
        orientierung_ort: orientierung.ort,
        orientierung_person: orientierung.person,
        orientierung_situation: orientierung.situation,
        mmse_score: mmseEingabe ? mmseScore : null,
        ...Object.fromEntries(BPSD_ITEMS.map(b => [`bpsd_${b.key}`, !!bpsd[b.key]])),
        bpsd_beschreibung: bpsdBeschreibung || null,
        kommunikation: kommunikation || null,
        verstaendnis: verstaendnis || null,
        stimmung: stimmung || null,
        tagesform: tagesform || null,
        bemerkungen: bemerkungen || null,
        beurteilt_von: beurteiltVon || null,
      }
      const r = await fetch('/api/kognition', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (r.ok) {
        setMsgA('✓ Assessment gespeichert')
        setOrientierung({ zeit:2, ort:2, person:2, situation:2 })
        setMmseScore(27); setBpsd({}); setBpsdBeschreibung('')
        setKommunikation(''); setVerstaendnis(''); setStimmung(''); setTagesform('')
        setBemerkungen(''); setBeurteiltVon('')
        loadData()
      } else { setMsgA('Fehler beim Speichern') }
    } finally { setSavingA(false) }
  }

  // ── Save Aktivierung ────────────────────────────────────────────────────────
  async function saveAktivierung() {
    if (!aktivitaet.trim()) return
    setSavingB(true); setMsgB('')
    try {
      const body = {
        aktivitaet: aktivitaet.trim(),
        kategorie: kategorie || null,
        dauer_min: dauerMin,
        teilnahme: teilnahme || null,
        reaktion: reaktion || null,
        besonderheiten: besonderheiten || null,
        durchgefuehrt_von: durchgefuehrtVon || null,
      }
      const r = await fetch('/api/aktivierung', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (r.ok) {
        setMsgB('✓ Aktivität gespeichert')
        setAktivitaet(''); setKategorie(''); setDauerMin(30)
        setTeilnahme(''); setReaktion(''); setBesonderheiten(''); setDurchgefuehrtVon('')
        loadData()
      } else { setMsgB('Fehler beim Speichern') }
    } finally { setSavingB(false) }
  }

  // ── Analyse Computations ─────────────────────────────────────────────────────
  const bpsdFreq = BPSD_ITEMS.map(b => ({
    label: b.label,
    count: assessments.filter(a => (a as any)[`bpsd_${b.key}`]).length,
  })).sort((x,y) => y.count - x.count)

  const katFreq = AKTIVITAET_KATEGORIEN.map(k => ({
    ...k,
    count: aktivierungen.filter(a => a.kategorie === k.key).length,
  })).filter(k => k.count > 0).sort((x,y) => y.count - x.count)

  const maxBpsd = Math.max(...bpsdFreq.map(b => b.count), 1)
  const maxKat = Math.max(...katFreq.map(k => k.count), 1)

  // Verlauf combined
  type VerlaufItem = { ts: string; type: 'assessment'|'aktivierung'; data: Assessment|Aktivierung }
  const verlaufItems: VerlaufItem[] = [
    ...assessments.map(a => ({ ts: a.created_at, type: 'assessment' as const, data: a })),
    ...aktivierungen.map(a => ({ ts: a.created_at, type: 'aktivierung' as const, data: a })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 30)

  // ── Render ───────────────────────────────────────────────────────────────────
  const activeOrientScore = orientierungsScore({
    orientierung_zeit: orientierung.zeit,
    orientierung_ort: orientierung.ort,
    orientierung_person: orientierung.person,
    orientierung_situation: orientierung.situation,
  } as any)

  const hasBpsd = Object.values(bpsd).some(Boolean)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', maxWidth:800, margin:'0 auto', padding:'0 16px 32px' }}>
      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'2px solid #e5e7eb', paddingBottom:0 }}>
        {([['assessment','🧠 Assessment'],['aktivierung','🎯 Aktivierung'],['verlauf','📋 Verlauf'],['analyse','📊 Analyse']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:'10px 16px', border:'none', background:'none', cursor:'pointer',
            borderBottom: tab===k ? '2px solid #6366f1' : '2px solid transparent',
            color: tab===k ? '#6366f1' : '#6b7280', fontWeight: tab===k ? 600 : 400,
            marginBottom:-2, fontSize:14,
          }}>{l}</button>
        ))}
      </div>

      {/* ── TAB 1: ASSESSMENT ──────────────────────────────────────────────── */}
      {tab === 'assessment' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Live Orientierungs-Score */}
          <div style={{
            background: activeOrientScore >= 7 ? '#f0fdf4' : activeOrientScore >= 5 ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${activeOrientScore >= 7 ? '#86efac' : activeOrientScore >= 5 ? '#fcd34d' : '#fca5a5'}`,
            borderRadius:12, padding:16,
          }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>Orientierungsstatus</div>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ fontSize:32, fontWeight:700,
                color: activeOrientScore >= 7 ? '#16a34a' : activeOrientScore >= 5 ? '#d97706' : '#dc2626'
              }}>{activeOrientScore}/8</span>
              <span style={{ color:'#6b7280', fontSize:14 }}>
                {activeOrientScore === 8 ? 'Vollständig orientiert' :
                 activeOrientScore >= 6 ? 'Überwiegend orientiert' :
                 activeOrientScore >= 4 ? 'Teilweise orientiert' : 'Desorientiert'}
              </span>
            </div>
          </div>

          {/* Orientierung grid */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>Orientierung (je 0-2)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {ORIENTIERUNG_LABELS.map(o => (
                <div key={o.key}>
                  <div style={{ marginBottom:6 }}>
                    <span style={{ fontWeight:500 }}>{o.label}</span>
                    <span style={{ color:'#9ca3af', fontSize:12, marginLeft:8 }}>{o.sub}</span>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {ORIENT_STUFEN.map(s => {
                      const cur = (orientierung as any)[o.key.replace('orientierung_','')] as number
                      const sel = cur === s.val
                      return (
                        <button key={s.val} onClick={() => setOrientierung(prev => ({ ...prev, [o.key.replace('orientierung_','')]: s.val }))} style={{
                          flex:1, padding:'8px 4px', borderRadius:8, border: sel ? `2px solid ${s.color}` : '1px solid #e5e7eb',
                          background: sel ? `${s.color}18` : '#fff', cursor:'pointer', fontSize:13,
                          color: sel ? s.color : '#374151', fontWeight: sel ? 600 : 400,
                        }}>{s.label}</button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MMSE Score */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontWeight:600 }}>MMSE Score</span>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
                <input type="checkbox" checked={mmseEingabe} onChange={e => setMmseEingabe(e.target.checked)}/>
                Heute erfasst
              </label>
            </div>
            {mmseEingabe && (
              <div>
                <MmseBar score={mmseScore}/>
                <input type="range" min={0} max={30} value={mmseScore}
                  onChange={e => setMmseScore(Number(e.target.value))}
                  style={{ width:'100%', marginTop:12 }}/>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af' }}>
                  <span>0 — Schwer</span><span>10</span><span>20</span><span>30 — Normal</span>
                </div>
              </div>
            )}
            {!mmseEingabe && <p style={{ color:'#9ca3af', fontSize:13 }}>Kein MMSE-Test heute durchgeführt</p>}
          </div>

          {/* BPSD */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>BPSD — Verhaltensauffälligkeiten</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {BPSD_ITEMS.map(b => (
                <label key={b.key} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
                  borderRadius:8, cursor:'pointer',
                  background: bpsd[b.key] ? '#fef2f2' : '#f9fafb',
                  border: `1px solid ${bpsd[b.key] ? '#fca5a5' : '#e5e7eb'}`,
                }}>
                  <input type="checkbox" checked={!!bpsd[b.key]}
                    onChange={e => setBpsd(prev => ({ ...prev, [b.key]: e.target.checked }))}/>
                  <span style={{ fontSize:13, color: bpsd[b.key] ? '#dc2626' : '#374151' }}>{b.label}</span>
                </label>
              ))}
            </div>
            {hasBpsd && (
              <textarea value={bpsdBeschreibung} onChange={e => setBpsdBeschreibung(e.target.value)}
                placeholder="Beschreibung der Verhaltensauffälligkeiten…" rows={2}
                style={{ width:'100%', marginTop:10, padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box', resize:'vertical' }}/>
            )}
          </div>

          {/* Selects */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>Kognition & Befinden</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                { label:'Kommunikation', val: kommunikation, set: setKommunikation, opts: KOMMUNIKATION_OPTIONS },
                { label:'Verständnis', val: verstaendnis, set: setVerstaendnis, opts: VERSTAENDNIS_OPTIONS },
                { label:'Stimmung', val: stimmung, set: setStimmung, opts: STIMMUNG_OPTIONS },
                { label:'Tagesform', val: tagesform, set: setTagesform, opts: TAGESFORM_OPTIONS },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>{f.label}</label>
                  <select value={f.val} onChange={e => f.set(e.target.value)}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13 }}>
                    <option value="">— auswählen —</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <textarea value={bemerkungen} onChange={e => setBemerkungen(e.target.value)}
              placeholder="Bemerkungen…" rows={2}
              style={{ width:'100%', marginTop:12, padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box', resize:'vertical' }}/>
            <input value={beurteiltVon} onChange={e => setBeurteiltVon(e.target.value)} placeholder="Beurteilt von"
              style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box' }}/>
          </div>

          <button onClick={saveAssessment} disabled={savingA} style={{
            padding:'14px 24px', borderRadius:10, border:'none', background:'#6366f1',
            color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer',
          }}>{savingA ? 'Speichern…' : '🧠 Assessment speichern'}</button>
          {msgA && <p style={{ textAlign:'center', color: msgA.startsWith('✓') ? '#16a34a' : '#dc2626' }}>{msgA}</p>}
        </div>
      )}

      {/* ── TAB 2: AKTIVIERUNG ─────────────────────────────────────────────── */}
      {tab === 'aktivierung' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Kategorien */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>Kategorie</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {AKTIVITAET_KATEGORIEN.map(k => (
                <button key={k.key} onClick={() => { setKategorie(k.key); setAktivitaet('') }} style={{
                  padding:'8px 14px', borderRadius:20, border: kategorie===k.key ? `2px solid ${k.farbe}` : '1px solid #e5e7eb',
                  background: kategorie===k.key ? `${k.farbe}18` : '#fff', cursor:'pointer', fontSize:13,
                  color: kategorie===k.key ? k.farbe : '#374151', fontWeight: kategorie===k.key ? 600 : 400,
                }}>{k.icon} {k.label}</button>
              ))}
            </div>
          </div>

          {/* Aktivität */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:600, marginBottom:8 }}>Aktivität</div>
            <input value={aktivitaet} onChange={e => setAktivitaet(e.target.value)} placeholder="z.B. Gesellschaftsspiele, Spaziergang…"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:14, boxSizing:'border-box' }}/>
            {/* Vorschläge */}
            {kategorie && AKTIVITAET_VORSCHLAEGE[kategorie]?.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:12, color:'#9ca3af', marginBottom:6 }}>Vorschläge:</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {AKTIVITAET_VORSCHLAEGE[kategorie].map((v: string) => (
                    <button key={v} onClick={() => setAktivitaet(v)} style={{
                      padding:'4px 10px', borderRadius:12, border:'1px solid #e5e7eb',
                      background: aktivitaet===v ? '#ede9fe' : '#f9fafb', cursor:'pointer', fontSize:12,
                      color: aktivitaet===v ? '#6366f1' : '#374151',
                    }}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dauer */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontWeight:600 }}>Dauer</span>
              <span style={{ fontSize:20, fontWeight:700, color:'#6366f1' }}>{dauerMin} min</span>
            </div>
            <input type="range" min={5} max={120} step={5} value={dauerMin}
              onChange={e => setDauerMin(Number(e.target.value))}
              style={{ width:'100%' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9ca3af' }}>
              <span>5 min</span><span>60</span><span>120 min</span>
            </div>
          </div>

          {/* Teilnahme & Reaktion */}
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ fontWeight:600, marginBottom:8 }}>Teilnahme</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {TEILNAHME_OPTIONS.map(o => (
                    <button key={o} onClick={() => setTeilnahme(o)} style={{
                      padding:'8px 12px', borderRadius:8,
                      border: teilnahme===o ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      background: teilnahme===o ? '#ede9fe' : '#fff', cursor:'pointer', fontSize:13,
                      color: teilnahme===o ? '#6366f1' : '#374151', textAlign:'left',
                    }}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight:600, marginBottom:8 }}>Reaktion</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {REAKTION_OPTIONS.map((o, i) => {
                    const colors = ['#16a34a','#22c55e','#9ca3af','#ef4444']
                    return (
                      <button key={o} onClick={() => setReaktion(o)} style={{
                        padding:'8px 12px', borderRadius:8,
                        border: reaktion===o ? `2px solid ${colors[i]}` : '1px solid #e5e7eb',
                        background: reaktion===o ? `${colors[i]}18` : '#fff', cursor:'pointer', fontSize:13,
                        color: reaktion===o ? colors[i] : '#374151', textAlign:'left',
                      }}>{o}</button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
            <textarea value={besonderheiten} onChange={e => setBesonderheiten(e.target.value)}
              placeholder="Besonderheiten, Beobachtungen…" rows={2}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box', resize:'vertical' }}/>
            <input value={durchgefuehrtVon} onChange={e => setDurchgefuehrtVon(e.target.value)} placeholder="Durchgeführt von"
              style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:13, boxSizing:'border-box' }}/>
          </div>

          <button onClick={saveAktivierung} disabled={savingB || !aktivitaet.trim()} style={{
            padding:'14px 24px', borderRadius:10, border:'none', background: aktivitaet.trim() ? '#6366f1' : '#9ca3af',
            color:'#fff', fontSize:15, fontWeight:600, cursor: aktivitaet.trim() ? 'pointer' : 'not-allowed',
          }}>{savingB ? 'Speichern…' : '🎯 Aktivität speichern'}</button>
          {msgB && <p style={{ textAlign:'center', color: msgB.startsWith('✓') ? '#16a34a' : '#dc2626' }}>{msgB}</p>}
        </div>
      )}

      {/* ── TAB 3: VERLAUF ─────────────────────────────────────────────────── */}
      {tab === 'verlauf' && (
        <div>
          {loading && <p style={{ textAlign:'center', color:'#9ca3af' }}>Lade…</p>}
          {verlaufItems.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:48, color:'#9ca3af' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🧠</div>
              <p>Noch keine Einträge vorhanden.</p>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {verlaufItems.map(item => {
              if (item.type === 'assessment') {
                const a = item.data as Assessment
                const os = orientierungsScore(a)
                const bpsdCount = BPSD_ITEMS.filter(b => (a as any)[`bpsd_${b.key}`]).length
                return (
                  <div key={a.id} style={{
                    background:'#fff', borderRadius:12, padding:16,
                    borderLeft: `4px solid ${os >= 7 ? '#22c55e' : os >= 5 ? '#f59e0b' : '#ef4444'}`,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontWeight:600 }}>🧠 Kognitions-Assessment</span>
                      <span style={{ fontSize:12, color:'#9ca3af' }}>{fmtDate(a.created_at)}</span>
                    </div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13 }}>Orientierung: <b>{os}/8</b></span>
                      {a.mmse_score != null && <span style={{ fontSize:13 }}>MMSE: <b style={{ color: mmseEinstufung(a.mmse_score).farbe }}>{a.mmse_score}/30</b></span>}
                      {bpsdCount > 0 && <span style={{ fontSize:13, color:'#dc2626' }}>BPSD: {bpsdCount} Symptome</span>}
                      {a.stimmung && <span style={{ fontSize:13 }}>Stimmung: {a.stimmung}</span>}
                    </div>
                    {a.beurteilt_von && <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>Beurteilt von: {a.beurteilt_von}</div>}
                  </div>
                )
              } else {
                const a = item.data as Aktivierung
                const kat = AKTIVITAET_KATEGORIEN.find(k => k.key === a.kategorie)
                return (
                  <div key={a.id} style={{
                    background:'#fff', borderRadius:12, padding:16,
                    borderLeft: `4px solid ${kat?.farbe || '#6366f1'}`,
                    boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontWeight:600 }}>{kat?.icon || '🎯'} {a.aktivitaet}</span>
                      <span style={{ fontSize:12, color:'#9ca3af' }}>{fmtDate(a.created_at)}</span>
                    </div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      {a.dauer_min && <span style={{ fontSize:13 }}>{a.dauer_min} min</span>}
                      {a.teilnahme && <span style={{ fontSize:13, color:'#6366f1' }}>{a.teilnahme}</span>}
                      {a.reaktion && <span style={{ fontSize:13 }}>{a.reaktion}</span>}
                      {kat && <span style={{ fontSize:12, color: kat.farbe }}>{kat.label}</span>}
                    </div>
                    {a.besonderheiten && <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{a.besonderheiten}</div>}
                  </div>
                )
              }
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: ANALYSE ─────────────────────────────────────────────────── */}
      {tab === 'analyse' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Assessments', val: assessments.length, icon:'🧠' },
              { label:'Aktivierungen', val: aktivierungen.length, icon:'🎯' },
              { label:'Ø MMSE', val: (() => {
                const s = assessments.filter(a => a.mmse_score != null)
                if (!s.length) return '—'
                return (s.reduce((acc, a) => acc + (a.mmse_score ?? 0), 0) / s.length).toFixed(1)
              })(), icon:'📊' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:16, textAlign:'center', border:'1px solid #e5e7eb' }}>
                <div style={{ fontSize:28 }}>{s.icon}</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#1f2937' }}>{s.val}</div>
                <div style={{ fontSize:12, color:'#9ca3af' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* MMSE Verlauf */}
          {assessments.filter(a => a.mmse_score != null).length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:600, marginBottom:12 }}>MMSE Verlauf</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100 }}>
                {assessments.filter(a => a.mmse_score != null).slice(-12).reverse().map((a, i) => {
                  const pct = ((a.mmse_score ?? 0) / 30) * 100
                  const { farbe } = mmseEinstufung(a.mmse_score ?? 0)
                  return (
                    <div key={i} title={`${fmtDate(a.created_at)}: ${a.mmse_score}/30`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                      <div style={{ fontSize:9, color:'#9ca3af' }}>{a.mmse_score}</div>
                      <div style={{ width:'100%', height:`${pct}%`, background: farbe, borderRadius:'4px 4px 0 0', minHeight:4 }}/>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* BPSD Häufigkeit */}
          {assessments.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:600, marginBottom:12 }}>BPSD Häufigkeit (letzte {assessments.length} Assessments)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bpsdFreq.filter(b => b.count > 0).slice(0, 6).map(b => (
                  <div key={b.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                      <span>{b.label}</span>
                      <span style={{ color:'#dc2626' }}>{b.count}×</span>
                    </div>
                    <div style={{ height:8, background:'#fef2f2', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${(b.count/maxBpsd)*100}%`, height:'100%', background:'#ef4444', borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
                {bpsdFreq.every(b => b.count === 0) && <p style={{ color:'#9ca3af', fontSize:13 }}>Keine BPSD dokumentiert</p>}
              </div>
            </div>
          )}

          {/* Aktivierungskategorien */}
          {aktivierungen.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
              <div style={{ fontWeight:600, marginBottom:12 }}>Aktivierungskategorien</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {katFreq.map(k => (
                  <div key={k.key}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:3 }}>
                      <span>{k.icon} {k.label}</span>
                      <span>{k.count}×</span>
                    </div>
                    <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${(k.count/maxKat)*100}%`, height:'100%', background: k.farbe, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessments.length === 0 && aktivierungen.length === 0 && (
            <div style={{ textAlign:'center', padding:48, color:'#9ca3af' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
              <p>Noch keine Daten für die Analyse vorhanden.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
