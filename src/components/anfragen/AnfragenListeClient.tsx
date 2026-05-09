"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Clock, Eye, FileText, MessageCircle,
  Package2, Phone, X, MapPin, CheckCircle2, XCircle,
  Loader, Star, Archive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

export type AnfrageListItem = {
  id: string;
  lebenslage: string;
  status: string;
  beschreibung: string;
  created_at: string;
  updated_at: string;
  anbieter?: { id: string; name: string; ort: string | null; telefon: string | null } | null;
  leistungen?: { name: string } | null;
  _unreadCount?: number;
};

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
  angeboten: "✨ Angebot erhalten",
  bestaetigt: "Bestätigt ✓",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

const statusIcon: Record<AnfrageStatus, React.ReactNode> = {
  offen:          <Loader className="h-4 w-4 text-[--muted-foreground]" />,
  in_bearbeitung: <Loader className="h-4 w-4 text-amber-500 animate-spin" />,
  angeboten:      <Star className="h-4 w-4 text-blue-500" />,
  bestaetigt:     <CheckCircle2 className="h-4 w-4 text-green-600" />,
  abgelehnt:      <XCircle className="h-4 w-4 text-red-500" />,
  abgeschlossen:  <Archive className="h-4 w-4 text-[--muted-foreground]" />,
};

function QuickPreviewModal({
  anfrage,
  onClose,
}: {
  anfrage: AnfrageListItem;
  onClose: () => void;
}) {
  const st = anfrage.status as AnfrageStatus;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-[--card] border border-[--border] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[--border]">
          <div className="flex items-center gap-2 flex-wrap">
            {statusIcon[st]}
            <h2 className="text-lg font-semibold capitalize">
              {anfrage.lebenslage.replace(/_/g, " ")}
            </h2>
            <Badge variant={statusVariant[st] ?? "secondary"} className="text-xs">
              {statusLabel[st] ?? anfrage.status}
            </Badge>
            {(anfrage._unreadCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 bg-[--primary] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                <MessageCircle className="h-3 w-3" />
                {anfrage._unreadCount} neu
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-[--muted] transition-colors"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Leistung */}
          {anfrage.leistungen && (
            <div className="flex items-center gap-2 text-sm">
              <Package2 className="h-4 w-4 text-[--muted-foreground] shrink-0" />
              <span className="text-[--muted-foreground]">Leistung:</span>
              <span className="font-medium">{anfrage.leistungen.name}</span>
            </div>
          )}

          {/* Anbieter */}
          {anfrage.anbieter && (
            <div className="bg-[--muted]/50 rounded-xl p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-2">Anbieter</p>
              <p className="font-semibold">{anfrage.anbieter.name}</p>
              {anfrage.anbieter.ort && (
                <div className="flex items-center gap-1.5 text-sm text-[--muted-foreground]">
                  <MapPin className="h-3.5 w-3.5" />
                  {anfrage.anbieter.ort}
                </div>
              )}
              {anfrage.anbieter.telefon && (
                <a
                  href={`tel:${anfrage.anbieter.telefon}`}
                  className="flex items-center gap-1.5 text-sm text-[--primary] hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {anfrage.anbieter.telefon}
                </a>
              )}
            </div>
          )}

          {/* Beschreibung */}
          {anfrage.beschreibung && (
            <div>
              <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-1.5">Beschreibung</p>
              <p className="text-sm leading-relaxed text-[--foreground] whitespace-pre-wrap">
                {anfrage.beschreibung}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-[--border] text-xs text-[--muted-foreground]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Gesendet {formatRelative(anfrage.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Aktualisiert {formatDate(anfrage.updated_at)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[--border]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Schließen
          </Button>
          <Link href={`/familie/anfragen/${anfrage.id}`}>
            <Button size="sm" className="gap-1.5">
              Zur Anfrage <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AnfragenListeClient({
  anfragen,
  isArchiv,
}: {
  anfragen: AnfrageListItem[];
  isArchiv: boolean;
}) {
  const [preview, setPreview] = useState<AnfrageListItem | null>(null);

  return (
    <>
      {anfragen.length > 0 ? (
        <div className={`space-y-3 ${isArchiv ? "opacity-80" : ""}`}>
          {anfragen.map((a) => {
            const st = a.status as AnfrageStatus;
            return (
              <div key={a.id} className="relative group">
                <Link href={`/familie/anfragen/${a.id}`} className="block">
                  <Card className="hover:shadow-md transition-all border-[--border] group-hover:border-[--primary]/20">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <FileText className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                            <p className="font-semibold capitalize">
                              {a.lebenslage.replace(/_/g, " ")}
                            </p>
                            <Badge variant={statusVariant[st] ?? "secondary"} className="text-xs">
                              {statusLabel[st] ?? a.status}
                            </Badge>
                            {(a._unreadCount ?? 0) > 0 && (
                              <span className="flex items-center gap-1 bg-[--primary] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                <MessageCircle className="h-3 w-3" />
                                {a._unreadCount} neu
                              </span>
                            )}
                          </div>

                          {/* Leistung + Anbieter */}
                          {a.leistungen && (
                            <p className="text-sm text-[--muted-foreground] mb-0.5 flex items-center gap-1.5">
                              <Package2 className="h-3.5 w-3.5" />
                              {a.leistungen.name}
                            </p>
                          )}
                          {a.anbieter && (
                            <p className="text-sm text-[--muted-foreground]">
                              <span className="font-medium text-[--foreground]">{a.anbieter.name}</span>
                              {a.anbieter.ort && <span className="text-xs"> · {a.anbieter.ort}</span>}
                            </p>
                          )}

                          {/* Timestamps */}
                          <p className="text-xs text-[--muted-foreground] mt-2 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Gesendet {formatRelative(a.created_at)}
                            <span className="opacity-50">·</span>
                            Aktualisiert {formatDate(a.updated_at)}
                          </p>

                          {/* Beschreibung preview */}
                          {a.beschreibung && (
                            <p className="text-sm text-[--muted-foreground] mt-2.5 pt-2.5 border-t border-[--border] line-clamp-2 leading-relaxed">
                              {a.beschreibung}
                            </p>
                          )}
                        </div>

                        <ArrowRight className="h-4 w-4 text-[--muted-foreground] shrink-0 mt-1 group-hover:text-[--primary] transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Quick-Preview Button — appears on hover */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setPreview(a); }}
                  className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 text-xs bg-[--background] border border-[--border] rounded-lg px-2 py-1 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted] shadow-sm"
                  aria-label="Schnellvorschau"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Vorschau
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Quick-Preview Modal */}
      {preview && (
        <QuickPreviewModal anfrage={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
