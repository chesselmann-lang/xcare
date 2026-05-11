/**
 * BundID OIDC Integration
 * BundID ist das zentrale Nutzerkonto der deutschen Bundesverwaltung.
 * Technisch: OpenID Connect (OIDC) mit PKCE
 *
 * Produktions-Endpunkt: https://int.id.bund.de/  (Integration)
 *                       https://id.bund.de/        (Production)
 *
 * Supabase Custom OIDC: wird als "Custom OIDC Provider" in der Supabase-Auth konfiguriert.
 * Bis zur BundID-Zertifizierung: Supabase Google/Apple Auth als primäre Social-Login-Methode.
 *
 * Zertifizierungsanforderungen:
 * - BSI TR-03130 eID-Server Zertifizierung
 * - FITKO-Registrierung (Föderale IT-Kooperation)
 * - Datenschutz-Folgenabschätzung nach DSGVO Art. 35
 */

export const BUNDID_CONFIG = {
  // Integration-Umgebung (kein echter Account erforderlich)
  issuer_staging: "https://int.id.bund.de/",
  authorization_endpoint_staging: "https://int.id.bund.de/realms/master/protocol/openid-connect/auth",
  token_endpoint_staging: "https://int.id.bund.de/realms/master/protocol/openid-connect/token",
  userinfo_endpoint_staging: "https://int.id.bund.de/realms/master/protocol/openid-connect/userinfo",
  jwks_uri_staging: "https://int.id.bund.de/realms/master/protocol/openid-connect/certs",

  // Produktions-Umgebung
  issuer_prod: "https://id.bund.de/",

  // Scopes
  scopes: ["openid", "profile", "email"],

  // Vertrauensniveaus (eIDAS)
  loa_low: "http://eidas.europa.eu/LoA/low",
  loa_substantial: "http://eidas.europa.eu/LoA/substantial",
  loa_high: "http://eidas.europa.eu/LoA/high",

  // Für Care-App: "substantial" erforderlich (Basisregistrierung reicht)
  required_loa: "http://eidas.europa.eu/LoA/substantial",
} as const;

/**
 * BundID OIDC Callback-Handler
 * Wird aufgerufen nachdem Supabase den OIDC-Token validiert hat.
 * Mappt BundID-Claims auf xcare-Profile.
 */
export function mapBundIdClaims(claims: Record<string, unknown>) {
  return {
    // BundID gibt pseudonymisierte Identifier zurück
    bundid_sub: claims.sub as string,
    // Vertrauensniveau
    loa: (claims.acr as string) ?? BUNDID_CONFIG.loa_low,
    // Optionale Attribute (nur wenn vom Nutzer freigegeben)
    vorname: (claims.given_name as string) ?? null,
    nachname: (claims.family_name as string) ?? null,
    email: (claims.email as string) ?? null,
    // BundID-spezifische Claims
    verified: (claims.acr as string) >= BUNDID_CONFIG.loa_substantial,
  };
}

/**
 * Prüft ob ein BundID-Token das erforderliche Vertrauensniveau hat.
 */
export function pruefeBundIdLoa(
  claims: Record<string, unknown>,
  required: string = BUNDID_CONFIG.required_loa
): { ok: boolean; reason?: string } {
  const acr = claims.acr as string;
  if (!acr) return { ok: false, reason: "Kein ACR-Claim vorhanden" };

  const loaLevel = { low: 1, substantial: 2, high: 3 };
  const extractLevel = (loa: string): number => {
    if (loa.includes("high")) return loaLevel.high;
    if (loa.includes("substantial")) return loaLevel.substantial;
    return loaLevel.low;
  };

  if (extractLevel(acr) < extractLevel(required)) {
    return {
      ok: false,
      reason: `Vertrauensniveau ${acr} nicht ausreichend — ${required} erforderlich`,
    };
  }

  return { ok: true };
}
