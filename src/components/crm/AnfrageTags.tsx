"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Tag, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PRESET_TAGS = [
  { label: "VIP", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "Dringend", color: "bg-red-100 text-red-800 border-red-200" },
  { label: "Warteliste", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { label: "In Bearbeitung", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { label: "Nachfassen", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { label: "Abgeschlossen", color: "bg-green-100 text-green-800 border-green-200" },
];

function tagColor(label: string): string {
  const preset = PRESET_TAGS.find((t) => t.label === label);
  return preset?.color ?? "bg-gray-100 text-gray-800 border-gray-200";
}

interface Props {
  anfrageId: string;
  initialTags?: string[];
}

export function AnfrageTags({ anfrageId, initialTags = [] }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [showPicker, setShowPicker] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const saveTags = useCallback(async (newTags: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("anfragen")
        .update({ crm_tags: newTags })
        .eq("id", anfrageId);
      if (error) throw error;
      setTags(newTags);
    } catch (err) {
      toast.error("Tags konnten nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }, [anfrageId, supabase]);

  function removeTag(tag: string) {
    saveTags(tags.filter((t) => t !== tag));
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 8) return;
    saveTags([...tags, trimmed]);
    setCustomInput("");
    setShowPicker(false);
  }

  return (
    <div className="space-y-2">
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tagColor(tag)}`}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              disabled={saving}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Tag "${tag}" entfernen`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < 8 && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-[--border] text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary] transition-colors"
          >
            <Plus className="h-3 w-3" />
            Tag
          </button>
        )}
      </div>

      {/* Tag picker dropdown */}
      {showPicker && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-3 space-y-2 shadow-md">
          <p className="text-xs font-medium text-[--muted-foreground] flex items-center gap-1.5">
            <Tag className="h-3 w-3" />
            Tag hinzufügen
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.filter((t) => !tags.includes(t.label)).map((t) => (
              <button
                key={t.label}
                onClick={() => addTag(t.label)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80 ${t.color}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag(customInput)}
              placeholder="Eigenes Tag…"
              maxLength={30}
              className="flex-1 text-xs border border-[--border] rounded-lg px-2.5 py-1 bg-[--background] text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-1 focus:ring-[--primary]/40"
            />
            <button
              onClick={() => addTag(customInput)}
              disabled={!customInput.trim()}
              className="px-3 py-1 rounded-lg text-xs font-medium bg-[--primary] text-white hover:bg-[--primary]/90 disabled:opacity-40 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
