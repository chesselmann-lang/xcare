import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Activity, Heart } from "lucide-react";
import { VitaldatenTracker } from "@/components/gesundheit/VitaldatenTracker";
import Link from "next/link";

export const metadata = {
  title: "Vitaldaten & Frühwarnungen | xcare Familie",
};

export default async function GesundheitVitaldatenPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/anbieter/dashboard");

  // Load unread Frühwarnungen
  const { data: fruehwarnungen } = await supabase
    .from("fruehwarnungen")
    .select("id, schweregrad, titel, beschreibung, kategorie, created_at")
    .eq("user_id", user.id)
    .eq("gelesen", false)
    .order("created_at", { ascending: false })
    .limit(5);

  // Load last 30 days vitaldaten
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: vitaldaten } = await supabase
    .from("vitaldaten")
    .select("id, typ, wert, einheit, gemessen_am, notizen")
    .eq("user_id", user.id)
    .gte("gemessen_am", thirtyDaysAgo)
    .order("gemessen_am", { ascending: false });

  // Group by type
  const grouped: Record<string, Array<{ id: string; wert: number; gemessen_am: string }>> = {};
  for (const row of vitaldaten ?? []) {
    if (!grouped[row.typ]) grouped[row.typ] = [];
    grouped[row.typ].push({ id: row.id, wert: Number(row.wert), gemessen_am: row.gemessen_am });
  }

  const schweregradColor: Record<string, string> = {
    niedrig: "bg-yellow-50 border-yellow-300 text-yellow-800",
    mittel: "bg-orange-50 border-orange-300 text-orange-800",
    hoch: "bg-red-50 border-red-300 text-red-800",
    kritisch: "bg-red-100 border-red-500 text-red-900",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Heart className="h-6 w-6 text-[--primary]" />
          Vitaldaten & Gesundheitsüberwachung
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-0.5">
          Tägliche Messwerte erfassen — die KI erkennt Trends und warnt frühzeitig.
        </p>
      </div>

      {/* Frühwarnungen Banner */}
      {fruehwarnungen && fruehwarnungen.length > 0 && (
        <div className="space-y-2">
          {fruehwarnungen.map((w) => (
            <div
              key={w.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${schweregradColor[w.schweregrad] ?? "bg-gray-50 border-gray-200 text-gray-800"}`}
            >
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{w.titel}</p>
                <p className="text-sm mt-0.5 opacity-90">{w.beschreibung}</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide opacity-70 flex-shrink-0">
                {w.schweregrad}
              </span>
            </div>
          ))}
          <p className="text-xs text-[--muted-foreground] px-1">
            KI-generierte Frühwarnungen basierend auf Ihren letzten 14 Tagen Messdaten.{" "}
            <span className="font-medium">Kein Ersatz für ärztlichen Rat.</span>
          </p>
        </div>
      )}

      {/* Quick entry + charts */}
      <VitaldatenTracker initialGrouped={grouped} />

      {/* Links */}
      <div className="flex gap-3 pt-2">
        <Link
          href="/familie/arztbrief"
          className="flex items-center gap-1.5 text-sm text-[--primary] hover:underline font-medium"
        >
          <Activity className="h-4 w-4" />
          KI-Arztbrief erstellen
        </Link>
      </div>
    </div>
  );
}
