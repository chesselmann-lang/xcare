"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnfrageStatus } from "@/lib/types";

interface FamilieAnfrageAktionenProps {
  anfrageId: string;
  currentStatus: AnfrageStatus;
  anbieterName?: string;
  familieId: string;
}

export function FamilieAnfrageAktionen({
  anfrageId,
  currentStatus,
  anbieterName,
  familieId,
}: FamilieAnfrageAktionenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Only show actions when status is "angeboten"
  if (currentStatus !== "angeboten") return null;

  const handleAktion = async (nextStatus: AnfrageStatus) => {
    setLoading(nextStatus);
    const supabase = createClient();

    const { error } = await supabase
      .from("anfragen")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", anfrageId);

    if (error) {
      toast.error("Fehler", { description: error.message });
      setLoading(null);
      return;
    }

    // Log to history (non-blocking)
    supabase.from("anfragen_historie").insert({
      anfrage_id: anfrageId,
      alter_status: currentStatus,
      neuer_status: nextStatus,
      geaendert_von: familieId,
    }).then(() => {}).catch(() => {});

    if (nextStatus === "bestaetigt") {
      toast.success("Angebot angenommen!", {
        description: `${anbieterName ?? "Der Anbieter"} wird informiert.`,
      });
    } else {
      toast("Angebot abgelehnt", {
        icon: "👋",
        description: "Sie können weitere Anbieter kontaktieren.",
      });
    }

    router.refresh();
    setLoading(null);
  };

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
          <ThumbsUp className="h-4 w-4" />
          Angebot erhalten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-purple-700">
          {anbieterName
            ? <><strong>{anbieterName}</strong> hat Ihnen ein Angebot gemacht.</>
            : "Sie haben ein Angebot erhalten."}{" "}
          Möchten Sie das Angebot annehmen?
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            disabled={loading !== null}
            onClick={() => handleAktion("bestaetigt")}
          >
            {loading === "bestaetigt" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Angebot annehmen
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            disabled={loading !== null}
            onClick={() => handleAktion("abgelehnt")}
          >
            {loading === "abgelehnt" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Ablehnen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
