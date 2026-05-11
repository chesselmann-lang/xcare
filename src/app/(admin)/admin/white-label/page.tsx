import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle, Globe, Palette, Settings } from "lucide-react";

export const metadata = { title: "White-Label | Admin xcare" };

export default async function AdminWhiteLabelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: configs } = await supabase
    .from("white_label_configs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White-Label Partner</h1>
          <p className="text-sm text-gray-500 mt-1">GKV/Versicherungspartner Konfigurationen</p>
        </div>
        <span className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">
          {configs?.length ?? 0} Partner
        </span>
      </div>

      {/* Partner Cards */}
      <div className="grid gap-4">
        {(configs ?? []).map((c) => {
          const features = c.features as Record<string, boolean>;
          const activeFeatures = Object.entries(features).filter(([, v]) => v).length;

          return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                {/* Color Preview */}
                <div
                  className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{ background: c.color_primary }}
                >
                  {c.organisation.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-gray-900">{c.organisation}</h2>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{c.slug}</code>
                    {c.aktiv ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Aktiv</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">Inaktiv</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
                    {c.domain && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {c.domain}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      <span className="font-mono">{c.color_primary}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      {activeFeatures}/{Object.keys(features).length} Features aktiv
                    </span>
                  </div>

                  {/* Feature Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(features).map(([key, enabled]) => (
                      <span
                        key={key}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          enabled ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400 line-through"
                        }`}
                      >
                        {enabled && <CheckCircle className="h-2.5 w-2.5" />}
                        {key.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="flex gap-1.5 shrink-0">
                  {[c.color_primary, c.color_secondary, c.color_accent].map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border border-white shadow-sm"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* API Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Domain-basiertes Theming</h3>
        <p className="text-sm text-gray-600 mb-3">
          White-Label wird automatisch aktiviert, wenn ein Partner über seine eigene Domain zugreift.
          Die Middleware liest den <code className="bg-gray-100 px-1 rounded">Host</code>-Header und
          lädt die passende Konfiguration aus der Datenbank.
        </p>
        <div className="font-mono text-xs bg-white border border-gray-200 rounded-lg p-3 text-gray-700 space-y-1">
          <p className="text-gray-400">// Middleware: src/middleware.ts</p>
          <p>const host = req.headers.get(&apos;host&apos;);</p>
          <p>const config = await getWhiteLabelConfig(host);</p>
          <p>response.headers.set(&apos;x-wl-primary&apos;, config.color_primary);</p>
        </div>
      </div>
    </div>
  );
}
