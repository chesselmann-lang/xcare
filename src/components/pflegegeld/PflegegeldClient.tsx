'use client';

import { useState, useEffect } from 'react';
import { MONAT_NAMEN, BERATUNGSINTERVALL, PFLEGEGELD_BETRAEGE, formatBetrag, naechsteBeratungFaellig } from '@/lib/pflegegeld/berechnung';

const PFLEGEGRADE = [2, 3, 4, 5];
const STATUS_CONFIG = {
  erwartet: { label: 'Erwartet', color: 'bg-gray-100 text-gray-600' },
  erhalten: { label: 'Erhalten ✓', color: 'bg-green-100 text-green-700' },
  ausgeblieben: { label: 'Ausgeblieben ⚠', color: 'bg-red-100 text-red-700' },
  teilweise: { label: 'Teilweise', color: 'bg-yellow-100 text-yellow-700' },
};

interface Auszahlung {
  id: string; jahr: number; monat: number; betrag_cent: number;
  status: keyof typeof STATUS_CONFIG; eingang_datum: string | null; notiz: string | null;
}
interface Einstellungen {
  pflegegrad: number; pflegegeld_cent: number; kombinationsleistung: boolean;
  sachleistungsanteil: number; pflegekasse_name: string | null;
}
interface Nachweis {
  id: string; beratungs_datum: string; berater_name: string | null;
  beratungsart: string; nachweis_eingereicht: boolean; pflegekasse_bestaetigt: boolean;
}

