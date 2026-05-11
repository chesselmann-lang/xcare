import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Building2, CreditCard, Shield, Bell } from "lucide-react";

export const metadata = { title: "Einstellungen | xcare Träger" };

export default async function TraegerEinstellungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role, vorname, nachname, email").eq("user_id", user.id).single();
  if (profile?.role !== "traeger") redirect("/");

  const { data: traeger } = await supabase
    .from("traeger_profiles").select("*").eq("profile_id", profile.id).single();
  if (!traeger) redirect("/traeger/onboarding");

  const PLAN_LABEL: Record<string, string> = {
    starter: "Starter (bis 50 Klienten)",
    professional: "Professional (bis 500 Klienten)",
    enterprise: "Enterprise (unbegrenzt)",
  };

  const TYP_LABEL: Record<string, string> = {
    kommune: "Kommune / Gemeinde",
    sozialamt: "Sozialamt / Kreisbehörde",
    wohlfahrt: "Wohlfahrtsverband",
    pflegekasse: "Pflegekasse / GKV",
    sonstiger: "Sonstiger Träger",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-xl font-bold text-gray-900">Einstellungen</h1>

      {/* Organisation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Organisation</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Organisationsname</p>
            <p className="text-gray-800 font-medium">{traeger.organisation}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Trägertyp</p>
            <p className="text-gray-800">{TYP_LABEL[traeger.typ] ?? traeger.typ}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Registriert am</p>
            <p className="text-gray-800">{new Date(traeger.created_at).toLocaleDateString("de-DE")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Verifizierungsstatus</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              traeger.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
            }`}>
              <Shield className="h-3 w-3" />
              {traeger.verified ? "Verifiziert" : "Ausstehend"}
            </span>
          </div>
        </div>
        {!traeger.verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Ihr Konto wird derzeit von unserem Team verifiziert. Sie werden per E-Mail benachrichtigt.
          </div>
        )}
      </div>

      {/* Abonnement */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Abonnement</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{PLAN_LABEL[traeger.abo_plan] ?? traeger.abo_plan}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {traeger.max_klienten} Klienten max. · Aktuelle Auslastung wird im Dashboard angezeigt
            </p>
          </div>
          <button className="text-sm text-blue-600 hover:underline font-medium">
            Upgrade anfragen
          </button>
        </div>
      </div>

      {/* Zugangsdaten */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-gray-800">Konto</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Name</p>
            <p className="text-gray-800">{profile.vorname ? `${profile.vorname} ${profile.nachname ?? ""}`.trim() : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">E-Mail</p>
            <p className="text-gray-800">{profile.email}</p>
          </div>
        </div>
        <a
          href="/einstellungen"
          className="text-sm text-blue-600 hover:underline"
        >
          Passwort & Konto-Einstellungen →
        </a>
      </div>

      {/* API (Enterprise) */}
      {traeger.abo_plan === "enterprise" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">API-Zugang</h2>
          <p className="text-sm text-gray-500">
            Als Enterprise-Kunde haben Sie Zugang zur xcare Behörden-API. Kontaktieren Sie uns für Ihren API-Schlüssel.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-500 border border-gray-200">
            POST https://api.xcare.de/v1/traeger/anspruch-pruefen<br />
            Authorization: Bearer &lt;API_KEY&gt;
          </div>
        </div>
      )}
    </div>
  );
}
