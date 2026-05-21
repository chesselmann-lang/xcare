import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Heart, MapPin, Phone, Globe,
  Star, CheckCircle2, MessageSquare, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoritButton } from "@/components/favoriten/FavoritButton";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { VergleichPicker } from "@/components/vergleich/VergleichPicker";

export const metadata = {
  title: "Meine Favoriten | xcare",
  description: "Ihre gespeicherten Pflegedienste und Anbieter auf xcare.",
};

export default async function FamilieFavoritenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  // Fetch favorites with anbieter details + leistungen
  const { data: favoriten } = await supabase
    .from("favoriten")
    .select("id, created_at, anbieter(id, name, beschreibung, traeger, plz, ort, telefon, website, verifiziert, logo_url, leistungen(id, name, kategorie, aktiv))")
    .eq("familie_id", profile?.id)
    .order("created_at", { ascending: false });

  // Collect anbieter IDs to batch-fetch bewertungen + offene anfragen
  const anbieterIds = favoriten
    ?.map((f) => (f.anbieter as { id: string } | null)?.id)
    .filter(Boolean) as string[] ?? [];

  // Batch fetch bewertungen averages
  const { data: allBewertungen } = anbieterIds.length > 0
    ? await supabase
        .from("bewertungen")
        .select("anbieter_id, sterne")
        .in("anbieter_id", anbieterIds)
    : { data: [] };

  // Batch fetch offene anfragen for this familie
  const { data: offeneAnfragen } = anbieterIds.length > 0
    ? await supabase
        .from("anfragen")
        .select("anbieter_id, status, id")
        .eq("familie_id", profile?.id)
        .in("anbieter_id", anbieterIds)
        .in("status", ["offen", "in_bearbeitung", "angeboten", "bestaetigt"])
    : { data: [] };

  // Build lookup maps
  const bewertungenByAnbieter: Record<string, { avg: number; count: number }> = {};
  allBewertungen?.forEach((b) => {
    if (!bewertungenByAnbieter[b.anbieter_id]) {
      bewertungenByAnbieter[b.anbieter_id] = { avg: 0, count: 0 };
    }
    const entry = bewertungenByAnbieter[b.anbieter_id];
    entry.count++;
    entry.avg = entry.avg + (b.sterne - entry.avg) / entry.count;
  });

  const anfrageByAnbieter: Record<string, { id: string; status: string }> = {};
  offeneAnfragen?.forEach((a) => {
    if (!anfrageByAnbieter[a.anbieter_id]) {
      anfrageByAnbieter[a.anbieter_id] = { id: a.id, status: a.status };
    }
  });

  const total = favoriten?.length ?? 0;
  const mitAnfrage = Object.keys(anfrageByAnbieter).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Meine Favoriten</h1>
        <p className="text-sm text-[--muted-foreground]">
          Gespeicherte Anbieter – jederzeit schnell auffindbar
        </p>
      </div>

      {/* Quick stats */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center">
            <p className="text-2xl font-bold text-[--foreground]">{total}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Gespeicherte Anbieter</p>
          </div>
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center">
            <p className="text-2xl font-bold text-[--foreground]">{mitAnfrage}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Offene Anfragen</p>
          </div>
          <div className="rounded-xl border border-[--border] bg-[--card] p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-[--foreground]">
              {total - mitAnfrage}
            </p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Noch nicht angefragt</p>
          </div>
        </div>
      )}

      {/* Vergleich picker – shown when ≥2 favorites exist */}
      {total >= 2 && (
        <div className="mb-6">
          <VergleichPicker
            anbieterList={
              favoriten!
                .map((f) => {
                  const a = f.anbieter as { id: string; name: string } | null;
                  return a ? { id: a.id, name: a.name } : null;
                })
                .filter(Boolean) as { id: string; name: string }[]
            }
          />
        </div>
      )}

      {total > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {favoriten!.map((fav) => {
            const a = fav.anbieter as {
              id: string;
              name: string;
              beschreibung: string | null;
              traeger: string | null;
              plz: string | null;
              ort: string | null;
              telefon: string | null;
              website: string | null;
              verifiziert: boolean;
              logo_url: string | null;
              leistungen: { id: string; name: string; kategorie: string; aktiv: boolean }[];
            } | null;
            if (!a) return null;

            const aktiveLeistungen = a.leistungen?.filter((l) => l.aktiv) ?? [];
            const bw = bewertungenByAnbieter[a.id];
            const anfrage = anfrageByAnbieter[a.id];

            return (
              <Card key={fav.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-2">
                    {/* Logo */}
                    <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-[--primary-light] flex items-center justify-center">
                      {a.logo_url ? (
                        <Image
                          src={a.logo_url}
                          alt={`Logo ${a.name}`}
                          width={44}
                          height={44}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[--primary] font-bold text-base">
                          {a.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base leading-snug">{a.name}</h3>
                        {a.verifiziert && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                      </div>
                      {a.traeger && (
                        <p className="text-xs text-[--muted-foreground]">{a.traeger}</p>
                      )}
                    </div>
                    {/* Inline remove from favorites */}
                    <FavoritButton
                      anbieterId={a.id}
                      istFavorit={true}
                      profileId={profile!.id}
                      size="sm"
                    />
                  </div>

                  {/* Star rating */}
                  {bw && bw.count > 0 && (
                    <Link href={`/anbieter/${a.id}/bewertungen`} className="mb-2 inline-block hover:opacity-80">
                      <SterneDisplay average={bw.avg} count={bw.count} size="sm" />
                    </Link>
                  )}

                  {/* Description */}
                  {a.beschreibung && (
                    <p className="text-sm text-[--muted-foreground] line-clamp-2 mb-2 leading-relaxed">
                      {a.beschreibung}
                    </p>
                  )}

                  {/* Contact info */}
                  <div className="space-y-1 mb-3">
                    {(a.plz || a.ort) && (
                      <p className="text-xs text-[--muted-foreground] flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {a.plz} {a.ort}
                      </p>
                    )}
                    {a.telefon && (
                      <a
                        href={`tel:${a.telefon}`}
                        className="text-xs text-[--muted-foreground] flex items-center gap-1.5 hover:text-[--primary]"
                      >
                        <Phone className="h-3 w-3 shrink-0" />
                        {a.telefon}
                      </a>
                    )}
                    {a.website && (
                      <a
                        href={a.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[--muted-foreground] flex items-center gap-1.5 hover:text-[--primary] truncate"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                  </div>

                  {/* Leistungen badges */}
                  {aktiveLeistungen.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {aktiveLeistungen.slice(0, 3).map((l) => (
                        <Badge key={l.id} variant="secondary" className="text-xs">
                          {l.name}
                        </Badge>
                      ))}
                      {aktiveLeistungen.length > 3 && (
                        <Badge variant="secondary" className="text-xs text-[--muted-foreground]">
                          +{aktiveLeistungen.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Active anfrage hint */}
                  {anfrage && (
                    <Link href={`/familie/anfragen/${anfrage.id}`} className="block mb-3">
                      <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 transition-colors">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span>Offene Anfrage ansehen</span>
                        <ArrowRight className="h-3 w-3 ml-auto shrink-0" />
                      </div>
                    </Link>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-auto pt-2">
                    <Link href={`/anbieter/${a.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Profil
                      </Button>
                    </Link>
                    {!anfrage ? (
                      <Link href={`/anbieter/${a.id}`} className="flex-1">
                        <Button size="sm" className="w-full gap-1 text-xs">
                          Anfrage <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/familie/anfragen/${anfrage.id}`} className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full gap-1 text-xs">
                          Zur Anfrage <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-12 w-12 text-[--muted-foreground] mx-auto mb-4 opacity-30" />
            <p className="font-medium text-[--foreground] mb-1">Noch keine Favoriten gespeichert</p>
            <p className="text-sm text-[--muted-foreground] mb-6">
              Speichern Sie Anbieter aus der Suche, um sie hier wiederzufinden.
            </p>
            <Link href="/suche">
              <Button size="sm" className="gap-1">
                Anbieter suchen <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
