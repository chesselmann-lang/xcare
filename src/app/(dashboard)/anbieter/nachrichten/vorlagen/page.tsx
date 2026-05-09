"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, FileText, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Vorlage {
  id: string;
  titel: string;
  inhalt: string;
  created_at: string;
}

export default function NachrichtenVorlagenPage() {
  const supabase = createClient();
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [anbieterID, setAnbieterID] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTitel, setNewTitel] = useState("");
  const [newInhalt, setNewInhalt] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile?.id).single();
      if (!anbieter) { setLoading(false); return; }
      setAnbieterID(anbieter.id);
      const { data } = await supabase
        .from("nachrichten_vorlagen")
        .select("id, titel, inhalt, created_at")
        .eq("anbieter_id", anbieter.id)
        .order("created_at", { ascending: false });
      setVorlagen(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    if (!newTitel.trim() || !newInhalt.trim() || !anbieterID) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("nachrichten_vorlagen")
      .insert({ anbieter_id: anbieterID, titel: newTitel.trim(), inhalt: newInhalt.trim() })
      .select()
      .single();
    if (error) {
      toast.error("Vorlage konnte nicht gespeichert werden");
    } else {
      setVorlagen((prev) => [data as Vorlage, ...prev]);
      setNewTitel("");
      setNewInhalt("");
      setShowForm(false);
      toast.success("Vorlage gespeichert");
    }
    setCreating(false);
  }

  async function handleDelete(id: string, titel: string) {
    setDeleting(id);
    const { error } = await supabase.from("nachrichten_vorlagen").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
    } else {
      setVorlagen((prev) => prev.filter((v) => v.id !== id));
      toast.success(`"${titel}" gelöscht`);
    }
    setDeleting(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/anbieter/nachrichten">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nachrichten-Vorlagen</h1>
            <p className="text-sm text-[--muted-foreground] mt-0.5">
              Schnellantworten für häufige Anfragen
            </p>
          </div>
        </div>
        {!showForm && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Neue Vorlage
          </Button>
        )}
      </div>

      {/* New vorlage form */}
      {showForm && (
        <Card className="mb-6 border-[--primary]/20 bg-[--primary]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Neue Vorlage erstellen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titel">Titel (intern)</Label>
              <Input
                id="titel"
                placeholder="z.B. Bestätigungsantwort"
                value={newTitel}
                onChange={(e) => setNewTitel(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inhalt">Nachrichtentext</Label>
              <Textarea
                id="inhalt"
                placeholder="Sehr geehrte Familie, vielen Dank für Ihre Anfrage…"
                value={newInhalt}
                onChange={(e) => setNewInhalt(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-[--muted-foreground]">{newInhalt.length} Zeichen</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleCreate}
                disabled={creating || !newTitel.trim() || !newInhalt.trim()}
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Speichern
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                onClick={() => { setShowForm(false); setNewTitel(""); setNewInhalt(""); }}
              >
                <X className="h-3.5 w-3.5" /> Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[--muted-foreground]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Wird geladen…
        </div>
      ) : vorlagen.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[--muted-foreground]">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">Noch keine Vorlagen angelegt</p>
            <p className="text-xs">
              Erstellen Sie Schnellantworten, die Sie in Gesprächen einfügen können.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vorlagen.map((v) => (
            <Card key={v.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{v.titel}</p>
                    <p className="text-sm text-[--muted-foreground] mt-1 line-clamp-3 whitespace-pre-wrap">
                      {v.inhalt}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0 text-[--muted-foreground] hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(v.id, v.titel)}
                    disabled={deleting === v.id}
                    aria-label="Vorlage löschen"
                  >
                    {deleting === v.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
