import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, Search, FileText, Heart, ArrowRight, Clock,
  Sparkles, MapPin, Star, Bell, CheckCircle2
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatRelative } from "@/lib/utils";
import type { AnfrageStatus } from "@/lib/types";

const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angebot",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

const statusVariant: Record<AnfrageStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  offen: "secondary",
  in_bearbeitung: "warning",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

// Greeting by time of day
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function FamilieDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter");
  if (!profile?.onboarding_done) redirect("/onboarding");

  const [
    { data: anfragen },
    { data: favoriten },
    { count: offeneAnfragen },
    { count: angeboteCount },
  ] = await Promise.all([
    supabase.from("anfragen").select("*, anbieter(id, name, plz, ort)").eq("familie_id", profile?.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("favoriten").select("anbieter(id, name, plz, ort, verifiziert, beschreibung)").eq("familie_id", profile?.id).limit(3),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("familie_id", profile?.id).in("status", ["offen", "in_bearbeitung", "angeboten"]),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("familie_id", profile?.id).eq("status", "angeboten"),
  ]);

  // Top rated anbieter in PLZ area (if user has PLZ)
  let empfohleneAnbieter: Array<{
    id: string; name: string; plz: string | null; ort: string | null;
    verifiziert: boolean; beschreibung: string | null;
    avgSterne: number; bewCount: number;
  }> = [];

  if (profile?.plz) {
    const { data: nearbyAnbieter } = await supabase
      .from("anbieter")
      .select("id, name, plz, ort, verifiziert, beschreibung")
      .eq("aktiv", true)
      .ilike("plz", profile.plz.substring(0, 2) + "%")
      .limit(10);

    if (nearbyAnbieter && nearbyAnbieter.length > 0) {
      const ids = nearbyAnbieter.map((a) => a.id);
      const { data: bew } = await supabase
        .from("bewertungen").select("anbieter_id, sterne").in("anbieter_id", ids);

      const bewMap: Record<string, { sum: number; count: number }> = {};
      (bew ?? []).forEach((b) => {
        if (!bewMap[b.anbieter_id]) bewMap[b.anbieter_id] = { sum: 0, count: 0 };
        bewMap[b.anbieter_id].sum += b.sterne;
        bewMap[b.anbieter_id].count += 1;
      });

      empfohleneAnbieter = nearbyAnbieter
        .map((a) => ({
          ...a,
          avgSterne: bewMap[a.id] ? bewMap[a.id].sum / bewMap[a.id].count : 0,
          bewCount: bewMap[a.id]?.count ?? 0,
        }))
        .sort((a, b) => {
          const scoreA = (a.verifiziert ? 10 : 0) + a.avgSterne * 2;
          const scoreB = (b.verifiziert ? 10 : 0) + b.avgSterne * 2;
          return scoreB - scoreA;
        })
        .slice(0, 3);
    }
  }

  const greeting = getGreeting();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Aktions-Banner: Angebote warten auf Antwort */}
      {angeboteCount != null && angeboteCount > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <Bell className="h-5 w-5 shrink-0 animate-pulse" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {angeboteCount === 1
                ? "1 Anbieter hat Ihnen ein Angebot gemacht"
                : `${angeboteCount} Anbieter haben Ihnen Angebote gemacht`}
            </p>
            <p className="text-xs mt-0.5">Schauen Sie sich die Angebote an und antworten Sie.</p>
          </div>
          <Link href="/familie/anfragen">
            <button className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-amber-800 text-white px-3 py-1.5 rounded-lg hover:bg-amber-900 transition-colors">
              Ansehen <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      )}

      {/* Begrüßung */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {greeting}, {profile?.vorname ?? "Willkommen"}! 👋
        </h1>
        <p className="text-[--muted-foreground] mt-1">
          {offeneAnfragen && offeneAnfragen > 0
            ? `Sie haben ${offeneAnfragen} aktive Anfrage${offeneAnfragen > 1 ? "n" : ""}.`
            : "Was kann xcare heute für Sie tun?"}
        </p>
      </div>

      {/* Schnellaktionen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: "/lotse",           icon: Compass,  titel: "KI-Lotse",       desc: "Beratung starten",        farbe: "#D6EAF8" },
          { href: "/suche",           icon: Search,   titel: "Suche",           desc: "Anbieter finden",         farbe: "#D5F5E3" },
          { href: "/familie/anfragen",icon: FileText, titel: "Anfragen",        desc: `${anfragen?.length ?? 0} gesamt`, farbe: "#FEF9E7" },
          { href: "/familie/favoriten",icon: Heart,   titel: "Favoriten",       desc: "Gespeicherte Anbieter",   farbe: "#FDEDEC" },
        ].map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg mb-2"
                  style={{ background: a.farbe }}
                >
                  <a.icon className="h-4 w-4 text-[--primary]" />
                </div>
                <p className="font-semibold text-sm">{a.titel}</p>
                <p className="text-xs text-[--muted-foreground] mt-0.5">{a.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Letzte Anfragen */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Aktuelle Anfragen
              </CardTitle>
              <Link href="/familie/anfragen">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Alle <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {anfragen && anfragen.length > 0 ? (
                <div className="space-y-2">
                  {anfragen.map((a) => {
                    const anbieter = a.anbieter as { id: string; name: string; plz: string | null; ort: string | null } | null;
                    return (
                      <Link key={a.id} href={`/familie/anfragen/${a.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-[--border] hover:bg-[--muted] transition-colors cursor-pointer">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[--primary-light] text-[--primary] font-semibold text-sm">
                              {(anbieter?.name?.charAt(0) ?? "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {anbieter?.name ?? "Unbekannter Anbieter"}
                              </p>
                              <p className="text-xs text-[--muted-foreground] capitalize truncate">
                                {a.lebenslage.replace(/_/g, " ")} · {formatRelative(a.updated_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={statusVariant[a.status as AnfrageStatus] ?? "secondary"}>
                              {statusLabel[a.status as AnfrageStatus] ?? a.status}
                            </Badge>
                            <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground]" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-[--muted-foreground]">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-3">Noch keine Anfragen</p>
                  <Link href="/lotse">
                    <Button size="sm" className="gap-1.5">
                      <Compass className="h-4 w-4" /> Lotse starten
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Empfohlene Anbieter */}
          {empfohleneAnbieter.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Empfohlen in Ihrer Nähe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {empfohleneAnbieter.map((a) => (
                    <Link key={a.id} href={`/anbieter/${a.id}`}>
                      <div className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[--muted] transition-colors cursor-pointer">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[--primary-light] text-[--primary] font-semibold text-sm">
                          {a.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate">{a.name}</p>
                            {a.verifiziert && (
                              <span className="text-green-600 text-[10px] shrink-0">✓</span>
                            )}
                          </div>
                          {(a.plz || a.ort) && (
                            <p className="text-xs text-[--muted-foreground] flex items-center gap-1 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" />{a.plz} {a.ort}
                            </p>
                          )}
                          {a.bewCount > 0 && (
                            <div className="mt-0.5">
                              <SterneDisplay average={a.avgSterne} count={a.bewCount} size="sm" />
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground] mt-1 shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/suche">
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs h-7 gap-1">
                    Alle Anbieter <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Favoriten Quick Access */}
          {favoriten && favoriten.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400 fill-red-400" /> Meine Favoriten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {favoriten.map((f) => {
                    const a = f.anbieter as { id: string; name: string; plz: string | null; ort: string | null } | null;
                    if (!a) return null;
                    return (
                      <Link key={a.id} href={`/anbieter/${a.id}`}>
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[--muted] transition-colors cursor-pointer">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[--primary-light] text-[--primary] font-semibold text-xs">
                            {a.name.charAt(0)}
                          </div>
                          <p className="text-sm font-medium truncate flex-1">{a.name}</p>
                          <ArrowRight className="h-3 w-3 text-[--muted-foreground] shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link href="/familie/favoriten">
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs h-7">
                    Alle Favoriten
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* No recommendations, no favorites → prompt */}
          {empfohleneAnbieter.length === 0 && (!favoriten || favoriten.length === 0) && (
            <Card>
              <CardContent className="p-5 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-30 text-[--primary]" />
                <p className="text-sm font-medium mb-1">Anbieter entdecken</p>
                <p className="text-xs text-[--muted-foreground] mb-3">
                  Finden Sie passende Dienste in Ihrer Nähe.
                </p>
                <Link href="/suche">
                  <Button size="sm" className="gap-1.5 w-full">
                    <Search className="h-3.5 w-3.5" /> Jetzt suchen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
