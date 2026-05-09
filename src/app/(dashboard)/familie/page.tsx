import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass, Search, FileText, Heart, ArrowRight, Clock, Bookmark,
  Sparkles, MapPin, Bell, CheckCircle2, MessageSquare,
  Star, TrendingUp, Users
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

const statusVariant: Record<
  AnfrageStatus,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  offen: "secondary",
  in_bearbeitung: "warning",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

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
  if (!profile?.onboarding_done) redirect("/onboarding");

  const [
    { data: anfragen },
    { data: favoriten },
    { count: offeneAnfragen },
    { count: angeboteCount },
    { count: abgeschlosseneCount },
    { count: bewertungenGegeben },
    { count: totalAnfragen },
    { count: bestaetigteCount },
    { count: inBearbeitungCount },
    { data: gespeicherteSuchen },
  ] = await Promise.all([
    supabase
      .from("anfragen")
      .select("*, anbieter(id, name, plz, ort)")
      .eq("familie_id", profile?.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("favoriten")
      .select("anbieter(id, name, plz, ort, verifiziert, beschreibung)")
      .eq("familie_id", profile?.id)
      .limit(3),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .in("status", ["offen", "in_bearbeitung", "angeboten"]),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "angeboten"),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "abgeschlossen"),
    supabase
      .from("bewertungen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "bestaetigt"),
    supabase
      .from("anfragen")
      .select("*", { count: "exact", head: true })
      .eq("familie_id", profile?.id)
      .eq("status", "in_bearbeitung"),
    supabase
      .from("gespeicherte_suchen")
      .select("id, name, plz, radius_km, lebenslage, suchtext, created_at")
      .eq("profile_id", profile?.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Top rated anbieter in PLZ area
  let empfohleneAnbieter: Array<{
    id: string;
    name: string;
    plz: string | null;
    ort: string | null;
    verifiziert: boolean;
    beschreibung: string | null;
    avgSterne: number;
    bewCount: number;
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
        .from("bewertungen")
        .select("anbieter_id, sterne")
        .in("anbieter_id", ids);

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
      {/* Angebote-Banner */}
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

      {/* Begrüßung + Aktionen */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {greeting}, {profile?.vorname ?? "Willkommen"}! 👋
          </h1>
          <p className="text-[--muted-foreground] mt-1">
            {offeneAnfragen && offeneAnfragen > 0
              ? `Sie haben ${offeneAnfragen} aktive ${offeneAnfragen === 1 ? "Anfrage" : "Anfragen"}.`
              : "Wie können wir Ihnen heute helfen?"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link href="/lotse">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Compass className="h-4 w-4" />
              KI-Lotse
            </Button>
          </Link>
          <Link href="/suche">
            <Button size="sm" className="gap-1.5">
              <Search className="h-4 w-4" />
              Anbieter suchen
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Link href="/familie/anfragen" className="block">
          <Card className="hover:shadow-sm transition-all hover:border-[--primary]/20 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                {(offeneAnfragen ?? 0) > 0 && (
                  <Badge variant="warning" className="text-xs">
                    {offeneAnfragen} aktiv
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{anfragen?.length ?? 0}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Anfragen gesamt</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/familie/anfragen" className="block">
          <Card className="hover:shadow-sm transition-all hover:border-[--primary]/20 cursor-pointer">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{abgeschlosseneCount ?? 0}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Abgeschlossen</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/familie/favoriten" className="block">
          <Card className="hover:shadow-sm transition-all hover:border-[--primary]/20 cursor-pointer">
            <CardContent className="p-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-2">
                <Heart className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold">{favoriten?.length ?? 0}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">Favoriten</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
              <Star className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{bewertungenGegeben ?? 0}</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">Bewertungen</p>
          </CardContent>
        </Card>
      </div>

      {/* Status-Übersicht (nur wenn Anfragen vorhanden) */}
      {(totalAnfragen ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Anfragen nach Status</p>
            <Link href="/familie/anfragen" className="text-xs text-blue-600 hover:underline">
              Alle {totalAnfragen} ansehen →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            {[
              { label: "Offen", count: (offeneAnfragen ?? 0) - (angeboteCount ?? 0) - (inBearbeitungCount ?? 0), color: "text-yellow-600 bg-yellow-50" },
              { label: "In Bearb.", count: inBearbeitungCount ?? 0, color: "text-blue-600 bg-blue-50" },
              { label: "Angeboten", count: angeboteCount ?? 0, color: "text-purple-600 bg-purple-50" },
              { label: "Bestätigt", count: bestaetigteCount ?? 0, color: "text-green-600 bg-green-50" },
              { label: "Abgeschl.", count: abgeschlosseneCount ?? 0, color: "text-gray-600 bg-gray-50" },
              { label: "Bewertet", count: bewertungenGegeben ?? 0, color: "text-amber-600 bg-amber-50" },
            ].map((s) => (
              <Link key={s.label} href="/familie/anfragen" className="block">
                <div className={`rounded-lg py-2 px-1 ${s.color} hover:opacity-80 transition-opacity`}>
                  <p className="text-lg font-bold">{s.count}</p>
                  <p className="leading-tight">{s.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Schnellaktionen */}
      <div className="flex sm:hidden gap-2 mb-6 flex-wrap">
        <Link href="/lotse" className="flex-1">
          <Button variant="outline" size="sm" className="gap-1.5 w-full">
            <Compass className="h-4 w-4" /> KI-Lotse
          </Button>
        </Link>
        <Link href="/suche" className="flex-1">
          <Button size="sm" className="gap-1.5 w-full">
            <Search className="h-4 w-4" /> Anbieter suchen
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Letzte Anfragen + Empfehlungen */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Meine Anfragen
              </CardTitle>
              <Link href="/familie/anfragen">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Alle <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {anfragen && anfragen.length > 0 ? (
                <div className="space-y-2">
                  {anfragen.map((a) => {
                    const anbieter = a.anbieter as {
                      id: string;
                      name: string;
                      plz: string | null;
                      ort: string | null;
                    } | null;
                    return (
                      <Link key={a.id} href={`/familie/anfragen/${a.id}`} className="block group">
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[--border] hover:border-[--primary]/25 hover:bg-[--muted]/40 transition-all">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {anbieter?.name ?? "Unbekannter Anbieter"}
                            </p>
                            <p className="text-xs text-[--muted-foreground]">
                              {a.lebenslage.replace(/_/g, " ")} · {formatRelative(a.updated_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={statusVariant[a.status as AnfrageStatus] ?? "secondary"}
                              className="text-xs"
                            >
                              {statusLabel[a.status as AnfrageStatus] ?? a.status}
                            </Badge>
                            <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground] group-hover:text-[--primary] transition-colors" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[--muted-foreground]">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Noch keine Anfragen</p>
                  <Link href="/suche" className="mt-3 inline-block">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Search className="h-4 w-4" /> Anbieter finden
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {empfohleneAnbieter.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Empfohlen in Ihrer Nähe
                </CardTitle>
                <Link href="/suche">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Alle <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {empfohleneAnbieter.map((a) => (
                  <Link key={a.id} href={`/anbieter/${a.id}`} className="group block">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[--border] hover:border-[--primary]/25 hover:bg-[--muted]/40 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-[--primary]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate group-hover:text-[--primary] transition-colors">
                            {a.name}
                          </p>
                          {a.verifiziert && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          )}
                        </div>
                        {(a.plz || a.ort) && (
                          <p className="text-xs text-[--muted-foreground] flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {a.plz}{a.ort ? ` ${a.ort}` : ""}
                          </p>
                        )}
                        {a.bewCount > 0 && (
                          <SterneDisplay average={a.avgSterne} count={a.bewCount} size="sm" />
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[--muted-foreground] group-hover:text-[--primary] shrink-0 transition-colors" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Favoriten */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" /> Favoriten
              </CardTitle>
              <Link href="/familie/favoriten">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Alle <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {favoriten && favoriten.length > 0 ? (
                <div className="space-y-1">
                  {favoriten.map((f, i) => {
                    const a = f.anbieter as {
                      id: string;
                      name: string;
                      plz: string | null;
                      ort: string | null;
                      verifiziert: boolean;
                    } | null;
                    if (!a) return null;
                    return (
                      <Link key={i} href={`/anbieter/${a.id}`} className="group block">
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg hover:bg-[--muted] transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-[--primary] transition-colors">
                              {a.name}
                            </p>
                            {(a.plz || a.ort) && (
                              <p className="text-xs text-[--muted-foreground]">
                                {a.plz}{a.ort ? ` ${a.ort}` : ""}
                              </p>
                            )}
                          </div>
                          {a.verifiziert && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-[--muted-foreground]">
                  <Heart className="h-6 w-6 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Noch keine Favoriten</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gespeicherte Suchen */}
          {(gespeicherteSuchen ?? []).length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-[--primary]" /> Gespeicherte Suchen
                </CardTitle>
                <Link href="/suche">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Neue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {(gespeicherteSuchen ?? []).map((s) => {
                  const params = new URLSearchParams();
                  if (s.plz) params.set("plz", s.plz);
                  if (s.lebenslage) params.set("kategorie", s.lebenslage);
                  if (s.suchtext) params.set("q", s.suchtext);
                  return (
                    <Link
                      key={s.id}
                      href={`/suche?${params.toString()}`}
                      className="group flex items-center gap-2 p-2.5 rounded-lg hover:bg-[--muted] transition-colors"
                    >
                      <Search className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" />
                      <span className="flex-1 text-xs font-medium truncate group-hover:text-[--primary] transition-colors">
                        {s.name}
                      </span>
                      <ArrowRight className="h-3 w-3 text-[--muted-foreground] group-hover:text-[--primary] shrink-0 transition-colors" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Schnellzugriff */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Schnellzugriff
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {[
                { href: "/lotse", icon: Compass, label: "KI-Lotse starten", desc: "Unterstützung finden" },
                { href: "/suche", icon: Search, label: "Anbieter suchen", desc: "Nach PLZ & Kategorie" },
                { href: "/familie/nachrichten", icon: MessageSquare, label: "Nachrichten", desc: "Alle Gespräche" },
                { href: "/familie/anfragen", icon: FileText, label: "Meine Anfragen", desc: "Status verwalten" },
                { href: "/familie/favoriten", icon: Heart, label: "Favoriten", desc: "Gespeicherte Anbieter" },
                { href: "/familie/gespeicherte-suchen", icon: Bookmark, label: "Gespeicherte Suchen", desc: "Suchanfragen verwalten" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="block group">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[--muted] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[--primary]/8 flex items-center justify-center shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-[--primary]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium group-hover:text-[--primary] transition-colors">
                        {item.label}
                      </p>
                      <p className="text-xs text-[--muted-foreground]">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-[--muted-foreground] group-hover:text-[--primary] transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
