"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckSquare, Square, CheckCircle2, XCircle, Clock, PackageCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

interface AnfrageItem {
  id: string;
  status: AnfrageStatus;
}

interface AnfragenBulkAktionenProps {
  anfragen: AnfrageItem[];
}

const BULK_ACTIONS: Array<{
  nextStatus: AnfrageStatus;
  label: string;
  icon: React.ElementType;
  className: string;
  allowFrom: AnfrageStatus[];
}> = [
  {
    nextStatus: "in_bearbeitung",
    label: "In Bearbeitung",
    icon: Clock,
    className: "bg-blue-600 hover:bg-blue-700 text-white",
    allowFrom: ["offen"],
  },
  {
    nextStatus: "angeboten",
    label: "Angebot senden",
    icon: PackageCheck,
    className: "bg-purple-600 hover:bg-purple-700 text-white",
    allowFrom: ["offen", "in_bearbeitung"],
  },
  {
    nextStatus: "bestaetigt",
    label: "Bestätigen",
    icon: CheckCircle2,
    className: "bg-green-600 hover:bg-green-700 text-white",
    allowFrom: ["angeboten"],
  },
  {
    nextStatus: "abgelehnt",
    label: "Ablehnen",
    icon: XCircle,
    className: "bg-red-600 hover:bg-red-700 text-white",
    allowFrom: ["offen", "in_bearbeitung", "angeboten"],
  },
  {
    nextStatus: "abgeschlossen",
    label: "Abschließen",
    icon: CheckCircle2,
    className: "border border-gray-300 text-gray-700 hover:bg-gray-100",
    allowFrom: ["bestaetigt"],
  },
];

export function AnfragenBulkAktionen({ anfragen }: AnfragenBulkAktionenProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === anfragen.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(anfragen.map((a) => a.id)));
    }
  }, [anfragen, selectedIds.size]);

  const selectedAnfragen = anfragen.filter((a) => selectedIds.has(a.id));

  // Determine which bulk actions are valid for ALL selected anfragen
  const availableActions = BULK_ACTIONS.filter((action) =>
    selectedAnfragen.length > 0 &&
    selectedAnfragen.every((a) => action.allowFrom.includes(a.status))
  );

  const executeBulk = async (nextStatus: AnfrageStatus) => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from("anfragen")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      toast.error("Fehler bei Massenänderung", { description: error.message });
    } else {
      toast.success(`${ids.length} Anfrage${ids.length !== 1 ? "n" : ""} aktualisiert`);
      setSelectedIds(new Set());
      router.refresh();
    }
    setLoading(false);
  };

  if (!visible) {
    return (
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setVisible(true)}
          className="text-xs text-[--muted-foreground] hover:text-[--foreground] flex items-center gap-1.5 transition-colors"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Mehrere auswählen
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-[--border] bg-[--card] p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Select all toggle */}
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs font-medium text-[--muted-foreground] hover:text-[--foreground] transition-colors shrink-0"
        >
          {selectedIds.size === anfragen.length ? (
            <CheckSquare className="h-4 w-4 text-[--primary]" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {selectedIds.size > 0 ? `${selectedIds.size} ausgewählt` : "Alle auswählen"}
        </button>

        <div className="flex-1" />

        {/* Available bulk actions */}
        {availableActions.map((action) => (
          <Button
            key={action.nextStatus}
            size="sm"
            disabled={loading || selectedIds.size === 0}
            onClick={() => executeBulk(action.nextStatus)}
            className={`gap-1.5 text-xs h-7 ${action.className}`}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <action.icon className="h-3.5 w-3.5" />
            )}
            {action.label}
          </Button>
        ))}

        {/* Close button */}
        <button
          onClick={() => { setVisible(false); setSelectedIds(new Set()); }}
          className="text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors ml-auto"
        >
          Abbrechen
        </button>
      </div>

      {/* Checkboxes row — rendered as pill badges so they're compact */}
      {anfragen.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[--border] flex flex-wrap gap-2">
          {anfragen.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleSelect(a.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                selectedIds.has(a.id)
                  ? "bg-[--primary] text-white border-[--primary]"
                  : "border-[--border] text-[--muted-foreground] hover:border-[--primary]/40"
              }`}
            >
              {selectedIds.has(a.id) ? (
                <CheckSquare className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
              #{a.id.slice(0, 6)}
            </button>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && availableActions.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">
          Keine gemeinsame Aktion für die gewählten Anfragen (unterschiedliche Status).
        </p>
      )}
    </div>
  );
}
