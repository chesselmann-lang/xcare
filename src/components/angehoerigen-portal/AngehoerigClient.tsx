"use client";

import { useState } from "react";
import {
  Heart, User, Mail, PlusCircle, Trash2, Eye, EyeOff,
  CheckCircle, Clock, Sun, Moon, Utensils, Activity,
  MessageSquare, ChevronDown, ChevronUp, Shield, Bell
} from "lucide-react";

type Angehoeriger = {
  id: string;
  email: string;
  name?: string | null;
  beziehung?: string | null;
  sieht_pflegebericht: boolean;
  sieht_vitalwerte: boolean;
  sieht_medikamente: boolean;
  sieht_pflegeplanung: boolean;
  eingeladen_am: string;
  angenommen_am?: string | null;
  aktiv: boolean;
};

type TagesUpdate = {
  id: string;
  datum: string;
  allgemeinzustand: string;
  stimmung?: string | null;
  nachricht?: string | null;
  aktivitaeten?: string[] | null;
  mahlzeiten_ok?: boolean | null;
  schlaf_ok?: boolean | null;
  besonderheiten?: string | null;
  sichtbar_fuer_angehoerige: boolean;
  profiles?: { vorname?: string; nachname?: string } | null;
};

type Bewohner = {
  id: string;
  vorname: string;
  nachname: string;
};

type Props = {
  bewohner: Bewohner;
  initialAngehoerige: Angehoeriger[];
  initialUpdates: TagesUpdate[];
};

const ZUSTAND_COLORS: Record<string, string> = {
  sehr_gut: "text-green-600 bg-green-50",
  gut: "text-green-500 bg-green-50",
  mittel: "text-amber-600 bg-amber-50",
  schlecht: "text-red-600 bg-red-50",
};
const ZUSTAND_LABELS: Record<string, string> = {
  sehr_gut: "Sehr gut", gut: "Gut", mittel: "Mittel", schlecht: "Beeinträchtigt",
};
const BEZIEHUNG_LABELS: Record<string, string> = {
  kind: "Kind", partner: "Partner/in", geschwister: "Geschwister", sonstiges: "Sonstige/r",
};

const AKTIVITAETEN_OPTIONEN = [
  "Spaziergang", "Malen", "Singen", "Lesen", "Gesellschaftsspiele",
  "Gymnastik", "Fernsehen", "Gartenarbeit", "Kochen", "Handarbeit",
];

