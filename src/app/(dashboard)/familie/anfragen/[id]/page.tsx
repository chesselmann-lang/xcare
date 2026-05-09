import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Phone, Globe, MapPin,
  Calendar, FileText, CheckCircle2, XCircle, Clock,
  AlertCircle, PackageCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Chat } from "@/components/nachrichten/Chat";
import { BewertungAbgeben } from "@/components/bewertungen/BewertungAbgeben";
import { HistorieTimeline } from "@/components/anfragen/HistorieTimeline";
import { FamilieAnfrageAktionen } from "@/components/anfragen/FamilieAnfrageAktionen";
import type { AnfrageStatus } from "@/lib/types";

const statusConfig: Record<
  AnfrageStatus,
  { label: string; color: string; icon: React.ElementType; description: string }
> = {
  offen: {
    label: "Offen",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Clock,
    description: "Ihre Anfrage wurde gesendet und wartet auf eine Reaktion des Anbieters.",
  },
  in_bearbeitung: {
    label: "In Bearbeitung",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: AlertCircle,
    description: "Der Anbieter hat Ihre Anfrage angenommen und bearbeitet sie.",
  },
  angeboten: {
    label: "Angebot erhalten",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: PackageCheck,
    description: "Sie haben ein Angebot erhalten. Nehmen Sie Kontakt auf oder bestätigen Sie.",
  },
  bestaetigt: {
    label: "Bestätigt ✓",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
    description: "Ihre Anfrage ist bestätigt. Der Anbieter wird sich mit Ihnen in Verbindung setzen.",
  },
  abgelehnt: {
    label: "Abgelehnt",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
    description: "Der Anbieter kann Ihre Anfrage leider nicht bearbeiten.",
  },
  abgeschlossen: {
    label: "Abgeschlossen",
    color: "bg-gray-50 text-gray-600 border-gray-200",
    icon: CheckCircle2,
    description: "Diese Anfrage wurde abgeschlossen.",
  },
};

const lebenslageLabel: Record<string, string> = {
  geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
  schulkind_jugend: "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung & Behinderung",
  erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
  krankheit_genesung: "Krankheit & Genesung",
  alter_pflege: "Alter & Pflege",
  hospiz_palliativ: "Hospiz & Palliativ",
  trauer_nachlass: "Trauer & Nachlass",
};

export default async function FamilieAnfrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter");

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("*, anbieter(*, leistungen(*)), leistungen(*)")
    .eq("id", id)
    .eq("familie_id", profile.id)
    .single();

  if (!anfrage) notFound();

  const anbieter = anfrage.anbieter as {
    id: string;
    name: string;
    beschreibung: string | null;
    telefon: string | null;
    website: string | null;
    plz: string | null;
    ort: string | null;
    strasse: string | null;
  } | null;

  const leistung = anfrage.leistungen as { name: string } | null;
  const status = anfrage.status as AnfrageStatus;
  const statusInfo = statusConfig[status] ?? statusConfig.offen;
  const StatusIcon = statusInfo.icon;

  // Load nachrichten
  const { data: nachrichten } = await supabase
    .from("nachrichten")
    .select("*, sender:profiles!sender_id(vorname, nachname, role)")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  // Status-Historie laden
  const { data: historie } = await supabase
    .from("anfragen_historie")
    .select("id, alter_status, neuer_status, notiz, created_at")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  // Check existing bewertung for this famille+anbieter pair
  const { data: existingBewertung } = anbieter
    ? await supabase
        .from("bewertungen")
        .select("sterne, kommentar")
        .eq("familie_id", profile.id)
        .eq("anbieter_id", anbieter.id)
        .single()
    : { data: null };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/familie/anfragen">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage.replace(/_/g, " ")}
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Anfrage vom {formatDate(anfrage.created_at)}
            {leistung && <span> · {leistung.name}</span>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status-Banner */}
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${statusInfo.color}`}>
          <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{statusInfo.label}</p>
            <p className="text-sm mt-0.5 opacity-80">{statusInfo.description}</p>
          </div>
        </div>

        {/* Familie-Aktionen: Angebot annehmen/ablehnen */}
        <FamilieAnfrageAktionen
          anfrageId={id}
          currentStatus={status}
          anbieterName={anbieter?.name}
          familieId={profile.id}
        />

        {/* Anbieter-Info */}
        {anbieter && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Anbieter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{anbieter.name}</p>
                {anbieter.beschreibung && (
                  <p className="text-sm text-[--muted-foreground] mt-0.5 leading-relaxed line-clamp-3">
                    {anbieter.beschreibung}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-sm">
                {(anbieter.plz || anbieter.ort) && (
                  <p className="flex items-center gap-2 text-[--muted-foreground]">
                    <MapPin className="h-3.5 w-3.5" />
                    {anbieter.strasse ? `${anbieter.strasse}, ` : ""}{anbieter.plz} {anbieter.ort}
                  </p>
                )}
                {anbieter.telefon && (
                  <a
                    href={`tel:${anbieter.telefon}`}
                    className="flex items-center gap-2 text-[--primary] hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {anbieter.telefon}
                  </a>
                )}
                {anbieter.website && (
                  <a
                    href={anbieter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[--primary] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website besuchen
                  </a>
                )}
              </div>

              <Link href={`/anbieter/${anbieter.id}`}>
                <Button variant="outline" size="sm" className="mt-1">
                  Vollständiges Profil ansehen
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Anfrage-Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Meine Anfrage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[--muted-foreground] mb-0.5 uppercase tracking-wide">
                Lebenslage
              </p>
              <p className="font-medium">
                {lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[--muted-foreground] mb-0.5 uppercase tracking-wide">
                Ihre Beschreibung
              </p>
              <p className="text-sm leading-relaxed">{anfrage.beschreibung}</p>
            </div>
            {anfrage.ki_empfehlung && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">💡 KI-Empfehlung</p>
                <p className="text-sm text-blue-800 leading-relaxed">{anfrage.ki_empfehlung}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-[--muted-foreground] pt-1 border-t border-[--border]">
              <Calendar className="h-3.5 w-3.5" />
              Erstellt: {formatDate(anfrage.created_at)} · Aktualisiert: {formatDate(anfrage.updated_at)}
            </div>
          </CardContent>
        </Card>


        {/* Status-spezifische Aktionen */}
        {status === "abgelehnt" && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-red-700 text-sm">Leider kein Angebot möglich</p>
              <p className="text-xs text-red-600 mt-0.5">
                Suchen Sie weitere Anbieter in Ihrer Nähe.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {anbieter && (
                <Link href={`/anbieter/${anbieter.id}?anfrage=true`}>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                    Erneut anfragen
                  </Button>
                </Link>
              )}
              <Link href="/suche">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                  Neue Suche
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Status-Historie Timeline */}
        {(historie && historie.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[--primary]" /> Verlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HistorieTimeline
                historie={historie}
                showCreation={true}
                erstelltAt={anfrage.created_at}
              />
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        {anbieter && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[--primary]" /> Nachrichten mit {anbieter.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Chat
                anfrageId={id}
                currentUserId={user!.id}
                initialNachrichten={nachrichten ?? []}
                profileId={profile.id}
              />
            </CardContent>
          </Card>
        )}

        {/* Bewertung abgeben */}
        {(status === "bestaetigt" || status === "abgeschlossen") && anbieter && (
          <BewertungAbgeben
            anfrageId={id}
            anbieterId={anbieter.id}
            familieId={profile.id}
            anbieterName={anbieter.name}
            existingBewertung={existingBewertung}
          />
        )}
      </div>
    </div>
  );
}
