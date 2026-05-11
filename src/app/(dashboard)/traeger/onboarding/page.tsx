"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Building2, ArrowRight, CheckCircle } from "lucide-react";

const TYPEN = [
  { value: "kommune", label: "Kommune / Gemeinde" },
  { value: "sozialamt", label: "Sozialamt / Kreisbehörde" },
  { value: "wohlfahrt", label: "Wohlfahrtsverband" },
  { value: "pflegekasse", label: "Pflegekasse / GKV" },
  { value: "sonstiger", label: "Sonstiger Träger" },
];

const PLAENE = [
  { value: "starter", label: "Starter", beschreibung: "Bis 50 Klienten, Einzelprüfung", preis: "0€/Monat" },
  { value: "professional", label: "Professional", beschreibung: "Bis 500 Klienten, CSV-Upload", preis: "149€/Monat" },
  { value: "enterprise", label: "Enterprise", beschreibung: "Unbegrenzt, API-Zugang, White-Label", preis: "Auf Anfrage" },
];

export default function TraegerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    organisation: "",
    typ: "sozialamt",
    abo_plan: "starter",
    max_klienten: "50",
    ansprechpartner_name: "",
    ansprechpartner_email: "",
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.organisation.trim()) {
      toast.error("Bitte geben Sie den Organisationsnamen an");
      return;
    }
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Nicht angemeldet"); setSaving(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) { toast.error("Profil nicht gefunden"); setSaving(false); return; }

    const maxKlienten: Record<string, number> = { starter: 50, professional: 500, enterprise: 9999 };

    const { error } = await supabase.from("traeger_profiles").insert({
      profile_id: profile.id,
      organisation: form.organisation.trim(),
      typ: form.typ,
      abo_plan: form.abo_plan,
      max_klienten: maxKlienten[form.abo_plan] ?? 50,
      verified: false,
    });

    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Träger-Profil angelegt!");
    router.push("/traeger/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-50 rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Träger-Konto einrichten</h1>
          <p className="text-gray-500 mt-2">
            Richten Sie Ihr Profil für die Anspruchsprüfung Ihrer Klienten ein.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > s ? "bg-green-500 text-white" :
                step === s ? "bg-blue-600 text-white" :
                "bg-gray-200 text-gray-500"
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* Step 1: Organisation */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Organisation</h2>
                <p className="text-sm text-gray-500">Grunddaten Ihrer Einrichtung</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsname *</label>
                <input
                  autoFocus
                  value={form.organisation}
                  onChange={(e) => set("organisation", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Sozialamt Musterstadt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trägertyp</label>
                <select
                  value={form.typ}
                  onChange={(e) => set("typ", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TYPEN.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ansprechpartner (optional)</label>
                <input
                  value={form.ansprechpartner_name}
                  onChange={(e) => set("ansprechpartner_name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder="Name"
                />
                <input
                  value={form.ansprechpartner_email}
                  onChange={(e) => set("ansprechpartner_email", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E-Mail-Adresse"
                  type="email"
                />
              </div>
            </div>
          )}

          {/* Step 2: Plan */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Abonnement wählen</h2>
                <p className="text-sm text-gray-500">Sie können jederzeit upgraden</p>
              </div>
              <div className="space-y-3">
                {PLAENE.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.abo_plan === p.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="abo_plan"
                      value={p.value}
                      checked={form.abo_plan === p.value}
                      onChange={(e) => set("abo_plan", e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{p.label}</p>
                      <p className="text-sm text-gray-500">{p.beschreibung}</p>
                    </div>
                    <span className="text-sm font-medium text-blue-700">{p.preis}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Bestätigung */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Bestätigung</h2>
                <p className="text-sm text-gray-500">Überprüfen Sie Ihre Angaben</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Organisation</span>
                  <span className="font-medium text-gray-900">{form.organisation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Typ</span>
                  <span className="font-medium text-gray-900">{TYPEN.find(t => t.value === form.typ)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Abonnement</span>
                  <span className="font-medium text-gray-900">{PLAENE.find(p => p.value === form.abo_plan)?.label}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Hinweis:</strong> Ihr Konto wird nach der Einrichtung von unserem Team verifiziert.
                Sie erhalten eine E-Mail-Benachrichtigung.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Zurück
              </button>
            ) : <div />}
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !form.organisation.trim()) {
                    toast.error("Bitte geben Sie den Organisationsnamen an");
                    return;
                  }
                  setStep(s => s + 1);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Weiter <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Wird erstellt…" : "Konto einrichten"}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
