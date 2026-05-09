import { MapPin, Phone, Globe } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatDistance } from "@/lib/utils";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { AnbieterMitLeistungen } from "@/lib/types";

interface AnbieterKarteProps {
  anbieter: AnbieterMitLeistungen;
  avgSterne?: number;
  bewertungenCount?: number;
}

export function AnbieterKarte({ anbieter, avgSterne, bewertungenCount }: AnbieterKarteProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Logo/Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[--primary-light] text-[--primary] font-bold text-xl">
            {anbieter.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Verified */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-[--foreground] truncate">{anbieter.name}</h3>
              {anbieter.verifiziert && (
                <Badge variant="success" className="shrink-0">✓ Verifiziert</Badge>
              )}
            </div>

            {/* Ort + Entfernung */}
            <div className="flex items-center gap-1.5 text-sm text-[--muted-foreground] mt-0.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {anbieter.plz} {anbieter.ort}
              </span>
              {anbieter.entfernung_km !== undefined && (
                <span className="shrink-0 text-[--primary] font-medium">
                  · {formatDistance(anbieter.entfernung_km * 1000)}
                </span>
              )}
            </div>

            {/* Bewertungen */}
            {bewertungenCount != null && bewertungenCount > 0 && avgSterne != null && (
              <div className="mt-1">
                <SterneDisplay average={avgSterne} count={bewertungenCount} size="sm" />
              </div>
            )}

            {/* Leistungs-Tags */}
            {anbieter.leistungen.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {anbieter.leistungen.slice(0, 4).map((l) => (
                  <Badge key={l.id} variant="secondary" className="text-xs">
                    {LEISTUNGSKATEGORIEN[l.kategorie] ?? l.name}
                  </Badge>
                ))}
                {anbieter.leistungen.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{anbieter.leistungen.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Beschreibung */}
            {anbieter.beschreibung && (
              <p className="text-sm text-[--muted-foreground] mt-2 line-clamp-2">
                {anbieter.beschreibung}
              </p>
            )}

            {/* Kontakt + CTA */}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs text-[--muted-foreground]">
                {anbieter.telefon && (
                  <a
                    href={`tel:${anbieter.telefon}`}
                    className="flex items-center gap-1 hover:text-[--primary]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {anbieter.telefon}
                  </a>
                )}
                {anbieter.website && (
                  <a
                    href={anbieter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-[--primary]"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
              </div>
              <Link href={`/anbieter/${anbieter.id}`}>
                <Button size="sm" variant="outline">
                  Mehr erfahren
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
