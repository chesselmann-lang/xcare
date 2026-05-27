'use client';

import { useState } from 'react';
import { Angebot, Bedarf, Kategorie, ZUSTAND_LABELS, PREIS_LABELS, getZustandColor, getPreisColor } from '@/lib/hilfsmittel/boerse';

interface Props {
  initialAngebote: Angebot[];
  kategorien: Kategorie[];
}

export default function HilfsmittelBoeseClient({ initialAngebote, kategorien }: Props) {
  const [tab, setTab] = useState<'angebote' | 'bedarf' | 'inserieren'>('angebote');
  const [angebote, setAngebote] = useState<Angebot[]>(initialAngebote);
  const [bedarfe, setBedarfe] = useState<Bedarf[]>([]);
  const [bedarfLoaded, setBedarfLoaded] = useState(false);
  const [plzFilter, setPlzFilter] = useState('');
  const [katFilter, setKatFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Formular für neues Angebot
  const [form, setForm] = useState({
    kategorie_id: '', beschreibung: '', zustand: 'gut',
    plz: '', ort: '', preis_art: 'kostenlos', kontakt_telefon: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  async function suchen(typ: 'angebote' | 'bedarf') {
    setLoading(true);
    const params = new URLSearchParams({ typ });
    if (plzFilter) params.set('plz', plzFilter);
    if (katFilter) params.set('kategorie_id', katFilter);
    const res = await fetch(`/api/hilfsmittel?${params}`);
    const data = await res.json();
    if (typ === 'angebote') setAngebote(data);
    else { setBedarfe(data); setBedarfLoaded(true); }
    setLoading(false);
  }

  async function inserieren() {
    setSaving(true);
    const res = await fetch('/api/hilfsmittel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setAngebote(prev => [data, ...prev]);
      setSaveOk(true);
      setForm({ kategorie_id: '', beschreibung: '', zustand: 'gut', plz: '', ort: '', preis_art: 'kostenlos', kontakt_telefon: '' });
      setTimeout(() => setSaveOk(false), 3000);
    }
    setSaving(false);
  }

  const KatIcon = ({ katId }: { katId: string }) => {
    const kat = kategorien.find(k => k.id === katId);
    return <span>{kat?.icon ?? '📦'}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hilfsmittel-Börse</h1>
            <p className="text-gray-500 text-sm mt-1">§40 SGB XI · Pflegehilfsmittel leihen, verleihen und teilen</p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-xl">
            <span>ℹ️</span>
            <span>Pflegekasse übernimmt bis zu 40€/Monat für zum Verbrauch bestimmte Hilfsmittel</span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-3 mt-4">
          <input
            value={plzFilter}
            onChange={e => setPlzFilter(e.target.value)}
            placeholder="PLZ (z. B. 80)"
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={katFilter}
            onChange={e => setKatFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Kategorien</option>
            {kategorien.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
          </select>
          <button
            onClick={() => suchen(tab === 'bedarf' ? 'bedarf' : 'angebote')}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Suche …' : 'Suchen'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['angebote', '📦 Angebote'], ['bedarf', '🔍 Gesuche'], ['inserieren', '+ Inserieren']] as const).map(([id, label]) => (
          <button key={id}
            onClick={() => { setTab(id); if (id === 'bedarf' && !bedarfLoaded) suchen('bedarf'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'angebote' && (
        <div className="space-y-3">
          {angebote.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              Keine Angebote gefunden.
            </div>
          )}
          {angebote.map(angebot => (
            <div key={angebot.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 flex-wrap">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                <KatIcon katId={angebot.kategorie_id} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{angebot.hilfsmittel_kategorien?.name ?? 'Hilfsmittel'}</h3>
                    <p className="text-gray-600 text-sm mt-0.5">{angebot.beschreibung}</p>
                    <p className="text-gray-400 text-xs mt-1">📍 {angebot.plz} {angebot.ort}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getZustandColor(angebot.zustand)}`}>
                      {ZUSTAND_LABELS[angebot.zustand]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPreisColor(angebot.preis_art)}`}>
                      {PREIS_LABELS[angebot.preis_art]}
                      {angebot.preis_art === 'miete' && angebot.preis_monat_cent > 0 && ` (${(angebot.preis_monat_cent / 100).toFixed(0)} €/Monat)`}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  {angebot.kontakt_telefon && (
                    <a href={`tel:${angebot.kontakt_telefon}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                      📞 Anrufen
                    </a>
                  )}
                  {angebot.kontakt_email && (
                    <a href={`mailto:${angebot.kontakt_email}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                      ✉️ E-Mail
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'bedarf' && (
        <div className="space-y-3">
          {bedarfe.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              Keine Gesuche gefunden.
            </div>
          )}
          {bedarfe.map(bedarf => (
            <div key={bedarf.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4 flex-wrap">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl shrink-0">
                <KatIcon katId={bedarf.kategorie_id} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{bedarf.hilfsmittel_kategorien?.name ?? 'Hilfsmittel'} gesucht</h3>
                <p className="text-gray-600 text-sm mt-0.5">{bedarf.beschreibung}</p>
                <p className="text-gray-400 text-xs mt-1">📍 {bedarf.plz} {bedarf.ort}</p>
                <div className="flex gap-3 mt-2">
                  {bedarf.kontakt_telefon && <a href={`tel:${bedarf.kontakt_telefon}`} className="text-sm text-blue-600 hover:underline">📞 Anrufen</a>}
                  {bedarf.kontakt_email && <a href={`mailto:${bedarf.kontakt_email}`} className="text-sm text-blue-600 hover:underline">✉️ E-Mail</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'inserieren' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Hilfsmittel inserieren</h2>
          {saveOk && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✓ Ihr Angebot wurde eingestellt!
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select value={form.kategorie_id} onChange={e => setForm(f => ({ ...f, kategorie_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Bitte wählen …</option>
                {kategorien.map(k => <option key={k.id} value={k.id}>{k.icon} {k.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
                rows={3} placeholder="z. B. Faltrollstuhl, Breite 45 cm, Tragkraft 100 kg, kaum benutzt …"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zustand</label>
              <select value={form.zustand} onChange={e => setForm(f => ({ ...f, zustand: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="neuwertig">Neuwertig</option>
                <option value="gut">Gut</option>
                <option value="gebraucht">Gebraucht</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preis</label>
              <select value={form.preis_art} onChange={e => setForm(f => ({ ...f, preis_art: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="kostenlos">Kostenlos</option>
                <option value="spende">Gegen Spende</option>
                <option value="miete">Miete</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input value={form.plz} onChange={e => setForm(f => ({ ...f, plz: e.target.value }))}
                placeholder="12345" maxLength={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <input value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))}
                placeholder="Stadt"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input value={form.kontakt_telefon} onChange={e => setForm(f => ({ ...f, kontakt_telefon: e.target.value }))}
                placeholder="Ihre Telefonnummer"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button onClick={inserieren} disabled={saving || !form.kategorie_id || !form.beschreibung || !form.plz}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Wird gespeichert …' : 'Jetzt inserieren'}
          </button>
          <p className="text-xs text-gray-400 text-center">Alle Inserate sind kostenlos · Anmeldung erforderlich</p>
        </div>
      )}
    </div>
  );
}
