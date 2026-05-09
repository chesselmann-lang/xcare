"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const KATEGORIEN = [
  { value: "pflege_ambulant", label: "Ambulante Pflege" },
  { value: "pflege_stationaer", label: "Stationäre Pflege" },
  { value: "tagespflege", label: "Tagespflege" },
  { value: "kurzzeitpflege", label: "Kurzzeitpflege" },
  { value: "beratung", label: "Beratung" },
  { value: "foerderung", label: "Förderung" },
  { value: "therapie", label: "Therapie" },
  { value: "haushaltshilfe", label: "Haushaltshilfe" },
  { value: "kinderbetreuung", label: "Kinderbetreuung" },
  { value: "jugendhilfe", label: "Jugendhilfe" },
  { value: "eingliederungshilfe", label: "Eingliederungshilfe" },
  { value: "hospizdienst", label: "Hospizdienst" },
  { value: "trauerhilfe", label: "Trauerhilfe" },
  { value: "sonstiges", label: "Sonstiges" },
];

const LEBENSLAGEN = [
  { value: "geburt_fruehe_kindheit", label: "Geburt & frühe Kindheit" },
  { value: "schulkind_jugend", label: "Schulkind & Jugend" },
  { value: "eingliederung_behinderung", label: "Eingliederung & Behinderung" },
  { value: "erwerbsleben_vereinbarkeit", label: "Erwerbsleben & Vereinbarkeit" },
  { value: "krankheit_genesung", label: "Krankheit & Genesung" },
  { value: "alter_pflege", label: "Alter & Pflege" },
  { value: "hospiz_palliativ", label: "Hospiz & Palliativ" },
  { value: "trauer_nachlass", label: "Trauer & Nachlass" },
];

const KOSTENTRAEGER = [
  { value: "gkv", label: "GKV" },
  { value: "sgb_xi", label: "SGB XI" },
  { value: "sgb_viii", label: "SGB VIII" },
  { value: "sgb_ix", label: "SGB IX" },
  { value: "sgb_ii_xii", label: "SGB II/XII" },
  { value: "selbstzahler", label: "Selbstzahler" },
  { value: "stiftung", label: "Stiftung" },
];

export default function NeueLeistungPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLebenslagen, setSelectedLebenslagen] = useState<string[]>([]);
  const [selectedKostentraeger, setSelectedKostentraeger] = useState<string[]>([]);

  const toggleItem = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    // Get current user's anbieter_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Nicht eingeloggt"); setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile?.id).single();

    if (!anbieter) {
      setError("Bitte zuerst das Profil vollständig ausfüllen.");
      setLoading(false);
      return;
    }

    const preisVon = formData.get("preis_von") as string;
    const preisBis = formData.get("preis_bis") as string;
    const preisEinheit = formData.get("preis_einheit") as string;
    const kapazitaet = formData.get("kapazitaet") as string;
    const wartezeit = formData.get("wartezeit_wochen") as string;

    const { error: insertErr } = await supabase.from("leistungen").insert({
      anbieter_id: anbieter.id,
      name: formData.get("name") as string,
      beschreibung: (formData.get("beschreibung") as string) || null,
      kategorie: formData.get("kategorie") as string,
      lebenslage: selectedLebenslagen,
      sgb_paragraf: (formData.get("sgb_paragraf") as string) || null,
      kostentraeger: selectedKostentraeger,
      preis_von: preisVon ? parseFloat(preisVon) : null,
      preis_bis: preisBis ? parseFloat(preisBis) : null,
      preis_einheit: preisEinheit || null,
      kapazitaet: kapazitaet ? parseInt(kapazitaet) : null,
      wartezeit_wochen: wartezeit ? parseInt(wartezeit) : null,
      aktiv: true,
    });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    router.push("/anbieter/leistungen");
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter/leistungen">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Neue Leistung anlegen</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basis-Infos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basisinformationen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name der Leistung *</Label>
              <Input id="name" name="name" required placeholder="z.B. Ambulante Pflege nach SGB XI" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kategorie">Kategorie *</Label>
              <select
                id="kategorie"
                name="kategorie"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Kategorie wählen...</option>
                {KATEGORIEN.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="beschreibung">Beschreibung</Label>
              <Textarea
                id="beschreibung"
                name="beschreibung"
                rows={3}
                placeholder="Beschreiben Sie diese Leistung..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sgb_paragraf">SGB-Paragraph</Label>
              <Input id="sgb_paragraf" name="sgb_paragraf" placeholder="z.B. SGB XI §36" />
            </div>
          </CardContent>
        </Card>

        {/* Lebenslagen */}
        <Card>
          <CardHeader><CardTitle className="text-base">Passende Lebenslagen</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {LEBENSLAGEN.map((ll) => (
                <button
                  key={ll.value}
                  type="button"
                  onClick={() => toggleItem(ll.value, selectedLebenslagen, setSelectedLebenslagen)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                    selectedLebenslagen.includes(ll.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-[--border] hover:bg-[--muted]"
                  }`}
                >
                  {ll.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Kostenträger */}
        <Card>
          <CardHeader><CardTitle className="text-base">Kostenträger</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {KOSTENTRAEGER.map((kt) => (
                <button
                  key={kt.value}
                  type="button"
                  onClick={() => toggleItem(kt.value, selectedKostentraeger, setSelectedKostentraeger)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selectedKostentraeger.includes(kt.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-[--border] hover:bg-[--muted]"
                  }`}
                >
                  {kt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preise & Kapazität */}
        <Card>
          <CardHeader><CardTitle className="text-base">Preise & Kapazität</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="preis_von">Preis ab (€)</Label>
                <Input id="preis_von" name="preis_von" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preis_bis">Preis bis (€)</Label>
                <Input id="preis_bis" name="preis_bis" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preis_einheit">Einheit</Label>
                <select
                  id="preis_einheit"
                  name="preis_einheit"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">– keine –</option>
                  <option value="Stunde">/ Stunde</option>
                  <option value="Tag">/ Tag</option>
                  <option value="Woche">/ Woche</option>
                  <option value="Monat">/ Monat</option>
                  <option value="Pauschal">Pauschal</option>
                  <option value="Einheit">/ Einheit</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="spa