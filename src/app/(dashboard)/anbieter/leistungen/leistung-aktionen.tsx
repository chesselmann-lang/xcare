"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  leistungId: string;
  aktiv: boolean;
  onToggle: (id: string, aktiv: boolean) => void;
  onDelete: (id: string) => void;
}

export function LeistungAktionen({ leistungId, aktiv, onToggle, onDelete }: Props) {
  const supabase = createClient();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleAktiv = async () => {
    setToggling(true);
    const { error } = await supabase
      .from("leistungen")
      .update({ aktiv: !aktiv })
      .eq("id", leistungId);
    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      onToggle(leistungId, !aktiv);
      toast.success(aktiv ? "Leistung archiviert" : "Leistung aktiviert");
    }
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("leistungen").delete().eq("id", leistungId);
    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      onDelete(leistungId);
      toast("Leistung gelöscht", { icon: "🗑️" });
    }
    setDeleting(false);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Link href={`/anbieter/leistungen/${leistungId}/bearbeiten`}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[--muted-foreground] hover:text-[--foreground]"
          title="Bearbeiten"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </Link>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleAktiv}
        disabled={toggling}
        className={`gap-1.5 text-xs h-7 ${aktiv ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
        title={aktiv ? "Archivieren" : "Aktivieren"}
      >
        {toggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : aktiv ? (
          <Archive className="h-3 w-3" />
        ) : (
          <ArchiveRestore className="h-3 w-3" />
        )}
        {aktiv ? "Archivieren" : "Aktivieren"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className={`h-7 px-2 ${confirmDelete ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-red-500"}`}
        title={confirmDelete ? "Klicken zur Bestätigung" : "Löschen"}
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </Button>
    </div>
  );
}
