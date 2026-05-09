import { CheckCircle2, Circle, Clock, PackageCheck, XCircle } from "lucide-react";
import type { AnfrageStatus } from "@/lib/types";

interface Step {
  key: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { key: "offen",          label: "Gesendet",      description: "Anfrage eingegangen" },
  { key: "in_bearbeitung", label: "In Bearbeitung", description: "Anbieter reagiert" },
  { key: "angeboten",      label: "Angebot",        description: "Angebot erhalten" },
  { key: "bestaetigt",     label: "Bestätigt",      description: "Zusammenarbeit vereinbart" },
  { key: "abgeschlossen",  label: "Erledigt",       description: "Leistung erbracht" },
];

// Step order for comparisons
const STATUS_ORDER: Record<AnfrageStatus, number> = {
  offen:           0,
  in_bearbeitung:  1,
  angeboten:       2,
  bestaetigt:      3,
  abgelehnt:       3, // same level as bestaetigt, but branch
  abgeschlossen:   4,
};

interface Props {
  status: AnfrageStatus;
}

export function AnfrageStatusStepper({ status }: Props) {
  const currentOrder = STATUS_ORDER[status] ?? 0;
  const isAbgelehnt = status === "abgelehnt";

  // For "abgelehnt", show a special rejected indicator instead of "Bestätigt"
  const steps = isAbgelehnt
    ? [
        ...STEPS.slice(0, 3),
        { key: "abgelehnt", label: "Abgelehnt", description: "Kein Angebot möglich" },
      ]
    : STEPS;

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] px-4 py-5">
      <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-4">
        Anfrage-Status
      </p>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-start gap-0">
        {steps.map((step, i) => {
          const stepOrder = STATUS_ORDER[step.key as AnfrageStatus] ?? i;
          const isDone = isAbgelehnt
            ? (i < 3 ? stepOrder < currentOrder : step.key === "abgelehnt" && isAbgelehnt)
            : stepOrder < currentOrder;
          const isCurrent = isAbgelehnt
            ? (step.key === "abgelehnt" && isAbgelehnt)
            : step.key === status;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle + connector */}
                <div className="flex items-center w-full">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-colors ${
                    isDone
                      ? "bg-[--primary] text-white"
                      : isCurrent
                      ? step.key === "abgelehnt"
                        ? "bg-red-100 border-2 border-red-500 text-red-600"
                        : "bg-[--primary]/10 border-2 border-[--primary] text-[--primary]"
                      : "bg-[--muted] border border-[--border] text-[--muted-foreground]"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      step.key === "abgelehnt" ? (
                        <XCircle className="h-4 w-4" />
                      ) : step.key === "angeboten" ? (
                        <PackageCheck className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4 animate-pulse" />
                      )
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  {/* Connector */}
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-1 transition-colors ${
                      isDone ? "bg-[--primary]" : "bg-[--border]"
                    }`} />
                  )}
                </div>
                {/* Label */}
                <div className="mt-2 text-center px-1 w-full">
                  <p className={`text-xs font-medium leading-tight ${
                    isCurrent
                      ? step.key === "abgelehnt" ? "text-red-600" : "text-[--primary]"
                      : isDone
                      ? "text-[--foreground]"
                      : "text-[--muted-foreground]"
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[--muted-foreground] leading-tight mt-0.5 hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="flex sm:hidden flex-col gap-3">
        {steps.map((step, i) => {
          const stepOrder = STATUS_ORDER[step.key as AnfrageStatus] ?? i;
          const isDone = isAbgelehnt
            ? (i < 3 ? stepOrder < currentOrder : false)
            : stepOrder < currentOrder;
          const isCurrent = isAbgelehnt
            ? step.key === "abgelehnt"
            : step.key === status;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Icon + vertical line */}
              <div className="flex flex-col items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                  isDone
                    ? "bg-[--primary] text-white"
                    : isCurrent
                    ? step.key === "abgelehnt"
                      ? "bg-red-100 border-2 border-red-500 text-red-600"
                      : "bg-[--primary]/10 border-2 border-[--primary] text-[--primary]"
                    : "bg-[--muted] border border-[--border] text-[--muted-foreground]"
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    step.key === "abgelehnt" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4 animate-pulse" />
                    )
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 mt-1 min-h-[1rem] ${
                    isDone ? "bg-[--primary]" : "bg-[--border]"
                  }`} />
                )}
              </div>
              {/* Text */}
              <div className="pb-3">
                <p className={`text-sm font-medium ${
                  isCurrent
                    ? step.key === "abgelehnt" ? "text-red-600" : "text-[--primary]"
                    : isDone
                    ? "text-[--foreground]"
                    : "text-[--muted-foreground]"
                }`}>
                  {step.label}
                </p>
                <p className="text-xs text-[--muted-foreground]">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
