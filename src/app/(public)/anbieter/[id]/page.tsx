import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin, Phone, Globe, CheckCircle2, Mail,
  Package, Euro, Clock, ArrowLeft, Building2,
  Facebook, Instagram, Linkedin, Award, FileCheck, PlaneLanding
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnfrageDialog } from "@/components/anfrage/AnfrageDialog";
import { FavoritButton } from "@/components/favoriten/FavoritButton";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { ShareButton } from "@/components/anbieter/ShareButton";
import { LocalBusinessJsonLd, BreadcrumbJsonLd, LeistungenJsonLd } from "@/components/seo/JsonLd";
import { LEISTUNGSKATEGORIEN, KOSTENTRAEGER } from "@/lib/constants";
import type { Leistung, LeistungsKategorie } from "@/lib/types";
import type { OeffnungszeitenMap } from "@/components/anbieter/OeffnungszeitenEditor";
import { FamilieAnbieterNotiz } from "@/components/anbieter/FamilieAnbieterNotiz";
import { VerfuegbarkeitBadge } from "@/components/anbieter/VerfuegbarkeitBadge";
import { KontaktFormular } from "@/components/anbieter/KontaktFormular";

// ── Lebenslage-Mapping: Leistungskategorie → Lebenslage-Slug ─────────────────
const KATEGORIE_TO_LEBENSLAGE: Record<string, string[]> = {
  pflege_ambulant:   ["alter-pflege"],
  pflege_stationaer: ["alter-pflege"],
  tagespflege:       ["alter-pflege"],
  kurzzeitpflege:    ["alter-pflege"],
  haushaltshilfe:    ["alter-pflege", "erwerbsleben-vereinbarkeit"],
  kinderbetreuung:   ["geburt-fruehe-kindheit", "schulkind-jugend"],
  jugendhilfe:       ["schulkind-jugend"],
  eingliederungshilfe: ["eingliederung-behinderung"],
  therapie:          ["krankheit-genesung"],
  hospizdienst:      ["hospiz-palliativ"],
  trauerhilfe:       ["trauer-nachlass"],
  beratung:          [],
  foerderung:        [],
  sonstiges:         [],
};

const LEBENSLAGE_LABELS: Record<string, string> = {
  "alter-pflege":               "Alter & Pflege",
  "geburt-fruehe-kindheit":     "Geburt & frühe Kindheit",
  "schulkind-jugend":           "Schulkind & Jugend",
  "eingliederung-behinderung":  "Eingliederung & Behinderung",
  "erwerbsleben-vereinbarkeit": "Erwerbsleben & Vereinbarkeit",
  "krankheit-genesung":         "Krankheit & Genesung",
  "hospiz-palliativ":           "Hospiz & Palliativ",
  "trauer-nachlass":            "Trauer & Nachlass",
};

// ── Öffnungszeiten display helper (server component safe) ────────────────────
const TAG_ORDER = ["mo","di","mi","do","fr","sa","so"] as const;
const TAG_LABELS: Record<string, string> = { mo:"Mo", di:"Di", mi:"Mi", do:"Do", fr:"Fr", sa:"Sa", so:"So" };

