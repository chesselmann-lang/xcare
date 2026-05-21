import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Bell, Shield, KeyRound, ExternalLink, Eye, SlidersHorizontal, QrCode, Code2 } from "lucide-react";
import { EmbedCode } from "@/components/ui/embed-code";
import { ProfileQrCode } from "@/components/ui/profile-qr-code";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnbieterBenachrichtigungsEinstellungen } from "./anbieter-benachrichtigungs-einstellungen";

export const metadata = {
  title: "Einstellungen | xcare Anbieter",
};

export default async function AnbieterEinstellungenPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, email, verfuegbarkeit")
    .eq("profile_id", profile.id)
    .single();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Einstellungen</h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Konto, Benachrichtigungen und Datenschutz verwalten.
        </p>
      </div>

      {/* Schnell-Links */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { href: "/anbieter/profil", icon: Building2, label: "Profil bearbeiten", desc: "Kontaktdaten, Beschreibung, Logo" },
          { href: "/anbieter/leistungen", icon: SlidersHorizontal, label: "Leistungen verwalten", desc: "Leistungen hinzufügen oder archivieren" },
          { href: anbieter?.id ? `/anbieter/${anbieter.id}` : "#", icon: Eye, label: "Öffentliches Profil", desc: "So sehen Familien Ihr Profil", external: true },
          { href: "/anbieter/abo", icon: Shield, label: "Abo & Plan", desc: "Aktueller Plan und Upgrade-Optionen" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="flex items-start gap-3 rounded-xl border border-[--border] bg-[--card] p-4 hover:border-[--primary] hover:bg-[--primary]/5 transition-colors group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--primary]/10 shrink-0 group-hover:bg-[--primary]/20 transition-colors">
              <item.icon className="h-4 w-4 text-[--primary]" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Kontodaten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[--primary]" /> Kontodaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[--muted-foreground] mb-1">Name</p>
              <p className="font-medium">{anbieter?.name ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-[--muted-foreground] mb-1">Anmelde-E-Mail</p>
              <p className="font-medium truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-[--muted-foreground] mb-1">Kontakt-E-Mail</p>
              <p className="font-medium truncate">{anbieter?.email ?? "–"}</p>
            </div>
            <div>
              <p className="text-xs text-[--muted-foreground] mb-1">Konto erstellt</p>
              <p className="font-medium">
                {new Date(profile.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="pt-1">
            <Link
              href="/anbieter/profil"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium text-[--foreground] hover:bg-[--muted] transition-colors"
            >
              Profil bearbeiten
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* QR-Code */}
      {anbieter?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[--primary]" /> Profil-QR-Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[--muted-foreground] mb-4">
              Teilen Sie Ihr Profil per QR-Code — ideal für Flyer, Aushänge und Visitenkarten.
            </p>
            <ProfileQrCode
              url={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de"}/anbieter/${anbieter.id}`}
              label={anbieter.name ?? undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Bewertungs-Widget Embed */}
      {anbieter?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[--primary]" /> Bewertungs-Widget einbetten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[--muted-foreground] mb-4">
              Zeigen Sie Ihre xcare-Bewertungen auf Ihrer eigenen Website an.
            </p>
            <EmbedCode anbieterID={anbieter.id} />
          </CardContent>
        </Card>
      )}

      {/* Benachrichtigungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-[--primary]" /> Benachrichtigungs-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnbieterBenachrichtigungsEinstellungen />
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
          {/* Passwort */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Passwort ändern</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">
                Erhalten Sie einen Reset-Link an{" "}
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

          {/* Datenschutz */}
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
              <p className="text-sm font-medium text-red-600">Anbieter-Konto löschen</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">
                Profil, Leistungen und alle Daten werden unwiderruflich entfernt.
              </p>
            </div>
            <a
              href="mailto:support@xcare.de?subject=Anbieter-Konto%20loeschen"
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
