import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { Clock, Users, TrendingUp, AlertCircle } from "lucide-react";

function formatRelativ(dateStr: string | null): string {
  if (!dateStr) return "Nie";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minuten = Math.floor(diff / 60_000);
  if (minuten < 1) return "Gerade eben";
  if (minuten < 60) return `vor ${minuten} Min.`;
  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `vor ${stunden} Std.`;
  const tage = Math.floor(stunden / 24);
  if (tage < 30) return `vor ${tage} ${tage === 1 ? "Tag" : "Tagen"}`;
  const monate = Math.floor(tage / 30);
  if (monate < 12) return `vor ${monate} ${monate === 1 ? "Monat" : "Monaten"}`;
  return `vor ${Math.floor(monate / 12)} ${Math.floor(monate / 12) === 1 ? "Jahr" : "Jahren"}`;
}

function aktivitaetsklasse(dateStr: string | null): string {
  if (!dateStr) return "bg-gray-100 text-gray-500";
  const tage = (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
  if (tage < 1) return "bg-green-100 text-green-700";
  if (tage < 7) return "bg-blue-50 text-blue-700";
  if (tage < 30) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-600";
}

export default async function AdminAktivitaetPage() {
  const adminClient = await createAdminClient();
  const supabase = await createClient();

  // Fetch all auth users (last_sign_in_at lives in auth.users)
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users ?? [];

  // Fetch all profiles for names + roles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, vorname, nachname, email, role");

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // Merge and sort by last_sign_in_at desc (nulls last)
  const rows = authUsers
    .map((u) => {
      const profile = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? "—",
        name: profile
          ? [profile.vorname, profile.nachname].filter(Boolean).join(" ") || null
          : null,
        role: profile?.role ?? "—",
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      };
    })
    .sort((a, b) => {
      if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
      if (!a.last_sign_in_at) return 1;
      if (!b.last_sign_in_at) return -1;
      return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
    });

  // Stats
  const heute = rows.filter(
    (r) => r.last_sign_in_at && (Date.now() - new Date(r.last_sign_in_at).getTime()) < 86_400_000
  ).length;
  const dieseWoche = rows.filter(
    (r) => r.last_sign_in_at && (Date.now() - new Date(r.last_sign_in_at).getTime()) < 7 * 86_400_000
  ).length;
  const nieGeloggt = rows.filter((r) => !r.last_sign_in_at).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aktivitäts-Log</h1>
        <p className="text-gray-500 text-sm mt-0.5">Letzte Login-Zeiten aller registrierten Nutzer</p>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{heute}</p>
            <p className="text-xs text-gray-500">Heute aktiv</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{dieseWoche}</p>
            <p className="text-xs text-gray-500">Diese Woche aktiv</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg text-gray-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{nieGeloggt}</p>
            <p className="text-xs text-gray-500">Noch nie eingeloggt</p>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Keine Nutzerdaten verfügbar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nutzer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rolle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Letzter Login</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registriert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800">
                        {row.name ?? row.email}
                      </p>
                      {row.name && (
                        <p className="text-xs text-gray-400">{row.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        row.role === "anbieter"
                          ? "bg-blue-50 text-blue-700"
                          : row.role === "admin"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-rose-50 text-rose-600"
                      }`}>
                        {row.role === "anbieter" ? "Anbieter" : row.role === "admin" ? "Admin" : row.role === "familie" ? "Familie" : row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${aktivitaetsklasse(row.last_sign_in_at)}`}>
                        <Clock className="h-3 w-3" />
                        {formatRelativ(row.last_sign_in_at)}
                      </span>
                      {row.last_sign_in_at && (
                        <p className="text-[10px] text-gray-400 mt-0.5 pl-0.5">
                          {new Date(row.last_sign_in_at).toLocaleString("de-DE", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400">
                      {new Date(row.created_at).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{rows.length} Nutzer gesamt</p>
        </div>
      </div>
    </div>
  );
}
