"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Mail } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
  email: string;
}

export function FamilieProfilFormular({ profile, email }: Props) {
  const [vorname, setVorname] = useState(profile.vorname ?? "");
  const [nachname, setNachname] = useState(profile.nachname ?? "");
  const [telefon, setTelefon] = useState((profile as { telefon?: string | null }).telefon ?? "");
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleSave() {
    if (!vorname.trim()) {
      toast.error("Bitte geben Sie Ihren Vornamen ein.");
      return;
    }
    startTransition(async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          vorname: vorname.trim(),
          nachname: nachname.trim() || null,
          telefon: telefon.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        toast.error("Fehler beim Speichern: " + error.message);
        return;
      }
      toast.success("Profil erfolgreich gespeichert.");
    });
  }

  return (
    <div className="space-y-4">
      {/* E-Mail (read-only) */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-700">E-Mail-Adresse</Label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-500">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {email}
        </div>
        <p className="text-xs text-gray-400">Die E-Mail-Adresse kann nicht geändert werden.</p>
      </div>

      <Separator />

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vorname" className="text-xs font-medium text-gray-700">
            Vorname <span className="text-red-500">*</span>
          </Label>
          <Input
            id="vorname"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            placeholder="Max"
            className="text-sm"
            maxLength={50}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nachname" className="text-xs font-medium text-gray-700">
            Nachname
          </Label>
          <Input
            id="nachname"
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
            placeholder="Mustermann"
            className="text-sm"
            maxLength={50}
          />
        </div>
      </div>

      {/* Telefon */}
      <div className="space-y-1">
        <Label htmlFor="telefon" className="text-xs font-medium text-gray-700">
          Telefon (optional)
        </Label>
        <Input
          id="telefon"
          type="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="+49 123 456789"
          className="text-sm"
          maxLength={30}
        />
        <p className="text-xs text-gray-400">
          Wird nicht öffentlich angezeigt. Dient nur für die direkte Kontaktaufnahme durch Anbieter.
        </p>
      </div>

      <div className="pt-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Speichern
        </Button>
      </div>
    </div>
  );
}
