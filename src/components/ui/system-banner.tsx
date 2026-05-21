import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerTyp = "info" | "warning" | "error" | "success";

interface SystemBannerRow {
  id: string;
  typ: BannerTyp;
  titel: string | null;
  nachricht: string;
  zielgruppe: string;
  gueltig_bis: string | null;
}

const STYLES: Record<BannerTyp, { bg: string; border: string; text: string; icon: typeof Info }> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    icon: Info,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    icon: AlertTriangle,
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    icon: XCircle,
  },
  success: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    icon: CheckCircle,
  },
};

interface SystemBannerProps {
  role?: string;
}

/**
 * SystemBanner — server component that fetches and displays active admin banners.
 * Rendered at the top of the dashboard layout above main content.
 *
 * Shows banners matching the current user's role or targeting 'alle'.
 * Automatically hides expired banners (gueltig_bis < now).
 */
export async function SystemBanner({ role }: SystemBannerProps) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("system_banners")
      .select("id, typ, titel, nachricht, zielgruppe, gueltig_bis")
      .eq("aktiv", true)
      .or(`gueltig_bis.is.null,gueltig_bis.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: banners } = await query;
    if (!banners || banners.length === 0) return null;

    // Filter by role
    const visible = (banners as SystemBannerRow[]).filter(
      (b) =>
        b.zielgruppe === "alle" ||
        b.zielgruppe === role ||
        (role === "admin" && b.zielgruppe === "admin")
    );

    if (visible.length === 0) return null;

    return (
      <div className="flex flex-col gap-1">
        {visible.map((banner) => {
          const style = STYLES[banner.typ] ?? STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={banner.id}
              role="alert"
              className={cn(
                "flex items-start gap-3 border-b px-4 py-3 text-sm",
                style.bg,
                style.border,
                style.text
              )}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                {banner.titel && (
                  <span className="font-semibold mr-1.5">{banner.titel}</span>
                )}
                {banner.nachricht}
              </div>
            </div>
          );
        })}
      </div>
    );
  } catch {
    // Never break the layout if banners fail to load
    return null;
  }
}
