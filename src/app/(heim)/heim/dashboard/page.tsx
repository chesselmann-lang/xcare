import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Users, Building2, Star, UserCheck, ClipboardList,
  ArrowRight, CheckCircle2, AlertCircle, Sun, Moon, Sunset,
} from "lucide-react";

export const metadata = { title: "Heim-Dashboard — xcare OS" };

const SCHICHT_CONFIG = {
  frueh: { label: "Frühschicht", icon: Sun, color: "text-amber-600", bg: "bg-amber-50" },
  spaet: { label: "Spätschicht", icon: Sunset, color: "text-orange-600", bg: "bg-orange-50" },
  nacht: { label: "Nachtschicht", icon: Moon, color: "text-indigo-600", bg: "bg-indigo-50" },
  bereitschaft: { label: "Bereitschaft", icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-50" },
} as const;

type SchichtKey = keyof typeof SCHICHT_CONFIG;

export default async function HeimDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load Einrichtung for this user (as Leiter)
  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("id, name, typ, max_plaetze, belegte_plaetze, mdk_note, letzte_pruefung")
    .eq("leiter_user_id", user.id)
    .maybeSingle();

  // Also check if user is a Mitarbeiter (not leiter)
  const { data: mitarbeiterEinrichtung } = !einrichtung
    ? await supabase
        .from("einrichtungen")
        .select("id, name, typ, max_plaetze, belegte_plaetze, mdk_note")
        .in(
          "id",
          (
            await supabase
              .from("dienstplan")
              .select("einrichtung_id")
              .eq("mitarbeiter_id", user.id)
          ).data?.map((d) => d.einrichtung_id) ?? []
        )
        .maybeSingle()
    : { data: null };

  const heim = einrichtung ?? mitarbeiterEinrichtung;
  if (!heim) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [
    { count: bewohnerGesamt },
    { count: bewohnerKritisch },
    { data: dienstplanHeute },
    { data: dienstplanMorgen },
  ] = await Promise.all([
    supabase
      .from("bewohner")
      .select("*", { count: "exact", head: true })
      .eq("einrichtung_id", heim.id)
      .eq("status", "aktiv"),
    supabase
      .from("bewohner")
      .select("*", { count: "exact", head: true })
      .eq("einrichtung_id", heim.id)
      .in("status", ["krank", "krankenhaus"]),
    supabase
      .from("dienstplan")
      .select("id, schicht, status, geplant_von, geplant_bis, mitarbeiter_id")
      .eq("einrichtung_id", heim.id)
      .eq("datum", today)
      .neq("status", "abwesend")
      .order("geplant_von", { ascending: true }),
    supabase
      .from("dienstplan")
      .select("id, schicht, status, geplant_von, geplant_bis")
      .eq("einrichtung_id", heim.id)
      .eq("datum", tomorrow)
      .order("geplant_von", { ascending: true }),
  ]);

  const maxPlaetze = heim.max_plaetze ?? 30;
  const belegte = heim.belegte_plaetze ?? bewohnerGesamt ?? 0;
  const belegungsRate = maxPlaetze > 0 ? Math.round((belegte / maxPlaetze) * 100) : 0;
  const heuteImDienst = (dienstplanHeute ?? []).length;

  // Group dienstplan by schicht
  type DienstplanItem = NonNullable<typeof dienstplanHeute>[number];
  const bySchicht = (list: DienstplanItem[]) =>
    list.reduce<Record<string, DienstplanItem[]>>((acc, d) => {
      const key = d.schicht as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    }, {});

  const heuteBySchicht = bySchicht(dienstplanHeute ?? []);
  const morgenBySchicht = bySchicht(dienstplanMorgen ?? []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{heim.name}</h1>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">
          {heim.typ?.replace("_", " ")} · xcare OS
        </p>
      </div>

      {/* Belegungsrate */}
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
              Belegungsrate
            </p>
            <p className="text-5xl font-extrabold text-white">{belegungsRate}%</p>
            <p className="text-slate-400 text-sm mt-1">
              {belegte} von {maxPlaetze} Plätzen belegt
            </p>
          </div>
          <div className="text-right">
            {belegungsRate >= 90 ? (
              <span className="inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" /> Fast voll
              </span>
            ) : belegungsRate >= 70 ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full">
                Gut belegt
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" /> Kapazität verfügbar
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${
              belegungsRate >= 90
                ? "bg-red-500"
                : belegungsRate >= 70
                ? "bg-amber-400"
                : "bg-green-500"
            }`}
            style={{ width: `${belegungsRate}%` }}
          />
        </div>
      </div>

      {/* KPI Kacheln */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            icon: Users,
            label: "Belegte Plätze",
            value: belegte,
            sub: `von ${maxPlaetze} gesamt`,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            icon: Star,
            label: "MDK-Note",
            value: heim.mdk_note ? heim.mdk_note.toFixed(1) : "–",
            sub: heim.letzte_pruefung
              ? `Geprüft ${new Date(heim.letzte_pruefung).toLocaleDateString("de-DE", { month: "short", year: "numeric" })}`
              : "Keine Prüfung",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            icon: UserCheck,
            label: "Heute im Dienst",
            value: heuteImDienst,
            sub: "Mitarbeiter",
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            icon: AlertCircle,
            label: "Bewohner kritisch",
            value: bewohnerKritisch ?? 0,
            sub: "krank / Krankenhaus",
            color: (bewohnerKritisch ?? 0) > 0 ? "text-red-400" : "text-slate-400",
            bg: (bewohnerKritisch ?? 0) > 0 ? "bg-red-500/10" : "bg-slate-700",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-slate-800 border border-slate-700 p-5"
          >
            <div className={`h-9 w-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
              <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs font-medium text-slate-300 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Dienstplan-Vorschau */}
      <div className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            Dienstplan
          </h2>
          <Link href="/heim/dienstplan" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
            Alle ansehen <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Heute */}
        <div className="px-5 py-3 border-b border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Heute</p>
          {Object.keys(heuteBySchicht).length > 0 ? (
            <div className="space-y-2">
              {(Object.entries(heuteBySchicht) as [SchichtKey, DienstplanItem[]][]).map(([schicht, eintraege]) => {
                const cfg = SCHICHT_CONFIG[schicht] ?? SCHICHT_CONFIG.bereitschaft;
                const Icon = cfg.icon;
                return (
                  <div key={schicht} className="flex items-center gap-3 rounded-xl bg-slate-700/50 px-3 py-2.5">
                    <div className={`h-7 w-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{cfg.label}</p>
                      <p className="text-xs text-slate-400">
                        {eintraege[0]?.geplant_von?.slice(0, 5) ?? "–"} – {eintraege[0]?.geplant_bis?.slice(0, 5) ?? "–"} Uhr
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      {eintraege.length}x
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">Kein Dienstplan für heute hinterlegt.</p>
          )}
        </div>

        {/* Morgen */}
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Morgen</p>
          {Object.keys(morgenBySchicht).length > 0 ? (
            <div className="space-y-2">
              {(Object.entries(morgenBySchicht) as [SchichtKey, NonNullable<typeof dienstplanMorgen>[number][]][]).map(([schicht, eintraege]) => {
                const cfg = SCHICHT_CONFIG[schicht] ?? SCHICHT_CONFIG.bereitschaft;
                const Icon = cfg.icon;
                return (
                  <div key={schicht} className="flex items-center gap-3 rounded-xl bg-slate-700/30 px-3 py-2.5">
                    <div className={`h-7 w-7 rounded-lg ${cfg.bg} opacity-70 flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-300">{cfg.label}</p>
                      <p className="text-xs text-slate-500">
                        {eintraege[0]?.geplant_von?.slice(0, 5) ?? "–"} – {eintraege[0]?.geplant_bis?.slice(0, 5) ?? "–"} Uhr
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      {eintraege.length}x
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">Noch kein Dienstplan für morgen.</p>
          )}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/heim/bewohner", label: "Bewohner", icon: Users, desc: "Stammdaten & Status" },
            { href: "/heim/dienstplan", label: "Dienstplan", icon: ClipboardList, desc: "Schichten verwalten" },
            { href: "/heim/qualitaet", label: "Qualitätssicherung", icon: Star, desc: "MDK, Audits" },
            { href: "/heim/dokumentation", label: "Dokumentation", icon: Building2, desc: "Berichte & Protokolle" },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}>
              <div className="rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-750 transition-all p-4 cursor-pointer group">
                <Icon className="h-5 w-5 text-slate-400 group-hover:text-white mb-2 transition-colors" />
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
