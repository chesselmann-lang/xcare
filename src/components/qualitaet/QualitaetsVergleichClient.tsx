'use client';

import { useState, useMemo } from 'react';
import { PflegeheimMitBericht, SCORE_LABELS, ScoreKey, getScoreColor, getScoreBg, renderSterne } from '@/lib/qualitaet/vergleich';

const BUNDESLAENDER = [
  'Baden-Württemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg',
  'Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen',
  'Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen',
];

const SCORE_KEYS: ScoreKey[] = ['score_gesamt','score_pflege','score_medizin','score_soziales','score_unterkunft'];

interface Props {
  initialHeime: PflegeheimMitBericht[];
}

export default function QualitaetsVergleichClient({ initialHeime }: Props) {
  const [heime, setHeime] = useState<PflegeheimMitBericht[]>(initialHeime);
  const [plzFilter, setPlzFilter] = useState('');
  const [bundeslandFilter, setBundeslandFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [verglichene, setVerglichene] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<ScoreKey>('score_gesamt');
  const [view, setView] = useState<'liste' | 'vergleich'>('liste');

  async function suchen() {
    setLoading(true);
    const params = new URLSearchParams();
    if (plzFilter) params.set('plz', plzFilter);
    if (bundeslandFilter) params.set('bundesland', bundeslandFilter);
    const res = await fetch(`/api/qualitaet?${params}`);
    const data = await res.json();
    setHeime(data);
    setLoading(false);
  }

  function toggleVergleich(id: string) {
    setVerglichene(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  const heimeNeu = useMemo(() =>
    [...heime].sort((a, b) => {
      const aScore = a.qualitaetsberichte[0]?.[sortBy] ?? 0;
      const bScore = b.qualitaetsberichte[0]?.[sortBy] ?? 0;
      return bScore - aScore;
    }), [heime, sortBy]);

  const verglicheneHeime = heimeNeu.filter(h => verglichene.includes(h.id));

  function ScoreBar({ score }: { score: number }) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${score >= 4.5 ? 'bg-green-500' : score >= 4 ? 'bg-lime-500' : score >= 3.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={`text-sm font-semibold w-8 ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pflegeheim-Qualitätsvergleich</h1>
            <p className="text-gray-500 text-sm mt-1">MDK-Prüfberichte §115 SGB XI — bis zu 4 Heime vergleichen</p>
          </div>
          {verglichene.length >= 2 && (
            <button
              onClick={() => setView(v => v === 'liste' ? 'vergleich' : 'liste')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              {view === 'liste' ? `Vergleich anzeigen (${verglichene.length})` : '← Zur Liste'}
            </button>
          )}
        </div>

        {/* Suche */}
        <div className="flex flex-wrap gap-3 mt-4">
          <input
            value={plzFilter}
            onChange={e => setPlzFilter(e.target.value)}
            placeholder="PLZ (z. B. 80)"
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={bundeslandFilter}
            onChange={e => setBundeslandFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Bundesländer</option>
            {BUNDESLAENDER.map(b => <option key={b}>{b}</option>)}
          </select>
          <button
            onClick={suchen}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Suche …' : 'Suchen'}
          </button>
          {verglichene.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-xl">
              <span>📊</span>
              <span>{verglichene.length}/4 ausgewählt</span>
              <button onClick={() => setVerglichene([])} className="text-gray-400 hover:text-gray-600 ml-1">✕</button>
            </div>
          )}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as ScoreKey)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm ml-auto focus:outline-none"
          >
            {SCORE_KEYS.map(k => <option key={k} value={k}>{SCORE_LABELS[k]}</option>)}
          </select>
        </div>
      </div>

      {view === 'liste' ? (
        /* LISTE */
        <div className="space-y-3">
          {heimeNeu.length === 0 && (
            <div className="text-center py-16 text-gray-400">Keine Pflegeheime gefunden.</div>
          )}
          {heimeNeu.map((heim, idx) => {
            const bericht = heim.qualitaetsberichte[0];
            const isSelected = verglichene.includes(heim.id);
            return (
              <div key={heim.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-all ${isSelected ? 'border-blue-400' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-400 font-bold text-lg shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-gray-900">{heim.name}</h3>
                        <p className="text-sm text-gray-500">{heim.traeger} · {heim.plz} {heim.ort}</p>
                        {heim.plaetze_gesamt && <p className="text-xs text-gray-400 mt-0.5">{heim.plaetze_gesamt} Plätze gesamt</p>}
                      </div>
                      {bericht && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getScoreBg(bericht.score_gesamt)}`}>
                          <span className="text-2xl font-bold text-gray-900">{bericht.score_gesamt.toFixed(1)}</span>
                          <div>
                            <div className="text-xs text-gray-500">Gesamt</div>
                            <div className="text-yellow-500 text-xs">{renderSterne(bericht.score_gesamt)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    {bericht && (
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                        {(['score_pflege','score_medizin','score_soziales','score_unterkunft'] as ScoreKey[]).map(k => (
                          <div key={k}>
                            <div className="text-xs text-gray-400 mb-0.5">{SCORE_LABELS[k]}</div>
                            <ScoreBar score={bericht[k]} />
                          </div>
                        ))}
                      </div>
                    )}
                    {bericht && bericht.maengel_anzahl > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg">
                        ⚠️ {bericht.maengel_anzahl} Mängel festgestellt
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => toggleVergleich(heim.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : verglichene.length >= 4
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                      disabled={!isSelected && verglichene.length >= 4}
                    >
                      {isSelected ? '✓ Ausgewählt' : '+ Vergleich'}
                    </button>
                    {heim.telefon && (
                      <a href={`tel:${heim.telefon}`} className="px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 text-center">
                        📞 Anrufen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VERGLEICH */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="p-4 text-left text-sm font-medium text-gray-500 w-48">Kriterium</th>
                  {verglicheneHeime.map(h => (
                    <th key={h.id} className="p-4 text-center min-w-48">
                      <div className="font-semibold text-gray-900 text-sm">{h.name}</div>
                      <div className="text-xs text-gray-400">{h.ort}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {SCORE_KEYS.map(key => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-600 font-medium">{SCORE_LABELS[key]}</td>
                    {verglicheneHeime.map(h => {
                      const score = h.qualitaetsberichte[0]?.[key] ?? 0;
                      const maxScore = Math.max(...verglicheneHeime.map(x => x.qualitaetsberichte[0]?.[key] ?? 0));
                      return (
                        <td key={h.id} className="p-4 text-center">
                          <span className={`text-xl font-bold ${getScoreColor(score)} ${score === maxScore ? 'underline decoration-dotted' : ''}`}>
                            {score.toFixed(1)}
                          </span>
                          <div className="text-xs text-gray-400">{renderSterne(score)}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="p-4 text-sm text-gray-600 font-medium">Mängel</td>
                  {verglicheneHeime.map(h => (
                    <td key={h.id} className="p-4 text-center">
                      <span className={`font-semibold ${(h.qualitaetsberichte[0]?.maengel_anzahl ?? 0) === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {h.qualitaetsberichte[0]?.maengel_anzahl ?? '-'}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 text-sm text-gray-600 font-medium">Kontakt</td>
                  {verglicheneHeime.map(h => (
                    <td key={h.id} className="p-4 text-center">
                      {h.telefon && <a href={`tel:${h.telefon}`} className="text-blue-600 text-sm hover:underline">📞 {h.telefon}</a>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
            Unterstrichene Werte = bestes Ergebnis im Vergleich · Quelle: MDK-Qualitätsberichte §115 SGB XI
          </div>
        </div>
      )}
    </div>
  );
}
