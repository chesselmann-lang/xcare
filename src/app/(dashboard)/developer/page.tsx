import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Key, Webhook, BarChart3, BookOpen, Code2, ExternalLink } from "lucide-react";
import { DeveloperPortalClient } from "@/components/developer/DeveloperPortalClient";

export const metadata = { title: "Developer Portal | xcare" };

export default async function DeveloperPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load API keys (prefix + hint only, no full key)
  const { data: keys } = await supabase
    .from("api_keys")
    .select(
      "id, name, key_prefix, key_hint, scopes, rate_limit_per_minute, last_used_at, total_requests, is_active, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Load webhooks
  const { data: webhooks } = await supabase
    .from("api_webhooks")
    .select("id, url, events, is_active, last_triggered_at, failure_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Usage stats: requests today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalRequestsToday = (keys ?? []).reduce((acc, k) => {
    // In a real system you'd query a usage_log table;
    // here we show total_requests as a proxy
    return acc + (k.total_requests as number ?? 0);
  }, 0);

  const totalRequestsAllTime = (keys ?? []).reduce(
    (acc, k) => acc + (k.total_requests as number ?? 0),
    0
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.app";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Code2 className="w-6 h-6 text-[--primary]" />
          Developer Portal
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          API-Keys, Webhooks und Nutzungsstatistiken für die xcare Public API.
        </p>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Aktive API-Keys",
            value: (keys ?? []).filter((k) => k.is_active).length,
            icon: Key,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Anfragen gesamt",
            value: totalRequestsAllTime.toLocaleString("de-DE"),
            icon: BarChart3,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Aktive Webhooks",
            value: (webhooks ?? []).filter((w) => w.is_active).length,
            icon: Webhook,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Docs / API spec link */}
      <div className="flex items-start gap-4 bg-gradient-to-r from-[--primary]/5 to-blue-50 border border-[--primary]/20 rounded-xl p-5">
        <BookOpen className="w-5 h-5 text-[--primary] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">API-Dokumentation</p>
          <p className="text-sm text-gray-600 mt-0.5">
            Vollständige Referenz aller Endpunkte, Authentifizierung und Ratelimiting.
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <a
              href={`${appUrl}/api/v1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[--primary] hover:underline"
            >
              API Root
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[--primary] hover:underline"
            >
              OpenAPI Spec (Swagger)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Interactive client section: keys, webhooks, code examples */}
      <DeveloperPortalClient
        initialKeys={keys ?? []}
        initialWebhooks={webhooks ?? []}
        appUrl={appUrl}
      />
    </div>
  );
}
