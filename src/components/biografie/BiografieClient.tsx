"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  User, Briefcase, Heart, Music, Star, MessageSquare,
  Save, ChevronDown, ChevronUp, BookOpen, Globe, Home
} from "lucide-react";

type Biografie = {
  id?: string;
  geburtsort?: string;
  geburtsland?: string;
  nationalitaet?: string;
  muttersprache?: string;
  weitere_sprachen?: string[];
  familienstand?: string;
  kinder_anzahl?: number;
  geschwister_anzahl?: number;
  kindheit_jugend?: string;
  ausbildung_beruf?: string;
  wichtige_lebensereignisse?: string;
  wohnorte?: string;
  kriegserfahrungen?: boolean;
  fluchterfahrungen?: boolean;
  vorlieben?: string[];
  abneigungen?: string[];
  rituale_gewohnheiten?: string;
  schlafgewohnheiten?: string;
  mahlzeiten_besonderheiten?: string;
  religion?: string;
  religioese_praktiken?: string;
  kulturelle_besonderheiten?: string;
  bestattungswuensche?: string;
  lieblingsmusik?: string[];
  lieblingsfilme_buecher?: string[];
  hobbys_frueher?: string[];
  hobbys_jetzt?: string[];
  wichtige_bezugspersonen?: string;
  haustiere_frueher?: string;
  berufe?: string[];
  kommunikations_tipps?: string;
  beruhigungs_tipps?: string;
  aktivierungs_tipps?: string;
};

type Props = {
  bewohnerId: string;
  bewohnerName: string;
  initialBiografie: Biografie | null;
};

const SECTIONS = [
  { key: "person", label: "Persönliche Angaben", icon: User },
  { key: "leben", label: "Lebensgeschichte", icon: BookOpen },
  { key: "gewohnheiten", label: "Persönlichkeit & Gewohnheiten", icon: Heart },
  { key: "kultur", label: "Religion & Kultur", icon: Globe },
  { key: "interessen", label: "Interessen & Hobbys", icon: Music },
  { key: "tipps", label: "Pflegehinweise aus der Biografie", icon: Star },
];

function TagInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[--primary]/10 text-[--primary] rounded-full text-xs">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Eingabe + Enter"
          className="flex-1 px-3 py-1.5 border border-[--border] rounded-lg text-sm bg-[--background]"
        />
        <button onClick={add} className="px-3 py-1.5 border border-[--border] rounded-lg text-sm hover:bg-[--muted]">+</button>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-y"
      />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
      />
    </div>
  );
}

