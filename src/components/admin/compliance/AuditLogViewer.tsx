"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  typ: string;
  beschreibung: string;
  profil_email: string | null;
  created_at: string;
}

const TYP_LABEL: Record<string, string> = {
  benachrichtigung: "Benachrichtigung",
  anfrage: "Anfrage",
};

type BadgeVariant = "default" | "secondary";
const TYP_VARIANT: Record<string, BadgeVariant> = {
  benachrichtigung: "default",
  anfrage: "secondary",
};

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"alle" | "anfragen" | "benachrichtigungen">("alle");
  const [refreshing, setRefreshing] = useState(false);

  const laden = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    const params = new URLSearchParams({ limit: "500" });
    if (filter !== "alle") params.set("typ", filter);
    const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
    if (res.ok) setEntries(await res.json() as LogEntry[]);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { void laden(); }, [laden]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="alle">Alle Eintragstypen</option>
            <option value="anfragen">Nur Anfragen</option>
            <option value="benachrichtigungen">Nur Benachrichtigungen</option>
          </select>
          <span className="text-sm text-gray-400">{entries.length} Einträge</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => laden(true)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Lade Audit-Log...</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          Keine Einträge gefunden
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
            {entries.map((entry) => (
              <div key={`${entry.id}-${entry.typ}`} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <Badge
                  variant={TYP_VARIANT[entry.typ] ?? "secondary"}
                  className="mt-0.5 shrink-0"
                >
                  {TYP_LABEL[entry.typ] ?? entry.typ}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{entry.beschreibung}</p>
                  {entry.profil_email && (
                    <p className="text-xs text-gray-400 mt-0.5">{entry.profil_email}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDateTime(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
