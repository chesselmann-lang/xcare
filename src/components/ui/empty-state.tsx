import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Emoji fallback when no Lucide icon is provided */
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Shared Empty State component for list views.
 * Provides a consistent, branded "no results" experience across the app.
 *
 * Usage:
 *   <EmptyState
 *     icon={InboxIcon}
 *     title="Keine Anfragen"
 *     description="Noch keine Anfragen eingegangen."
 *     action={{ label: "Profil vervollständigen", href: "/anbieter/profil" }}
 *   />
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-8 text-center",
        className
      )}
    >
      {/* Icon / Emoji */}
      {(Icon || emoji) && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm">
          {Icon ? (
            <Icon className="h-7 w-7 text-gray-400" />
          ) : (
            <span className="text-2xl" role="img" aria-hidden>
              {emoji}
            </span>
          )}
        </div>
      )}

      {/* Text */}
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Button asChild size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
