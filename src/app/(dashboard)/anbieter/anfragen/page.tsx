import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, MessageSquare, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
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

export default async function AnbieterAnfragenPage() {
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
    .select("id")
    .eq("profile_id", profile?.id)
    .single();

  const { data: anfragen } = await supabase
    .from("anfragen")
    .select("*, profiles!familie_id(vorname, nachname, telefon, plz, ort), leistungen(name)")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("created_at", { ascending: false });

  const offen = anfragen?.filter((a) => a.status === "offen") ?? [];
  const inBearbeitung = anfragen?.filter((a) =>
    ["in_bearbeitung", "angeboten"].includes(a.status)
  ) ?? [];
  const abgeschlossen = anfragen?.filter((a) =>
    ["bestaetigt", "abgelehnt", "abgeschlossen"].includes(a.status)
  ) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Anfragen</h1>
          <p className="text-sm text-[--muted-foreground]">
            {offen.length} offen · {inBearbeitung.length} in Bearbeitung · {abgeschlossen.length} abgeschlossen
          </p>
        </div>
        {(anfragen?.length ?? 0) > 0 && (
          <a href="/api/anbieter/export">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV Export
            </Button>
          </a>
        )}
      </div>

      {/* Offene Anfragen */}
      <Section
        titel="Neue Anfragen"
        anfragen={offen}
        emptyText="Keine neuen Anfragen"
      />

      {/* In Bearbeitung */}
      {inBearbeitung.length > 0 && (
        <Section
          titel="In Bearbeitung"
          anfragen={inBearbeitung}
        />
      )}

      {/* Abgeschlossen */}
      {abgeschlossen.length > 0 && (
        <section className="opacity-70">
          <h2 className="text-lg font-semibold mb-3 text-[--muted-foreground]">Abgeschlossen</h2>
          <div className="space-y-2">
            {abgeschlossen.map((a) => (
              <AnfrageRow key={a.id} anfrage={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type AnfrageRow = {
  id: string;
  lebenslage: string;
  status: string;
  beschreibung: string;
  created_at: string;
  profiles?: { vorname: string | null; nachname: string | null; plz: string | null } | null;
  leistungen?: { name: string } | null;
};

function Section({
  titel,
  anfragen,
  emptyText,
}: {
  titel: string;
  anfragen: AnfrageRow[];
  emptyText?: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{titel}</h2>
      {anfragen.length > 0 ? (
        <div className="space-y-3">
          {anfragen.map((a) => (
            <AnfrageRow key={a.id} anfrage={a} />
          ))}
        </div>
      ) : emptyText ? (
        <Card>
          <CardContent className="py-10 text-center text-[--muted-foreground]">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>{emptyText}</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function AnfrageRow({ anfrage: a }: { anfrage: AnfrageRow }) {
  const familie = a.profiles;
  const familienName = familie?.vorname || familie?.nachname
    ? `${familie?.vorname ?? ""} ${familie?.nachname ?? ""}`.trim()
    : "Familie";

  return (
    <Link href={`/anbieter/anfragen/${a.id}`}>
      <Card className="hover:shadow-sm transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="h-4 w-4 text-[--muted-foreground] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize truncate">
                  {a.lebenslage.replace(/_/g, " ")}
                  {a.leistungen?.name && ` · ${a.leistungen.name}`}
                </p>
                <p className="text-xs text-[--muted-foreground]">
                  {familienName}
                  {familie?.plz && ` · ${familie.plz}`}
                  {" · "}{formatRelative(a.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusVariant[a.status as AnfrageStatus] ?? "secondary"}>
                {statusLabel[a.status as AnfrageStatus] ?? a.status}
              </Badge>
              <ArrowRight className="h-4 w-4 text-[--muted-foreground]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
