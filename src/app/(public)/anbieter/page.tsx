import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, CheckCircle2, Star, ChevronRight, Building2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { LeistungsKategorie } from "@/lib/types";

export const revalidate = 3600; // Cache for 1 hour for SEO

const PAGE_SIZE = 24;

const KATEGORIE_FILTER: Array<{ key: LeistungsKategorie | ""; label: string; emoji: string }> = [
  { key: "", label: "Alle Anbieter", emoji: "🏥" },
  { key: "pflege_ambulant", label: "Ambulante Pflege", emoji: "🏠" },
  { key: "tagespflege", label: "Tagespflege", emoji: "☀️" },
  { key: "kurzzeitpflege", label: "Kurzzeitpflege", emoji: "🛏️" },
  { key: "pflege_stationaer", label: "Stationäre Pflege", emoji: "🏨" },
  { key: "beratung", label: "Beratung", emoji: "💬" },
  { key: "therapie", label: "Therapie", emoji: "🩺" },
  { key: "haushaltshilfe", label: "Haushaltshilfe", emoji: "🧹" },
  { key: "kinderbetreuung", label: "Kinderbetreuung", emoji: "👶" },
  { key: "jugendhilfe", label: "Jugendhilfe", emoji: "🎒" },
  { key: "eingliederungshilfe", label: "Eingliederungshilfe", emoji: "♿" },
  { key: "hospizdienst", label: "Hospizdienst", emoji: "🕊️" },
  { key: "trauerhilfe", label: "Trauerhilfe", emoji: "🌷" },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ kategorie?: string; seite?: string; q?: string }>;
}): Promise<Metadata> {
  const { kategorie, seite, q } = await searchParams;
  const page = Math.max(1, parseInt(seite ?? "1", 10));
  const kategorieLabel = kategorie
    ? (LEISTUNGSKATEGORIEN[kategorie as LeistungsKategorie] ?? "Anbieter")
    : "Alle Anbieter";

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (kategorie) params.set("kategorie", kategorie);
    if (q) params.set("q", q);
    if (p > 1) params.set("seite", String(p));
    const qs = params.toString();
    return `/anbieter${qs ? `?${qs}` : ""}`;
  };

  const pageTitle = page > 1
    ? `${kategorieLabel} – Seite ${page} | xcare`
    : `${kategorieLabel} – Pflegeanbieter Verzeichnis | xcare`;

  return {
    title: pageTitle,
    description: `Finden Sie ${kategorieLabel.toLowerCase()} in Ihrer Nähe. Das xcare-Verzeichnis listet alle verifizierten Pflegedienste, Beratungsstellen und Sozialeinrichtungen in Deutschland.`,
    openGraph: {
      title: `${kategorieLabel} – xcare Verzeichnis`,
      description: "Alle verifizierten Pflegedienste und Sozialeinrichtungen auf xcare.",
    },
    alternates: {
      canonical: buildUrl(page),
      ...(page > 1 ? { prev: buildUrl(page - 1) } : {}),
      next: buildUrl(page + 1), // Next.js will omit if there's no next page (we always emit but it's acceptable)
    },
    robots: page > 1 ? { index: true, follow: true } : undefined,
  };
}

type AnbieterRow = {
  id: string;
  name: string;
  beschreibung: string | null;
  plz: string | null;
  ort: string | null;
  verifiziert: boolean;
  leistungen: Array<{ kategorie: string }>;
};

