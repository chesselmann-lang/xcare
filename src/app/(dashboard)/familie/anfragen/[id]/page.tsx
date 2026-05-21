import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Building2, Phone, Globe, MapPin, Mail,
  Calendar, FileText, CheckCircle2, XCircle, Clock,
  AlertCircle, PackageCheck, Paperclip, Printer, Euro, CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { formatDate } from "@/lib/utils";
import { Chat } from "@/components/nachrichten/Chat";
import { BewertungAbgeben } from "@/components/bewertungen/BewertungAbgeben";
import { PostCompletionReviewPrompt } from "@/components/bewertungen/PostCompletionReviewPrompt";
import { HistorieTimeline } from "@/components/anfragen/HistorieTimeline";
import { FamilieAnfrageAktionen } from "@/components/anfragen/FamilieAnfrageAktionen";
import { FamilieAnfrageDokumente } from "@/components/anfragen/FamilieAnfrageDokumente";
import { AnfrageStatusStepper } from "@/components/anfragen/AnfrageStatusStepper";
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
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

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
    email: string | null;
    website: string | null;
    plz: string | null;
    ort: string | null;
    strasse: string | null;
    logo_url: string | null;
    verifiziert: boolean;
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

  // Angebot aus nachrichten extrahieren
  const angebotNachricht = nachrichten
    ?.slice()
    .reverse()
    .find((n) => n.inhalt?.startsWith("📋 **Angebot**")) ?? null;

  // Parse the offer message fields
  type AngebotData = { preis: string | null; startdatum: string | null; gueltigBis: string | null; notizen: string | null };
  let angebotData: AngebotData = { preis: null, startdatum: null, gueltigBis: null, notizen: null };
  if (angebotNachricht?.inhalt) {
    const lines = angebotNachricht.inhalt.split("\n");
    const preisLine = lines.find((l) => l.startsWith("**Preis:**"));
    const startLine = lines.find((l) => l.startsWith("**Startdatum:**"));
    const gueltigLine = lines.find((l) => l.startsWith("**Gültig bis:**"));
    const beschIdx = lines.findIndex((l) => l.startsWith("**Beschreibung:**"));
    angebotData = {
      preis: preisLine ? preisLine.replace("**Preis:**", "").trim() : null,
      startdatum: startLine ? startLine.replace("**Startdatum:**", "").trim() : null,
      gueltigBis: gueltigLine ? gueltigLine.replace("**Gültig bis:**", "").trim() : null,
      notizen: beschIdx !== -1 ? lines.slice(beschIdx + 1).join("\n").trim() || null : null,
    };
  }
  const showAngebot = (status === "angeboten" || status === "bestaetigt") && angebotNachricht;

  // Status-Historie laden
  const { data: historie } = await supabase
    .from("anfragen_historie")
    .select("id, alter_status, neuer_status, notiz, created_at")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  // Dokumente laden
  const { data: dokumente } = await supabase
    .from("anfrage_dokumente")
    .select("id, dateiname, storage_pfad, mime_typ, groesse_bytes, created_at")
    .eq("anfrage_id", id)
    .eq("familie_id", profile.id)
    .order("created_at", { ascending: false });

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
      <Breadcrumb
        items={[
          { label: "Anfragen", href: "/familie/anfragen" },
          { label: anbieter?.name ?? "Anfrage" },
        ]}
      />
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
        <Link href={`/familie/anfragen/${id}/drucken`} target="_blank" rel="noopener">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Printer className="h-3.5 w-3.5" />
            PDF
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {/* Post-Completion Review Prompt (shown once, before status banner) */}
        {status === "abgeschlossen" && anbieter && !existingBewertung && (
          <PostCompletionReviewPrompt
            anfrageId={id}
            anbieterId={anbieter.id}
            anbieterName={anbieter.name}
          />
        )}

        {/* Status-Workflow-Stepper */}
        <AnfrageStatusStepper status={status} />

        {/* Status-Banner */}
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${statusInfo.color}`}>
          <StatusIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{statusInfo.label}</p>
            <p className="text-sm mt-0.5 opacity-80">{statusInfo.description}</p>
          </div>
        </div>

        {/* Angebots-Highlight */}
        {showAngebot && (
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-600 shrink-0" />
              <p className="font-semibold text-purple-800 text-sm">Angebot vom Anbieter</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {angebotData.preis && (
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-purple-100">
                  <Euro className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Preis</p>
                    <p className="text-sm font-semibold text-purple-900 mt-0.5">{angebotData.preis}</p>
                  </div>
                </div>
              )}
              {angebotData.startdatum && (
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-purple-100">
                  <CalendarDays className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Startdatum</p>
                    <p className="text-sm font-semibold text-purple-900 mt-0.5">{angebotData.startdatum}</p>
                  </div>
                </div>
              )}
              {angebotData.gueltigBis && (
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-purple-100">
                  <Clock className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">Gültig bis</p>
                    <p className="text-sm font-semibold text-purple-900 mt-0.5">{angebotData.gueltigBis}</p>
                  </div>
                </div>
              )}
            </div>
            {angebotData.notizen && (
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide mb-1">Beschreibung</p>
                <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">{angebotData.notizen}</p>
              </div>
            )}
          </div>
        )}

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
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-[--primary-light] flex items-center justify-center">
                  {anbieter.logo_url ? (
                    <Image
                      src={anbieter.logo_url}
                      alt={`Logo ${anbieter.name}`}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[--primary] font-bold text-xl">
                      {anbieter.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-base">{anbieter.name}</p>
                    {anbieter.verifiziert && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    )}
                  </div>

                  {anbieter.beschreibung && (
                    <p className="text-sm text-[--muted-foreground] leading-relaxed line-clamp-2 mb-2">
                      {anbieter.beschreibung}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
                    {(anbieter.plz || anbieter.ort) && (
                      <p className="flex items-center gap-1.5 text-[--muted-foreground]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {anbieter.strasse ? `${anbieter.strasse}, ` : ""}{anbieter.plz} {anbieter.ort}
                      </p>
                    )}
                    {anbieter.telefon && (
                      <a
                        href={`tel:${anbieter.telefon}`}
                        className="flex items-center gap-1.5 text-[--primary] hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {anbieter.telefon}
                      </a>
                    )}
                    {anbieter.email && (
                      <a
                        href={`mailto:${anbieter.email}`}
                        className="flex items-center gap-1.5 text-[--primary] hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {anbieter.email}
                      </a>
                    )}
                    {anbieter.website && (
                      <a
                        href={anbieter.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[--primary] hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        Website besuchen
                      </a>
                    )}
                  </div>

                  <Link href={`/anbieter/${anbieter.id}`} className="inline-block mt-3">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Building2 className="h-3.5 w-3.5" />
                      Vollständiges Profil
                    </Button>
                  </Link>
                </div>
              </div>
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


        {/* Dokumente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Dokumente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[--muted-foreground] mb-3">
              Laden Sie relevante Unterlagen hoch (z.&nbsp;B. Pflegegutachten, Arztbriefe, Rezepte).
              Diese sind nur für Sie und den Anbieter sichtbar.
            </p>
            <FamilieAnfrageDokumente
              anfrageId={id}
              familieId={profile.id}
              initialDokumente={dokumente ?? []}
            />
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
                currentProfileId={profile.id}
                currentRole="familie"
                initialNachrichten={nachrichten ?? []}
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
