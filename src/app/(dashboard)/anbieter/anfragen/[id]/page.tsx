import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Phone, Calendar, FileText, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import AnfrageAktionen from "./anfrage-aktionen";
import { AnfrageNotizen } from "./anfrage-notizen";
import { AngebotEditor } from "./angebot-editor";
import { Chat } from "@/components/nachrichten/Chat";
import { HistorieTimeline } from "@/components/anfragen/HistorieTimeline";
import type { AnfrageStatus } from "@/lib/types";

const statusVariant: Record<AnfrageStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  offen: "warning",
  in_bearbeitung: "default",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot gemacht",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
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

export default async function AnfrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (profile?.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile?.id)
    .single();

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("*, profiles!familie_id(*), leistungen(*)")
    .eq("id", id)
    .eq("anbieter_id", anbieter?.id ?? "")
    .single();

  if (!anfrage) notFound();

  // Nachrichten laden
  const { data: nachrichten } = await supabase
    .from("nachrichten")
    .select("*, sender:profiles!sender_id(vorname, nachname, role)")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  // Interne Notizen laden
  const { data: notizen } = await supabase
    .from("anfrage_notizen")
    .select("*")
    .eq("anfrage_id", id)
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("created_at", { ascending: false });

  // Status-Historie laden
  const { data: historie } = await supabase
    .from("anfragen_historie")
    .select("id, alter_status, neuer_status, notiz, created_at")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  const familie = anfrage.profiles as {
    vorname: string | null;
    nachname: string | null;
    email: string;
    telefon: string | null;
    plz: string | null;
    ort: string | null;
  } | null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter/anfragen">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold capitalize">
              {lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage.replace(/_/g, " ")}
            </h1>
            <Badge variant={statusVariant[anfrage.status as AnfrageStatus] ?? "secondary"}>
              {statusLabel[anfrage.status as AnfrageStatus] ?? anfrage.status}
            </Badge>
          </div>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Anfrage vom {formatDate(anfrage.created_at)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Familie-Daten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Anfragende Familie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {familie && (
              <>
                <p className="font-medium">
                  {familie.vorname} {familie.nachname}
                </p>
                <div className="space-y-1 text-sm text-[--muted-foreground]">
                  {(familie.plz || familie.ort) && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {familie.plz} {familie.ort}
                    </p>
                  )}
                  {familie.telefon && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${familie.telefon}`} className="hover:underline">
                        {familie.telefon}
                      </a>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <a href={`mailto:${familie.email}`} className="hover:underline">
                      {familie.email}
                    </a>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Anfrage-Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Anfrage-Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {anfrage.leistungen && (
              <div>
                <p className="text-sm font-medium text-[--muted-foreground] mb-0.5">Gewünschte Leistung</p>
                <p>{(anfrage.leistungen as { name: string }).name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[--muted-foreground] mb-0.5">Beschreibung</p>
              <p className="text-sm leading-relaxed">{anfrage.beschreibung}</p>
            </div>
            {anfrage.ki_empfehlung && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1">KI-Empfehlung</p>
                <p className="text-sm text-blue-800">{anfrage.ki_empfehlung}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
              <Calendar className="h-3.5 w-3.5" />
              Erstellt: {formatDate(anfrage.created_at)} · Aktualisiert: {formatDate(anfrage.updated_at)}
            </div>
          </CardContent>
        </Card>

        {/* Status-Aktionen */}
        <AnfrageAktionen
          anfrageId={anfrage.id}
          currentStatus={anfrage.status as AnfrageStatus}
          familieEmail={familie?.email}
          familieName={familie ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() : undefined}
          anbieterName={anbieter?.name ?? undefined}
          lebenslage={anfrage.lebenslage}
        />

        {/* Angebot-Editor — structured offer with price, dates, description */}
        {profile && (
          <AngebotEditor
            anfrageId={anfrage.id}
            profileId={profile.id}
            currentStatus=