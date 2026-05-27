import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Plus,
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "MDK-Widerspruch | xcare Familie",
  description:
    "KI-gestützter Widerspruchsgenerator für abgelehnte Pflegeleistungen.",
};

// ─── Status-Konfiguration ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  entwurf: "Entwurf",
  generiert: "Brief generiert",
  eingereicht: "Eingereicht",
  bearbeitung: "In Bearbeitung",
  gewonnen: "Gewonnen",
  abgelehnt: "Abgelehnt",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  entwurf: "secondary",
  generiert: "outline",
  eingereicht: "default",
  bearbeitung: "warning",
  gewonnen: "success",
  abgelehnt: "destructive",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  entwurf: FileText,
  generiert: FileText,
  eingereicht: Send,
  bearbeitung: Clock,
  gewonnen: CheckCircle2,
  abgelehnt: XCircle,
};

const BEZUG_LABEL: Record<string, string> = {
  pflegegrad: "Pflegegrad",
  leistung: "Leistungsbescheid",
  antrag: "Antrag",
  bescheid: "Bescheid",
};

// ─── Frist-Berechnung ────────────────────────────────────────────────────────

function tageBisFrist(fristDatum: string | null): number | null {
  if (!fristDatum) return null;
  const diff =
    new Date(fristDatum).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Widerspruch = {
  id: string;
  bezug_typ: string;
  bescheid_datum: string | null;
  bescheid_aktenzeichen: string | null;
  pflegekasse_name: string | null;
  status: string;
  frist_datum: string | null;
  eingereicht_am: string | null;
  created_at: string;
};

export default async function WiderspruchPage() {
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

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  const { data: widersprueche } = await supabase
    .from("widersprueche")
    .select(
      "id, bezug_typ, bescheid_datum, bescheid_aktenzeichen, pflegekasse_name, status, frist_datum, eingereicht_am, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const liste = (widersprueche ?? []) as Widerspruch[];

  const offen = liste.filter((w) =>
    ["entwurf", "generiert", "eingereicht", "bearbeitung"].includes(w.status)
  ).length;
  const gewonnen = liste.filter((w) => w.status === "gewonnen").length;

  // Dringlichkeits-Widersprüche: Frist < 7 Tage
  const dringend = liste.filter((w) => {
    const tage = tageBisFrist(w.frist_datum);
    return (
      tage !== null && tage <= 7 && tage >= 0 && w.status !== "eingereicht"
    );
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <Scale className="h-6 w-6 text-[--primary]" />
            MDK-Widerspruch
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            KI-gestützter Widerspruchsgenerator für abgelehnte
            Pflegeleistungen — rechtlich fundiert, in Minuten fertig.
          </p>
        </div>
        <Button asChild>
          <Link href="/familie/widerspruch/neu">
            <Plus className="h-4 w-4" />
            Neuer Widerspruch
          </Link>
        </Button>
      </div>

      {/* Dringlichkeits-Warnung */}
      {dringend.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">
                {dringend.length}{" "}
                {dringend.length === 1 ? "Widerspruch läuft" : "Widersprüche laufen"} bald ab!
              </p>
              <p className="text-sm text-[--muted-foreground] mt-1">
                Bitte reichen Sie diese Widersprüche vor Ablauf der Frist ein,
                da sonst der Rechtsbehelf verfristet ist.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {liste.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-[--muted] p-2">
                <Scale className="h-4 w-4 text-[--muted-foreground]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liste.length}</p>
                <p className="text-xs text-[--muted-foreground]">Gesamt</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offen}</p>
                <p className="text-xs text-[--muted-foreground]">Offen</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-green-50 p-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gewonnen}</p>
                <p className="text-xs text-[--muted-foreground]">Gewonnen</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste */}
      {liste.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Noch kein Widerspruch erstellt"
          description="Wurde ein Antrag auf Pflegeleistungen abgelehnt? Unser KI-Assistent erstellt in wenigen Minuten einen rechtlich fundierten Widerspruchsbrief nach SGB XI."
          action={{
            label: "Ersten Widerspruch erstellen",
            href: "/familie/widerspruch/neu",
          }}
        />
      ) : (
        <div className="space-y-3">
          {liste.map((w) => {
            const tage = tageBisFrist(w.frist_datum);
            const istDringend = tage !== null && tage <= 7 && tage >= 0;
            const istAbgelaufen = tage !== null && tage < 0;
            const StatusIcon = STATUS_ICON[w.status] ?? FileText;

            return (
              <Link key={w.id} href={`/familie/widerspruch/${w.id}`}>
                <Card
                  className={`hover:border-[--primary]/40 transition-colors cursor-pointer ${
                    istDringend ? "border-destructive/50" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusIcon className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                          <span className="font-semibold text-[--foreground]">
                            Widerspruch: {BEZUG_LABEL[w.bezug_typ] ?? w.bezug_typ}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[--muted-foreground]">
                          {w.pflegekasse_name && (
                            <span>{w.pflegekasse_name}</span>
                          )}
                          {w.bescheid_aktenzeichen && (
                            <span>AZ: {w.bescheid_aktenzeichen}</span>
                          )}
                          {w.bescheid_datum && (
                            <span>
                              Bescheid:{" "}
                              {new Date(w.bescheid_datum).toLocaleDateString("de-DE")}
                            </span>
                          )}
                        </div>

                        {/* Frist-Anzeige */}
                        {w.frist_datum && (
                          <div
                            className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                              istAbgelaufen
                                ? "text-[--muted-foreground]"
                                : istDringend
                                ? "text-destructive"
                                : "text-[--muted-foreground]"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {istAbgelaufen ? (
                              <span>
                                Frist abgelaufen (
                                {new Date(w.frist_datum).toLocaleDateString("de-DE")})
                              </span>
                            ) : (
                              <span>
                                Frist:{" "}
                                {new Date(w.frist_datum).toLocaleDateString("de-DE")}
                                {tage !== null && (
                                  <span className={istDringend ? " font-bold" : ""}>
                                    {" "}
                                    (noch {tage} {tage === 1 ? "Tag" : "Tage"})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={STATUS_VARIANT[w.status] ?? "secondary"}>
                          {STATUS_LABEL[w.status] ?? w.status}
                        </Badge>
                        {istDringend && (
                          <Badge variant="destructive" className="text-xs">
                            Dringend!
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* KI-Hinweis */}
      <Card className="border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-[--muted-foreground]">
            Die generierten Widerspruchsbriefe sind KI-Entwürfe und ersetzen
            keine Rechtsberatung. Lassen Sie wichtige Widersprüche vor der
            Einreichung von einem Fachanwalt für Sozialrecht prüfen. Der
            VdK-Sozialverband und der Paritätische Wohlfahrtsverband bieten
            kostenlose Rechtsberatung an.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
