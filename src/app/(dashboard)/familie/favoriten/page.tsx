import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, MapPin, Phone, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function FamilieFavoritenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter");

  const { data: favoriten } = await supabase
    .from("favoriten")
    .select("*, anbieter(*, leistungen(id, name, kategorie, aktiv))")
    .eq("familie_id", profile?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/familie">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Meine Favoriten</h1>
          <p className="text-sm text-[--muted-foreground]">
            {favoriten?.length ?? 0} gespeicherte Anbieter
          </p>
        </div>
      </div>

      {favoriten && favoriten.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {favoriten.map((fav: {
            id: string;
            anbieter: {
              id: string;
              name: string;
              beschreibung: string | null;
              traeger: string | null;
              plz: string | null;
              ort: string | null;
              telefon: string | null;
              website: string | null;
              verifiziert: boolean;
              leistungen: { id: string; name: string; kategorie: string; aktiv: boolean }[];
            } | null;
          }) => {
            const a = fav.anbieter;
            if (!a) return null;
            const aktiveLeistungen = a.leistungen?.filter((l) => l.aktiv) ?? [];
            return (
              <Card key={fav.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">{a.name}</h3>
                        {a.verifiziert && (
                          <Badge variant="success" className="shrink-0 text-xs">✓</Badge>
                        )}
                      </div>
                      {a.traeger && (
                        <p className="text-xs text-[--muted-foreground]">{a.traeger}</p>
                      )}
                    </div>
                    <Heart className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  </div>

                  {a.beschreibung && (
                    <p className="text-sm text-[--muted-foreground] line-clamp-2 mb-3">
                      {a.beschreibung}
                    </p>
                  )}

                  <div className="space-y-1 mb-3">
                    {(a.plz || a.ort) && (
                      <p className="text-xs text-[--muted-foreground] flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {a.plz} {a.ort}
                      </p>
                    )}
                    {a.telefon && (
                      <p className="text-xs text-[--muted-foreground] flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {a.telefon}
                      </p>
                    )}
                    {a.website && (
                      <p className="text-xs text-[--muted-foreground] flex items-center gap-1 truncate">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.website.replace(/^https?:\/\//, "")}</span>
                      </p>
                    )}
                  </div>

                  {aktiveLeistungen.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {aktiveLeistungen.slice(0, 3).map((l) => (
                        <Badge key={l.id} variant="secondary" className="text-xs">
                          {l.name}
                        </Badge>
                      ))}
                      {aktiveLeistungen.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{aktiveLeistungen.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {a.telefon && (
                      <a href={`tel:${a.telefon}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Phone className="h-3 w-3" /> Anrufen
                        </Button>
                      </a>
                    )}
                    <Link href={`/suche?anbieter=${a.id}`} className="flex-1">
                      <Button size="sm" className="w-full gap-1">
                        Anfrage <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
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
            <p className="text-[--muted-foreground] mb-1">Noch keine Favoriten gespeichert</p>
            <p className="text-sm text-[--muted-foreground] mb-4">
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
