import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package, MessageSquare, Building2, TrendingUp, ArrowRight,
  CheckCircle2, Clock, Star, AlertCircle, BarChart2, Zap,
  FileText, PlusCircle, Eye, Receipt, CalendarDays, Users, BellRing,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import { VerfuegbarkeitToggle } from "@/components/anbieter/VerfuegbarkeitToggle";
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
  offen: "warning",
  in_bearbeitung: "default",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

type ProfilCheck = {
  label: string;
  gewicht: number;
  erledigt: boolean;
  link: string;
  hint?: string;
};

function profilStaerke(
  anbieter: Record<string, unknown>,
  leistungenCount: number,
): { score: number; tipps: string[]; checks: ProfilCheck[] } {
  const rawChecks: Array<{
    field?: keyof typeof anbieter;
    label: string;
    gewicht: number;
    link: string;
    hint?: string;
    customCheck?: boolean;
  }> = [
    { field: "beschreibung", label: "Beschreibung vorhanden",   gewicht: 20, link: "/anbieter/profil",   hint: "Mindestens 100 Zeichen" },
    { field: "logo_url",     label: "Logo hochgeladen",          gewicht: 15, link: "/anbieter/profil",   hint: "Erhöht Klickrate deutlich" },
    { field: "plz",          label: "Adresse vollständig",       gewicht: 15, link: "/anbieter/profil" },
    { field: "telefon",      label: "Telefonnummer hinterlegt",  gewicht: 10, link: "/anbieter/profil" },
    { field: "email",        label: "E-Mail hinterlegt",         gewicht: 10, link: "/anbieter/profil" },
    { field: "website",      label: "Website eingetragen",       gewicht: 10, link: "/anbieter/profil" },
    {
      label: "Mindestens eine Leistung",
      gewicht: 15,
      link: "/anbieter/leistungen",
      hint: "Leistungen verbessern die Auffindbarkeit",
      customCheck: true,
    },
    { field: "verifiziert",  label: "Profil verifiziert",        gewicht: 5,  link: "/anbieter/profil",  hint: "Verifizierte Profile erhalten mehr Anfragen" },
  ];

  let score = 0;
  const checks: ProfilCheck[] = rawChecks.map((c) => {
    const erledigt = c.customCheck
      ? leistungenCount > 0
      : Boolean(c.field && anbieter[c.field]);
    if (erledigt) score += c.gewicht;
    return { label: c.label, gewicht: c.gewicht, erledigt, link: c.link, hint: c.hint };
  });

  const tipps = checks.filter((c) => !c.erledigt).map((c) => c.label).slice(0, 3);
  return { score, tipps, checks };
}

