"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Anbieter, Profile } from "@/lib/types";

interface ProfilFormularProps {
  anbieter: Anbieter | null;
  profile: Profile | null;
}

export default function ProfilFormular({ anbieter, profile }: ProfilFormularProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: anbieter?.name ?? "",
    beschreibung: anbieter?.beschreibung ?? "",
    traeger: anbieter?.traeger ?? "",
    strasse: anbieter?.strasse ?? "",
    plz: anbieter?.plz ?? "",
    ort: anbieter?.ort ?? "",
    telefon: anbieter?.telefon ?? "",
    email: anbieter?.email ?? "",
    website: anbieter?.website ?? "",
    // Profil fields
    vorname: profile?.vorname ?? "",
    nachname: profile?.nachname ?? "",
    profilTelefon: profile?.telefon ?? "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    try {
      // Update profile
      if (profile?.id) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            vorname: form.vorname || null,
            nachname: form.nachname || null,
            telefon: form.profilTelefon || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
        if (profileErr) throw profileErr;
      }

      // Update or insert Anbieter
      if (anbieter?.id) {
        const { error: anbieterErr } = await supabase
          .from("anbieter")
          .update({
            name: form.name,
            beschreibung: form.beschreibung || null,
            traeger: form.traeger || null,
            strasse: form.strasse || null,
            plz: form.plz || null,
            ort: form.ort || null,
            telefon: form.telefon || null,
            email: form.email || null,
            website: form.website || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", anbieter.id);
        if (anbieterErr) throw anbieterErr;
      } else if (profile?.id) {
        const { error: insertErr } = await supabase.from("anbieter").insert({
          profile_id: profile.id,
          name: form.name,
          beschreibung: form.beschreibung || null,
          traeger: form.traeger || null,
          strasse: form.strasse || null,
          plz: form.plz || null,
          ort: form.ort || null,
          telefon: form.telefon || null,
          email: form.email || null,
          website: form.website || null,
        });
        if (insertErr) throw insertErr;
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/anbieter">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Profil bearbeiten</h1>
          {anbieter?.verifiziert && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verifizierter Anbieter
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persönliche Daten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persönliche Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vorname">Vorname</Label>
                <Input id="vorname" name="vorname" value={form.vorname} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nachname">Nachname</Label>
                <Input id="nachname" name="nachname" value={form.nachname} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profilTelefon">Telefon (privat)</Label>
              <Input id="profilTelefon" name="profilTelefon" value={form.profilTelefon} onChange={handleChange} placeholder="+49 ..." />
            </div>
          </CardContent>
        </Card>

        {/* Einrichtungsdaten */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Einrichtungsdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name der Einrichtung *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="traeger">Träger / Rechtsform</Label>
              <Input id="traeger" name="traeger" value={form.traeger} onChange={handleChange} placeholder="z.B. gGmbH, e.V., GmbH" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="beschreibung">Beschreibung</Label>
              <Textarea
                id="beschreibung"
                name="beschreibung"
                value={form.beschreibung}
                onChange={handleChange}
                rows={4}
                placeholder="Beschreiben Sie Ihre Einrichtung und Ihr Angebot..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Adresse & Kontakt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adresse & Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="strasse">Straße & Hausnummer</Label>
              <Input id="strasse" name="strasse" value={form.strasse} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plz">PLZ</Label>
                <Input id="plz" name="plz" value={form.plz} onChange={handleChange} maxLength={5} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ort">Ort</Label>
                <Input id="ort" name="ort" value={form.ort} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="telefon">Telefon (öffentlich)</Label>
                <Input id="telefon" name="telefon" value={form.telefon} onChange={handleChange} placeholder="+49 ..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail (öffentlich)</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" value={form.website} onChange={handleChange} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 rounded-md px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Profil erfolgreich gespeichert.
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Speichern..." : "Profil speichern"}
        </Button>
      </form>
    </div>
  );
}
