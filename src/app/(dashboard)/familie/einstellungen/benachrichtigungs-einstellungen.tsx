"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Keys persisted to the DB email_prefs column
const DB_KEYS = new Set(["statusupdate", "neue_nachricht", "bewertung"]);

type NotifType = "statusupdate" | "neue_nachricht" | "kontakt" | "bewertung" | "system";

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
    beschreibung: "Wichtige Plattform-Hinweise und Updates (immer an, kann nicht deaktiviert werden).",
  },
];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<NotifType | null>(null);

  // Load preferences from DB on mount
  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/profil/email-prefs");
      if (res.ok) {
        const { prefs: dbPrefs } = await res.json();
        setPrefs({ ...getDefaults(), ...dbPrefs });
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  async function toggle(key: NotifType) {
    if (key === "system") return; // system notifications cannot be disabled
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic update
    setSaving(key);

    // Persist to DB if this key is tracked server-side
    if (DB_KEYS.has(key)) {
      try {
        const res = await fetch("/api/profil/email-prefs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next[key] }),
        });
        if (!res.ok) throw new Error("save failed");
        toast.success(next[key] ? "Benachrichtigung aktiviert" : "Benachrichtigung deaktiviert", { duration: 1500 });
      } catch {
        setPrefs(prefs); // revert on error
        toast.error("Einstellung konnte nicht gespeichert werden.");
      }
    } else {
      toast.success(next[key] ? "Benachrichtigung aktiviert" : "Benachrichtigung deaktiviert", { duration: 1500 });
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[--muted-foreground]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Einstellungen werden geladen…</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {NOTIF_TYPEN.map(({ key, label, beschreibung }) => {
        const enabled = prefs[key];
        const isSystem = key === "system";
        const isSaving = saving === key;
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
            {isSystem ? (
              <span className="text-xs text-[--muted-foreground]">Pflicht</span>
            ) : (
              <button
                onClick={() => toggle(key)}
                disabled={isSaving}
                aria-label={enabled ? `${label} deaktivieren` : `${label} aktivieren`}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--primary] disabled:opacity-60 ${
                  enabled ? "bg-[--primary]" : "bg-gray-200"
                }`}
              >
                {isSaving
                  ? <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
                  : <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
                }
              </button>
            )}
          </div>
        );
      })}
      <p className="text-xs text-[--muted-foreground] pt-2">
        E-Mail-Einstellungen werden in Ihrem Konto gespeichert und gelten geräteübergreifend.
      </p>
    </div>
  );
}
