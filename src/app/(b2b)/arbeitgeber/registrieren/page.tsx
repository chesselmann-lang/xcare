"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  User,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Zap,
  Briefcase,
  Globe,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1: Firmendaten
  name: string;
  rechtsform: string;
  handelsregister: string;
  ust_id: string;
  strasse: string;
  plz: string;
  ort: string;
  // Step 2: Kontakt
  ansprechpartner_name: string;
  ansprechpartner_email: string;
  ansprechpartner_telefon: string;
  website: string;
  // Step 3: Plan
  plan: "starter" | "business" | "enterprise";
}

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    desc: "Ideal für kleine Teams",
    price: "99 €",
    period: "/ Monat",
    maxMA: 10,
    icon: Zap,
    features: [
      "Bis zu 10 Mitarbeiter",
      "xcare Premium-Zugang für alle MA",
      "E-Mail-Einladungen",
      "Nutzungsberichte",
    ],
    highlight: false,
  },
  {
    id: "business" as const,
    name: "Business",
    desc: "Für wachsende Unternehmen",
    price: "399 €",
    period: "/ Monat",
    maxMA: 50,
    icon: Briefcase,
    features: [
      "Bis zu 50 Mitarbeiter",
      "Alles aus Starter",
      "HR-Dashboard",
      "Prioritäts-Support",
      "Individuelle Onboarding-Hilfe",
    ],
    highlight: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    desc: "Maßgeschneidert für Konzerne",
    price: "Auf Anfrage",
    period: "",
    maxMA: Infinity,
    icon: Globe,
    features: [
      "Unbegrenzte Mitarbeiter",
      "Alles aus Business",
      "SSO / SAML",
      "Dedizierter Account-Manager",
      "SLA-Garantie",
    ],
    highlight: false,
  },
];

const RECHTSFORMEN = [
  "GmbH", "AG", "UG (haftungsbeschränkt)", "GmbH & Co. KG",
  "OHG", "KG", "e.V.", "gGmbH", "Einzelunternehmen", "Sonstige",
];

export default function UnternehmenRegistrierenPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "",
    rechtsform: "",
    handelsregister: "",
    ust_id: "",
    strasse: "",
    plz: "",
    ort: "",
    ansprechpartner_name: "",
    ansprechpartner_email: "",
    ansprechpartner_telefon: "",
    website: "",
    plan: "starter",
  });

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) return form.name.trim().length >= 2 && form.ort.trim().length >= 2;
    if (step === 2)
      return (
        form.ansprechpartner_name.trim().length >= 2 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ansprechpartner_email)
      );
    if (step === 3) return !!form.plan;
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/b2b/registrieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json() as { error?: string; unternehmenId?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Registrierung fehlgeschlagen");
        return;
      }

      setStep(4);
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  const STEPS = [
    { num: 1, label: "Firmendaten" },
    { num: 2, label: "Kontakt" },
    { num: 3, label: "Plan wählen" },
    { num: 4, label: "Bestätigung" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 pb-16 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[--primary] flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900">xcare for Business</span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map(({ num, label }, idx) => (
          <div key={num} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step > num
                    ? "bg-green-500 text-white"
                    : step === num
                    ? "bg-[--primary] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > num ? <CheckCircle className="w-4 h-4" /> : num}
              </div>
              <span
                className={`hidden sm:block text-sm ${
                  step === num ? "font-semibold text-gray-900" : "text-gray-500"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Step 1: Firmendaten */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Firmendaten</h2>
            <p className="text-sm text-gray-500 mb-6">
              Wie heißt Ihr Unternehmen? Diese Daten erscheinen auf Rechnungen.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Muster GmbH"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rechtsform
                  </label>
                  <select
                    value={form.rechtsform}
                    onChange={(e) => update("rechtsform", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                  >
                    <option value="">Bitte wählen</option>
                    {RECHTSFORMEN.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handelsregister
                  </label>
                  <input
                    type="text"
                    value={form.handelsregister}
                    onChange={(e) => update("handelsregister", e.target.value)}
                    placeholder="HRB 12345 Berlin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  USt-IdNr.
                </label>
                <input
                  type="text"
                  value={form.ust_id}
                  onChange={(e) => update("ust_id", e.target.value)}
                  placeholder="DE123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Straße & Hausnummer
                </label>
                <input
                  type="text"
                  value={form.strasse}
                  onChange={(e) => update("strasse", e.target.value)}
                  placeholder="Musterstraße 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ
                  </label>
                  <input
                    type="text"
                    value={form.plz}
                    onChange={(e) => update("plz", e.target.value)}
                    placeholder="10115"
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ort <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ort}
                    onChange={(e) => update("ort", e.target.value)}
                    placeholder="Berlin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Kontakt */}
        {step === 2 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ansprechpartner</h2>
            <p className="text-sm text-gray-500 mb-6">
              Wer ist verantwortlich für das Mitarbeiter-Benefit-Programm?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.ansprechpartner_name}
                  onChange={(e) => update("ansprechpartner_name", e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.ansprechpartner_email}
                  onChange={(e) => update("ansprechpartner_email", e.target.value)}
                  placeholder="hr@muster-gmbh.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={form.ansprechpartner_telefon}
                  onChange={(e) => update("ansprechpartner_telefon", e.target.value)}
                  placeholder="+49 30 12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://www.muster-gmbh.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Plan */}
        {step === 3 && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Plan wählen</h2>
            <p className="text-sm text-gray-500 mb-6">
              Alle Pläne starten mit einer 30-tägigen kostenlosen Testphase.
            </p>
            <div className="space-y-3">
              {PLANS.map(({ id, name, desc, price, period, features, highlight, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => update("plan", id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.plan === id
                      ? "border-[--primary] bg-[--primary]/5"
                      : highlight
                      ? "border-blue-200 bg-blue-50/50 hover:border-blue-300"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          form.plan === id ? "bg-[--primary] text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{name}</p>
                          {highlight && (
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Beliebt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-gray-900">{price}</p>
                      {period && <p className="text-xs text-gray-500">{period}</p>}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Willkommen bei xcare for Business!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Ihr Unternehmen wurde erfolgreich registriert. Sie können jetzt Mitarbeiter einladen und den Benefit-Zugang einrichten.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Ihre Registrierung</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Unternehmen</span>
                <span className="font-medium text-gray-900">{form.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-900 capitalize">{form.plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Testphase</span>
                <span className="font-medium text-green-700">30 Tage kostenlos</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/arbeitgeber/dashboard")}
              className="w-full bg-[--primary] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Zum Dashboard
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="px-8 pb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              disabled={step === 1}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => ((s + 1) as Step))}
                disabled={!canAdvance()}
                className="flex items-center gap-1 bg-[--primary] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !canAdvance()}
                className="flex items-center gap-2 bg-[--primary] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Wird gespeichert…" : "Registrierung abschließen"}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Mit der Registrierung stimmen Sie unseren{" "}
        <a href="/agb" className="underline">AGB</a> und der{" "}
        <a href="/datenschutz" className="underline">Datenschutzerklärung</a> zu.
      </p>
    </div>
  );
}
