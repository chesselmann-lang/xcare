'use client';
// components/ernaehrung/ErnaehrungClient.tsx — F45 Ernährungsplan & Flüssigkeitsbilanz

import { useState, useEffect, useCallback } from 'react';
import {
  Ernaehrungsprofil, Fluessigkeitsbilanz, MahlzeitProtokoll,
  KOSTFORMEN, IDDSI_LEVEL, TAGESZEITEN_MAHLZEIT, PORTIONEN, MNA_ITEMS,
  berechneMnaScore, mnaRisiko, leeresErnaehrungsprofil, leeresFluessigkeitsbilanz,
  berechneProzentBedarf, GetraenkEintrag,
} from '@/lib/ernaehrung/plan';

type Tab = 'fluessigkeit' | 'mahlzeiten' | 'profil' | 'mna';

const heute = () => new Date().toISOString().split('T')[0];

export default function ErnaehrungClient() {
  const [tab, setTab] = useState<Tab>('fluessigkeit');
  const [profil, setProfil] = useState<Ernaehrungsprofil>(leeresErnaehrungsprofil());
  const [bilanz, setBilanz] = useState<Fluessigkeitsbilanz>(leeresFluessigkeitsbilanz(heute()));
  const [mahlzeiten, setMahlzeiten] = useState<MahlzeitProtokoll[]>([]);
  const [datum, setDatum] = useState(heute());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [neueMahlzeit, setNeueMahlzeit] = useState<Partial<MahlzeitProtokoll>>({ mahlzeit_datum: datum, tageszeit: 'mittagessen', portion: 'ganz' });
  const [getraenkForm, setGetraenkForm] = useState({ art: 'Wasser', menge_ml: 200, zeit: new Date().toTimeString().slice(0, 5) });

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, bRes, mRes] = await Promise.all([
      fetch('/api/ernaehrung'),
      fetch(`/api/ernaehrung/fluessigkeit?datum=${datum}`),
      fetch(`/api/ernaehrung/mahlzeiten?datum=${datum}`),
    ]);
    const [pData, bData, mData] = await Promise.all([pRes.json(), bRes.json(), mRes.json()]);
    if (pData) setProfil(pData);
    setBilanz(bData ?? leeresFluessigkeitsbilanz(datum));
    setMahlzeiten(mData ?? []);
    setLoading(false);
  }, [datum]);

  useEffect(() => { load(); }, [load]);

  const saveProfil = async () => {
    setSaving(true);
    const res = await fetch('/api/ernaehrung', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profil) });
    const data = await res.json();
    if (data.id) { setProfil(data); setMsg('✅ Profil gespeichert'); }
    else setMsg('❌ Fehler: ' + data.error);
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const saveBilanz = async (updated: Fluessigkeitsbilanz) => {
    const res = await fetch('/api/ernaehrung/fluessigkeit', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const data = await res.json();
    if (data.id) setBilanz(data);
  };

  const addGetraenk = async () => {
    const neuerEintrag: GetraenkEintrag = { ...getraenkForm };
    const updated: Fluessigkeitsbilanz = {
      ...bilanz,
      bilanz_datum: datum,
      trinkmenge_ml: bilanz.trinkmenge_ml + getraenkForm.menge_ml,
      einzel_getraenke: [...bilanz.einzel_getraenke, neuerEintrag],
    };
    setBilanz(updated);
    await saveBilanz(updated);
  };

  const updateBilanzFeld = (feld: keyof Fluessigkeitsbilanz, wert: number) => {
    const updated = { ...bilanz, bilanz_datum: datum, [feld]: wert };
    setBilanz(updated as Fluessigkeitsbilanz);
    saveBilanz(updated as Fluessigkeitsbilanz);
  };

  const addMahlzeit = async () => {
    const res = await fetch('/api/ernaehrung/mahlzeiten', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...neueMahlzeit, mahlzeit_datum: datum }) });
    const data = await res.json();
    if (data.id) { setMahlzeiten(prev => [...prev, data]); setNeueMahlzeit({ mahlzeit_datum: datum, tageszeit: 'mittagessen', portion: 'ganz' }); }
  };

  const deleteMahlzeit = async (id: string) => {
    await fetch(`/api/ernaehrung/mahlzeiten?id=${id}`, { method: 'DELETE' });
    setMahlzeiten(prev => prev.filter(m => m.id !== id));
  };

  const mnaScore = berechneMnaScore(profil);
  const mnaResult = mnaRisiko(mnaScore);
  const flProzent = berechneProzentBedarf(bilanz.trinkmenge_ml + bilanz.nahrung_ml + bilanz.infusion_ml, profil.flüssigkeitsbedarf_ml);
  const bilanzCalc = (bilanz.trinkmenge_ml + bilanz.nahrung_ml + bilanz.infusion_ml) - (bilanz.urin_ml + bilanz.sonstiges_ml);

  const TABS = [
    { key: 'fluessigkeit' as Tab, label: '💧 Flüssigkeit' },
    { key: 'mahlzeiten' as Tab, label: '🍽️ Mahlzeiten' },
    { key: 'profil' as Tab, label: '⚙️ Profil' },
    { key: 'mna' as Tab, label: '📊 MNA' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Datum-Auswahl */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Datum:</label>
        <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Flüssigkeitsbilanz ── */}
      {tab === 'fluessigkeit' && (
        <div className="space-y-4">
          {/* Tagesübersicht */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Tagesbilanz</h3>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${bilanzCalc >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {bilanzCalc >= 0 ? '+' : ''}{bilanzCalc} ml
              </span>
            </div>
            {/* Fortschrittsbalken */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Flüssigkeitsaufnahme</span>
                <span>{bilanz.trinkmenge_ml + bilanz.nahrung_ml + bilanz.infusion_ml} / {profil.flüssigkeitsbedarf_ml} ml ({flProzent}%)</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${flProzent >= 100 ? 'bg-green-500' : flProzent >= 70 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, flProzent)}%` }} />
              </div>
            </div>
            {/* Einnahme / Ausfuhr Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Einnahme</p>
                {[
                  { label: 'Trinken', feld: 'trinkmenge_ml' as keyof Fluessigkeitsbilanz, icon: '💧' },
                  { label: 'Aus Nahrung', feld: 'nahrung_ml' as keyof Fluessigkeitsbilanz, icon: '🥗' },
                  { label: 'Infusion', feld: 'infusion_ml' as keyof Fluessigkeitsbilanz, icon: '💉' },
                ].map(({ label, feld, icon }) => (
                  <div key={feld} className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{label}</p>
                      <input type="number" min={0} step={50} value={bilanz[feld] as number}
                        onChange={e => updateBilanzFeld(feld, parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <span className="text-xs text-gray-400">ml</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Ausfuhr</p>
                {[
                  { label: 'Urin', feld: 'urin_ml' as keyof Fluessigkeitsbilanz, icon: '🚿' },
                  { label: 'Sonstiges', feld: 'sonstiges_ml' as keyof Fluessigkeitsbilanz, icon: '💦' },
                ].map(({ label, feld, icon }) => (
                  <div key={feld} className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{label}</p>
                      <input type="number" min={0} step={50} value={bilanz[feld] as number}
                        onChange={e => updateBilanzFeld(feld, parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg px-2 py-1 text-sm" />
                    </div>
                    <span className="text-xs text-gray-400">ml</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Schnell-Erfassung Getränke */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Getränk hinzufügen</h3>
            <div className="flex gap-2 flex-wrap">
              <input value={getraenkForm.zeit} onChange={e => setGetraenkForm(p => ({ ...p, zeit: e.target.value }))} type="time" className="border rounded-lg px-2 py-1.5 text-sm" />
              <input value={getraenkForm.art} onChange={e => setGetraenkForm(p => ({ ...p, art: e.target.value }))} placeholder="Art (z.B. Wasser)" className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-24" />
              <div className="flex items-center gap-1">
                <input type="number" min={0} step={50} value={getraenkForm.menge_ml} onChange={e => setGetraenkForm(p => ({ ...p, menge_ml: parseInt(e.target.value) || 0 }))} className="border rounded-lg px-2 py-1.5 text-sm w-20" />
                <span className="text-sm text-gray-500">ml</span>
              </div>
              <button onClick={addGetraenk} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ Hinzufügen</button>
            </div>
            {/* Schnell-Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[['Wasser', 200], ['Wasser', 300], ['Kaffee', 150], ['Tee', 200], ['Saft', 200], ['Suppe', 250]].map(([art, ml]) => (
                <button key={`${art}-${ml}`}
                  onClick={() => { setGetraenkForm(p => ({ ...p, art: art as string, menge_ml: ml as number })); }}
                  className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 px-3 py-1 rounded-full border">
                  {art} ({ml}ml)
                </button>
              ))}
            </div>
          </div>

          {/* Getränke-Liste des Tages */}
          {bilanz.einzel_getraenke.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Heutige Getränke</h3>
              <div className="space-y-2">
                {bilanz.einzel_getraenke.map((g, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{g.zeit} — {g.art}</span>
                    <span className="text-sm font-medium text-blue-600">{g.menge_ml} ml</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-semibold">
                  <span className="text-sm">Gesamt</span>
                  <span className="text-sm text-blue-600">{bilanz.einzel_getraenke.reduce((s, g) => s + g.menge_ml, 0)} ml</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mahlzeiten-Protokoll ── */}
      {tab === 'mahlzeiten' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Neue Mahlzeit</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tageszeit</label>
                <select value={neueMahlzeit.tageszeit} onChange={e => setNeueMahlzeit(p => ({ ...p, tageszeit: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-sm">
                  {TAGESZEITEN_MAHLZEIT.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Portion</label>
                <select value={neueMahlzeit.portion} onChange={e => setNeueMahlzeit(p => ({ ...p, portion: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-sm">
                  {PORTIONEN.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Nahrungsmittel / Gericht</label>
                <input value={neueMahlzeit.nahrungsmittel ?? ''} onChange={e => setNeueMahlzeit(p => ({ ...p, nahrungsmittel: e.target.value }))} placeholder="z.B. Vollkornbrot mit Käse" className="w-full border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">kcal (Schätzung)</label>
                <input type="number" min={0} value={neueMahlzeit.kcal_schaetzung ?? ''} onChange={e => setNeueMahlzeit(p => ({ ...p, kcal_schaetzung: parseInt(e.target.value) || undefined }))} placeholder="optional" className="w-full border rounded-lg px-2 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notizen</label>
                <input value={neueMahlzeit.notizen ?? ''} onChange={e => setNeueMahlzeit(p => ({ ...p, notizen: e.target.value }))} placeholder="optional" className="w-full border rounded-lg px-2 py-2 text-sm" />
              </div>
            </div>
            <button onClick={addMahlzeit} className="mt-4 w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700">
              ➕ Mahlzeit eintragen
            </button>
          </div>

          {/* Tagesübersicht Mahlzeiten */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Tagesprotokoll</h3>
            {mahlzeiten.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Noch keine Mahlzeiten eingetragen</p>
            ) : (
              <div className="space-y-3">
                {TAGESZEITEN_MAHLZEIT.map(tz => {
                  const eintraege = mahlzeiten.filter(m => m.tageszeit === tz.value);
                  if (!eintraege.length) return null;
                  return (
                    <div key={tz.value}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{tz.icon} {tz.label}</p>
                      {eintraege.map(m => {
                        const portionObj = PORTIONEN.find(p => p.value === m.portion);
                        return (
                          <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${portionObj?.prozent === 100 ? 'bg-green-100 text-green-700' : portionObj?.prozent === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {portionObj?.label}
                              </span>
                              <span className="text-sm text-gray-700">{m.nahrungsmittel || '–'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {m.kcal_schaetzung && <span className="text-xs text-gray-500">{m.kcal_schaetzung} kcal</span>}
                              <button onClick={() => deleteMahlzeit(m.id!)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                  <span>Gesamt kcal</span>
                  <span>{mahlzeiten.reduce((s, m) => s + (m.kcal_schaetzung ?? 0), 0)} kcal</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ernährungsprofil ── */}
      {tab === 'profil' && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Ernährungsprofil</h3>
          {msg && <div className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-sm">{msg}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Kostform</label>
              <select value={profil.kostform} onChange={e => setProfil(p => ({ ...p, kostform: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-sm">
                {KOSTFORMEN.map(k => <option key={k.value} value={k.value}>{k.icon} {k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Dysphagie-Level (IDDSI)</label>
              <select value={profil.dysphagie_level} onChange={e => setProfil(p => ({ ...p, dysphagie_level: parseInt(e.target.value) }))} className="w-full border rounded-lg px-2 py-2 text-sm">
                {IDDSI_LEVEL.map(l => <option key={l.level} value={l.level}>Level {l.level}: {l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Flüssigkeitsbedarf (ml/Tag)</label>
              <input type="number" min={500} step={100} value={profil.flüssigkeitsbedarf_ml} onChange={e => setProfil(p => ({ ...p, flüssigkeitsbedarf_ml: parseInt(e.target.value) || 1500 }))} className="w-full border rounded-lg px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Kalorienziel (kcal/Tag)</label>
              <input type="number" min={0} step={50} value={profil.kalorienziel_kcal ?? ''} onChange={e => setProfil(p => ({ ...p, kalorienziel_kcal: parseInt(e.target.value) || undefined }))} placeholder="optional" className="w-full border rounded-lg px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proteinziel (g/Tag)</label>
              <input type="number" min={0} step={5} value={profil.proteinziel_g ?? ''} onChange={e => setProfil(p => ({ ...p, proteinziel_g: parseFloat(e.target.value) || undefined }))} placeholder="optional" className="w-full border rounded-lg px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Letztes MNA-Datum</label>
              <input type="date" value={profil.letztes_mna_datum ?? ''} onChange={e => setProfil(p => ({ ...p, letztes_mna_datum: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nahrungsmittelallergien</label>
            <input value={profil.nahrungsmittelallergien.join(', ')} onChange={e => setProfil(p => ({ ...p, nahrungsmittelallergien: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="z.B. Nüsse, Gluten, Laktose" className="w-full border rounded-lg px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Unverträglichkeiten</label>
            <input value={profil.unvertraeglichkeiten.join(', ')} onChange={e => setProfil(p => ({ ...p, unvertraeglichkeiten: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="z.B. Fruktose, Sorbit" className="w-full border rounded-lg px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ernährungsberater</label>
            <input value={profil.ernaehrungsberater ?? ''} onChange={e => setProfil(p => ({ ...p, ernaehrungsberater: e.target.value }))} className="w-full border rounded-lg px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Besonderheiten</label>
            <textarea value={profil.besonderheiten ?? ''} onChange={e => setProfil(p => ({ ...p, besonderheiten: e.target.value }))} rows={3} className="w-full border rounded-lg px-2 py-2 text-sm" />
          </div>
          <button onClick={saveProfil} disabled={saving} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Speichere…' : '💾 Profil speichern'}
          </button>
        </div>
      )}

      {/* ── MNA-Screening ── */}
      {tab === 'mna' && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 text-center ${mnaResult.farbe === 'green' ? 'bg-green-50 border border-green-200' : mnaResult.farbe === 'yellow' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-3xl font-bold">{mnaScore} / 14</div>
            <div className={`text-lg font-semibold mt-1 ${mnaResult.farbe === 'green' ? 'text-green-700' : mnaResult.farbe === 'yellow' ? 'text-yellow-700' : 'text-red-700'}`}>{mnaResult.stufe}</div>
            <div className="text-sm text-gray-600 mt-1">{mnaResult.beschr}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h3 className="font-semibold text-gray-800">MNA-Screening (Mini Nutritional Assessment)</h3>
            {msg && <div className="bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-sm">{msg}</div>}
            {MNA_ITEMS.map(item => (
              <div key={item.key}>
                <p className="text-sm font-medium text-gray-700 mb-2">{item.frage}</p>
                <div className="space-y-1">
                  {item.optionen.map(opt => (
                    <label key={opt.wert} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${profil[item.key as keyof Ernaehrungsprofil] === opt.wert ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                      <input type="radio" name={item.key}
                        checked={profil[item.key as keyof Ernaehrungsprofil] === opt.wert}
                        onChange={() => setProfil(p => ({ ...p, [item.key]: opt.wert }))}
                        className="text-blue-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                      <span className="ml-auto text-xs font-medium text-gray-400">{opt.wert} Pkt.</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={saveProfil} disabled={saving} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Speichere…' : '💾 MNA speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
