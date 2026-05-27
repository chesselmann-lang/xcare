"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function EPAVerbindenForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [kvnr, setKvnr] = useState("");
  const [einwilligung, setEinwilligung] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!einwilligung) {
      toast.error("Bitte bestätigen Sie die Einwilligung.");
      return;
    }
    if (!/^[A-Z]\d{9}$/.test(kvnr.trim())) {
      toast.error(
        "Bitte geben Sie eine gültige KVNR ein (1 Buchstabe + 9 Ziffern)."
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/epa/verbinden", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kvnr: kvnr.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Verbindung fehlgeschlagen");
        }
        toast.success("ePA erfolgreich verbunden!");
        router.refresh();
      } catch (err) {
        toast.error(String(err instanceof Error ? err.message : err));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="kvnr">
          Krankenversichertennummer (KVNR)
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="kvnr"
          placeholder="z.B. A123456789"
          value={kvnr}
          onChange={(e) => setKvnr(e.target.value.toUpperCase())}
          maxLength={10}
          pattern="[A-Z]\d{9}"
          required
          className="font-mono"
        />
        <p className="text-xs text-[--muted-foreground]">
          10-stellige Nummer auf Ihrer Krankenkassenkarte (1 Buchstabe + 9 Ziffern)
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-3 bg-[--muted]/30">
        <Checkbox
          id="einwilligung"
          checked={einwilligung}
          onCheckedChange={(v) => setEinwilligung(!!v)}
        />
        <Label htmlFor="einwilligung" className="text-sm leading-relaxed cursor-pointer">
          Ich willige ein, dass xcare meine ePA-Daten (Medikamente, Diagnosen,
          Vitalwerte) über die Telematikinfrastruktur abruft und in meinem
          Account speichert. Ich kann diese Verbindung jederzeit in den
          Einstellungen widerrufen.
        </Label>
      </div>

      <Button
        type="submit"
        disabled={isPending || !einwilligung}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verbinden…
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4 mr-2" />
            ePA verbinden
          </>
        )}
      </Button>
    </form>
  );
}
