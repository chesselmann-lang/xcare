"use client";

import { useState } from "react";
import { ShieldCheck, FileText, Trash2, Activity } from "lucide-react";
import { AvvTabelle } from "./AvvTabelle";
import { DsgvoLoeschanfragenTabelle } from "./DsgvoLoeschanfragenTabelle";
import { AuditLogViewer } from "./AuditLogViewer";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: "uebersicht", label: "Übersicht", icon: ShieldCheck },
  { id: "avv", label: "AVV-Partner", icon: FileText },
  { id: "loeschanfragen", label: "Löschanfragen", icon: Trash2 },
  { id: "auditlog", label: "Audit-Log", icon: Activity },
];

interface ComplianceDashboardProps {
  berichtContent: React.ReactNode;
}

export function ComplianceDashboard({ berichtContent }: ComplianceDashboardProps) {
  const [aktiv, setAktiv] = useState("uebersicht");

  return (
    <div className="space-y-6">
      {/* Tab-Leiste */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px" aria-label="Compliance-Navigation">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = aktiv === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAktiv(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab-Inhalt */}
      <div>
        {aktiv === "uebersicht" && berichtContent}
        {aktiv === "avv" && <AvvTabelle />}
        {aktiv === "loeschanfragen" && <DsgvoLoeschanfragenTabelle />}
        {aktiv === "auditlog" && <AuditLogViewer />}
      </div>
    </div>
  );
}
