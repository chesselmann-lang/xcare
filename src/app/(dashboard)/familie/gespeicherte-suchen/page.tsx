"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Search, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatRelative } from "@/lib/utils";

interface GespeicherteSuche {
  id: string;
  name: string;
  plz: string | null;
  radius_km: number | null;
  lebenslage: string | null;
  suchtext: string | null;
  created_at: string;
}

const LEBENSLAGEN: Record<string, string> = {
  geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
  schulkind_jugend: "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung & Behinderung",
  erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
  krankheit_genesung: "Krankheit & Genesung",
  alter_pflege: "Alter & Pflege",
  hospiz_palliativ: "Hospiz & Palliativ",
  trauer_nachlass: "Trauer & Nachlass",
};

export default function GespeicherteSuchenPage() {
  const supabase = createClient();
  const [suchen, setSuchen] = useState<GespeicherteSuche[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).single();
      if (!profile) { setLoading(false); return; }
      const { data } = await supabase
        .from("gespeicherte_suchen")
        .select("id, name, plz, radius_km, lebenslage, suchtext, created_at")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });
      setSuchen(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(id: string, name: string) {
    setDeleting(id);
    const { error } = await supabase.from("gespeicherte_suchen").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
    } else {
      setSuchen((prev) => prev.filter((s) => s.id !== id));
      toast.success(`"${name}" gelöscht`);
    }
    setDeleting(null);
  }

  function buildHref(s: GespeicherteSuche): string {
    const params = new URLSearchParams();
    if (s.plz) params.set("plz", s.plz);
    if (s.radius_km) params.set("umkreis", String(s.radius_km));
    if (s.lebenslage) params.set("kategorie", s.lebenslage);
    if (s.suchtext) params.set("q", s.suchtext);
    return `/suche?${params.toString()}`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/familie">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-[--primary]" />
            Gespeicherte Suchen
          </h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Klicken Sie auf eine Suche, um sie erneut auszuführen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[--muted-foreground]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Wird geladen…
        </div>
      ) : suchen.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-[--muted-foreground]">
            <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium mb-1">Noch keine Suchen gespeichert</p>
            <p className="text-xs mb-4">
              Führen Sie eine Suche durch und klicken Sie auf „Suche speichern".
            </p>
            <Link href="/suche">
              <Button size="sm" className="gap-1.5">
                <Search className="h-4 w-4" /> Zur Suche
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suchen.map((s) => (
            <Card key={s.id} className="group hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Search className="h-4 w-4 text-[--primary]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.plz && (
                        <Badge variant="secondary" className="text-xs">
                          PLZ {s.plz} · {s.radius_km ?? 25} km
                        </Badge>
                      )}
                      {s.lebenslage && (
                        <Badge variant="secondary" className="text-xs">
                          {LEBENSLAGEN[s.lebenslage] ?? s.lebenslage}
                        </Badge>
                      )}
                      {s.suchtext && (
                        <Badge variant="secondary" className="text-xs">
                          „{s.suchtext}"
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[--muted-foreground] mt-1.5">
                      Gespeichert {formatRelative(s.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={buildHref(s)}>
                      <Button size="sm" variant="ghost" className="gap-1 h-8 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Suchen
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[--muted-foreground] hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={deleting === s.id}
                      aria-label="Suche löschen"
                    >
                      {deleting === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="pt-2 text-center">
            <Link href="/suche">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Search className="h-4 w-4" /> Neue Suche starten
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
