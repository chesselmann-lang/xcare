"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard, CheckCircle2, AlertCircle, Clock, Euro,
  ExternalLink, Plus, Loader2, LayoutDashboard, TrendingUp,
  FileText, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ConnectAccount = {
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_complete: boolean;
  details_submitted: boolean;
} | null;

type CareWorker = {
  id: string;
  vorname: string;
  nachname: string;
  stundensatz_ct: number;
  aktiv: boolean;
};

type Stunde = {
  id: string;
  datum: string;
  stunden: number;
  stundensatz_ct: number;
  betrag_ct: number;
  beschreibung?: string | null;
  status: string;
  payment_status?: string | null;
  created_at: string;
  approved_at?: string | null;
  paid_at?: string | null;
  care_workers?: { vorname: string; nachname: string } | null;
};

type Zahlung = {
  id: string;
  brutto_ct: number;
  provision_ct: number;
  netto_ct: number;
  status: string;
  created_at: string;
  paid_at?: string | null;
};

type Anbieter = { id: string; name: string; verifiziert: boolean };

type KPIs = {
  offen: number;
  genehmigt: number;
  bezahlt: number;
  umsatz_ct: number;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ausstehend", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Genehmigt", color: "bg-green-100 text-green-800" },
  rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-800" },
  invoiced: { label: "In Zahlung", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Bezahlt", color: "bg-purple-100 text-purple-800" },
};

