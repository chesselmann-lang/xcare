"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Heart, ChevronRight, ChevronLeft, CheckCircle2,
  User, Building2, MapPin, Bell, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface OnboardingWizardProps {
  profileId: string;
  role: "familie" | "anbieter";
  vorname: string;
  nachname: string;
  anbieter: { id: string; name: string | null; beschreibung: string | null } | null;
}

// ── Steps ──────────────────────────────────────────────────────────────────

type FamilieStep = "begruessung" | "profil" | "beduerfnisse" | "benachrichtigungen" | "fertig";
type AnbieterStep = "begruessung" | "kontakt" | "beschreibung" | "benachrichtigungen" | "fertig";

const FAMILIE_STEPS: FamilieStep[] = ["begruessung", "profil", "beduerfnisse", "benachrichtigungen", "fertig"];
const ANBIETER_STEPS: AnbieterStep[] = ["begruessung", "kontakt", "beschreibung", "benachrichtigungen", "fertig"];

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all ${
            i < current ? "bg-[--primary]" : i === current ? "bg-[--primary]/50" : "bg-gray-100"
          }`}
        />
      ))}
    </div>
  );
}

// ── Wizard ──────────────────────────────────────────────────────────────────

export function OnboardingWizard({ profileId, role, vorname: initialVorname, nachname: initialNachname, anbieter }: OnboardingWizardProps) {
  const router = useRouter();
  const supabase = createClient();

  // Shared state
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Familie fields
  const [vorname, setVorname] = useState(initialVorname);
  const [nachname, setNachname] = useState(initialNachname);
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [telefon, setTelefon] = useState("");

  // Anbieter fields
  const [anbieterName, setAnbieterName] = useState(anbieter?.name ?? "");
  const [beschreibung, setBeschreibung] = useState(anbieter?.beschreibung ?? "");
  const [telefon2, setTelefon2] = useState("");
  const [website, setWebsite] = useState("");

  // Shared
  const [emailAnfragen, setEmailAnfragen] = useState(true);
  const [emailNachrichten, setEmailNachrichten] = useState(true);

  const steps = role === "familie" ? FAMILIE_STEPS : ANBIETER_STEPS;
  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const finish = async () => {
    setSaving(true);
    try {
      // Save profile
      await supabase.from("profiles").update({
        vorname, nachname, plz: plz || null, ort: ort || null,
        telefon: (role === "familie" ? telefon : telefon2) || null,
        onboarding_done: true,
      }).eq("id", profileId);

      // Save anbieter if applicable
      if (role === "anbieter" && anbieter) {
        await supabase.from("anbieter").update({
          name: anbieterName,
          beschreibung: beschreibung || null,
          telefon: telefon2 || null,
          website: website || null,
        }).eq("id", anbieter.id);
      }

      // Save notification prefs
      await supabase.from("notification_preferences").upsert({
        profile_id: profileId,
        email_anfragen: emailAnfragen,
        email_nachrichten: emailNachrichten,
        email_statusupdate: true,
        email_wochenbericht: false,
        updated_at: new Date().toISOString(),
      });

      toast.success("Willkommen bei xcare! Ihr Profil ist eingerichtet.");
      router.push(role === "anbieter" ? "/anbieter/dashboard" : "/familie");
      router.refresh();
    } catch {
      toast.error("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span className="text-sm">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${checked ? "bg-[--primary]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-1 left-1 h-4 w-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </div>
    </label>
  );

  // ── Familie Steps ──

  if (role === "familie") {
    if (currentStep === "begruessung") return (
      <Step progress={stepIndex} total={steps.length} title="Herzlich willkommen!" onNext={next}>
        <div className="text-center py-4">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[--primary-light]">
            <Heart className="h-10 w-10 text-[--primary] fill-[--primary]" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Hallo{initialVorname ? `, ${initialVorname}` : ""}!</h2>
          <p className="text-[--muted-foreground] leading-relaxed max-w-sm mx-auto">
            xcare verbindet Sie mit geprüften Pflegediensten, Beratungsstellen und Sozialdienstleistern.
            Lassen Sie uns Ihr Profil in wenigen Schritten einrichten.
          </p>
          <div className="mt-6 flex gap-3 justify-center text-sm text-[--muted-foreground]">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Kostenlos</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Datenschutz</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Kein Spam</span>
          </div>
        </div>
      </Step>
    );

    if (currentStep === "profil") return (
      <Step progress={stepIndex} total={steps.length} title="Ihr Profil" icon={<User className="h-5 w-5" />} onBack={back} onNext={next}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Vorname</label>
              <Input value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max" />
            </div>
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Nachname</label>
              <Input value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Telefon (optional)</label>
            <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+49 30 ..." type="tel" />
          </div>
        </div>
      </Step>
    );

    if (currentStep === "beduerfnisse") return (
      <Step progress={stepIndex} total={steps.length} title="Ihr Standort" icon={<MapPin className="h-5 w-5" />} onBack={back} onNext={next}>
        <div className="space-y-4">
          <p className="text-sm text-[--muted-foreground]">
            Damit wir Ihnen passende Anbieter in Ihrer Nähe zeigen können.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Postleitzahl</label>
              <Input
                value={plz}
                onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="10115"
                maxLength={5}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Ort</label>
              <Input value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="Berlin" />
            </div>
          </div>
        </div>
      </Step>
    );

    if (currentStep === "benachrichtigungen") return (
      <Step progress={stepIndex} total={steps.length} title="Benachrichtigungen" icon={<Bell className="h-5 w-5" />} onBack={back} onNext={next}>
        <div>
          <p className="text-sm text-[--muted-foreground] mb-4">Wählen Sie, worüber Sie per E-Mail informiert werden möchten.</p>
          <div className="divide-y divide-[--border]">
            <Toggle checked={emailAnfragen} onChange={setEmailAnfragen} label="Status-Updates zu Ihren Anfragen" />
            <Toggle checked={emailNachrichten} onChange={setEmailNachrichten} label="Neue Nachrichten von Anbietern" />
          </div>
        </div>
      </Step>
    );

    if (currentStep === "fertig") return (
      <Step progress={stepIndex} total={steps.length} title="Alles bereit!" onNext={finish} nextLabel="Loslegen" saving={saving} isFinish>
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-[--muted-foreground] leading-relaxed">
            Ihr Profil ist eingerichtet. Sie können jetzt Anbieter in Ihrer Nähe suchen und Anfragen stellen.
          </p>
        </div>
      </Step>
    );
  }

  // ── Anbieter Steps ──

  if (currentStep === "begruessung") return (
    <Step progress={stepIndex} total={steps.length} title="Willkommen als Anbieter!" onNext={next}>
      <div className="text-center py-4">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[--primary-light]">
          <Building2 className="h-10 w-10 text-[--primary]" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Ihr Anbieter-Profil</h2>
        <p className="text-[--muted-foreground] leading-relaxed max-w-sm mx-auto">
          Lassen Sie uns Ihren Eintrag einrichten, damit Familien Sie finden und Anfragen stellen können.
        </p>
      </div>
    </Step>
  );

  if (currentStep === "kontakt") return (
    <Step progress={stepIndex} total={steps.length} title="Kontaktdaten" icon={<Building2 className="h-5 w-5" />} onBack={back} onNext={next}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Organisationsname *</label>
          <Input value={anbieterName} onChange={(e) => setAnbieterName(e.target.value)} placeholder="Pflegedienst Muster GmbH" />
        </div>
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Telefon</label>
          <Input value={telefon2} onChange={(e) => setTelefon2(e.target.value)} placeholder="+49 30 ..." type="tel" />
        </div>
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Website</label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" />
        </div>
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Ihr Name (Ansprechpartner)</label>
          <div className="grid grid-cols-2 gap-3">
            <Input value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Max" />
            <Input value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Mustermann" />
          </div>
        </div>
      </div>
    </Step>
  );

  if (currentStep === "beschreibung") return (
    <Step progress={stepIndex} total={steps.length} title="Über Ihre Organisation" onBack={back} onNext={next}>
      <div className="space-y-4">
        <p className="text-sm text-[--muted-foreground]">
          Beschreiben Sie Ihr Angebot, damit Familien verstehen, wie Sie helfen können.
        </p>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value.slice(0, 2000))}
          placeholder="Wir sind ein ambulanter Pflegedienst mit 15-jähriger Erfahrung und bieten..."
          rows={5}
          className="w-full rounded-xl border border-[--input] bg-[--background] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        />
        <p className="text-xs text-[--muted-foreground] text-right">{beschreibung.length}/2000</p>
      </div>
    </Step>
  );

  if (currentStep === "benachrichtigungen") return (
    <Step progress={stepIndex} total={steps.length} title="Benachrichtigungen" icon={<Bell className="h-5 w-5" />} onBack={back} onNext={next}>
      <div>
        <p className="text-sm text-[--muted-foreground] mb-4">Wählen Sie, worüber Sie per E-Mail informiert werden möchten.</p>
        <div className="divide-y divide-[--border]">
          <Toggle checked={emailAnfragen} onChange={setEmailAnfragen} label="Neue Anfragen von Familien" />
          <Toggle checked={emailNachrichten} onChange={setEmailNachrichten} label="Neue Chat-Nachrichten" />
        </div>
      </div>
    </Step>
  );

  if (currentStep === "fertig") return (
    <Step progress={stepIndex} total={steps.length} title="Profil eingerichtet!" onNext={finish} nextLabel="Zum Dashboard" saving={saving} isFinish>
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-[--muted-foreground] leading-relaxed">
          Ihr Anbieter-Profil ist erstellt. Sie können jetzt Ihre Leistungen hinzufügen und Anfragen empfangen.
        </p>
      </div>
    </Step>
  );

  return null;
}

// ── Step Wrapper ──

function Step({
  progress,
  total,
  title,
  icon,
  children,
  onNext,
  onBack,
  nextLabel = "Weiter",
  saving = false,
  isFinish = false,
}: {
  progress: number;
  total: number;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  saving?: boolean;
  isFinish?: boolean;
}) {
  return (
    <div className="w-full max-w-lg">
      {/* xcare Logo */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-2 font-bold text-[--primary] text-xl">
          <Heart className="h-6 w-6 fill-[--primary]" />
          xcare
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-[--border] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[--primary-light] to-white px-6 pt-6 pb-4">
          <ProgressBar current={progress} total={total} />
          <div className="flex items-center gap-2">
            {icon && <span className="text-[--primary]">{icon}</span>}
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
          <p className="text-xs text-[--muted-foreground] mt-0.5">
            Schritt {progress + 1} von {total}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {children}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Zurück
            </Button>
          )}
          {onNext && (
            <Button onClick={onNext} disabled={saving} className={`gap-1.5 ${!onBack ? "w-full" : "flex-1"}`}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFinish ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4 order-last" />
              )}
              {nextLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Skip */}
      <div className="text-center mt-4">
        <button
          className="text-xs text-[--muted-foreground] hover:text-[--foreground] underline underline-offset-2"
          onClick={onNext}
        >
          Überspringen
        </button>
      </div>
    </div>
  );
}
