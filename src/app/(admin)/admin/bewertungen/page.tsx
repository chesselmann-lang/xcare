import { redirect } from "next/navigation";
import Link from "next/link";
import { Star, AlertTriangle, Building2, User, Calendar, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { BewertungModerationActions } from "./bewertung-moderation-actions";

export const metadata = { title: "Bewertungen moderieren — xcare Admin" };

function SterneBadge({ sterne }: { sterne: number }) {
  const color =
    sterne >= 4 ? "text-green-700 bg-green-50 border-green-200" :
    sterne === 3 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      <Star className="h-3 w-3 fill-current" />
      {sterne}
    </span>
  );
}

export default async function BewertungenModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { filter = "alle", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const PAGE_SIZE = 25;
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Secondary guard (layout is primary): role=admin or ADMIN_EMAIL fallback
  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  const adminEmail = process.env.ADMIN_EMAIL ?? "christian@whatsdigital.de";
  if (adminProfile?.role !== "admin" && user.email !== adminEmail) redirect("/");

  // Base query
  let query = supabase
    .from("bewertungen")
    .select(
      "id, sterne, kommentar, created_at, gemeldet, anbieter_id, " +
      "anbieter(name), profiles!familie_id(vorname, nachname)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filter === "niedrig") query = query.lte("sterne", 2);
  if (filter === "gemeldet") query = query.eq("gemeldet", true);
  if (filter === "ohne_kommentar") query = query.is("kommentar", null);

  const { data: bewertungen, count } = await query;

  // Summary stats
  const [
    { count: gesamt },
    { count: gemeldetCount },
    { count: niedrigCount },
  ] = await Promise.all([
    supabase.from("bewertungen").select("*", { count: "exact", head: true }),
    supabase.from("bewertungen").select("*", { count: "exact", head: true }).eq("gemeldet", true),
    supabase.from("bewertungen").select("*", { count: "exact", head: true }).lte("sterne", 2),
  ]);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const filters = [
    { key: "alle", label: "Alle", count: gesamt ?? 0 },
    { key: "gemeldet", label: "⚑ Gemeldet", count: gemeldetCount ?? 0 },
    { key: "niedrig", label: "★ 1–2 Sterne", count: niedrigCount ?? 0 },
    { key: "ohne_kommentar", label: "Ohne Kommentar", count: null },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            Bewertungen moderieren
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {gesamt ?? 0} Bewertungen gesamt
            {(gemeldetCount ?? 0) > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {gemeldetCount} gemeldet
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/admin/bewertungen?filter=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {f.label}
            {f.count !== null && (
              <span className={`ml-1.5 text-xs ${filter === f.key ? "text-gray-300" : "text-gray-400"}`}>
                ({f.count})
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bewertung</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Anbieter</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Familie</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Datum</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(bewertungen ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  Keine Bewertungen in dieser Kategorie
                </td>
              </tr>
            )}
            {(bewertungen ?? []).map((b) => {
              const anbieter = b.anbieter as { name: string } | null;
              const familie = b.profiles as { vorname: string | null; nachname: string | null } | null;
              return (
                <tr key={b.id} className={`hover:bg-gray-50 transition-colors ${b.gemeldet ? "bg-red-50/40" : ""}`}>
                  {/* Bewertung */}
                  <td className="px-4 py-4 max-w-xs">
                    <div className="flex items-start gap-2">
                      <SterneBadge sterne={b.sterne} />
                      {b.gemeldet && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 border border-red-200 text-red-700">
                          <AlertTriangle className="h-2.5 w-2.5" /> Gemeldet
                        </span>
                      )}
                    </div>
                    {b.kommentar ? (
                      <p className="mt-1.5 text-gray-700 text-xs leading-relaxed line-clamp-3">
                        {b.kommentar}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-gray-400 text-xs italic">Kein Kommentar</p>
                    )}
                  </td>

                  {/* Anbieter */}
                  <td className="px-4 py-4">
                    {anbieter ? (
                      <Link
                        href={`/admin/anbieter/${b.anbieter_id}`}
                        className="flex items-center gap-1.5 text-blue-600 hover:underline text-xs font-medium"
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {anbieter.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">–</span>
                    )}
                  </td>

                  {/* Familie */}
                  <td className="px-4 py-4">
                    {familie ? (
                      <span className="flex items-center gap-1.5 text-xs text-gray-700">
                        <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {familie.vorname} {familie.nachname}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">–</span>
                    )}
                  </td>

                  {/* Datum */}
                  <td className="px-4 py-4 text-xs text-gray-400 hidden md:table-cell">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(b.created_at)}
                    </span>
                  </td>

                  {/* Aktionen */}
                  <td className="px-4 py-4 text-right">
                    <BewertungModerationActions
                      bewertungId={b.id}
                      anbieter_id={b.anbieter_id}
                      gemeldet={b.gemeldet ?? false}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              Seite {page} von {totalPages} · {count} Einträge
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/bewertungen?filter=${filter}&page=${page - 1}`}
                  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  ← Vorherige
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/bewertungen?filter=${filter}&page=${page + 1}`}
                  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Nächste →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
