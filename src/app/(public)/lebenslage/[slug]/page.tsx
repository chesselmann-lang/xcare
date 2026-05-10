import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin, CheckCircle2, ArrowRight, Search, Phone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCachedLebenslageanbieter } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { PlzSuche } from "@/components/lebenslage/PlzSuche";
import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const LEBENSLAGE_CONFIG: Record<string, {
  label: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  keywords: string[];
}> = {
  "alter-pflege": {
    label: "Alter & Pflege",
    slug: "alter-pflege",
    description: "Pflegedienste und Unterstützung für ältere Menschen",
    longDescription: "Ob ambulante Pflege, Tagespflege oder vollstationäre Betreuung – finden Sie die passende Unterstützung für ältere Angehörige in Ihrer Nähe. Unsere verifizierten Anbieter begleiten Sie und Ihre Familie kompetent und einfühlsam.",
    icon: "🏡",
    keywords: ["Altenpflege", "Pflegeheim", "ambulante Pflege", "Tagespflege", "Seniorenbetreuung"],
  },
  "geburt-fruehe-kindheit": {
    label: "Geburt & frühe Kindheit",
    slug: "geburt-fruehe-kindheit",
    description: "Hebammen, Kitas und Beratung rund um den Start ins Leben",
    longDescription: "Von der Geburtsvorbereitung über Hebammenbetreuung bis hin zu Kita-Plätzen und Frühförderung – unsere Anbieter begleiten Sie und Ihr Kind in den ersten wichtigen Lebensjahren.",
    icon: "👶",
    keywords: ["Hebamme", "Kita", "Frühförderung", "Geburtshaus", "Elternberatung"],
  },
  "schulkind-jugend": {
    label: "Schulkind & Jugend",
    slug: "schulkind-jugend",
    description: "Nachhilfe, Hort und Beratung für Kinder und Jugendliche",
    longDescription: "Schulische Unterstützung, außerschulische Betreuung und Jugendarbeit – finden Sie Angebote, die Kindern und Jugendlichen helfen, ihre Potenziale zu entfalten.",
    icon: "🎒",
    keywords: ["Nachhilfe", "Hort", "Jugendhilfe", "Schulsozialarbeit", "Jugendberatung"],
  },
  "eingliederung-behinderung": {
    label: "Eingliederung & Behinderung",
    slug: "eingliederung-behinderung",
    description: "Assistenz und Teilhabe für Menschen mit Behinderung",
    longDescription: "Inklusion und Teilhabe am gesellschaftlichen Leben – unsere Anbieter unterstützen Menschen mit körperlichen, geistigen und seelischen Beeinträchtigungen mit individuellen Hilfeleistungen.",
    icon: "♿",
    keywords: ["Eingliederungshilfe", "Behindertenassistenz", "Inklusion", "Werkstatt", "Behindertenberatung"],
  },
  "erwerbsleben-vereinbarkeit": {
    label: "Erwerbsleben & Vereinbarkeit",
    slug: "erwerbsleben-vereinbarkeit",
    description: "Kinderbetreuung und Beratung zur Work-Life-Balance",
    longDescription: "Familie und Beruf unter einen Hut bringen – finden Sie Kinderbetreuungsangebote, Beratungsstellen und Unterstützung für berufstätige Eltern in Ihrer Region.",
    icon: "💼",
    keywords: ["Kinderbetreuung", "Beruf und Familie", "Vereinbarkeit", "Elternzeit", "Tagesmutter"],
  },
  "krankheit-genesung": {
    label: "Krankheit & Genesung",
    slug: "krankheit-genesung",
    description: "Begleitung und Unterstützung bei Krankheit und Rehabilitation",
    longDescription: "Bei Krankheit oder nach einem Krankenhausaufenthalt benötigen Betroffene oft zusätzliche Unterstützung. Unsere Anbieter helfen bei der Genesung, Reha und im Alltag.",
    icon: "🏥",
    keywords: ["Rehabilitation", "Haushaltshilfe", "Krankenpflege", "Genesung", "Sozialstation"],
  },
  "hospiz-palliativ": {
    label: "Hospiz & Palliativ",
    slug: "hospiz-palliativ",
    description: "Würdevolle Begleitung in der letzten Lebensphase",
    longDescription: "Würdevolle Begleitung am Lebensende – unsere Anbieter bieten ambulante und stationäre Hospizarbeit, palliative Pflege und Unterstützung für Angehörige in einer der schwierigsten Lebenssituationen.",
    icon: "🕊️",
    keywords: ["Hospiz", "Palliativpflege", "Sterbebegleitung", "SAPV", "Trauerbegleitung"],
  },
  "trauer-nachlass": {
    label: "Trauer & Nachlass",
    slug: "trauer-nachlass",
    description: "Trauerbegleitung und Unterstützung bei Nachlass-Angelegenheiten",
    longDescription: "Der Verlust eines geliebten Menschen ist eine der schwersten Lebenssituationen. Unsere Anbieter begleiten Trauernde einfühlsam und helfen bei praktischen Angelegenheiten nach dem Tod.",
    icon: "🌹",
    keywords: ["Trauerbegleitung", "Bestattung", "Nachlass", "Erbschaft", "Seelsorge"],
  },
};

