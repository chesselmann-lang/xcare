/**
 * OeffentlicherVerfuegbarkeitskalender
 * Shows a 4-week availability preview on the public Anbieter profile.
 * Based on Öffnungszeiten + overall Verfügbarkeitsstatus.
 * No appointments or personal data are revealed.
 */
import { cn } from "@/lib/utils";
import type { OeffnungszeitenMap } from "@/components/anbieter/OeffnungszeitenEditor";

type Verfuegbarkeit = "verfuegbar" | "eingeschraenkt" | "ausgebucht" | "abwesend" | null;

interface Props {
  oeffnungszeiten: OeffnungszeitenMap | null;
  verfuegbarkeit: Verfuegbarkeit;
}

// JS weekday (0=Sun) → German short key
const JS_TO_DE: Record<number, string> = {
  0: "so", 1: "mo", 2: "di", 3: "mi", 4: "do", 5: "fr", 6: "sa",
};

const TAG_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getDayStatus(
  date: Date,
  oeffnungszeiten: OeffnungszeitenMap | null,
  verfuegbarkeit: Verfuegbarkeit
): "verfuegbar" | "eingeschraenkt" | "ausgebucht" | "geschlossen" {
  if (verfuegbarkeit === "ausgebucht" || verfuegbarkeit === "abwesend") {
    return "ausgebucht";
  }
  const deKey = JS_TO_DE[date.getDay()];
  const tagesZeiten = oeffnungszeiten?.[deKey];
  if (!tagesZeiten?.offen) return "geschlossen";
  if (verfuegbarkeit === "eingeschraenkt") return "eingeschraenkt";
  return "verfuegbar";
}

const STATUS_STYLE: Record<string, string> = {
  verfuegbar: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  eingeschraenkt: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ausgebucht: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  geschlossen: "bg-[--muted]/40 text-[--muted-foreground]",
};

const STATUS_LABEL: Record<string, string> = {
  verfuegbar: "Verfügbar",
  eingeschraenkt: "Eingeschränkt",
  ausgebucht: "Ausgebucht",
  geschlossen: "Geschlossen",
};

export function OeffentlicherVerfuegbarkeitskalender({ oeffnungszeiten, verfuegbarkeit }: Props) {
  // Build 4-week grid starting from today's Monday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Monday of this week
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  // Build 4 weeks × 7 days
  const weeks: Date[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }

  const hasOpenDays = oeffnungszeiten
    ? Object.values(oeffnungszeiten).some((t) => t.offen)
    : false;

  if (!hasOpenDays && !verfuegbarkeit) {
    return (
      <p className="text-sm text-[--muted-foreground] italic">
        Keine Öffnungszeiten hinterlegt.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1">
        {TAG_LABELS.map((t) => (
          <div key={t} className="text-center text-xs font-medium text-[--muted-foreground] py-1">
            {t}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((day, di) => {
            const isPast = day < today;
            const isToday = day.getTime() === today.getTime();
            const status = isPast
              ? "geschlossen"
              : getDayStatus(day, oeffnungszeiten, verfuegbarkeit);

            return (
              <div
                key={di}
                title={`${day.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}: ${STATUS_LABEL[status]}`}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-opacity",
                  isPast ? "opacity-40" : "",
                  STATUS_STYLE[status],
                  isToday && "ring-2 ring-[--primary] ring-offset-1"
                )}
              >
                <span className="font-medium text-[10px] leading-none">
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { key: "verfuegbar", label: "Verfügbar" },
          { key: "eingeschraenkt", label: "Eingeschränkt" },
          { key: "ausgebucht", label: "Ausgebucht/Abwesend" },
          { key: "geschlossen", label: "Geschlossen" },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
            <span className={cn("h-3 w-3 rounded-sm inline-block", STATUS_STYLE[key])} />
            {label}
          </span>
        ))}
      </div>

      <p className="text-xs text-[--muted-foreground]">
        Basiert auf den Öffnungszeiten des Anbieters. Für genaue Termine bitte direkt anfragen.
      </p>
    </div>
  );
}
