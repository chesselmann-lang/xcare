"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateBewertungCache, revalidateAnbieterCache } from "@/lib/cache-actions";
import { Button } from "@/components/ui/button";

interface BewertungModerationActionsProps {
  bewertungId: string;
  anbieter_id: string;
  gemeldet: boolean;
}

export function BewertungModerationActions({
  bewertungId,
  anbieter_id,
  gemeldet,
}: BewertungModerationActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Bewertung endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("bewertungen").delete().eq("id", bewertungId);
    if (error) {
      toast.error("Löschen fehlgeschlagen", { description: error.message });
    } else {
      toast.success("Bewertung gelöscht");
      await revalidateBewertungCache(anbieter_id);
      router.refresh();
    }
    setDeleting(false);
  };

  const handleToggleGemeldet = async () => {
    setToggling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bewertungen")
      .update({ gemeldet: !gemeldet })
      .eq("id", bewertungId);
    if (error) {
      toast.error("Aktion fehlgeschlagen", { description: error.message });
    } else {
      toast.success(gemeldet ? "Markierung entfernt" : "Als gemeldet markiert");
      await revalidateAnbieterCache(anbieter_id);
      router.refresh();
    }
    setToggling(false);
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* Toggle gemeldet flag */}
      <button
        onClick={handleToggleGemeldet}
        disabled={toggling || deleting}
        title={gemeldet ? "Meldung aufheben" : "Als gemeldet markieren"}
        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          gemeldet
            ? "bg-red-100 border-red-200 text-red-600 hover:bg-red-200"
            : "bg-white border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600"
        }`}
      >
        {toggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : gemeldet ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting || toggling}
        title="Bewertung löschen"
        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
