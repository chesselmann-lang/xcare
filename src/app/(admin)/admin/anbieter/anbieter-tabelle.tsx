"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2, CheckCircle2, AlertCircle, MapPin,
  Loader2, XCircle, Download, Search
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VerifizierungsButtons } from "./verifizierungs-buttons";

interface AnbieterRow {
  id: string;
  name: string;
  plz: string | null;
  ort: string | null;
  verifiziert: boolean;
  aktiv: boolean;
  created_at: string;
  profiles?: { email: string } | null;
}

export function AnbieterTabelle({ anbieter: initial }: { anbieter: AnbieterRow[] }) {
  const supabase = createClient();
  const [anbieter, setAnbieter] = useState<AnbieterRow[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = anbieter.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.ort ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.plz ?? "").includes(search) ||
      ((a.profiles as { email: string } | null)?.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };
  const toggleOne = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkUpdate = async (patch: Partial<AnbieterRow>, action: string) => {
    if (selected.size === 0) return;
    setLoading(action);
    const ids = Array.from(selected);
    const { error } = await supabase.from("anbieter").update(patch).in("id", ids);
    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      setAnbieter((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, ...patch } : a));
      setSelected(new Set());
      toast.success(`${ids.length} Anbieter aktualisiert`);
    }
    setLoading(null);
  };

  const exportCsv = () => {
    const targets = selected.size > 0 ? filtered.filter((a) => selected.has(a.id)) : filtered;
    const rows = [
      ["ID", "Name", "PLZ", "Ort", "E-Mail", "Verifiziert", "Aktiv", "Erstellt"],
      ...targets.map((a) => [
        a.id.slice(0, 8).toUpperCase(), a.name, a.plz ?? "", a.ort ?? "",
        (a.profiles as { email: string } | null)?.email ?? "",
        a.verifiziert ? "Ja" : "Nein",
        a.aktiv ? "Ja" : "Nein",
        new Date(a.created_at).toLocaleDateString("de-DE"),
      ]),
    ].map((r) => r.map((c) => `"${c}"`).join(",")).join("\r\n");

    const blob = new Blob([rows], { type: "text/csv; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "xcare-anbieter.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Anbieter suchen…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} Einträge</span>
        {selected.size > 0 && (
          <>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {selected.size} ausgewählt
            </span>
            <button
              onClick={() => bulkUpdate({ verifiziert: true }, "verifizieren")}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              {loading === "verifizieren" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Bulk-Verifizieren
            </button>
            <button
              onClick={() => bulkUpdate({ aktiv: false }, "deaktivieren")}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              {loading === "deaktivieren" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Bulk-Deaktivieren
            </button>
          </>
        )}
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          <Download className="h-3 w-3" />
          {selected.size > 0 ? `${selected.size} exportieren` : "CSV"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Keine Anbieter gefunden</p>
          </div>
        )}
        {/* Header */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="w-4 h-4 rounded"
              aria-label="Alle auswählen"
            />
            <span className="flex-1">Anbieter</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-24 text-center">Verifizierung</span>
            <span className="w-32 text-right">Aktionen</span>
          </div>
        )}
        <div className="divide-y divide-gray-50">
          {filtered.map((a) => {
            const profile = a.profiles as { email: string } | null;
            return (
              <div key={a.id} className={`flex items-center gap-3 px-5 py-4 transition-colors ${selected.has(a.id) ? "bg-blue-50/50" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggleOne(a.id)}
                  className="w-4 h-4 rounded shrink-0"
                  aria-label={`${a.name} auswählen`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{a.name}</p>
                    {a.verifiziert
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-orange-400 shrink-0" />
                    }
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {(a.plz || a.ort) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {a.plz} {a.ort}
                      </span>
                    )}
                    {profile?.email && <span>{profile.email}</span>}
                    <span>{new Date(a.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
                <span className={`w-20 text-center text-xs px-2.5 py-0.5 rounded-full font-medium ${a.aktiv ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {a.aktiv ? "Aktiv" : "Inaktiv"}
                </span>
                <span className={`w-24 text-center text-xs px-2.5 py-0.5 rounded-full font-medium ${a.verifiziert ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-600"}`}>
                  {a.verifiziert ? "Verifiziert" : "Ausstehend"}
                </span>
                <div className="w-32 flex items-center gap-2 justify-end shrink-0">
                  <VerifizierungsButtons
                    anbieterId={a.id}
                    isVerifiziert={a.verifiziert}
                    isAktiv={a.aktiv}
                  />
                  <Link href={`/admin/anbieter/${a.id}`} className="text-xs text-blue-600 hover:underline">
                    Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
