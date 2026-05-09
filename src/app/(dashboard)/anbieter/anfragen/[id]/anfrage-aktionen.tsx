"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

interface AnfrageAktionenProps {
  anfrageId: string;
  currentStatus: AnfrageStatus;
  familieEmail?: string;
  familieName?: string;
  anbieterName?: string;
  lebenslage?: string;
}

const statusUebergaenge: Record<
  AnfrageStatus,
  { label: string; nextStatus: AnfrageStatus; variant: "default" | "success" | "destructive" }[]
> = {
  offen: [
    { label: "In Bearbeitung nehmen", nextStatus: "in_bearbeitung", variant: "default" },
    { label: "Ablehnen", nextStatus: "abgelehnt", variant: "destructive" },
  ],
  in_bearbeitung: [
    { label: "Angebot machen", nextStatus: "angeboten", variant: "success" },
    { label: "Ablehnen", nextStatus: "abgelehnt", variant: "destructive" },
  ],
  angeboten: [
    { label: "Als bestätigt markieren", nextStatus: "bestaetigt", variant: "success" },
    { label: "Ablehnen", nextStatus: "abgelehnt", variant: "destructive" },
  ],
  bestaetigt: [
    { label: "Abschließen", nextStatus: "abgeschlossen", variant: "default" },
  ],
  abgelehnt: [],
  abgeschlossen: [],
};

const statusLabels: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angeboten",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

export default function AnfrageAktionen({
  anfrageId,
  currentStatus,
  familieEmail,
  familieName,
  anbieterName,
  lebenslage,
}: AnfrageAktionenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<AnfrageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uebergaenge = statusUebergaenge[currentStatus] ?? [];

  if (uebergaenge.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-[--muted-foreground]">
          <p className="text-sm">Diese Anfrage ist abgeschlossen.</p>
        </CardContent>
      </Card>
    );
  }

  const handleStatusChange = async (nextStatus: AnfrageStatus) => {
    setLoading(nextStatus);
    setError(null);
    const supabase = createClient();

    const { error: err } = await supabase
      .from("anfragen")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", anfrageId);

    if (err) {
      setError(err.message);
      toast.error("Fehler beim Statuswechsel", { description: err.message });
      setLoading(null);
      return;
    }

    // Log to history (non-blocking — table may not exist yet in older deployments)
    supabase.from("anfragen_historie").insert({
      anfrage_id: anfrageId,
      alter_status: currentStatus,
      neuer_status: nextStatus,
    }).then(() => {/* ignore */}).catch(() => {/* ignore */});

    // Fire Inngest event for email notification (non-blocking)
    if (familieEmail && familieName && anbieterName) {
      fetch("/api/inngest-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familie_email: familieEmail,
          familie_name: familieName,
          anbieter_name: anbieterName,
          new_status: nextStatus,
          lebenslage: lebenslage ?? "",
          anfrage_id: anfrageId,
        }),
      }).catch(() => {
        // Non-critical — notification failure doesn't block workflow
      });
    }

    toast.success(`Status geändert: ${statusLabels[nextStatus]}`, {
      description: familieEmail ? `${familieName ?? "Die Familie"} wird per E-Mail benachrichtigt.` : undefined,
    });

    router.refresh();
    setLoading(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
        )}
        <div className="flex flex-wrap gap-3">
          {uebergaenge.map((u) => (
            <Button
              key={u.nextStatus}
              variant={u.variant === "success" ? "default" : u.variant}
              size="sm"
              disabled={loading !== null}
              onClick={() => handleStatusChange(u.nextStatus)}
              className={`gap-1 ${u.variant === "success" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            >
              {loading === u.nextStatus ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : u.variant === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : u.variant === "destructive" ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              {u.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
