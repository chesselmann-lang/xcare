"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BewertungAntwortForm({
  bewertungId,
  existingAntwort,
}: {
  bewertungId: string;
  existingAntwort: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existingAntwort ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("bewertungen")
        .update({ antwort: text.trim(), antwort_at: new Date().toISOString() })
        .eq("id", bewertungId);

      if (error) {
        toast.error("Fehler beim Speichern der Antwort");
        return;
      }
      toast.success(existingAntwort ? "Antwort aktualisiert" : "Antwort veröffentlicht");
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="px-5 py-3 border-t border-gray-50 flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {existingAntwort ? (
            <><Edit2 className="h-3.5 w-3.5" /> Antwort bearbeiten</>
          ) : (
            <><MessageSquare className="h-3.5 w-3.5" /> Antworten</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs font-semibold text-gray-600 mb-2">
        {existingAntwort ? "Antwort bearbeiten" : "Öffentliche Antwort verfassen"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Schreiben Sie eine freundliche, professionelle Antwort…"
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        maxLength={1000}
        autoFocus
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{text.length}/1000</span>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpen(false); setText(existingAntwort ?? ""); }}
            disabled={isPending}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {existingAntwort ? "Aktualisieren" : "Veröffentlichen"}
          </button>
        </div>
      </div>
    </div>
  );
}
