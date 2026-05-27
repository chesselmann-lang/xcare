'use client';

import { useState } from 'react';
import { WIZARD_STEPS, VERFUEGUNGEN_LABELS, STERBEORT_OPTIONS, berechneVervollstaendigung, SterbensortOption } from '@/lib/acp/wizard';

interface PV {
  vollstaendiger_name?: string;
  geburtsdatum?: string;
  vertrauensperson_name?: string;
  vertrauensperson_telefon?: string;
  vertrauensperson_relation?: string;
  verfuegungen?: Record<string, boolean | null>;
  wuensche_sterbeprozess?: string;
  ort_des_sterbens?: SterbensortOption;
  sonstige_wuensche?: string;
  unterschrift_datum?: string;
  status?: string;
}

interface VV {
  bevollmaechtigte_name?: string;
  bevollmaechtigte_telefon?: string;
  gesundheit?: boolean;
  aufenthalt?: boolean;
  finanzen?: boolean;
  post_und_kommunikation?: boolean;
  status?: string;
}

interface Props {
  initialPV: PV | null;
  initialVV: VV | null;
}

const TOGGLE_3: Record<string, string> = {
  null: 'Nicht festgelegt',
  true: 'Gewünscht',
  false: 'Nicht gewünscht',
};

export default function AdvancedCarePlanningClient({ initialPV, initialVV }: Props) {
  const [activeTab, setActiveTab] = useState<'pv' | 'vv' | 'info'>('pv');
  const [step, setStep] = useState(0);
  const [pv, setPV] = useState<PV>(initialPV ?? { verfuegungen: {} });
  const [vv, setVV] = useState<VV>(initialVV ?? { gesundheit: true, aufenthalt: true });
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const vervollstaendigung = berechneVervollstaendigung({
    vollstaendiger_name: pv.vollstaendiger_name,
    vertrauensperson_name: pv.vertrauensperson_name,
    verfuegungen: pv.verfuegungen as Record<string, boolean | null>,
    ort_des_sterbens: pv.ort_des_sterbens,
    unterschrift_datum: pv.unterschrift_datum,
  });

  async function speichern(typ: 'patientenverfuegung' | 'vorsorgevollmacht') {
    setSaving(true);
    const daten = typ === 'patientenverfuegung' ? pv : vv;
    const res = await fetch('/api/acp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typ, daten }),
    });
    if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); }
    setSaving(false);
  }

  function toggleVerfuegung(key: string) {
    const current = (pv.verfuegungen ?? {})[key];
    const next = current === null || current === undefined ? true : current === true ? false : null;
    setPV(p => ({ ...p, verfuegungen: { ...p.verfuegungen, [key]: next } }));
  }

  const currentStep = WIZARD_STEPS[step];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Advance Care Planning</h1>
        <p className="text-gray-500 text-sm mt-1">Patientenverfügung · Vorsorgevollmacht · Digitale Vorsorge</p>

        {/* Fortschritt */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-white rounded-full h-2 border border-purple-100">
            <div
              className="h-2 rounded-full bg-purple-500 transition-all"
              style={{ width: `${vervollstaendigung}%` }}
            />
          </div>
          <span className="text-sm font-medium text-purple-700">{vervollstaendigung}% vollständig</span>
        </div>
        {pv.status === 'fertiggestellt' && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            ✓ Fertiggestellt
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          ['pv', '📋 Patientenverfügung'],
          ['vv', '📜 Vorsorgevollmacht'],
          ['info', 'ℹ️ Information'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {saveOk && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          ✓ Gespeichert!
        </div>
      )}

      {/* PV Wizard */}
      {activeTab === 'pv' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Step nav */}
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
            {WIZARD_STEPS.map((s, i) => (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-medium transition-colors ${i === step ? 'bg-white border-b-2 border-purple-500 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}>
                {s.icon} {s.title}
              </button>
            ))}
          </div>

          <div className="p-6">
            {step === 0 && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-semibold text-gray-900">Was ist eine Patientenverfügung?</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Eine Patientenverfügung ist eine schriftliche Erklärung, in der Sie für den Fall Ihrer Entscheidungsunfähigkeit
                  im Voraus festlegen, in welche medizinischen Maßnahmen Sie einwilligen oder diese ablehnen.
                </p>
                <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800">
                  <div className="font-medium mb-2">⚖️ Rechtliche Grundlage</div>
                  <p>Die Patientenverfügung ist in §1827 BGB (früher §1901a) rechtlich geregelt und für Ärzte und Betreuer verbindlich.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['📋', 'Schriftliche Form', 'Handschriftlich oder maschinell, mit Datum und Unterschrift'],
                    ['🔄', 'Jederzeit widerrufbar', 'Formlos, mündlich oder durch Vernichtung des Dokuments'],
                    ['👨‍⚕️', 'Arzt informieren', 'Hinterlegen Sie eine Kopie bei Ihrem Hausarzt'],
                    ['🔔', 'Regelmäßig aktualisieren', 'Bestätigen Sie die Gültigkeit alle 1–2 Jahre'],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-lg mb-1">{icon}</div>
                      <div className="text-xs font-medium text-gray-900">{title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(1)} className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700">
                  Jetzt ausfüllen →
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-semibold text-gray-900">Persönliche Daten</h2>
                {[
                  { label: 'Vollständiger Name', key: 'vollstaendiger_name', type: 'text', placeholder: 'Vor- und Nachname' },
                  { label: 'Geburtsdatum', key: 'geburtsdatum', type: 'date', placeholder: '' },
                  { label: 'Geburtsort', key: 'geburtsort', type: 'text', placeholder: 'Stadt' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} value={(pv as Record<string, string>)[f.key] ?? ''} placeholder={f.placeholder}
                      onChange={e => setPV(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-semibold text-gray-900">Vertrauensperson</h2>
                <p className="text-sm text-gray-500">Diese Person setzt Ihre Wünsche durch, wenn Sie selbst nicht sprechen können.</p>
                {[
                  { label: 'Name', key: 'vertrauensperson_name', placeholder: 'Vollständiger Name' },
                  { label: 'Telefon', key: 'vertrauensperson_telefon', placeholder: 'Telefonnummer' },
                  { label: 'Beziehung', key: 'vertrauensperson_relation', placeholder: 'z. B. Ehepartner, Kind, Freund' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="text" value={(pv as Record<string, string>)[f.key] ?? ''} placeholder={f.placeholder}
                      onChange={e => setPV(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 max-w-2xl">
                <h2 className="text-lg font-semibold text-gray-900">Medizinische Verfügungen</h2>
                <p className="text-sm text-gray-500">Klicken Sie auf die Schaltfläche, um Ihren Wunsch festzulegen.</p>
                {Object.entries(VERFUEGUNGEN_LABELS).map(([key, { label, info }]) => {
                  const val = (pv.verfuegungen ?? {})[key];
                  const display = val === null || val === undefined ? 'null' : val.toString();
                  return (
                    <div key={key} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{info}</div>
                        </div>
                        <button onClick={() => toggleVerfuegung(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all min-w-32 text-center ${
                            display === 'true' ? 'bg-green-100 text-green-700 border-green-200' :
                            display === 'false' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                          {TOGGLE_3[display]}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-semibold text-gray-900">Sterbeprozess & Ort</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gewünschter Sterbeort</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STERBEORT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setPV(p => ({ ...p, ort_des_sterbens: opt.value }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${pv.ort_des_sterbens === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl">{opt.icon}</div>
                        <div className="text-xs font-medium mt-1">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wünsche zum Sterbeprozess</label>
                  <textarea
                    value={pv.wuensche_sterbeprozess ?? ''}
                    onChange={e => setPV(p => ({ ...p, wuensche_sterbeprozess: e.target.value }))}
                    rows={4}
                    placeholder="z. B. Ich wünsche mir Musik, die Anwesenheit meiner Familie, keine fremden Personen im Zimmer …"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sonstige Wünsche</label>
                  <textarea
                    value={pv.sonstige_wuensche ?? ''}
                    onChange={e => setPV(p => ({ ...p, sonstige_wuensche: e.target.value }))}
                    rows={3}
                    placeholder="z. B. Bestattungswünsche, religiöse Begleitung …"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-semibold text-gray-900">Abschluss & Speichern</h2>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium">{pv.vollstaendiger_name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Vertrauensperson:</span><span className="font-medium">{pv.vertrauensperson_name || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sterbeort:</span><span className="font-medium">{STERBEORT_OPTIONS.find(o => o.value === pv.ort_des_sterbens)?.label || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Vollständigkeit:</span><span className="font-medium text-purple-700">{vervollstaendigung}%</span></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum der Unterzeichnung</label>
                  <input type="date" value={pv.unterschrift_datum ?? ''}
                    onChange={e => setPV(p => ({ ...p, unterschrift_datum: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  ⚠️ Bitte drucken, handschriftlich unterschreiben und eine Kopie beim Hausarzt hinterlegen.
                  Zusätzlich können Sie das Dokument im Zentralen Vorsorgeregister der Bundesnotarkammer registrieren.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => speichern('patientenverfuegung')} disabled={saving}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50">
                    {saving ? 'Speichert …' : '💾 Speichern'}
                  </button>
                  <button onClick={() => setPV(p => ({ ...p, status: 'fertiggestellt' }))}
                    className="flex-1 border-2 border-purple-200 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-50">
                    ✓ Als fertiggestellt markieren
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">
                ← Zurück
              </button>
              {step < WIZARD_STEPS.length - 1 && (
                <button onClick={() => { setStep(s => s + 1); speichern('patientenverfuegung'); }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                  Weiter & Speichern →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vorsorgevollmacht */}
      {activeTab === 'vv' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Vorsorgevollmacht</h2>
          <p className="text-sm text-gray-500">
            Mit einer Vorsorgevollmacht bevollmächtigen Sie eine Person Ihres Vertrauens, in Ihrem Namen zu handeln,
            wenn Sie selbst nicht mehr entscheiden können.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name des Bevollmächtigten *</label>
            <input value={vv.bevollmaechtigte_name ?? ''}
              onChange={e => setVV(v => ({ ...v, bevollmaechtigte_name: e.target.value }))}
              placeholder="Vollständiger Name"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input value={vv.bevollmaechtigte_telefon ?? ''}
              onChange={e => setVV(v => ({ ...v, bevollmaechtigte_telefon: e.target.value }))}
              placeholder="Telefonnummer"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vollmacht-Umfang</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['gesundheit', '🏥 Gesundheitsfürsorge'],
                ['aufenthalt', '🏠 Aufenthaltsbestimmung'],
                ['finanzen', '💰 Vermögensangelegenheiten'],
                ['post_und_kommunikation', '📬 Post & Kommunikation'],
              ] as const).map(([key, label]) => (
                <button key={key}
                  onClick={() => setVV(v => ({ ...v, [key]: !(v as Record<string, boolean>)[key] }))}
                  className={`p-3 rounded-xl border-2 text-left text-sm transition-all ${(vv as Record<string, boolean>)[key] ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => speichern('vorsorgevollmacht')} disabled={saving || !vv.bevollmaechtigte_name}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50">
            {saving ? 'Speichert …' : '💾 Vorsorgevollmacht speichern'}
          </button>
        </div>
      )}

      {/* Info */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Wichtige Informationen</h2>
          {[
            ['Zentrales Vorsorgeregister', 'Die Bundesnotarkammer führt das Zentrale Vorsorgeregister (ZVR). Dort können Sie Ihre Dokumente registrieren lassen, damit sie im Ernstfall gefunden werden.', 'https://www.vorsorgeregister.de'],
            ['Patientenverfügung – BMJ', 'Das Bundesministerium der Justiz stellt kostenlose Musterformulare für Patientenverfügungen zur Verfügung.', 'https://www.bmj.de/patientenverfuegung'],
            ['Beratung durch Verbraucherzentrale', 'Die Verbraucherzentralen bieten persönliche Beratung zu Vorsorgedokumenten an.', 'https://www.verbraucherzentrale.de'],
          ].map(([title, desc, url]) => (
            <div key={title} className="border border-gray-100 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                Mehr erfahren →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
