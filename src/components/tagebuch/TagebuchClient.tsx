'use client';

import { useState, useEffect, useCallback } from 'react';
import { TagebuchEintrag, STIMMUNGS_EMOJIS, STIMMUNGS_LABELS, AKTIVITAETEN_VORSCHLAEGE, PFLEGELEISTUNGEN_VORSCHLAEGE, leererEintrag } from '@/lib/tagebuch/eintraege';

type View = 'liste' | 'neu' | 'detail';

export default function TagebuchClient() {
  const [eintraege, setEintraege] = useState<TagebuchEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('liste');
  const [aktuell, setAktuell] = useState<TagebuchEintrag>(leererEintrag());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tagebuch?limit=60');
      if (res.ok) { const d = await res.json(); setEintraege(d.eintraege || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const method = aktuell.id ? 'PUT' : 'POST';
      const res = await fetch('/api/tagebuch', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aktuell) });
      if (res.ok) {
        setSaved(true); setTimeout(() => setSaved(false), 2000);
        await load(); setView('liste');
      }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await fetch(`/api/tagebuch?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const set = (k: keyof TagebuchEintrag, v: unknown) => setAktuell(p => ({ ...p, [k]: v }));
  const toggleArr = (k: 'aktivitaeten' | 'pflegeleistungen', v: string) =>
    setAktuell(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Lade Tagebuch…</div>;

  if (view === 'liste') return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📔 Pflegetagebuch</h1>
          <p className="text-purple-100 text-sm mt-1">{eintraege.length} Einträge</p>
        </div>
        <button onClick={() => { setAktuell(leererEintrag()); setView('neu'); }}
          className="bg-white text-purple-700 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-purple-50">
          + Neuer Eintrag
        </button>
      </div>

      {eintraege.length === 0
        ? <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📔</div>
            <p className="font-medium">Noch keine Einträge</p>
            <p className="text-sm mt-1">Erfassen Sie tägliche Beobachtungen und Vitalwerte</p>
          </div>
        : eintraege.map(e => (
          <div key={e.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{e.stimmung ? STIMMUNGS_EMOJIS[e.stimmung - 1] : '📔'}</span>
                <div>
                  <div className="font-semibold text-gray-800">
                    {new Date(e.eintrag_datum).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-sm text-gray-500 flex gap-3 flex-wrap mt-0.5">
                    {e.stimmung && <span>Stimmung: {STIMMUNGS_LABELS[e.stimmung - 1]}</span>}
                    {e.blutdruck_sys && <span>RR: {e.blutdruck_sys}/{e.blutdruck_dia}</span>}
                    {e.puls && <span>Puls: {e.puls}</span>}
                    {e.trinkmenge_ml && <span>Trinken: {e.trinkmenge_ml} ml</span>}
                    {e.sturz_ereignis && <span className="text-red-600 font-semibold">⚠️ Sturz</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setAktuell(e); setView('detail'); }}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-purple-50">Bearbeiten</button>
                <button onClick={() => del(e.id!)} className="text-red-400 hover:text-red-600 text-sm px-2 py-1">×</button>
              </div>
            </div>
            {e.notizen && <p className="text-sm text-gray-600 mt-2 border-t pt-2 line-clamp-2">{e.notizen}</p>}
          </div>
        ))
      }
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
        <button onClick={() => setView('liste')} className="text-gray-500 hover:text-gray-700">← Zurück</button>
        <h2 className="font-bold text-gray-800 text-lg">{view === 'neu' ? '+ Neuer Eintrag' : 'Eintrag bearbeiten'}</h2>
      </div>

      {/* Datum */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">📅 Datum</label>
        <input type="date" value={aktuell.eintrag_datum} onChange={e => set('eintrag_datum', e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
      </div>

      {/* Stimmung & Schmerz */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800">😊 Wohlbefinden</h3>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Stimmung</label>
          <div className="flex gap-2">
            {STIMMUNGS_EMOJIS.map((e, i) => (
              <button key={i} onClick={() => set('stimmung', i + 1)}
                className={`text-3xl p-2 rounded-xl transition-all ${aktuell.stimmung === i + 1 ? 'bg-purple-100 ring-2 ring-purple-400 scale-110' : 'hover:bg-gray-100'}`}
                title={STIMMUNGS_LABELS[i]}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Schmerz-Level: {aktuell.schmerz_level ?? 0}/10</label>
          <input type="range" min={0} max={10} value={aktuell.schmerz_level ?? 0}
            onChange={e => set('schmerz_level', parseInt(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-xs text-gray-400"><span>Kein Schmerz</span><span>Stärkster Schmerz</span></div>
        </div>
      </div>

      {/* Vitalwerte */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">🩺 Vitalwerte</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'blutdruck_sys', label: 'RR sys (mmHg)', placeholder: '120' },
            { k: 'blutdruck_dia', label: 'RR dia (mmHg)', placeholder: '80' },
            { k: 'puls', label: 'Puls (/min)', placeholder: '72' },
            { k: 'temperatur', label: 'Temp. (°C)', placeholder: '36.6' },
            { k: 'blutzucker', label: 'BZ (mg/dL)', placeholder: '100' },
            { k: 'gewicht', label: 'Gewicht (kg)', placeholder: '70.5' },
            { k: 'sauerstoff', label: 'SpO₂ (%)', placeholder: '97' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type="number" value={(aktuell[k as keyof TagebuchEintrag] as number | null) ?? ''}
                onChange={e => set(k as keyof TagebuchEintrag, e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={placeholder}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Aktivitäten */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">🏃 Aktivitäten & Pflege</h3>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-2">Aktivitäten</label>
          <div className="flex flex-wrap gap-2">
            {AKTIVITAETEN_VORSCHLAEGE.map(a => (
              <button key={a} onClick={() => toggleArr('aktivitaeten', a)}
                className={`px-3 py-1 rounded-full text-sm border transition-all ${aktuell.aktivitaeten.includes(a) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-400'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-2">Pflegeleistungen</label>
          <div className="flex flex-wrap gap-2">
            {PFLEGELEISTUNGEN_VORSCHLAEGE.map(p => (
              <button key={p} onClick={() => toggleArr('pflegeleistungen', p)}
                className={`px-3 py-1 rounded-full text-sm border transition-all ${aktuell.pflegeleistungen.includes(p) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Medikamente, Essen, Schlaf */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">📊 Tagesstatus</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Trinkmenge (ml)</label>
            <input type="number" value={aktuell.trinkmenge_ml ?? ''} onChange={e => set('trinkmenge_ml', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="1500" className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mahlzeiten (0-5)</label>
            <input type="number" min={0} max={5} value={aktuell.mahlzeiten ?? ''} onChange={e => set('mahlzeiten', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Schlaf (Std.)</label>
            <input type="number" step={0.5} value={aktuell.schlaf_stunden ?? ''} onChange={e => set('schlaf_stunden', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="7.5" className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Medikamente eingenommen?</label>
          <div className="flex gap-2">
            {[{ v: true, l: '✅ Ja' }, { v: false, l: '❌ Nein' }, { v: null, l: '— N/A' }].map(opt => (
              <button key={String(opt.v)} onClick={() => set('medikamente_ok', opt.v)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${aktuell.medikamente_ok === opt.v ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-400'}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
          <input type="checkbox" checked={aktuell.sturz_ereignis} onChange={e => set('sturz_ereignis', e.target.checked)}
            className="w-5 h-5 text-red-600" />
          <label className="text-sm font-medium text-red-800">⚠️ Sturzereignis</label>
          {aktuell.sturz_ereignis && (
            <input value={aktuell.sturz_beschr || ''} onChange={e => set('sturz_beschr', e.target.value)}
              placeholder="Kurze Beschreibung…" className="flex-1 border-b border-red-300 bg-transparent text-sm outline-none px-1" />
          )}
        </div>
      </div>

      {/* Notizen */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">📝 Notizen & Besonderheiten</h3>
        <textarea rows={3} value={aktuell.notizen || ''} onChange={e => set('notizen', e.target.value)}
          placeholder="Allgemeine Beobachtungen des Tages…"
          className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-3" />
        <textarea rows={2} value={aktuell.besonderheiten || ''} onChange={e => set('besonderheiten', e.target.value)}
          placeholder="Besonderheiten, die dem Arzt/Pflegedienst mitgeteilt werden sollen…"
          className="w-full border border-orange-200 bg-orange-50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
      </div>

      <button onClick={save} disabled={saving}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${saving ? 'bg-gray-300 text-gray-500' : saved ? 'bg-green-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
        {saving ? '⏳ Speichern…' : saved ? '✅ Gespeichert!' : '💾 Eintrag speichern'}
      </button>
    </div>
  );
}
