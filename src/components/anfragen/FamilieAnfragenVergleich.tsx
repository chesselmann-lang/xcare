"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  X,
  CheckSquare,
  Square,
  ArrowRight,
  MessageCircle,
  Building2,
  MapPin,
  Clock,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

const statusVariant: Record<AnfrageStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  offen: "secondary",
  in_bearbeitung: "warning",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot erhalten",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

export type AnfrageCompareItem = {
  id: string;
  status: AnfrageStatus;
  lebenslage: string;
  beschreibung: string;
  created_at: string;
  updated_at: string;
  anbieterName?: string;
  anbieterOrt?: string;
  leistungName?: string;
  unreadCount: number;
};

interface FamilieAnfragenVergleichProps {
  anfragen: AnfrageCompareItem[];
}

const MAX_SELECTION = 3;

export function FamilieAnfragenVergleich({ anfragen }: FamilieAnfragenVergleichProps) {
  const [visible, setVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPanel, setShowPanel] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTION) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selected = anfragen.filter((a) => selectedIds.has(a.id));

  if (!visible) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setVisible(true)}
          className="text-xs text-[--muted-foreground] hover:text-[--foreground] flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Anfragen vergleichen
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Selection bar */}
      <div className="mb-4 rounded-xl border border-[--border] bg-[--card] p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs font-medium text-[--muted-foreground]">
            {selectedIds.size === 0
              ? "Bis zu 3 Anfragen auswählen"
              : `${selectedIds.size} ausgewählt`}
          </p>

          <div className="flex-1" />

          {selectedIds.size >= 2 && (
            <Button
              size="sm"
              onClick={() => setShowPanel(true)}
              className="h-7 text-xs gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Vergleich anzeigen
            </Button>
          )}

          {selectedIds.size < 2 && selectedIds.size > 0 && (
            <p className="text-xs text-[--muted-foreground]">
              Noch {2 - selectedIds.size} weitere auswählen
            </p>
          )}

          <button
            onClick={() => { setVisible(false); setSelectedIds(new Set()); setShowPanel(false); }}
            className="text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          >
            Abbrechen
          </button>
        </div>

        {/* Anfrage pills */}
        {anfragen.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[--border] flex flex-wrap gap-2">
            {anfragen.map((a) => {
              const isSelected = selectedIds.has(a.id);
              const isDisabled = !isSelected && selectedIds.size >= MAX_SELECTION;
              return (
                <button
                  key={a.id}
                  onClick={() => !isDisabled && toggle(a.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                    isSelected
                      ? "bg-[--primary] text-white border-[--primary]"
                      : isDisabled
                        ? "border-[--border] text-[--muted-foreground]/40 cursor-not-allowed"
                        : "border-[--border] text-[--muted-foreground] hover:border-[--primary]/40"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  <span className="max-w-[120px] truncate capitalize">
                    {a.anbieterName ?? a.lebenslage.replace(/_/g, " ")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison panel */}
      {showPanel && selected.length >= 2 && (
        <div className="mb-6 rounded-xl border border-[--border] bg-[--card] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[--border] bg-[--muted]/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[--primary]" />
              Anfragen-Vergleich ({selected.length})
            </h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Comparison grid */}
          <div
            className="overflow-x-auto"
            style={{ gridTemplateColumns: `140px repeat(${selected.length}, 1fr)` }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[--muted-foreground] w-36 bg-[--muted]/20">
                    Kriterium
                  </th>
                  {selected.map((a) => (
                    <th key={a.id} className="text-left px-4 py-3 font-medium border-l border-[--border]">
                      <div className="text-sm truncate max-w-[180px]">
                        {a.anbieterName ?? "Unbekannt"}
                      </div>
                      <div className="text-xs text-[--muted-foreground] capitalize font-normal">
                        {a.lebenslage.replace(/_/g, " ")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {/* Status */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium">
                    Status
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border]">
                      <Badge variant={statusVariant[a.status] ?? "secondary"} className="text-xs">
                        {statusLabel[a.status] ?? a.status}
                      </Badge>
                    </td>
                  ))}
                </tr>

                {/* Leistung */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Leistung
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border] text-sm">
                      {a.leistungName ?? <span className="text-[--muted-foreground]">–</span>}
                    </td>
                  ))}
                </tr>

                {/* Standort */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Standort</span>
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border] text-sm">
                      {a.anbieterOrt ?? <span className="text-[--muted-foreground]">–</span>}
                    </td>
                  ))}
                </tr>

                {/* Nachrichten */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium">
                    <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Ungelesen</span>
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border]">
                      {a.unreadCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-[--primary] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          <MessageCircle className="h-3 w-3" />
                          {a.unreadCount}
                        </span>
                      ) : (
                        <span className="text-[--muted-foreground] text-xs">Keine</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Letzte Aktivität */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium">
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Aktivität</span>
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border] text-sm text-[--muted-foreground]">
                      {formatRelative(a.updated_at)}
                    </td>
                  ))}
                </tr>

                {/* Beschreibung */}
                <tr>
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] bg-[--muted]/10 font-medium align-top pt-4">
                    Ihre Anfrage
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border] text-sm text-[--muted-foreground] align-top">
                      <p className="line-clamp-3 leading-relaxed">
                        {a.beschreibung || <span className="italic">–</span>}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* CTA */}
                <tr className="bg-[--muted]/10">
                  <td className="px-4 py-3 text-xs text-[--muted-foreground] font-medium">
                    Aktion
                  </td>
                  {selected.map((a) => (
                    <td key={a.id} className="px-4 py-3 border-l border-[--border]">
                      <Link href={`/familie/anfragen/${a.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                          Öffnen <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
