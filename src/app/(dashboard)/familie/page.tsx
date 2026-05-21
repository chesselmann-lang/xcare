import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Compass, Search, FileText, Heart, ArrowRight, Clock, Bookmark,
  Sparkles, MapPin, Bell, CheckCircle2, MessageSquare,
  Star, TrendingUp, Users, History
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { formatRelative } from "@/lib/utils";
import { KIEmpfehlungBanner } from "@/components/familie/KIEmpfehlungBanner";
import { DashboardWidgetRow } from "@/components/dashboard/DashboardWidgetRow";
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
    .select("id, role, plz")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");
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
    { data: zuletztAngesehen },
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
    supabase
      .from("anbieter_zuletzt_angesehen")
      .select("anbieter_id, gesehen_am, anbieter(id, name, plz, ort, verifiziert, logo_url)")
      .eq("familie_id", profile?.id)
      .order("gesehen_am", { ascending: false })
      .limit(6),
  ]);

  // Stale anfragen: offen/in_bearbeitung with no update for >7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleAnfragen } = await supabase
    .from("anfragen")
    .select("id, lebenslage, status, updated_at, anbieter(name)")
    .eq("familie_id", profile?.id)
    .in("status", ["offen", "in_bearbeitung"])
    .lt("updated_at", sevenDaysAgo)
    .order("updated_at", { ascending: true })
    .limit(3);

  // Lebenslage → Leistungskategorie mapping for personalized recommendations
  const LEBENSLAGE_ZU_KATEGORIE: Record<string, string> = {
    geburt_fruehe_kindheit: "kinderbetreuung",
    schulkind_jugend: "jugendhilfe",
    eingliederung_behinderung: "eingliederungshilfe",
    erwerbsleben_vereinbarkeit: "beratung",
    krankheit_genesung: "therapie",
    alter_pflege: "pflege_ambulant",
    hospiz_palliativ: "hospizdienst",
    trauer_nachlass: "beratung",
  };

  // Find most-used lebenslage from the family's anfragen history
  const allAnfragenForLebenslage = anfragen ?? [];
  const lebenslageCount: Record<string, number> = {};
  allAnfragenForLebenslage.forEach((a) => {
    if (a.lebenslage) lebenslageCount[a.lebenslage] = (lebenslageCount[a.lebenslage] ?? 0) + 1;
  });
  const meistgenutzteLebenslage = Object.entries(lebenslageCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const empfehlungsKategorie = meistgenutzteLebenslage
    ? (LEBENSLAGE_ZU_KATEGORIE[meistgenutzteLebenslage] ?? null)
    : null;

  // Top rated anbieter in PLZ area — filtered by lebenslage if available
  let empfohleneAnbieter: Array<{
    id: string;
    name: string;
    plz: string | null;
    ort: string | null;
    verifiziert: boolean;
    beschreibung: string | null;
    avgSterne: number;
    bewCount: number;
    matchesLebenslage: boolean;
  }> = [];

  if (profile?.plz) {
    const { data: nearbyAnbieter } = await supabase
      .from("anbieter")
      .select("id, name, plz, ort, verifiziert, beschreibung, leistungen(kategorie)")
      .eq("aktiv", true)
      .ilike("plz", profile.plz.substring(0, 2) + "%")
      .limit(20);

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

      const mapped = nearbyAnbieter.map((a) => {
        const leistungen = (a.leistungen as Array<{ kategorie: string }> | null) ?? [];
        const matchesLebenslage = empfehlungsKategorie
          ? leistungen.some((l) => l.kategorie === empfehlungsKategorie)
          : false;
        return {
          id: a.id,
          name: a.name,
          plz: a.plz,
          ort: a.ort,
          verifiziert: a.verifiziert,
          beschreibung: a.beschreibung,
          avgSterne: bewMap[a.id] ? bewMap[a.id].sum / bewMap[a.id].count : 0,
          bewCount: bewMap[a.id]?.count ?? 0,
          matchesLebenslage,
        };
      });

      // Sort: matching lebenslage first, then by score
      empfohleneAnbieter = mapped
        .sort((a, b) => {
          if (a.matchesLebenslage !== b.matchesLebenslage) {
            return a.matchesLebenslage ? -1 : 1;
          }
          const scoreA = (a.verifiziert ? 10 : 0) + a.avgSterne * 2;
          const scoreB = (b.verifiziert ? 10 : 0) + b.avgSterne * 2;
          return scoreB - scoreA;
        })
        .slice(0, 3);
    }
  }

  const empfehlungsLabel = meistgenutzteLebenslage
    ? ({
        geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
        schulkind_jugend: "Schulkind & Jugend",
        eingliederung_behinderung: "Behinderung & Eingliederung",
        erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
        krankheit_genesung: "Krankheit & Genesung",
        alter_pflege: "Alter & Pflege",
        hospiz_palliativ: "Hospiz & Palliativ",
        trauer_nachlass: "Trauer & Nachlass",
      } as Record<string, string>)[meistgenutzteLebenslage] ?? null
    : null;

  const greeting = getGreeting();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Phase 3B: Dashboard 2.0 — Anspruchs-Widget, Fristen-Warner, Monatskosten, Schnellaktionen */}
      <DashboardWidgetRow />

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

      {/* Erinnerungs-Banner: Anfragen ohne Update seit >7 Tagen */}
      {staleAnfragen && staleAnfragen.length > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {staleAnfragen.length === 1
                ? "1 Anfrage wartet seit über einer Woche auf eine Antwort"
                : `${staleAnfragen.length} Anfragen warten seit über einer Woche`}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {staleAnfragen.map((a) => (
                <Link key={a.id} href={`/familie/anfragen/${a.id}`}>
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full transition-colors capitalize">
                    {a.lebenslage?.replace(/_/g, " ")}
                    {(a.anbieter as { name?: string } | null)?.name && (
                      <> · {(a.anbieter as { name: string }).name}</>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/familie/anfragen" className="shrink-0">
            <button className="flex items-center gap-1.5 text-xs font-semibold bg-blue-700 text-white px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
              Alle Anfragen <ArrowRight className="h-3 w-3" />
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

      {/* Schnell-Anfrage stellen */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[--primary]" /> Neue Anfrage stellen
          </p>
          <span className="text-xs text-[--muted-foreground]">Wählen Sie Ihre Situation</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {[
            { emoji: "👴", label: "Alter & Pflege", kat: "pflege_ambulant" },
            { emoji: "👶", label: "Geburt & Kind", kat: "kinderbetreuung" },
            { emoji: "🎒", label: "Kind & Schule", kat: "jugendhilfe" },
            { emoji: "♿", label: "Eingliederung", kat: "eingliederungshilfe" },
            { emoji: "🩺", label: "Krankheit", kat: "therapie" },
            { emoji: "🕊️", label: "Hospiz", kat: "hospizdienst" },
            { emoji: "💬", label: "Beratung", kat: "beratung" },
          ].map((item) => {
            const params = new URLSearchParams({ kategorie: item.kat });
            if (profile?.plz) params.set("plz", profile.plz);
            return (
              <Link
                key={item.kat}
                href={`/suche?${params.toString()}`}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/5 transition-all text-center group"
              >
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="text-[10px] font-medium text-[--muted-foreground] group-hover:text-[--primary] leading-tight transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

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

      {/* Zuletzt angesehen */}
      {zuletztAngesehen && zuletztAngesehen.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <History className="h-4 w-4 text-[--primary]" /> Zuletzt angesehen
            </p>
            <Link href="/suche" className="text-xs text-blue-600 hover:underline">
              Mehr entdecken →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {zuletztAngesehen.map((entry) => {
              const a = entry.anbieter as { id: string; name: string; plz: string | null; ort: string | null; verifiziert: boolean; logo_url: string | null } | null;
              if (!a) return null;
              return (
                <Link
                  key={entry.anbieter_id}
                  href={`/anbieter/${a.id}`}
                  className="flex-none w-36 group"
                >
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/5 transition-all text-center">
                    {a.logo_url ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                        <Image src={a.logo_url} alt={a.name} fill className="object-cover" sizes="40px" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100">
                        <span className="text-sm font-bold text-indigo-600">
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 w-full">
                      <p className="text-xs font-medium text-[--foreground] group-hover:text-[--primary] transition-colors leading-tight line-clamp-2">
                        {a.name}
                      </p>
                      {(a.ort ?? a.plz) && (
                        <p className="text-[10px] text-[--muted-foreground] mt-0.5 flex items-center justify-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {a.ort ?? a.plz}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

          {/* KI-personalisierte Empfehlung */}
          {empfohleneAnbieter.length > 0 && (
            <KIEmpfehlungBanner
              lebenslage={meistgenutzteLebenslage}
              plz={profile?.plz ?? null}
              ort={profile?.ort ?? null}
              offeneAnfragen={offeneAnfragen ?? 0}
              empfohleneAnbieterNamen={empfohleneAnbieter.map((a) => a.name)}
            />
          )}

          {empfohleneAnbieter.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {empfehlungsLabel ? "Passend zu Ihrer Situation" : "Empfohlen in Ihrer Nähe"}
                  </CardTitle>
                  {empfehlungsLabel && (
                    <p className="text-xs text-[--muted-foreground] mt-0.5 pl-6">{empfehlungsLabel}</p>
                  )}
                </div>
                <Link href={empfehlungsKategorie ? `/suche?kategorie=${empfehlungsKategorie}&plz=${profile?.plz ?? ""}` : "/suche"}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Alle <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {empfohleneAnbieter.map((a) => (
                  <Link key={a.id} href={`/anbieter/${a.id}`} className="group block">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-[--muted]/40 ${
                      a.matchesLebenslage
                        ? "border-[--primary]/20 bg-[--primary]/5 hover:border-[--primary]/35"
                        : "border-[--border] hover:border-[--primary]/25"
                    }`}>
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
                          {a.matchesLebenslage && (
                            <span className="text-[10px] font-medium text-[--primary] bg-[--primary]/10 px-1.5 py-0.5 rounded-full shrink-0">
                              Passend
                            </span>
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
