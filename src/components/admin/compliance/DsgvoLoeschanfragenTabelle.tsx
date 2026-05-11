"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Loeschanfrage {
  id: string;
  email: string;
  status: "offen" | "in_bearbeitung" | "erledigt" | "abgelehnt";
  angefragt_am: string;
  erledigt_am: string | null;
  notizen: string | null;
  profil_id: string | null;
  profiles: {
    vorname: string | null;
    nachname: string | null;
    role: string;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  erledigt: "Erledigt",
  abgelehnt: "Abgelehnt",
};

type BadgeVariant = "destructive" | "warning" | "success" | "secondary";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  offen: "destructive",
  in_bearbeitung: "warning",
  erledigt: "success",
  abgelehnt: "secondary",
};

function formatDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export function DsgvoLoeschanfragenTabelle() {
  const [anfragen, setAnfragen] = useState<Loeschanfrage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editNotizen, setEditNotizen] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/compliance/loeschanfragen");
    if (res.ok) setAnfragen(await res.json() as Loeschanfrage[]);
    setLoading(false);
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  const bearbeitenStarten = (a: Loeschanfrage) => {
    setEditId(a.id);
    setEditStatus(a.status);
    setEditNotizen(a.notizen ?? "");
  };

  const speichern = async () => {
    if (!editId) return;
    setSaving(true);
    setFehler(null);
    const res = await fetch("/api/admin/compliance/loeschanfragen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, status: editStatus, notizen: editNotizen || null }),
    });
    if (res.ok) {
      setEditId(null);
      await laden();
    } else {
      const d = await res.json() as { error?: string };
      setFehler(d.error ?? "Fehler beim Speichern");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Lade Löschanfragen...</div>;
  }

  return (
    <div className="space-y-4">
      {fehler && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{fehler}</div>
      )}

      {anfragen.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 text-sm">
          Keine Löschanfragen vorhanden
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">E-Mail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Angefragt am</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Erledigt am</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notizen</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {anfragen.map((a) => (
                <>
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.email}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(a.angefragt_am)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(a.erledigt_am)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.notizen ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => bearbeitenStarten(a)}
                        disabled={a.status === "erledigt"}
                      >
                        Bearbeiten
                      </Button>
                    </td>
                  </tr>

                  {editId === a.id && (
                    <tr key={`${a.id}-edit`}>
                      <td colSpan={6} className="px-4 py-4 bg-amber-50 border-t border-b border-amber-100">
                        <div className="flex flex-wrap gap-4 items-end max-w-2xl">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                            <select
                              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                            >
                              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
                            <textarea
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none"
                              rows={2}
                              value={editNotizen}
                              onChange={(e) => setEditNotizen(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={speichern} disabled={saving}>
                              {saving ? "Speichert..." : "Speichern"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Abbrechen</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
