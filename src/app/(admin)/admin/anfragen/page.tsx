import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, PackageCheck, ArrowUpDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

const STATUS_CONFIG: Record<AnfrageStatus, { label: string; color: string; icon: React.ElementType }> = {
  offen:          { label: "Offen",         color: "bg-yellow-100 text-yellow-700", icon: Clock },
  in_bearbeitung: { label: "In Bearbeitung", color: "bg-blue-100 text-blue-700",    icon: AlertCircle },
  angeboten:      { label: "Angeboten",      color: "bg-purple-100 text-purple-700", icon: PackageCheck },
  bestaetigt:     { label: "Bestätigt",      color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  abgelehnt:      { label: "Abgelehnt",      color: "bg-red-100 text-red-700",      icon: XCircle },
  abgeschlossen:  { label: "Abgeschlossen",  color: "bg-gray-100 text-gray-600",    icon: CheckCircle2 },
};

const LEBENSLAGE_LABELS: Record<string, string> = {
  geburt_fruehe_kindheit:    "Geburt & Kindheit",
  schulkind_jugend:          "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung",
  erwerbsleben_vereinbarkeit:"Erwerbsleben",
  krankheit_genesung:        "Krankheit",
  alter_pflege:              "Alter & Pflege",
  hospiz_palliativ:          "Hospiz",
  trauer_nachlass:           "Trauer",
};

export default async function AdminAnfragenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const pageSize = 30;
  const offset = (page - 1) * pageSize;

  const supabase = await createClient();

  let query = supabase
    .from("anfragen")
    .select(`
      id, status, lebenslage, beschreibung, created_at, updated_at,
      familie:profiles!familie_id(vorname, nachname),
      anbieter(name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status && status !== "alle") {
    query = query.eq("status", status);
  }

  const { data: anfragen, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  // Summary counts
  const { data: counts } = await supabase
    .from("anfragen")
    .select("status");

  const statusCounts = (counts ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const gesamt = counts?.length ?? 0;
  const bestaetigtCount = statusCounts["bestaetigt"] ?? 0;
  const offenCount = statusCounts["offen"] ?? 0;
  const convRate = gesamt > 0 ? ((bestaetigtCount / gesamt) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anfragen-Übersicht</h1>
          <p className="text-gray-500 text-sm mt-0.5">Alle Anfragen auf der Plattform · {gesamt} gesamt</p>
        </div>
        <a
          href="/api/admin/anfragen-export"
          className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          CSV exportieren
        </a>
      </div>

      {/* Funnel KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Gesamt",         value: gesamt,                           color: "bg-gray-100 text-gray-700" },
          { label: "Offen",          value: offenCount,                       color: "bg-yellow-100 text-yellow-700" },
          { label: "In Bearbeitung", value: statusCounts["in_bearbeitung"] ?? 0, color: "bg-blue-100 text-blue-700" },
          { label: "Angeboten",      value: statusCounts["angeboten"] ?? 0,   color: "bg-purple-100 text-purple-700" },
          { label: "Bestätigt",      value: bestaetigtCount,                  color: "bg-green-100 text-green-700" },
          { label: "Conversion",     value: `${convRate}%`,                   color: "bg-teal-100 text-teal-700" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl px-4 py-3 ${kpi.color}`}>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs font-medium opacity-80">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Status-Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[{ value: "alle", label: "Alle", count: counts?.length ?? 0 },
          ...Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
            value,
            label: cfg.label,
            count: statusCounts[value] ?? 0,
          }))
        ].map(({ value, label, count: cnt }) => (
          <Link
            key={value}
            href={`/admin/anfragen?status=${value}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (status ?? "alle") === value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              (status ?? "alle") === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {cnt}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Familie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Anbieter</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lebenslage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktualisiert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(anfragen ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Keine Anfragen gefunden.
                  </td>
                </tr>
              )}
              {(anfragen ?? []).map((a) => {
                const cfg = STATUS_CONFIG[a.status as AnfrageStatus] ?? STATUS_CONFIG.offen;
                const StatusIcon = cfg.icon;
                const familie = a.familie as { vorname: string | null; nachname: string | null } | null;
                const anbieter = a.anbieter as { name: string } | null;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      <Link href={`/admin/anfragen/${a.id}`} className="block group-hover:text-gray-900">
                        {formatDate(a.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <Link href={`/admin/anfragen/${a.id}`} className="block group-hover:text-black">
                        {familie ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() || "—" : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <Link href={`/admin/anfragen/${a.id}`} className="block">
                        {anbieter?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs">
                      <Link href={`/admin/anfragen/${a.id}`} className="block">
                        {LEBENSLAGE_LABELS[a.lebenslage] ?? a.lebenslage.replace(/_/g, " ")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/anfragen/${a.id}`} className="block">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      <Link href={`/admin/anfragen/${a.id}`} className="block">
                        {formatDate(a.updated_at)}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{count} Anfragen gesamt</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/anfragen?status=${status ?? "alle"}&page=${p}`}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
