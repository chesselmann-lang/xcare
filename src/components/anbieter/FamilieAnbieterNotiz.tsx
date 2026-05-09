"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { StickyNote, Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  anbieterId: string;
  familieId: string;
  initialNotiz: string | null;
}

export function FamilieAnbieterNotiz({ anbieterId, familieId, initialNotiz }: Props) {
  const [notiz, setNotiz] = useState(initialNotiz ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notiz);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function startEdit() {
    setDraft(notiz);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(notiz);
    setEditing(false);
  }

  async function save() {
    const trimmed = draft.trim();
    startTransition(async () => {
      if (trimmed === "") {
        // Delete if empty
        await supabase
          .from("familie_anbieter_notizen")
          .delete()
          .eq("familie_id", familieId)
          .eq("anbieter_id", anbieterId);
        setNotiz("");
        setEditing(false);
        toast.success("Notiz gelöscht.");
        return;
      }

      const { error } = await supabase
        .from("familie_anbieter_notizen")
        .upsert(
          {
            familie_id: familieId,
            anbieter_id: anbieterId,
            notiz: trimmed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "familie_id,anbieter_id" }
        );

      if (error) {
        toast.error("Fehler beim Speichern der Notiz.");
        return;
      }
      setNotiz(trimmed);
      setEditing(false);
      toast.success("Notiz gespeichert.");
    });
  }

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Meine private Notiz
        </p>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-amber-600 hover:bg-amber-100 gap-1 px-2"
            onClick={startEdit}
          >
            <Pencil className="h-3 w-3" />
            {notiz ? "Bearbeiten" : "Hinzufügen"}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ihre persönliche Notiz zu diesem Anbieter…"
            rows={3}
            maxLength={500}
            className="w-full text-sm border border-amber-200 rounded-lg p-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-gray-300"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={cancelEdit}
              disabled={isPending}
            >
              <X className="h-3 w-3" /> Abbrechen
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={save}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Speichern
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 text-right">{draft.length}/500</p>
        </div>
      ) : notiz ? (
        <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{notiz}</p>
      ) : (
        <p className="text-xs text-amber-400 italic">Noch keine Notiz. Klicken Sie auf „Hinzufügen".</p>
      )}
    </div>
  );
}
