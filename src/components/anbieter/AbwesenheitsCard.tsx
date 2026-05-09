"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, PlaneLanding, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  anbieterId: string;
  initialAbwesend: boolean;
  initialAbwesenBis: string | null;
  initialAbwesenNotiz: string | null;
}

export function AbwesenheitsCard({
  anbieterId,
  initialAbwesend,
  initialAbwesenBis,
  initialAbwesenNotiz,
}: Props) {
  const [abwesend, setAbwesend] = useState(initialAbwesend);
  const [abwesenBis, setAbwesenBis] = useState(initialAbwesenBis ?? "");
  const [abwesenNotiz, setAbwesenNotiz] = useState(initialAbwesenNotiz ?? "");
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const { error } = await supabase
        .from("anbieter")
        .update({
          abwesend: checked,
          abwesend_bis: checked ? (abwesenBis || null) : null,
          abwesend_notiz: checked ? (abwesenNotiz || null) : null,
        })
        .eq("id", anbieterId);

      if (error) {
        toast.error("Fehler beim Aktualisieren des Abwesenheitsmodus.");
        return;
      }
      setAbwesend(checked);
      toast.success(checked ? "Abwesenheitsmodus aktiviert." : "Abwesenheitsmodus deaktiviert.");
    });
  }

  function handleSave() {
    startTransition(async () => {
      const { error } = await supabase
        .from("anbieter")
        .update({
          abwesend_bis: abwesenBis || null,
          abwesend_notiz: abwesenNotiz || null,
        })
        .eq("id", anbieterId);

      if (error) {
        toast.error("Fehler beim Speichern.");
        return;
      }
      toast.success("Abwesenheitsinformationen gespeichert.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Toggle Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${abwesend ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
            <PlaneLanding className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Abwesenheitsmodus</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {abwesend
                ? "Aktiv – Ihr Profil zeigt einen Abwesenheitshinweis."
                : "Deaktiviert – Ihr Profil ist normal erreichbar."}
            </p>
          </div>
        </div>
        <Switch
          checked={abwesend}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label="Abwesenheitsmodus umschalten"
        />
      </div>

      {/* Warning Banner when active */}
      {abwesend && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Im Abwesenheitsmodus wird auf Ihrem öffentlichen Profil ein Hinweis angezeigt,
            dass Sie vorübergehend keine Anfragen entgegennehmen.
          </p>
        </div>
      )}

      {/* Details when active */}
      {abwesend && (
        <div className="space-y-3 pl-11">
          <div className="space-y-1">
            <Label htmlFor="abwesend-bis" className="text-xs font-medium text-gray-700">
              Abwesend bis (optional)
            </Label>
            <Input
              id="abwesend-bis"
              type="date"
              value={abwesenBis}
              onChange={(e) => setAbwesenBis(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="text-sm h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="abwesend-notiz" className="text-xs font-medium text-gray-700">
              Hinweis für Besucher (optional)
            </Label>
            <Textarea
              id="abwesend-notiz"
              value={abwesenNotiz}
              onChange={(e) => setAbwesenNotiz(e.target.value)}
              placeholder="z.B. Wir sind bis Ende August im Betriebsurlaub. Ab September sind wir wieder für Sie da."
              className="text-sm resize-none"
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-gray-400 text-right">{abwesenNotiz.length}/200</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Angaben speichern
          </Button>
        </div>
      )}
    </div>
  );
}
