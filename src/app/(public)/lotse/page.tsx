"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, MapPin, ChevronLeft, Building2, CheckCircle2, Search, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LebenslagePicker } from "@/components/lebenslage/LebenslagePicker";
import { LotseChat } from "@/components/ki/LotseChat";
import type { LebenslageTyp } from "@/lib/types";
import { LEBENSLAGEN } from "@/lib/constants";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const HISTORY_KEY = "lotse_history";
const MAX_HISTORY = 5;

interface LotseHistoryEntry {
  lebenslage: LebenslageTyp;
  plz: string;
  label: string;
  emoji: string;
  timestamp: number;
}

function loadHistory(): LotseHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(entry: Omit<LotseHistoryEntry, "timestamp">) {
  try {
    const history = loadHistory().filter((h) => !(h.lebenslage === entry.lebenslage && h.plz === entry.plz));
    const updated = [{ ...entry, timestamp: Date.now() }, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available
  }
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}

interface NearbyAnbieter {
  id: string;
  name: string;
  plz: string | null;
  ort: string | null;
  verifiziert: boolean;
  beschreibung: string | null;
}

function NearbyAnbieterPanel({ plz, lebenslage }: { plz: string; lebenslage: LebenslageTyp }) {
  const [anbieter, setAnbieter] = useState<NearbyAnbieter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("anbieter")
      .select("id, name, plz, ort, verifiziert, beschreibung")
      .eq("aktiv", true)
      .ilike("plz", plz.substring(0, 2) + "%")
      .limit(3)
      .then(({ data }) => {
        setAnbieter(data ?? []);
        setLoading(false);
      });
  }, [plz]);

  if (loading) return null;
  if (anbieter.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[--border] pt-6">
      <h3 className="text-sm font-semibold text-[--foreground] mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[--primary]" />
        Anbieter in Ihrer Nähe ({plz})
      </h3>
      <div className="space-y-2">
        {anbieter.map((a) => (
          <Link key={a.id} href={`/anbieter/${a.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[--border] hover:bg-[--muted] transition-colors cursor-pointer">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[--primary-light] text-[--primary] font-bold text-sm">
                {a.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[--foreground] truncate">{a.name}</p>
                  {a.verifiziert && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[--muted-foreground]">{a.plz} {a.ort}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[--muted-foreground] shrink-0" />
            </div>
          </Link>
        ))}
      </div>
      <Link href={`/suche?lebenslage=${lebenslage}&plz=${plz}`}>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-2 text-xs">
          <Search className="h-3.5 w-3.5" />
          Alle Anbieter in der Suche anzeigen
        </Button>
      </Link>
    </div>
  );
}

type Schritt = "lebenslage" | "plz" | "chat";

export default function LotsePage() {
  const searchParams = useSearchParams();
  const initialLL = searchParams.get("lebenslage") as LebenslageTyp | null;

  const [schritt, setSchritt] = useState<Schritt>(initialLL ? "plz" : "lebenslage");
  const [lebenslage, setLebenslage] = useState<LebenslageTyp | null>(initialLL);
  const [plz, setPlz] = useState("");
  const [plzError, setPlzError] = useState("");
  const [history, setHistory] = useState<LotseHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function handleLebenslagSelect(ll: LebenslageTyp) {
    setLebenslage(ll);
    setSchritt("plz");
  }

  function handlePlzWeiter() {
    if (!/^\d{5}$/.test(plz)) {
      setPlzError("Bitte eine gültige 5-stellige PLZ eingeben");
      return;
    }
    setPlzError("");
    setSchritt("chat");
    // Save to history when entering chat
    if (lebenslage) {
      const ll = LEBENSLAGEN[lebenslage];
      saveToHistory({ lebenslage, plz, label: ll?.label ?? lebenslage, emoji: ll?.emoji ?? "💬" });
      setHistory(loadHistory());
    }
  }

  function handleHistoryReplay(entry: LotseHistoryEntry) {
    setLebenslage(entry.lebenslage);
    setPlz(entry.plz);
    setSchritt("chat");
    saveToHistory(entry); // bump to top
    setHistory(loadHistory());
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  const ll = lebenslage ? LEBENSLAGEN[lebenslage] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {schritt !== "lebenslage" && (
            <button
              onClick={() => setSchritt(schritt === "chat" ? "plz" : "lebenslage")}
              className="text-[--muted-foreground] hover:text-[--foreground] flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            {(["lebenslage", "plz", "chat"] as Schritt[]).map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  schritt === s
                    ? "w-8 bg-[--primary]"
                    : i < ["lebenslage", "plz", "chat"].indexOf(schritt)
                    ? "w-2 bg-[--primary]"
                    : "w-2 bg-[--border]"
                }`}
              />
            ))}
          </div>
        </div>
        <h1 className="text-3xl font-bold">Lebenslage-Lotse</h1>
        <p className="text-[--muted-foreground] mt-1">
          Ihr persönlicher KI-Berater für Sozialleistungen und Pflegeangebote
        </p>
      </div>

      {/* Schritt 1: Lebenslage wählen */}
      {schritt === "lebenslage" && (
        <div>
          {/* Recent history */}
          {history.length > 0 && (
            <div className="mb-8 p-4 rounded-xl bg-[--card] border border-[--border]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[--foreground] flex items-center gap-1.5">
                  <History className="h-4 w-4 text-[--primary]" /> Letzte Gespräche
                </p>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Löschen
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleHistoryReplay(entry)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[--border] hover:border-[--primary]/40 hover:bg-[--primary]/5 transition-all text-left group"
                  >
                    <span className="text-lg leading-none">{entry.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[--foreground] group-hover:text-[--primary] transition-colors truncate max-w-28">
                        {entry.label}
                      </p>
                      <p className="text-[10px] text-[--muted-foreground]">PLZ {entry.plz}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-[--muted-foreground] group-hover:text-[--primary] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold mb-4">
            In welcher Lebenssituation befinden Sie sich?
          </h2>
          <LebenslagePicker selected={lebenslage} onSelect={handleLebenslagSelect} />
        </div>
      )}

      {/* Schritt 2: PLZ */}
      {schritt === "plz" && ll && (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center pb-4">
            <span className="text-5xl mb-2 block">{ll.emoji}</span>
            <CardTitle>{ll.label}</CardTitle>
            <p className="text-sm text-[--muted-foreground]">{ll.beschreibung}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plz" className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Ihre Postleitzahl
              </Label>
              <Input
                id="plz"
                placeholder="z.B. 10115"
                maxLength={5}
                value={plz}
                onChange={(e) => setPlz(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handlePlzWeiter()}
              />
              {plzError && <p className="text-xs text-[--danger]">{plzError}</p>}
              <p className="text-xs text-[--muted-foreground]">
                Wird nur für die Anbietersuche in Ihrer Nähe verwendet.
              </p>
            </div>
            <Button onClick={handlePlzWeiter} className="w-full gap-2">
              Lotse starten <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schritt 3: Chat */}
      {schritt === "chat" && lebenslage && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[--primary-light] border border-[--primary]/20">
            <span className="text-2xl">{ll?.emoji}</span>
            <div>
              <p className="font-medium text-sm">{ll?.label}</p>
              <p className="text-xs text-[--muted-foreground]">PLZ {plz}</p>
            </div>
            <button
              className="ml-auto text-xs text-[--primary] hover:underline"
              onClick={() => setSchritt("lebenslage")}
            >
              Ändern
            </button>
          </div>
          <LotseChat
            lebenslage={lebenslage}
            antworten={[]}
            plz={plz}
            initialMessage={`Ich befinde mich in der Lebenssituation "${ll?.label}". Was sind meine wichtigsten nächsten Schritte und welche Leistungen stehen mir zu?`}
          />
          {plz && <NearbyAnbieterPanel plz={plz} lebenslage={lebenslage} />}
        </div>
      )}
    </div>
  );
}
