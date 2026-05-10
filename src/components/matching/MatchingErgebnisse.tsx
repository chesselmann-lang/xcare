"use client";

// ============================================
// xcare — Matching-Ergebnisse Komponente (Phase 3C)
// ============================================

import Link from "next/link";
import { CheckCircle2, Star, MapPin, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnbieterMatch } from "@/lib/matching/engine";

interface MatchingErgebnisseProps {
  matches: AnbieterMatch[];
  isLoading?: boolean;
}

// ─── Score-Farbe ─────────────────────────────────────────────────────────────

function getScoreColor(score: number): {
  pill: string;
  bar: string;
} {
  if (score >= 70) {
    return {
      pill: "bg-green-100 text-green-800 border border-green-200",
      bar: "bg-green-500",
    };
  }
  if (score >= 40) {
    return {
      pill: "bg-blue-100 text-blue-800 border border-blue-200",
      bar: "bg-blue-500",
    };
  }
  return {
    pill: "bg-gray-100 text-gray-600 border border-gray-200",
    bar: "bg-gray-400",
  };
}

// ─── Sterne-Anzeige ───────────────────────────────────────────────────────────

function SterneAnzeige({ schnitt }: { schnitt: number | null }) {
  if (!schnitt) return null;
  const voll = Math.floor(schnitt);
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < voll ? "fill-current" : "opacity-30"}`}
        />
      ))}
      <span className="text-xs text-[--muted-foreground] ml-0.5">{schnitt.toFixed(1)}</span>
    </div>
  );
}

// ─── Lade-Skeleton ────────────────────────────────────────────────────────────

function MatchingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Einzel-Match-Karte ───────────────────────────────────────────────────────

function MatchKarte({ match }: { match: AnbieterMatch }) {
  const { pill, bar } = getScoreColor(match.score);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Anbieter-Avatar */}
          <div className="h-10 w-10 rounded-lg bg-[--primary-light] flex items-center justify-center shrink-0 font-bold text-[--primary] text-base">
            {match.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + Verified */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-[--foreground] text-sm truncate">{match.name}</h3>
              {match.verified && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-green-500 shrink-0"
                  aria-label="Verifizierter Anbieter"
                />
              )}
            </div>

            {/* Ort */}
            {match.ort && (
              <div className="flex items-center gap-1 text-xs text-[--muted-foreground] mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{match.ort}</span>
              </div>
            )}

            {/* Score-Balken */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[--muted-foreground]">Übereinstimmung</span>
              </div>
              <div className="h-1.5 w-full bg-[--border] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${bar}`}
                  style={{ width: `${match.score}%` }}
                  role="progressbar"
                  aria-valuenow={match.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Match-Grund */}
            <p className="text-xs text-[--muted-foreground] mt-1.5 leading-snug">
              {match.match_reason}
            </p>

            {/* Kategorien */}
            {match.kategorie.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {match.kategorie.slice(0, 3).map((kat) => (
                  <span
                    key={kat}
                    className="inline-flex items-center gap-0.5 text-[10px] bg-[--muted] text-[--muted-foreground] px-2 py-0.5 rounded-full"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {kat.replace(/_/g, " ")}
                  </span>
                ))}
                {match.kategorie.length > 3 && (
                  <span className="text-[10px] text-[--muted-foreground] px-1">
                    +{match.kategorie.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Bewertung */}
            <div className="mt-2">
              <SterneAnzeige schnitt={match.bewertung_schnitt} />
            </div>
          </div>

          {/* Score-Pill + Link */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pill}`}>
              {match.score}%
            </span>
            <Link
              href={`/anbieter/${match.anbieter_id}`}
              className="text-xs font-medium text-[--primary] hover:underline whitespace-nowrap"
            >
              Profil ansehen →
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function MatchingErgebnisse({ matches, isLoading = false }: MatchingErgebnisseProps) {
  if (isLoading) {
    return <MatchingSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 text-[--muted-foreground]">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm font-medium">Keine passenden Anbieter gefunden</p>
        <p className="text-xs mt-1">
          Versuchen Sie, Ihre Suchkriterien anzupassen oder erweitern Sie den Suchradius.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <MatchKarte key={match.anbieter_id} match={match} />
      ))}
    </div>
  );
}
