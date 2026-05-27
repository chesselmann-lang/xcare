"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerfuegbarkeitSlot = {
  id: string;
  datum: string;
  zeit_von: string;
  zeit_bis: string;
  status: "frei" | "reserviert" | "gebucht" | "gesperrt";
  stundensatz: number | null;
};

type Anbieter = {
  id: string;
  vorname: string | null;
  nachname: string | null;
  avatar_url: string | null;
  beschreibung: string | null;
  anbieter_verfuegbarkeit: VerfuegbarkeitSlot[];
};

type Leistungsart =
  | "grundpflege"
  | "behandlungspflege"
  | "hauswirtschaft"
  | "begleitung"
  | "betreuung"
  | "nachtpflege"
  | "verhinderungspflege";

const LEISTUNGSARTEN: { value: Leistungsart; label: string }[] = [
  { value: "grundpflege", label: "Grundpflege" },
  { value: "behandlungspflege", label: "Behandlungspflege" },
  { value: "hauswirtschaft", label: "Hauswirtschaft" },
  { value: "begleitung", label: "Begleitung" },
  { value: "betreuung", label: "Betreuung" },
  { value: "nachtpflege", label: "Nachtpflege" },
  { value: "verhinderungspflege", label: "Verhinderungspflege" },
];

// Seeded pseudo-random rating per anbieter id (deterministic, no hydration mismatch)
function seedRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  // Range 4.2 – 4.9
  return 4.2 + ((Math.abs(hash) % 8) * 0.1);
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-amber-400 text-sm" aria-label={`${rating} von 5 Sternen`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i}>★</span>;
        if (i === full && half) return <span key={i} className="opacity-50">★</span>;
        return <span key={i} className="text-gray-300">★</span>;
      })}
      <span className="ml-1 text-gray-600 font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Availability Badge ───────────────────────────────────────────────────────

function SlotBadge({
  slot,
  flashing,
}: {
  slot: VerfuegbarkeitSlot;
  flashing: boolean;
}) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300";
  const colors =
    slot.status === "frei"
      ? "bg-green-100 text-green-700 ring-1 ring-green-300"
      : slot.status === "reserviert"
      ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300"
      : "bg-gray-100 text-gray-400 ring-1 ring-gray-200";

  return (
    <span className={`${base} ${colors} ${flashing ? "scale-110 shadow-md" : ""}`}>
      {slot.status === "frei" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      )}
      {slot.status === "reserviert" && (
        <span className="h-2 w-2 rounded-full bg-yellow-400" />
      )}
      {formatTime(slot.zeit_von)}–{formatTime(slot.zeit_bis)}
    </span>
  );
}

// ─── Anbieter Card ────────────────────────────────────────────────────────────

