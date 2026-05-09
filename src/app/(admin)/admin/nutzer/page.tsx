import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Building2, Heart, ArrowRight, Download } from "lucide-react";

export default async function AdminNutzerPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, vorname, nachname, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const anbieterCount = profiles?.filter((p) => p.role === "anbieter").length ?? 0;
  const familieCount = profiles?.filter((p) => p.role === "familie").length ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutzer</h1>
          <p className="text-gray-500 text-sm mt-0.5">{profiles?.length ?? 0} registrierte Nutzer</p>
        </div>
        <a
          href="/api/admin/nutzer-export"
          download
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4 text-gray-500" />
          CSV exportieren
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{anbieterCount}</p>
            <p className="text-xs text-gray-500">Anbieter</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{familieCount}</p>
            <p className="text-xs text-gray-500">Familien</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {profiles?.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Keine Nutzer gefunden</p>
          </div>
        )}
        <div className="divide-y divide-gray-50">
          {profiles?.map((p) => (
            <Link
              key={p.id}
              href={`/admin/nutzer/${p.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                  {p.vorname ? `${p.vorname} ${p.nachname ?? ""}`.trim() : p.email}
                </p>
                <p className="text-xs text-gray-400">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  p.role === "anbieter" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-600"
                }`}>
                  {p.role === "anbieter" ? "Anbieter" : "Familie"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(p.created_at).toLocaleDateString("de-DE")}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
