import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Verfuegbarkeit = "verfuegbar" | "eingeschraenkt" | "ausgebucht" | null | undefined;

const CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  verfuegbar:     { label: "Verfügbar",      color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  eingeschraenkt: { label: "Eingeschränkt",  color: "bg-amber-100 text-amber-700", icon: Clock },
  ausgebucht:     { label: "Ausgebucht",     color: "bg-red-100 text-red-600",     icon: XCircle },
};

export function VerfuegbarkeitBadge({
  verfuegbarkeit,
  size = "sm",
}: {
  verfuegbarkeit: Verfuegbarkeit;
  size?: "xs" | "sm";
}) {
  if (!verfuegbarkeit || verfuegbarkeit === "verfuegbar") return null; // Only show badge if not default
  const cfg = CONFIG[verfuegbarkeit];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cfg.color} ${
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      }`}
    >
      <Icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {cfg.label}
    </span>
  );
}
