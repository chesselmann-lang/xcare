"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";

type NotifType = "statusupdate" | "neue_nachricht" | "system" | "bewertung" | "kontakt";

const NOTIF_TYPEN: { key: NotifType; label: string; beschreibung: string }[] = [
  {
    key: "statusupdate",
    label: "Anfragen-Updates",
    beschreibung: "Wenn sich der Status einer Ihrer Anfragen ändert.",
  },
  {
    key: "neue_nachricht",
    label: "Neue Nachrichten",
    beschreibung: "Wenn ein Anbieter Ihnen eine Nachricht sendet.",
  },
  {
    key: "kontakt",
    label: "Kontaktanfragen",
    beschreibung: "Wenn ein Anbieter direkt Kontakt aufnimmt.",
  },
  {
    key: "bewertung",
    label: "Bewertungs-Erinnerungen",
    beschreibung: "Erinnerungen, eine Bewertung abzugeben.",
  },
  {
    key: "system",
    label: "System-Hinweise",
    beschreibung: "Wichtige Plattform-Hinweise und Updates.",
  },
];

const STORAGE_KEY = "xcare_familie_notif_prefs";

function loadPrefs(): Record<NotifType, boolean> {
  if (typeof window === "undefined") return getDefaults();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...getDefaults(), ...JSON.parse(stored) };
  } catch {
    /* ignore */
  }
  return getDefaults();
}

function getDefaults(): Record<NotifType, boolean> {
  return {
    statusupdate: true,
    neue_nachricht: true,
    kontakt: true,
    bewertung: true,
    system: true,
  };
}

export function BenachrichtigungsEinstellungen() {
  const [prefs, setPrefs] = useState<Record<NotifType, boolean>>(getDefaults);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  function toggle(key: NotifType) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    toast.success(next[key] ? "Benachrichtigung aktiviert" : "Benachrichtigung deaktiviert", {
      duration: 1500,
    });
  }

  if (!mounted) return null;

  return (
    <div className="space-y-3">
      {NOTIF_TYPEN.map(({ key, label, beschreibung }) => {
        const enabled = prefs[key];
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-4 py-3 border-b border-[--border] last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {enabled ? (
                  <Bell className="h-3.5 w-3.5 text-[--primary] shrink-0" />
                ) : (
                  <BellOff className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" />
                )}
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
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  enabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}
      <p className="text-xs text-[--muted-foreground] pt-1">
        Diese Einstellungen gelten für In-App-Benachrichtigungen und werden lokal gespeichert.
      </p>
    </div>
  );
}
