"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AnfrageStatus; label: string }[] = [
  { value: "offen",          label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "angeboten",      label: "Angeboten" },
  { value: "bestaetigt",     label: "Bestätigt" },
  { value: "abgelehnt",      label: "Abgelehnt" },
  { value: "abgeschlossen",  label: "Abgeschlossen" },
];

interface Props {
  anfrageId: string;
  currentStatus: AnfrageStatus;
  adminProfileId: string;
}

export function AdminAnfrageStatusAktion({ anfrageId, currentStatus, adminProfileId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<AnfrageStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  const hasChanged = selected !== currentStatus;

  const handleSubmit = async () => {
    if (!hasChanged) return;
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("anfragen")
      .update({ status: selected, updated_at: new Date().toISOString() })
      .eq("id", anfrageId);

    if (error) {
      toast.error("Fehler beim Statuswechsel", { description: error.message });
      setLoading(false);
      return;
    }

    // Write status history
    await supabase.from("anfragen_statusverlauf").insert({
      anfrage_id: anfrageId,
      alter_status: currentStatus,
      neuer_status: selected,
      geaendert_von: adminProfileId,
      kommentar: "Manuell durch Admin geändert",
    }).then(() => {}).catch(() => {});

    toast.success("Status aktualisiert", {
      description: `Status → ${STATUS_OPTIONS.find((o) => o.value === selected)?.label}`,
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as AnfrageStatus)}
        disabled={loading}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button
        size="sm"
        disabled={!hasChanged || loading}
        onClick={handleSubmit}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Status ändern
      </Button>
    </div>
  );
}
