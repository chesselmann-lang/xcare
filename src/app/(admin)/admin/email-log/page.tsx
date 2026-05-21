import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Mail, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-Mail-Versand-Log | xcare Admin",
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";

export const dynamic = "force-dynamic";

function formatDate(ts: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(ts));
}

const statusConfig = {
  sent: { label: "Gesendet", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  error: { label: "Fehler", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  skipped: { label: "Übersprungen", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
};

export default async function EmailLogPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; status?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || user.email === ADMIN_EMAIL;
  if (!isAdmin) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = 50;
  const offset = (page - 1) * perPage;
  const templateFilter = sp.template ?? "";
  const statusFilter = sp.status ?? "";

  // Use service role for email_log access
  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let query = sb
    .from("email_log")
    .select("*", { count: "exact" })
    .order("sent_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (templateFilter) query = query.eq("template", templateFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: logs, count, error } = await query;

  // Stats
  const { data: stats } = await sb
    .from("email_log")
    .select("status")
    .gte("sent_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const statCounts = (stats ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Distinct templates for filter dropdown
  const { data: templates } = await sb
    .from("email_log")
    .select("template")
    .order("template");
  const uniqueTemplates = [...new Set((templates ?? []).map((t) => t.template))];

  if (error) {
    // Table might not exist yet if migration hasn't been applied
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">E-Mail-Versand-Log</h1>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Tabelle noch nicht angelegt</p>
          <p>Bitte die Migration <code>20260516000012_email_log.sql</code> in Supabase anwenden.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">E-Mail-Versand-Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Alle von xcare versendeten E-Mails · {count ?? 0} Einträge gesamt
          </p>
        </div>
        <a
          href="/admin/email-log"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </a>
      </div>

      {/* 7-day Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["sent", "error", "skipped"] as const).map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <div key={s} className={`rounded-xl border p-4 ${cfg.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label} (7 Tage)</span>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{statCounts[s] ?? 0}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-3 mb-5">
        <select
          name="template"
          defaultValue={templateFilter}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Alle Templates</option>
          {uniqueTemplates.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">Alle Status</option>
          <option value="sent">Gesendet</option>
          <option value="error">Fehler</option>
          <option value="skipped">Übersprungen</option>
        </select>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Filtern
        </button>
        {(templateFilter || statusFilter) && (
          <a
            href="/admin/email-log"
            className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center"
          >
            Filter zurücksetzen
          </a>
        )}
      </form>

      {/* Table */}
      {(logs ?? []).length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Mail className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Noch keine E-Mails protokolliert</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-medium">Empfänger</th>
                <th className="px-4 py-3 text-left font-medium">Betreff</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Gesendet am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(logs ?? []).map((log) => {
                const sc = statusConfig[log.status as keyof typeof statusConfig] ?? statusConfig.sent;
                const StatusIcon = sc.icon;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[200px] truncate">
                      {log.to_email}
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[280px] truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {log.template}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${sc.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {sc.label}
                        {log.error && (
                          <span className="ml-1 text-red-500" title={log.error}>
                            ⚠
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(log.sent_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-xs text-gray-500">
                Seite {page} von {totalPages} · {count} Einträge
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`?page=${page - 1}${templateFilter ? `&template=${templateFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-white transition-colors"
                  >
                    ← Zurück
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`?page=${page + 1}${templateFilter ? `&template=${templateFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-white transition-colors"
                  >
                    Weiter →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
