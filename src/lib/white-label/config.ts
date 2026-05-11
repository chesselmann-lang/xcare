/**
 * White-Label Konfiguration
 * Lädt die domänenbasierte Konfiguration für GKV/Versicherungspartner.
 * Wird sowohl in Middleware (Request-Ebene) als auch in RSC verwendet.
 */

export interface WhiteLabelConfig {
  id: string;
  slug: string;
  organisation: string;
  logo_url: string | null;
  favicon_url: string | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  font_family: string;
  features: {
    ki_lotse: boolean;
    anbieter_suche: boolean;
    pflegekrafte: boolean;
    traeger_portal: boolean;
    dokumente_tresor: boolean;
    chat: boolean;
  };
  impressum_url: string | null;
  datenschutz_url: string | null;
  support_email: string | null;
  support_tel: string | null;
}

/** Default xcare Konfiguration (keine White-Label-Domain) */
export const DEFAULT_CONFIG: WhiteLabelConfig = {
  id: "default",
  slug: "xcare",
  organisation: "xcare",
  logo_url: null,
  favicon_url: null,
  color_primary: "#2563eb",
  color_secondary: "#1e40af",
  color_accent: "#3b82f6",
  font_family: "Inter",
  features: {
    ki_lotse: true,
    anbieter_suche: true,
    pflegekrafte: true,
    traeger_portal: true,
    dokumente_tresor: true,
    chat: true,
  },
  impressum_url: "/impressum",
  datenschutz_url: "/datenschutz",
  support_email: "support@xcare.de",
  support_tel: null,
};

/**
 * Lädt White-Label-Konfig aus Supabase basierend auf dem Domain-Header.
 * Verwendet unstable_cache für ISR-Caching (5 Minuten).
 * Falls keine Konfig gefunden → DEFAULT_CONFIG.
 */
export async function getWhiteLabelConfig(domain?: string): Promise<WhiteLabelConfig> {
  if (!domain || domain.includes("localhost") || domain.includes("xcare.de") || domain.includes("vercel.app")) {
    return DEFAULT_CONFIG;
  }

  try {
    // Dynamic import to avoid server/client boundary issues
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data } = await supabase
      .from("white_label_configs")
      .select("*")
      .eq("domain", domain)
      .eq("aktiv", true)
      .single();

    if (!data) return DEFAULT_CONFIG;

    return {
      ...data,
      features: data.features as WhiteLabelConfig["features"],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Generiert CSS Custom Properties aus einer White-Label-Konfiguration.
 * Wird im Root-Layout für <style> injiziert.
 */
export function generateCssVariables(config: WhiteLabelConfig): string {
  return `
    :root {
      --primary: ${config.color_primary};
      --primary-dark: ${config.color_secondary};
      --primary-light: ${config.color_primary}20;
      --accent: ${config.color_accent};
      --wl-font: '${config.font_family}', Inter, sans-serif;
    }
  `.trim();
}
