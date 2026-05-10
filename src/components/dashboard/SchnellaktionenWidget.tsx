"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  FolderOpen,
  HeartPulse,
  Bot,
  Home,
  Search,
  Zap,
} from "lucide-react";

interface AktionsTile {
  label: string;
  beschreibung: string;
  href: string;
  icon: React.ElementType;
  farbe: string;
}

const AKTIONEN: AktionsTile[] = [
  {
    label: "Pflegeplan",
    beschreibung: "Kosten & Aufgaben verwalten",
    href: "/familie/pflegeplan",
    icon: ClipboardList,
    farbe: "text-blue-600 bg-blue-50 group-hover:bg-blue-100",
  },
  {
    label: "Dokumente",
    beschreibung: "Ablage & Fristen im Blick",
    href: "/familie/dokumente",
    icon: FolderOpen,
    farbe: "text-amber-600 bg-amber-50 group-hover:bg-amber-100",
  },
  {
    label: "Gesundheit",
    beschreibung: "Medikamente & Impfungen",
    href: "/familie/gesundheit",
    icon: HeartPulse,
    farbe: "text-red-600 bg-red-50 group-hover:bg-red-100",
  },
  {
    label: "KI-Copilot",
    beschreibung: "Fragen rund um die Pflege",
    href: "/familie/copilot",
    icon: Bot,
    farbe: "text-violet-600 bg-violet-50 group-hover:bg-violet-100",
  },
  {
    label: "Haushalt",
    beschreibung: "Aufgaben & Helfer koordinieren",
    href: "/familie/haushalt",
    icon: Home,
    farbe: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100",
  },
  {
    label: "Anbieter suchen",
    beschreibung: "Pflegedienste & mehr finden",
    href: "/suche",
    icon: Search,
    farbe: "text-cyan-600 bg-cyan-50 group-hover:bg-cyan-100",
  },
];

export function SchnellaktionenWidget() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Schnellaktionen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AKTIONEN.map((aktion) => {
            const Icon = aktion.icon;
            return (
              <Link
                key={aktion.href}
                href={aktion.href}
                className="group flex flex-col gap-2 rounded-xl border border-border/60 p-3 transition-all hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${aktion.farbe}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{aktion.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{aktion.beschreibung}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
