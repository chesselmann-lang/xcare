"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { statusAendern } from "@/app/(dashboard)/anbieter/anfragen/aktionen";
import type { AnfrageStatus } from "@/lib/types";

interface AnfrageAktionenProps {
  anfrageId: string;
  currentStatus: AnfrageStatus;
  familieName?: string;
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
  familieName,
}: AnfrageAktionenProps) {
  const [pendingStatus, setPendingStatus] = useState<AnfrageStatus | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleStatusChange = (nextStatus: AnfrageStatus) => {
    setPendingStatus(nextStatus);
    startTransition(async () => {
      const result = await statusAendern(anfrageId, nextStatus);
      if (result?.error) {
        toast.error("Fehler beim Statuswechsel", { description: result.error });
      } else {
        toast.success(`Status geändert: ${statusLabels[nextStatus]}`, {
          description: nextStatus !== "offen"
            ? `${familieName ?? "Die Familie"} wurde benachrichtigt.`
            : undefined,
        });
      }
      setPendingStatus(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aktionen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {uebergaenge.map((u) => (
            <Button
              key={u.nextStatus}
              variant={u.variant === "success" ? "default" : u.variant}
              size="sm"
              disabled={isPending}
              onClick={() => handleStatusChange(u.nextStatus)}
              className={`gap-1 ${u.variant === "success" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            >
              {isPending && pendingStatus === u.nextStatus ? (
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
