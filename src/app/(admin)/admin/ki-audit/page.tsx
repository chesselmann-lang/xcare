import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "KI-Audit-Log | xcare Admin" };

export default async function KiAuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  // Letzte 7 Tage Statistik
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recent }, { data: byEndpoint }] = await Promise.all([
    supabase
      .from("ki_audit_log")
      .select("id, endpoint, model_version, tokens_in, tokens_out, latency_ms, success, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ki_audit_log")
      .select("endpoint, tokens_in, tokens_out, latency_ms, success")
      .gte("created_at", since),
  ]);

  // Aggregation nach Endpoint
  type EndpointStats = {
    calls: number;
    errors: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalLatency: number;
  };
  const stats: Record<string, EndpointStats> = {};
  for (const row of byEndpoint ?? []) {
    if (!stats[row.endpoint]) {
      stats[row.endpoint] = { calls: 0, errors: 0, totalTokensIn: 0, totalTokensOut: 0, totalLatency: 0 };
    }
    stats[row.endpoint].calls++;
    if (!row.success) stats[row.endpoint].errors++;
    stats[row.endpoint].totalTokensIn += row.tokens_in ?? 0;
    stats[row.endpoint].totalTokensOut += row.tokens_out ?? 0;
    stats[row.endpoint].totalLatency += row.latency_ms ?? 0;
  }

  const totalCalls = (byEndpoint ?? []).length;
  const totalErrors = (byEndpoint ?? []).filter(r => !r.success).length;
  const totalTokens = (byEndpoint ?? []).reduce((s, r) => s + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KI-Audit-Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          EU AI Act Compliance — alle KI-Aufrufe pseudonymisiert, letzte 7 Tage
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gesamtaufrufe", value: totalCalls.toLocaleString("de") },
          { label: "Fehlerrate", value: totalCalls > 0 ? `${((totalErrors / totalCalls) * 100).toFixed(1)}%` : "0%" },
          { label: "Tokens verbraucht", value: totalTokens.toLocaleString("de") },
          { label: "Fehler", value: totalErrors.toString() },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Nach Endpoint */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Aufrufe nach Endpoint</h2>
        {Object.keys(stats).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine KI-Aufrufe geloggt</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 font-medium">Endpoint</th>
                <th className="pb-2 font-medium text-right">Aufrufe</th>
                <th className="pb-2 font-medium text-right">Fehler</th>
                <th className="pb-2 font-medium text-right">Tokens ∑</th>
                <th className="pb-2 font-medium text-right">Ø Latenz</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([ep, s]) => (
                <tr key={ep} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs text-blue-600">{ep}</td>
                  <td className="py-2 text-right">{s.calls}</td>
                  <td className="py-2 text-right text-red-500">{s.errors}</td>
                  <td className="py-2 text-right">{(s.totalTokensIn + s.totalTokensOut).toLocaleString("de")}</td>
                  <td className="py-2 text-right">{s.calls > 0 ? `${Math.round(s.totalLatency / s.calls)} ms` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Letzte Einträge */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Letzte 100 Aufrufe</h2>
        {(recent ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Einträge</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 font-medium">Zeit</th>
                  <th className="pb-2 font-medium">Endpoint</th>
                  <th className="pb-2 font-medium">Modell</th>
                  <th className="pb-2 font-medium text-right">Tokens</th>
                  <th className="pb-2 font-medium text-right">Latenz</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-400">
                      {new Date(row.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-1.5 font-mono text-blue-600">{row.endpoint}</td>
                    <td className="py-1.5 text-gray-600">{row.model_version}</td>
                    <td className="py-1.5 text-right">{((row.tokens_in ?? 0) + (row.tokens_out ?? 0)).toLocaleString("de")}</td>
                    <td className="py-1.5 text-right">{row.latency_ms ? `${row.latency_ms} ms` : "—"}</td>
                    <td className="py-1.5 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        row.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {row.success ? "OK" : "ERR"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Alle Einträge sind pseudonymisiert. Kein Klartext-Prompt gespeichert. Retention: 90 Tage (EU AI Act §12).
      </p>
    </div>
  );
}
