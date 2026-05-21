import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared PageHeader — standard h1 + optional description + optional action slot.
 * Use this at the top of every dashboard/admin page for visual consistency.
 *
 * @example
 * <PageHeader
 *   title="Anfragen"
 *   description={`${count} gesamt · ${offen} offen`}
 *   actions={<Button>Export</Button>}
 * />
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[--foreground] leading-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[--muted-foreground]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
