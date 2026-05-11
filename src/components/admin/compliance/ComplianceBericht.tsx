import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, Trash2, Users, Server } from "lucide-react";

function StatCard({
  icon: Icon,
  titel,
  wert,
  sub,
  status,
}: {
  icon: React.ElementType;
  titel: string;
  wert: string;
  sub: string;
  status: "ok" | "warnung" | "kritisch";
}) {
  const statusStyle = {
    ok: "border-green-200 bg-green-50",
    warnung: "border-amber-200 bg-amber-50",
    kritisch: "border-red-200 bg-red-50",
  }[status];

  const iconStyle = {
    ok: "bg-green-100 text-green-700",
    warnung: "bg-amber-100 text-amber-700",
    kritisch: "bg-red-100 text-red-700",
  }[status];

  const wertStyle = {
    ok: "text-green-800",
    warnung: "text-amber-800",
    kritisch: "text-red-800",
  }[status];

  return (
    <div className={`rounded-xl border p-5 ${statusStyle}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${iconStyle} shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600">{titel}</p>
          <p className={`text-2xl font-bold mt-1 ${wertStyle}`}>{wert}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export async function ComplianceBericht() {
  const supabase = await createClient();

  const [
    { data: avvPartner },
    { data: loeschanfragenOffen },
    { data: loeschanfragenErledigt },
    { count: nutzerGesamt },
    { count: nutzerAktiv30 },
  ] = await Promise.all([
    supabase.from("avv_partner").select("avv_unterzeichnet"),
    supabase.from("dsgvo_loeschanfragen").select("id").in("status", ["offen", "in_bearbeitung"]),
    supabase.from("dsgvo_loeschanfragen").select("id").eq("status", "erledigt"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const avvGesamt = avvPartner?.length ?? 0;
  const avvUnterzeichnet = avvPartner?.filter((p) => p.avv_unterzeichnet).length ?? 0;
  const avvOffen = avvGesamt - avvUnterzeichnet;

  const loeschanfragenOffenCount = loeschanfragenOffen?.length ?? 0;
  const loeschanfragenErledigtCount = loeschanfragenErledigt?.length ?? 0;

  const avvStatus: "ok" | "warnung" | "kritisch" =
    avvOffen === 0 ? "ok" : avvOffen <= 2 ? "warnung" : "kritisch";

  const dsgvoStatus: "ok" | "warnung" | "kritisch" =
    loeschanfragenOffenCount === 0 ? "ok" :
    loeschanfragenOffenCount <= 3 ? "warnung" : "kritisch";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={ShieldCheck}
          titel="AVV-Status"
          wert={`${avvUnterzeichnet} / ${avvGesamt}`}
          sub={`${avvOffen} Vertrag${avvOffen !== 1 ? "e" : ""} noch ausstehend`}
          status={avvStatus}
        />
        <StatCard
          icon={Trash2}
          titel="DSGVO-Löschanfragen"
          wert={String(loeschanfragenOffenCount)}
          sub={`${loeschanfragenErledigtCount} erledigt (gesamt)`}
          status={dsgvoStatus}
        />
        <StatCard
          icon={Users}
          titel="Nutzer-Übersicht"
          wert={String(nutzerGesamt ?? 0)}
          sub={`${nutzerAktiv30 ?? 0} aktiv in den letzten 30 Tagen`}
          status="ok"
        />
        <StatCard
          icon={Server}
          titel="Plattform-Info"
          wert="v2.0.0"
          sub="Letzte Migration: 2026-05-11"
          status="ok"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">AVV-Detailansicht</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{avvGesamt}</p>
            <p className="text-xs text-gray-400 mt-1">Partner gesamt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{avvUnterzeichnet}</p>
            <p className="text-xs text-gray-400 mt-1">Unterzeichnet</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${avvOffen > 0 ? "text-amber-600" : "text-gray-400"}`}>
              {avvOffen}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ausstehend</p>
          </div>
        </div>
      </div>
    </div>
  );
}
