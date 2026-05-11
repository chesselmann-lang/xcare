"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Play, RefreshCcw, Loader2 } from "lucide-react";

interface Klient {
  id: string;
  lebenslage?: string | null;
  pflegegrad?: number | null;
  geburtsjahr?: number | null;
  letzte_pruefung_at?: string | null;
}

export default function KlientAnspruchsPruefungClient({
  klientId,
  klient,
}: {
  klientId: string;
  klient: Klient;
}) {
  const [loading, setLoading] = useState(false);

  const pruefungStarten = async () => {
    if (!klient.lebenslage) {
      toast.error("Bitte zuerst eine Lebenslage zuweisen");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Server Action via API-Route aufrufen
      const res = await fetch("/api/traeger/anspruch-pruefen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klientId,
          lebenslage: klient.lebenslage,
          pflegegrad: klient.pflegegrad,
          alter: klient.geburtsjahr ? new Date().getFullYear() - klient.geburtsjahr : 65,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Anspruchsprüfung abgeschlossen");
      window.location.reload();
    } catch (err) {
      toast.error("Fehler bei der Prüfung: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={pruefungStarten}
      disabled={loading || !klient.lebenslage}
      className="flex items-center gap-2 w-full justify-center bg-[--primary] text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : klient.letzte_pruefung_at ? (
        <RefreshCcw className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {loading
        ? "Prüfung läuft…"
        : klient.letzte_pruefung_at
        ? "Ansprüche neu prüfen"
        : "Anspruchsprüfung starten"}
    </button>
  );
}
