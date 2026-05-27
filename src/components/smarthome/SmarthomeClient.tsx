"use client";

import { useState, useEffect, useCallback } from "react";

interface Geraet {
  id: string;
  typ: string;
  name: string;
  geraete_id?: string;
  verbindungstyp: string;
  aktiv: boolean;
  letzter_wert?: Record<string, unknown>;
  letzter_kontakt?: string;
}

interface Ereignis {
  id: string;
  typ: string;
  schweregrad: "info" | "warnung" | "kritisch";
  daten?: Record<string, unknown>;
  created_at: string;
  geraet?: { name: string; typ: string } | null;
}

interface Props {
  initialGeraete: Geraet[];
  initialEreignisse: Ereignis[];
  userId: string;
}

const EREIGNIS_ICONS: Record<string, string> = {
  bewegung: "🚶",
  tuer_offen: "🚪",
  tuer_geschlossen: "🔒",
  sturz_erkannt: "⚠️",
  notfall: "🆘",
  bett_verlassen: "🛏️",
  bett_betreten: "😴",
  inaktivitaet: "⏳",
};

const SCHWEREGRAD_CLASSES: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warnung: "bg-yellow-100 text-yellow-800",
  kritisch: "bg-red-100 text-red-800",
};

const VERBINDUNGSTYP_TABS = ["Hue", "MQTT", "Manuell"] as const;
type VerbindungsTab = (typeof VERBINDUNGSTYP_TABS)[number];

