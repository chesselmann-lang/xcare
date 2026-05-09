import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package, MessageSquare, Building2, TrendingUp, ArrowRight,
  CheckCircle2, Clock, Star, AlertCircle, BarChart2, Zap,
  FileText, PlusCircle, Eye, Receipt,
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
  offen: "warning",
  in_bearbeitung: "default",
  angeboten: "default",
  bestaetigt: "success",
  abgelehnt: "destructive",
  abgeschlossen: "secondary",
};

function profilStaerke(anbieter: Record<string, unknown>): { score: number; tipps: string[] } {
  const checks: Array<{ field: keyof typeof anbieter; label: string; gewicht: number }> = [
    { field: "name",          label: "Name eingetragen",              gewicht: 10 },
    { field: "beschreibung",  label: "Beschreibung vorhanden",        gewicht: 20 },
    { field: "telefon",       label: "Telefonnummer hinterlegt",      gewicht: 10 },
    { field: "email",         label: "E-Mail-Adresse hinterlegt",     gewicht: 10 },
    { field: "website",       label: "Website eingetragen",           gewicht: 10 },
    { field: "logo_url",      label: "Logo hochgeladen",              gewicht: 15 },
    { field: "plz",           label: "Adresse vollständig",           gewicht: 15 },
    { field: "verifiziert",   label: "Profil verifiziert",            gewicht: 10 },
  ];

  let score = 0;
  const tipps: string[] = [];
  for (const c of checks) {
    if (anbieter[c.field]) score += c.gewicht;
    else tipps.push(c.label);
  }
  return { score, tipps: tipps.slice(0, 3) };
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

  const [
    { data: leistungen },
    { data: anfragen },
    { count: offeneAnfragen },
    { count: anfragenGesamt },
    { data: bewertungen },
    { count: anfragenDieseWoche },
    { count: anfragenDieserMonat },
    { count: anfragenLetzterMonat },
  ] = await Promise.all([
    supabase.from("leistungen").select("id, name, aktiv").eq("anbieter_id", anbieter?.id ?? "").eq("aktiv", true),
    supabase.from("anfragen").select("id, lebenslage, status, created_at").eq("anbieter_id", anbieter?.id ?? "").order("created_at", { ascending: false }).limit(5),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").eq("status", "offen"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("bewertungen").select("sterne").eq("anbieter_id", anbieter?.id ?? ""),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneWeekAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", oneMonthAgo),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("anbieter_id", anbieter?.id ?? "").gte("created_at", twoMonthsAgo).lt("created_at", oneMonthAgo),
  ]);

  const avgSterne = bewertungen && bewertungen.length > 0
    ? bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length : 0;
  const bewCount = bewertungen?.length ?? 0;

  const { score: profilScore, tipps: profilTipps } = anbieter ? profilStaerke(anbieter as Record<string, unknown>) : { score: 0, tipps: [] };

  // Antwortrate: (nicht-offen) / gesamt
  const gesamt = anfragenGesamt ?? 0;
  const bearbeitet = Math.max(0, gesamt - (offeneAnfragen ?? 0));
  const antwortrate = gesamt > 0 ? Math.round((bearbeitet / gesamt) * 100) : 100;

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

      {/* Profil-Vollständigkeit Banner */}
      {profilScore < 80 && profilTipps.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Ihr Profil ist zu {profilScore}% vollständig
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Vervollständigen Sie Ihr Profil, um mehr Anfragen zu erhalten. Noch fehlend:{" "}
              {profilTipps.join(", ")}.
            </p>
          </div>
          <Link href="/anbieter/profil" className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
              Jetzt vervollständigen
            </Button>
          </Link>
        </div>
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

        {/* Sidebar: Profil-Stärke + Bewertungen */}
        <div className="space-y-4">
          {/* Profilstärke */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Profilstärke
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-bold">{profilScore}%</span>
                <span className={`text-sm mb-0.5 font-medium ${
                  profilScore >= 80 ? "text-green-600" :
                  profilScore >= 50 ? "text-amber-600" : "text-red-500"
                }`}>
                  {profilScore >= 80 ? "Stark" : profilScore >= 50 ? "Mittel" : "Ausbaufähig"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all ${
                    profilScore >= 80 ? "bg-green-500" :
                    profilScore >= 50 ? "bg-amber-400" : "bg-red-400"
                  }`}
                  style={{ width: `${profilScore}%` }}
                />
              </div>
              {profilTipps.length > 0 && (
                <div className="space-y-1.5">
                  {profilTipps.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-xs text-[--muted-foreground]">
                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                  <Link href="/anbieter/profil">
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-7">
                      Profil verbessern
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

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
