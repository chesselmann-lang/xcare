"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Bell, Shield, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";
import { useRouter } from "next/navigation";

interface NotifPrefs {
  email_anfragen: boolean;
  email_nachrichten: boolean;
  email_statusupdate: boolean;
  email_wochenbericht: boolean;
}

export function EinstellungenFormular({
  profile,
  prefs,
}: {
  profile: Profile;
  prefs: NotifPrefs | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    email_anfragen: prefs?.email_anfragen ?? true,
    email_nachrichten: prefs?.email_nachrichten ?? true,
    email_statusupdate: prefs?.email_statusupdate ?? true,
    email_wochenbericht: prefs?.email_wochenbericht ?? false,
  });

  const savePrefs = async () => {
    setSaving(true);
    const { error } = await supabase.from("notification_preferences")
      .upsert({ profile_id: profile.id, ...notifPrefs, updated_at: new Date().toISOString() });
    if (error) toast.error("Fehler beim Speichern");
    else toast.success("Einstellungen gespeichert");
    setSaving(false);
  };


  const deleteAccount = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("Server-Fehler");
      toast("Account-Löschung durchgeführt. Ihre Daten werden innerhalb von 72 h vollständig gelöscht.", {
        duration: 8000,
      });
      router.push("/");
    } catch {
      toast.error("Fehler beim Löschen des Accounts. Bitte versuchen Sie es erneut.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[--border] last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[--muted-foreground] mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${checked ? "bg-[--primary]" : "bg-gray-200"}`}
        role="switch" aria-checked={checked}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Profil-Info */}
      <div className="bg-[--card] rounded-xl border border-[--border] p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4" /> Konto</h2>
        <p className="text-sm text-[--muted-foreground]">{profile.email}</p>
        <p className="text-xs text-[--muted-foreground] mt-0.5 capitalize">Rolle: {profile.role === "anbieter" ? "Anbieter" : "Familie"}</p>
      </div>

      {/* E-Mail-Benachrichtigungen */}
      <div className="bg-[--card] rounded-xl border border-[--border] p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Bell className="h-4 w-4" /> E-Mail-Benachrichtigungen</h2>
        <Toggle
          label="Neue Anfragen"
          desc="E-Mail wenn eine neue Anfrage eingeht"
          checked={notifPrefs.email_anfragen}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, email_anfragen: v }))}
        />
        <Toggle
          label="Neue Nachrichten"
          desc="E-Mail bei neuen Chat-Nachrichten"
          checked={notifPrefs.email_nachrichten}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, email_nachrichten: v }))}
        />
        <Toggle
          label="Status-Updates"
          desc="E-Mail wenn sich der Status einer Anfrage ändert"
          checked={notifPrefs.email_statusupdate}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, email_statusupdate: v }))}
        />
        <Toggle
          label="Wochenbericht"
          desc="Wöchentliche Zusammenfassung Ihrer Aktivitäten"
          checked={notifPrefs.email_wochenbericht}
          onChange={(v) => setNotifPrefs((p) => ({ ...p, email_wochenbericht: v }))}
        />
        <Button onClick={savePrefs} disabled={saving} className="mt-4 gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Einstellungen speichern
        </Button>
      </div>

      {/* Datenschutz */}
      <div className="bg-[--card] rounded-xl border border-[--border] p-5">
        <h2 className="font-semibold mb-4">Datenschutz & Account</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Meine Daten exportieren</p>
            <p className="text-xs text-[--muted-foreground] mb-2">Laden Sie alle Ihre bei xcare gespeicherten Daten herunter (DSGVO Art. 20).</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/profil/export" download>Daten herunterladen (JSON)</a>
            </Button>
          </div>
          <div className="pt-3 border-t border-[--border]">
            <p className="text-sm font-medium text-red-600 mb-1 flex items-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Account löschen
            </p>
            <p className="text-xs text-[--muted-foreground] mb-2">
              Alle Ihre Daten werden unwiderruflich gelöscht. Laufende Anfragen werden abgebrochen.
            </p>
            {confirmDelete && (
              <p className="text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-700 mb-2">
                ⚠️ Wirklich löschen? Klicken Sie nochmals zur Bestätigung.
              </p>
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={deleteAccount}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmDelete ? "Ja, Account endgültig löschen" : "Account löschen"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
