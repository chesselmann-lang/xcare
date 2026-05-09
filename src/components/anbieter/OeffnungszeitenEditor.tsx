"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

export interface TagZeiten {
  offen: boolean;
  von: string;
  bis: string;
}

export type OeffnungszeitenMap = Record<string, TagZeiten>;

const TAGE = [
  { key: "mo", label: "Montag" },
  { key: "di", label: "Dienstag" },
  { key: "mi", label: "Mittwoch" },
  { key: "do", label: "Donnerstag" },
  { key: "fr", label: "Freitag" },
  { key: "sa", label: "Samstag" },
  { key: "so", label: "Sonntag" },
] as const;

const DEFAULT_ZEITEN: TagZeiten = { offen: false, von: "09:00", bis: "17:00" };

interface Props {
  value: OeffnungszeitenMap;
  onChange: (value: OeffnungszeitenMap) => void;
}

export function OeffnungszeitenEditor({ value, onChange }: Props) {
  function getTag(key: string): TagZeiten {
    return value[key] ?? { ...DEFAULT_ZEITEN };
  }

  function updateTag(key: string, update: Partial<TagZeiten>) {
    onChange({ ...value, [key]: { ...getTag(key), ...update } });
  }

  function copyToAll(key: string) {
    const src = getTag(key);
    const updated: OeffnungszeitenMap = {};
    TAGE.forEach((t) => {
      updated[t.key] = { ...src };
    });
    onChange(updated);
  }

  function copyWeekday(key: string) {
    const src = getTag(key);
    const updated = { ...value };
    TAGE.slice(0, 5).forEach((t) => {
      updated[t.key] = { ...src };
    });
    onChange(updated);
  }

  return (
    <div className="space-y-1">
      <div className="grid gap-1">
        {TAGE.map((tag) => {
          const tz = getTag(tag.key);
          return (
            <div
              key={tag.key}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                tz.offen
                  ? "border-[--primary]/30 bg-[--primary-light]"
                  : "border-[--border] bg-[--muted]"
              }`}
            >
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={tz.offen}
                onClick={() => updateTag(tag.key, { offen: !tz.offen })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                  tz.offen ? "bg-[--primary]" : "bg-[--border]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    tz.offen ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Tag-Label */}
              <span className="text-sm font-medium w-20 shrink-0">{tag.label}</span>

              {/* Zeiten */}
              {tz.offen ? (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" />
                  <input
                    type="time"
                    value={tz.von}
                    onChange={(e) => updateTag(tag.key, { von: e.target.value })}
                    className="text-sm border border-[--border] rounded-md px-2 py-1 bg-[--background] focus:outline-none focus:ring-1 focus:ring-[--primary]/40 w-28"
                  />
                  <span className="text-xs text-[--muted-foreground]">bis</span>
                  <input
                    type="time"
                    value={tz.bis}
                    onChange={(e) => updateTag(tag.key, { bis: e.target.value })}
                    className="text-sm border border-[--border] rounded-md px-2 py-1 bg-[--background] focus:outline-none focus:ring-1 focus:ring-[--primary]/40 w-28"
                  />
                  {/* Quick-copy buttons */}
                  {tag.key === "mo" && (
                    <div className="flex gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => copyWeekday(tag.key)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[--primary]/10 text-[--primary] hover:bg-[--primary]/20 transition-colors"
                        title="Mo–Fr gleich setzen"
                      >
                        Mo–Fr
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToAll(tag.key)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[--primary]/10 text-[--primary] hover:bg-[--primary]/20 transition-colors"
                        title="Alle Tage gleich setzen"
                      >
                        Alle
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-[--muted-foreground] flex-1">Geschlossen</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Display-only component for public pages ──────────────────────────────────

const TAG_LABELS: Record<string, string> = {
  mo: "Mo", di: "Di", mi: "Mi", do: "Do", fr: "Fr", sa: "Sa", so: "So",
};

export function OeffnungszeitenAnzeige({ oeffnungszeiten }: { oeffnungszeiten: OeffnungszeitenMap }) {
  // Group consecutive days with same hours
  const grouped: { tage: string[]; von: string; bis: string }[] = [];

  TAGE.forEach(({ key }) => {
    const tz = oeffnungszeiten[key];
    if (!tz?.offen) return;

    const last = grouped[grouped.length - 1];
    if (last && last.von === tz.von && last.bis === tz.bis) {
      last.tage.push(key);
    } else {
      grouped.push({ tage: [key], von: tz.von, bis: tz.bis });
    }
  });

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {grouped.map((g, i) => {
        const tagStr = g.tage.length === 1
          ? TAG_LABELS[g.tage[0]]
          : `${TAG_LABELS[g.tage[0]]}–${TAG_LABELS[g.tage[g.tage.length - 1]]}`;
        return (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="font-medium">{tagStr}</span>
            <span className="text-[--muted-foreground]">{g.von} – {g.bis} Uhr</span>
          </div>
        );
      })}
    </div>
  );
}
