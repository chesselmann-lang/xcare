'use client';

import { useState, useEffect, useCallback } from 'react';
import { SturzAssessment, Sturzereignis, MORSE_ITEMS, PRAEVENTION_MASSNAHMEN, berechneRisiko, leeresAssessment } from '@/lib/sturzpraevention/assessment';

type Tab = 'assessment' | 'ereignisse' | 'massnahmen';

export default function SturzpraeventionClient() {
  const [assessments, setAssessments] = useState<SturzAssessment[]>([]);
  const [ereignisse, setEreignisse] = useState<Sturzereignis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('assessment');
  const [form, setForm] = useState<SturzAssessment>(leeresAssessment());
  const [ereignisForm, setEreignisForm] = useState<Partial<Sturzereignis>>({ ereignis_datum: new Date().toISOString(), arzt_informiert: false, krankenhauseinw: false });
  const [saving, setSaving] = useState(false);
  const [showNeuAssessment, setShowNeuAssessment] = useState(false);
  const [showNeuEreignis, setShowNeuEreignis] = useState(false);

  const gesamtscore = form.sturzhistorie + form.zweitdiagnose + form.gehhilfe + form.heparin_iv + form.gangbild + form.orientierung;
  const risiko = berechneRisiko(gesamtscore);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/sturzpraevention');
      if (res.ok) { const d = await res.json(); setAssessments(d.assessments); setEreignisse(d.ereignisse); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAssessment = async () => {
    setSaving(true);
    try {
      await fetch('/api/sturzpraevention', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      await load(); setShowNeuAssessment(false); setForm(leeresAssessment());
    } finally { setSaving(false); }
  };

  const saveEreignis = async () => {
    setSaving(true);
    try {
      await fetch('/api/sturzpraevention', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ: 'ereignis', ...ereignisForm }) });
      await load(); setShowNeuEreignis(false);
    } finally { setSaving(false); }
  };

  const toggleMassnahme = (m: string) => setForm(p => ({ ...p, massnahmen: p.massnahmen.includes(m) ? p.massnahmen.filter(x => x !== m) : [...p.massnahmen, m] }));
  const setF = (k: keyof SturzAssessment, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const risikoFarbe = { green: 'bg-green-100 text-green-800 border-green-300', yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300', red: 'bg-red-100 text-red-800 border-red-300' };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Lade…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 text-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold">🏃 Sturzprävention</h1>
        <p className="text-blue-100 text-sm mt-1">Morse Fall Scale Assessment & Sturzereignis-Protokoll</p>
        {assessments.length > 0 && (
          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${risikoFarbe[berechneRisiko(assessments[0].gesamtscore || 0).farbe as keyof typeof risikoFarbe]}`}>
            Letztes Assessment: {berechneRisiko(assessments[0].gesamtscore || 0).stufe}es Risiko (Score: {assessments[0].gesamtscore})
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[{ id: 'assessment', l: '📋 Assessment' }, { id: 'ereignisse', l: '⚠️ Stürze' }, { id: 'massnahmen', l: '🛡️ Maßnahmen' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'assessment' && (
        <div className="space-y-4">
          <button onClick={() => setShowNeuAssessment(!showNeuAssessment)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
            {showNeuAssessment ? '↑ Formular schließen' : '+ Neues Assessment durchführen'}
          </button>

          {showNeuAssessment && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              {/* Live Score */}
              <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${risikoFarbe[risiko.farbe as keyof typeof risikoFarbe]}`}>
                <div>
                  <div className="text-2xl font-black">{gesamtscore} Punkte</div>
                  <div className="font-semibold">{risiko.stufe}es Sturzrisiko</div>
                  <div className="text-sm">{risiko.beschr}</div>
                </div>
                <div className="text-5xl">{risiko.farbe === 'green' ? '🟢' : risiko.farbe === 'yellow' ? '🟡' : '🔴'}</div>
              </div>

              {MORSE_ITEMS.map(item => (
                <div key={item.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{item.label}</label>
                  <div className="space-y-1">
                    {item.options.map(opt => (
                      <label key={opt.v} className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer hover:bg-blue-50 transition-all">
                        <input type="radio" name={item.key} value={opt.v}
                          checked={form[item.key as keyof SturzAssessment] === opt.v}
                          onChange={() => setF(item.key as keyof SturzAssessment, opt.v)}
                          className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{opt.l}</span>
                        <span className="ml-auto text-sm font-mono text-gray-400">{opt.v} Pkt</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Präventionsmaßnahmen</label>
                <div className="flex flex-wrap gap-2">
                  {PRAEVENTION_MASSNAHMEN.map(m => (
                    <button key={m} onClick={() => toggleMassnahme(m)}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${form.massnahmen.includes(m) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Durchgeführt von</label>
                  <input value={form.durchgefuehrt_von || ''} onChange={e => setF('durchgefuehrt_von', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nächstes Assessment</label>
                  <input type="date" value={form.naechstes_assessment || ''} onChange={e => setF('naechstes_assessment', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <button onClick={saveAssessment} disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300">
                {saving ? '⏳ Speichern…' : '💾 Assessment speichern'}
              </button>
            </div>
          )}

          {assessments.map((a, i) => {
            const r = berechneRisiko(a.gesamtscore || 0);
            return (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{new Date(a.assessment_datum).toLocaleDateString('de-DE')}</div>
                    {i === 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Aktuell</span>}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold border ${risikoFarbe[r.farbe as keyof typeof risikoFarbe]}`}>
                    {a.gesamtscore} Pkt — {r.stufe}
                  </div>
                </div>
                {a.massnahmen.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.massnahmen.map(m => <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ereignisse' && (
        <div className="space-y-4">
          <button onClick={() => setShowNeuEreignis(!showNeuEreignis)}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">
            {showNeuEreignis ? '↑ Formular schließen' : '+ Sturzereignis protokollieren'}
          </button>

          {showNeuEreignis && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[{ k: 'ort', l: 'Ort des Sturzes' }, { k: 'ursache', l: 'Mögliche Ursache' }, { k: 'verletzung', l: 'Verletzung' }].map(({ k, l }) => (
                  <div key={k} className={k === 'verletzung' ? 'col-span-2' : ''}>
                    <label className="block text-xs text-gray-500 mb-1">{l}</label>
                    <input value={(ereignisForm as Record<string, string>)[k] || ''}
                      onChange={e => setEreignisForm(p => ({ ...p, [k]: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                {[{ k: 'arzt_informiert', l: 'Arzt informiert' }, { k: 'krankenhauseinw', l: 'Krankenhauseinweisung' }].map(({ k, l }) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(ereignisForm as Record<string, boolean>)[k] || false}
                      onChange={e => setEreignisForm(p => ({ ...p, [k]: e.target.checked }))} className="w-4 h-4 text-red-600" />
                    {l}
                  </label>
                ))}
              </div>
              <button onClick={saveEreignis} disabled={saving}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:bg-gray-300">
                {saving ? '⏳ Speichern…' : '💾 Ereignis speichern'}
              </button>
            </div>
          )}

          {ereignisse.length === 0
            ? <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">✅</div><p>Keine protokollierten Stürze</p></div>
            : ereignisse.map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-red-500">
                <div className="font-semibold text-gray-800">{new Date(e.ereignis_datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                {e.ort && <div className="text-sm text-gray-600 mt-1">📍 {e.ort}</div>}
                {e.verletzung && <div className="text-sm text-red-600 mt-1">🩹 {e.verletzung}</div>}
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  {e.arzt_informiert && <span className="text-green-600">✓ Arzt informiert</span>}
                  {e.krankenhauseinw && <span className="text-red-600">🏥 Krankenhauseinweisung</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'massnahmen' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 text-lg">🛡️ Empfohlene Präventionsmaßnahmen</h2>
          <div className="space-y-3">
            {[
              { emoji: '👟', title: 'Rutschfeste Schuhe & Socken', desc: 'Festes Schuhwerk mit rutschfester Sohle trägt wesentlich zur Sturzvermeidung bei.' },
              { emoji: '🔧', title: 'Haltegriffe & Handläufe', desc: 'Im Bad, WC und auf Treppen Haltegriffe montieren. Handläufe auf beiden Seiten der Treppe.' },
              { emoji: '💡', title: 'Ausreichende Beleuchtung', desc: 'Nachtlichter installieren, Lichtschalter in Reichweite des Bettes platzieren.' },
              { emoji: '🚶', title: 'Mobilität & Balance', desc: 'Regelmäßige Gehübungen, Gleichgewichtstraining (Tai-Chi empfohlen). Hilfsmittel nutzen.' },
              { emoji: '💊', title: 'Medikamenten-Review', desc: 'Medikamente auf sturzbegünstigende Wirkungen prüfen lassen (z.B. Benzodiazepine, Blutdruckmittel).' },
              { emoji: '👁️', title: 'Sehkraft & Hörfähigkeit', desc: 'Regelmäßige Augen- und Hörgerätekontrollen. Brille immer tragen.' },
              { emoji: '🏠', title: 'Barrieren entfernen', desc: 'Teppiche befestigen oder entfernen, Kabel verlegen, freie Wege schaffen.' },
            ].map(m => (
              <div key={m.title} className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{m.title}</div>
                  <div className="text-sm text-gray-600">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
