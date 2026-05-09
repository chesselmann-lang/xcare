import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Archive, Clock, FileText, MessageCircle, Package2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatDate } from "@/lib/utils";
import { AnfragenFilter } from "@/components/anfragen/AnfragenFilter";
import { FamilieAnfragenVergleich } from "@/components/anfragen/FamilieAnfragenVergleich";
import type { AnfrageStatus } from "@/lib/types";
import type { AnfrageCompareItem } from "@/components/anfragen/FamilieAnfragenVergleich";

const AKTIV_STATUS = ["offen", "in_bearbeitung", "angeboten", "bestaetigt"] as const;
const ARCHIV_STATUS = ["abgelehnt", "abgeschlossen"] as const;

const statusVariant: Record<AnfrageStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  offen: "secondary",
  in_bearbeitung: "warning",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "✨ Angebot erhalten",
  bestaetigt: "Bestätigt ✓",
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
  anbieter?: { id: string; name: string; ort: string | null; telefon: string | null } | null;
  leistungen?: { name: string } | null;
  _unreadCount?: number;
};

export default async function FamilieAnfragenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; archiv?: string }>;
}) {
  const { status: filterStatus, sort = "updated_desc", archiv } = await searchParams;
  const isArchiv = archiv === "true";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter");

  const { data: anfragen } = await supabase
    .from("anfragen")
    .select("*, anbieter(id, name, ort, telefon), leistungen(name)")
    .eq("familie_id", profile?.id)
    .order("updated_at", { ascending: false });

  // Get unread message counts per anfrage
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
    anbieter: a.anbieter as AnfrageRow["anbieter"],
    leistungen: a.leistungen as AnfrageRow["leistungen"],
    _unreadCount: unreadMap[a.id] ?? 0,
  }));

  // Comparison data — flattened for client component
  const compareItems: AnfrageCompareItem[] = enriched.map((a) => ({
    id: a.id,
    status: a.status as AnfrageStatus,
    lebenslage: a.lebenslage,
    beschreibung: a.beschreibung,
    created_at: a.created_at,
    updated_at: a.updated_at,
    anbieterName: a.anbieter?.name,
    anbieterOrt: a.anbieter?.ort ?? undefined,
    leistungName: a.leistungen?.name,
    unreadCount: a._unreadCount ?? 0,
  }));

  // Split into aktiv / archiv pools
  const aktivPool = enriched.filter((a) => (AKTIV_STATUS as readonly string[]).includes(a.status));
  const archivPool = enriched.filter((a) => (ARCHIV_STATUS as readonly string[]).includes(a.status));

  // Apply status filter within the current pool
  const pool = isArchiv ? archivPool : aktivPool;
  const filtered = filterStatus ? pool.filter((a) => a.status === filterStatus) : pool;

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "created_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === "created_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const AnfrageCard = ({ a }: { a: AnfrageRow }) => (
    <Link href={`/familie/anfragen/${a.id}`} className="block group">
      <Card className="hover:shadow-md transition-all border-[--border] group-hover:border-[--primary]/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <FileText className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                <p className="font-semibold capitalize">
                  {a.lebenslage.replace(/_/g, " ")}
                </p>
                <Badge variant={statusVariant[a.status as AnfrageStatus] ?? "secondary"} className="text-xs">
                  {statusLabel[a.status as AnfrageStatus] ?? a.status}
                </Badge>
                {(a._unreadCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 bg-[--primary] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    <MessageCircle className="h-3 w-3" />
                    {a._unreadCount} neu
                  </span>
                )}
              </div>

              {/* Leistung + Anbieter */}
              {a.leistungen && (
                <p className="text-sm text-[--muted-foreground] mb-0.5 flex items-center gap-1.5">
                  <Package2 className="h-3.5 w-3.5" />
                  {a.leistungen.name}
                </p>
              )}
              {a.anbieter && (
                <p className="text-sm text-[--muted-foreground]">
                  <span className="font-medium text-[--foreground]">{a.anbieter.name}</span>
                  {a.anbieter.ort && <span className="text-xs"> · {a.anbieter.ort}</span>}
                </p>
              )}

              {/* Timestamps */}
              <p className="text-xs text-[--muted-foreground] mt-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Gesendet {formatRelative(a.created_at)}
                <span className="opacity-50">·</span>
                Aktualisiert {formatDate(a.updated_at)}
              </p>

              {/* Preview */}
              {a.beschreibung && (
                <p className="text-sm text-[--muted-foreground] mt-2.5 pt-2.5 border-t border-[--border] line-clamp-2 leading-relaxed">
                  {a.beschreibung}
                </p>
              )}
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-[--muted-foreground] shrink-0 mt-1 group-hover:text-[--primary] transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/familie">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Meine Anfragen</h1>
            <p className="text-sm text-[--muted-foreground]">
              {aktivPool.length} aktiv · {archivPool.length} im Archiv
              {totalUnread > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[--primary] text-white text-xs font-semibold">
                  {totalUnread} neu
                </span>
              )}
            </p>
          </div>
        </div>
        <Link href="/suche">
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Neue Anfrage
          </Button>
        </Link>
      </div>

      {/* Tabs: Aktiv / Archiv */}
      <div className="flex gap-1 mb-6 border-b border-[--border]">
        <Link
          href="/familie/anfragen"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            !isArchiv
              ? "border-[--primary] text-[--primary]"
              : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
          }`}
        >
          <FileText className="h-4 w-4" />
          Aktive Anfragen
          {aktivPool.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              !isArchiv ? "bg-[--primary] text-white" : "bg-[--muted] text-[--muted-foreground]"
            }`}>
              {aktivPool.length}
            </span>
          )}
        </Link>
        <Link
          href="/familie/anfragen?archiv=true"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            isArchiv
              ? "border-[--primary] text-[--primary]"
              : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
          }`}
        >
          <Archive className="h-4 w-4" />
          Archiv
          {archivPool.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              isArchiv ? "bg-[--primary] text-white" : "bg-[--muted] text-[--muted-foreground]"
            }`}>
              {archivPool.length}
            </span>
          )}
        </Link>
      </div>

      {/* Filter bar (only for active tab with status filter) */}
      {!isArchiv && (
        <Suspense>
          <AnfragenFilter totalCount={sorted.length} />
        </Suspense>
      )}

      {/* Vergleichs-Modus (only in active tab) */}
      {!isArchiv && aktivPool.length >= 2 && (
        <FamilieAnfragenVergleich anfragen={compareItems.filter((c) =>
          (AKTIV_STATUS as readonly string[]).includes(c.status)
        )} />
      )}

      {/* List */}
      <section>
        {sorted.length > 0 ? (
          <div className={`space-y-3 ${isArchiv ? "opacity-80" : ""}`}>
            {sorted.map((a) => <AnfrageCard key={a.id} a={a} />)}
          </div>
        ) : (
          <Card>
            <CardContent className="py-14 text-center text-[--muted-foreground]">
              {isArchiv ? (
                <>
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium mb-1">Archiv ist leer</p>
                  <p className="text-sm">Abgeschlossene und abgelehnte Anfragen erscheinen hier.</p>
                </>
              ) : (
                <>
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium mb-3">
                    {filterStatus ? "Keine Anfragen mit diesem Status" : "Keine aktiven Anfragen"}
                  </p>
                  {!filterStatus && (
                    <Link href="/lotse">
                      <Button size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" /> KI-Lotsen starten
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
