"use client";

import { CheckCircle2, Circle, Clock, FileText, MessageCircle, AlertCircle } from "lucide-react";
import { formatRelative } from "@/lib/utils";

export type HistorieEintrag = {
  id: string;
  alter_status: string | null;
  neuer_status: string;
  notiz: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot gemacht",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

const STATUS_COLORS: Record<string, string> = {
  offen: "text-yellow-600 bg-yellow-50 border-yellow-200",
  in_bearbeitung: "text-blue-600 bg-blue-50 border-blue-200",
  angeboten: "text-purple-600 bg-purple-50 border-purple-200",
  bestaetigt: "text-green-600 bg-green-50 border-green-200",
  abgelehnt: "text-red-600 bg-red-50 border-red-200",
  abgeschlossen: "text-gray-600 bg-gray-50 border-gray-200",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "bestaetigt") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "abgelehnt") return <AlertCircle className="h-4 w-4" />;
  if (status === "angeboten") return <FileText className="h-4 w-4" />;
  if (status === "abgeschlossen") return <CheckCircle2 className="h-4 w-4" />;
  return <Circle className="h-4 w-4" />;
}

interface Props {
  historie: HistorieEintrag[];
  /** If true, show the creation event as the first timeline entry */
  showCreation?: boolean;
  erstelltAt?: string;
}

export function HistorieTimeline({ historie, showCreation = true, erstelltAt }: Props) {
  if (historie.length === 0 && !showCreation) return null;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[--border]" />

      <div className="space-y-4">
        {/* Creation pseudo-entry */}
        {showCreation && erstelltAt && (
          <div className="relative flex gap-4">
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-[--background] border-[--primary] text-[--primary]">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 pt-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Anfrage erstellt</span>
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium offen text-yellow-600 bg-yellow-50 border-yellow-200">
                  Offen
                </span>
              </div>
              <p className="text-xs text-[--muted-foreground] mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelative(erstelltAt)}
              </p>
            </div>
          </div>
        )}

        {/* Status changes */}
        {historie.map((h, idx) => {
          const isLatest = idx === historie.length - 1;
          const colorClass = STATUS_COLORS[h.neuer_status] ?? "text-gray-600 bg-gray-50 border-gray-200";

          return (
            <div key={h.id} className="relative flex gap-4">
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-[--background] ${
                  isLatest ? "border-[--primary] text-[--primary]" : "border-[--border] text-[--muted-foreground]"
                }`}
              >
                <StatusIcon status={h.neuer_status} />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Status geändert</span>
                  {h.alter_status && (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[h.alter_status] ?? ""}`}>
                        {STATUS_LABELS[h.alter_status] ?? h.alter_status}
                      </span>
                      <span className="text-xs text-[--muted-foreground]">→</span>
                    </>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
                    {STATUS_LABELS[h.neuer_status] ?? h.neuer_status}
                  </span>
                </div>
                {h.notiz && (
                  <p className="text-xs text-[--muted-foreground] mt-0.5 flex items-start gap-1">
                    <MessageCircle className="h-3 w-3 shrink-0 mt-0.5" />
                    {h.notiz}
                  </p>
                )}
                <p className="text-xs text-[--muted-foreground] mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelative(h.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