export default function PflegegeldClient({
  initialDaten,
}: {
  initialDaten: { auszahlungen: Auszahlung[]; einstellungen: Einstellungen | null; nachweise: Nachweis[] };
}) {
  const [tab, setTab] = useState<'uebersicht' | 'nachweise' | 'einstellungen'>('uebersicht');
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [auszahlungen, setAuszahlungen] = useState<Auszahlung[]>(initialDaten.auszahlungen);
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(initialDaten.einstellungen);
  const [nachweise, setNachweise] = useState<Nachweis[]>(initialDaten.nachweise);
  const [saving, setSaving] = useState(false);

  // Reload when year changes
  useEffect(() => {
    fetch(`/api/pflegegeld?jahr=${jahr}`)
      .then(r => r.json())
      .then(d => { setAuszahlungen(d.auszahlungen); setNachweise(d.nachweise); if (d.einstellungen) setEinstellungen(d.einstellungen); });
  }, [jahr]);

  const pflegegrad = einstellungen?.pflegegrad ?? 2;
  const monatsBetrag = einstellungen?.pflegegeld_cent ?? PFLEGEGELD_BETRAEGE[2];
  const jahresTarget = monatsBetrag * 12;
  const erhalten = auszahlungen.filter(a => a.status === 'erhalten').reduce((s, a) => s + a.betrag_cent, 0);
  const ausstehend = auszahlungen.filter(a => a.status === 'ausgeblieben').length;

  const letzterNachweis = nachweise.length > 0 ? new Date(nachweise[0].beratungs_datum) : null;
  const beratungInfo = naechsteBeratungFaellig(pflegegrad, letzterNachweis);

  async function toggleStatus(az: Auszahlung) {
    const statusOrder: Array<keyof typeof STATUS_CONFIG> = ['erwartet', 'erhalten', 'ausgeblieben', 'teilweise'];
    const nextStatus = statusOrder[(statusOrder.indexOf(az.status) + 1) % statusOrder.length];
    const res = await fetch('/api/pflegegeld', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: az.id, status: nextStatus, eingang_datum: nextStatus === 'erhalten' ? new Date().toISOString().slice(0, 10) : null }),
    });
    if (res.ok) setAuszahlungen(prev => prev.map(a => a.id === az.id ? { ...a, status: nextStatus } : a));
  }

  async function eintragErstellen(monat: number) {
    const res = await fetch('/api/pflegegeld', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jahr, monat, betrag_cent: monatsBetrag, status: 'erwartet' }),
    });
    if (res.ok) {
      const data = await res.json();
      setAuszahlungen(prev => [...prev.filter(a => !(a.jahr === jahr && a.monat === monat)), data]);
    }
  }

  async function saveEinstellungen(pg: number) {
    setSaving(true);
    const res = await fetch('/api/pflegegeld/einstellungen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pflegegrad: pg }),
    });
    if (res.ok) { const d = await res.json(); setEinstellungen(d); }
    setSaving(false);
  }

  async function nachweis_einreichen(id: string) {
    const res = await fetch('/api/pflegegeld/nachweise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nachweis_eingereicht: true, eingereicht_am: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) setNachweise(prev => prev.map(n => n.id === id ? { ...n, nachweis_eingereicht: true } : n));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pflegegeld §37 SGB XI</h1>
            <p className="text-gray-500 text-sm mt-1">Auszahlungshistorie · Beratungsnachweis-Pflicht · Kombinationsleistung</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-700">{formatBetrag(monatsBetrag)}</div>
            <div className="text-xs text-green-600">pro Monat (PG {pflegegrad})</div>
          </div>
        </div>

        {/* Beratungswarnung */}
        {beratungInfo.faellig && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">⚠️</span>
            <div className="text-sm">
              <span className="font-medium text-amber-800">Beratungsnachweis fällig!</span>
              <span className="text-amber-700"> Laut §37 Abs. 3 SGB XI ist ein Beratungsbesuch {BERATUNGSINTERVALL[pflegegrad]?.text} erforderlich.{' '}
                {letzterNachweis ? `Letzter Nachweis: ${letzterNachweis.toLocaleDateString('de-DE')}.` : 'Noch kein Nachweis eingetragen.'}
              </span>
            </div>
          </div>
        )}

        {/* KPI Row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Erhalten', value: formatBetrag(erhalten), color: 'text-green-700' },
            { label: 'Jahres-Soll', value: formatBetrag(jahresTarget), color: 'text-gray-700' },
            { label: 'Ausstehend', value: `${ausstehend} Monat${ausstehend !== 1 ? 'e' : ''}`, color: ausstehend > 0 ? 'text-red-600' : 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl p-3 text-center border border-green-100">
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-400">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['uebersicht', 'Übersicht'], ['nachweise', 'Beratungsnachweise'], ['einstellungen', 'Einstellungen']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'uebersicht' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Auszahlungen {jahr}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setJahr(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-lg">←</button>
              <span className="font-medium w-12 text-center">{jahr}</span>
              <button onClick={() => setJahr(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-lg">→</button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(monat => {
              const az = auszahlungen.find(a => a.monat === monat);
              return (
                <div key={monat} className="flex items-center px-4 py-3 hover:bg-gray-50 gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700">{MONAT_NAMEN[monat]}</div>
                  <div className="flex-1">
                    {az ? (
                      <button onClick={() => toggleStatus(az)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[az.status].color}`}>
                        {STATUS_CONFIG[az.status].label}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">Nicht eingetragen</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 w-24 text-right">
                    {az ? formatBetrag(az.betrag_cent) : formatBetrag(monatsBetrag)}
                  </div>
                  {!az && (
                    <button onClick={() => eintragErstellen(monat)}
                      className="text-xs text-blue-600 hover:underline">Eintragen</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Tipp: Klicken Sie auf den Status, um zwischen Erwartet → Erhalten → Ausgeblieben zu wechseln.
          </div>
        </div>
      )}

      {tab === 'nachweise' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>§37 Abs. 3 SGB XI:</strong> Pflegegeld-Empfänger mit PG 2–3 müssen{' '}
            {BERATUNGSINTERVALL[2]?.text} einen Beratungsbesuch nachweisen, bei PG 4–5{' '}
            {BERATUNGSINTERVALL[4]?.text}. Ohne Nachweis kann das Pflegegeld gekürzt werden.
          </div>
          {nachweise.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
              Noch keine Beratungsnachweise eingetragen.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {nachweise.map(n => (
                <div key={n.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">
                      {new Date(n.beratungs_datum).toLocaleDateString('de-DE')}
                      {n.berater_name && <span className="text-gray-500 ml-2">· {n.berater_name}</span>}
                    </div>
                    <div className="text-xs text-gray-400">{n.beratungsart}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.pflegekasse_bestaetigt ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Bestätigt</span>
                    ) : n.nachweis_eingereicht ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Eingereicht</span>
                    ) : (
                      <button onClick={() => nachweis_einreichen(n.id)}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200">
                        Als eingereicht markieren
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'einstellungen' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Pflegegrad</label>
            <div className="flex gap-2">
              {PFLEGEGRADE.map(pg => (
                <button key={pg} onClick={() => saveEinstellungen(pg)} disabled={saving}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${pflegegrad === pg ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-lg font-bold">PG {pg}</div>
                  <div className="text-xs mt-0.5">{formatBetrag(PFLEGEGELD_BETRAEGE[pg])}/Monat</div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <div className="font-medium mb-1">Beratungspflicht für PG {pflegegrad}:</div>
            <div>{BERATUNGSINTERVALL[pflegegrad]?.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
