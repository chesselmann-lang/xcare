"use client";

import { useState } from "react";
import { StickyNote, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AnfrageQuickNotizProps {
  anfrageId: string;
  anbieterId: string;
  /** Pre-populated from the latest notiz, if any */
  initialText?: string;
}

/**
 * Lean inline quick-note widget for the Anbieter Anfragen-Detailseite.
 * Saves a new notiz entry to anfrage_notizen on submit.
 */
export function AnfrageQuickNotiz({
  anfrageId,
  anbieterId,
  initialText = "",
}: AnfrageQuickNotizProps) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("anfrage_notizen").insert({
        anfrage_id: anfrageId,
        anbieter_id: anbieterId,
        inhalt: trimmed,
      });
      if (error) throw error;
      setSaved(true);
      toast.success("Notiz gespeichert");
      // Auto-hide saved indicator
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <StickyNote className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm font-semibold text-amber-900">Schnellnotiz</p>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-700 animate-in fade-in duration-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Gespeichert
          </span>
        )}
      </div>
      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value.slice(0, 2000)); setSaved(false); }}
        rows={3}
        placeholder="Interne Notiz zu dieser Anfrage (nur für Sie sichtbar)…"
        className="resize-none bg-white/80 border-amber-200 focus:border-amber-400 text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-amber-700 opacity-60">{text.length}/2000</span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading || !text.trim()}
          className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Notiz speichern
        </Button>
      </div>
      <p className="text-xs text-amber-700 opacity-60">
        Notizen werden unten im CRM-Bereich gespeichert und sind nur für Ihren Account sichtbar.
      </p>
    </div>
  );
}
