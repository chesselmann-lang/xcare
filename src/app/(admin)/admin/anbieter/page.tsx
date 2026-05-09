import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Download } from "lucide-react";
import { AnbieterTabelle } from "./anbieter-tabelle";

export const metadata = { title: "Anbieter – Admin xcare" };

interface SearchParams { filter?: string }

export default async function AdminAnbieterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("anbieter")
    .select("id, name, plz, ort, verifiziert, aktiv, created_at, profiles(email)")
    .order("created_at", { ascending: false });

  if (filter === "unverifiziert") query = query.eq("verifiziert", false).eq("aktiv", true);
  if (filter === "inaktiv") query = query.eq("aktiv", false);

  const { data: anbieter } = await query.limit(200);

  const tabs = [
    { label: "Alle", filter: undefined },
    { label: "Unverifiziert", filter: "unverifiziert" },
    { label: "Inaktiv", filter: "inaktiv" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anbieter</h1>
          <p className="text-gray-500 text-sm mt-0.5">{anbieter?.length ?? 0} Einträge geladen</p>
        </div>
        <a
          href="/api/admin/anbieter-export"
          download
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4 text-gray-500" />
          CSV exportieren
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.filter ? `/admin/anbieter?filter=${tab.filter}` : "/admin/anbieter"}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.filter
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AnbieterTabelle anbieter={anbieter ?? []} />
    </div>
  );
}
