"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Building2,
  ArrowRight,
  CheckCircle,
  Upload,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";

const TYPEN = [
  { value: "kommune", label: "Kommune / Gemeinde" },
  { value: "sozialamt", label: "Sozialamt / Kreisbehörde" },
  { value: "wohlfahrt", label: "Wohlfahrtsverband" },
  { value: "pflegekasse", label: "Pflegekasse / GKV" },
  { value: "sonstiger", label: "Sonstiger Träger" },
];

const PLAENE = [
  {
    value: "starter",
    label: "Starter",
    beschreibung: "Bis 50 Klienten, Einzelprüfung",
    preis: "Kostenlos",
    features: ["50 Klienten", "Einzelprüfung", "Basis-Dashboard"],
  },
  {
    value: "professional",
    label: "Professional",
    beschreibung: "Bis 500 Klienten, CSV-Massenupload",
    preis: "149 €/Monat",
    features: ["500 Klienten", "CSV-Massenupload", "API-Zugang", "Prioritäts-Support"],
    highlighted: true,
  },
  {
    value: "enterprise",
    label: "Enterprise",
    beschreibung: "Unbegrenzt, API-Zugang, White-Label",
    preis: "Auf Anfrage",
    features: ["Unbegrenzte Klienten", "REST-API", "White-Label", "Dedizierter CSM"],
  },
];

const STEP_LABELS = ["Organisation", "Abonnement", "Bestätigung", "Erste Schritte"];

export default function TraegerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [trägerId, setTrägerId] = useState<string | null>(null);
  const [form, setForm] = useState({
    organisation: "",
    typ: "sozialamt",
    abo_plan: "starter",
    ansprechpartner_name: "",
    ansprechpartner_email: "",
  });

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleCreate = async () => {
    if (!form.organisation.trim()) {
      toast.error("Bitte geben Sie den Organisationsnamen an");
      return;
    }
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nicht angemeldet");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!profile) {
      toast.error("Profil nicht gefunden");
      setSaving(false);
      return;
    }

    const maxKlienten: Record<string, number> = {
      starter: 50,
      professional: 500,
      enterprise: 9999,
    };

    const { data: newTraeger, error } = await supabase
      .from("traeger_profiles")
      .insert({
        profile_id: profile.id,
        organisation: form.organisation.trim(),
        typ: form.typ,
        abo_plan: form.abo_plan,
        max_klienten: maxKlienten[form.abo_plan] ?? 50,
        verified: false,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
      setSaving(false);
      return;
    }

    setTrägerId(newTraeger.id);
    toast.success("Träger-Profil angelegt!");
    setSaving(false);
    setStep(4);
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
        <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step > s
                        ? "bg-green-500 text-white"
                        : step === s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  <span className="text-[10px] text-gray-500 hidden sm:block">{label}</span>
                </div>
                {s < STEP_LABELS.length && (
                  <div
                    className={`w-8 h-0.5 mb-3 ${
                      step > s ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* ── Step 1: Organisation ─────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Organisation</h2>
                <p className="text-sm text-gray-500">Grunddaten Ihrer Einrichtung</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisationsname *
                </label>
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
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ansprechpartner{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
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

          {/* ── Step 2: Plan ──────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Abonnement wählen
                </h2>
                <p className="text-sm text-gray-500">Sie können jederzeit upgraden</p>
              </div>
              <div className="space-y-3">
                {PLAENE.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.abo_plan === p.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${p.highlighted ? "relative" : ""}`}
                  >
                    {p.highlighted && (
                      <span className="absolute -top-2 right-3 bg-blue-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                        Empfohlen
                      </span>
                    )}
                    <input
                      type="radio"
                      name="abo_plan"
                      value={p.value}
                      checked={form.abo_plan === p.value}
                      onChange={(e) => set("abo_plan", e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">{p.label}</p>
                        <span className="text-sm font-medium text-blue-700">{p.preis}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{p.beschreibung}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {p.features.map((f) => (
                          <span key={f} className="flex items-center gap-1 text-xs text-gray-500">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Bestätigung ───────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Bestätigung</h2>
                <p className="text-sm text-gray-500">Überprüfen Sie Ihre Angaben</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Organisation</span>
                  <span className="font-medium text-gray-900">{form.organisation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trägertyp</span>
                  <span className="font-medium text-gray-900">
                    {TYPEN.find((t) => t.value === form.typ)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Abonnement</span>
                  <span className="font-medium text-gray-900">
                    {PLAENE.find((p) => p.value === form.abo_plan)?.label}
                  </span>
                </div>
                {form.ansprechpartner_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ansprechpartner</span>
                    <span className="font-medium text-gray-900">
                      {form.ansprechpartner_name}
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Hinweis:</strong> Ihr Konto wird nach der Einrichtung von unserem
                Team verifiziert. Sie erhalten eine E-Mail-Benachrichtigung.
              </div>
            </div>
          )}

          {/* ── Step 4: Erste Schritte ────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center pt-2">
                <div className="inline-flex p-3 bg-green-50 rounded-2xl mb-3">
                  <Sparkles className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Konto erfolgreich eingerichtet!
                </h2>
                <p className="text-sm text-gray-500">
                  Wählen Sie Ihren nächsten Schritt:
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/traeger/klienten/neu")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Ersten Klienten anlegen</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Individuelle Anspruchsprüfung für einen Klienten starten
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
                </button>

                {form.abo_plan !== "starter" && (
                  <button
                    onClick={() => router.push("/traeger/massenpruefung")}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="p-2 bg-purple-50 rounded-lg shrink-0">
                      <Upload className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Massenprüfung starten</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        CSV-Datei hochladen und alle Klienten auf einmal prüfen
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
                  </button>
                )}

                <button
                  onClick={() => router.push("/traeger/dashboard")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Zum Dashboard</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Überblick über Ihre Klienten und Statistiken
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────── */}
          {step < 4 && (
            <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Zurück
                </button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !form.organisation.trim()) {
                      toast.error("Bitte geben Sie den Organisationsnamen an");
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Weiter <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Wird erstellt…" : "Konto einrichten"}
                  {!saving && <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
