import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, FileSearch, BarChart3, Upload, CheckCircle, AlertCircle, Clock } from "lucide-react";

export const metadata = { title: "Träger-Dashboard | xcare" };

export default async function TraegerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, vorname, nachname, email")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "traeger") redirect("/");

  const { data: traeger } = await supabase
    .from("traeger_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  if (!traeger) {
    // Onboarding: Träger-Profil noch nicht angelegt
    redirect("/traeger/onboarding");
  }

  const [
    { count: klientenGesamt },
    { count: klientenAktiv },
    { data: recentPruefungen },
    { data: klienten },
  ] = await Promise.all([
    supabase.from("traeger_klienten").select("*", { count: "exact", head: true }).eq("traeger_id", traeger.id),
    supabase.from("traeger_klienten").select("*", { count: "exact", head: true }).eq("traeger_id", traeger.id).eq("status", "aktiv"),
    supabase.from("traeger_massenpruefungen").select("*").eq("traeger_id", traeger.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("traeger_klienten").select("*").eq("traeger_id", traeger.id).eq("status", "aktiv").order("updated_at", { ascending: false }).limit(10),
  ]);

  const klientenMitPruefung = (klienten ?? []).filter(k => k.letzte_pruefung_at).length;
  const auslastung = traeger.max_klienten > 0 ? Math.round(((klientenGesamt ?? 0) / traeger.max_klienten) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{traeger.organisation}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Träger-Dashboard · {traeger.typ === "kommune" ? "Kommune" : traeger.typ === "sozialamt" ? "Sozialamt" : "Sozialträger"} ·
            Plan: <span className="font-medium capitalize">{traeger.abo_plan}</span>
          </p>
        </div>
        <Link
          href="/traeger/klienten/neu"
          className="bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Neuer Klient
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Klienten gesamt",
            value: klientenGesamt ?? 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Aktive Fälle",
            value: klientenAktiv ?? 0,
            icon: CheckCircle,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Geprüfte Ansprüche",
            value: klientenMitPruefung,
            icon: FileSearch,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: `Kapazität (${auslastung}%)`,
            value: `${klientenGesamt ?? 0}/${traeger.max_klienten}`,
            icon: BarChart3,
            color: auslastung >= 90 ? "text-red-600" : "text-gray-600",
            bg: auslastung >= 90 ? "bg-red-50" : "bg-gray-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Aktuelle Klienten */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Zuletzt bearbeitet</h2>
            <Link href="/traeger/klienten" className="text-sm text-blue-600 hover:underline">Alle anzeigen</Link>
          </div>
          {(klienten ?? []).length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Noch keine Klienten angelegt</p>
              <Link href="/traeger/klienten/neu" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                Ersten Klienten anlegen →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(klienten ?? []).map((k) => (
                <Link key={k.id} href={`/traeger/klienten/${k.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {k.vorname ? `${k.vorname} ${k.nachname ?? ""}`.trim() : `Fall ${k.klienten_nr}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {k.lebenslage ?? "Keine Lebenslage"} {k.pflegegrad ? `· PG ${k.pflegegrad}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.letzte_pruefung_at ? (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Geprüft</span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Offen</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Massenprüfungen */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Massenprüfungen</h2>
            <Link href="/traeger/massenpruefung" className="text-sm text-blue-600 hover:underline">
              Neue Prüfung
            </Link>
          </div>
          {(recentPruefungen ?? []).length === 0 ? (
            <div className="text-center py-6">
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">CSV-Upload für Massenanspruchsprüfung</p>
              <Link href="/traeger/massenpruefung" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                CSV hochladen →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {(recentPruefungen ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.dateiname}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString("de-DE")} ·{" "}
                      {p.zeilen_gesamt} Zeilen
                    </p>
                  </div>
                  {p.status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : p.status === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/traeger/klienten/neu", label: "Klient anlegen", icon: Users },
          { href: "/traeger/massenpruefung", label: "CSV-Upload", icon: Upload },
          { href: "/traeger/klienten", label: "Alle Klienten", icon: FileSearch },
          { href: "/traeger/einstellungen", label: "Einstellungen", icon: BarChart3 },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-[--primary] hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
          >
            <item.icon className="h-4 w-4 text-[--primary]" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