function AnbieterCard({
  anbieter,
  flashingSlots,
  onBuchen,
}: {
  anbieter: Anbieter;
  flashingSlots: Set<string>;
  onBuchen: (a: Anbieter) => void;
}) {
  const rating = seedRating(anbieter.id);
  const today = todayStr();
  const todaySlots = anbieter.anbieter_verfuegbarkeit.filter(
    (s) => s.datum === today && s.status !== "gesperrt"
  );
  const freieSlots = anbieter.anbieter_verfuegbarkeit.filter(
    (s) => s.status === "frei"
  );
  const minRate = freieSlots.reduce<number | null>((min, s) => {
    if (s.stundensatz === null) return min;
    return min === null ? s.stundensatz : Math.min(min, s.stundensatz);
  }, null);

  const initials = [anbieter.vorname, anbieter.nachname]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase();

  const hasFreiHeute = todaySlots.some((s) => s.status === "frei");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {anbieter.avatar_url ? (
            <img
              src={anbieter.avatar_url}
              alt={initials}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {initials || "?"}
            </div>
          )}
          {hasFreiHeute && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white" title="Heute verfügbar" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {anbieter.vorname} {anbieter.nachname}
          </p>
          <StarRating rating={rating} />
        </div>

        {minRate !== null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-gray-900">
              {minRate.toFixed(0)} €
            </p>
            <p className="text-xs text-gray-400">/ Std.</p>
          </div>
        )}
      </div>

      {/* Description */}
      {anbieter.beschreibung && (
        <p className="text-sm text-gray-500 line-clamp-2">{anbieter.beschreibung}</p>
      )}

      {/* Today's Slots */}
      {todaySlots.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Heute verfügbar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {todaySlots.map((slot) => (
              <SlotBadge
                key={slot.id}
                slot={slot}
                flashing={flashingSlots.has(slot.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Heute keine freien Slots</p>
      )}

      {/* Book Button */}
      <button
        onClick={() => onBuchen(anbieter)}
        disabled={freieSlots.length === 0}
        className="mt-auto w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {freieSlots.length > 0 ? "Jetzt buchen" : "Nicht verfügbar"}
      </button>
    </div>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

type BookingState = "idle" | "loading" | "success" | "error";

function BuchungsModal({
  anbieter,
  onClose,
  onSuccess,
}: {
  anbieter: Anbieter;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const freieSlots = anbieter.anbieter_verfuegbarkeit.filter(
    (s) => s.status === "frei"
  );

  const [selectedSlotId, setSelectedSlotId] = useState(freieSlots[0]?.id ?? "");
  const [leistungsart, setLeistungsart] = useState<Leistungsart>("grundpflege");
  const [notizen, setNotizen] = useState("");
  const [state, setState] = useState<BookingState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedSlot = freieSlots.find((s) => s.id === selectedSlotId);

  const stundensatz = selectedSlot?.stundensatz ?? 0;
  const stunden = selectedSlot
    ? (() => {
        const von = new Date(`2000-01-01T${selectedSlot.zeit_von}`);
        const bis = new Date(`2000-01-01T${selectedSlot.zeit_bis}`);
        return (bis.getTime() - von.getTime()) / 3_600_000;
      })()
    : 0;
  const gesamtbetrag = stunden * stundensatz;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/buchungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anbieter_id: anbieter.id,
          verfuegbarkeit_id: selectedSlot.id,
          datum: selectedSlot.datum,
          zeit_von: selectedSlot.zeit_von,
          zeit_bis: selectedSlot.zeit_bis,
          leistungsart,
          stundensatz,
          notizen: notizen || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Buchung fehlgeschlagen");
      }

      setState("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const initials = [anbieter.vorname, anbieter.nachname]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Buchung anfragen"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Success overlay */}
        {state === "success" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white rounded-3xl gap-4">
            {/* CSS confetti */}
            <div className="confetti-container" aria-hidden="true">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i / 24) * 100}%`,
                    animationDelay: `${(i % 6) * 0.15}s`,
                    backgroundColor: [
                      "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899",
                    ][i % 6],
                  }}
                />
              ))}
            </div>
            <div className="text-6xl">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 text-center">
              Buchungsanfrage gesendet!
            </h3>
            <p className="text-gray-500 text-center text-sm px-8">
              {anbieter.vorname} wurde benachrichtigt und meldet sich in Kürze bei Ihnen.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
              {initials || "?"}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {anbieter.vorname} {anbieter.nachname}
              </p>
              <p className="text-xs text-gray-400">Buchung anfragen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Slot picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Zeitslot auswählen
            </label>
            {freieSlots.length === 0 ? (
              <p className="text-sm text-gray-400">Keine freien Slots verfügbar.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {freieSlots.map((slot) => (
                  <label
                    key={slot.id}
                    className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                      selectedSlotId === slot.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="slot"
                        value={slot.id}
                        checked={selectedSlotId === slot.id}
                        onChange={() => setSelectedSlotId(slot.id)}
                        className="accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(slot.datum)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(slot.zeit_von)} – {formatTime(slot.zeit_bis)} Uhr
                        </p>
                      </div>
                    </div>
                    {slot.stundensatz && (
                      <span className="text-sm font-semibold text-gray-700">
                        {slot.stundensatz.toFixed(0)} € / Std.
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Leistungsart */}
          <div>
            <label htmlFor="leistungsart" className="block text-sm font-medium text-gray-700 mb-1.5">
              Leistungsart
            </label>
            <select
              id="leistungsart"
              value={leistungsart}
              onChange={(e) => setLeistungsart(e.target.value as Leistungsart)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {LEISTUNGSARTEN.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notizen */}
          <div>
            <label htmlFor="notizen" className="block text-sm font-medium text-gray-700 mb-1.5">
              Notizen <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notizen"
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              placeholder="Besondere Anforderungen, Wünsche oder wichtige Informationen..."
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Gesamtbetrag */}
          {selectedSlot && stundensatz > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Gesamtbetrag</p>
                <p className="text-xs text-gray-500">
                  {stunden.toFixed(1)} Std. × {stundensatz.toFixed(0)} €
                </p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {gesamtbetrag.toFixed(2)} €
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={state === "loading" || freieSlots.length === 0}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {state === "loading" ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Wird gesendet…
              </>
            ) : (
              "Buchung anfragen"
            )}
          </button>
          <p className="text-xs text-center text-gray-400 mt-2">
            Zahlung wird erst nach Bestätigung durch den Anbieter fällig.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialAnbieter: Anbieter[];
}

export function PflegeboerseClient({ initialAnbieter }: Props) {
  const [anbieter, setAnbieter] = useState<Anbieter[]>(initialAnbieter);
  const [flashingSlots, setFlashingSlots] = useState<Set<string>>(new Set());
  const [activeCount, setActiveCount] = useState(0);
  const [selectedAnbieter, setSelectedAnbieter] = useState<Anbieter | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Filter state
  const [filterLeistungsart, setFilterLeistungsart] = useState<Leistungsart | "">("");
  const [filterDatum, setFilterDatum] = useState("");
  const [filterMaxRate, setFilterMaxRate] = useState(100);

  const supabaseRef = useRef(createClient());

  // Active count: anbieter with at least one "frei" slot
  useEffect(() => {
    setActiveCount(
      anbieter.filter((a) =>
        a.anbieter_verfuegbarkeit.some((s) => s.status === "frei")
      ).length
    );
  }, [anbieter]);

  // Flash a slot briefly when it updates via Realtime
  const flashSlot = useCallback((slotId: string) => {
    setFlashingSlots((prev) => new Set(prev).add(slotId));
    setTimeout(() => {
      setFlashingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slotId);
        return next;
      });
    }, 800);
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("pflegeboerse-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "anbieter_verfuegbarkeit",
        },
        (payload) => {
          const updated = payload.new as VerfuegbarkeitSlot & { anbieter_id: string };

          setAnbieter((prev) =>
            prev.map((a) => {
              if (a.id !== updated.anbieter_id) return a;

              const existingIdx = a.anbieter_verfuegbarkeit.findIndex(
                (s) => s.id === updated.id
              );

              let newSlots: VerfuegbarkeitSlot[];
              if (payload.eventType === "DELETE") {
                newSlots = a.anbieter_verfuegbarkeit.filter(
                  (s) => s.id !== (payload.old as VerfuegbarkeitSlot).id
                );
              } else if (existingIdx >= 0) {
                newSlots = [...a.anbieter_verfuegbarkeit];
                newSlots[existingIdx] = updated;
              } else {
                newSlots = [...a.anbieter_verfuegbarkeit, updated];
              }

              return { ...a, anbieter_verfuegbarkeit: newSlots };
            })
          );

          if (updated.id) flashSlot(updated.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flashSlot]);

  // Filtered results
  const filtered = anbieter.filter((a) => {
    const slots = a.anbieter_verfuegbarkeit;

    if (filterLeistungsart) {
      // Leistungsart filter: just show anbieter with free slots (no per-anbieter leistungsart field yet)
      if (!slots.some((s) => s.status === "frei")) return false;
    }

    if (filterDatum) {
      if (!slots.some((s) => s.datum === filterDatum && s.status === "frei")) return false;
    }

    if (filterMaxRate < 100) {
      const hasAffordable = slots.some(
        (s) => s.stundensatz !== null && s.stundensatz <= filterMaxRate
      );
      if (!hasAffordable) return false;
    }

    return true;
  });

  function handleBuchungSuccess() {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  }

  return (
    <div className="space-y-6">
      {/* Live counter */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span>
          <strong className="text-gray-900">{activeCount}</strong>{" "}
          Anbieter gerade verfügbar
        </span>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Leistungsart */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Leistungsart
            </label>
            <select
              value={filterLeistungsart}
              onChange={(e) => setFilterLeistungsart(e.target.value as Leistungsart | "")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Leistungen</option>
              {LEISTUNGSARTEN.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Datum */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Datum
            </label>
            <input
              type="date"
              value={filterDatum}
              min={todayStr()}
              onChange={(e) => setFilterDatum(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stundensatz */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Max. Stundensatz:{" "}
              <span className="text-gray-900 font-semibold">
                {filterMaxRate < 100 ? `${filterMaxRate} €` : "Alle"}
              </span>
            </label>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={filterMaxRate}
              onChange={(e) => setFilterMaxRate(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>20 €</span>
              <span>100 €+</span>
            </div>
          </div>
        </div>

        {/* Reset */}
        {(filterLeistungsart || filterDatum || filterMaxRate < 100) && (
          <button
            onClick={() => {
              setFilterLeistungsart("");
              setFilterDatum("");
              setFilterMaxRate(100);
            }}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {filtered.length} Anbieter{filtered.length !== 1 ? "" : ""} gefunden
      </p>

      {/* Anbieter grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">
            Keine Anbieter mit diesen Filterkriterien gefunden.
          </p>
          <button
            onClick={() => {
              setFilterLeistungsart("");
              setFilterDatum("");
              setFilterMaxRate(100);
            }}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {filtered.map((a) => (
            <AnbieterCard
              key={a.id}
              anbieter={a}
              flashingSlots={flashingSlots}
              onBuchen={setSelectedAnbieter}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedAnbieter && (
        <BuchungsModal
          anbieter={selectedAnbieter}
          onClose={() => setSelectedAnbieter(null)}
          onSuccess={handleBuchungSuccess}
        />
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-green-600 px-5 py-3.5 text-white shadow-xl animate-slide-up"
        >
          <span className="text-xl">✓</span>
          <div>
            <p className="font-semibold text-sm">Buchungsanfrage gesendet!</p>
            <p className="text-xs text-green-100">Der Anbieter meldet sich in Kürze.</p>
          </div>
        </div>
      )}

      {/* CSS for confetti + toast animation */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
        }
        .confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          top: 10%;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall 1.4s ease-in forwards;
        }
        @keyframes slide-up {
          from { transform: translateY(1rem); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
