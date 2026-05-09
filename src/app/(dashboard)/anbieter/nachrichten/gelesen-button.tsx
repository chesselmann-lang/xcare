"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alleAlsGelesenMarkieren } from "./aktionen";
import { toast } from "sonner";

export function AlleGelesenButton({ anfrageIds }: { anfrageIds: string[] }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await alleAlsGelesenMarkieren(anfrageIds);
      toast.success("Alle Nachrichten als gelesen markiert");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="gap-1.5"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCheck className="h-3.5 w-3.5" />
      )}
      Alle gelesen
    </Button>
  );
}
