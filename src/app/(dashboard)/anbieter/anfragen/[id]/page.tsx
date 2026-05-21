import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Phone, Calendar, FileText, Receipt, BellRing, Paperclip, Euro, CalendarDays, PackageCheck, Clock } from "lucide-react";
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
import { WiedervorlageManager } from "@/components/anfragen/WiedervorlageManager";
import { AnfragePrioritaetToggle } from "@/components/anfragen/AnfragePrioritaetToggle";
import { AnbieterAnfrageDokumente } from "@/components/anfragen/AnbieterAnfrageDokumente";
import { AnfrageQuickNotiz } from "@/components/anfragen/AnfrageQuickNotiz";
import { LeistungSchnellErstellen } from "@/components/anbieter/LeistungSchnellErstellen";
import { AnfrageCheckliste } from "./anfrage-checkliste";
import type { AnfrageStatus } from "@/lib/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";

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
    .select("id, role")
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
    .select("id, familie_id, anbieter_id, leistung_id, lebenslage, beschreibung, status, ki_empfehlung, wichtig, created_at, updated_at, profiles!familie_id(id, vorname, nachname, email, telefon, plz), leistungen(id, name, kategorie)")
    .eq("id", id)
    .eq("anbieter_id", anbieter?.id ?? "")
    .single();

  if (!anfrage) notFound();

  // Weitere Anfragen dieser Familie an diesen Anbieter
  const { count: weitereAnfragenCount } = await supabase
    .from("anfragen")
    .select("*", { count: "exact", head: true })
    .eq("anbieter_id", anbieter?.id ?? "")
    .eq("familie_id", anfrage.familie_id)
    .neq("id", id);

  // Nachrichten laden
  const { data: nachrichten } = await supabase
    .from("nachrichten")
    .select("*, sender:profiles!sender_id(vorname, nachname, role)")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: true });

  // Gesendetes Angebot aus Nachrichten extrahieren
  const angebotNachricht = nachrichten
    ?.slice()
    .reverse()
    .find((n) => n.inhalt?.startsWith("📋 **Angebot**")) ?? null;

  type AngebotData = { preis: string | null; startdatum: string | null; gueltigBis: string | null; notizen: string | null; gesendetAm: string | null };
  let angebotData: AngebotData = { preis: null, startdatum: null, gueltigBis: null, notizen: null, gesendetAm: null };
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
      gesendetAm: angebotNachricht.created_at ?? null,
    };
  }
  const showAngebot = (anfrage.status === "angeboten" || anfrage.status === "bestaetigt") && angebotNachricht;

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

  // Wiedervorlagen laden
  const { data: wiedervorlagen } = await supabase
    .from("wiedervorlagen")
    .select("id, faellig_am, notiz, erledigt")
    .eq("anfrage_id", id)
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("faellig_am", { ascending: true });

  // Dokumente der Familie laden (Anbieter darf lesen per RLS)
  const { data: dokumente } = await supabase
    .from("anfrage_dokumente")
    .select("id, dateiname, storage_pfad, mime_typ, groesse_bytes, created_at")
    .eq("anfrage_id", id)
    .order("created_at", { ascending: false });

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
      <Breadcrumb
        items={[
          { label: "Anfragen", href: "/anbieter/anfragen" },
          { label: lebenslageLabel[anfrage.lebenslage] ?? anfrage.lebenslage.replace(/_/g, " ") },
        ]}
      />
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
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-[--muted-foreground]">
              Anfrage vom {formatDate(anfrage.created_at)}
            </p>
            {(weitereAnfragenCount ?? 0) > 0 && (
              <Link
                href={`/anbieter/anfragen?familie=${anfrage.familie_id}`}
                className="text-xs text-[--primary] hover:underline"
              >
                +{weitereAnfragenCount} weitere Anfrage{weitereAnfragenCount !== 1 ? "n" : ""} dieser Familie
              </Link>
            )}
          </div>
        </div>
        <AnfragePrioritaetToggle anfrageId={anfrage.id} />
      </div>

      <div className="space-y-4">
        {/* Quick-Notiz */}
        {anbieter && (
          <AnfrageQuickNotiz
            anfrageId={anfrage.id}
            anbieterId={anbieter.id}
            initialText={notizen?.[0]?.inhalt ?? ""}
          />
        )}

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

        {/* Dokumente der Familie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Dokumente der Familie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[--muted-foreground] mb-3">
              Von der Familie hochgeladene Unterlagen (z.&nbsp;B. Pflegegutachten, Arztbriefe, Rezepte).
            </p>
            <AnbieterAnfrageDokumente dokumente={dokumente ?? []} />
          </CardContent>
        </Card>

        {/* Leistung schnell erstellen */}
        {anbieter && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[--muted-foreground]">Passende Leistung noch nicht angelegt?</p>
            <LeistungSchnellErstellen anbieterId={anbieter.id} />
          </div>
        )}

        {/* Status-Aktionen */}
        <AnfrageAktionen
          anfrageId={anfrage.id}
          currentStatus={anfrage.status as AnfrageStatus}
          familieName={familie ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() : undefined}
        />

        {/* Angebot-Editor — structured offer with price, dates, description */}
        {profile && (
          <AngebotEditor
            anfrageId={anfrage.id}
            profileId={profile.id}
            currentStatus={anfrage.status as AnfrageStatus}
          />
        )}

        {/* Gesendetes Angebot – Zusammenfassung */}
        {showAngebot && (
          <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-purple-600 shrink-0" />
                <p className="font-semibold text-purple-800 text-sm">Gesendetes Angebot</p>
              </div>
              {angebotData.gesendetAm && (
                <p className="text-[10px] text-purple-400">{formatDate(angebotData.gesendetAm)}</p>
              )}
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
            {anfrage.status === "bestaetigt" && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                <PackageCheck className="h-3.5 w-3.5" /> Angebot wurde von der Familie angenommen
              </div>
            )}
          </div>
        )}

        {/* Interne Notizen (CRM) */}
        {anbieter && (
          <AnfrageNotizen
            anfrageId={anfrage.id}
            anbieterId={anbieter.id}
            initialNotizen={notizen ?? []}
          />
        )}

        {/* Wiedervorlagen */}
        {anbieter && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BellRing className="h-4 w-4 text-amber-500" /> Wiedervorlagen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WiedervorlageManager
                anfrageId={anfrage.id}
                anbieterId={anbieter.id}
                initial={wiedervorlagen ?? []}
              />
            </CardContent>
          </Card>
        )}

        {/* Aufgaben-Checkliste — S328 */}
        {anbieter && (
          <AnfrageCheckliste
            anfrageId={anfrage.id}
            anbieterId={anbieter.id}
            lebenslage={anfrage.lebenslage}
          />
        )}

        {/* Status-Historie */}
        {((historie && historie.length > 0) || anfrage.created_at) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Verlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HistorieTimeline
                historie={historie ?? []}
                showCreation
                erstelltAt={anfrage.created_at}
              />
            </CardContent>
          </Card>
        )}

        {/* Rechnung */}
        <div className="flex justify-end">
          <Link href={`/anbieter/anfragen/${anfrage.id}/rechnung`}>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Receipt className="h-3.5 w-3.5" />
              Rechnung erstellen
            </Button>
          </Link>
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-base font-semibold mb-3">Direktnachrichten mit der Familie</h2>
          <Chat
            anfrageId={anfrage.id}
            currentProfileId={profile?.id ?? ""}
            currentRole="anbieter"
            initialNachrichten={nachrichten ?? []}
          />
        </div>
      </div>
    </div>
  );
}