function formatEur(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function AnbieterZahlungenClient({
  anbieter,
  connectAccount,
  careWorkers,
  stunden,
  zahlungen,
  kpis,
}: {
  anbieter: Anbieter;
  connectAccount: ConnectAccount;
  careWorkers: CareWorker[];
  stunden: Stunde[];
  zahlungen: Zahlung[];
  kpis: KPIs;
}) {
  const router = useRouter();
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"stunden" | "zahlungen">("stunden");

  const [form, setForm] = useState({
    care_worker_id: "",
    datum: new Date().toISOString().split("T")[0],
    stunden: "",
    stundensatz_ct: "",
    beschreibung: "",
    familie_profile_id: "",
  });

  const handleOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.stub) {
        toast.info("Stripe nicht konfiguriert — bitte STRIPE_SECRET_KEY setzen.");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error("Fehler beim Starten des Onboardings");
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", { method: "POST" });
      const data = await res.json();
      if (data.stub) {
        toast.info("Stripe-Dashboard im Stub-Modus nicht verfügbar");
        return;
      }
      if (data.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Fehler beim Laden des Dashboards");
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleWorkerChange = (workerId: string) => {
    const worker = careWorkers.find(w => w.id === workerId);
    setForm(f => ({
      ...f,
      care_worker_id: workerId,
      stundensatz_ct: worker ? (worker.stundensatz_ct / 100).toFixed(2) : "",
    }));
  };

  const handleSubmitStunden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.care_worker_id || !form.datum || !form.stunden || !form.stundensatz_ct) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = {
        care_worker_id: form.care_worker_id,
        datum: form.datum,
        stunden: parseFloat(form.stunden),
        stundensatz_ct: Math.round(parseFloat(form.stundensatz_ct) * 100),
      };
      if (form.beschreibung) payload.beschreibung = form.beschreibung;
      if (form.familie_profile_id) payload.familie_profile_id = form.familie_profile_id;

      const res = await fetch("/api/stripe/stunden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Fehler");
      }
      toast.success("Stundennachweis angelegt");
      setShowForm(false);
      setForm(f => ({ ...f, stunden: "", beschreibung: "", familie_profile_id: "" }));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Stundennachweis löschen?")) return;
    try {
      const res = await fetch(`/api/stripe/stunden/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler");
      toast.success("Gelöscht");
      router.refresh();
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  };

  const isConnected = connectAccount?.onboarding_complete || connectAccount?.charges_enabled;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zahlungen & Abrechnung</h1>
          <p className="text-sm text-gray-500 mt-1">Stripe Connect Marktplatz — 10 % Plattformgebühr</p>
        </div>
        {isConnected && (
          <Button variant="outline" size="sm" onClick={handleOpenDashboard} disabled={dashboardLoading}>
            {dashboardLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Stripe-Dashboard
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Ausstehend</p>
          <p className="text-2xl font-bold text-yellow-600">{kpis.offen}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Genehmigt</p>
          <p className="text-2xl font-bold text-green-600">{kpis.genehmigt}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Bezahlt</p>
          <p className="text-2xl font-bold text-purple-600">{kpis.bezahlt}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Netto-Umsatz</p>
          <p className="text-2xl font-bold text-blue-600">{formatEur(kpis.umsatz_ct)}</p>
        </Card>
      </div>

      {/* Stripe Connect Onboarding */}
      <Card className={`p-6 border-2 ${isConnected ? "border-green-200 bg-green-50" : "border-dashed border-gray-300"}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-xl ${isConnected ? "bg-green-100" : "bg-gray-100"}`}>
            <CreditCard className={`w-6 h-6 ${isConnected ? "text-green-600" : "text-gray-400"}`} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              {isConnected ? "Stripe-Konto verbunden ✓" : "Stripe-Konto einrichten"}
            </h2>
            {isConnected ? (
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Zahlungen aktiviert
                </p>
                {connectAccount?.payouts_enabled && (
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Auszahlungen aktiviert
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Konto: {connectAccount?.stripe_account_id}
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-4">
                  Verbinden Sie Ihr Stripe-Konto, um Zahlungen von Familien zu empfangen.
                  xcare nimmt eine Plattformgebühr von 10 %. Auszahlungen erfolgen wöchentlich per SEPA.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Kreditkarte & SEPA</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Wöchentliche Auszahlung</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Stripe-Haftungsschutz</span>
                </div>
                <Button onClick={handleOnboarding} disabled={onboardingLoading}>
                  {onboardingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Jetzt mit Stripe verbinden
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stunden-Formular */}
      {showForm && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Stundennachweis anlegen
          </h3>
          <form onSubmit={handleSubmitStunden} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Pflegekraft *</Label>
                <select
                  required
                  value={form.care_worker_id}
                  onChange={e => handleWorkerChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bitte wählen…</option>
                  {careWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.vorname} {w.nachname} ({(w.stundensatz_ct / 100).toFixed(2)} €/h)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Datum *</Label>
                <Input type="date" required value={form.datum}
                  onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Stunden *</Label>
                <Input type="number" min="0.25" max="24" step="0.25" required value={form.stunden}
                  onChange={e => setForm(f => ({ ...f, stunden: e.target.value }))}
                  placeholder="z.B. 4.5" className="mt-1" />
              </div>
              <div>
                <Label>Stundensatz (€) *</Label>
                <Input type="number" min="5" max="200" step="0.50" required value={form.stundensatz_ct}
                  onChange={e => setForm(f => ({ ...f, stundensatz_ct: e.target.value }))}
                  placeholder="z.B. 18.50" className="mt-1" />
              </div>
            </div>
            {form.stunden && form.stundensatz_ct && (
              <p className="text-sm font-medium text-blue-700">
                Gesamtbetrag: {formatEur(Math.round(parseFloat(form.stunden) * parseFloat(form.stundensatz_ct) * 100))}
                <span className="text-xs text-gray-400 ml-2">
                  (Netto nach 10 % Provision: {formatEur(Math.round(parseFloat(form.stunden) * parseFloat(form.stundensatz_ct) * 100 * 0.9))})
                </span>
              </p>
            )}
            <div>
              <Label>Beschreibung</Label>
              <Textarea rows={2} value={form.beschreibung} maxLength={500}
                onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
                placeholder="z.B. Grundpflege + Demenzbegleitung, Dienstag Nachmittag" className="mt-1" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Anlegen
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("stunden")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "stunden" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Stundennachweise ({stunden.length})
            </button>
            <button
              onClick={() => setActiveTab("zahlungen")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "zahlungen" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Euro className="w-4 h-4 inline mr-1" />
              Zahlungshistorie ({zahlungen.length})
            </button>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)} disabled={careWorkers.length === 0}>
              <Plus className="w-4 h-4 mr-1" />
              Stunden eintragen
            </Button>
          )}
        </div>

        {/* Stunden-Tab */}
        {activeTab === "stunden" && (
          <div className="space-y-3">
            {stunden.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Noch keine Stundennachweise
              </div>
            ) : (
              stunden.map(sn => {
                const st = STATUS_LABELS[sn.status] ?? { label: sn.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <Card key={sn.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-gray-900">
                            {sn.care_workers
                              ? `${sn.care_workers.vorname} ${sn.care_workers.nachname}`
                              : "Unbekannte Pflegekraft"}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span>{new Date(sn.datum).toLocaleDateString("de-DE")}</span>
                          <span>{sn.stunden} Std. × {formatEur(sn.stundensatz_ct)}/h</span>
                          {sn.beschreibung && <span className="text-gray-400">{sn.beschreibung}</span>}
                        </div>
                        {sn.paid_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Bezahlt: {new Date(sn.paid_at).toLocaleDateString("de-DE")}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-gray-900">{formatEur(sn.betrag_ct)}</p>
                        <p className="text-xs text-gray-400">Netto: {formatEur(Math.round(sn.betrag_ct * 0.9))}</p>
                        {["pending", "rejected"].includes(sn.status) && (
                          <button
                            onClick={() => handleDelete(sn.id)}
                            className="text-xs text-red-500 hover:underline mt-1"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Zahlungen-Tab */}
        {activeTab === "zahlungen" && (
          <div className="space-y-3">
            {zahlungen.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Noch keine Zahlungen
              </div>
            ) : (
              zahlungen.map(z => (
                <Card key={z.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          z.status === "succeeded" ? "bg-green-100 text-green-800" :
                          z.status === "failed" ? "bg-red-100 text-red-800" :
                          z.status === "refunded" ? "bg-orange-100 text-orange-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {z.status === "succeeded" ? "Erhalten" :
                           z.status === "failed" ? "Fehlgeschlagen" :
                           z.status === "refunded" ? "Erstattet" : "Ausstehend"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(z.created_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Brutto {formatEur(z.brutto_ct)} − Provision {formatEur(z.provision_ct)} (10 %)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{formatEur(z.netto_ct)}</p>
                      <p className="text-xs text-gray-400">Netto</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