export function BiografieClient({ bewohnerId, bewohnerName, initialBiografie }: Props) {
  const [bio, setBio] = useState<Biografie>(initialBiografie ?? {});
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string>("person");

  const set = <K extends keyof Biografie>(key: K, value: Biografie[K]) =>
    setBio(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/biografie`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bio),
      });
      if (!res.ok) throw new Error();
      toast.success("Biografie gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lebensbiografie</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">{bewohnerName} — Personenzentrierte Pflegedokumentation</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Speichere…" : "Biografie speichern"}
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Personenzentrierte Pflege:</strong> Die Lebensbiografie hilft dem Pflegeteam, {bewohnerName} als Person mit
        einer einzigartigen Geschichte zu verstehen. Besonders bei Demenz sind biografische Kenntnisse unverzichtbar
        für eine würdevolle, individuell zugeschnittene Begleitung.
      </div>

      {/* Sections */}
      {SECTIONS.map(({ key, label, icon: Icon }) => (
        <div key={key} className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === key ? "" : key)}
            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[--muted]/20 transition-colors text-left"
          >
            <Icon className="h-5 w-5 text-[--primary] shrink-0" />
            <span className="font-semibold flex-1">{label}</span>
            {openSection === key
              ? <ChevronUp className="h-4 w-4 text-[--muted-foreground]" />
              : <ChevronDown className="h-4 w-4 text-[--muted-foreground]" />
            }
          </button>

          {openSection === key && (
            <div className="px-5 pb-5 border-t border-[--border] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {key === "person" && <>
                <Field label="Geburtsort" value={bio.geburtsort ?? ""} onChange={v => set("geburtsort", v)} placeholder="z.B. Berlin" />
                <Field label="Geburtsland" value={bio.geburtsland ?? ""} onChange={v => set("geburtsland", v)} placeholder="z.B. Deutschland" />
                <Field label="Nationalität" value={bio.nationalitaet ?? ""} onChange={v => set("nationalitaet", v)} />
                <Field label="Muttersprache" value={bio.muttersprache ?? ""} onChange={v => set("muttersprache", v)} />
                <div className="md:col-span-2">
                  <TagInput label="Weitere Sprachen" value={bio.weitere_sprachen ?? []} onChange={v => set("weitere_sprachen", v)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Familienstand</label>
                  <select
                    value={bio.familienstand ?? ""}
                    onChange={e => set("familienstand", e.target.value)}
                    className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
                  >
                    <option value="">– bitte wählen –</option>
                    {["ledig", "verheiratet", "verwitwet", "geschieden", "getrennt lebend", "in Partnerschaft"].map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Anzahl Kinder" value={bio.kinder_anzahl ?? ""} type="number" onChange={v => set("kinder_anzahl", parseInt(v) || 0)} />
                  <Field label="Anzahl Geschwister" value={bio.geschwister_anzahl ?? ""} type="number" onChange={v => set("geschwister_anzahl", parseInt(v) || 0)} />
                </div>
                <div className="md:col-span-2">
                  <TagInput label="Berufe (chronologisch)" value={bio.berufe ?? []} onChange={v => set("berufe", v)} />
                </div>
              </>}

              {key === "leben" && <>
                <div className="md:col-span-2">
                  <Textarea label="Kindheit & Jugend" value={bio.kindheit_jugend ?? ""} onChange={v => set("kindheit_jugend", v)} rows={4}
                    placeholder="Wo aufgewachsen, Geschwister, Schule, prägende Erlebnisse…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Ausbildung & Beruf" value={bio.ausbildung_beruf ?? ""} onChange={v => set("ausbildung_beruf", v)} rows={3}
                    placeholder="Ausbildung, Studium, Berufsleben, besondere Leistungen…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Wichtige Lebensereignisse" value={bio.wichtige_lebensereignisse ?? ""} onChange={v => set("wichtige_lebensereignisse", v)} rows={4}
                    placeholder="Hochzeit, Kinder, Verluste, Auswanderung, Kriegserlebnisse, Wendepunkte…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Wohnorte" value={bio.wohnorte ?? ""} onChange={v => set("wohnorte", v)} rows={2}
                    placeholder="Städte, Länder wo gelebt wurde…" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="krieg" checked={bio.kriegserfahrungen ?? false}
                    onChange={e => set("kriegserfahrungen", e.target.checked)}
                    className="h-4 w-4 rounded" />
                  <label htmlFor="krieg" className="text-sm">Kriegserfahrungen vorhanden</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="flucht" checked={bio.fluchterfahrungen ?? false}
                    onChange={e => set("fluchterfahrungen", e.target.checked)}
                    className="h-4 w-4 rounded" />
                  <label htmlFor="flucht" className="text-sm">Fluchterfahrungen / Vertreibung</label>
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Wichtige Bezugspersonen (Name + Beziehung)" value={bio.wichtige_bezugspersonen ?? ""} onChange={v => set("wichtige_bezugspersonen", v)} rows={2}
                    placeholder="z.B. Maria Müller (Tochter), Thomas Schmidt (Freund)…" />
                </div>
              </>}

              {key === "gewohnheiten" && <>
                <div className="md:col-span-2">
                  <TagInput label="Vorlieben (Essen, Aktivitäten, Musik…)" value={bio.vorlieben ?? []} onChange={v => set("vorlieben", v)} />
                </div>
                <div className="md:col-span-2">
                  <TagInput label="Abneigungen / Ängste" value={bio.abneigungen ?? []} onChange={v => set("abneigungen", v)} />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Rituale & Gewohnheiten" value={bio.rituale_gewohnheiten ?? ""} onChange={v => set("rituale_gewohnheiten", v)} rows={3}
                    placeholder="Morgenritual, Abendroutine, Lieblingsplatz, wichtige Alltagsstruktur…" />
                </div>
                <Textarea label="Schlafgewohnheiten" value={bio.schlafgewohnheiten ?? ""} onChange={v => set("schlafgewohnheiten", v)} rows={2}
                  placeholder="Schlafenszeiten, Nickerchen, Schlafposition…" />
                <Textarea label="Mahlzeiten & Ernährung" value={bio.mahlzeiten_besonderheiten ?? ""} onChange={v => set("mahlzeiten_besonderheiten", v)} rows={2}
                  placeholder="Lieblingsgerichte, Diät, Essgewohnheiten, Portionsgrößen…" />
                <div className="md:col-span-2">
                  <Field label="Haustiere (früher)" value={bio.haustiere_frueher ?? ""} onChange={v => set("haustiere_frueher", v)}
                    placeholder="z.B. Hund namens Rex (Schäferhund, 1980–1995)" />
                </div>
              </>}

              {key === "kultur" && <>
                <Field label="Religion / Weltanschauung" value={bio.religion ?? ""} onChange={v => set("religion", v)} placeholder="z.B. Evangelisch, Katholisch, Islam, Atheist…" />
                <div className="md:col-span-2">
                  <Textarea label="Religiöse Praktiken & Wünsche" value={bio.religioese_praktiken ?? ""} onChange={v => set("religioese_praktiken", v)} rows={3}
                    placeholder="Gebet, Kirche/Moschee, Festtage, Sakramente, Sterblichkeitsvorstellungen…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Kulturelle Besonderheiten" value={bio.kulturelle_besonderheiten ?? ""} onChange={v => set("kulturelle_besonderheiten", v)} rows={3}
                    placeholder="Traditionen, Bräuche, politische Erfahrungen, Heimatverbundenheit…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Bestattungswünsche (sofern bekannt)" value={bio.bestattungswuensche ?? ""} onChange={v => set("bestattungswuensche", v)} rows={2}
                    placeholder="Kirchlich, weltlich, Feuerbestattung, Friedwald…" />
                </div>
              </>}

              {key === "interessen" && <>
                <div className="md:col-span-2">
                  <TagInput label="Lieblingsmusik / Musikstile" value={bio.lieblingsmusik ?? []} onChange={v => set("lieblingsmusik", v)} />
                </div>
                <div className="md:col-span-2">
                  <TagInput label="Lieblingsfilme / Bücher / Autoren" value={bio.lieblingsfilme_buecher ?? []} onChange={v => set("lieblingsfilme_buecher", v)} />
                </div>
                <div className="md:col-span-2">
                  <TagInput label="Hobbys (früher)" value={bio.hobbys_frueher ?? []} onChange={v => set("hobbys_frueher", v)} />
                </div>
                <div className="md:col-span-2">
                  <TagInput label="Hobbys / Interessen (jetzt noch möglich)" value={bio.hobbys_jetzt ?? []} onChange={v => set("hobbys_jetzt", v)} />
                </div>
              </>}

              {key === "tipps" && <>
                <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-2">
                  Diese Hinweise werden direkt aus der Biografie abgeleitet und helfen dem Pflegeteam im Alltag.
                </div>
                <div className="md:col-span-2">
                  <Textarea label="💬 Kommunikations-Tipps" value={bio.kommunikations_tipps ?? ""} onChange={v => set("kommunikations_tipps", v)} rows={3}
                    placeholder="z.B. Spricht am liebsten über die Nachkriegszeit, mag Dialekt, reagiert gut auf Lob…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="🧘 Beruhigungs-Tipps (bei Unruhe/Angst)" value={bio.beruhigungs_tipps ?? ""} onChange={v => set("beruhigungs_tipps", v)} rows={3}
                    placeholder="z.B. Schlager aus den 50ern hören, altes Fotoalbum zeigen, Haustier-Fotos…" />
                </div>
                <div className="md:col-span-2">
                  <Textarea label="✨ Aktivierungs-Tipps" value={bio.aktivierungs_tipps ?? ""} onChange={v => set("aktivierungs_tipps", v)} rows={3}
                    placeholder="z.B. Früher gärtnerisch aktiv — Blumen sortieren motiviert, mag Kartenspiele…" />
                </div>
              </>}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[--primary] text-[--primary-foreground] rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Speichere…" : "Biografie speichern"}
      </button>
    </div>
  );
}
