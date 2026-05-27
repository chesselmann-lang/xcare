import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RouteOptimizerClient } from "@/components/routing/RouteOptimizerClient";
import { MapPin, Route } from "lucide-react";

export const metadata = { title: "Tagesroute — xcare" };

export default async function TagesroutePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, plz, ort, strasse")
    .eq("profile_id", profile?.id)
    .maybeSingle();

  // Load today's confirmed bookings as seed addresses
  const today = new Date().toISOString().slice(0, 10);
  const { data: heutigeBuchungen } = await supabase
    .from("buchungen")
    .select("id, datum, zeit_von, zeit_bis, leistungsart, klient_adresse")
    .eq("anbieter_id", user.id)
    .eq("datum", today)
    .eq("status", "bestaetigt")
    .order("zeit_von", { ascending: true });

  const startAdresse = anbieter
    ? [anbieter.strasse, anbieter.plz, anbieter.ort].filter(Boolean).join(", ")
    : "";

  const buchungsAdressen = (heutigeBuchungen ?? [])
    .map((b) => b.klient_adresse as string | null)
    .filter((a): a is string => Boolean(a));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Route className="h-6 w-6 text-[--primary]" />
          <h1 className="text-2xl font-bold text-[--foreground]">Tagesroute optimieren</h1>
        </div>
        <p className="text-sm text-[--muted-foreground]">
          Planen Sie Ihre optimale Route zu allen heutigen Klienten.
        </p>
        {anbieter && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-[--muted-foreground]">
            <MapPin className="h-3.5 w-3.5" />
            Startpunkt: {startAdresse || `${anbieter.plz ?? ""} ${anbieter.ort ?? ""}`.trim() || "Nicht hinterlegt"}
          </div>
        )}
      </div>

      {/* Today's bookings info */}
      {(heutigeBuchungen ?? []).length > 0 && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {heutigeBuchungen!.length} bestätigte Buchung{heutigeBuchungen!.length !== 1 ? "en" : ""} heute
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Adressen wurden automatisch vorausgefüllt.
          </p>
        </div>
      )}

      <RouteOptimizerClient
        initialAdressen={buchungsAdressen}
        datum={today}
      />
    </div>
  );
}
