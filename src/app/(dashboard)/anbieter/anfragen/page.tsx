import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, MessageSquare, Download, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { AnfragenFilter } from "@/components/anfragen/AnfragenFilter";
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

type AnfrageRow = {
  id: string;
  lebenslage: string;
  status: string;
  beschreibung: string;
  created_at: string;
  updated_at: string;
  profiles?: { vorname: string | null; nachname: string | null; plz: string | null } | null;
  leistungen?: { name: string } | null;
  _unreadCount?: number;
};

export default async function AnbieterAnfragenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const { status: filterStatus, sort = "updated_desc" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    .order("updated_at", { ascending: false });

  // Unread message counts (messages from families, not yet read)
  const anfrageIds = anfragen?.map((a) => a.id) ?? [];
  let unreadMap: Record<string, number> = {};

  if (anfrageIds.length > 0) {
    const { data: unread } = await supabase
      .from("nachrichten")
      .select("anfrage_id")
      .in("anfrage_id", anfrageIds)
      .eq("gelesen", false)
      .neq("sender_id", profile?.id ?? "");

    if (unread) {
      unreadMap = unread.reduce<Record<string, number>>((acc, n) => {
        acc[n.anfrage_id] = (acc[n.anfrage_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  const enriched: AnfrageRow[] = (anfragen ?? []).map((a) => ({
    ...a,
    profiles: a.profiles as AnfrageRow["profiles"],
    leistungen: a.leistungen as AnfrageRow["leistungen"],
    _unreadCount: unreadMap[a.id] ?? 0,
  }));

  // Apply filter
  const filtered = filterStatus
    ? enriched.filter((a) => a.status === filterStatus)
    : enriched;

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "created_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "created_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const showSections = !filterStatus;

  const offen = sorted.filter((a) => a.status === "offen");
  const inBearbeitung = sorted.filter((a) =>
    ["in_bearbeitung", "angeboten"].includes(a.status)
  );
  const abgeschlossen = sorted.filter((a) =>
    ["bestaetigt", "abgelehnt", "abgeschlossen"].includes(a.status)
  );

  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/anbieter">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Anfragen</h1>
          <p className="text-sm text-[--muted-foreground]">
            {enriched.length} gesamt · {offen.length} offen
            {totalUnread > 0 && ` · ${totalUnread} ungelesen`}
          </p>
        </div>
        {(enriched.length > 0) && (
          <a href="/api/anbieter/export">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="h-3.5 w-3.5" />
              CSV Export
            </Button>
          </a>
        )}
      </div>

      {/* Filter bar */}
      <Suspense>
        <AnfragenFilter totalCount={sorted.length} />
      </Suspense>

      {showSections ? (
        <>
          {/* Neue / offene Anfragen */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Neue Anfragen ({offen.length})</h2>
            {offen.length > 0 ? (
              <div className="space-y-3">
                {offen.map((a) => <AnfrageCard key={a.id} anfrage={a} />)}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-[--muted-foreground]">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>Keine neuen Anfragen</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* In Bearbeitung */}
          {inBearbeitung.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">In Bearbeitung ({inBearbeitung.length})</h2>
              <div className="space-y-3">
                {inBearbeitung.map((a) => <AnfrageCard key={a.id} anfrage={a} />)}
              </div>
            </section>
          )}

          {/* Abgeschlossen */}
          {abgeschlossen.length > 0 && (
            <section className="opacity-70">
              <h2 className="text-lg font-semibold mb-3 text-[--muted-foreground]">
                Abgeschlossen ({abgeschlossen.length})
              </h2>
              <div className="space-y-3">
                {abgeschlossen.map((a) => <AnfrageCard key={a.id} anfrage={a} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Flat filtered view */
        <section>
          {sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((a) => <AnfrageCard key={a.id} anfrage={a} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-[--muted-foreground]">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Keine Anfragen mit diesem Status</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function AnfrageCard({ anfrage: a }: { anfrage: AnfrageRow }) {
  const familie = a.profiles;
  const familienName = familie?.vorname || familie?.nachname
    ? `${familie?.vorname ?? ""} ${familie?.nachname ?? ""}`.trim()
    : "Familie";

  return (
    <Link href={`/anbieter/anfragen/${a.id}`} className="block group">
      <Card className="hover:shadow-sm transition-all cursor-pointer group-hover:border-[--primary]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="h-4 w-4 text-[--muted-foreground] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium capitalize truncate">
                    {a.lebenslage.replace(/_/g, " ")}
                    {a.leistungen?.name && ` · ${a.leistungen.name}`}
                  </p>
                  {(a._unreadCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1 bg-[--primary] text-white text-xs px-2 py-0.5 rounded-full font-semibold shrink-0">
                      <MessageCircle className="h-3 w-3" />
                      {a._unreadCount}
                    </span>
                  )}
                </div>
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
              <ArrowRight className="h-4 w-4 text-[--muted-foreground] group-hover:text-[--primary] transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