export default async function AnbieterDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "familie") redirect("/familie");
  if (!profile?.onboarding_done) redirect("/onboarding");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*")
    .eq("profile_id", profile?.id)
    .single();

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // Profil-Aufrufe der letzten 7 Tage (raw rows, grouped client-side)
  const { data: roheAufrufe7d } = await supabase
    .from("anbieter_profil_aufrufe")
    .select("created_at")
    .eq("anbieter_id", anbieter?.id ?? "")
    .gte("created_at", oneWeekAgo);

  // Build daily counts: label Mon-Sun, count per day
  const aufrufeSparkline: { day: string; count: number }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = (roheAufrufe7d ?? []).filter((r) => r.created_at.slice(0, 10) === dateStr).length;
    return {
      day: d.toLocaleDateString("de-DE", { weekday: "short" }),
      count,
    };
  });
  const maxAufruf = Math.max(...aufrufeSparkline.map((d) => d.count), 1);
  const aufrufeGesamt7d = aufrufeSparkline.reduce((s, d) => s + d.count, 0);

  const [
    { data: leistungen },
    { data: anfragen },
    { count: offeneAnfragen },
    { count: anfragenGesamt },
    { data: bewertungen },
    { count: anfragenDieseWoche },
    { count: anfragenDieserMonat },
    { count: anfragenLetzterMonat },
    { data: bestaetigte },
    { data: pendingWiedervorlagen },
    { count: anfragenInBearbeitung },
    { count: anfragenAngeboten },
    { count: anfragenBestaetigt },
  ] = await Promise.all([
    supabase.from("leistungen").select("id, name, aktiv").eq("anbieter_id", anbieter?.id ?? "").eq("aktiv", true),
    supabase.from("anfragen").select("id, lebenslage, status, created_at").eq("anbieter_id", anbieter?.id ?? "").order("created_at", { ascending: false }).limit(5),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "offen"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("bewertungen").select("sterne").eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneWeekAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneMonthAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", twoMonthsAgo).lt("created_at", oneMonthAgo),
    supabase.from("anfragen").select("id, lebenslage, updated_at, profiles!familie_id(vorname, nachname)")
      .eq("anbieter_id", anbieter?.id ?? "")
      .eq("status", "bestaetigt")
      .order("updated_at", { ascending: true })
      .limit(20),
    supabase.from("wiedervorlagen")
      .select("id, faellig_am, notiz, anfrage_id, anfragen!inner(lebenslage)")
      .eq("anbieter_id", anbieter?.id ?? "")
      .eq("erledigt", false)
      .order("faellig_am", { ascending: true })
      .limit(8),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "in_bearbeitung"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "angeboten"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "bestaetigt"),
  ]);

  const avgSterne = bewertungen && bewertungen.length > 0
    ? bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length : 0;
  const bewCount = bewertungen?.length ?? 0;

  const { score: profilScore, checks: profilChecks } = anbieter
    ? profilStaerke(anbieter as Record<string, unknown>, leistungen?.length ?? 0)
    : { score: 0, tipps: [], checks: [] };

  // Antwortrate: (nicht-offen) / gesamt
  const gesamt = anfragenGesamt ?? 0;
  const bearbeitet = Math.max(0, gesamt - (offeneAnfragen ?? 0));
  const antwortrate = gesamt > 0 ? Math.round((bearbeitet / gesamt) * 100) : 100;

  // Anfragen-Funnel für Statistik-Card
  const funnelOffen = offeneAnfragen ?? 0;
  const funnelInBearbeitung = anfragenInBearbeitung ?? 0;
  const funnelAngeboten = anfragenAngeboten ?? 0;
  const funnelBestaetigt = anfragenBestaetigt ?? 0;
  const conversionRate = gesamt > 0 ? Math.round((funnelBestaetigt / gesamt) * 100) : 0;

  // Trend: this month vs last month
  const dieserMonat = anfragenDieserMonat ?? 0;
  const letzterMonat = anfragenLetzterMonat ?? 0;
  const trendProzent = letzterMonat > 0
    ? Math.round(((dieserMonat - letzterMonat) / letzterMonat) * 100)
    : dieserMonat > 0 ? 100 : 0;
  const trendPositiv = trendProzent >= 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{anbieter?.name ?? "Mein Dashboard"}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {(anbieter?.plz || anbieter?.ort) && (
              <p className="text-[--muted-foreground] text-sm">{anbieter?.plz} {anbieter?.ort}</p>
            )}
            {anbieter?.verifiziert && (
              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verifiziert
              </span>
            )}
            {bewCount > 0 && (
              <SterneDisplay average={avgSterne} count={bewCount} size="sm" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {anbieter?.id && (
            <Link href={`/anbieter/${anbieter.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Vorschau
              </Button>
            </Link>
          )}
          <Link href="/anbieter/profil">
            <Button variant="outline" size="sm">Profil bearbeiten</Button>
          </Link>
        </div>
      </div>

      {/* Profil-Vollständigkeit Widget */}
      {profilScore < 100 && (
        <Card className={`mb-6 ${profilScore >= 80 ? "border-green-200 bg-green-50/40" : "border-amber-200 bg-amber-50/40"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {profilScore >= 80
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <AlertCircle className="h-4 w-4 text-amber-600" />}
                <p className={`text-sm font-semibold ${profilScore >= 80 ? "text-green-800" : "text-amber-800"}`}>
                  Profil {profilScore}% vollständig
                </p>
              </div>
              <Link href="/anbieter/profil">
                <Button size="sm" variant="outline" className={`text-xs ${profilScore >= 80 ? "border-green-300 text-green-800 hover:bg-green-100" : "border-amber-300 text-amber-800 hover:bg-amber-100"}`}>
                  Bearbeiten
                </Button>
              </Link>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${profilScore >= 80 ? "bg-green-500" : profilScore >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${profilScore}%` }}
              />
            </div>

            {/* Checklist — show only incomplete items (max 4) */}
            {profilChecks.filter((c) => !c.erledigt).length > 0 && (
              <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                {profilChecks.filter((c) => !c.erledigt).slice(0, 4).map((check) => (
                  <Link
                    key={check.label}
                    href={check.link}
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-[--border] hover:border-[--primary] hover:bg-[--primary]/5 transition-colors group"
                  >
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0 mt-0.5 group-hover:border-[--primary]" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[--foreground] leading-snug">{check.label}</p>
                      {check.hint && <p className="text-[10px] text-[--muted-foreground] leading-snug">{check.hint}</p>}
                    </div>
                    <ArrowRight className="h-3 w-3 text-[--muted-foreground] shrink-0 mt-0.5 ml-auto group-hover:text-[--primary]" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verfügbarkeits-Toggle */}
      {anbieter?.id && (
        <VerfuegbarkeitToggle
          anbieterId={anbieter.id}
          initialVerfuegbarkeit={anbieter.verfuegbarkeit ?? null}
        />
      )}

      {/* Schnellaktionen */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(offeneAnfragen ?? 0) > 0 && (
          <Link href="/anbieter/anfragen?status=offen">
            <Button size="sm" className="gap-1.5 relative">
              <MessageSquare className="h-3.5 w-3.5" />
              Anfragen bearbeiten
              <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white text-[--primary] text-xs font-bold h-4.5 min-w-[1.1rem] px-1 leading-none">
                {offeneAnfragen}
              </span>
            </Button>
          </Link>
        )}
        <Link href="/anbieter/leistungen">
          <Button variant="outline" size="sm" className="gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" /> Leistung hinzufügen
          </Button>
        </Link>
        <Link href={`/anbieter/${anbieter?.id}`} target="_blank">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Öffentliches Profil
          </Button>
        </Link>
        <Link href="/anbieter/anfragen">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Rechnungen
          </Button>
        </Link>
        <Link href="/anbieter/statistiken">
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" /> Statistiken
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: MessageSquare, label: "Offene Anfragen",   wert: offeneAnfragen ?? 0,   farbe: "#FEF9E7", link: "/anbieter/anfragen" },
          { icon: Package,       label: "Aktive Leistungen", wert: leistungen?.length ?? 0, farbe: "#D5F5E3", link: "/anbieter/leistungen" },
          { icon: BarChart2,     label: "Anfragen gesamt",   wert: gesamt,                  farbe: "#D6EAF8", link: "/anbieter/anfragen" },
          { icon: TrendingUp,    label: "Antwortrate",        wert: `${antwortrate}%`,       farbe: antwortrate >= 80 ? "#D5F5E3" : "#FEF9E7", link: "/anbieter/anfragen" },
        ].map((k) => (
          <Link key={k.label} href={k.link}>
            <Card className="hover:shadow-md transition-all cursor-pointer h-full">
              <CardContent className="p-5">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                  style={{ background: k.farbe }}
                >
                  <k.icon className="h-4.5 w-4.5 text-[--primary]" />
                </div>
                <p className="text-2xl font-bold">{k.wert}</p>
                <p className="text-sm text-[--muted-foreground]">{k.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Trend-Zeile */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[--muted-foreground]">Diese Woche</p>
            <p className="text-xl font-bold text-[--foreground]">{anfragenDieseWoche ?? 0}</p>
            <p className="text-xs text-[--muted-foreground]">Neue Anfragen</p>
          </div>
          <Zap className="h-8 w-8 text-amber-400 opacity-60 shrink-0" />
        </div>
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[--muted-foreground]">Dieser Monat</p>
            <p className="text-xl font-bold text-[--foreground]">{dieserMonat}</p>
            <p className={`text-xs font-medium ${trendPositiv ? "text-green-600" : "text-red-500"}`}>
              {trendProzent > 0 ? "+" : ""}{trendProzent}% ggü. Vormonat
            </p>
          </div>
          <TrendingUp className={`h-8 w-8 shrink-0 opacity-60 ${trendPositiv ? "text-green-500" : "text-red-400"}`} />
        </div>
        <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[--muted-foreground]">Antwortrate</p>
            <p className="text-xl font-bold text-[--foreground]">{antwortrate}%</p>
            <div className="mt-1 w-full bg-[--muted] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${antwortrate >= 80 ? "bg-green-500" : antwortrate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${antwortrate}%` }}
              />
            </div>
          </div>
          <BarChart2 className="h-8 w-8 text-blue-400 opacity-60 shrink-0" />
        </div>
      </div>

      {/* Profil-Aufruf Sparkline */}
      <div className="mb-8 rounded-xl border border-[--border] bg-[--card] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-[--muted-foreground]" />
              Profilbesuche – letzte 7 Tage
            </p>
            <p className="text-xs text-[--muted-foreground]">{aufrufeGesamt7d} Aufrufe gesamt</p>
          </div>
          <Link href="/anbieter/statistiken">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              Details <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="flex items-end gap-1.5 h-14">
          {aufrufeSparkline.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-[--primary] opacity-80 transition-all min-h-[3px]"
                style={{ height: `${Math.max((d.count / maxAufruf) * 48, d.count > 0 ? 3 : 0)}px` }}
                title={`${d.day}: ${d.count} Aufrufe`}
              />
              <span className="text-[10px] text-[--muted-foreground] leading-none">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Anfragen-Funnel Statistik-Card */}
      {gesamt > 0 && (
        <div className="mb-8 rounded-xl border border-[--border] bg-[--card] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">Anfragen-Übersicht</p>
              <p className="text-xs text-[--muted-foreground]">{gesamt} Anfragen insgesamt · {conversionRate}% Abschlussquote</p>
            </div>
            <Link href="/anbieter/anfragen">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                Alle ansehen <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Offen", count: funnelOffen, color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50", href: "/anbieter/anfragen?status=offen" },
              { label: "In Bearbeitung", count: funnelInBearbeitung, color: "bg-blue-400", textColor: "text-blue-700", bg: "bg-blue-50", href: "/anbieter/anfragen?status=in_bearbeitung" },
              { label: "Angeboten", count: funnelAngeboten, color: "bg-purple-400", textColor: "text-purple-700", bg: "bg-purple-50", href: "/anbieter/anfragen?status=angeboten" },
              { label: "Bestätigt", count: funnelBestaetigt, color: "bg-green-500", textColor: "text-green-700", bg: "bg-green-50", href: "/anbieter/anfragen?status=bestaetigt" },
            ].map((step) => (
              <Link key={step.label} href={step.href}>
                <div className={`rounded-xl p-3 ${step.bg} hover:opacity-80 transition-opacity cursor-pointer`}>
                  <p className={`text-2xl font-bold ${step.textColor}`}>{step.count}</p>
                  <p className={`text-xs font-medium ${step.textColor} opacity-80 mt-0.5`}>{step.label}</p>
                  <div className="mt-2 w-full bg-white/50 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full ${step.color}`}
                      style={{ width: gesamt > 0 ? `${Math.round((step.count / gesamt) * 100)}%` : "0%" }}
                    />
                  </div>
                  <p className={`text-[10px] ${step.textColor} opacity-60 mt-0.5`}>
                    {gesamt > 0 ? Math.round((step.count / gesamt) * 100) : 0}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bestätigte Anfragen – Kalender-Strip */}
      {(bestaetigte ?? []).length > 0 && (() => {
        // Group by date string (yyyy-mm-dd using updated_at as proxy for appointment date)
        type BestaetigteItem = NonNullable<typeof bestaetigte>[number];
        const grouped: Record<string, BestaetigteItem[]> = {};
        for (const a of bestaetigte!) {
          const dateKey = a.updated_at.slice(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(a);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sortedDates = Object.keys(grouped).sort();
        // Show next 14 days + any past ones without removal (already confirmed)
        const upcomingFirst = [
          ...sortedDates.filter((d) => new Date(d) >= today),
          ...sortedDates.filter((d) => new Date(d) < today),
        ];
        const displayDates = upcomingFirst.slice(0, 7);

        const formatDayLabel = (iso: string) => {
          const d = new Date(iso + "T00:00:00");
          const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
          if (diff === 0) return "Heute";
          if (diff === 1) return "Morgen";
          if (diff === -1) return "Gestern";
          return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
        };

        return (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-[--foreground]">
                <CalendarDays className="h-4 w-4 text-[--primary]" />
                Bestätigte Termine ({bestaetigte!.length})
              </h2>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/kalender/${anbieter?.id}.ics`}
                  download="xcare-kalender.ics"
                  className="inline-flex items-center gap-1 text-xs text-[--muted-foreground] hover:text-[--primary] transition-colors px-2 py-1 rounded-md hover:bg-[--muted]"
                  title="Als iCal exportieren"
                >
                  <CalendarDays className="h-3 w-3" /> iCal
                </a>
                <Link href="/anbieter/anfragen?status=bestaetigt">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Alle <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {displayDates.map((dateKey) => {
                const items = grouped[dateKey]!;
                const d = new Date(dateKey + "T00:00:00");
                const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                const isPast = diff < 0;
                const isToday = diff === 0;
                return (
                  <div
                    key={dateKey}
                    className={`shrink-0 w-44 rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                      isToday
                        ? "border-[--primary] bg-[--primary]/5"
                        : isPast
                          ? "border-[--border] bg-[--muted]/40 opacity-60"
                          : "border-[--border] bg-[--card]"
                    }`}
                  >
                    {/* Date header */}
                    <div className="flex items-center gap-1.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isToday ? "bg-[--primary] text-white" : "bg-[--muted] text-[--muted-foreground]"
                      }`}>
                        {d.getDate()}
                      </div>
                      <span className={`text-xs font-semibold truncate ${isToday ? "text-[--primary]" : "text-[--foreground]"}`}>
                        {formatDayLabel(dateKey)}
                      </span>
                    </div>

                    {/* Anfrage entries */}
                    <div className="space-y-1.5">
                      {items.slice(0, 3).map((a) => {
                        const fam = a.profiles as { vorname: string | null; nachname: string | null } | null;
                        return (
                          <Link key={a.id} href={`/anbieter/anfragen/${a.id}`}>
                            <div className="rounded-lg bg-[--muted]/60 hover:bg-[--muted] px-2.5 py-1.5 transition-colors cursor-pointer">
                              {fam && (
                                <p className="text-xs font-medium truncate flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5 text-[--muted-foreground] shrink-0" />
                                  {fam.vorname} {fam.nachname}
                                </p>
                              )}
                              <p className="text-[10px] text-[--muted-foreground] capitalize truncate mt-0.5">
                                {a.lebenslage.replace(/_/g, " ")}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                      {items.length > 3 && (
                        <p className="text-[10px] text-[--muted-foreground] text-center">
                          +{items.length - 3} weitere
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Letzte Anfragen */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Eingehende Anfragen</CardTitle>
              <Link href="/anbieter/anfragen">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Alle <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {anfragen && anfragen.length > 0 ? (
                <div className="space-y-2">
                  {anfragen.map((a) => (
                    <Link key={a.id} href={`/anbieter/anfragen/${a.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-[--border] hover:bg-[--muted] transition-colors cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <Clock className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium capitalize truncate">
                              {a.lebenslage.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-[--muted-foreground]">
                              {formatRelative(a.created_at)}
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
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[--muted-foreground]">
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Noch keine Anfragen</p>
                  <p className="text-xs mt-1">Vervollständigen Sie Ihr Profil für mehr Sichtbarkeit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Wiedervorlagen + Profil-Stärke + Bewertungen */}
        <div className="space-y-4">
          {/* Wiedervorlagen */}
          {(pendingWiedervorlagen ?? []).length > 0 && (() => {
            const todayStr = new Date().toISOString().split("T")[0];
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-500" />
                    Wiedervorlagen
                    <span className="ml-auto inline-flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {pendingWiedervorlagen!.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingWiedervorlagen!.map((w) => {
                    const overdue = w.faellig_am < todayStr;
                    const anfrageLebenslage = (w.anfragen as { lebenslage: string } | null)?.lebenslage ?? "";
                    const datum = new Date(w.faellig_am).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                    return (
                      <Link key={w.id} href={`/anbieter/anfragen/${w.anfrage_id}`}>
                        <div className={`flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[--muted] transition-colors cursor-pointer ${overdue ? "bg-red-50 border border-red-100" : "border border-[--border]"}`}>
                          <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${overdue ? "bg-red-500" : "bg-amber-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${overdue ? "text-red-700" : "text-[--foreground]"}`}>
                              {datum}{overdue ? " · überfällig" : ""}
                            </p>
                            {w.notiz ? (
                              <p className="text-xs text-[--muted-foreground] truncate">{w.notiz}</p>
                            ) : anfrageLebenslage ? (
                              <p className="text-xs text-[--muted-foreground] capitalize truncate">
                                {anfrageLebenslage.replace(/_/g, " ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* Bewertungen */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Bewertungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bewCount > 0 ? (
                <div>
                  <Link href={`/anbieter/${anbieter?.id}/bewertungen`} target="_blank" className="inline-block mb-2 hover:opacity-80">
                    <SterneDisplay average={avgSterne} count={bewCount} size="md" />
                  </Link>
                  <div className="mt-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const cnt = bewertungen?.filter((b) => b.sterne === s).length ?? 0;
                      const pct = bewCount > 0 ? (cnt / bewCount) * 100 : 0;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-right">{s}</span>
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[--muted-foreground] w-4 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-[--muted-foreground]">
                  <Star className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Noch keine Bewertungen</p>
                  <p className="text-xs mt-0.5 opacity-70">Abgeschlossene Anfragen generieren Bewertungen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
