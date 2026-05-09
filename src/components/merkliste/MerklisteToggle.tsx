"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface MerklisteToggleProps {
  anbieterId: string;
  familieId: string;
  initialSaved: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Show label text alongside icon */
  showLabel?: boolean;
  className?: string;
}

export function MerklisteToggle({
  anbieterId,
  familieId,
  initialSaved,
  size = "md",
  showLabel = false,
  className,
}: MerklisteToggleProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const prev = saved;
      setSaved(!prev);
      const supabase = createClient();
      if (prev) {
        const { error } = await supabase
          .from("merkliste")
          .delete()
          .eq("familie_id", familieId)
          .eq("anbieter_id", anbieterId);
        if (error) { setSaved(prev); toast.error("Fehler beim Entfernen"); return; }
        toast.success("Von der Merkliste entfernt");
      } else {
        const { error } = await supabase
          .from("merkliste")
          .insert({ familie_id: familieId, anbieter_id: anbieterId });
        if (error) { setSaved(prev); toast.error("Fehler beim Speichern"); return; }
        toast.success("Zur Merkliste hinzugefügt");
      }
    });
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnBase = size === "sm"
    ? "p-1.5 rounded-lg text-xs"
    : "p-2 rounded-xl text-sm";

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label={saved ? "Von Merkliste entfernen" : "Zur Merkliste hinzufügen"}
      title={saved ? "Von Merkliste entfernen" : "Zur Merkliste hinzufügen"}
      className={cn(
        btnBase,
        "flex items-center gap-1.5 border transition-all font-medium",
        saved
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          : "border-[--border] bg-[--card] text-[--muted-foreground] hover:border-indigo-200 hover:text-indigo-600",
        className
      )}
    >
      {isPending
        ? <Loader2 className={cn(iconSize, "animate-spin")} />
        : saved
          ? <BookmarkCheck className={cn(iconSize, "fill-indigo-600")} />
          : <Bookmark className={iconSize} />
      }
      {showLabel && (
        <span>{saved ? "Gemerkt" : "Merken"}</span>
      )}
    </button>
  );
}
