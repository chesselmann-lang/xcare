"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Crown, Mail, Calendar, Loader2, Trash2,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Rolle = "mitarbeiter" | "admin";

interface Profile {
  vorname: string | null;
  nachname: string | null;
  email: string;
  avatar_url?: string | null;
}

interface Mitglied {
  id: string;
  anbieter_id: string;
  profile_id: string;
  rolle: Rolle;
  created_at: string;
  profiles: Profile | null;
}

const rolleConfig: Record<Rolle, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  mitarbeiter: {
    label: "Mitarbeiter",
    icon: User,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
};

export function MitgliedProfilClient({
  mitglied: initialMitglied,
  anbieterName,
}: {
  mitglied: Mitglied;
  anbieterName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [mitglied, setMitglied] = useState<Mitglied>(initialMitglied);
  const [savingRolle, setSavingRolle] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const cfg = rolleConfig[mitglied.rolle];
  const RolleIcon = cfg.icon;
  const name = mitglied.profiles
    ? `${mitglied.profiles.vorname ?? ""} ${mitglied.profiles.nachname ?? ""}`.trim() ||
      mitglied.profiles.email
    : "Unbekannt";
  const initials = name.charAt(0).toUpperCase();

  const rolleAendern = async (neueRolle: Rolle) => {
    if (neueRolle === mitglied.rolle) return;
    setSavingRolle(true);
    const { error } = await supabase
      .from("anbieter_mitglieder")
      .update({ rolle: neueRolle })
      .eq("id", mitglied.id);
    setSavingRolle(false);
    if (error) {
      toast.error("Fehler beim Ändern der Rolle");
    } else {
      setMitglied((prev) => ({ ...prev, rolle: neueRolle }));
      toast.success("Rolle aktualisiert");
    }
  };

  const entfernen = async () => {
    setRemoving(true);
    const { error } = await supabase
      .from("anbieter_mitglieder")
      .delete()
      .eq("id", mitglied.id);
    setRemoving(false);
    if (error) {
      toast.error("Fehler beim Entfernen");
    } else {
      toast("Teammitglied entfernt", { icon: "👋" });
      router.push("/anbieter/team");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {mitglied.profiles?.avatar_url ? (
            <img
              src={mitglied.profiles.avatar_url}
              alt={name}
              className="h-16 w-16 rounded-full object-cover shrink-0 ring-2 ring-[--border]"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[--primary-light] text-[--primary] font-bold text-2xl ring-2 ring-[--border]">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}
              >
                <RolleIcon className="h-3 w-3" />
                {cfg.label}
              </span>
              <span className="text-xs text-[--muted-foreground]">bei {anbieterName}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-[--muted]/50 px-3 py-2.5">
            <Mail className="h-4 w-4 text-[--muted-foreground] shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-wide">E-Mail</p>
              <p className="text-sm truncate">{mitglied.profiles?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg bg-[--muted]/50 px-3 py-2.5">
            <Calendar className="h-4 w-4 text-[--muted-foreground] shrink-0" />
            <div>
              <p className="text-[10px] text-[--muted-foreground] font-medium uppercase tracking-wide">Mitglied seit</p>
              <p className="text-sm">{formatDate(mitglied.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Management */}
      <div className="rounded-2xl border border-[--border] bg-[--card] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-[--muted-foreground]" />
          <h2 className="font-semibold text-sm">Rolle & Berechtigungen</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["mitarbeiter", "admin"] as Rolle[]).map((r) => {
            const rc = rolleConfig[r];
            const RIcon = rc.icon;
            const isSelected = mitglied.rolle === r;
            return (
              <button
                key={r}
                onClick={() => rolleAendern(r)}
                disabled={savingRolle}
                className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? `${rc.bg} ${rc.color} border-current ring-1 ring-current/30`
                    : "border-[--border] hover:border-[--primary]/40 hover:bg-[--muted]/50"
                }`}
              >
                {savingRolle && isSelected && (
                  <Loader2 className="absolute top-2 right-2 h-3 w-3 animate-spin opacity-60" />
                )}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-white/60" : "bg-[--muted]"}`}>
                  <RIcon className={`h-4 w-4 ${isSelected ? rc.color : "text-[--muted-foreground]"}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{rc.label}</p>
                  <p className={`text-[10px] mt-0.5 ${isSelected ? "opacity-80" : "text-[--muted-foreground]"}`}>
                    {r === "admin"
                      ? "Kann Leistungen & Einstellungen verwalten"
                      : "Kann Anfragen bearbeiten"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="font-semibold text-sm text-red-800 mb-1">Mitglied entfernen</h2>
        <p className="text-xs text-red-700 mb-4">
          {name} verliert sofort den Zugang zu {anbieterName}. Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        {confirmRemove ? (
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={entfernen}
              disabled={removing}
              className="gap-2"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Ja, endgültig entfernen
            </Button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="text-sm text-red-700 underline hover:no-underline"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRemove(true)}
            className="border-red-300 text-red-700 hover:bg-red-100 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Aus Team entfernen
          </Button>
        )}
      </div>
    </div>
  );
}