export default async function AnbieterVerzeichnisPage({
  searchParams,
}: {
  searchParams: Promise<{ kategorie?: string; seite?: string; q?: string }>;
}) {
  const { kategorie, seite, q } = await searchParams;
  const page = Math.max(1, parseInt(seite ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // When filtering by kategorie: first resolve anbieter IDs that offer this category
  let kategorieAnbieterIds: string[] | null = null;
  if (kategorie) {
    const { data: leistungsRows } = await supabase
      .from("leistungen")
      .select("anbieter_id")
      .eq("kategorie", kategorie)
      .eq("aktiv", true);
    kategorieAnbieterIds = [...new Set((leistungsRows ?? []).map((r) => r.anbieter_id))];
    // If no providers offer this category, short-circuit
    if (kategorieAnbieterIds.length === 0) {
      kategorieAnbieterIds = ["00000000-0000-0000-0000-000000000000"]; // ensures empty result
    }
  }

  // Build base query with server-side pagination
  let query = supabase
    .from("anbieter")
    .select("id, name, beschreibung, plz, ort, verifiziert, leistungen(kategorie)", { count: "exact" })
    .eq("aktiv", true)
    .order("verifiziert", { ascending: false })
    .order("name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(`name.ilike.%${q}%,ort.ilike.%${q}%,plz.ilike.%${q}%`);
  }
  if (kategorieAnbieterIds) {
    query = query.in("id", kategorieAnbieterIds);
  }

  const { data: paginated, count } = await query;

  const totalFiltered = count ?? 0;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  // Batch-fetch ratings for this page
  const ids = (paginated ?? []).map((a) => a.id);
  const bewertungenMap: Record<string, { avg: number; count: number }> = {};

  if (ids.length > 0) {
    const { data: bew } = await supabase
      .from("bewertungen")
      .select("anbieter_id, sterne")
      .in("anbieter_id", ids);

    (bew ?? []).forEach((b: { anbieter_id: string; sterne: number }) => {
      if (!bewertungenMap[b.anbieter_id]) bewertungenMap[b.anbieter_id] = { avg: 0, count: 0 };
      const entry = bewertungenMap[b.anbieter_id];
      entry.count++;
      entry.avg = entry.avg + (b.sterne - entry.avg) / entry.count; // running average
    });
  }

  const verifizierteCount = (paginated ?? []).filter((a) => a.verifiziert).length;
  const kategorieLabel = kategorie
    ? (LEISTUNGSKATEGORIEN[kategorie as LeistungsKategorie] ?? kategorie)
    : "Alle Anbieter";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Startseite", href: "/" },
          { name: "Anbieter-Verzeichnis", href: "/anbieter" },
          ...(kategorie ? [{ name: kategorieLabel, href: `/anbieter?kategorie=${kategorie}` }] : []),
        ]}
      />

      <div className="min-h-screen bg-[--background]">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-[--primary]/8 to-transparent border-b border-[--border]">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center gap-2 text-sm text-[--muted-foreground] mb-3">
              <Link href="/" className="hover:text-[--primary]">Startseite</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Anbieter-Verzeichnis</span>
              {kategorie && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{kategorieLabel}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {kategorie ? kategorieLabel : "Anbieter-Verzeichnis"}
            </h1>
            <p className="text-[--muted-foreground] mb-6 max-w-2xl">
              {kategorie
                ? `Alle verifizierten ${kategorieLabel}-Anbieter auf xcare. Vergleichen Sie Leistungen und nehmen Sie direkt Kontakt auf.`
                : `Alle verifizierten Pflegedienste, Beratungsstellen und Sozialeinrichtungen auf xcare. ${verifizierteCount} verifizierte Anbieter.`}
            </p>

            {/* Search box */}
            <form method="GET" action="/anbieter" className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Name, Ort oder PLZ ..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[--border] bg-[--background] text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                />
                {kategorie && (
                  <input type="hidden" name="kategorie" value={kategorie} />
                )}
              </div>
              <Button type="submit" size="sm" className="rounded-xl px-5">
                Suchen
              </Button>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {KATEGORIE_FILTER.map((opt) => (
              <Link
                key={opt.key}
                href={`/anbieter${opt.key ? `?kategorie=${opt.key}` : ""}${q ? `${opt.key ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  (kategorie ?? "") === opt.key
                    ? "bg-[--primary] text-white border-[--primary] shadow-sm"
                    : "bg-[--background] border-[--border] text-[--muted-foreground] hover:border-[--primary]/50 hover:text-[--foreground]"
                }`}
              >
                <span>{opt.emoji}</span>
                {opt.label}
              </Link>
            ))}
          </div>

          {/* Results meta */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[--muted-foreground]">
              <span className="font-semibold text-[--foreground]">{totalFiltered}</span>{" "}
              Anbieter gefunden
              {q && <span> für „<strong>{q}</strong>"</span>}
              {totalPages > 1 && (
                <span className="ml-1.5 text-xs bg-[--muted] px-2 py-0.5 rounded-full font-medium">
                  Seite {page} / {totalPages}
                </span>
              )}
            </p>
            <Link href="/suche">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Search className="h-3.5 w-3.5" />
                Anbieter suchen (mit PLZ)
              </Button>
            </Link>
          </div>

          {/* Grid */}
          {(paginated ?? []).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {(paginated ?? []).map((anbieter) => {
                const bew = bewertungenMap[anbieter.id];
                const kategorien = [...new Set(anbieter.leistungen?.map((l) => l.kategorie) ?? [])];
                return (
                  <Link key={anbieter.id} href={`/anbieter/${anbieter.id}`} className="group block">
                    <Card className="h-full hover:shadow-md transition-all cursor-pointer group-hover:border-[--primary]/25">
                      <CardContent className="p-5 flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-[--primary]" />
                          </div>
                          {anbieter.verifiziert && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                        </div>

                        {/* Name */}
                        <h2 className="font-semibold text-sm leading-tight mb-1 group-hover:text-[--primary] transition-colors line-clamp-2">
                          {anbieter.name}
                        </h2>

                        {/* Location */}
                        {(anbieter.plz || anbieter.ort) && (
                          <p className="text-xs text-[--muted-foreground] flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {anbieter.plz}{anbieter.ort ? ` ${anbieter.ort}` : ""}
                          </p>
                        )}

                        {/* Description */}
                        {anbieter.beschreibung && (
                          <p className="text-xs text-[--muted-foreground] leading-relaxed line-clamp-2 mb-3">
                            {anbieter.beschreibung}
                          </p>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Kategorie badges */}
                        {kategorien.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {kategorien.slice(0, 2).map((kat) => (
                              <Badge key={kat} variant="secondary" className="text-xs px-2 py-0.5">
                                {LEISTUNGSKATEGORIEN[kat as LeistungsKategorie] ?? kat}
                              </Badge>
                            ))}
                            {kategorien.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                +{kategorien.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Rating */}
                        {bew && bew.count > 0 ? (
                          <SterneDisplay average={bew.avg} count={bew.count} size="sm" />
                        ) : (
                          <p className="text-xs text-[--muted-foreground]">Noch keine Bewertungen</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 text-[--muted-foreground]">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Keine Anbieter gefunden</p>
              <p className="text-sm mb-4">
                {q
                  ? `Keine Anbieter für „${q}" gefunden.`
                  : "Für diese Kategorie sind noch keine Anbieter eingetragen."}
              </p>
              <Link href="/anbieter">
                <Button variant="outline">Alle Anbieter anzeigen</Button>
              </Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Seitennavigation" className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <Link
                  href={`/anbieter?${new URLSearchParams({
                    ...(kategorie ? { kategorie } : {}),
                    ...(q ? { q } : {}),
                    seite: String(page - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">← Zurück</Button>
                </Link>
              )}

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Link
                    key={pageNum}
                    href={`/anbieter?${new URLSearchParams({
                      ...(kategorie ? { kategorie } : {}),
                      ...(q ? { q } : {}),
                      seite: String(pageNum),
                    }).toString()}`}
                  >
                    <Button
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  </Link>
                );
              })}

              {page < totalPages && (
                <Link
                  href={`/anbieter?${new URLSearchParams({
                    ...(kategorie ? { kategorie } : {}),
                    ...(q ? { q } : {}),
                    seite: String(page + 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">Weiter →</Button>
                </Link>
              )}
            </nav>
          )}

          {/* SEO-optimized category overview (only on page 1, no filter) */}
          {!kategorie && !q && page === 1 && (
            <section className="mt-16 pt-8 border-t border-[--border]">
              <h2 className="text-xl font-bold mb-6">Anbieter nach Kategorie</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {KATEGORIE_FILTER.filter((k) => k.key !== "").map((opt) => (
                  <Link
                    key={opt.key}
                    href={`/anbieter?kategorie=${opt.key}`}
                    className="flex items-center gap-2 p-3 rounded-xl border border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/4 transition-all group"
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-sm font-medium group-hover:text-[--primary] transition-colors">
                      {opt.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
