"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PlusCircle, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface PflegekassenBudget {
  id: string;
  profil_id: string;
  leistungsart: string;
  jahresbudget: number;
  verbraucht: number;
  jahr: number;
  created_at: string;
  updated_at: string;
}

interface BudgetTransaktion {
  id: string;
  budget_id: string;
  betrag: number;
  beschreibung: string | null;
  datum: string;
  beleg_url: string | null;
  created_at: string;
}

const STANDARD_BUDGETS: Array<{
  leistungsart: string;
  label: string;
  rechtsgrundlage: string;
  betragePflegegrad: Record<2 | 3 | 4 | 5, number>;
}> = [
  {
    leistungsart: "Pflegegeld",
    label: "Pflegegeld",
    rechtsgrundlage: "§ 37 SGB XI",
    betragePflegegrad: { 2: 3780, 3: 5720, 4: 7640, 5: 9560 },
  },
  {
    leistungsart: "Pflegesachleistung",
    label: "Pflegesachleistung",
    rechtsgrundlage: "§ 36 SGB XI",
    betragePflegegrad: { 2: 7610, 3: 14330, 4: 18580, 5: 22610 },
  },
  {
    leistungsart: "Verhinderungspflege",
    label: "Verhinderungspflege",
    rechtsgrundlage: "§ 39 SGB XI",
    betragePflegegrad: { 2: 1612, 3: 1612, 4: 1612, 5: 1612 },
  },
  {
    leistungsart: "Kurzzeitpflege",
    label: "Kurzzeitpflege",
    rechtsgrundlage: "§ 42 SGB XI",
    betragePflegegrad: { 2: 1774, 3: 1774, 4: 1774, 5: 1774 },
  },
  {
    leistungsart: "Entlastungsbetrag",
    label: "Entlastungsbetrag",
    rechtsgrundlage: "§ 45b SGB XI",
    betragePflegegrad: { 2: 1548, 3: 1548, 4: 1548, 5: 1548 },
  },
];

function ampelfarbe(verbraucht: number, gesamt: number): string {
  if (gesamt === 0) return "bg-[--muted]";
  const pct = verbraucht / gesamt;
  if (pct < 0.7) return "bg-green-500";
  if (pct < 0.9) return "bg-yellow-500";
  return "bg-red-500";
}

function ampelTextfarbe(verbraucht: number, gesamt: number): string {
  if (gesamt === 0) return "text-[--muted-foreground]";
  const pct = verbraucht / gesamt;
  if (pct < 0.7) return "text-green-600";
  if (pct < 0.9) return "text-yellow-600";
  return "text-red-600";
}

function formatEur(betrag: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(betrag);
}

interface TransaktionFormProps {
  budgetId: string;
  jahr: number;
  onSuccess: (neuesVerbraucht: number) => void;
}

function TransaktionForm({ budgetId, jahr, onSuccess }: TransaktionFormProps) {
  const [betrag, setBetrag] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const betragNum = parseFloat(betrag.replace(",", "."));
    if (isNaN(betragNum) || betragNum <= 0) {
      toast.error("Bitte gültigen Betrag eingeben");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/budget/transaktionen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget_id: budgetId,
          betrag: betragNum,
          beschreibung: beschreibung || null,
          datum,
        }),
      });

      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern");

      toast.success("Transaktion gespeichert");
      setBetrag("");
      setBeschreibung("");

      const budgetRes = await fetch(`/api/budget?jahr=${jahr}`);
      const budgetJson = await budgetRes.json() as { budgets?: PflegekassenBudget[] };
      const updated = budgetJson.budgets?.find((b) => b.id === budgetId);
      if (updated) onSuccess(updated.verbraucht);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-[--muted] rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Betrag (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            placeholder="0,00"
            required
            className="w-full px-2 py-1.5 text-sm rounded border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Datum</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            required
            className="w-full px-2 py-1.5 text-sm rounded border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Beschreibung</label>
        <input
          type="text"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="z. B. Tagespflege Oktober"
          className="w-full px-2 py-1.5 text-sm rounded border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-[--primary] text-[--primary-foreground] hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
        Speichern
      </button>
    </form>
  );
}

interface BudgetCardProps {
  budget: PflegekassenBudget;
  rechtsgrundlage: string;
  label: string;
  onUpdated: (id: string, neuesVerbraucht: number) => void;
}

