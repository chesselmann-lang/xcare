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
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const LEBENSLAGE_CONFIG: Record<string, {
  label: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}> = {
  "alter-pflege": {
    label: "Alter & Pflege",
    slug: "alter-pflege",
    description: "Pflegedienste und Unterstützung für ältere Menschen",
    longDescription: "Ob ambulante Pflege, Tagespflege oder vollstationäre Betreuung – finden Sie die passende Unterstützung für ältere Angehörige in Ihrer Nähe. Unsere verifizierten Anbieter begleiten Sie und Ihre Familie kompetent und einfühlsam.",
    icon: "🏡",
    keywords: ["Altenpflege", "Pflegeheim", "ambulante Pflege", "Tagespflege", "Seniorenbetreuung"],
    faqs: [
      { question: "Wie beantrage ich einen Pflegegrad?", answer: "Einen Pflegegrad beantragen Sie beim Medizinischen Dienst (MD) über Ihre Pflegekasse. Stellen Sie den Antrag formlos bei Ihrer Pflegekasse – ein Gutachter besucht Sie dann zu Hause und bewertet Ihren Pflegebedarf anhand von sechs Lebensbereichen." },
      { question: "Was ist der Unterschied zwischen ambulanter und stationärer Pflege?", answer: "Bei ambulanter Pflege kommen Pflegefachkräfte zu Ihnen nach Hause. Stationäre Pflege findet in einem Pflegeheim statt, wo rund um die Uhr Betreuung gewährleistet ist. Tagespflege ist eine Zwischenlösung: Betroffene verbringen den Tag in einer Einrichtung und schlafen zu Hause." },
      { question: "Welche Leistungen übernimmt die Pflegekasse?", answer: "Die Pflegekasse übernimmt je nach Pflegegrad unterschiedliche Geldbeträge für ambulante Pflege (Pflegegeld), professionelle Pflegedienste (Pflegesachleistung), Kurzzeitpflege und stationäre Pflege. Ab Pflegegrad 2 stehen außerdem Entlastungsbeträge von 125 € monatlich zur Verfügung." },
      { question: "Wie finde ich den richtigen Pflegeanbieter in meiner Nähe?", answer: "Auf xcare können Sie nach Ihrem Ort oder Ihrer PLZ suchen und alle verifizierten Anbieter in Ihrer Region vergleichen. Bewertungen anderer Nutzer, Leistungsübersichten und direkte Kontaktaufnahme helfen Ihnen, den passenden Anbieter zu finden." },
    ],
  },
  "geburt-fruehe-kindheit": {
    label: "Geburt & frühe Kindheit",
    slug: "geburt-fruehe-kindheit",
    description: "Hebammen, Kitas und Beratung rund um den Start ins Leben",
    longDescription: "Von der Geburtsvorbereitung über Hebammenbetreuung bis hin zu Kita-Plätzen und Frühförderung – unsere Anbieter begleiten Sie und Ihr Kind in den ersten wichtigen Lebensjahren.",
    icon: "👶",
    keywords: ["Hebamme", "Kita", "Frühförderung", "Geburtshaus", "Elternberatung"],
    faqs: [
      { question: "Habe ich als Schwangere Anspruch auf eine Hebamme?", answer: "Ja, jede Schwangere hat gesetzlichen Anspruch auf Hebammenhilfe während und nach der Geburt. Die Kosten werden von der Krankenkasse übernommen. Hebammen begleiten Sie von der Schwangerschaft über die Geburt bis zur achten Woche nach der Entbindung." },
      { question: "Ab wann sollte ich einen Kita-Platz beantragen?", answer: "Kita-Plätze sind oft stark nachgefragt. Experten empfehlen, sich bereits in der Schwangerschaft oder spätestens ein Jahr vor dem gewünschten Betreuungsbeginn bei mehreren Einrichtungen anzumelden. In manchen Städten gibt es zentrale Vergabeportale." },
      { question: "Was ist Frühförderung und wer hat Anspruch darauf?", answer: "Frühförderung richtet sich an Kinder von 0 bis 6 Jahren mit Entwicklungsverzögerungen oder Behinderungen. Sie umfasst heilpädagogische, medizinisch-therapeutische und soziale Hilfen. Der Anspruch besteht über die Eingliederungshilfe (SGB IX) und wird vom Jugendamt oder Sozialamt koordiniert." },
    ],
  },
  "schulkind-jugend": {
    label: "Schulkind & Jugend",
    slug: "schulkind-jugend",
    description: "Nachhilfe, Hort und Beratung für Kinder und Jugendliche",
    longDescription: "Schulische Unterstützung, außerschulische Betreuung und Jugendarbeit – finden Sie Angebote, die Kindern und Jugendlichen helfen, ihre Potenziale zu entfalten.",
    icon: "🎒",
    keywords: ["Nachhilfe", "Hort", "Jugendhilfe", "Schulsozialarbeit", "Jugendberatung"],
    faqs: [
      { question: "Wer hat Anspruch auf Hortbetreuung?", answer: "Kinder im Grundschulalter (6–10 Jahre) haben einen Rechtsanspruch auf Förderung in einer Tageseinrichtung oder in Kindertagespflege. Die Verfügbarkeit von Hortplätzen variiert regional. Bei Berufstätigkeit beider Elternteile besteht oft Vorrang." },
      { question: "Welche Fördermöglichkeiten gibt es bei Lernschwierigkeiten?", answer: "Schulen bieten Förderstunden und sonderpädagogische Unterstützung an. Zusätzlich können Nachhilfe, Lerntherapie oder heilpädagogische Angebote helfen. Bei nachgewiesenem Bedarf können Kosten über das Bildungs- und Teilhabepaket (BuT) oder Eingliederungshilfe übernommen werden." },
      { question: "Was bietet die Jugendhilfe für Familien in schwierigen Situationen?", answer: "Das Jugendamt bietet verschiedene Hilfen zur Erziehung (§§ 27 ff. SGB VIII), z.B. sozialpädagogische Familienhilfe, Tagesgruppen oder Heimunterbringung. Erziehungsberatungsstellen stehen allen Familien kostenlos zur Verfügung." },
    ],
  },
  "eingliederung-behinderung": {
    label: "Eingliederung & Behinderung",
    slug: "eingliederung-behinderung",
    description: "Assistenz und Teilhabe für Menschen mit Behinderung",
    longDescription: "Inklusion und Teilhabe am gesellschaftlichen Leben – unsere Anbieter unterstützen Menschen mit körperlichen, geistigen und seelischen Beeinträchtigungen mit individuellen Hilfeleistungen.",
    icon: "♿",
    keywords: ["Eingliederungshilfe", "Behindertenassistenz", "Inklusion", "Werkstatt", "Behindertenberatung"],
    faqs: [
      { question: "Was ist Eingliederungshilfe und wer hat Anspruch?", answer: "Eingliederungshilfe (SGB IX Teil 2) unterstützt Menschen mit wesentlichen Behinderungen bei der gleichberechtigten Teilhabe am gesellschaftlichen Leben. Leistungen umfassen Assistenz, Beratung, Wohnen, Arbeit und Bildung. Zuständig sind die Träger der Eingliederungshilfe (meist Landschaftsverbände oder Bezirke)." },
      { question: "Was ist persönliche Assistenz?", answer: "Persönliche Assistenz ermöglicht Menschen mit Behinderung, selbstbestimmt zu leben. Assistenzpersonen helfen bei alltäglichen Tätigkeiten wie Körperpflege, Mobilität, Kommunikation und Freizeitgestaltung. Das Budget kann als Sachleistung oder über ein Persönliches Budget finanziert werden." },
      { question: "Wie beantrage ich einen Schwerbehindertenausweis?", answer: "Einen Schwerbehindertenausweis beantragen Sie beim Versorgungsamt Ihres Wohnorts. Benötigt werden ärztliche Atteste und Befundberichte. Ab einem Grad der Behinderung (GdB) von 50 haben Sie Anspruch auf einen Ausweis mit entsprechenden Vergünstigungen." },
    ],
  },
  "erwerbsleben-vereinbarkeit": {
    label: "Erwerbsleben & Vereinbarkeit",
    slug: "erwerbsleben-vereinbarkeit",
    description: "Kinderbetreuung und Beratung zur Work-Life-Balance",
    longDescription: "Familie und Beruf unter einen Hut bringen – finden Sie Kinderbetreuungsangebote, Beratungsstellen und Unterstützung für berufstätige Eltern in Ihrer Region.",
    icon: "💼",
    keywords: ["Kinderbetreuung", "Beruf und Familie", "Vereinbarkeit", "Elternzeit", "Tagesmutter"],
    faqs: [
      { question: "Wie lange kann ich Elternzeit nehmen?", answer: "Elternzeit können beide Elternteile bis zu 3 Jahre pro Kind nehmen. Davon können bis zu 24 Monate zwischen dem 3. und 8. Lebensjahr des Kindes genommen werden, sofern der Arbeitgeber zustimmt. Elterngeld wird für maximal 14 Monate gezahlt, wenn beide Elternteile mindestens 2 Monate übernehmen." },
      { question: "Was ist eine Tagesmutter und wie finde ich eine?", answer: "Tagesmütter und -väter betreuen Kinder in ihrem eigenen Haushalt. Sie sind anerkannte Kindertagespflegepersonen mit entsprechender Qualifikation. Das Jugendamt vor Ort vermittelt Tagespflegepersonen und prüft deren Eignung. Die Kosten werden je nach Einkommen bezuschusst." },
      { question: "Welche steuerlichen Vorteile gibt es für Kinderbetreuungskosten?", answer: "Kinderbetreuungskosten für Kinder unter 14 Jahren sind bis zu 2/3 der Kosten, maximal 4.000 € pro Jahr und Kind, als Sonderausgaben steuerlich absetzbar. Voraussetzung ist eine Rechnung und bargeldlose Zahlung an einen anerkannten Anbieter." },
    ],
  },
  "krankheit-genesung": {
    label: "Krankheit & Genesung",
    slug: "krankheit-genesung",
    description: "Begleitung und Unterstützung bei Krankheit und Rehabilitation",
    longDescription: "Bei Krankheit oder nach einem Krankenhausaufenthalt benötigen Betroffene oft zusätzliche Unterstützung. Unsere Anbieter helfen bei der Genesung, Reha und im Alltag.",
    icon: "🏥",
    keywords: ["Rehabilitation", "Haushaltshilfe", "Krankenpflege", "Genesung", "Sozialstation"],
    faqs: [
      { question: "Wer hat Anspruch auf häusliche Krankenpflege?", answer: "Versicherte haben Anspruch auf häusliche Krankenpflege, wenn sie krankheitsbedingt vorübergehend auf Hilfe angewiesen sind und keine geeignete Pflegeperson im Haushalt lebt. Der Arzt verordnet die Leistung, die Krankenkasse genehmigt sie." },
      { question: "Was ist der Unterschied zwischen Reha und Kur?", answer: "Eine Rehabilitation (Reha) zielt darauf ab, nach Krankheit oder Operation die Arbeitsfähigkeit oder Selbstständigkeit wiederherzustellen. Eine Kur dient der Prävention und Erholung. Reha wird von Krankenkasse oder Rentenversicherung finanziert, Kuren werden seltener bewilligt." },
      { question: "Was leistet eine Sozialstation?", answer: "Sozialstationen sind gemeinnützige ambulante Pflegedienste, die häusliche Krankenpflege, Grundpflege und hauswirtschaftliche Versorgung anbieten. Sie arbeiten mit Krankenkassen und Pflegekassen zusammen und sind häufig günstigere Alternativen zu privaten Pflegediensten." },
    ],
  },
  "hospiz-palliativ": {
    label: "Hospiz & Palliativ",
    slug: "hospiz-palliativ",
    description: "Würdevolle Begleitung in der letzten Lebensphase",
    longDescription: "Würdevolle Begleitung am Lebensende – unsere Anbieter bieten ambulante und stationäre Hospizarbeit, palliative Pflege und Unterstützung für Angehörige in einer der schwierigsten Lebenssituationen.",
    icon: "🕊️",
    keywords: ["Hospiz", "Palliativpflege", "Sterbebegleitung", "SAPV", "Trauerbegleitung"],
    faqs: [
      { question: "Was ist der Unterschied zwischen Hospiz und Palliativstation?", answer: "Ein Hospiz ist eine eigenständige Einrichtung für sterbenskranke Menschen, die intensive Begleitung und Pflege in einer wohnlichen Atmosphäre bietet. Eine Palliativstation ist eine spezialisierte Krankenhausstation für die symptomorientierte Behandlung schwerkranker Patienten. Ambulante Hospizdienste begleiten Menschen zu Hause." },
      { question: "Wer übernimmt die Kosten für das Hospiz?", answer: "Stationäre Hospizleistungen werden zu 95% von den Krankenkassen finanziert. Den Eigenanteil (ca. 5%) tragen die Hospize selbst, oft aus Spenden. Voraussetzung ist eine unheilbare Erkrankung mit begrenzter Lebenserwartung und ein entsprechendes ärztliches Zeugnis." },
      { question: "Was ist SAPV (Spezialisierte Ambulante Palliativversorgung)?", answer: "SAPV ermöglicht schwerstkranken Menschen, zuhause oder im Pflegeheim zu sterben. Ein spezialisiertes Team aus Ärzten und Pflegenden versorgt Patienten mit komplexen Symptomen rund um die Uhr. Die Kosten werden vollständig von der Krankenkasse übernommen." },
    ],
  },
  "trauer-nachlass": {
    label: "Trauer & Nachlass",
    slug: "trauer-nachlass",
    description: "Trauerbegleitung und Unterstützung bei Nachlass-Angelegenheiten",
    longDescription: "Der Verlust eines geliebten Menschen ist eine der schwersten Lebenssituationen. Unsere Anbieter begleiten Trauernde einfühlsam und helfen bei praktischen Angelegenheiten nach dem Tod.",
    icon: "🌹",
    keywords: ["Trauerbegleitung", "Bestattung", "Nachlass", "Erbschaft", "Seelsorge"],
    faqs: [
      { question: "Was muss nach einem Todesfall sofort erledigt werden?", answer: "Innerhalb von 24–48 Stunden sollte ein Arzt den Tod feststellen und einen Totenschein ausstellen. Dann muss das Standesamt benachrichtigt und ein Bestatter beauftragt werden. Der Arbeitgeber und relevante Behörden (Rentenversicherung, Krankenkasse) müssen informiert werden." },
      { question: "Wie funktioniert die Nachlassabwicklung ohne Testament?", answer: "Ohne Testament gilt die gesetzliche Erbfolge: Kinder erben vorrangig, dann Eltern und Geschwister. Der überlebende Ehepartner hat ein Erbrecht neben den Kindern. Ein Erbschein vom Nachlassgericht weist Erbberechtigte aus. Schulden gehen auf Erben über – die Ausschlagung der Erbschaft ist möglich." },
      { question: "Welche professionelle Trauerbegleitung gibt es?", answer: "Trauerbegleitung bieten ambulante Hospizdienste, Trauergruppen, Beratungsstellen und speziell ausgebildete Trauerbegleiter an. Die meisten Angebote sind kostenlos oder günstig. Psychotherapie kann bei komplizierter Trauer sinnvoll sein und wird von Krankenkassen bezahlt." },
    ],
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";
  const canonicalUrl = `${appUrl}/lebenslage/${slug}`;

  return {
    title: `${config.label} – Anbieter in Ihrer Nähe | xcare`,
    description: config.description,
    keywords: config.keywords,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${config.label} – Anbieter finden auf xcare`,
      description: config.description,
      url: canonicalUrl,
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
      {config.faqs && config.faqs.length > 0 && (
        <FAQJsonLd items={config.faqs} />
      )}
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
