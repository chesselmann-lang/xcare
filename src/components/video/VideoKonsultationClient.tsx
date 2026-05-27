"use client";

import { useState, useEffect, useCallback } from "react";
import { Video, Plus, Clock, X, Calendar, Users, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type TerminStatus = "geplant" | "laufend" | "beendet" | "abgesagt";
type TerminTyp = "beratung" | "pflegeplanung" | "arzt_briefing" | "familienkonferenz" | "notfall";

interface VideoTermin {
  id: string;
  gastgeber_id: string;
  daily_room_name: string | null;
  daily_room_url: string | null;
  geplant_fuer: string;
  dauer_minuten: number;
  typ: TerminTyp;
  status: TerminStatus;
  betreff: string | null;
  agenda: string | null;
  zusammenfassung: string | null;
  created_at: string;
}

interface Props {
  initialTermine: VideoTermin[];
  userId: string;
  userName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TerminStatus, string> = {
  geplant: "Geplant",
  laufend: "Läuft",
  beendet: "Beendet",
  abgesagt: "Abgesagt",
};

const STATUS_VARIANT: Record<TerminStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  geplant: "default",
  laufend: "success",
  beendet: "secondary",
  abgesagt: "destructive",
};

const TYP_LABEL: Record<TerminTyp, string> = {
  beratung: "Beratung",
  pflegeplanung: "Pflegeplanung",
  arzt_briefing: "Arzt-Briefing",
  familienkonferenz: "Familienkonferenz",
  notfall: "Notfall",
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useCountdown(target: string): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Jetzt");
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (d > 0) setLabel(`in ${d}T ${h}Std`);
      else if (h > 0) setLabel(`in ${h}Std ${m}Min`);
      else if (m > 0) setLabel(`in ${m}Min ${s}Sek`);
      else setLabel(`in ${s}Sek`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return label;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CountdownBadge({ geplant_fuer }: { geplant_fuer: string }) {
  const label = useCountdown(geplant_fuer);
  return (
    <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

function VideoModal({
  roomUrl,
  token,
  betreff,
  onClose,
}: {
  roomUrl: string;
  token: string;
  betreff: string | null;
  onClose: () => void;
}) {
  const src = `${roomUrl}?t=${token}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium">{betreff ?? "Video-Konsultation"}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-700"
        >
          <X className="h-3.5 w-3.5" /> Beenden
        </button>
      </div>
      {/* iframe */}
      <iframe
        src={src}
        allow="camera; microphone; autoplay; display-capture; fullscreen"
        className="flex-1 w-full border-0"
        title={betreff ?? "Video-Konsultation"}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoKonsultationClient({ initialTermine, userId, userName }: Props) {
  const [termine, setTermine] = useState<VideoTermin[]>(initialTermine);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{ roomUrl: string; token: string; betreff: string | null } | null>(null);

  // New appointment form state
  const [form, setForm] = useState({
    geplant_fuer: "",
    dauer_minuten: 30,
    typ: "beratung" as TerminTyp,
    betreff: "",
    agenda: "",
    einladungen: ["", "", "", "", ""],
  });

  const handleFormChange = useCallback(
    (field: string, value: string | number) => {
      setForm((f) => ({ ...f, [field]: value }));
    },
    []
  );

  const handleEinladungChange = useCallback((index: number, value: string) => {
    setForm((f) => {
      const einladungen = [...f.einladungen];
      einladungen[index] = value;
      return { ...f, einladungen };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/video/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geplant_fuer: form.geplant_fuer,
          dauer_minuten: form.dauer_minuten,
          typ: form.typ,
          betreff: form.betreff || null,
          agenda: form.agenda || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Fehler beim Erstellen des Termins");
        return;
      }

      // Add new termin to list
      if (json.termin) {
        setTermine((prev) => [json.termin, ...prev].sort(
          (a, b) => new Date(a.geplant_fuer).getTime() - new Date(b.geplant_fuer).getTime()
        ));
      }

      setShowForm(false);
      setForm({
        geplant_fuer: "",
        dauer_minuten: 30,
        typ: "beratung",
        betreff: "",
        agenda: "",
        einladungen: ["", "", "", "", ""],
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (termin: VideoTermin) => {
    if (!termin.daily_room_name || !termin.daily_room_url) return;
    setJoiningId(termin.id);
    setError(null);

    try {
      const res = await fetch("/api/video/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: termin.daily_room_name }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Token konnte nicht abgerufen werden");
        return;
      }

      setModal({ roomUrl: termin.daily_room_url, token: json.token, betreff: termin.betreff });
    } finally {
      setJoiningId(null);
    }
  };

  const upcomingTermine = termine.filter((t) => t.status !== "beendet" && t.status !== "abgesagt");
  const nextTermin = upcomingTermine[0] ?? null;

  return (
    <>
      {/* Video modal */}
      {modal && (
        <VideoModal
          roomUrl={modal.roomUrl}
          token={modal.token}
          betreff={modal.betreff}
          onClose={() => setModal(null)}
        />
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Next meeting banner */}
      {nextTermin && (
        <div className="mb-6 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-800">
          <Video className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              Nächster Termin: {nextTermin.betreff ?? TYP_LABEL[nextTermin.typ]}
            </p>
            <p className="text-xs mt-0.5">{formatDatetime(nextTermin.geplant_fuer)}</p>
          </div>
          <CountdownBadge geplant_fuer={nextTermin.geplant_fuer} />
          <Button
            size="sm"
            onClick={() => handleJoin(nextTermin)}
            disabled={joiningId === nextTermin.id}
            className="shrink-0 gap-1.5"
          >
            {joiningId === nextTermin.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Beitreten
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Geplante Termine ────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Geplante Termine
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Neuer Termin
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingTermine.length === 0 ? (
              <div className="text-center py-10 text-[--muted-foreground]">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Keine geplanten Termine</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-4 w-4" /> Ersten Termin planen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTermine.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[--border] hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Video className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {t.betreff ?? TYP_LABEL[t.typ]}
                        </p>
                        <Badge variant={STATUS_VARIANT[t.status]} className="text-xs">
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-[--muted-foreground] mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {formatDatetime(t.geplant_fuer)} · {t.dauer_minuten} Min.
                      </p>
                      <p className="text-xs text-[--muted-foreground]">{TYP_LABEL[t.typ]}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <CountdownBadge geplant_fuer={t.geplant_fuer} />
                      {t.daily_room_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleJoin(t)}
                          disabled={joiningId === t.id}
                        >
                          {joiningId === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Video className="h-3 w-3" />
                          )}
                          Beitreten
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Neuer Termin Form ───────────────────────────────── */}
        <Card className={showForm ? "" : "opacity-60"}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Neuen Termin planen
            </CardTitle>
            {showForm && (
              <button
                onClick={() => setShowForm(false)}
                className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {!showForm ? (
              <div className="text-center py-10">
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Termin planen
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Betreff */}
                <div>
                  <label className="text-xs font-medium text-[--foreground] mb-1.5 block">
                    Betreff
                  </label>
                  <input
                    type="text"
                    value={form.betreff}
                    onChange={(e) => handleFormChange("betreff", e.target.value)}
                    placeholder="z.B. Pflegeplanung Erstgespräch"
                    className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    maxLength={200}
                  />
                </div>

                {/* Datum & Zeit */}
                <div>
                  <label className="text-xs font-medium text-[--foreground] mb-1.5 block">
                    Datum & Uhrzeit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.geplant_fuer}
                    onChange={(e) => handleFormChange("geplant_fuer", e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  />
                </div>

                {/* Typ & Dauer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--foreground] mb-1.5 block">
                      Typ
                    </label>
                    <select
                      value={form.typ}
                      onChange={(e) => handleFormChange("typ", e.target.value)}
                      className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {(Object.entries(TYP_LABEL) as [TerminTyp, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--foreground] mb-1.5 block">
                      Dauer (Min.)
                    </label>
                    <select
                      value={form.dauer_minuten}
                      onChange={(e) => handleFormChange("dauer_minuten", Number(e.target.value))}
                      className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {[15, 30, 45, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>{d} Min.</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Agenda */}
                <div>
                  <label className="text-xs font-medium text-[--foreground] mb-1.5 block">
                    Agenda (optional)
                  </label>
                  <textarea
                    value={form.agenda}
                    onChange={(e) => handleFormChange("agenda", e.target.value)}
                    placeholder="Gesprächspunkte..."
                    rows={3}
                    maxLength={1000}
                    className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                  />
                </div>

                {/* Einladungen */}
                <div>
                  <label className="text-xs font-medium text-[--foreground] mb-1.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Einladungen (bis zu 5 E-Mail-Adressen)
                  </label>
                  <div className="space-y-2">
                    {form.einladungen.map((email, i) => (
                      <input
                        key={i}
                        type="email"
                        value={email}
                        onChange={(e) => handleEinladungChange(i, e.target.value)}
                        placeholder={`E-Mail ${i + 1}`}
                        className="w-full text-sm border border-[--border] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[--muted-foreground] mt-1">
                    Teilnehmer erhalten eine E-Mail mit dem Raumlink.
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Wird erstellt…
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" /> Raum erstellen & Einladungen senden
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
