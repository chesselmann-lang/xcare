"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pill,
  Stethoscope,
  Activity,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medikament {
  id: string;
  name: string;
  wirkstoff: string | null;
  dosierung: string | null;
  einnahme_anweisung: string | null;
  verordnet_am: string | null;
  aktiv: boolean;
}

interface Diagnose {
  id: string;
  icd10_code: string | null;
  bezeichnung: string;
  seit: string | null;
  status: string | null;
}

interface Props {
  medikamente: Medikament[];
  diagnosen: Diagnose[];
  syncStatus: string;
  letzterSync: string | null;
}

// ─── Sort helper ─────────────────────────────────────────────────────────────

type MedSortKey = "name" | "wirkstoff" | "dosierung" | "verordnet_am";

// ─── Component ───────────────────────────────────────────────────────────────

export function EPADashboard({
  medikamente,
  diagnosen,
  syncStatus,
  letzterSync,
}: Props) {
  const router = useRouter();
  const [isSyncing, startSync] = useTransition();
  const [sortKey, setSortKey] = useState<MedSortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // ─── Sync ──────────────────────────────────────────────────────────────────
  function handleSync() {
    startSync(async () => {
      try {
        const res = await fetch("/api/epa/sync", { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Sync fehlgeschlagen");
        }
        const data = await res.json();
        toast.success(
          `Sync abgeschlossen — ${data.synced.medikamente} Medikamente, ${data.synced.diagnosen} Diagnosen aktualisiert.`
        );
        router.refresh();
      } catch (err) {
        toast.error(String(err instanceof Error ? err.message : err));
      }
    });
  }

  // ─── PDF Export ────────────────────────────────────────────────────────────
  function handlePDFExport() {
    window.print();
    toast.info("Druckdialog geöffnet — als PDF speichern möglich.");
  }

  // ─── Sort ──────────────────────────────────────────────────────────────────
  function toggleSort(key: MedSortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sortedMeds = [...medikamente].sort((a, b) => {
    const av = (a[sortKey] ?? "") as string;
    const bv = (b[sortKey] ?? "") as string;
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const SortIndicator = ({ field }: { field: MedSortKey }) =>
    sortKey === field ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {syncStatus === "fehler" ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span className="text-sm text-[--muted-foreground]">
            {letzterSync
              ? `Sync: ${new Date(letzterSync).toLocaleString("de-DE")}`
              : "Noch kein Sync"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePDFExport}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Als PDF exportieren
          </Button>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-1.5"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Synchronisieren
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="medikamente">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medikamente" className="gap-1.5">
            <Pill className="h-4 w-4" />
            Medikamente
            {medikamente.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {medikamente.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="diagnosen" className="gap-1.5">
            <Stethoscope className="h-4 w-4" />
            Diagnosen
            {diagnosen.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {diagnosen.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vitalwerte" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Vitalwerte
          </TabsTrigger>
        </TabsList>

        {/* ── Medikamente ─────────────────────────────────────────────────── */}
        <TabsContent value="medikamente">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktiver Medikationsplan</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedMeds.length === 0 ? (
                <div className="text-center py-8 text-[--muted-foreground]">
                  <Pill className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine aktiven Medikamente in der ePA.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:text-[--foreground]"
                          onClick={() => toggleSort("name")}
                        >
                          Name
                          <SortIndicator field="name" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-[--foreground]"
                          onClick={() => toggleSort("wirkstoff")}
                        >
                          Wirkstoff
                          <SortIndicator field="wirkstoff" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-[--foreground]"
                          onClick={() => toggleSort("dosierung")}
                        >
                          Dosierung
                          <SortIndicator field="dosierung" />
                        </TableHead>
                        <TableHead>Einnahme</TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-[--foreground]"
                          onClick={() => toggleSort("verordnet_am")}
                        >
                          Seit
                          <SortIndicator field="verordnet_am" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMeds.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="text-[--muted-foreground]">
                            {med.wirkstoff ?? "—"}
                          </TableCell>
                          <TableCell>{med.dosierung ?? "—"}</TableCell>
                          <TableCell className="text-sm text-[--muted-foreground]">
                            {med.einnahme_anweisung ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-[--muted-foreground]">
                            {med.verordnet_am
                              ? new Date(med.verordnet_am).toLocaleDateString("de-DE")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Diagnosen ───────────────────────────────────────────────────── */}
        <TabsContent value="diagnosen">
          <div className="space-y-3">
            {diagnosen.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-[--muted-foreground]">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Keine Diagnosen in der ePA gespeichert.</p>
                </CardContent>
              </Card>
            ) : (
              diagnosen.map((diag) => (
                <Card key={diag.id} className="hover:border-[--primary]/30 transition-colors">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {diag.icd10_code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            <FlaskConical className="h-3 w-3 mr-1" />
                            {diag.icd10_code}
                          </Badge>
                        )}
                        <span className="font-medium text-[--foreground]">
                          {diag.bezeichnung}
                        </span>
                      </div>
                      {diag.seit && (
                        <p className="text-xs text-[--muted-foreground] mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Seit{" "}
                          {new Date(diag.seit).toLocaleDateString("de-DE", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={diag.status === "aktiv" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {diag.status ?? "aktiv"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Vitalwerte ──────────────────────────────────────────────────── */}
        <TabsContent value="vitalwerte">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Letzte Vitalwerte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-[--muted-foreground] gap-3">
                <Activity className="h-12 w-12 opacity-20" />
                <div className="text-center">
                  <p className="font-medium text-sm">Vitalwerte-Grafik</p>
                  <p className="text-xs mt-1">
                    Verlaufsdiagramm für Blutdruck, Puls und Blutzucker — wird
                    nach dem ersten Sync befüllt.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Jetzt synchronisieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
