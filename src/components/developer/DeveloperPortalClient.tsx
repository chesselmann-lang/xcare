"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Key,
  Webhook,
  Code2,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hint: string;
  scopes: string[];
  rate_limit_per_minute: number;
  last_used_at: string | null;
  total_requests: number;
  is_active: boolean;
  created_at: string;
}

interface ApiWebhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

interface Props {
  initialKeys: ApiKey[];
  initialWebhooks: ApiWebhook[];
  appUrl: string;
}

const AVAILABLE_SCOPES = [
  { id: "read", label: "Lesen", desc: "GET-Anfragen auf alle Ressourcen" },
  { id: "write", label: "Schreiben", desc: "POST/PUT/PATCH auf eigene Daten" },
  { id: "admin", label: "Admin", desc: "Verwaltungsfunktionen" },
  { id: "webhooks", label: "Webhooks", desc: "Webhook-Konfiguration" },
] as const;

const WEBHOOK_EVENTS = [
  "buchung.erstellt",
  "buchung.storniert",
  "anfrage.neu",
  "anfrage.beantwortet",
  "mitarbeiter.eingeladen",
  "mitarbeiter.beigetreten",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Noch nie";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Create Key Modal ─────────────────────────────────────────────────────────

function CreateKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (key: ApiKey & { full_key: string }) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [loading, setLoading] = useState(false);

  function toggleScope(s: string) {
    setScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleCreate() {
    if (!name.trim() || scopes.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json() as {
        error?: string;
        key?: ApiKey & { full_key: string };
        warning?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Erstellen");
        return;
      }
      if (data.key) {
        onCreated(data.key);
      }
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Neuen API-Key erstellen</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Der vollständige Key wird nur einmal angezeigt.
          </p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bezeichnung
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Produktions-Server"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Berechtigungen
            </label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map(({ id, label, desc }) => (
                <label
                  key={id}
                  className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(id)}
                    onChange={() => toggleScope(id)}
                    className="mt-0.5 rounded border-gray-300 text-[--primary] focus:ring-[--primary]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !name.trim() || scopes.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Key erstellen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Key Display ──────────────────────────────────────────────────────────

function NewKeyDisplay({
  fullKey,
  onClose,
}: {
  fullKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success("API-Key kopiert!");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
        <div className="flex items-start gap-3 bg-amber-50 px-6 py-5 border-b border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-amber-900">
              Key sicher aufbewahren!
            </h3>
            <p className="text-sm text-amber-700 mt-0.5">
              Dieser Key wird nur einmal angezeigt und kann nicht wiederhergestellt werden.
              Kopieren Sie ihn jetzt an einen sicheren Ort.
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Ihr API-Key
          </label>
          <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-4 py-3">
            <code className="flex-1 text-sm font-mono text-green-400 break-all">
              {visible ? fullKey : `${fullKey.slice(0, 16)}${"•".repeat(32)}`}
            </code>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="text-gray-400 hover:text-gray-200 shrink-0 p-1"
              title={visible ? "Verbergen" : "Anzeigen"}
            >
              {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={copyKey}
              className="text-gray-400 hover:text-gray-200 shrink-0 p-1"
              title="Key kopieren"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={copyKey}
            className="w-full flex items-center justify-center gap-2 bg-[--primary] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Kopiert!" : "Key kopieren"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 py-2 hover:underline"
          >
            Ich habe den Key gespeichert — schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Webhook Modal ────────────────────────────────────────────────────────

function AddWebhookModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (webhook: ApiWebhook) => void;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([WEBHOOK_EVENTS[0]]);
  const [loading, setLoading] = useState(false);

  function toggleEvent(e: string) {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  async function handleAdd() {
    if (!url.trim() || events.length === 0) return;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      toast.error("Bitte eine gültige URL eingeben (mit https://)");
      return;
    }
    if (parsedUrl.protocol !== "https:") {
      toast.error("Nur HTTPS-URLs sind erlaubt");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsedUrl.toString(), events }),
      });
      const data = await res.json() as { error?: string; webhook?: ApiWebhook };
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Hinzufügen");
        return;
      }
      if (data.webhook) onAdded(data.webhook);
      onClose();
      toast.success("Webhook hinzugefügt");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Webhook hinzufügen</h3>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL (HTTPS erforderlich)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.meinserver.de/webhook/xcare"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]/30 focus:border-[--primary]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ereignisse
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev}
                  className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded border-gray-300 text-[--primary] focus:ring-[--primary]"
                  />
                  <code className="text-xs text-gray-700">{ev}</code>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || !url.trim() || events.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Webhook speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "keys" | "webhooks" | "examples";

export function DeveloperPortalClient({ initialKeys, initialWebhooks, appUrl }: Props) {
  const [tab, setTab] = useState<Tab>("keys");
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [webhooks, setWebhooks] = useState<ApiWebhook[]>(initialWebhooks);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<(ApiKey & { full_key: string }) | null>(null);
  const [revoking, startRevoke] = useTransition();

  function handleKeyCreated(key: ApiKey & { full_key: string }) {
    setKeys((prev) => [key, ...prev]);
    setShowCreateModal(false);
    setNewKeyData(key);
  }

  function handleWebhookAdded(webhook: ApiWebhook) {
    setWebhooks((prev) => [webhook, ...prev]);
  }

  async function revokeKey(id: string) {
    if (!confirm("Diesen API-Key widerrufen? Er funktioniert sofort nicht mehr.")) return;
    startRevoke(async () => {
      try {
        const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          toast.error(d.error ?? "Fehler");
          return;
        }
        setKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, is_active: false } : k))
        );
        toast.success("API-Key widerrufen");
      } catch {
        toast.error("Netzwerkfehler");
      }
    });
  }

  const TABS = [
    { id: "keys" as Tab, label: "API-Keys", icon: Key },
    { id: "webhooks" as Tab, label: "Webhooks", icon: Webhook },
    { id: "examples" as Tab, label: "Code-Beispiele", icon: Code2 },
  ];

  return (
    <>
      {/* Modals */}
      {showCreateModal && (
        <CreateKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleKeyCreated}
        />
      )}
      {newKeyData && (
        <NewKeyDisplay
          fullKey={newKeyData.full_key}
          onClose={() => setNewKeyData(null)}
        />
      )}
      {showWebhookModal && (
        <AddWebhookModal
          onClose={() => setShowWebhookModal(false)}
          onAdded={handleWebhookAdded}
        />
      )}

      {/* Tab navigation */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors ${
                tab === id
                  ? "text-[--primary] border-b-2 border-[--primary] bg-[--primary]/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {tab === "keys" && (
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                {keys.filter((k) => k.is_active).length} aktive Keys
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Neuen Key erstellen
              </button>
            </div>

            {keys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine API-Keys vorhanden.</p>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm font-medium text-[--primary] hover:underline"
                >
                  Ersten Key erstellen
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {["Name", "Schlüssel", "Scopes", "Zuletzt verwendet", "Anfragen", "Status", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {keys.map((k) => (
                      <tr
                        key={k.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          !k.is_active ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {k.name}
                        </td>
                        <td className="px-5 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {k.key_prefix}…{k.key_hint}
                          </code>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(k.scopes ?? []).map((s) => (
                              <span
                                key={s}
                                className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatDate(k.last_used_at)}
                        </td>
                        <td className="px-5 py-3 text-gray-700 text-right">
                          {(k.total_requests ?? 0).toLocaleString("de-DE")}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              k.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {k.is_active ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {k.is_active ? "Aktiv" : "Widerrufen"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {k.is_active && (
                            <button
                              type="button"
                              onClick={() => revokeKey(k.id)}
                              disabled={revoking}
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              Widerrufen
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {tab === "webhooks" && (
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                {webhooks.filter((w) => w.is_active).length} aktive Webhooks
              </p>
              <button
                type="button"
                onClick={() => setShowWebhookModal(true)}
                className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Webhook hinzufügen
              </button>
            </div>

            {webhooks.length === 0 ? (
              <div className="text-center py-12">
                <Webhook className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Webhooks konfiguriert.</p>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(true)}
                  className="mt-3 text-sm font-medium text-[--primary] hover:underline"
                >
                  Ersten Webhook hinzufügen
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {webhooks.map((w) => (
                  <div key={w.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-900 truncate hover:text-[--primary] flex items-center gap-1"
                          >
                            {w.url}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <span
                            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                              w.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {w.is_active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {w.events.map((ev) => (
                            <code
                              key={ev}
                              className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded"
                            >
                              {ev}
                            </code>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Zuletzt ausgelöst: {formatDate(w.last_triggered_at)}</span>
                          {w.failure_count > 0 && (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {w.failure_count} Fehler
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Code Examples Tab */}
        {tab === "examples" && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Authentifizierung — cURL
              </h3>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
                <code>{`# API-Status prüfen
curl -X GET "${appUrl}/api/v1/status" \\
  -H "Authorization: Bearer xc_live_IhrApiKeyHier" \\
  -H "Content-Type: application/json"

# Anbieter suchen
curl -X GET "${appUrl}/api/v1/anbieter?plz=10115&leistung=pflege" \\
  -H "Authorization: Bearer xc_live_IhrApiKeyHier"

# Buchung erstellen
curl -X POST "${appUrl}/api/v1/buchungen" \\
  -H "Authorization: Bearer xc_live_IhrApiKeyHier" \\
  -H "Content-Type: application/json" \\
  -d '{
    "anbieter_id": "uuid-hier",
    "leistung_id": "uuid-hier",
    "datum": "2026-06-01",
    "beschreibung": "Erstberatung Pflegegrad"
  }'`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                JavaScript / TypeScript
              </h3>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
                <code>{`// xcare API-Client (Beispiel)
const XCARE_API_KEY = process.env.XCARE_API_KEY; // xc_live_...
const BASE_URL = "${appUrl}/api/v1";

async function xcareRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(\`\${BASE_URL}\${path}\`, {
    ...options,
    headers: {
      "Authorization": \`Bearer \${XCARE_API_KEY}\`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? \`HTTP \${res.status}\`);
  }

  return res.json() as Promise<T>;
}

// Anbieter suchen
const anbieter = await xcareRequest<{ data: Anbieter[] }>(
  "/anbieter?plz=10115"
);

// Buchung erstellen
const buchung = await xcareRequest<{ id: string }>("/buchungen", {
  method: "POST",
  body: JSON.stringify({
    anbieter_id: "...",
    datum: "2026-06-01",
  }),
});`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Webhook-Payload-Beispiel
              </h3>
              <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed">
                <code>{`// POST an Ihre Webhook-URL (von xcare signiert via HMAC-SHA256)
// Header: X-xcare-Signature: sha256=<hmac>

{
  "event": "buchung.erstellt",
  "timestamp": "2026-06-01T10:30:00Z",
  "data": {
    "buchung_id": "uuid",
    "anbieter_id": "uuid",
    "user_id": "uuid",
    "datum": "2026-06-01",
    "status": "bestaetigt"
  }
}

// Signatur prüfen (Node.js)
import { createHmac } from "crypto";

function verifyWebhook(payload: string, signature: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return expected === signature;
}`}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
