import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BEHOERDEN_ADAPTER } from "@/lib/behoerden/registry";
import { CheckCircle, ExternalLink, AlertCircle } from "lucide-react";

export const metadata = { title: "Behördenschnittstellen | Admin" };

export default async function AdminBehoerdenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const adapter = Object.entries(BEHOERDEN_ADAPTER).map(([key, a]) => ({
    key,
    name: a.name,
    beschreibung: a.beschreibung,
    rechtsgrundlage: a.rechtsgrundlage,
    api_url_prod: a.api_url_prod,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Behördenschnittstellen</h1>
        <p className="text-sm text-gray-500 mt-1">
          {adapter.length} Priority-1 Adapter — aktuell alle als STUB (Produktionsintegration nach Behörden-Onboarding)
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Stub-Modus aktiv</p>
          <p>Alle Adapter liefern realistische Testdaten. Für den Produktionsbetrieb sind Behörden-PKI-Zertifikate, OSCI-Konten bzw. OAuth-Credentials der jeweiligen Behörde erforderlich.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {adapter.map((a) => (
          <div key={a.key} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h2 className="font-semibold text-gray-900">{a.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">STUB</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{a.beschreibung}</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Rechtsgrundlage: <strong className="text-gray-700">{a.rechtsgrundlage}</strong></span>
                  <span>Adapter-Key: <code className="bg-gray-100 px-1 rounded">{a.key}</code></span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <a
                  href={a.api_url_prod}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Behörde <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={`/api/behoerden/${a.key}?geburtsjahr=1950&pflegegrad=3`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Test-API →
                </a>
              </div>
            </div>
            {/* Integration Roadmap */}
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2">Integrations-Checkliste</p>
              <div className="flex flex-wrap gap-2">
                {["API-Doku beschafft", "PKI/OAuth konfiguriert", "Test-Umgebung", "Produktions-Abnahme"].map((step, i) => (
                  <span key={step} className={`text-xs px-2 py-0.5 rounded-full border ${
                    i === 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
