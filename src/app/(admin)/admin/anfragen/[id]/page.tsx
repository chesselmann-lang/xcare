import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, PackageCheck,
  MapPin, Phone, Globe, Mail, User, Building2, Calendar, FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { AdminAnfrageStatusAktion } from "@/components/admin/AdminAnfrageStatusAktion";
import type { AnfrageStatus } from "@/lib/types";

const STATUS_CONFIG: Record<AnfrageStatus, { label: string; color: string; icon: React.ElementType }> = {
  offen:          { label: "Offen",         color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  in_bearbeitung: { label: "In Bearbeitung", color: "bg-blue-100 text-blue-700 border-blue-200",    icon: AlertCircle },
  angeboten:      { label: "Angeboten",      color: "bg-purple-100 text-purple-700 border-purple-200", icon: PackageCheck },
  bestaetigt:     { label: "Bestätigt",      color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  abgelehnt:      { label: "Abgelehnt",      color: "bg-red-100 text-red-700 border-red-200",      icon: XCircle },
  abgeschlossen:  { label: "Abgeschlossen",  color: "bg-gray-100 text-gray-600 border-gray-200",    icon: CheckCircle2 },
};

const LEBENSLAGE_LABELS: Record<string, string> = {
  geburt_fruehe_kindheit:    "Geburt & frühe Kindheit",
  schulkind_jugend:          "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung & Behinderung",
  erwerbsleben_vereinbarkeit:"Erwerbsleben & Vereinbarkeit",
  krankheit_genesung:        "Krankheit & Genesung",
  alter_pflege:              "Alter & Pflege",
  hospiz_palliativ:          "Hospiz & Palliativ",
  trauer_nachlass:           "Trauer & Nachlass",
};

export default async function AdminAnfrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (caller?.role !== "admin") redirect("/");

  // Get caller profile id for status history
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select(`
      *,
      familie:profiles!familie_id(id, vorname, nachname, email, telefon),
      anbieter(id, name, ort, plz, telefon, website, email)
    `)
    .eq("id", id)
    .single();

  if (!anfrage) notFound();

  // Fetch status history / audit log
  const { data: verlauf } = await supabase
    .from("anfragen_statusverlauf")
    .select("*")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: false });

  const cfg = STATUS_CONFIG[anfrage.status as AnfrageStatus] ?? STATUS_CONFIG.offen;
  const StatusIcon = cfg.icon;
  const familie = anfrage.familie as { id?: string; vorname?: string | null; nachname?: string | null; email?: string; telefon?: string | null } | null;
  const anbieter = anfrage.anbieter as { id?: string; name?: string; ort?: string | null; plz?: string | null; telefon?: string | null; website?: string | null; email?: string | null } | null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/anfragen"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Anfragen-Übersicht
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anfrage-Detail</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{anfrage.id}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${cfg.color}`}>
            <StatusIcon className="h-4 w-4" />
            {cfg.label}
          </span>
          {callerProfile && (
            <AdminAnfrageStatusAktion
              anfrageId={anfrage.id}
              currentStatus={anfrage.status as AnfrageStatus}
              adminProfileId={callerProfile.id}
            />
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Familie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" /> Familie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {familie ? (
              <>
                <p className="font-medium">
                  {[familie.vorname, familie.nachname].filter(Boolean).join(" ") || "—"}
                </p>
                {familie.email && (
                  <a href={`mailto:${familie.email}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {familie.email}
                  </a>
                )}
                {familie.telefon && (
                  <a href={`tel:${familie.telefon}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {familie.telefon}
                  </a>
                )}
                {familie.id && (
                  <Link href={`/admin/nutzer/${familie.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                    Nutzerprofil anzeigen →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-gray-400">Nicht verfügbar</p>
            )}
          </CardContent>
        </Card>

        {/* Anbieter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Anbieter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {anbieter ? (
              <>
                <p className="font-medium">{anbieter.name ?? "—"}</p>
                {(anbieter.plz || anbieter.ort) && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {anbieter.plz} {anbieter.ort}
                  </span>
                )}
                {anbieter.telefon && (
                  <a href={`tel:${anbieter.telefon}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {anbieter.telefon}
                  </a>
                )}
                {anbieter.website && (
                  <a href={anbieter.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    Website
                  </a>
                )}
                {anbieter.id && (
                  <Link href={`/anbieter/${anbieter.id}`} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1" target="_blank">
                    Öffentliches Profil →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-gray-400">Kein Anbieter zugeordnet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anfrage-Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" /> Anfrage-Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Lebenslage</p>
              <p className="font-medium">
                {LEBENSLAGE_LABELS[anfrage.lebenslage] ?? anfrage.lebenslage?.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Erstellt am</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                {formatDate(anfrage.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Zuletzt aktualisiert</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                {formatDate(anfrage.updated_at)}
              </p>
            </div>
          </div>

          {anfrage.beschreibung && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Beschreibung</p>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {anfrage.beschreibung}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status-Verlauf */}
      {verlauf && verlauf.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" /> Statusverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verlauf.map((v) => {
                const vcfg = STATUS_CONFIG[v.neuer_status as AnfrageStatus];
                const VIcon = vcfg?.icon ?? Clock;
                return (
                  <div key={v.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${vcfg?.color ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      <VIcon className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {vcfg?.label ?? v.neuer_status}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(v.created_at)}</p>
                      {v.kommentar && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{v.kommentar}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