function OeffnungszeitenDisplay({ oeffnungszeiten }: { oeffnungszeiten: OeffnungszeitenMap }) {
  // Determine current day + time in Berlin timezone (server-side)
  const now = new Date();
  const berlinNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const todayKey = (["so","mo","di","mi","do","fr","sa"] as const)[berlinNow.getDay()];
  const currentTime = `${String(berlinNow.getHours()).padStart(2,"0")}:${String(berlinNow.getMinutes()).padStart(2,"0")}`;

  const todayZeiten = oeffnungszeiten[todayKey];
  const jetztOffen = !!(todayZeiten?.offen && currentTime >= todayZeiten.von && currentTime <= todayZeiten.bis);

  const hasAnyOpen = TAG_ORDER.some((k) => oeffnungszeiten[k]?.offen);
  if (!hasAnyOpen) return null;

  return (
    <div className="space-y-2">
      {/* Jetzt-Status pill */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        jetztOffen
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-600 border border-red-200"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${jetztOffen ? "bg-green-500" : "bg-red-500"}`} />
        {jetztOffen
          ? `Jetzt geöffnet · bis ${todayZeiten!.bis} Uhr`
          : todayZeiten?.offen
            ? `Heute geschlossen ab ${todayZeiten.bis} Uhr`
            : "Heute geschlossen"}
      </div>

      {/* Weekly grid — highlight today */}
      <div className="space-y-0.5">
        {TAG_ORDER.map((key) => {
          const tz = oeffnungszeiten[key];
          const isToday = key === todayKey;
          const isOffen = !!tz?.offen;
          return (
            <div
              key={key}
              className={`flex justify-between items-center text-xs rounded-md px-2 py-1 transition-colors ${
                isToday
                  ? "bg-[--primary]/10"
                  : ""
              }`}
            >
              <span className={`font-medium ${isToday ? "text-[--primary]" : "text-[--foreground]"}`}>
                {TAG_LABELS[key]}
                {isToday && <span className="ml-1 text-[10px] opacity-60">(heute)</span>}
              </span>
              <span className={
                isToday
                  ? "text-[--primary] font-medium"
                  : isOffen
                  ? "text-[--muted-foreground]"
                  : "text-[--muted-foreground] opacity-40"
              }>
                {isOffen ? `${tz!.von}–${tz!.bis} Uhr` : "Geschlossen"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("name, beschreibung, ort, plz")
    .eq("id", id)
    .single();

  if (!anbieter) return { title: "Anbieter nicht gefunden" };

  return {
    title: `${anbieter.name} – xcare`,
    description: anbieter.beschreibung ?? `${anbieter.name} in ${anbieter.plz} ${anbieter.ort}`,
    openGraph: {
      title: anbieter.name,
      description: anbieter.beschreibung ?? undefined,
    },
  };
}

export default async function AnbieterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*, leistungen(*)")
    .eq("id", id)
    .eq("aktiv", true)
    .single();

  if (!anbieter) notFound();

  // Check auth + favorites
  const { data: { user } } = await supabase.auth.getUser();
  let profile = null;
  let istFavorit = false;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();
    profile = p;

    if (p?.role === "familie") {
      const { data: fav } = await supabase
        .from("favoriten")
        .select("id")
        .eq("familie_id", p.id)
        .eq("anbieter_id", id)
        .single();
      istFavorit = !!fav;
    }
  }

  // Public documents (certificates, qualifications)
  const { data: dokumente } = await supabase
    .from("anbieter_dokumente")
    .select("id, name, typ")
    .eq("anbieter_id", id)
    .eq("oeffentlich", true)
    .order("created_at", { ascending: false });

  // Bewertungen average
  const { data: bewertungen } = await supabase
    .from("bewertungen")
    .select("sterne")
    .eq("anbieter_id", id);
  const avgSterne = bewertungen && bewertungen.length > 0
    ? bewertungen.reduce((sum, b) => sum + b.sterne, 0) / bewertungen.length
    : 0;
  const bewertungenCount = bewertungen?.length ?? 0;

  const leistungen: Leistung[] = anbieter.leistungen?.filter((l: Leistung) => l.aktiv) ?? [];

  // Group leistungen by kategorie
  const leistungenByKategorie = leistungen.reduce((acc: Record<string, Leistung[]>, l) => {
    const key = l.kategorie;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  // Derive lebenslage slugs from active leistungen categories
  const lebenslageSlugs = [...new Set(
    leistungen.flatMap((l) => KATEGORIE_TO_LEBENSLAGE[l.kategorie] ?? [])
  )];

  // Ähnliche Anbieter: same PLZ prefix, exclude self
  let aehnliche: Array<{ id: string; name: string; plz: string | null; ort: string | null; verifiziert: boolean }> = [];
  if (anbieter.plz) {
    const plzPrefix = anbieter.plz.substring(0, 2);
    const { data: nearbyRaw } = await supabase
      .from("anbieter")
      .select("id, name, plz, ort, verifiziert")
      .eq("aktiv", true)
      .ilike("plz", `${plzPrefix}%`)
      .neq("id", id)
      .limit(6);
    aehnliche = (nearbyRaw ?? []).slice(0, 3);
  }

  // Familie-Notiz zu diesem Anbieter laden (nur für eingeloggte Familien)
  let familieNotiz: string | null = null;
  if (profile?.role === "familie") {
    const { data: notizData } = await supabase
      .from("familie_anbieter_notizen")
      .select("notiz")
      .eq("familie_id", profile.id)
      .eq("anbieter_id", id)
      .single();
    familieNotiz = notizData?.notiz ?? null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-10"
      itemScope
      itemType="https://schema.org/LocalBusiness"
    >
      <meta itemProp="name" content={anbieter.name} />
      {anbieter.beschreibung && <meta itemProp="description" content={anbieter.beschreibung} />}
      {anbieter.telefon && <meta itemProp="telephone" content={anbieter.telefon} />}
      {anbieter.email && <meta itemProp="email" content={anbieter.email} />}
      {anbieter.website && <meta itemProp="url" content={anbieter.website} />}
      {/* Structured Data */}
      <LocalBusinessJsonLd
        id={anbieter.id}
        name={anbieter.name}
        description={anbieter.beschreibung}
        url={`${baseUrl}/anbieter/${anbieter.id}`}
        telephone={anbieter.telefon}
        email={anbieter.email}
        image={anbieter.logo_url}
        address={{
          street: anbieter.strasse,
          city: anbieter.ort,
          postalCode: anbieter.plz,
        }}
        geo={
          anbieter.lat && anbieter.lng
            ? { lat: anbieter.lat, lng: anbieter.lng }
            : undefined
        }
        aggregateRating={
          bewertungenCount > 0
            ? { ratingValue: avgSterne, reviewCount: bewertungenCount }
            : undefined
        }
        serviceType={leistungen.slice(0, 5).map((l) => l.name)}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Startseite", href: "/" },
          { name: "Anbieter suchen", href: "/suche" },
          { name: anbieter.name, href: `/anbieter/${anbieter.id}` },
        ]}
      />
      {leistungen.length > 0 && (
        <LeistungenJsonLd
          anbieterName={anbieter.name}
          anbieterUrl={`${baseUrl}/anbieter/${anbieter.id}`}
          leistungen={leistungen.map((l) => ({
            id: l.id,
            name: l.name,
            beschreibung: l.beschreibung,
            kategorie: l.kategorie,
            sgb_paragraf: l.sgb_paragraf,
            preis_von: l.preis_von,
            preis_bis: l.preis_bis,
            wartezeit_wochen: l.wartezeit_wochen,
            kostentraeger: l.kostentraeger as string[] | null,
          }))}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-[--muted-foreground]">
        <Link href="/suche" className="hover:text-[--foreground] flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Suche
        </Link>
        <span>/</span>
        <span className="text-[--foreground] font-medium">{anbieter.name}</span>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-[--border] bg-gradient-to-br from-[--primary-light] to-white p-6 mb-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar / Logo */}
          <div className="h-20 w-20 shrink-0 rounded-2xl overflow-hidden bg-[--primary] flex items-center justify-center shadow-sm">
            {anbieter.logo_url ? (
              <Image
                src={anbieter.logo_url}
                alt={`Logo ${anbieter.name}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-3xl">
                {anbieter.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">{anbieter.name}</h1>
              {anbieter.verifiziert && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verifiziert
                </Badge>
              )}
              <VerfuegbarkeitBadge
                verfuegbarkeit={(anbieter as { verfuegbarkeit?: string }).verfuegbarkeit as "verfuegbar" | "eingeschraenkt" | "ausgebucht" | null}
              />
            </div>
            {anbieter.traeger && (
              <p className="text-sm text-[--muted-foreground] mb-1">{anbieter.traeger}</p>
            )}
            {bewertungenCount > 0 && (
              <Link href={`/anbieter/${anbieter.id}/bewertungen`} className="mb-2 inline-block hover:opacity-80 transition-opacity">
                <SterneDisplay average={avgSterne} count={bewertungenCount} size="sm" />
              </Link>
            )}
            {lebenslageSlugs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {lebenslageSlugs.map((slug) => (
                  <Link
                    key={slug}
                    href={`/lebenslage/${slug}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[--primary-light] text-[--primary] hover:bg-[--primary] hover:text-white transition-colors"
                  >
                    {LEBENSLAGE_LABELS[slug]}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-[--muted-foreground]">
              {(anbieter.plz || anbieter.ort) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {anbieter.plz} {anbieter.ort}
                  {anbieter.strasse && ` · ${anbieter.strasse}`}
                </span>
              )}
              {anbieter.telefon && (
                <a href={`tel:${anbieter.telefon}`} className="flex items-center gap-1.5 hover:text-[--primary]">
                  <Phone className="h-4 w-4" /> {anbieter.telefon}
                </a>
              )}
              {anbieter.email && (
                <a href={`mailto:${anbieter.email}`} className="flex items-center gap-1.5 hover:text-[--primary]">
                  <Mail className="h-4 w-4" /> {anbieter.email}
                </a>
              )}
              {anbieter.website && (
                <a
                  href={anbieter.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[--primary]"
                >
                  <Globe className="h-4 w-4" />
                  {anbieter.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>

          {/* CTA-Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row shrink-0">
            <ShareButton anbieterId={id} anbieterName={anbieter.name} />
            {profile?.role === "familie" && (
              <>
                <FavoritButton
                  anbieterId={id}
                  istFavorit={istFavorit}
                  profileId={profile.id}
                />
                <AnfrageDialog
                  anbieterId={id}
                  anbieterName={anbieter.name}
                  trigger={
                    <Button className="gap-1.5">
                      <Mail className="h-4 w-4" />
                      Anfrage stellen
                    </Button>
                  }
                />
              </>
            )}
            {!user && (
              <Link href="/register">
                <Button className="gap-1.5">
                  <Mail className="h-4 w-4" />
                  Anfrage stellen
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Abwesenheits-Banner */}
      {(anbieter as { abwesend?: boolean }).abwesend && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <PlaneLanding className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Vorübergehend abwesend</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {(anbieter as { abwesend_notiz?: string | null }).abwesend_notiz
                ? (anbieter as { abwesend_notiz: string }).abwesend_notiz
                : "Dieser Anbieter nimmt derzeit keine neuen Anfragen entgegen."}
              {(anbieter as { abwesend_bis?: string | null }).abwesend_bis && (
                <span className="ml-1 font-medium">
                  Voraussichtlich ab {new Date((anbieter as { abwesend_bis: string }).abwesend_bis).toLocaleDateString("de-DE")} wieder verfügbar.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hauptinhalt */}
        <div className="lg:col-span-2 space-y-6">
          {/* Beschreibung */}
          {anbieter.beschreibung && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Über uns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[--muted-foreground]">
                  {anbieter.beschreibung}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Leistungen */}
          {Object.keys(leistungenByKategorie).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-[--primary]" />
                Unsere Leistungen ({leistungen.length})
              </h2>
              {Object.entries(leistungenByKategorie).map(([kat, gruppe]) => (
                <div key={kat}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[--muted-foreground] mb-2">
                    {LEISTUNGSKATEGORIEN[kat as LeistungsKategorie] ?? kat}
                  </p>
                  <div className="space-y-3">
                    {gruppe.map((l) => (
                      <Card
                        key={l.id}
                        className="border-[--border]"
                        itemScope
                        itemType="https://schema.org/Offer"
                      >
                        <meta itemProp="itemOffered" content={l.name} />
                        <meta itemProp="priceCurrency" content="EUR" />
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium mb-1" itemProp="name">{l.name}</p>
                              {l.beschreibung && (
                                <p className="text-sm text-[--muted-foreground] mb-2" itemProp="description">
                                  {l.beschreibung}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-[--muted-foreground]">
                                {l.sgb_paragraf && (
                                  <span className="font-medium text-[--primary]" itemProp="disambiguatingDescription">{l.sgb_paragraf}</span>
                                )}
                                {(l.preis_von != null || l.preis_bis != null) && (
                                  <span className="flex items-center gap-1" itemProp="priceSpecification" itemScope itemType="https://schema.org/PriceSpecification">
                                    <Euro className="h-3 w-3" />
                                    {l.preis_von != null && (
                                      <meta itemProp="minPrice" content={String(l.preis_von)} />
                                    )}
                                    {l.preis_bis != null && (
                                      <meta itemProp="maxPrice" content={String(l.preis_bis)} />
                                    )}
                                    <meta itemProp="priceCurrency" content="EUR" />
                                    {l.preis_von != null && l.preis_bis != null
                                      ? `${l.preis_von}–${l.preis_bis} €`
                                      : l.preis_von != null
                                      ? `ab ${l.preis_von} €`
                                      : `bis ${l.preis_bis} €`}
                                    {(l as { preis_einheit?: string | null }).preis_einheit
                                      ? ` / ${(l as { preis_einheit: string }).preis_einheit}`
                                      : ""}
                                  </span>
                                )}
                                {l.wartezeit_wochen != null && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {l.wartezeit_wochen === 0 ? "Sofort verfügbar" : `${l.wartezeit_wochen} Wo. Wartezeit`}
                                  </span>
                                )}
                              </div>
                              {l.kostentraeger && (l.kostentraeger as string[]).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(l.kostentraeger as string[]).map((k) => (
                                    <Badge key={k} variant="secondary" className="text-xs">
                                      {KOSTENTRAEGER[k as keyof typeof KOSTENTRAEGER] ?? k}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {profile?.role === "familie" && (
                              <AnfrageDialog
                                anbieterId={id}
                                anbieterName={anbieter.name}
                                leistungId={l.id}
                                leistungName={l.name}
                                trigger={
                                  <Button size="sm" variant="outline" className="shrink-0 gap-1">
                                    <Mail className="h-3 w-3" />
                                    Anfragen
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nachweise & Zertifikate */}
          {dokumente && dokumente.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Nachweise & Zertifikate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dokumente.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                        {doc.typ && doc.typ !== "application/octet-stream" && (
                          <p className="text-xs text-gray-400 uppercase">
                            {doc.typ.split("/")[1] ?? doc.typ}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Kontaktkarte */}
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm">Kontakt & Anfrage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {anbieter.telefon && (
                <a href={`tel:${anbieter.telefon}`} className="block">
                  <Button variant="outline" className="w-full gap-2">
                    <Phone className="h-4 w-4" />
                    {anbieter.telefon}
                  </Button>
                </a>
              )}
              {anbieter.email && (
                <a href={`mailto:${anbieter.email}`} className="block">
                  <Button variant="outline" className="w-full gap-2">
                    <Mail className="h-4 w-4" />
                    E-Mail schreiben
                  </Button>
                </a>
              )}
              {profile?.role === "familie" ? (
                <AnfrageDialog
                  anbieterId={id}
                  anbieterName={anbieter.name}
                  trigger={
                    <Button className="w-full gap-2">
                      <Package className="h-4 w-4" />
                      Anfrage stellen
                    </Button>
                  }
                />
              ) : null}

              {/* Social Media */}
              {(() => {
                type SocialMedia = { facebook?: string; instagram?: string; linkedin?: string; xing?: string };
                const sm = (anbieter as { social_media?: SocialMedia }).social_media;
                if (!sm || Object.keys(sm).length === 0) return null;
                return (
                  <div className="pt-2 border-t border-[--border]">
                    <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> Online
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sm.facebook && (
                        <a href={sm.facebook} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-blue-600 transition-colors">
                          <Facebook className="h-4 w-4" /> Facebook
                        </a>
                      )}
                      {sm.instagram && (
                        <a href={sm.instagram} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-pink-500 transition-colors">
                          <Instagram className="h-4 w-4" /> Instagram
                        </a>
                      )}
                      {sm.linkedin && (
                        <a href={sm.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-blue-700 transition-colors">
                          <Linkedin className="h-4 w-4" /> LinkedIn
                        </a>
                      )}
                      {sm.xing && (
                        <a href={sm.xing} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[--muted-foreground] hover:text-[--primary] transition-colors">
                          <Globe className="h-3.5 w-3.5" /> XING
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Öffnungszeiten */}
              {(() => {
                const oz = (anbieter as { oeffnungszeiten?: OeffnungszeitenMap }).oeffnungszeiten;
                if (!oz || Object.keys(oz).length === 0) return null;
                return (
                  <div className="pt-2 border-t border-[--border]">
                    <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Öffnungszeiten
                    </p>
                    <OeffnungszeitenDisplay oeffnungszeiten={oz} />
                  </div>
                );
              })()}

              <div className="pt-2 border-t border-[--border] text-xs text-[--muted-foreground] space-y-1">
                {anbieter.verifiziert && (
                  <p className="flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verifizierter Anbieter
                  </p>
                )}
                <p>Antwortzeit: in der Regel 1–2 Werktage</p>
              </div>
            </CardContent>
          </Card>

          {/* Kontaktformular für Gäste & Anbieter (nicht für eingeloggte Familien) */}
          {profile?.role !== "familie" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Direkt Kontakt aufnehmen</CardTitle>
                <p className="text-xs text-[--muted-foreground]">
                  Hinterlassen Sie eine Nachricht — {anbieter.name} meldet sich bei Ihnen.
                </p>
              </CardHeader>
              <CardContent>
                <KontaktFormular
                  anbieterId={id}
                  anbieterName={anbieter.name}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Familie private Notiz zu diesem Anbieter */}
      {profile?.role === "familie" && (
        <div className="mt-8">
          <FamilieAnbieterNotiz
            anbieterId={id}
            familieId={profile.id}
            initialNotiz={familieNotiz}
          />
        </div>
      )}

      {/* Ähnliche Anbieter */}
      {aehnliche.length > 0 && (
        <div className="mt-12 border-t border-[--border] pt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[--primary]" />
            Ähnliche Anbieter in der Region
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {aehnliche.map((a) => (
              <Link key={a.id} href={`/anbieter/${a.id}`} className="group block">
                <Card className="h-full hover:shadow-md transition-shadow hover:border-[--primary]/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-[--primary]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold group-hover:text-[--primary] transition-colors truncate">
                          {a.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(a.plz || a.ort) && (
                            <p className="text-xs text-[--muted-foreground] flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {a.plz}{a.ort ? ` ${a.ort}` : ""}
                            </p>
                          )}
                          {a.verifiziert && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