// Map from slug to DB lebenslage value
const SLUG_TO_DB: Record<string, string> = {
  "alter-pflege": "alter_pflege",
  "geburt-fruehe-kindheit": "geburt_fruehe_kindheit",
  "schulkind-jugend": "schulkind_jugend",
  "eingliederung-behinderung": "eingliederung_behinderung",
  "erwerbsleben-vereinbarkeit": "erwerbsleben_vereinbarkeit",
  "krankheit-genesung": "krankheit_genesung",
  "hospiz-palliativ": "hospiz_palliativ",
  "trauer-nachlass": "trauer_nachlass",
};

export async function generateStaticParams() {
  return Object.keys(LEBENSLAGE_CONFIG).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = LEBENSLAGE_CONFIG[slug];
  if (!config) return { title: "Nicht gefunden" };

  return {
    title: `${config.label} – Anbieter in Ihrer Nähe | xcare`,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: `${config.label} – Anbieter finden auf xcare`,
      description: config.description,
      type: "website",
    },
  };
}

export default async function LebenslagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = LEBENSLAGE_CONFIG[slug];
  if (!config) notFound();

  const dbValue = SLUG_TO_DB[slug];

  // ── Primary anbieter list: cached 30 min (service-role, no cookies) ──────
  const anbieter = await getCachedLebenslageanbieter(slug, dbValue);
  const supabase = await createClient();

  // Also fetch by anfragen pattern (anbieter who have received this type)
  const { data: anfragenAnbieter } = await supabase
    .from("anfragen")
    .select("anbieter_id")
    .eq("lebenslage", dbValue)
    .not("anbieter_id", "is", null)
    .limit(100);

  const anfragenAnbieterIds = [
    ...new Set((anfragenAnbieter ?? []).map((a) => a.anbieter_id))
  ].filter(Boolean);

  let additionalAnbieter: typeof anbieter = [];
  if (anfragenAnbieterIds.length > 0) {
    const existingIds = new Set((anbieter ?? []).map((a) => a.id));
    const newIds = anfragenAnbieterIds.filter((id): id is string => !existingIds.has(id));
    if (newIds.length > 0) {
      const { data: extra } = await supabase
        .from("anbieter")
        .select("id, name, beschreibung, plz, ort, strasse, telefon, website, verifiziert, logo_url, abwesend, leistungen(id, name, kategorie, aktiv)")
        .eq("aktiv", true)
        .eq("abwesend", false)
        .in("id", newIds.slice(0, 20));
      additionalAnbieter = extra ?? [];
    }
  }

  const allAnbieter = [...(anbieter ?? []), ...additionalAnbieter];

  // Fetch ratings
  const ids = allAnbieter.map((a) => a.id);
  const bewertungenMap: Record<string, { avg: number; count: number }> = {};
  if (ids.length > 0) {
    const { data: bew } = await supabase
      .from("bewertungen")
      .select("anbieter_id, sterne")
      .in("anbieter_id", ids);
    (bew ?? []).forEach((b) => {
      if (!bewertungenMap[b.anbieter_id]) {
        bewertungenMap[b.anbieter_id] = { avg: 0, count: 0 };
      }
      const e = bewertungenMap[b.anbieter_id];
      e.count++;
      e.avg = e.avg + (b.sterne - e.avg) / e.count;
    });
  }

  // Sort: verified first, then by rating
  const sorted = [...allAnbieter].sort((a, b) => {
    if (a.verifiziert !== b.verifiziert) return a.verifiziert ? -1 : 1;
    const rA = bewertungenMap[a.id]?.avg ?? 0;
    const rB = bewertungenMap[b.id]?.avg ?? 0;
    return rB - rA;
  });

  const otherCategories = Object.values(LEBENSLAGE_CONFIG).filter(
    (c) => c.slug !== slug
  );

  return (
    <div className="min-h-screen bg-[--background]">
      <BreadcrumbJsonLd
        items={[
          { name: "Startseite", href: "/" },
          { name: "Lebenslagen", href: "/lebenslage" },
          { name: config.label, href: `/lebenslage/${slug}` },
        ]}
      />
      {/* Hero */}
      <div className="bg-gradient-to-br from-[--primary] to-[--primary-dark] text-white py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-5xl mb-4">{config.icon}</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{config.label}</h1>
          <p className="text-lg opacity-90 mb-6 max-w-2xl">{config.longDescription}</p>
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/lotse">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                KI-Beratung starten
              </Button>
            </Link>
          </div>
          <PlzSuche kategorie={dbValue} label={config.label} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Keywords */}
        <div className="flex flex-wrap gap-2 mb-8">
          {config.keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-sm">
              {kw}
            </Badge>
          ))}
        </div>

        {/* Anbieter list */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {sorted.length > 0
                ? `${sorted.length} Anbieter gefunden`
                : "Anbieter in dieser Kategorie"}
            </h2>
            <Link href={`/suche?kategorie=${dbValue}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Search className="h-3.5 w-3.5" />
                Alle suchen
              </Button>
            </Link>
          </div>

          {sorted.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted.map((a) => {
                const bw = bewertungenMap[a.id];
                const aktiveLeistungen = (a.leistungen ?? []).filter((l) => l.aktiv);
                const matchingLeistungen = (a.leistungen ?? []).filter(
                  (l) => l.aktiv && l.kategorie?.includes(dbValue)
                );
                const matchScore = matchingLeistungen.length;
                return (
                  <Link key={a.id} href={`/anbieter/${a.id}`} className="group block">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all hover:border-[--primary]/20 flex flex-col h-full">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-[--primary-light] flex items-center justify-center">
                          {a.logo_url ? (
                            <Image
                              src={a.logo_url}
                              alt={`Logo ${a.name}`}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[--primary] font-bold text-lg">
                              {a.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-gray-900 group-hover:text-[--primary] transition-colors">
                              {a.name}
                            </h3>
                            {a.verifiziert && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                            )}
                            {matchScore > 1 && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-[--primary-light] text-[--primary] font-medium">
                                {matchScore} Angebote
                              </span>
                            )}
                          </div>
                          {(a.plz || a.ort) && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {a.plz} {a.ort}
                            </p>
                          )}
                        </div>
                      </div>

                      {bw && bw.count > 0 && (
                        <div className="mb-2">
                          <SterneDisplay average={bw.avg} count={bw.count} size="sm" />
                        </div>
                      )}

                      {a.beschreibung && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1 leading-relaxed">
                          {a.beschreibung}
                        </p>
                      )}

                      {aktiveLeistungen.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {aktiveLeistungen.slice(0, 2).map((l) => (
                            <Badge key={l.id} variant="secondary" className="text-xs">
                              {l.name}
                            </Badge>
                          ))}
                          {aktiveLeistungen.length > 2 && (
                            <Badge variant="secondary" className="text-xs text-gray-400">
                              +{aktiveLeistungen.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                        {a.telefon && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />{a.telefon}
                          </p>
                        )}
                        <span className="text-xs text-[--primary] font-medium flex items-center gap-1 ml-auto">
                          Profil ansehen <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 mb-4">
                Noch keine Anbieter in dieser Kategorie gefunden.
              </p>
              <Link href={`/suche?kategorie=${dbValue}`}>
                <Button className="gap-2">
                  <Search className="h-4 w-4" />
                  Alle Anbieter durchsuchen
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Other categories */}
        <div>
          <h2 className="text-xl font-bold mb-4">Weitere Kategorien</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {otherCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/lebenslage/${cat.slug}`}
                className="group flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 bg-white hover:border-[--primary]/30 hover:shadow-sm transition-all"
              >
                <span className="text-3xl mb-2">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-700 group-hover:text-[--primary] transition-colors leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
