import { createClient } from "@/lib/supabase/server";
import { Building2, Users, FileText, TrendingUp, Clock, CheckCircle2, AlertCircle, Star, BellRing, Images, CreditCard } from "lucide-react";
import Link from "next/link";

async function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  href,
  color = "blue",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  href?: string;
  color?: "blue" | "green" | "orange" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  const card = (
    <div className={`bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg border ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalAnbieter },
    { count: unverifiziert },
    { count: totalNutzer },
    { count: totalAnfragen },
    { count: offeneAnfragen },
    { count: bestaetigteAnfragen },
    { count: totalBewertungen },
    { count: gemeldete },
  ] = await Promise.all([
    supabase.from("anbieter").select("*", { count: "exact", head: true }).eq("aktiv", true),
    supabase.from("anbieter").select("*", { count: "exact", head: true }).eq("verifiziert", false).eq("aktiv", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("anfragen").select("*", { count: "exact", head: true }),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("status", "offen"),
    supabase.from("anfragen").select("*", { count: "exact", head: true }).eq("status", "bestaetigt"),
    supabase.from("bewertungen").select("*", { count: "exact", head: true }),
    supabase.from("bewertungen").select("*", { count: "exact", head: true }).eq("gemeldet", true),
  ]);

  // Recent unverified Anbieter
  const { data: neuAnbieter } = await supabase
    .from("anbieter")
    .select("id, name, created_at, verifiziert, plz, ort")
    .eq("aktiv", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent Anfragen
  const { data: recentAnfragen } = await supabase
    .from("anfragen")
    .select("id, lebenslage, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const statusColors: Record<string, string> = {
    offen: "bg-yellow-100 text-yellow-700",
    in_bearbeitung: "bg-blue-100 text-blue-700",
    angeboten: "bg-purple-100 text-purple-700",
    bestaetigt: "bg-green-100 text-green-700",
    abgelehnt: "bg-red-100 text-red-700",
    abgeschlossen: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Plattform-Übersicht auf einen Blick</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Anbieter gesamt" value={totalAnbieter ?? 0} icon={Building2} href="/admin/anbieter" color="blue" />
        <StatCard
          label="Unverifiziert"
          value={unverifiziert ?? 0}
          icon={AlertCircle}
          sub="Warten auf Freigabe"
          href="/admin/anbieter?filter=unverifiziert"
          color="orange"
        />
        <StatCard label="Nutzer gesamt" value={totalNutzer ?? 0} icon={Users} href="/admin/nutzer" color="purple" />
        <StatCard label="Anfragen gesamt" value={totalAnfragen ?? 0} icon={FileText} href="/admin/analytics" color="blue" />
        <StatCard label="Offene Anfragen" value={offeneAnfragen ?? 0} icon={Clock} color="orange" />
        <StatCard label="Bestätigte Anfragen" value={bestaetigteAnfragen ?? 0} icon={CheckCircle2} color="green" />
        <StatCard label="Bewertungen" value={totalBewertungen ?? 0} icon={Star} href="/admin/bewertungen" color="purple" />
        <StatCard
          label="Gemeldet"
          value={gemeldete ?? 0}
          icon={AlertCircle}
          sub="Bewertungen zur Prüfung"
          href="/admin/bewertungen?filter=gemeldet"
          color="orange"
        />
        <StatCard
          label="Wiedervorlagen"
          value="→"
          icon={BellRing}
          sub="Offene Follow-ups"
          href="/admin/wiedervorlagen"
          color="orange"
        />
        <StatCard
          label="Galerie"
          value="→"
          icon={Images}
          sub="Bilder moderieren"
          href="/admin/galerie"
          color="blue"
        />
        <StatCard
          label="Subscriptions"
          value="→"
          icon={CreditCard}
          sub="MRR & Plan-Verteilung"
          href="/admin/subscriptions"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Neue Anbieter */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Neue Anbieter</h2>
            <Link href="/admin/anbieter" className="text-sm text-blue-600 hover:underline">Alle →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {neuAnbieter?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Noch keine Anbieter</p>
            )}
            {neuAnbieter?.map((a) => (
              <Link key={a.id} href={`/admin/anbieter/${a.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.plz} {a.ort}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${a.verifiziert ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"}`}>
                  {a.verifiziert ? "Verifiziert" : "Ausstehend"}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Letzte Anfragen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Letzte Anfragen</h2>
            <Link href="/admin/analytics" className="text-sm text-blue-600 hover:underline">Alle →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAnfragen?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Noch keine Anfragen</p>
            )}
            {recentAnfragen?.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-800 capitalize">
                    {a.lebenslage.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusC