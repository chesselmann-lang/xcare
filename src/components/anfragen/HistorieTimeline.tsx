"use client";

import {
  CheckCircle2, Circle, Clock, FileText, MessageCircle,
  AlertCircle, Package, Loader2, XCircle, ArrowRight,
} from "lucide-react";

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
  offen: "text-yellow-700 bg-yellow-50 border-yellow-200",
  in_bearbeitung: "text-blue-700 bg-blue-50 border-blue-200",
  angeboten: "text-purple-700 bg-purple-50 border-purple-200",
  bestaetigt: "text-green-700 bg-green-50 border-green-200",
  abgelehnt: "text-red-700 bg-red-50 border-red-200",
  abgeschlossen: "text-gray-600 bg-gray-100 border-gray-200",
};

const STATUS_DOT: Record<string, string> = {
  offen: "border-yellow-400 text-yellow-500",
  in_bearbeitung: "border-blue-400 text-blue-500",
  angeboten: "border-purple-400 text-purple-600",
  bestaetigt: "border-green-500 text-green-600",
  abgelehnt: "border-red-400 text-red-500",
  abgeschlossen: "border-gray-400 text-gray-500",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "bestaetigt") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "abgelehnt") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "angeboten") return <Package className="h-3.5 w-3.5" />;
  if (status === "abgeschlossen") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "in_bearbeitung") return <Loader2 className="h-3.5 w-3.5" />;
  return <Circle className="h-3.5 w-3.5" />;
}

function formatAbsolute(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} Tag${days === 1 ? "" : "e"} später`;
  if (hours >= 1) return `${hours} Std. später`;
  if (minutes >= 5) return `${minutes} Min. später`;
  return "sofort";
}

function totalDurationLabel(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) return `${days} Tag${days === 1 ? "" : "e"}${hours > 0 ? ` ${hours} Std.` : ""}`;
  if (hours >= 1) return `${hours} Stunde${hours === 1 ? "" : "n"}`;
  return "unter 1 Stunde";
}

interface Props {
  historie: HistorieEintrag[];
  showCreation?: boolean;
  erstelltAt?: string;
}

export function HistorieTimeline({ historie, showCreation = true, erstelltAt }: Props) {
  if (historie.length === 0 && !showCreation) return null;

  type Entry = { id: string; timestamp: string; isCreation?: boolean; entry?: HistorieEintrag };
  const allEntries: Entry[] = [];
  if (showCreation && erstelltAt) {
    allEntries.push({ id: "creation", timestamp: erstelltAt, isCreation: true });
  }
  historie.forEach((h) => allEntries.push({ id: h.id, timestamp: h.created_at, entry: h }));

  const latestTs = allEntries[allEntries.length - 1]?.timestamp;
  const firstTs = allEntries[0]?.timestamp ?? erstelltAt;
  const isClosed = ["bestaetigt", "abgelehnt", "abgeschlossen"].includes(
    historie[historie.length - 1]?.neuer_status ?? ""
  );

  return (
    <div>
      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[--border]" />
        <div className="space-y-1">
          {allEntries.map((e, idx) => {
            const isLatest = idx === allEntries.length - 1;
            const prev = allEntries[idx - 1];
            const gapMs = prev
              ? new Date(e.timestamp).getTime() - new Date(prev.timestamp).getTime()
              : 0;
            const showGap = !!prev && gapMs > 60000;

            if (e.isCreation) {
              return (
                <div key="creation">
                  <div className="relative flex gap-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white border-[--primary] text-[--primary]">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 pb-4 pt-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">Anfrage erstellt</span>
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-yellow-700 bg-yellow-50 border-yellow-200">
                          Offen
                        </span>
                      </div>
                      <p className="text-xs text-[--muted-foreground] mt-0.5">
                        {formatAbsolute(e.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            const h = e.entry!;
            const dotClass = isLatest
              ? "border-[--primary] text-[--primary]"
              : (STATUS_DOT[h.neuer_status] ?? "border-[--border] text-[--muted-foreground]");

            return (
              <div key={h.id}>
                {showGap && (
                  <div className="relative flex items-center gap-3 py-0.5">
                    <div className="w-8 shrink-0" />
                    <span className="text-[10px] text-[--muted-foreground] bg-[--muted] px-2 py-0.5 rounded-full border border-[--border]">
                      {formatDuration(gapMs)}
                    </span>
                  </div>
                )}
                <div className="relative flex gap-3">
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-white ${dotClass}`}>
                    <StatusIcon status={h.neuer_status} />
                    {isLatest && !isClosed && (
                      <span className="absolute inset-0 rounded-full border-2 border-[--primary] animate-ping opacity-30" />
                    )}
                  </div>
                  <div className="flex-1 pb-4 pt-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {h.alter_status && (
                        <>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[h.alter_status] ?? ""}`}>
                            {STATUS_LABELS[h.alter_status] ?? h.alter_status}
                          </span>
                          <ArrowRight className="h-3 w-3 text-[--muted-foreground] shrink-0" />
                        </>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[h.neuer_status] ?? ""}`}>
                        {STATUS_LABELS[h.neuer_status] ?? h.neuer_status}
                      </span>
                      {isLatest && <span className="text-[10px] font-medium text-[--primary] ml-1">● aktuell</span>}
                    </div>
                    {h.notiz && (
                      <p className="text-xs text-[--muted-foreground] mt-1 flex items-start gap-1 bg-[--muted] rounded-md px-2 py-1.5 max-w-sm">
                        <MessageCircle className="h-3 w-3 shrink-0 mt-0.5" />
                        {h.notiz}
                      </p>
                    )}
                    <p className="text-xs text-[--muted-foreground] mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatAbsolute(h.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {allEntries.length > 1 && firstTs && latestTs && (
        <div className="mt-2 pt-2 border-t border-[--border] flex items-center gap-1.5 text-xs text-[--muted-foreground]">
          <Clock className="h-3 w-3" />
          Gesamtdauer:{" "}
          <span className="font-medium text-[--foreground]">{totalDurationLabel(firstTs, latestTs)}</span>
          {isClosed && <span className="text-green-600 font-medium ml-1">· Abgeschlossen</span>}
        </div>
      )}
    </div>
  );
}
