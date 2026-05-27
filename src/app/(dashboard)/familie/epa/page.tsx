import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Activity, AlertCircle, CheckCircle2, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EPADashboard } from "@/components/epa/EPADashboard";
import { EPAVerbindenForm } from "@/components/epa/EPAVerbindenForm";

export const metadata: Metadata = {
  title: "Elektronische Patientenakte (ePA) | xcare Familie",
  description:
    "Verknüpfen Sie Ihre elektronische Patientenakte für eine integrierte Pflegeübersicht.",
};

export default async function EPAPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "anbieter") redirect("/anbieter/dashboard");

  // ePA-Verbindung laden
  const { data: verbindung } = await supabase
    .from("epa_verbindungen")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Daten laden wenn verbunden
  const { data: medikamente } = verbindung
    ? await supabase
        .from("epa_medikamente")
        .select("*")
        .eq("user_id", user.id)
        .eq("aktiv", true)
        .order("verordnet_am", { ascending: false })
    : { data: null };

  const { data: diagnosen } = verbindung
    ? await supabase
        .from("epa_diagnosen")
        .select("*")
        .eq("user_id", user.id)
        .order("seit", { ascending: false })
    : { data: null };

  const isVerbunden = !!verbindung;
  const syncFehler = verbindung?.sync_status === "fehler";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
            <Activity className="h-6 w-6 text-[--primary]" />
            Elektronische Patientenakte
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Ihre ePA-Daten aus der Telematikinfrastruktur — Medikamente,
            Diagnosen und Vitalwerte auf einen Blick.
          </p>
        </div>
        {isVerbunden && (
          <Badge
            variant={syncFehler ? "destructive" : "success"}
            className="flex items-center gap-1.5 shrink-0"
          >
            {syncFehler ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {syncFehler ? "Sync-Fehler" : "Verbunden"}
          </Badge>
        )}
      </div>

      {/* Verbindungsstatus */}
      {!isVerbunden ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WifiOff className="h-5 w-5 text-[--muted-foreground]" />
              ePA noch nicht verbunden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[--muted-foreground]">
              Verbinden Sie Ihre elektronische Patientenakte (ePA), um
              Medikamentenpläne, Diagnosen und Vitalwerte direkt in xcare
              einzusehen. Ihre Daten werden verschlüsselt übertragen und
              ausschließlich lokal gespeichert.
            </p>
            <EPAVerbindenForm />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sync-Fehler Hinweis */}
          {syncFehler && verbindung.error_message && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive text-sm">
                    Letzter Sync fehlgeschlagen
                  </p>
                  <p className="text-xs text-[--muted-foreground] mt-1">
                    {verbindung.error_message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Letzter Sync */}
          {verbindung.letzter_sync && (
            <p className="text-xs text-[--muted-foreground]">
              Zuletzt synchronisiert:{" "}
              {new Date(verbindung.letzter_sync).toLocaleString("de-DE")}
            </p>
          )}

          {/* Haupt-Dashboard */}
          <EPADashboard
            medikamente={medikamente ?? []}
            diagnosen={diagnosen ?? []}
            syncStatus={verbindung.sync_status ?? "aktiv"}
            letzterSync={verbindung.letzter_sync ?? null}
          />
        </>
      )}
    </div>
  );
}
