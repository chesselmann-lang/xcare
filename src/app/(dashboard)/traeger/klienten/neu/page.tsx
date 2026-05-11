"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Search } from "lucide-react";
import Link from "next/link";

const LEBENSLAGEN = [
  { value: "alter_pflege", label: "Alter & Pflege" },
  { value: "geburt_fruehe_kindheit", label: "Geburt & frühe Kindheit" },
  { value: "schulkind_jugend", label: "Schulkind & Jugend" },
  { value: "eingliederung_behinderung", label: "Behinderung & Eingliederung" },
  { value: "erwerbsleben_vereinbarkeit", label: "Erwerbsleben & Vereinbarkeit" },
  { value: "krankheit_genesung", label: "Krankheit & Genesung" },
  { value: "hospiz_palliativ", label: "Hospiz & Palliativ" },
  { value: "trauer_nachlass", label: "Trauer & Nachlass" },
];

export default function NeuerKlientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [checkingAnsprueche, setCheckingAnsprueche] = useState(false);
  const [form, setForm] = useState({
    klienten_nr: `F-${Date.now().toString().slice(-6)}`,
    vorname: "",
    nachname: "",
    geburtsjahr: "",
    plz: "",
    lebenslage: "",
    pflegegrad: "",
    notizen: "",
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Nicht angemeldet"); setSaving(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();

    const { data: traeger } = await supabase
      .from("traeger_profiles").select("id").eq("profile_id", profile?.id).single();

    if (!traeger) { toast.error("Kein Träger-Profil gefunden"); setSaving(false); return; }

    const { data, error } = await supabase.from("traeger_klienten").insert({
      traeger_id: traeger.id,
      klienten_nr: form.klienten_nr,
      vorname: form.vorname || null,
      nachname: form.nachname || null,
      geburtsjahr: form.geburtsjahr ? parseInt(form.geburtsjahr) : null,
      plz: form.plz || null,
      lebenslage: form.lebenslage || null,
      pflegegrad: form.pflegegrad ? parseInt(form.pflegegrad) : null,
      notizen: form.notizen || null,
    }).select("id").single();

    if (error) {
      toast.error("Fehler beim Speichern: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Klient angelegt");
    router.push(`/traeger/klienten/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/traeger/klienten" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Neuer Klient</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fallnummer *</label>
            <input
              required
              value={form.klienten_nr}
              onChange={(e) => set("klienten_nr", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              placeholder="F-123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
            <input
              value={form.plz}
              onChange={(e) => set("plz", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              placeholder="12345"
              maxLength={5}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vorname (optional)</label>
            <input
              value={form.vorname}
              onChange={(e) => set("vorname", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              placeholder="Max"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachname (optional)</label>
            <input
              value={form.nachname}
              onChange={(e) => set("nachname", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              placeholder="Mustermann"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsjahr</label>
            <input
              type="number"
              value={form.geburtsjahr}
              onChange={(e) => set("geburtsjahr", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
              placeholder="1950"
              min={1900}
              max={new Date().getFullYear()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pflegegrad</label>
            <select
              value={form.pflegegrad}
              onChange={(e) => set("pflegegrad", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            >
              <option value="">— kein Pflegegrad</option>
              {[1, 2, 3, 4, 5].map((pg) => (
                <option key={pg} value={pg}>Pflegegrad {pg}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lebenslage</label>
          <select
            value={form.lebenslage}
            onChange={(e) => set("lebenslage", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
          >
            <option value="">— Lebenslage auswählen</option>
            {LEBENSLAGEN.map((ll) => (
              <option key={ll.value} value={ll.value}>{ll.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
          <textarea
            value={form.notizen}
            onChange={(e) => set("notizen", e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary]"
            placeholder="Interne Fallnotizen…"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[--primary] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Speichern…" : "Klient anlegen"}
          </button>
          <Link href="/traeger/klienten" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
