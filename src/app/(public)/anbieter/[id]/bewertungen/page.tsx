import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Star, Calendar, CheckCircle2, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("anbieter")
    .select("name, ort")
    .eq("id", id)
    .single();

  if (!data) return { title: "Bewertungen" };
  return {
    title: `Bewertungen für ${data.name} | xcare`,
    description: `Alle Kundenbewertungen für ${data.name}${data.ort ? ` in ${data.ort}` : ""}. Lesen Sie ehrliche Erfahrungsberichte.`,
  };
}

const STERNE_LABELS: Record<number, string> = {
  5: "Ausgezeichnet",
  4: "Gut",
  3: "Befriedigend",
  2: "Ausreichend",
  1: "Mangelhaft",
};

export default async function AnbieterBewertungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sterne?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const filterSterne = sp.sterne ? parseInt(sp.sterne, 10) : null;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, ort, plz, verifiziert, aktiv")
    .eq("id", id)
    .eq("aktiv", true)
    .single();

  if (!anbieter) notFound();

  // Fetch ALL for distribution + total count
  const { data: allBewertungen } = await supabase
    .from("bewertungen")
    .select("sterne")
    .eq("anbieter_id", id);

  const total = allBewertungen?.length ?? 0;
  const avg = total > 0
    ? (allBewertungen!.reduce((sum, b) => sum + b.sterne, 0) / total)
    : 0;

  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  allBewertungen?.forEach((b) => { dist[b.sterne] = (dist[b.sterne] ?? 0) + 1; });

  // Filtered + paginated query
  let filteredQuery = supabase
    .from("bewertungen")
    .select("id, sterne, kommentar, antwort, antwort_at, created_at, profiles!familie_id(vorname, nachname)", { count: "exact" })
    .eq("anbieter_id", id)
    .order("created_at", { ascending: false });

  if (filterSterne && filterSterne >= 1 && filterSterne <= 5) {
    filteredQuery = filteredQuery.eq("sterne", filterSterne);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: bewertungen, count: filteredCount } = await filteredQuery.range(from, to);

  const totalFiltered = filteredCount ?? 0;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  // URL builder helpers
  const buildUrl = (newPage: number, newSterne?: number | null) => {
    const params = new URLSearchParams();
    const s = newSterne !== undefined ? newSterne : filterSterne;
    if (s) params.set("sterne", String(s));
    if (newPage > 1) params.set("page", String(newPage));
    return `/anbieter/${id}/bewertungen${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/anbieter/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zum Profil
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Bewertungen</h1>
          <p className="text-sm text-[--muted-foreground]">
            {anbieter.name}
            {anbieter.verifiziert && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Verifiziert
              </span>
            )}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[--muted-foreground]">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">Noch keine Bewertungen</p>
            <p className="text-sm">Dieser Anbieter hat noch keine Bewertungen erhalten.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary card */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6 flex-wrap">
                {/* Big score */}
                <div className="text-center shrink-0">
                  <div className="text-5xl font-bold text-[--foreground] mb-1">{avg.toFixed(1)}</div>
                  <SterneDisplay average={avg} count={total} size="md" />
                  <p className="text-xs text-[--muted-foreground] mt-1">{total} Bewertungen</p>
                </div>

                {/* Distribution bars — clickable for filtering */}
                <div className="flex-1 min-w-48 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = dist[star] ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    const isActive = filterSterne === star;
                    return (
                      <Link
                        key={star}
                        href={isActive ? buildUrl(1, null) : buildUrl(1, star)}
                        className={`flex items-center gap-2 text-xs rounded-lg px-1 py-0.5 transition-colors ${isActive ? "bg-amber-50" : "hover:bg-[--muted]"}`}
                      >
                        <span className="w-4 text-right text-[--muted-foreground]">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                        <div className="flex-1 h-2 rounded-full bg-[--muted] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isActive ? "bg-amber-500" : "bg-amber-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`w-6 ${isActive ? "font-semibold text-amber-700" : "text-[--muted-foreground]"}`}>{count}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active star filter chip */}
          {filterSterne && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-[--muted-foreground]">Filter:</span>
              <Link href={buildUrl(1, null)}>
                <Badge className="gap-1 cursor-pointer bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">
                  {filterSterne} <Star className="h-3 w-3 fill-amber-600 text-amber-600" /> — {STERNE_LABELS[filterSterne]}
                  <span className="ml-1 opacity-60">✕</span>
                </Badge>
              </Link>
              <span className="text-xs text-[--muted-foreground]">{totalFiltered} Ergebnis{totalFiltered !== 1 ? "se" : ""}</span>
            </div>
          )}

          {/* Individual reviews */}
          {(bewertungen?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[--muted-foreground]">
                <Star className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p className="font-medium mb-1">Keine {filterSterne}-Stern-Bewertungen</p>
                <Link href={buildUrl(1, null)} className="text-sm text-[--primary] hover:underline">Alle Bewertungen anzeigen</Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bewertungen!.map((b) => {
                const p = b.profiles as { vorname: string | null; nachname: string | null } | null;
                const name = p?.vorname || p?.nachname
                  ? `${p?.vorname ?? ""} ${p?.nachname ?? ""}`.trim()
                  : "Anonym";
                const initial = name.charAt(0).toUpperCase();

                return (
                  <Card key={b.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center text-sm font-semibold shrink-0">
                          {initial}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {STERNE_LABELS[b.sterne] ?? `${b.sterne} Sterne`}
                              </Badge>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                              <Calendar className="h-3 w-3" />
                              {formatDate(b.created_at)}
                            </span>
                          </div>

                          {/* Stars */}
                          <div className="flex gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= b.sterne
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-transparent text-gray-200"
                                }`}
                              />
                            ))}
                          </div>

                          {b.kommentar ? (
                            <p className="text-sm text-[--muted-foreground] leading-relaxed">
                              {b.kommentar}
                            </p>
                          ) : (
                            <p className="text-xs text-[--muted-foreground] italic">Kein Bewertungstext</p>
                          )}

                          {/* Provider reply */}
                          {(b as { antwort?: string | null; antwort_at?: string | null }).antwort && (
                            <div className="mt-3 pl-3 border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg py-2 pr-2">
                              <p className="text-xs font-semibold text-blue-700 mb-0.5 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                Antwort des Anbieters
                                {(b as { antwort_at?: string | null }).antwort_at && (
                                  <span className="font-normal text-blue-400 ml-1">
                                    · {formatDate((b as { antwort_at: string }).antwort_at)}
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {(b as { antwort: string }).antwort}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 ? (
                <Link href={buildUrl(page - 1)}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" /> Zurück
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled className="gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" /> Zurück
                </Button>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                    return (
                      <Link key={p} href={buildUrl(p)}>
                        <button
                          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-[--primary] text-white"
                              : "hover:bg-[--muted] text-[--muted-foreground]"
                          }`}
                        >
                          {p}
                        </button>
                      </Link>
                    );
                  }
                  if (Math.abs(p - page) === 2) {
                    return <span key={p} className="text-[--muted-foreground] text-sm">…</span>;
                  }
                  return null;
                })}
              </div>

              {page < totalPages ? (
                <Link href={buildUrl(page + 1)}>
                  <Button variant="outline" size="sm" className="gap-1">
                    Weiter <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled className="gap-1">
                  Weiter <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <p className="text-center text-xs text-[--muted-foreground] mt-3">
              Seite {page} von {totalPages} · {totalFiltered} Bewertungen
            </p>
          )}
        </>
      )}
    </div>
  );
}
