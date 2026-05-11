"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock, Euro, CheckCircle2, XCircle, Loader2,
  CreditCard, TrendingUp, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Stunde = {
  id: string;
  datum: string;
  stunden: number;
  stundensatz_ct: number;
  betrag_ct: number;
  beschreibung?: string | null;
  status: string;
  payment_status?: string | null;
  paid_at?: string | null;
  care_workers?: { vorname: string; nachname: string; qualifikationen: string[] } | null;
  anbieter?: { name: string; verifiziert: boolean } | null;
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Prüfung ausstehend", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Genehmigt — Zahlung offen", color: "bg-green-100 text-green-800" },
  rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-800" },
  invoiced: { label: "Zahlung läuft", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Bezahlt ✓", color: "bg-purple-100 text-purple-800" },
};

function formatEur(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function FamilieZahlungenClient({
  stunden,
  zahlungen,
  kpis,
}: {
  stunden: Stunde[];
  zahlungen: Zahlung[];
  kpis: { pending: number; approved: number; paid: number; gesamt_ct: number };
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"offen" | "verlauf">("offen");

  const offene = stunden.filter(s => ["pending", "approved", "invoiced"].includes(s.status));
  const abgeschlossen = stunden.filter(s => ["paid", "rejected"].includes(s.status));

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/stripe/stunden/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error("Fehler");
      toast.success("Stunden genehmigt");
      router.refresh();
    } catch {
      toast.error("Genehmigung fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Stundennachweis ablehnen?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/stripe/stunden/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("Fehler");
      toast.success("Abgelehnt");
      router.refresh();
    } catch {
      toast.error("Ablehnen fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePay = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch("/api/stripe/zahlungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stundennachweis_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");

      if (data.stub) {
        toast.success(data.message ?? "Zahlung (Stub) erfolgreich");
        router.refresh();
        return;
      }

      // Live: Redirect zu Stripe Checkout / Payment Element
      if (data.client_secret) {
        // In einer vollständigen Integration würde hier ein Stripe Payment Element geöffnet.
        // Für diesen Schritt öffnen wir eine einfache Bestätigungsseite.
        toast.success(`Zahlung initiiert: ${formatEur(data.brutto_ct)}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zahlung fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zahlungen & Stunden</h1>
        <p className="text-sm text-gray-500 mt-1">
          Genehmigen Sie eingereichte Pflegestunden und bezahlen Sie sicher über xcare.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Zur Prüfung</p>
          <p className="text-2xl font-bold text-yellow-600">{kpis.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Zu bezahlen</p>
          <p className="text-2xl font-bold text-green-600">{kpis.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Bezahlt</p>
          <p className="text-2xl font-bold text-purple-600">{kpis.paid}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Gesamt bezahlt</p>
          <p className="text-xl font-bold text-blue-600">{formatEur(kpis.gesamt_ct)}</p>
        </Card>
      </div>

      {/* Info-Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-900">So funktionieren Zahlungen</p>
          <p className="text-blue-700 mt-1">
            Ihr Pflegeanbieter trägt geleistete Stunden ein. Sie prüfen und genehmigen diese,
            dann zahlen Sie sicher über Stripe (Kreditkarte oder SEPA-Lastschrift).
            xcare leitet 90 % direkt an Ihren Anbieter weiter.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("offen")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "offen" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Offene Posten ({offene.length})
        </button>
        <button
          onClick={() => setActiveTab("verlauf")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "verlauf" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Verlauf ({abgeschlossen.length + zahlungen.length})
        </button>
      </div>

      {/* Offene Posten */}
      {activeTab === "offen" && (
        <div className="space-y-4">
          {offene.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Keine offenen Posten
            </div>
          ) : (
            offene.map(sn => {
              const st = STATUS_LABELS[sn.status] ?? { label: sn.status, color: "bg-gray-100 text-gray-600" };
              const isLoading = loadingId === sn.id;
              return (
                <Card key={sn.id} className={`p-5 ${sn.status === "pending" ? "border-yellow-200" : "border-green-200"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="font-semibold text-gray-900 text-sm">
                          {sn.care_workers
                            ? `${sn.care_workers.vorname} ${sn.care_workers.nachname}`
                            : "Pflegekraft"}
                        </p>
                        {sn.anbieter && (
                          <span className="text-xs text-gray-400">bei {sn.anbieter.name}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sn.datum).toLocaleDateString("de-DE")}
                        </span>
                        <span>{sn.stunden} Std. × {formatEur(sn.stundensatz_ct)}/h</span>
                      </div>
                      {sn.beschreibung && (
                        <p className="text-xs text-gray-500 mt-1">{sn.beschreibung}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-lg">{formatEur(sn.betrag_ct)}</p>
                    </div>
                  </div>

                  {/* Aktionen */}
                  {sn.status === "pending" && (
                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(sn.id)}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        Genehmigen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(sn.id)}
                        disabled={isLoading}
                        className="text-red-500 hover:border-red-300 hover:text-red-700"
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        Ablehnen
                      </Button>
                    </div>
                  )}
                  {sn.status === "approved" && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500">
                        Genehmigt — bereit zur Zahlung
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handlePay(sn.id)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                        {formatEur(sn.betrag_ct)} bezahlen
                      </Button>
                    </div>
                  )}
                  {sn.status === "invoiced" && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Zahlung wird verarbeitet…
                      </p>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Verlauf */}
      {activeTab === "verlauf" && (
        <div className="space-y-3">
          {abgeschlossen.length === 0 && zahlungen.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Noch keine abgeschlossenen Zahlungen
            </div>
          ) : (
            zahlungen.map(z => (
              <Card key={z.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        z.status === "succeeded" ? "bg-green-100 text-green-800" :
                        z.status === "refunded" ? "bg-orange-100 text-orange-800" :
                        z.status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {z.status === "succeeded" ? "Bezahlt" :
                         z.status === "refunded" ? "Erstattet" :
                         z.status === "failed" ? "Fehlgeschlagen" : "Ausstehend"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(z.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{formatEur(z.brutto_ct)}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
