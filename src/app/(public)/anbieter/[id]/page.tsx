import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin, Phone, Globe, CheckCircle2, Mail,
  Package, Euro, Clock, ArrowLeft, Building2
} from "lucide-react";
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

// ── Öffnungszeiten display helper (server component safe) ────────────────────
const TAG_ORDER = ["mo","di","mi","do","fr","sa","so"] as const;
const TAG_LABELS: Record<string, string> = { mo:"Mo", di:"Di", mi:"Mi", do:"Do", fr:"Fr", sa:"Sa", so:"So" };

function OeffnungszeitenDisplay({ oeffnungszeiten }: { oeffnungszeiten: OeffnungszeitenMap }) {
  const grouped: { tage: string[]; von: string; bis: string }[] = [];
  TAG_ORDER.forEach((key) => {
    const tz = oeffnungszeiten[key];
    if (!tz?.offen) return;
    const last = grouped[grouped.length - 1];
    if (last && last.von === tz.von && last.bis === tz.bis) { last.tage.push(key); }
    else { grouped.push({ tage: [key], von: tz.von, bis: tz.bis }); }
  });
  if (grouped.length === 0) return null;
  return (
    <div className="space-y-1">
      {grouped.map((g, i) => {
        const tagStr = g.tage.length === 1
          ? TAG_LABELS[g.tage[0]]
          : `${TAG_LABELS[g.tage[0]]}–${TAG_LABELS[g.tage[g.tage.length - 1]]}`;
        return (
          <div key={i} className="flex justify-between text-sm">
            <span className="font-medium text-[--foreground]">{tagStr}</span>
            <span className="text-[--muted-foreground]">{g.von}–{g.bis} Uhr</span>
          </div>
        );
      })}
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
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[--primary] text-white font-bold text-3xl shadow-sm">
            {anbieter.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold">{anbieter.name}</h1>
              {anbieter.verifiziert && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verifiziert
                </Badge>
              )}
            </div>
            {anbieter.traeger && (
              <p className="text-sm text-[--muted-foreground] mb-1">{anbieter.traeger}</p>
            )}
            {bewertungenCount > 0 && (
              <div className="mb-2">
                <SterneDisplay average={avgSterne} count={bewertungenCount} size="sm" />
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
              ) : !user ? (
                <Link href="/register">
                  <Button className="w-full gap-2">
                    <Package className="h-4 w-4" />
                    Jetzt registrieren & anfragen
                  </Button>
                </Link>
              ) : null}

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
        </div>
      </div>
    </div>
  );
}
