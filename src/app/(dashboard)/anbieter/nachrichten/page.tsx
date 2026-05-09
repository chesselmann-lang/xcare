import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ArrowRight, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

export const metadata = {
  title: "Nachrichten | xcare Anbieter",
};

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
  angeboten: "Angebot",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

export default async function AnbieterNachrichtenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter");

  // All anfragen for this anbieter (up to 50, sorted by latest activity)
  const { data: alleAnfragen } = await supabase
    .from("anfragen")
    .select("id, lebenslage, status, updated_at, profiles!familie_id(vorname, nachname, id)")
    .eq("anbieter_id", anbieter.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const anfrageIds = (alleAnfragen ?? []).map((a) => a.id);

  type NachrichtRow = {
    id: string;
    anfrage_id: string;
    inhalt: string;
    created_at: string;
    gelesen: boolean;
    sender_id: string;
    sender: { vorname: string | null; nachname: string | null; role: string } | null;
  };

  let allNachrichten: NachrichtRow[] = [];

  if (anfrageIds.length > 0) {
    const { data: nachrichten } = await supabase
      .from("nachrichten")
      .select("id, anfrage_id, inhalt, created_at, gelesen, sender_id, sender:profiles!sender_id(vorname, nachname, role)")
      .in("anfrage_id", anfrageIds)
      .order("created_at", { ascending: false });

    allNachrichten = (nachrichten ?? []) as NachrichtRow[];
  }

  // Build per-conversation data: latest message + unread count (messages from family, not read)
  const latestMap: Record<string, NachrichtRow> = {};
  const unreadMap: Record<string, number> = {};

  for (const n of allNachrichten) {
    // Latest message
    if (!latestMap[n.anfrage_id]) {
      latestMap[n.anfrage_id] = n;
    }
    // Unread from family side
    if (!n.gelesen && n.sender_id !== profile.id) {
      unreadMap[n.anfrage_id] = (unreadMap[n.anfrage_id] ?? 0) + 1;
    }
  }

  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

  // Split: with messages / without
  const mitNachrichten = (alleAnfragen ?? [])
    .filter((a) => latestMap[a.id])
    .sort((a, b) => {
      const tA = latestMap[a.id]?.created_at ?? a.updated_at;
      const tB = latestMap[b.id]?.created_at ?? b.updated_at;
      return new Date(tB).getTime() - new Date(tA).getTime();
    });

  const ohneNachrichten = (alleAnfragen ?? [])
    .filter((a) => !latestMap[a.id] && !["abgelehnt", "abgeschlossen"].includes(a.status))
    .slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Nachrichten</h1>
          <p className="text-sm text-[--muted-foreground]">
            {mitNachrichten.length > 0
              ? `${mitNachrichten.length} Konversation${mitNachrichten.length > 1 ? "en" : ""}`
              : "Noch keine Nachrichten"}
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[--primary] text-white text-xs font-semibold">
                {totalUnread} ungelesen
              </span>
            )}
          </p>
        </div>
        <Link href="/anbieter/nachrichten/vorlagen" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Vorlagen
          </Button>
        </Link>
      </div>

      {/* Conversations with messages */}
      {mitNachrichten.length > 0 ? (
        <div className="space-y-2 mb-8">
          {mitNachrichten.map((anfrage) => {
            const familie = anfrage.profiles as { vorname: string | null; nachname: string | null; id: string } | null;
            const familieName = familie
              ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() || "Anonym"
              : "Anonym";
            const initial = familieName.charAt(0).toUpperCase();
            const nachricht = latestMap[anfrage.id];
            const unreadCount = unreadMap[anfrage.id] ?? 0;
            const hasUnread = unreadCount > 0;
            const isFromFamilie = nachricht?.sender?.role === "familie";
            const vorschau = nachricht?.inhalt ?? "";
            const status = anfrage.status as AnfrageStatus;

            return (
              <Link key={anfrage.id} href={`/anbieter/anfragen/${anfrage.id}`}>
                <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                  hasUnread
                    ? "border-[--primary]/30 bg-[--primary]/5 hover:bg-[--primary]/10"
                    : "border-[--border] hover:bg-[--muted]"
                }`}>
                  {/* Avatar */}
                  <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-base font-semibold ${
                    hasUnread
                      ? "bg-[--primary] text-white"
                      : "bg-[--primary]/10 text-[--primary]"
                  }`}>
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${hasUnread ? "font-bold" : "font-semibold"}`}>
                        {familieName}
                      </p>
                      <span className="text-xs text-[--muted-foreground] shrink-0">
                        {formatRelative(nachricht.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[--muted-foreground] capitalize mb-1">
                      {anfrage.lebenslage.replace(/_/g, " ")}
                    </p>
                    <p className={`text-sm truncate ${hasUnread ? "text-[--foreground] font-medium" : isFromFamilie ? "text-[--foreground]" : "text-[--muted-foreground]"}`}>
                      {!isFromFamilie && "Sie: "}
                      {vorschau.length > 80 ? vorschau.substring(0, 80) + "…" : vorschau}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {hasUnread ? (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-[--primary] text-white text-xs font-bold">
                        {unreadCount}
                      </span>
                    ) : (
                      <Badge variant={statusVariant[status] ?? "secondary"} className="text-xs">
                        {statusLabel[status] ?? status}
                      </Badge>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground]" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-12 text-center text-[--muted-foreground]">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium mb-1">Noch keine Nachrichten</p>
            <p className="text-sm">Nachrichten erscheinen hier, wenn Familien Ihnen schreiben.</p>
          </CardContent>
        </Card>
      )}

      {/* Anfragen without messages */}
      {ohneNachrichten.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-[--muted-foreground]">
              <Clock className="h-4 w-4" /> Offene Anfragen ohne Nachricht
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ohneNachrichten.map((anfrage) => {
              const familie = anfrage.profiles as { vorname: string | null; nachname: string | null } | null;
              const familieName = familie
                ? `${familie.vorname ?? ""} ${familie.nachname ?? ""}`.trim() || "Anonym"
                : "Anonym";
              const status = anfrage.status as AnfrageStatus;

              return (
                <Link key={anfrage.id} href={`/anbieter/anfragen/${anfrage.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-[--border] hover:bg-[--muted] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-[--muted] text-[--muted-foreground] flex items-center justify-center text-xs font-semibold">
                        {familieName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{familieName}</p>
                        <p className="text-xs text-[--muted-foreground] capitalize">
                          {anfrage.lebenslage.replace(/_/g, " ")} · {formatRelative(anfrage.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[status] ?? "secondary"} className="text-xs">
                        {statusLabel[status] ?? status}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground]" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
