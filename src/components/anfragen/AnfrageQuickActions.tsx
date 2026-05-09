"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ChevronDown,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

// Canned quick-reply texts
const CANNED_REPLIES: Array<{ id: string; label: string; text: string }> = [
  {
    id: "ack",
    label: "Eingang bestätigen",
    text: "Vielen Dank für Ihre Anfrage! Wir haben diese erhalten und melden uns zeitnah bei Ihnen.",
  },
  {
    id: "processing",
    label: "In Bearbeitung",
    text: "Wir haben Ihre Anfrage erhalten und bearbeiten diese gerade. Wir melden uns in Kürze bei Ihnen.",
  },
  {
    id: "info",
    label: "Mehr Infos anfordern",
    text: "Um Ihnen bestmöglich helfen zu können, benötigen wir noch weitere Informationen. Könnten Sie uns mehr Details zu Ihrer Situation mitteilen?",
  },
  {
    id: "offer",
    label: "Angebot ankündigen",
    text: "Wir haben Ihre Anfrage geprüft und können Ihnen ein passendes Angebot unterbreiten. Sie erhalten dieses in Kürze von uns.",
  },
  {
    id: "reject",
    label: "Absage senden",
    text: "Vielen Dank für Ihre Anfrage. Leider können wir Ihnen aktuell kein passendes Angebot machen. Wir wünschen Ihnen viel Erfolg bei der weiteren Suche.",
  },
];

// Primary next-status CTA per current status
const NEXT_ACTION: Partial<
  Record<AnfrageStatus, { next: AnfrageStatus; label: string; icon: React.ElementType; color: string }>
> = {
  offen: {
    next: "in_bearbeitung",
    label: "Annehmen",
    icon: Clock,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  in_bearbeitung: {
    next: "angeboten",
    label: "Angebot senden",
    icon: PackageCheck,
    color: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  angeboten: {
    next: "bestaetigt",
    label: "Bestätigen",
    icon: CheckCircle2,
    color: "bg-green-600 hover:bg-green-700 text-white",
  },
};

interface AnfrageQuickActionsProps {
  anfrageId: string;
  status: AnfrageStatus;
  profileId: string;          // sender_id for nachrichten
  anbieterId: string;         // for optimistic update scope
}

export function AnfrageQuickActions({
  anfrageId,
  status,
  profileId,
}: AnfrageQuickActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingReply, setLoadingReply] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const nextAction = NEXT_ACTION[status];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const updateStatus = async (e: React.MouseEvent, nextStatus: AnfrageStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("anfragen")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", anfrageId);
    if (error) {
      toast.error("Fehler beim Statuswechsel", { description: error.message });
    } else {
      toast.success("Status aktualisiert");
      router.refresh();
    }
    setLoadingStatus(false);
  };

  const sendReply = async (e: React.MouseEvent, reply: (typeof CANNED_REPLIES)[number]) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setLoadingReply(reply.id);
    const supabase = createClient();
    const { error } = await supabase.from("nachrichten").insert({
      anfrage_id: anfrageId,
      sender_id: profileId,
      inhalt: reply.text,
      gelesen: false,
    });
    if (error) {
      toast.error("Nachricht konnte nicht gesendet werden", { description: error.message });
    } else {
      toast.success("Schnellantwort gesendet", { description: reply.label });
      router.refresh();
    }
    setLoadingReply(null);
  };

  const rejectDirect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingStatus(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("anfragen")
      .update({ status: "abgelehnt", updated_at: new Date().toISOString() })
      .eq("id", anfrageId);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("Anfrage abgelehnt");
      router.refresh();
    }
    setLoadingStatus(false);
  };

  // Only show for actionable statuses
  const showActions = status === "offen" || status === "in_bearbeitung" || status === "angeboten";
  if (!showActions) return null;

  return (
    <div
      className="flex items-center gap-2 mt-3 pt-3 border-t border-[--border] flex-wrap"
      onClick={stopProp}
    >
      {/* Primary status CTA */}
      {nextAction && (
        <Button
          size="sm"
          disabled={loadingStatus}
          onClick={(e) => updateStatus(e, nextAction.next)}
          className={`h-7 text-xs gap-1.5 ${nextAction.color}`}
        >
          {loadingStatus ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <nextAction.icon className="h-3.5 w-3.5" />
          )}
          {nextAction.label}
        </Button>
      )}

      {/* Quick reply dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          size="sm"
          variant="outline"
          disabled={!!loadingReply}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
          className="h-7 text-xs gap-1 border-[--border]"
        >
          {loadingReply ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" />
          )}
          Schnellantwort
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </Button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-lg border border-[--border] bg-[--card] shadow-lg py-1">
            {CANNED_REPLIES.map((r) => (
              <button
                key={r.id}
                onClick={(e) => sendReply(e, r)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[--muted] transition-colors flex items-start gap-2 group"
              >
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[--muted-foreground] group-hover:text-[--primary] transition-colors" />
                <span className="font-medium text-[--foreground]">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reject shortcut — only for non-rejected */}
      {status === "offen" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={loadingStatus}
          onClick={rejectDirect}
          className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Ablehnen
        </Button>
      )}
    </div>
  );
}
