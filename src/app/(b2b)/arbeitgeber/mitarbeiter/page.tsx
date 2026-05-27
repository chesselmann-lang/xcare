import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react";

export const metadata = { title: "Mitarbeiter verwalten | xcare for Business" };

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function MitarbeiterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: unternehmen } = await supabase
    .from("unternehmen")
    .select("id, name, max_mitarbeiter, aktive_mitarbeiter")
    .eq("admin_user_id", user.id)
    .single();

  if (!unternehmen) redirect("/arbeitgeber/registrieren");

  const { data: mitarbeiter } = await supabase
    .from("unternehmen_mitarbeiter")
    .select("id, rolle, status, beigetreten_am, user_id")
    .eq("unternehmen_id", unternehmen.id)
    .order("beigetreten_am", { ascending: false });

  const { data: einladungen } = await supabase
    .from("mitarbeiter_einladungen")
    .select("id, email, name, status, created_at, expires_at")
    .eq("unternehmen_id", unternehmen.id)
    .order("created_at", { ascending: false });

  const pendingEinladungen = einladungen?.filter((e) => e.status === "ausstehend") ?? [];
  const istVoll = (unternehmen.aktive_mitarbeiter ?? 0) >= unternehmen.max_mitarbeiter;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unternehmen.aktive_mitarbeiter ?? 0} von {unternehmen.max_mitarbeiter} Lizenzen genutzt
          </p>
        </div>
        {istVoll ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Lizenzlimit erreicht. Bitte upgraden.
          </div>
        ) : (
          <form action="/api/b2b/einladen" method="POST" className="flex items-center gap-2">
            {/* Client-side modal trigger — falls back to a simple inline form */}
            <Link
              href="/arbeitgeber/mitarbeiter/einladen"
              className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-4 h-4" />
              Mitarbeiter einladen
            </Link>
          </form>
        )}
      </div>

      {/* License bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Lizenznutzung</span>
          <span className="text-sm text-gray-500">
            {unternehmen.aktive_mitarbeiter ?? 0} / {unternehmen.max_mitarbeiter}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-[--primary] h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(100, ((unternehmen.aktive_mitarbeiter ?? 0) / unternehmen.max_mitarbeiter) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Mitarbeiter table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Aktive Mitarbeiter ({mitarbeiter?.length ?? 0})
          </h2>
        </div>

        {!mitarbeiter || mitarbeiter.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Noch keine Mitarbeiter vorhanden.</p>
            <p className="text-xs text-gray-400 mt-1">
              Laden Sie Mitarbeiter per E-Mail ein, um loszulegen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nutzer
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Rolle
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Beigetreten
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mitarbeiter.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[--primary]/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-[--primary]" />
                        </div>
                        <span className="text-gray-700 font-medium text-xs text-gray-400 font-mono">
                          {m.user_id.slice(0, 8)}…
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-gray-700">{m.rolle}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {formatDate(m.beigetreten_am)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          m.status === "aktiv"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {m.status === "aktiv" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {m.status === "aktiv" ? "Aktiv" : "Deaktiviert"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <form action={`/api/b2b/mitarbeiter/${m.id}/deaktivieren`} method="POST">
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          {m.status === "aktiv" ? "Deaktivieren" : "Aktivieren"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending invitations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            Ausstehende Einladungen ({pendingEinladungen.length})
          </h2>
        </div>

        {pendingEinladungen.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine ausstehenden Einladungen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    E-Mail
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Eingeladen am
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ablaufdatum
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingEinladungen.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-700">{e.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{e.name ?? "–"}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(e.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-amber-600">
                        <Clock className="w-3 h-3" />
                        {formatDate(e.expires_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <form action={`/api/b2b/einladungen/${e.id}/zurueckziehen`} method="POST">
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:text-red-700 hover:underline"
                        >
                          Einladung zurückziehen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
