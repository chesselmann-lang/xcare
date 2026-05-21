import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Show a Home icon before the first crumb (default: false) */
  showHome?: boolean;
  homeHref?: string;
  className?: string;
}

/**
 * Breadcrumb — horizontal navigation trail for deep dashboard pages.
 *
 * The last item is always rendered as plain text (current page).
 * Intermediate items are rendered as links.
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: "Anfragen", href: "/anbieter/anfragen" },
 *     { label: anfrage.id.slice(0, 8) },
 *   ]}
 * />
 */
export function Breadcrumb({
  items,
  showHome = false,
  homeHref = "/",
  className,
}: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Start", href: homeHref }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm mb-4", className)}
    >
      {showHome && (
        <>
          <Link
            href={homeHref}
            className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            aria-label="Startseite"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {allItems.length > 1 && (
            <ChevronRight className="h-3.5 w-3.5 text-[--muted-foreground]/50 shrink-0" />
          )}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1 min-w-0">
            {isLast || !item.href ? (
              <span
                className={cn(
                  "truncate max-w-[180px]",
                  isLast
                    ? "text-[--foreground] font-medium"
                    : "text-[--muted-foreground]"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[--muted-foreground] hover:text-[--foreground] transition-colors truncate max-w-[180px]"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="h-3.5 w-3.5 text-[--muted-foreground]/50 shrink-0" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
