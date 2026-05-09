"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StickyNote, Loader2, Trash2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type TagTyp = "wichtig" | "follow_up" | "angebot" | "abgeschlossen";

interface Notiz {
  id: string;
  inhalt: string;
  tag: TagTyp | null;
  created_at: string;
}

const tagConfig: Record<TagTyp, { label: string; color: string }> = {
  wichtig:      { label: "⚡ Wichtig",      color: "bg-red-100 text-red-700" },
  follow_up:    { label: "🔔 Follow-up",    color: "bg-yellow-100 text-yellow-700" },
  angebot:      { label: "📦 Angebot",      color: "bg-blue-100 text-blue-700" },
  abgeschlossen: { label: "✅ Abgeschlossen", color: "bg-green-100 text-green-700" },
};

export function AnfrageNotizen({
  anfrageId,
  anbieterId,
  initialNotizen,
}: {
  anfrageId: string;
  anbieterId: string;
  initialNotizen: Notiz[];
}) {
  const [notizen, setNotizen] = useState<Notiz[]>(initialNotizen);
  const [inhalt, setInhalt] = useState("");
  const [tag, setTag] = useState<TagTyp | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const addNotiz = async () => {
    if (!inhalt.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("anfrage_notizen")
      .insert({ anfrage_id: anfrageId, anbieter_id: anbieterId, inhalt: inhalt.trim(), tag })
      .select().single();
    if (error) { toast.error("Fehler beim Speichern"); }
    else {
      setNotizen((prev) => [data as Notiz, ...prev]);
      setInhalt(""); setTag(null);
      toast.success("Notiz gespeichert");
    }
    setSaving(false);
  };

  const deleteNotiz = async (id: string) => {
    await supabase.from("anfrage_notizen").delete().eq("id", id);
    setNotizen((prev) => prev.filter((n) => n.id !== id));
    toast("Notiz gelöscht", { icon: "🗑️" });
  };

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-500" /> Interne Notizen
        <span className="text-[10px] text-[--muted-foreground] font-normal">(nur für Sie sichtbar)</span>
      </h3>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(tagConfig) as [TagTyp, typeof tagConfig[TagTyp]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setTag(tag === key ? null : key)}
            className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
              tag === key ? cfg.color + " border-current" : "border-[--border] text-[--muted-foreground] hover:border-[--primary]/30"
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value.slice(0, 2000))}
          placeholder="Notiz hinzufügen..."
          rows={2}
          className="flex-1 resize-none text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNotiz(); }}
        />
        <Button onClick={addNotiz} disabled={saving || !inhalt.trim()} size="sm" className="self-end">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Hinzufügen"}
        </Button>
      </div>

      {/* Notizen-Liste */}
      {notizen.length > 0 && (
        <div className="space-y-2">
          {notizen.map((n) => (
            <div key={n.id} className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 group">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{n.inhalt}</p>
                <button
                  onClick={() => deleteNotiz(n.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {n.tag && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tagConfig[n.tag].color}`}>
                    {tagConfig[n.tag].label}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{formatDate(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {notizen.length === 0 && (
        <p className="text-xs text-[--muted-foreground] text-center py-2">Noch keine Notizen</p>
      )}
    </div>
  );
}
