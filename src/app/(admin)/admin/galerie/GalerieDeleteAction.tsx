"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface GalerieDeleteActionProps {
  bildId: string;
  storagePfad: string;
}

export function GalerieDeleteAction({ bildId, storagePfad }: GalerieDeleteActionProps) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Dieses Bild wirklich löschen?")) return;
    setLoading(true);
    const supabase = createClient();
    try {
      // Delete from storage
      await supabase.storage.from("anbieter-galerie").remove([storagePfad]);
      // Delete from DB
      const { error } = await supabase.from("anbieter_galerie").delete().eq("id", bildId);
      if (error) throw error;
      setDeleted(true);
      toast.success("Bild gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return <span className="text-xs text-gray-400 italic">Gelöscht</span>;
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Löschen
    </button>
  );
}
