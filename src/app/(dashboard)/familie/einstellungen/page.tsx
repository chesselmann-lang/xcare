import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, Shield, KeyRound, ExternalLink, Monitor } from "lucide-react";
import Link from "next/link";
import { FamilieProfilFormular } from "./familie-profil-formular";
import { BenachrichtigungsEinstellungen } from "./benachrichtigungs-einstellungen";
import { ModusWechsler } from "@/components/ui-modus/ModusWechsler";

export const metadata = {
  title: "Einstellungen | xcare Familie",
};

export default async function FamilieEinstellungenPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Einstellungen</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Verwalten Sie Ihr Profil, Benachrichtigungen und Datenschutzoptionen.
        </p>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-[--primary]" /> Mein Profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FamilieProfilFormular profile={profile} email={user.email ?? ""} />
        </CardContent>
      </Card>

      {/* Benachrichtigungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-[--primary]" /> Benachrichtigungs-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BenachrichtigungsEinstellungen />
        </CardContent>
      </Card>

      {/* Anzeigemodus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-[--primary]" /> Anzeigemodus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[--muted-foreground] mb-3">
            Passen Sie die Darstellung an Ihre Bedürfnisse an.
          </p>
          <ModusWechsler />
        </CardContent>
      </Card>

      {/* Sicherheit & Datenschutz */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-[--primary]" /> Sicherheit & Datenschutz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Passwort ändern */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Passwort ändern</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">
                Erhalten Sie einen Link zur Passwort-Änderung per E-Mail an{" "}
                <span className="font-medium">{user.email}</span>.
              </p>
            </div>
            <Link
              href="/api/auth/reset-password"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium text-[--foreground] hover:bg-[--muted] transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Link anfordern
            </Link>
          </div>

          <div className="h-px bg-[--border]" />

          {/* Datenschutzerklärung */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Datenschutzerklärung</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">
                Informieren Sie sich über die Verarbeitung Ihrer Daten.
              </p>
            </div>
            <Link
              href="/datenschutz"
              target="_blank"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium text-[--foreground] hover:bg-[--muted] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Öffnen
            </Link>
          </div>

          <div className="h-px bg-[--border]" />

          {/* Konto löschen */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-600">Konto löschen</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">
                Alle Daten werden unwiderruflich gelöscht. Wenden Sie sich an den Support.
              </p>
            </div>
            <a
              href="mailto:support@xcare.de?subject=Konto%20loeschen"
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Anfragen
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
