import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Bookmark, Phone, Globe, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerfuegbarkeitBadge } from "@/components/anbieter/VerfuegbarkeitBadge";
import { VerifizierungsBadge } from "@/components/anbieter/VerifizierungsBadge";
import { LeistungsBadgeGroup } from "@/components/anbieter/LeistungsBadge";
import { MerklisteToggle } from "@/components/merkliste/MerklisteToggle";
import type { LeistungsKategorie } from "@/lib/types";

export default async function FamilieMerklistePage() {
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

  if (profile?.role !== "familie") redirect("/");

  const { data: eintraege } = await supabase
    .from("merkliste")
    .select(
      "id, created_at, anbieter:anbieter_id(id, name, plz, ort, telefon, website, logo_url, verifiziert, verfuegbarkeit, leistungen(kategorie))"
    )
    .eq("familie_id", profile.id)
    .order("created_at", { ascending: false });

  type MerklistEintrag = {
    id: string;
    created_at: string;
    anbieter: {
      id: string;
      name: string;
      plz: string | null;
      ort: string | null;
      telefon: string | null;
      website: string | null;
      logo_url: string | null;
      verifiziert: boolean;
      verfuegbarkeit: string | null;
      leistungen: { kategorie: LeistungsKategorie }[];
    } | null;
  };

  const liste = (eintraege ?? []) as MerklistEintrag[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/familie">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-indigo-600" />
            Meine Merkliste
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            {liste.length === 0
              ? "Noch keine Anbieter gespeichert"
              : `${liste.length} gespeicherte${liste.length === 1 ? "r Anbieter" : " Anbieter"}`}
          </p>
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="text-center py-20 text-[--muted-foreground]">
          <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium mb-1">Noch nichts gespeichert</p>
          <p className="text-sm mb-6">
            Beim Durchsuchen der Anbieter kannst du interessante Einträge auf
            die Merkliste setzen.
          </p>
          <Link href="/suche">
            <Button variant="outline">Anbieter suchen</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {liste.map((eintrag) => {
            const a = eintrag.anbieter;
            if (!a) return null;
            const kategorien = a.leistungen.map((l) => l.kategorie);
            return (
              <Card key={eintrag.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {/* Logo */}
                    <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-[--primary-light] flex items-center justify-center">
                      {a.logo_url ? (
                        <Image
                          src={a.logo_url}
                          alt={`Logo ${a.name}`}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[--primary] font-bold text-xl">
                          {a.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[--foreground] truncate">
                          {a.name}
                        </h3>
                        {a.verifiziert && (
                          <VerifizierungsBadge variant="badge" size="xs" />
                        )}
                        <VerfuegbarkeitBadge
                          verfuegbarkeit={
                            a.verfuegbarkeit as
                              | "verfuegbar"
                              | "eingeschraenkt"
                              | "ausgebucht"
                              | null
                          }
                          size="xs"
                        />
                      </div>

                      {/* Ort */}
                      {(a.plz || a.ort) && (
                        <div className="flex items-center gap-1.5 text-sm text-[--muted-foreground] mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {a.plz} {a.ort}
                          </span>
                        </div>
                      )}

                      {/* Leistungs-Badges */}
                      {kategorien.length > 0 && (
                        <div className="mt-2">
                          <LeistungsBadgeGroup
                            kategorien={kategorien}
                            max={4}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-xs text-[--muted-foreground]">
                          {a.telefon && (
                            <a
                              href={`tel:${a.telefon}`}
                              className="flex items-center gap-1 hover:text-[--primary]"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {a.telefon}
                            </a>
                          )}
                          {a.website && (
                            <a
                              href={a.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-[--primary]"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              Website
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MerklisteToggle
                            anbieterId={a.id}
                            familieId={profile.id}
                            initialSaved={true}
                            size="sm"
                          />
                          <Link href={`/anbieter/${a.id}`}>
                            <Button size="sm" variant="outline">
                              Profil ansehen
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
