'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotfallplanData, NotfallMedikament, BLUTGRUPPEN, berechneVollstaendigkeit, formatiertesDatum, leerePlan } from '@/lib/notfall/karte';

type Tab = 'person' | 'medizin' | 'medikamente' | 'kontakte' | 'karte';

export default function NotfallplanClient() {
  const [plan, setPlan] = useState<NotfallplanData>(leerePlan());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('person');
  const [newTag, setNewTag] = useState('');
  const [newAllergie, setNewAllergie] = useState('');
  const [newImplantat, setNewImplantat] = useState('');
  const [newMed, setNewMed] = useState<NotfallMedikament>({ name: '', dosis: '', einheit: 'mg', frequenz: '' });
  const [druckModus, setDruckModus] = useState(false);

  const vollstaendigkeit = berechneVollstaendigkeit(plan);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notfall');
      if (res.ok) {
        const d = await res.json();
        if (d) setPlan({ ...leerePlan(), ...d });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/notfall', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const erstelleKarte = async () => {
    await save();
    await fetch('/api/notfall', { method: 'PATCH' });
    setPlan(p => ({ ...p, karte_erstellt_am: new Date().toISOString() }));
    setDruckModus(true);
    setTimeout(() => window.print(), 300);
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setPlan(p => ({ ...p, hauptdiagnosen: [...p.hauptdiagnosen, newTag.trim()] }));
    setNewTag('');
  };

  const addAllergie = () => {
    if (!newAllergie.trim()) return;
    setPlan(p => ({ ...p, allergien: [...p.allergien, newAllergie.trim()] }));
    setNewAllergie('');
  };

  const addImplantat = () => {
    if (!newImplantat.trim()) return;
    setPlan(p => ({ ...p, implantate: [...p.implantate, newImplantat.trim()] }));
    setNewImplantat('');
  };

  const addMed = () => {
    if (!newMed.name.trim()) return;
    setPlan(p => ({ ...p, notfall_medikamente: [...p.notfall_medikamente, { ...newMed }] }));
    setNewMed({ name: '', dosis: '', einheit: 'mg', frequenz: '' });
  };

  const removeMed = (i: number) => setPlan(p => ({ ...p, notfall_medikamente: p.notfall_medikamente.filter((_, idx) => idx !== i) }));
  const removeTag = (v: string) => setPlan(p => ({ ...p, hauptdiagnosen: p.hauptdiagnosen.filter(x => x !== v) }));
  const removeAllergie = (v: string) => setPlan(p => ({ ...p, allergien: p.allergien.filter(x => x !== v) }));
  const removeImplantat = (v: string) => setPlan(p => ({ ...p, implantate: p.implantate.filter(x => x !== v) }));

  const set = (k: keyof NotfallplanData, v: unknown) => setPlan(p => ({ ...p, [k]: v }));

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'person', label: 'Person', emoji: '👤' },
    { id: 'medizin', label: 'Medizin', emoji: '🩺' },
    { id: 'medikamente', label: 'Medikamente', emoji: '💊' },
    { id: 'kontakte', label: 'Kontakte', emoji: '📞' },
    { id: 'karte', label: 'Notfallkarte', emoji: '🆘' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Lade Notfallplan…</div>;

  if (druckModus) return (
    <div className="print:block">
      <NotfallKarteAnsicht plan={plan} onClose={() => setDruckModus(false)} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-6 flex items-center gap-4">
        <div className="text-5xl">🆘</div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Notfallplan & Notfallkarte</h1>
          <p className="text-red-100 text-sm mt-1">Lebensrettende Informationen für den Ernstfall</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{vollstaendigkeit}%</div>
          <div className="text-red-200 text-xs">Vollständigkeit</div>
          {plan.karte_erstellt_am && (
            <div className="text-red-200 text-xs mt-1">Karte: {formatiertesDatum(plan.karte_erstellt_am)}</div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${vollstaendigkeit}%` }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-red-700' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Person */}
      {tab === 'person' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">👤 Persönliche Daten</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vollständiger Name</label>
              <input value={plan.vollstaendiger_name || ''} onChange={e => set('vollstaendiger_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Vor- und Nachname" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
              <input type="date" value={plan.geburtsdatum || ''} onChange={e => set('geburtsdatum', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blutgruppe</label>
              <select value={plan.blutgruppe || 'unbekannt'} onChange={e => set('blutgruppe', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none">
                {BLUTGRUPPEN.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Krankenkasse</label>
              <input value={plan.krankenkasse || ''} onChange={e => set('krankenkasse', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="z.B. AOK Bayern" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Versicherungsnummer</label>
              <input value={plan.versicherungsnummer || ''} onChange={e => set('versicherungsnummer', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="A123456789" />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Medizin */}
      {tab === 'medizin' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-gray-800 text-lg">🩺 Medizinische Informationen</h2>

          {/* Diagnosen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hauptdiagnosen</label>
            <div className="flex gap-2 mb-2">
              <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Diagnose eingeben + Enter" />
              <button onClick={addTag} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.hauptdiagnosen.map(d => (
                <span key={d} className="bg-red-50 border border-red-200 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {d} <button onClick={() => removeTag(d)} className="text-red-400 hover:text-red-700 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Allergien */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">⚠️ Allergien</label>
            <div className="flex gap-2 mb-2">
              <input value={newAllergie} onChange={e => setNewAllergie(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAllergie()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Allergie eingeben" />
              <button onClick={addAllergie} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.allergien.map(a => (
                <span key={a} className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  ⚠️ {a} <button onClick={() => removeAllergie(a)} className="text-orange-400 hover:text-orange-700 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Implantate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🔩 Implantate / Hilfsmittel</label>
            <div className="flex gap-2 mb-2">
              <input value={newImplantat} onChange={e => setNewImplantat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImplantat()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="z.B. Herzschrittmacher, Hüft-TEP links" />
              <button onClick={addImplantat} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan.implantate.map(i => (
                <span key={i} className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  🔩 {i} <button onClick={() => removeImplantat(i)} className="text-blue-400 hover:text-blue-700 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Reanimation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">💙 Reanimationswunsch</label>
            <div className="flex gap-3">
              {[
                { val: true, label: '✅ Ja – Reanimation erwünscht', cls: 'border-green-500 bg-green-50 text-green-800' },
                { val: false, label: '🚫 Nein – DNR (Do Not Resuscitate)', cls: 'border-red-500 bg-red-50 text-red-800' },
                { val: null, label: '❓ Nicht festgelegt', cls: 'border-gray-300 bg-gray-50 text-gray-700' },
              ].map(opt => (
                <button key={String(opt.val)} onClick={() => set('reanimation_gewuenscht', opt.val)}
                  className={`flex-1 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${plan.reanimation_gewuenscht === opt.val ? opt.cls : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patientenverfügung */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" checked={plan.patientenverfuegung_vorh} onChange={e => set('patientenverfuegung_vorh', e.target.checked)}
                className="w-5 h-5 text-red-600" />
              <label className="text-sm font-medium text-gray-700">Patientenverfügung vorhanden</label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" checked={plan.vorsorgevollmacht_vorh} onChange={e => set('vorsorgevollmacht_vorh', e.target.checked)}
                className="w-5 h-5 text-red-600" />
              <label className="text-sm font-medium text-gray-700">Vorsorgevollmacht vorhanden</label>
            </div>
            {plan.patientenverfuegung_vorh && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aufbewahrungsort</label>
                <input value={plan.patientenverfuegung_ort || ''} onChange={e => set('patientenverfuegung_ort', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="z.B. Schreibtisch Schublade, bei Hausarzt" />
              </div>
            )}
          </div>

          {/* Bevollmächtigte */}
          {plan.vorsorgevollmacht_vorh && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bevollmächtigte/r (Name)</label>
                <input value={plan.bevollmaechtigte_name || ''} onChange={e => set('bevollmaechtigte_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Bevollmächtigte/r</label>
                <input value={plan.bevollmaechtigte_telefon || ''} onChange={e => set('bevollmaechtigte_telefon', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Medikamente */}
      {tab === 'medikamente' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">💊 Notfall-Medikamente</h2>
          <p className="text-sm text-gray-500">Wichtige Dauermedikamente, die der Notarzt kennen muss</p>

          {/* Add Med */}
          <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-xl">
            <input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Medikament" />
            <input value={newMed.dosis} onChange={e => setNewMed(m => ({ ...m, dosis: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Dosis (z.B. 10)" />
            <select value={newMed.einheit} onChange={e => setNewMed(m => ({ ...m, einheit: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none">
              {['mg', 'µg', 'ml', 'IE', 'Stück'].map(u => <option key={u}>{u}</option>)}
            </select>
            <button onClick={addMed} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700">+ Hinzufügen</button>
            <input value={newMed.frequenz} onChange={e => setNewMed(m => ({ ...m, frequenz: e.target.value }))}
              className="col-span-4 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Frequenz (z.B. 1x täglich morgens)" />
          </div>

          {/* Liste */}
          {plan.notfall_medikamente.length === 0
            ? <p className="text-center text-gray-400 py-8">Noch keine Medikamente eingetragen</p>
            : (
              <div className="space-y-2">
                {plan.notfall_medikamente.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-xl bg-orange-50">
                    <span className="text-2xl">💊</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{m.name} — {m.dosis} {m.einheit}</div>
                      <div className="text-sm text-gray-500">{m.frequenz}</div>
                    </div>
                    <button onClick={() => removeMed(i)} className="text-red-400 hover:text-red-600 text-xl">×</button>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Tab: Kontakte */}
      {tab === 'kontakte' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-gray-800 text-lg">📞 Notfallkontakte</h2>

          {/* Kontakt 1 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">⭐ Hauptkontakt</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={plan.kontakt_1_name || ''} onChange={e => set('kontakt_1_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input value={plan.kontakt_1_telefon || ''} onChange={e => set('kontakt_1_telefon', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="+49 123 456789" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Beziehung</label>
                <input value={plan.kontakt_1_relation || ''} onChange={e => set('kontakt_1_relation', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="z.B. Tochter" />
              </div>
            </div>
          </div>

          {/* Kontakt 2 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Ersatzkontakt</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={plan.kontakt_2_name || ''} onChange={e => set('kontakt_2_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input value={plan.kontakt_2_telefon || ''} onChange={e => set('kontakt_2_telefon', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="+49 123 456789" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Beziehung</label>
                <input value={plan.kontakt_2_relation || ''} onChange={e => set('kontakt_2_relation', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="z.B. Sohn" />
              </div>
            </div>
          </div>

          {/* Hausarzt */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🏥 Hausarzt</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={plan.hausarzt_name || ''} onChange={e => set('hausarzt_name', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Dr. Müller" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input value={plan.hausarzt_telefon || ''} onChange={e => set('hausarzt_telefon', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Praxis</label>
                <input value={plan.hausarzt_praxis || ''} onChange={e => set('hausarzt_praxis', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Gemeinschaftspraxis…" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Notfallkarte */}
      {tab === 'karte' && (
        <div className="space-y-4">
          <NotfallKarteVorschau plan={plan} />
          <button onClick={erstelleKarte}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-700 flex items-center justify-center gap-3 shadow-lg">
            🖨️ Notfallkarte drucken / als PDF speichern
          </button>
          <p className="text-center text-xs text-gray-500">Karte ausdrucken und in Brieftasche / Rollstuhl / Handtasche aufbewahren</p>
        </div>
      )}

      {/* Save Bar */}
      <div className="flex justify-end gap-3">
        <button onClick={save} disabled={saving}
          className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all ${saving ? 'bg-gray-300 text-gray-500' : saved ? 'bg-green-600 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}>
          {saving ? '⏳ Speichern…' : saved ? '✅ Gespeichert' : '💾 Speichern'}
        </button>
      </div>
    </div>
  );
}

function NotfallKarteVorschau({ plan }: { plan: NotfallplanData }) {
  return (
    <div className="border-4 border-red-600 rounded-2xl p-5 bg-white space-y-3">
      <div className="flex items-center gap-3 border-b-2 border-red-600 pb-3">
        <div className="text-4xl">🆘</div>
        <div>
          <div className="text-xl font-black text-red-700 uppercase tracking-wide">Notfallkarte</div>
          <div className="text-2xl font-bold text-gray-900">{plan.vollstaendiger_name || '– Name –'}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm text-gray-500">Geb.</div>
          <div className="font-semibold">{formatiertesDatum(plan.geburtsdatum)}</div>
          <div className="text-lg font-black text-red-700">{plan.blutgruppe}</div>
        </div>
      </div>

      {plan.allergien.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-2">
          <span className="text-xs font-bold text-red-700 uppercase">⚠️ ALLERGIEN: </span>
          <span className="text-sm font-semibold text-red-900">{plan.allergien.join(', ')}</span>
        </div>
      )}

      {plan.implantate.length > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
          <span className="text-xs font-bold text-blue-700 uppercase">🔩 Implantate: </span>
          <span className="text-sm text-blue-900">{plan.implantate.join(', ')}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {plan.kontakt_1_name && (
          <div><span className="text-xs text-gray-500">Notfallkontakt: </span><span className="font-semibold">{plan.kontakt_1_name}</span><br/><span className="text-red-700 font-bold">{plan.kontakt_1_telefon}</span></div>
        )}
        {plan.hausarzt_name && (
          <div><span className="text-xs text-gray-500">Hausarzt: </span><span className="font-semibold">{plan.hausarzt_name}</span><br/><span className="text-gray-600">{plan.hausarzt_telefon}</span></div>
        )}
      </div>

      {plan.reanimation_gewuenscht === false && (
        <div className="bg-red-700 text-white text-center py-2 rounded-lg font-black uppercase tracking-widest">
          🚫 KEINE REANIMATION — DNR
        </div>
      )}

      {plan.patientenverfuegung_vorh && (
        <div className="text-xs text-gray-500 text-center">📄 Patientenverfügung vorhanden — {plan.patientenverfuegung_ort || 'Ort nicht angegeben'}</div>
      )}
    </div>
  );
}

function NotfallKarteAnsicht({ plan, onClose }: { plan: NotfallplanData; onClose: () => void }) {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-2xl mx-auto">
        <NotfallKarteVorschau plan={plan} />
        <div className="mt-8 print:hidden">
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-300">
            ← Zurück zum Notfallplan
          </button>
        </div>
      </div>
    </div>
  );
}
