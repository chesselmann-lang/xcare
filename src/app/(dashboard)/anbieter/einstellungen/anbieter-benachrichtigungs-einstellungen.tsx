"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

type NotifType =
  | "neue_anfrage"
  | "statusupdate"
  | "neue_nachricht"
  | "bewertung"
  | "wiedervorlage"
  | "wochentlicher_digest"
  | "system";

const NOTIF_TYPEN: { key: NotifType; label: string; beschreibung: string }[] = [
  {
    key: "neue_anfrage",
    label: "Neue Anfragen",
    beschreibung: "Sofort benachrichtigt werden, wenn eine neue Anfrage eingeht.",
  },
  {
    key: "statusupdate",
    label: "Status-Änderungen",
    beschreibung: "Wenn eine Familie den Status einer Anfrage ändert.",
  },
  {
    key: "neue_nachricht",
    label: "Neue Nachrichten",
    beschreibung: "Wenn eine Familie Ihnen eine Nachricht sendet.",
  },
  {
    key: "bewertung",
    label: "Neue Bewertungen",
    beschreibung: "Wenn ein Kunde eine Bewertung über Ihren Dienst abgibt.",
  },
  {
    key: "wiedervorlage",
    label: "Wiedervorlagen-Erinnerungen",
    beschreibung: "Erinnerungen an fällige Wiedervorlagen.",
  },
  {
    key: "wochentlicher_digest",
    label: "Wöchentlicher Digest",
    beschreibung: "Zusammenfassung Ihrer Anfragen und Aktivitäten per E-Mail.",
  },
  {
    key: "system",
    label: "System-Hinweise",
    beschreibung: "Wichtige Plattform-Updates und Wartungshinweise.",
  },
];

const STORAGE_KEY = "xcare_anbieter_notif_prefs";

function getDefaults(): Record<NotifType, boolean> {
  return {
    neue_anfrage: true,
    statusupdate: true,
    neue_nachricht: true,
    bewertung: true,
    wiedervorlage: true,
    wochentlicher_digest: true,
    system: true,
  };
}

function loadPrefs(): Record<NotifType, boolean> {
  if (typeof window === "undefined") return getDefaults();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getDefaults(), ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return getDefaults();
}

export function AnbieterBenachrichtigungsEinstellungen() {
  const [prefs, setPrefs] = useState<Record<NotifType, boolean>>(getDefaults);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  function toggle(key: NotifType) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    toast.success(next[key] ? "Benachrichtigung aktiviert" : "Benachrichtigung deaktiviert", { duration: 1500 });
  }

  if (!mounted) return null;

  return (
    <div className="space-y-1">
      {NOTIF_TYPEN.map(({ key, label, beschreibung }) => {
        const enabled = prefs[key];
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-4 py-3 border-b border-[--border] last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {enabled
                  ? <Bell className="h-3.5 w-3.5 text-[--primary] shrink-0" />
                  : <BellOff className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" />}
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="text-xs text-[--muted-foreground] mt-0.5 pl-5">{beschreibung}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              aria-label={enabled ? `${label} deaktivieren` : `${label} aktivieren`}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--primary] ${
                enabled ? "bg-[--primary]" : "bg-gray-200"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        );
      })}
      <p className="text-xs text-[--muted-foreground] pt-2">
        Diese Einstellungen gelten für In-App-Benachrichtigungen und werden lokal gespeichert.
      </p>
    </div>
  );
}
