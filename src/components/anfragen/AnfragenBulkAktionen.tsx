"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckSquare, Square, CheckCircle2, XCircle, Clock, PackageCheck, Mail, X, Info } from "lucide-react";
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

const TEMPLATE_VARS = [
  { key: "name", label: "Vollständiger Name" },
  { key: "vorname", label: "Vorname" },
  { key: "lebenslage", label: "Lebenslage" },
  { key: "anbieter", label: "Anbieter-Name" },
  { key: "status", label: "Status der Anfrage" },
];

const SCHNELL_TEMPLATES = [
  {
    label: "Eingangsbestätigung",
    betreff: "Ihre Anfrage bei {{anbieter}} — Eingang bestätigt",
    nachricht:
      "Guten Tag {{name}},\n\nwir haben Ihre Anfrage zum Thema {{lebenslage}} erhalten und werden uns baldmöglichst bei Ihnen melden.\n\nBei dringenden Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n{{anbieter}}",
  },
  {
    label: "Rückfrage",
    betreff: "Rückfrage zu Ihrer Anfrage — {{anbieter}}",
    nachricht:
      "Guten Tag {{vorname}},\n\nvielen Dank für Ihre Anfrage. Bevor wir Ihnen ein konkretes Angebot machen können, haben wir noch einige Rückfragen.\n\nKönnten Sie uns bitte weitere Details zu Ihrer Situation mitteilen?\n\nMit freundlichen Grüßen\n{{anbieter}}",
  },
  {
    label: "Terminvorschlag",
    betreff: "Terminvorschlag für ein Erstgespräch — {{anbieter}}",
    nachricht:
      "Guten Tag {{name}},\n\nwir würden uns freuen, Ihnen bei Ihrem Anliegen ({{lebenslage}}) helfen zu können.\n\nGerne schlagen wir Ihnen ein kostenloses Erstgespräch vor. Bitte teilen Sie uns mit, welche Termine Ihnen gut passen.\n\nMit freundlichen Grüßen\n{{anbieter}}",
  },
];

export function AnfragenBulkAktionen({ anfragen }: AnfragenBulkAktionenProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // Batch email state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailBetreff, setEmailBetreff] = useState("");
  const [emailNachricht, setEmailNachricht] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const nachrichtRef = useRef<HTMLTextAreaElement>(null);

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

  const insertVar = (key: string) => {
    const ta = nachrichtRef.current;
    if (!ta) {
      setEmailNachricht((prev) => prev + `{{${key}}}`);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const tag = `{{${key}}}`;
    setEmailNachricht((prev) => prev.slice(0, start) + tag + prev.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const sendBatchEmail = async () => {
    if (!emailBetreff.trim() || !emailNachricht.trim()) {
      toast.error("Bitte Betreff und Nachricht ausfüllen");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/anbieter/batch-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anfrageIds: Array.from(selectedIds),
          betreff: emailBetreff,
          nachricht: emailNachricht,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim E-Mail-Versand");
      } else {
        if (data.failed > 0) {
          toast.warning(`${data.sent} E-Mail${data.sent !== 1 ? "s" : ""} versendet, ${data.failed} fehlgeschlagen`);
        } else {
          toast.success(`${data.sent} E-Mail${data.sent !== 1 ? "s" : ""} erfolgreich versendet`);
        }
        setEmailDialogOpen(false);
        setEmailBetreff("");
        setEmailNachricht("");
      }
    } catch {
      toast.error("Netzwerkfehler beim Senden");
    }
    setEmailLoading(false);
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

        {/* Batch email button — always available when items are selected */}
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={loading || emailLoading}
            onClick={() => setEmailDialogOpen(true)}
            className="gap-1.5 text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Mail className="h-3.5 w-3.5" />
            E-Mail senden
          </Button>
        )}

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

      {/* ── Batch E-Mail Dialog ─────────────────────────────────────── */}
      {emailDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEmailDialogOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-[--card] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Batch-E-Mail senden
                </h2>
                <p className="text-xs text-[--muted-foreground] mt-0.5">
                  An {selectedIds.size} Familie{selectedIds.size !== 1 ? "n" : ""} · Variablen werden pro Empfänger ersetzt
                </p>
              </div>
              <button
                onClick={() => setEmailDialogOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[--muted] transition-colors"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Quick templates */}
              <div>
                <p className="text-xs font-medium text-[--muted-foreground] mb-2">Vorlage laden</p>
                <div className="flex flex-wrap gap-2">
                  {SCHNELL_TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => { setEmailBetreff(t.betreff); setEmailNachricht(t.nachricht); }}
                      className="text-xs px-2.5 py-1 rounded-full border border-[--border] hover:border-[--primary]/40 hover:bg-[--muted] transition-all"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Betreff <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailBetreff}
                  onChange={(e) => setEmailBetreff(e.target.value)}
                  placeholder="z.B. Ihre Anfrage bei {{anbieter}}"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[--primary]/30"
                />
              </div>

              {/* Variable chips */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="h-3.5 w-3.5 text-[--muted-foreground]" />
                  <p className="text-xs text-[--muted-foreground]">Variable einfügen (Cursor im Textfeld positionieren)</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVar(v.key)}
                      title={v.label}
                      className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-mono transition-colors"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message body */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Nachricht <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={nachrichtRef}
                  value={emailNachricht}
                  onChange={(e) => setEmailNachricht(e.target.value)}
                  rows={10}
                  placeholder="Guten Tag {{name}},&#10;&#10;..."
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[--primary]/30 resize-y"
                />
              </div>

              {/* Preview snippet */}
              {(emailBetreff || emailNachricht) && (
                <div className="rounded-lg border border-dashed border-[--border] p-3 bg-[--muted]/30">
                  <p className="text-xs font-medium text-[--muted-foreground] mb-1">Vorschau (Variablen nicht ersetzt)</p>
                  {emailBetreff && (
                    <p className="text-sm font-semibold truncate">{emailBetreff}</p>
                  )}
                  {emailNachricht && (
                    <p className="text-xs text-[--muted-foreground] mt-1 whitespace-pre-wrap line-clamp-3">
                      {emailNachricht}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[--border] flex items-center justify-between gap-3">
              <p className="text-xs text-[--muted-foreground]">
                {selectedIds.size} E-Mail{selectedIds.size !== 1 ? "s" : ""} werden versendet
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmailDialogOpen(false)}
                  disabled={emailLoading}
                >
                  Abbrechen
                </Button>
                <Button
                  size="sm"
                  onClick={sendBatchEmail}
                  disabled={emailLoading || !emailBetreff.trim() || !emailNachricht.trim()}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {emailLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {emailLoading ? "Wird gesendet…" : `${selectedIds.size} E-Mail${selectedIds.size !== 1 ? "s" : ""} senden`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
