import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Search, FileText, Heart, ArrowRight, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";

export default async function FamilieDashboard() {
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

  if (profile?.role === "anbieter") redirect("/anbieter");

  const { data: anfragen } = await supabase
    .from("anfragen")
    .select("*, anbieter(*)")
    .eq("familie_id", profile?.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const statusFarbe: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    offen: "secondary",
    in_bearbeitung: "warning",
    angeboten: "default",
    bestaetigt: "success",
    abgelehnt: "destructive",
    abgeschlossen: "secondary",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Begrüßung */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Guten Tag, {profile?.vorname ?? "Willkommen"}! 👋
        </h1>
        <p className="text-[--muted-foreground] mt-1">
          Was kann xcare heute für Sie tun?
        </p>
      </div>

      {/* Schnellaktionen */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          {
            href: "/lotse",
            icon: Compass,
            titel: "Lebenslage-Lotse",
            desc: "KI-Beratung starten",
            farbe: "#D6EAF8",
          },
          {
            href: "/suche",
            icon: Search,
            titel: "Anbieter suchen",
            desc: "Dienste in der Nähe finden",
            farbe: "#D5F5E3",
          },
          {
            href: "/familie/anfragen",
            icon: FileText,
            titel: "Meine Anfragen",
            desc: `${anfragen?.length ?? 0} Anfragen`,
            farbe: "#FEF9E7",
          },
          {
            href: "/familie/favoriten",
            icon: Heart,
            titel: "Favoriten",
            desc: "Gespeicherte Anbieter",
            farbe: "#FDEDEC",
          },
        ].map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-5">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl mb-3"
                  style={{ background: a.farbe }}
                >
                  <a.icon className="h-5 w-5 text-[--primary]" />
                </div>
                <p className="font-semibold">{a.titel}</p>
                <p className="text-sm text-[--muted-foreground] mt-0.5">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Letzte Anfragen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meine letzten Anfragen</CardTitle>
          <Link href="/familie/anfragen">
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
                beschreibung: string;
                created_at: string;
                anbieter?: { name: string } | null;
              }) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[--border] hover:bg-[--muted] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{a.lebenslage.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[--muted-foreground]">
                        {a.anbieter?.name ?? "Kein Anbieter"} · {formatRelative(a.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusFarbe[a.status] ?? "secondary"}>
                    {a.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[--muted-foreground]">
              <p className="mb-3">Noch keine Anfragen vorhanden</p>
              <Link href="/lotse">
                <Button size="sm" className="gap-1">
                  Lotse starten <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