function StatusDot({ aktiv, letzterKontakt }: { aktiv: boolean; letzterKontakt?: string }) {
  const jetzt = Date.now();
  const kontakt = letzterKontakt ? new Date(letzterKontakt).getTime() : 0;
  const offline = !letzterKontakt || jetzt - kontakt > 10 * 60 * 1000; // > 10 min

  let color = "bg-green-500";
  let label = "Aktiv";
  if (!aktiv || offline) {
    color = "bg-red-500";
    label = "Offline";
  } else if (jetzt - kontakt > 5 * 60 * 1000) {
    color = "bg-yellow-500";
    label = "Warnung";
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function GeraetTypLabel({ typ }: { typ: string }) {
  const labels: Record<string, string> = {
    hue_bridge: "Hue Bridge",
    bewegungsmelder: "Bewegungsmelder",
    tuermelder: "Türmelder",
    bettmelder: "Bettmelder",
    wearable: "Wearable",
    notfallknopf: "Notfallknopf",
    temperatursensor: "Temperatursensor",
    mqtt_geraet: "MQTT-Gerät",
  };
  return <span className="text-xs text-gray-500">{labels[typ] ?? typ}</span>;
}

export default function SmarthomeClient({ initialGeraete, initialEreignisse, userId }: Props) {
  const [geraete, setGeraete] = useState<Geraet[]>(initialGeraete);
  const [ereignisse, setEreignisse] = useState<Ereignis[]>(initialEreignisse);
  const [activeTab, setActiveTab] = useState<VerbindungsTab>("Hue");
  const [szeneLoading, setSzeneLoading] = useState<string | null>(null);
  const [szeneMsg, setSzeneMsg] = useState<string | null>(null);

  // New device form state
  const [neuesGeraet, setNeuesGeraet] = useState({
    name: "",
    typ: "bewegungsmelder",
    geraete_id: "",
    verbindungstyp: "hue" as "hue" | "mqtt" | "manual",
  });
  const [verbindenLoading, setVerbindenLoading] = useState(false);
  const [verbindenMsg, setVerbindenMsg] = useState<string | null>(null);

  const fetchEreignisse = useCallback(async () => {
    try {
      const res = await fetch("/api/smarthome/ereignisse");
      if (res.ok) {
        const json = await res.json();
        setEreignisse(json.ereignisse ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchEreignisse, 30_000);
    return () => clearInterval(interval);
  }, [fetchEreignisse]);

  async function aktiviereSzene(szene: string) {
    setSzeneLoading(szene);
    setSzeneMsg(null);
    try {
      const res = await fetch("/api/smarthome/szene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ szene }),
      });
      if (res.ok) {
        setSzeneMsg(szene === "gute_nacht" ? "Gute-Nacht-Szene aktiviert" : "Notfall-Licht ausgelöst");
      } else {
        setSzeneMsg("Fehler beim Aktivieren der Szene");
      }
    } catch {
      setSzeneMsg("Verbindungsfehler");
    } finally {
      setSzeneLoading(null);
      setTimeout(() => setSzeneMsg(null), 4000);
    }
  }

  async function geraetVerbinden(e: React.FormEvent) {
    e.preventDefault();
    setVerbindenLoading(true);
    setVerbindenMsg(null);
    try {
      const res = await fetch("/api/smarthome/geraete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...neuesGeraet, userId }),
      });
      if (res.ok) {
        const json = await res.json();
        setGeraete(prev => [json.geraet, ...prev]);
        setNeuesGeraet({ name: "", typ: "bewegungsmelder", geraete_id: "", verbindungstyp: "hue" });
        setVerbindenMsg("Gerät erfolgreich verbunden");
      } else {
        setVerbindenMsg("Fehler beim Verbinden des Geräts");
      }
    } catch {
      setVerbindenMsg("Verbindungsfehler");
    } finally {
      setVerbindenLoading(false);
      setTimeout(() => setVerbindenMsg(null), 4000);
    }
  }

  return (
    <div className="space-y-8">
      {/* Scene buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => aktiviereSzene("gute_nacht")}
          disabled={szeneLoading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {szeneLoading === "gute_nacht" ? "..." : "🌙 Gute Nacht"}
        </button>
        <button
          onClick={() => aktiviereSzene("notfall_licht")}
          disabled={szeneLoading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {szeneLoading === "notfall_licht" ? "..." : "🚨 Notfall-Licht testen"}
        </button>
        {szeneMsg && (
          <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">{szeneMsg}</span>
        )}
      </div>

      {/* Connected devices grid */}
      <section>
        <h2 className="text-lg font-semibold text-[--foreground] mb-3">Verbundene Geräte</h2>
        {geraete.length === 0 ? (
          <p className="text-sm text-[--muted-foreground]">Noch keine Geräte verbunden.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {geraete.map(g => (
              <div
                key={g.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{g.name}</p>
                    <GeraetTypLabel typ={g.typ} />
                  </div>
                  <StatusDot aktiv={g.aktiv} letzterKontakt={g.letzter_kontakt} />
                </div>
                {g.letzter_kontakt && (
                  <p className="text-xs text-gray-400">
                    Zuletzt: {new Date(g.letzter_kontakt).toLocaleString("de-DE")}
                  </p>
                )}
                <p className="text-xs text-gray-400 uppercase tracking-wide">{g.verbindungstyp}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events timeline */}
      <section>
        <h2 className="text-lg font-semibold text-[--foreground] mb-3">
          Ereignisse (letzte 24 Stunden)
        </h2>
        {ereignisse.length === 0 ? (
          <p className="text-sm text-[--muted-foreground]">Keine Ereignisse in den letzten 24 Stunden.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-4 pl-6">
            {ereignisse.map(e => (
              <li key={e.id} className="relative">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 text-base">
                  {EREIGNIS_ICONS[e.typ] ?? "📡"}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {e.typ.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHWEREGRAD_CLASSES[e.schweregrad]}`}
                  >
                    {e.schweregrad}
                  </span>
                  {e.geraet && (
                    <span className="text-xs text-gray-500">{e.geraet.name}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(e.created_at).toLocaleString("de-DE")}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Connect device section */}
      <section>
        <h2 className="text-lg font-semibold text-[--foreground] mb-3">Gerät verbinden</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {VERBINDUNGSTYP_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setNeuesGeraet(prev => ({
                  ...prev,
                  verbindungstyp: tab === "Hue" ? "hue" : tab === "MQTT" ? "mqtt" : "manual",
                }));
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Connection form */}
        <form onSubmit={geraetVerbinden} className="space-y-4 max-w-md">
          {activeTab === "Hue" && (
            <p className="text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
              Stellen Sie sicher, dass Ihre Hue Bridge über{" "}
              <code className="text-xs bg-blue-100 px-1 rounded">HUE_BRIDGE_IP</code> und{" "}
              <code className="text-xs bg-blue-100 px-1 rounded">HUE_API_KEY</code> konfiguriert ist.
            </p>
          )}
          {activeTab === "MQTT" && (
            <p className="text-sm text-gray-500 bg-orange-50 rounded-lg p-3">
              Konfigurieren Sie{" "}
              <code className="text-xs bg-orange-100 px-1 rounded">MQTT_BROKER_URL</code> in Ihrer
              Umgebung. Topic-Format: <code className="text-xs bg-orange-100 px-1 rounded">xcare/[id]/[typ]</code>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={neuesGeraet.name}
              onChange={e => setNeuesGeraet(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="z.B. Schlafzimmer Bewegungsmelder"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gerätetyp</label>
            <select
              value={neuesGeraet.typ}
              onChange={e => setNeuesGeraet(prev => ({ ...prev, typ: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="bewegungsmelder">Bewegungsmelder</option>
              <option value="tuermelder">Türmelder</option>
              <option value="bettmelder">Bettmelder</option>
              <option value="wearable">Wearable</option>
              <option value="notfallknopf">Notfallknopf</option>
              <option value="temperatursensor">Temperatursensor</option>
              <option value="hue_bridge">Hue Bridge</option>
              <option value="mqtt_geraet">MQTT-Gerät</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === "Hue" ? "Hue Licht-/Sensor-ID" : activeTab === "MQTT" ? "MQTT Topic Suffix" : "Geräte-ID (optional)"}
            </label>
            <input
              type="text"
              value={neuesGeraet.geraete_id}
              onChange={e => setNeuesGeraet(prev => ({ ...prev, geraete_id: e.target.value }))}
              placeholder={activeTab === "Hue" ? "z.B. 3" : activeTab === "MQTT" ? "z.B. sensor-01" : ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {verbindenMsg && (
            <p className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">{verbindenMsg}</p>
          )}

          <button
            type="submit"
            disabled={verbindenLoading || !neuesGeraet.name}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {verbindenLoading ? "Verbinde..." : "Gerät verbinden"}
          </button>
        </form>
      </section>
    </div>
  );
}
