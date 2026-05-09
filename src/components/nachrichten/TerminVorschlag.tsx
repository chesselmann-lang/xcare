"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, Check, X, Loader2, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  anfrageId: string;
  senderRole: "anbieter" | "familie";
  /** Called after a termin message was sent or responded to */
  onAction?: () => void;
}

interface TerminNachricht {
  type: "termin_vorschlag";
  datum: string;   // ISO date string
  uhrzeit: string; // HH:MM
  dauer: number;   // minutes
  notiz?: string;
  status: "offen" | "angenommen" | "abgelehnt";
}

export function TerminVorschlagDialog({ anfrageId, senderRole, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [datum, setDatum] = useState("");
  const [uhrzeit, setUhrzeit] = useState("10:00");
  const [dauer, setDauer] = useState(60);
  const [notiz, setNotiz] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  // Minimum date = today
  const minDate = new Date().toISOString().split("T")[0];

  async function handleSend() {
    if (!datum || !uhrzeit) {
      toast.error("Bitte Datum und Uhrzeit angeben");
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!profile) throw new Error("Profil nicht gefunden");

      const payload: TerminNachricht = {
        type: "termin_vorschlag",
        datum,
        uhrzeit,
        dauer,
        notiz: notiz.trim() || undefined,
        status: "offen",
      };

      const { error } = await supabase.from("nachrichten").insert({
        anfrage_id: anfrageId,
        sender_id: profile.id,
        inhalt: JSON.stringify(payload),
        typ: "termin_vorschlag",
      });

      if (error) throw error;

      toast.success("Terminvorschlag gesendet");
      setOpen(false);
      setDatum(""); setUhrzeit("10:00"); setDauer(60); setNotiz("");
      onAction?.();
    } catch (err) {
      toast.error("Fehler beim Senden", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-medium text-[--primary] hover:text-[--primary]/80 transition-colors px-3 py-1.5 rounded-lg border border-[--primary]/30 hover:bg-[--primary]/5"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Termin vorschlagen
      </button>
    );
  }

  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--foreground] flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[--primary]" />
          Terminvorschlag
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-[--muted-foreground] hover:text-[--foreground] p-1 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Datum</label>
          <input
            type="date"
            value={datum}
            min={minDate}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full text-sm border border-[--border] rounded-lg px-3 py-1.5 bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Uhrzeit</label>
          <input
            type="time"
            value={uhrzeit}
            onChange={(e) => setUhrzeit(e.target.value)}
            className="w-full text-sm border border-[--border] rounded-lg px-3 py-1.5 bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[--muted-foreground] mb-1">
          Dauer: {dauer} Minuten
        </label>
        <select
          value={dauer}
          onChange={(e) => setDauer(Number(e.target.value))}
          className="w-full text-sm border border-[--border] rounded-lg px-3 py-1.5 bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        >
          {[30, 45, 60, 90, 120].map((m) => (
            <option key={m} value={m}>{m} Minuten</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-[--muted-foreground] mb-1">
          Notiz (optional)
        </label>
        <input
          type="text"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder="z.B. Erstgespräch, bitte pünktlich"
          maxLength={200}
          className="w-full text-sm border border-[--border] rounded-lg px-3 py-1.5 bg-[--background] text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/30"
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending || !datum}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-[--primary] text-white hover:bg-[--primary]/90 disabled:opacity-50 transition-colors"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
        {sending ? "Wird gesendet…" : "Terminvorschlag senden"}
      </button>
    </div>
  );
}

/** Renders a single Termin-Nachricht card inside the chat */
export function TerminNachrichtKarte({
  nachricht,
  isOwn,
  canRespond,
  onRespond,
}: {
  nachricht: TerminNachricht;
  isOwn: boolean;
  canRespond: boolean;
  onRespond?: (status: "angenommen" | "abgelehnt", nachrichtId: string) => void;
}) {
  const [responding, setResponding] = useState<"angenommen" | "abgelehnt" | null>(null);
  const supabase = createClient();

  const datum = new Date(`${nachricht.datum}T${nachricht.uhrzeit}`);
  const datumFormatted = datum.toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const zeitFormatted = datum.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const endzeit = new Date(datum.getTime() + nachricht.dauer * 60000)
    .toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const statusColor = {
    offen: "bg-amber-50 border-amber-200 text-amber-800",
    angenommen: "bg-green-50 border-green-200 text-green-800",
    abgelehnt: "bg-red-50 border-red-200 text-red-800",
  }[nachricht.status];

  const statusLabel = {
    offen: "Ausstehend",
    angenommen: "✓ Bestätigt",
    abgelehnt: "✗ Abgelehnt",
  }[nachricht.status];

  return (
    <div className={`rounded-xl border p-4 space-y-2 max-w-xs ${statusColor}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wide">Terminvorschlag</span>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          nachricht.status === "angenommen" ? "bg-green-100" :
          nachricht.status === "abgelehnt" ? "bg-red-100" : "bg-amber-100"
        }`}>
          {statusLabel}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold">{datumFormatted}</p>
        <div className="flex items-center gap-1 text-xs mt-0.5">
          <Clock className="h-3 w-3" />
          {zeitFormatted} – {endzeit} Uhr ({nachricht.dauer} Min.)
        </div>
        {nachricht.notiz && (
          <p className="text-xs mt-1 opacity-80 italic">{nachricht.notiz}</p>
        )}
      </div>

      {canRespond && nachricht.status === "offen" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              setResponding("angenommen");
              onRespond?.("angenommen", "");
            }}
            disabled={responding !== null}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {responding === "angenommen" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Annehmen
          </button>
          <button
            onClick={() => {
              setResponding("abgelehnt");
              onRespond?.("abgelehnt", "");
            }}
            disabled={responding !== null}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-current hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {responding === "abgelehnt" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Ablehnen
          </button>
        </div>
      )}
    </div>
  );
}
