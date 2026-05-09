import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BellRing, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WiedervorlageRow = {
  id: string;
  faellig_am: string;
  notiz: string | null;
  anfrage_id: string;
  anfragen: { lebenslage: string } | null;
  anbieter: { id: string; name: string } | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminWiedervorlagenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: raw } = await supabase
    .from("wiedervorlagen")
    .select(`
      id, faellig_am, notiz, anfrage_id,
      anfragen!inner(lebenslage),
      anbieter(id, name)
    `)
    .eq("erledigt", false)
    .order("faellig_am", { ascending: true });

  const items = (raw ?? []) as unknown as WiedervorlageRow[];

  const overdue = items.filter((w) => w.faellig_am < todayStr);
  const today = items.filter((w) => w.faellig_am === todayStr);
  const upcoming = items.filter((w) => w.faellig_am > todayStr);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BellRing className="h-6 w-6 text-amber-500" />
            Wiedervorlagen
          </h1>
          <p className="text-sm text-[--muted-foreground]">
            {items.length} offen · {overdue.length} überfällig · {today.length} heute fällig
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Überfällig */}
        {overdue.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-base font-semibold text-red-700 mb-3">
              <AlertTriangle className="h-4 w-4" />
              Überfällig ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map((w) => (
                <WiedervorlageAdminRow key={w.id} item={w} variant="overdue" />
              ))}
            </div>
          </section>
        )}

        {/* Heute */}
        {today.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-base font-semibold text-amber-700 mb-3">
              <Clock className="h-4 w-4" />
              Heute fällig ({today.length})
            </h2>
            <div className="space-y-2">
              {today.map((w) => (
                <WiedervorlageAdminRow key={w.id} item={w} variant="today" />
              ))}
            </div>
          </section>
        )}

        {/* Demnächst */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[--foreground] mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Demnächst ({upcoming.length})
            </h2>
            <div className="space-y-2">
              {upcoming.map((w) => (
                <WiedervorlageAdminRow key={w.id} item={w} variant="upcoming" />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-[--muted-foreground]">
              <BellRing className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Keine offenen Wiedervorlagen</p>
              <p className="text-sm mt-1 opacity-70">Alle Wiedervorlagen sind erledigt.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function WiedervorlageAdminRow({
  item,
  variant,
}: {
  item: WiedervorlageRow;
  variant: "overdue" | "today" | "upcoming";
}) {
  const bgClass =
    variant === "overdue"
      ? "bg-red-50 border-red-200"
      : variant === "today"
      ? "bg-amber-50 border-amber-200"
      : "bg-[--card] border-[--border]";

  const badgeVariant =
    variant === "overdue"
      ? "destructive"
      : variant === "today"
      ? "warning"
      : "secondary";

  const badgeLabel =
    variant === "overdue"
      ? "Überfällig"
      : variant === "today"
      ? "Heute"
      : formatDate(item.faellig_am);

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${bgClass}`}>
      <Badge variant={badgeVariant} className="shrink-0 text-xs">
        {badgeLabel}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {item.anbieter?.name ?? "Unbekannter Anbieter"}
        </p>
        {item.notiz && (
          <p className="text-xs text-[--muted-foreground] truncate">{item.notiz}</p>
        )}
        {!item.notiz && item.anfragen?.lebenslage && (
          <p className="text-xs text-[--muted-foreground] capitalize truncate">
            {item.anfragen.lebenslage.replace(/_/g, " ")}
          </p>
        )}
      </div>
      <Link href={`/anbieter/anfragen/${item.anfrage_id}`} className="shrink-0">
        <Button variant="ghost" size="sm" className="text-xs h-7">
          Anfrage
        </Button>
      </Link>
    </div>
  );
}
