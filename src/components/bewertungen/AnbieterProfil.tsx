import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Bewertung {
  id: string;
  gesamt_score: number;
  zuverlaessigkeit: number;
  fachkompetenz: number;
  freundlichkeit: number;
  kommunikation: number;
  pünktlichkeit: number;
  kommentar: string | null;
  verifiziert: boolean;
  anbieter_antwort: string | null;
  anbieter_antwort_am: string | null;
  created_at: string;
}

interface Scores {
  durchschnitt: number | null;
  anzahl_bewertungen: number;
  verifizierte_bewertungen: number;
  avg_zuverlaessigkeit: number | null;
  avg_fachkompetenz: number | null;
  avg_freundlichkeit: number | null;
  avg_kommunikation: number | null;
  avg_pünktlichkeit: number | null;
}

interface AnbieterProfilProps {
  anbieterId: string;
  name: string;
  logoUrl?: string | null;
  buchungsUrl?: string;
  bewertungen: Bewertung[];
  scores: Scores;
}

const KRITERIEN: Array<{ key: keyof Scores; label: string }> = [
  { key: "avg_zuverlaessigkeit", label: "Zuverlässigkeit" },
  { key: "avg_fachkompetenz", label: "Fachkompetenz" },
  { key: "avg_freundlichkeit", label: "Freundlichkeit" },
  { key: "avg_kommunikation", label: "Kommunikation" },
  { key: "avg_pünktlichkeit", label: "Pünktlichkeit" },
];

function StarDisplay({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-lg leading-none ${s <= rounded ? "text-amber-400" : "text-gray-200"}`}>
          {s <= rounded ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function MiniProgressBar({ value }: { value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-6 text-right">
        {value?.toFixed(1) ?? "–"}
      </span>
    </div>
  );
}

export function AnbieterProfil({
  anbieterId,
  name,
  logoUrl,
  buchungsUrl,
  bewertungen,
  scores,
}: AnbieterProfilProps) {
  const recent = bewertungen.slice(0, 5);
  const hasScores = scores.anzahl_bewertungen > 0;

  return (
    <div className="rounded-2xl border border-[--border] bg-[--card] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-6 pt-6 pb-5 border-b border-[--border]">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white border border-[--border] overflow-hidden flex items-center justify-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-400">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + Score */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[--foreground] truncate">{name}</h2>

            {hasScores ? (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-amber-500">
                    {scores.durchschnitt?.toFixed(1) ?? "–"}
                  </span>
                  <div>
                    <StarDisplay value={scores.durchschnitt ?? 0} />
                    <p className="text-xs text-[--muted-foreground] mt-0.5">
                      {scores.anzahl_bewertungen} Bewertung{scores.anzahl_bewertungen !== 1 ? "en" : ""}
                      {scores.verifizierte_bewertungen > 0 && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-green-600">
                          · <CheckCircle2 className="h-3 w-3" />
                          {scores.verifizierte_bewertungen} verifiziert
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[--muted-foreground] mt-1">Noch keine Bewertungen</p>
            )}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {hasScores && (
        <div className="px-6 py-4 border-b border-[--border]">
          <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-3">
            Bewertungsdetails
          </h3>
          <div className="space-y-2">
            {KRITERIEN.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-[--foreground] w-28 shrink-0">{label}</span>
                <MiniProgressBar value={scores[key] as number | null} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review List */}
      {recent.length > 0 && (
        <div className="px-6 py-4 border-b border-[--border]">
          <h3 className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-3">
            Neueste Bewertungen
          </h3>
          <div className="space-y-4">
            {recent.map((b) => (
              <div key={b.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarDisplay value={b.gesamt_score} />
                    {b.verifiziert && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Verifizierte Buchung
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-[--muted-foreground] shrink-0">
                    {new Date(b.created_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
                {b.kommentar && (
                  <p className="mt-1.5 text-sm text-[--foreground] leading-relaxed">
                    &ldquo;{b.kommentar}&rdquo;
                  </p>
                )}
                {b.anbieter_antwort && (
                  <div className="mt-2 ml-3 pl-3 border-l-2 border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-0.5">Antwort des Anbieters</p>
                    <p className="text-xs text-[--foreground]">{b.anbieter_antwort}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 py-4">
        <Link href={buchungsUrl ?? `/anbieter/${anbieterId}`}>
          <Button className="w-full">Jetzt buchen</Button>
        </Link>
      </div>
    </div>
  );
}
