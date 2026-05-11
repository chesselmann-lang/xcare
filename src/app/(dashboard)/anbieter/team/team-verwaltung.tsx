"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Users, Mail, Crown, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Rolle = "mitarbeiter" | "admin";

interface Mitglied {
  id: string;
  anbieter_id: string;
  profile_id: string;
  rolle: Rolle;
  created_at: string;
  profiles?: {
    vorname: string | null;
    nachname: string | null;
    email: string;
  } | null;
}

const rolleLabel: Record<Rolle, string> = {
  mitarbeiter: "Mitarbeiter",
  admin: "Admin",
};

const rolleIcon: Record<Rolle, React.ElementType> = {
  mitarbeiter: User,
  admin: Crown,
};

export function TeamVerwaltung({
  anbieterId,
  anbieterName,
  currentProfileId,
  initialMitglieder,
  maxTeamMembers = null,
  currentMemberCount = 1,
}: {
  anbieterId: string;
  anbieterName: string;
  currentProfileId: string;
  initialMitglieder: Mitglied[];
  maxTeamMembers?: number | null;
  currentMemberCount?: number;
}) {
  const supabase = createClient();
  const [mitglieder, setMitglieder] = useState<Mitglied[]>(initialMitglieder);
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState<Rolle>("mitarbeiter");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Dynamic limit check (member count grows as we add members in state)
  const liveCount = currentMemberCount - initialMitglieder.length + mitglieder.length;
  const atLimit = maxTeamMembers !== null && liveCount >= maxTeamMembers;

  const einladen = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }
    setInviting(true);
    try {
      // Look up profile by email
      const { data: targetProfile, error: lookupErr } = await supabase
        .from("profiles")
        .select("id, vorname, nachname, email")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (lookupErr || !targetProfile) {
        toast.error("Kein xcare-Konto mit dieser E-Mail-Adresse gefunden.");
        return;
      }

      // Check not already a member
      if (mitglieder.some((m) => m.profile_id === targetProfile.id)) {
        toast.error("Diese Person ist bereits Teammitglied.");
        return;
      }

      // Check not the current owner
      if (targetProfile.id === currentProfileId) {
        toast.error("Sie können sich nicht selbst einladen.");
        return;
      }

      const { data: neu, error: insertErr } = await supabase
        .from("anbieter_mitglieder")
        .insert({ anbieter_id: anbieterId, profile_id: targetProfile.id, rolle })
        .select("*, profiles(vorname, nachname, email)")
        .single();

      if (insertErr) throw insertErr;
      setMitglieder((prev) => [...prev, neu as Mitglied]);
      setEmail("");
      toast.success(`${targetProfile.vorname ?? email} wurde eingeladen!`);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Fehler beim Einladen");
    } finally {
      setInviting(false);
    }
  };

  const entfernen = async (mitglied: Mitglied) => {
    setRemoving(mitglied.id);
    const { error } = await supabase
      .from("anbieter_mitglieder")
      .delete()
      .eq("id", mitglied.id);

    if (error) {
      toast.error("Fehler beim Entfernen");
    } else {
      setMitglieder((prev) => prev.filter((m) => m.id !== mitglied.id));
      toast("Teammitglied entfernt", { icon: "👋" });
    }
    setRemoving(null);
  };

  const rolleAendern = async (mitglied: Mitglied, neueRolle: Rolle) => {
    const { error } = await supabase
      .from("anbieter_mitglieder")
      .update({ rolle: neueRolle })
      .eq("id", mitglied.id);

    if (error) {
      toast.error("Fehler beim Ändern der Rolle");
    } else {
      setMitglieder((prev) =>
        prev.map((m) => m.id === mitglied.id ? { ...m, rolle: neueRolle } : m)
      );
      toast.success("Rolle aktualisiert");
    }
  };

  return (
    <div className="space-y-6">
      {/* Einladen */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Mitarbeiter einladen
        </h2>

        {atLimit ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Sie haben das Mitgliederlimit Ihres Plans erreicht.{" "}
            <a href="/anbieter/abo" className="font-semibold underline hover:no-underline">
              Jetzt upgraden →
            </a>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted-foreground]" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-Mail-Adresse"
                  type="email"
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && einladen()}
                />
              </div>
              <select
                value={rolle}
                onChange={(e) => setRolle(e.target.value as Rolle)}
                className="flex h-10 w-36 rounded-lg border border-[--input] bg-[--background] px-3 text-sm"
              >
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="admin">Admin</option>
              </select>
              <Button onClick={einladen} disabled={inviting} className="gap-2">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Einladen
              </Button>
            </div>
            <p className="text-xs text-[--muted-foreground] mt-2">
              Die Person muss bereits ein xcare-Konto besitzen. Admins können Anfragen bearbeiten und Leistungen verwalten.
            </p>
          </>
        )}
      </div>

      {/* Mitgliederliste */}
      <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
        <div className="p-4 border-b border-[--border] flex items-center gap-2">
          <Users className="h-4 w-4 text-[--muted-foreground]" />
          <h2 className="font-semibold text-sm">
            Team ({mitglieder.length} {mitglieder.length === 1 ? "Mitglied" : "Mitglieder"})
          </h2>
        </div>

        {mitglieder.length === 0 ? (
          <div className="text-center py-12 text-[--muted-foreground]">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Noch keine Teammitglieder eingeladen</p>
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {mitglieder.map((m) => {
              const RolleIcon = rolleIcon[m.rolle];
              const name = m.profiles
                ? `${m.profiles.vorname ?? ""} ${m.profiles.nachname ?? ""}`.trim() || m.profiles.email
                : "Unbekannt";
              const email = m.profiles?.email ?? "";

              return (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[--primary-light] text-[--primary] font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-[--muted-foreground] truncate">{email}</p>
                    <p className="text-[10px] text-[--muted-foreground] mt-0.5">
                      Hinzugefügt: {formatDate(m.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.rolle}
                      onChange={(e) => rolleAendern(m, e.target.value as Rolle)}
                      className="text-xs h-7 rounded-lg border border-[--input] bg-[--background] px-2"
                    >
                      <option value="mitarbeiter">Mitarbeiter</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => entfernen(m)}
                      disabled={removing === m.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Entfernen"
                    >
                      {removing === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
