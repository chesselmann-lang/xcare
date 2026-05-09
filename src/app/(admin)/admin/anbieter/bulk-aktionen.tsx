"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Anbieter {
  id: string;
  name: string;
  verifiziert: boolean;
  aktiv: boolean;
}

export function BulkAktionen({ anbieter }: { anbieter: Anbieter[] }) {
  const supabase = createClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const toggleAll = () => {
    if (selected.size === anbieter.length) setSelected(new Set());
    else setSelected(new Set(anbieter.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkVerifizieren = async () => {
    if (selected.size === 0) return;
    setLoading("verifizieren");
    const ids = Array.from(selected);
    const { error } = await supabase.from("anbieter").update({ verifiziert: true }).in("id", ids);
    if (error) toast.error("Fehler beim Verifizieren");
    else { toast.success(`${ids.length} Anbieter verifiziert`); setSelected(new Set()); }
    setLoading(null);
  };

  const bulkDeaktivieren = async () => {
    if (selected.size === 0) return;
    setLoading("deaktivieren");
    const ids = Array.from(selected);
    const { error } = await supabase.from("anbieter").update({ aktiv: false }).in("id", ids);
    if (error) toast.error("Fehler beim Deaktivieren");
    else { toast.success(`${ids.length} Anbieter deaktiviert`); setSelected(new Set()); }
    setLoading(null);
  };

  const exportCsv = () => {
    const targets = selected.size > 0 ? anbieter.filter((a) => selected.has(a.id)) : anbieter;
    const header = "ID,Name,Verifiziert,Aktiv\r\n";
    const rows = targets.map((a) => `${a.id},${a.name},${a.verifiziert},${a.aktiv}`).join("\r\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "xcare-anbieter.csv"; link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  };

  return (
    <div className="mb-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.size === anbieter.length && anbieter.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 rounded"
          />
          Alle auswählen
        </label>
        {selected.size > 0 && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {selected.size} ausgewählt
          </span>
        )}
        <div className="flex-1" />
        {selected.size > 0 && (
          <>
            <button
              onClick={bulkVerifizieren}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              {loading === "verifizieren" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Verifizieren
            </button>
            <button
              onClick={bulkDeaktivieren}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              {loading === "deaktivieren" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Deaktivieren
            </button>
          </>
        )}
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-3 w-3" />
          {selected.size > 0 ? `${selected.size} exportieren` : "CSV exportieren"}
        </button>
      </div>

      {/* Checkbox column overlay: render checkboxes per row */}
      <div className="space-y-0.5">
        {anbieter.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={selected.has(a.id)}
              onChange={() => toggleOne(a.id)}
              className="w-4 h-4 rounded shrink-0"
              aria-label={`${a.name} auswählen`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
