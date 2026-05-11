// ============================================
// /anbieter/team/care-workers — Care-Worker Verwaltung
// Anbieter können hier ihre Pflegekräfte anlegen, bearbeiten und löschen.
// ============================================

import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Plus, Euro, MapPin, ShieldCheck, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CareWorkerForm } from "@/components/care-workers/CareWorkerForm";
import { CareWorkerCard } from "@/components/care-workers/CareWorkerCard";

export const metadata: Metadata = {
  title: "Pflegekräfte verwalten | xcare",
  description: "Ihre Care-Worker-Profile anlegen und verwalten.",
};

export default async function CareWorkersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!anbieter) redirect("/anbieter/profil");

  const { data: workers } = await supabase
    .from("care_workers")
    .select("*")
    .eq("anbieter_id", anbieter.id)
    .order("created_at", { ascending: false });

  const workerList = workers ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Pflegekräfte verwalten
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Legen Sie individuelle Profile für Ihre Mitarbeiterinnen und Mitarbeiter an.
            Familien können gezielt nach Qualifikationen, Sprachen und Standort suchen.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {workerList.length} Pflegekraft{workerList.length !== 1 ? "kräfte" : ""}
        </div>
      </div>

      {/* Stats */}
      {workerList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Gesamt"
            value={workerList.length}
            icon={<Users className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Aktiv"
            value={workerList.filter(w => w.aktiv).length}
            icon={<Star className="w-4 h-4" />}
            color="green"
          />
          <StatCard
            label="Mit Führungszeugnis"
            value={workerList.filter(w => w.fuehrungszeugnis_vorhanden).length}
            icon={<ShieldCheck className="w-4 h-4" />}
            color="purple"
          />
          <StatCard
            label="Ø Stundensatz"
            value={workerList.length > 0
              ? `${(workerList.reduce((s, w) => s + (w.stundensatz_ct ?? 0), 0) / workerList.length / 100).toFixed(2)} €`
              : "—"
            }
            icon={<Euro className="w-4 h-4" />}
            color="amber"
          />
        </div>
      )}

      {/* Neue Pflegekraft anlegen */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Neue Pflegekraft anlegen
        </h2>
        <CareWorkerForm anbieterName={anbieter.name} />
      </Card>

      {/* Bestehende Pflegekräfte */}
      {workerList.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ihre Pflegekräfte
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {workerList.map((w) => (
              <CareWorkerCard key={w.id} worker={w} showActions />
            ))}
          </div>
        </div>
      )}

      {workerList.length === 0 && (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">
            Noch keine Pflegekräfte angelegt.<br />
            Erstellen Sie das erste Profil mit dem Formular oben.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "amber";
}) {
  const colors = {
    blue:   "bg-blue-50 text-blue-700",
    green:  "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    amber:  "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </Card>
  );
}
