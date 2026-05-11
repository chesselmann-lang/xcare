"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Pencil, Plus, X } from "lucide-react";

interface AvvPartner {
  id: string;
  name: string;
  dienst: string;
  avv_unterzeichnet: boolean;
  unterzeichnet_am: string | null;
  naechste_pruefung: string | null;
  notizen: string | null;
  created_at: string;
}

interface EditForm {
  avv_unterzeichnet: boolean;
  unterzeichnet_am: string;
  naechste_pruefung: string;
  notizen: string;
  name: string;
  dienst: string;
}

const leereForm = (): EditForm => ({
  avv_unterzeichnet: false,
  unterzeichnet_am: "",
  naechste_pruefung: "",
  notizen: "",
  name: "",
  dienst: "",
});

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE");
}

export function AvvTabelle() {
  const [partner, setPartner] = useState<AvvPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(leereForm());
  const [neuForm, setNeuForm] = useState<EditForm>(leereForm());
  const [neuOffen, setNeuOffen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/compliance/avv");
    if (res.ok) setPartner(await res.json() as AvvPartner[]);
    setLoading(false);
  }, []);

  useEffect(() => { void laden(); }, [laden]);

  const bearbeitenStarten = (p: AvvPartner) => {
    setEditId(p.id);
    setEditForm({
      avv_unterzeichnet: p.avv_unterzeichnet,
      unterzeichnet_am: p.unterzeichnet_am ?? "",
      naechste_pruefung: p.naechste_pruefung ?? "",
      notizen: p.notizen ?? "",
      name: p.name,
      dienst: p.dienst,
    });
  };

  const speichern = async () => {
    if (!editId) return;
    setSaving(true);
    setFehler(null);
    const res = await fetch("/api/admin/compliance/avv", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId,
        ...editForm,
        unterzeichnet_am: editForm.unterzeichnet_am || null,
        naechste_pruefung: editForm.naechste_pruefung || null,
        notizen: editForm.notizen || null,
      }),
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

  const neuAnlegen = async () => {
    setSaving(true);
    setFehler(null);
    const res = await fetch("/api/admin/compliance/avv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...neuForm,
        unterzeichnet_am: neuForm.unterzeichnet_am || null,
        naechste_pruefung: neuForm.naechste_pruefung || null,
        notizen: neuForm.notizen || null,
      }),
    });
    if (res.ok) {
      setNeuOffen(false);
      setNeuForm(leereForm());
      await laden();
    } else {
      const d = await res.json() as { error?: string };
      setFehler(d.error ?? "Fehler beim Anlegen");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Lade AVV-Partner...</div>;
  }

  return (
    <div className="space-y-4">
      {fehler && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{fehler}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dienst</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unterzeichnet am</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nächste Prüfung</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {partner.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">Keine AVV-Partner eingetragen</td>
              </tr>
            )}
            {partner.map((p) => (
              <>
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.dienst}</td>
                  <td className="px-4 py-3">
                    {p.avv_unterzeichnet ? (
                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" /> Unterzeichnet
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="flex items-center gap-1 w-fit">
                        <XCircle className="h-3 w-3" /> Ausstehend
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.unterzeichnet_am)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(p.naechste_pruefung)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => bearbeitenStarten(p)}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Bearbeiten
                    </Button>
                  </td>
                </tr>

                {/* Inline-Edit-Modal */}
                {editId === p.id && (
                  <tr key={`${p.id}-edit`}>
                    <td colSpan={6} className="px-4 py-4 bg-blue-50 border-t border-b border-blue-100">
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-700 text-sm">Partner bearbeiten</span>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Partner-Name</label>
                            <input
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Dienst</label>
                            <input
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                              value={editForm.dienst}
                              onChange={(e) => setEditForm((f) => ({ ...f, dienst: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Unterzeichnet am</label>
                            <input
                              type="date"
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                              value={editForm.unterzeichnet_am}
                              onChange={(e) => setEditForm((f) => ({ ...f, unterzeichnet_am: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nächste Prüfung</label>
                            <input
                              type="date"
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                              value={editForm.naechste_pruefung}
                              onChange={(e) => setEditForm((f) => ({ ...f, naechste_pruefung: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
                            <textarea
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none"
                              rows={2}
                              value={editForm.notizen}
                              onChange={(e) => setEditForm((f) => ({ ...f, notizen: e.target.value }))}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`avv-${p.id}`}
                              checked={editForm.avv_unterzeichnet}
                              onChange={(e) => setEditForm((f) => ({ ...f, avv_unterzeichnet: e.target.checked }))}
                              className="rounded"
                            />
                            <label htmlFor={`avv-${p.id}`} className="text-sm text-gray-700">AVV unterzeichnet</label>
                          </div>
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

      {/* Neuer Partner */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {!neuOffen ? (
          <button
            onClick={() => setNeuOffen(true)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 w-full rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> Neuen AVV-Partner anlegen
          </button>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 text-sm">Neuen Partner anlegen</span>
              <button onClick={() => setNeuOffen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Partner-Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="z.B. Vercel Inc."
                  value={neuForm.name}
                  onChange={(e) => setNeuForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dienst *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  placeholder="z.B. Vercel (Deployment)"
                  value={neuForm.dienst}
                  onChange={(e) => setNeuForm((f) => ({ ...f, dienst: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unterzeichnet am</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  value={neuForm.unterzeichnet_am}
                  onChange={(e) => setNeuForm((f) => ({ ...f, unterzeichnet_am: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nächste Prüfung</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  value={neuForm.naechste_pruefung}
                  onChange={(e) => setNeuForm((f) => ({ ...f, naechste_pruefung: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notizen</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm resize-none"
                  rows={2}
                  value={neuForm.notizen}
                  onChange={(e) => setNeuForm((f) => ({ ...f, notizen: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="neu-avv"
                  checked={neuForm.avv_unterzeichnet}
                  onChange={(e) => setNeuForm((f) => ({ ...f, avv_unterzeichnet: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="neu-avv" className="text-sm text-gray-700">AVV unterzeichnet</label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={neuAnlegen} disabled={saving || !neuForm.name || !neuForm.dienst}>
                {saving ? "Anlegen..." : "Anlegen"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setNeuOffen(false); setNeuForm(leereForm()); }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