export function AngehoerigClient({ bewohner, initialAngehoerige, initialUpdates }: Props) {
  const [tab, setTab] = useState<"updates" | "angehoerige" | "neu">("updates");
  const [angehoerige, setAngehoerige] = useState(initialAngehoerige);
  const [updates, setUpdates] = useState(initialUpdates);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);

  // Einladung
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteBeziehung, setInviteBeziehung] = useState("kind");
  const [invitePerms, setInvitePerms] = useState({
    pflegebericht: true, vitalwerte: true, medikamente: false, pflegeplanung: false,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Neues Update
  const [updateForm, setUpdateForm] = useState({
    allgemeinzustand: "gut",
    stimmung: "ruhig",
    nachricht: "",
    aktivitaeten: [] as string[],
    mahlzeiten_ok: true,
    schlaf_ok: true,
    besonderheiten: "",
    sichtbar: true,
  });
  const [postingUpdate, setPostingUpdate] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohner.id}/angehoerige`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          beziehung: inviteBeziehung,
          sieht_pflegebericht: invitePerms.pflegebericht,
          sieht_vitalwerte: invitePerms.vitalwerte,
          sieht_medikamente: invitePerms.medikamente,
          sieht_pflegeplanung: invitePerms.pflegeplanung,
        }),
      });
      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail(""); setInviteName("");
        // Reload list
        const listRes = await fetch(`/api/bewohner/${bewohner.id}/angehoerige`);
        if (listRes.ok) {
          const d = await listRes.json();
          setAngehoerige(d.angehoerige ?? []);
        }
        setTimeout(() => setInviteSuccess(false), 3000);
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id: string) => {
    await fetch(`/api/bewohner/${bewohner.id}/angehoerige?angehoerigen_id=${id}`, { method: "DELETE" });
    setAngehoerige(prev => prev.filter(a => a.id !== id));
  };

  const toggleAktivitaet = (a: string) => {
    setUpdateForm(prev => ({
      ...prev,
      aktivitaeten: prev.aktivitaeten.includes(a)
        ? prev.aktivitaeten.filter(x => x !== a)
        : [...prev.aktivitaeten, a],
    }));
  };

  const handlePostUpdate = async () => {
    setPostingUpdate(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohner.id}/tagesupdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allgemeinzustand: updateForm.allgemeinzustand,
          stimmung: updateForm.stimmung,
          nachricht: updateForm.nachricht || null,
          aktivitaeten: updateForm.aktivitaeten,
          mahlzeiten_ok: updateForm.mahlzeiten_ok,
          schlaf_ok: updateForm.schlaf_ok,
          besonderheiten: updateForm.besonderheiten || null,
          sichtbar_fuer_angehoerige: updateForm.sichtbar,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setUpdates(prev => [d.update, ...prev]);
        setUpdateForm({
          allgemeinzustand: "gut", stimmung: "ruhig", nachricht: "",
          aktivitaeten: [], mahlzeiten_ok: true, schlaf_ok: true,
          besonderheiten: "", sichtbar: true,
        });
        setTab("updates");
      }
    } finally {
      setPostingUpdate(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Angehörigen-Portal</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            {bewohner.vorname} {bewohner.nachname} — Familie informieren
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[--muted-foreground]">
          <Heart className="h-4 w-4 text-rose-500" />
          <span>{angehoerige.filter(a => a.aktiv).length} Angehörige eingeladen</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[--border]">
        {[
          { key: "updates", label: "Tages-Updates", icon: Sun },
          { key: "angehoerige", label: "Angehörige", icon: User },
          { key: "neu", label: "Update schreiben", icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-[--primary] text-[--primary]"
                : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Updates */}
      {tab === "updates" && (
        <div className="space-y-3">
          {updates.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <Sun className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Noch keine Tages-Updates</p>
              <p className="text-sm mt-1">Schreiben Sie das erste Update für die Angehörigen.</p>
              <button
                onClick={() => setTab("neu")}
                className="mt-4 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm"
              >
                Erstes Update schreiben
              </button>
            </div>
          ) : (
            updates.map(u => {
              const isExp = expandedUpdate === u.id;
              return (
                <div key={u.id} className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedUpdate(isExp ? null : u.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[--muted]/20 transition-colors text-left"
                  >
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${ZUSTAND_COLORS[u.allgemeinzustand] ?? "bg-gray-100 text-gray-700"}`}>
                      {ZUSTAND_LABELS[u.allgemeinzustand] ?? u.allgemeinzustand}
                    </div>
                    <span className="text-sm font-medium">
                      {new Date(u.datum).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
                    </span>
                    {u.stimmung && (
                      <span className="text-xs text-[--muted-foreground]">· {u.stimmung}</span>
                    )}
                    {!u.sichtbar_fuer_angehoerige && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                        <EyeOff className="h-3.5 w-3.5" />
                        Intern
                      </span>
                    )}
                    <span className="ml-auto">
                      {isExp ? <ChevronUp className="h-4 w-4 text-[--muted-foreground]" /> : <ChevronDown className="h-4 w-4 text-[--muted-foreground]" />}
                    </span>
                  </button>

                  {isExp && (
                    <div className="px-4 pb-4 border-t border-[--border] pt-3 space-y-3">
                      {u.nachricht && (
                        <p className="text-sm">{u.nachricht}</p>
                      )}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Utensils className={`h-4 w-4 ${u.mahlzeiten_ok ? "text-green-500" : "text-red-500"}`} />
                          <span>Mahlzeiten {u.mahlzeiten_ok ? "✓" : "Auffällig"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Moon className={`h-4 w-4 ${u.schlaf_ok ? "text-blue-500" : "text-amber-500"}`} />
                          <span>Schlaf {u.schlaf_ok ? "✓" : "Gestört"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-purple-500" />
                          <span>{(u.aktivitaeten?.length ?? 0)} Aktivitäten</span>
                        </div>
                      </div>
                      {(u.aktivitaeten?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {u.aktivitaeten!.map(a => (
                            <span key={a} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{a}</span>
                          ))}
                        </div>
                      )}
                      {u.besonderheiten && (
                        <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                          ⚠️ {u.besonderheiten}
                        </div>
                      )}
                      <div className="text-xs text-[--muted-foreground]">
                        Eingetragen von: {u.profiles ? `${u.profiles.vorname} ${u.profiles.nachname}` : "Pflegekraft"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Angehörige */}
      {tab === "angehoerige" && (
        <div className="space-y-4">
          {/* Einladungsformular */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-[--primary]" />
              <h3 className="font-semibold">Angehörigen einladen</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="E-Mail-Adresse"
                className="col-span-2 px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
              />
              <input
                type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="Name (optional)"
                className="px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
              />
              <select
                value={inviteBeziehung} onChange={e => setInviteBeziehung(e.target.value)}
                className="px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
              >
                {Object.entries(BEZIEHUNG_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[--muted-foreground] flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Zugriffsrechte
              </div>
              {[
                { key: "pflegebericht", label: "Pflegebericht & Tages-Updates" },
                { key: "vitalwerte", label: "Vitalwerte" },
                { key: "medikamente", label: "Medikamentenplan" },
                { key: "pflegeplanung", label: "Pflegeplanung & Ziele" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invitePerms[key as keyof typeof invitePerms]}
                    onChange={e => setInvitePerms(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {inviteSuccess ? <CheckCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {inviteSuccess ? "Einladung gesendet!" : inviting ? "Sende…" : "Einladen"}
            </button>
          </div>

          {/* Angehörigen-Liste */}
          <div className="space-y-2">
            {angehoerige.filter(a => a.aktiv).map(a => (
              <div key={a.id} className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-medium">{a.name ?? a.email}</div>
                    {a.name && <div className="text-xs text-[--muted-foreground]">{a.email}</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-[--muted] px-1.5 py-0.5 rounded">
                        {BEZIEHUNG_LABELS[a.beziehung ?? "sonstiges"]}
                      </span>
                      {a.angenommen_am ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" /> Aktiv
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" /> Einladung ausstehend
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {a.sieht_pflegebericht && <span className="text-xs text-blue-600">Berichte</span>}
                      {a.sieht_vitalwerte && <span className="text-xs text-blue-600">· Vitalwerte</span>}
                      {a.sieht_medikamente && <span className="text-xs text-blue-600">· Medikamente</span>}
                      {a.sieht_pflegeplanung && <span className="text-xs text-blue-600">· Pflegeplanung</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(a.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {angehoerige.filter(a => a.aktiv).length === 0 && (
              <div className="text-center py-8 text-[--muted-foreground] text-sm">
                Noch keine Angehörigen eingeladen.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Neues Update */}
      {tab === "neu" && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-5 space-y-5">
          <h3 className="font-semibold">Tages-Update schreiben</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1.5 block">Allgemeinzustand</label>
              <select
                value={updateForm.allgemeinzustand}
                onChange={e => setUpdateForm(p => ({ ...p, allgemeinzustand: e.target.value }))}
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
              >
                <option value="sehr_gut">Sehr gut</option>
                <option value="gut">Gut</option>
                <option value="mittel">Mittel</option>
                <option value="schlecht">Beeinträchtigt</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1.5 block">Stimmung</label>
              <select
                value={updateForm.stimmung}
                onChange={e => setUpdateForm(p => ({ ...p, stimmung: e.target.value }))}
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
              >
                <option value="froelich">Fröhlich</option>
                <option value="ruhig">Ruhig</option>
                <option value="unruhig">Unruhig</option>
                <option value="traurig">Traurig</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-1.5 block">Nachricht an Angehörige</label>
            <textarea
              rows={3}
              value={updateForm.nachricht}
              onChange={e => setUpdateForm(p => ({ ...p, nachricht: e.target.value }))}
              placeholder="Wie war der Tag? Was haben wir zusammen gemacht?"
              className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox" checked={updateForm.mahlzeiten_ok}
                onChange={e => setUpdateForm(p => ({ ...p, mahlzeiten_ok: e.target.checked }))}
                className="rounded"
              />
              <Utensils className="h-4 w-4 text-green-500" />
              Mahlzeiten gut
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox" checked={updateForm.schlaf_ok}
                onChange={e => setUpdateForm(p => ({ ...p, schlaf_ok: e.target.checked }))}
                className="rounded"
              />
              <Moon className="h-4 w-4 text-blue-500" />
              Schlaf gut
            </label>
          </div>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-2 block">Aktivitäten heute</label>
            <div className="flex flex-wrap gap-2">
              {AKTIVITAETEN_OPTIONEN.map(a => (
                <button
                  key={a}
                  onClick={() => toggleAktivitaet(a)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    updateForm.aktivitaeten.includes(a)
                      ? "bg-purple-600 text-white"
                      : "bg-[--muted] text-[--foreground] hover:bg-purple-50 hover:text-purple-700"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-1.5 block">Besonderheiten (intern)</label>
            <input
              type="text"
              value={updateForm.besonderheiten}
              onChange={e => setUpdateForm(p => ({ ...p, besonderheiten: e.target.value }))}
              placeholder="z.B. Sturz, Arztbesuch, Medikamentenänderung"
              className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox" checked={updateForm.sichtbar}
              onChange={e => setUpdateForm(p => ({ ...p, sichtbar: e.target.checked }))}
              className="rounded"
            />
            <Eye className="h-4 w-4 text-[--muted-foreground]" />
            Für Angehörige sichtbar
          </label>

          <button
            onClick={handlePostUpdate}
            disabled={postingUpdate}
            className="w-full py-2.5 bg-[--primary] text-[--primary-foreground] rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {postingUpdate ? "Speichern…" : "Update veröffentlichen"}
          </button>
        </div>
      )}
    </div>
  );
}