function BudgetCard({ budget, rechtsgrundlage, label, onUpdated }: BudgetCardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [transaktionen, setTransaktionen] = useState<BudgetTransaktion[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pct = budget.jahresbudget > 0 ? Math.min(100, (budget.verbraucht / budget.jahresbudget) * 100) : 0;
  const balken = ampelfarbe(budget.verbraucht, budget.jahresbudget);
  const textfarbe = ampelTextfarbe(budget.verbraucht, budget.jahresbudget);

  async function ladeTransaktionen() {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/budget/transaktionen?budget_id=${budget.id}`);
      const json = await res.json() as { transaktionen?: BudgetTransaktion[] };
      setTransaktionen(json.transaktionen ?? []);
    } catch {
      toast.error("Fehler beim Laden der Transaktionen");
    } finally {
      setTxLoading(false);
    }
  }

  async function handleDelete(txId: string, betrag: number) {
    setDeletingId(txId);
    try {
      const res = await fetch(`/api/budget/transaktionen?id=${txId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Fehler beim Löschen");
      }
      setTransaktionen((prev) => prev.filter((t) => t.id !== txId));
      onUpdated(budget.id, Math.max(0, budget.verbraucht - betrag));
      toast.success("Transaktion gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setDeletingId(null);
    }
  }

  function handleTxToggle() {
    if (!txOpen) ladeTransaktionen();
    setTxOpen((v) => !v);
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[--foreground]">{label}</p>
          <p className="text-xs text-[--muted-foreground]">{rechtsgrundlage}</p>
        </div>
        <span className={`text-sm font-bold ${textfarbe}`}>
          {formatEur(budget.verbraucht)} / {formatEur(budget.jahresbudget)}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-[--muted] overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${balken}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[--muted-foreground]">
        {pct.toFixed(1)} % verbraucht — noch {formatEur(Math.max(0, budget.jahresbudget - budget.verbraucht))} verfügbar
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[--primary] text-[--primary] hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Transaktion hinzufügen
        </button>
        <button
          onClick={handleTxToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[--border] text-[--muted-foreground] hover:bg-[--muted] transition-colors"
        >
          {txOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Transaktionen
        </button>
      </div>

      {formOpen && (
        <TransaktionForm
          budgetId={budget.id}
          jahr={budget.jahr}
          onSuccess={(nv) => {
            onUpdated(budget.id, nv);
            setFormOpen(false);
            if (txOpen) ladeTransaktionen();
          }}
        />
      )}

      {txOpen && (
        <div className="mt-2 space-y-1">
          {txLoading && (
            <div className="flex items-center gap-2 text-xs text-[--muted-foreground]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden...
            </div>
          )}
          {!txLoading && transaktionen.length === 0 && (
            <p className="text-xs text-[--muted-foreground]">Noch keine Transaktionen.</p>
          )}
          {transaktionen.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-2 text-xs border-b border-[--border] py-1.5"
            >
              <div>
                <span className="font-medium text-[--foreground]">{formatEur(tx.betrag)}</span>
                {tx.beschreibung && (
                  <span className="text-[--muted-foreground] ml-2">{tx.beschreibung}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[--muted-foreground]">
                <span>{tx.datum}</span>
                <button
                  onClick={() => handleDelete(tx.id, tx.betrag)}
                  disabled={deletingId === tx.id}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  title="Löschen"
                >
                  {deletingId === tx.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BudgetTracker() {
  const [jahr] = useState(new Date().getFullYear());
  const [pflegegrad, setPflegegrad] = useState<2 | 3 | 4 | 5>(2);
  const [budgets, setBudgets] = useState<PflegekassenBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialisieren, setInitialisieren] = useState(false);

  const ladeBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budget?jahr=${jahr}`);
      const json = await res.json() as { budgets?: PflegekassenBudget[] };
      setBudgets(json.budgets ?? []);
    } catch {
      toast.error("Fehler beim Laden der Budgets");
    } finally {
      setLoading(false);
    }
  }, [jahr]);

  useEffect(() => {
    ladeBudgets();
  }, [ladeBudgets]);

  async function handleInitialisieren() {
    setInitialisieren(true);
    try {
      const standardFuerGrad = STANDARD_BUDGETS.map((b) => ({
        leistungsart: b.leistungsart,
        jahresbudget: b.betragePflegegrad[pflegegrad],
        jahr,
      }));

      await Promise.all(
        standardFuerGrad.map((b) =>
          fetch("/api/budget", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(b),
          })
        )
      );
      toast.success(`Standardbudgets für Pflegegrad ${pflegegrad} angelegt`);
      await ladeBudgets();
    } catch {
      toast.error("Fehler beim Anlegen der Standardbudgets");
    } finally {
      setInitialisieren(false);
    }
  }

  function handleUpdated(id: string, neuesVerbraucht: number) {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, verbraucht: neuesVerbraucht } : b))
    );
  }

  function getMetaForBudget(b: PflegekassenBudget) {
    const standard = STANDARD_BUDGETS.find((s) => s.leistungsart === b.leistungsart);
    return {
      label: standard?.label ?? b.leistungsart,
      rechtsgrundlage: standard?.rechtsgrundlage ?? "SGB XI",
    };
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[--muted-foreground] py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Budgets werden geladen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[--foreground]">Budget-Tracker {jahr}</h2>
          <p className="text-sm text-[--muted-foreground]">SGB XI Leistungsansprüche im Überblick</p>
        </div>
        {budgets.length === 0 && (
          <div className="flex items-center gap-3">
            <select
              value={pflegegrad}
              onChange={(e) => setPflegegrad(Number(e.target.value) as 2 | 3 | 4 | 5)}
              className="px-3 py-1.5 text-sm rounded border border-[--border] bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]"
            >
              <option value={2}>Pflegegrad 2</option>
              <option value={3}>Pflegegrad 3</option>
              <option value={4}>Pflegegrad 4</option>
              <option value={5}>Pflegegrad 5</option>
            </select>
            <button
              onClick={handleInitialisieren}
              disabled={initialisieren}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded bg-[--primary] text-[--primary-foreground] hover:opacity-90 disabled:opacity-50"
            >
              {initialisieren ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Standardbudgets anlegen
            </button>
          </div>
        )}
      </div>

      {budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[--border] p-8 text-center">
          <p className="text-[--muted-foreground] text-sm">
            Noch keine Budgets für {jahr}. Wähle deinen Pflegegrad und lege Standardbudgets an.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((b) => {
            const { label, rechtsgrundlage } = getMetaForBudget(b);
            return (
              <BudgetCard
                key={b.id}
                budget={b}
                label={label}
                rechtsgrundlage={rechtsgrundlage}
                onUpdated={handleUpdated}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
