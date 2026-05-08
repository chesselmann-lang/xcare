import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, MessageSquare, Building2, TrendingUp, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";

export default async function AnbieterDashboard() {
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
    .select("*")
    .eq("profile_id", profile?.id)
    .single();

  const { data: leistungen } = await supabase
    .from("leistungen")
    .select("*")
    .eq("anbieter_id", anbieter?.id ?? "")
    .eq("aktiv", true);

  const { data: anfragen } = await supabase
    .from("anfragen")
    .select("*, profiles!familie_id(*)")
    .eq("anbieter_id", anbieter?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: offeneAnfragen } = await supabase
    .from("anfragen")
    .select("*", { count: "exact", head: true })
    .eq("anbieter_id", anbieter?.id ?? "")
    .eq("status", "offen");

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{anbieter?.name ?? "Mein Dashboard"}</h1>
          <p className="text-[--muted-foreground] mt-1">
            {anbieter?.plz} {anbieter?.ort}
            {anbieter?.verifiziert && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verifiziert
              </span>
            )}
          </p>
        </div>
        <Link href="/anbieter/profil">
          <Button variant="outline" size="sm">Profil bearbeiten</Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {
            icon: MessageSquare,
            label: "Offene Anfragen",
            wert: offeneAnfragen ?? 0,
            farbe: "#FEF9E7",
            link: "/anbieter/anfragen",
          },
          {
            icon: Package,
            label: "Aktive Leistungen",
            wert: leistungen?.length ?? 0,
            farbe: "#D5F5E3",
            link: "/anbieter/leistungen",
          },
          {
            icon: TrendingUp,
            label: "Anfragen gesamt",
            wert: anfragen?.length ?? 0,
            farbe: "#D6EAF8",
            link: "/anbieter/anfragen",
          },
          {
            icon: Building2,
            label: "Profil-Status",
            wert: anbieter?.verifiziert ? "✓" : "Ausstehend",
            farbe: anbieter?.verifiziert ? "#D5F5E3" : "#FEF9E7",
            link: "/anbieter/profil",
          },
        ].map((k) => (
          <Link key={k.label} href={k.link}>
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl mb-3"
                  style={{ background: k.farbe }}
                >
                  <k.icon className="h-5 w-5 text-[--primary]" />
                </div>
                <p className="text-2xl font-bold">{k.wert}</p>
                <p className="text-sm text-[--muted-foreground]">{k.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Letzte Anfragen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Eingehende Anfragen</CardTitle>
          <Link href="/anbieter/anfragen">
            <Button variant="ghost" size="sm" className="gap-1">
              Alle <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {anfragen && anfragen.length > 0 ? (
            <div className="space-y-3">
              {anfragen.map((a: {
                id: string;
                lebenslage: string;
                status: string;
                created_at: string;
              }) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[--border] hover:bg-[--muted] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {a.lebenslage.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-[--muted-foreground]">
                        {formatRelative(a.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={a.status === "offen" ? "warning" : a.status === "bestaetigt" ? "success" : "secondary"}
                    >
                      {a.status}
                    </Badge>
                    <Link href={`/anbieter/anfragen/${a.id}`}>
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[--muted-foreground]">
              <p>Noch keine Anfragen eingegangen</p>
              <p className="text-sm mt-1">
                Stellen Sie sicher, dass Ihr Profil vollständig ist und alle Leistungen eingetragen sind.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
