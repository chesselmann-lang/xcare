"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Mail, Plus, Trash2, Edit2, Save, X, Eye,
  EyeOff, ChevronDown, ChevronUp, Loader2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailTemplate {
  id: string;
  name: string;
  beschreibung: string | null;
  betreff: string;
  html: string;
  text: string | null;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

const VARIABLE_HINT = "Verfügbare Variablen: {{name}}, {{email}}, {{anbieter_name}}, {{anfrage_id}}, {{status}}, {{link}}";

const EMPTY_FORM = {
  name: "",
  beschreibung: "",
  betreff: "",
  html: "",
  text: "",
  aktiv: true,
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      if (!res.ok) throw new Error();
      setTemplates(await res.json());
    } catch {
      toast.error("Templates konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: EmailTemplate) {
    setEditId(t.id);
    setForm({
      name: t.name,
      beschreibung: t.beschreibung ?? "",
      betreff: t.betreff,
      html: t.html,
      text: t.text ?? "",
      aktiv: t.aktiv,
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    if (!form.name.trim() || !form.betreff.trim() || !form.html.trim()) {
      toast.error("Name, Betreff und HTML sind Pflichtfelder");
      return;
    }
    startTransition(async () => {
      try {
        const url = editId
          ? `/api/admin/email-templates?id=${editId}`
          : "/api/admin/email-templates";
        const method = editId ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            beschreibung: form.beschreibung || null,
            betreff: form.betreff,
            html: form.html,
            text: form.text || null,
            aktiv: form.aktiv,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success(editId ? "Template aktualisiert" : "Template erstellt");
        cancelForm();
        await load();
      } catch {
        toast.error("Speichern fehlgeschlagen");
      }
    });
  }

  function handleToggle(t: EmailTemplate) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/email-templates?id=${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aktiv: !t.aktiv }),
        });
        if (!res.ok) throw new Error();
        toast.success(t.aktiv ? "Deaktiviert" : "Aktiviert");
        await load();
      } catch {
        toast.error("Status konnte nicht geändert werden");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Template wirklich löschen?")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/email-templates?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Template gelöscht");
        await load();
      } catch {
        toast.error("Löschen fehlgeschlagen");
      }
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-[--primary]" />
            E-Mail-Templates
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Anpassbare E-Mail-Vorlagen für alle Systembenachrichtigungen
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={startCreate}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
              "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity"
            )}
          >
            <Plus className="h-4 w-4" />
            Neues Template
          </button>
        )}
      </div>

      {/* Variable hint */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">{VARIABLE_HINT}</p>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-[--border] bg-[--card] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {editId ? "Template bearbeiten" : "Neues Template erstellen"}
            </h2>
            <button
              type="button"
              onClick={cancelForm}
              className="text-[--muted-foreground] hover:text-[--foreground]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Name (eindeutiger Schlüssel) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={!!editId}
                placeholder="z.B. anfrage_eingegangen"
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]",
                  editId && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            {/* Betreff */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Betreff <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.betreff}
                onChange={(e) => setForm((f) => ({ ...f, betreff: e.target.value }))}
                placeholder="z.B. Neue Anfrage von {{name}}"
                className={cn(
                  "w-full rounded-lg border border-[--border] bg-[--background]",
                  "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]"
                )}
              />
            </div>
          </div>

          {/* Beschreibung */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Beschreibung{" "}
              <span className="text-[--muted-foreground] font-normal">(intern)</span>
            </label>
            <input
              type="text"
              value={form.beschreibung}
              onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
              placeholder="Wann wird dieses Template verwendet?"
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]"
              )}
            />
          </div>

          {/* HTML */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              HTML-Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.html}
              onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
              rows={8}
              placeholder="<p>Hallo {{name}},</p><p>…</p>"
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm font-mono text-[--foreground] placeholder:text-[--muted-foreground]",
                "resize-y"
              )}
            />
          </div>

          {/* Plain text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Plaintext-Fallback{" "}
              <span className="text-[--muted-foreground] font-normal">(optional)</span>
            </label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={3}
              placeholder="Hallo {{name}}, …"
              className={cn(
                "w-full rounded-lg border border-[--border] bg-[--background]",
                "px-3 py-2 text-sm text-[--foreground] placeholder:text-[--muted-foreground]",
                "resize-y"
              )}
            />
          </div>

          {/* Aktiv toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.aktiv}
              onChange={(e) => setForm((f) => ({ ...f, aktiv: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Aktiv (Template wird verwendet)</span>
          </label>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cancelForm}
              className={cn(
                "rounded-lg border border-[--border] px-4 py-2 text-sm font-medium",
                "text-[--foreground] hover:bg-[--muted]/40 transition-colors"
              )}
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                "bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity",
                "disabled:opacity-50"
              )}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[--muted-foreground]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[--border] py-12 text-center">
          <Mail className="h-8 w-8 mx-auto text-[--muted-foreground] mb-3" />
          <p className="text-sm text-[--muted-foreground]">Noch keine Templates vorhanden</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const isExpanded = expanded[t.id];
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border border-[--border] bg-[--card]",
                  !t.aktiv && "opacity-60"
                )}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [t.id]: !isExpanded }))}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <Mail className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-[--foreground]">
                          {t.name}
                        </span>
                        {!t.aktiv && (
                          <span className="text-xs rounded-full px-2 py-0.5 bg-[--muted] text-[--muted-foreground]">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      {t.beschreibung && (
                        <p className="text-xs text-[--muted-foreground] truncate mt-0.5">
                          {t.beschreibung}
                        </p>
                      )}
                      <p className="text-xs text-[--muted-foreground] truncate">
                        Betreff: {t.betreff}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[--muted-foreground] shrink-0" />
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(t)}
                      disabled={isPending}
                      title={t.aktiv ? "Deaktivieren" : "Aktivieren"}
                      className="rounded-lg p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]/40 transition-colors"
                    >
                      {t.aktiv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      title="Bearbeiten"
                      className="rounded-lg p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]/40 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      title="Löschen"
                      className="rounded-lg p-2 text-[--muted-foreground] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded HTML preview */}
                {isExpanded && (
                  <div className="border-t border-[--border] px-4 pb-4 pt-3 space-y-2">
                    <p className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wider">
                      HTML-Vorschau
                    </p>
                    <pre className="text-xs bg-[--muted]/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono max-h-48">
                      {t.html}
                    </pre>
                    {t.text && (
                      <>
                        <p className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wider mt-3">
                          Plaintext
                        </p>
                        <pre className="text-xs bg-[--muted]/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono max-h-24">
                          {t.text}
                        </pre>
                      </>
                    )}
                    <p className="text-xs text-[--muted-foreground]">
                      Aktualisiert: {new Date(t.updated_at).toLocaleString("de-DE")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
