/**
 * BundID OAuth 2.0 / OIDC Integration
 * BundID is Germany's national digital identity service (BSI/BMI)
 * Production: https://id.bund.de/
 * Sandbox: https://int.id.bund.de/
 *
 * Setup: Register at https://id.bund.de/de/anbieter/registrierung
 * Requires ELSTER-based client certificate for production
 */

const BUNDID_BASE =
  process.env.NODE_ENV === "production"
    ? "https://id.bund.de"
    : "https://int.id.bund.de"; // sandbox

const CLIENT_ID = process.env.BUNDID_CLIENT_ID;
const CLIENT_SECRET = process.env.BUNDID_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/bundid/callback`;

export interface BundIDUserInfo {
  sub: string; // Unique identifier
  given_name?: string;
  family_name?: string;
  birthdate?: string;
  address?: {
    street_address?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  // German-specific claims
  "urn:de:bund:bundid:claim:einwohnermeldedaten"?: {
    vorname: string;
    nachname: string;
    geburtsdatum: string;
    geburtsort: string;
    anschrift: {
      strasse: string;
      hausnummer: string;
      postleitzahl: string;
      ort: string;
    };
  };
}

export function getBundIDAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID || "",
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email address",
    state,
    // Request Einwohnermeldedaten (address data) — requires user consent
    acr_values: "urn:de:bund:requiresOpenID",
  });
  return `${BUNDID_BASE}/oidc/auth?${params}`;
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; id_token: string }> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("BundID not configured");

  const res = await fetch(`${BUNDID_BASE}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) throw new Error(`BundID token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function getUserInfo(accessToken: string): Promise<BundIDUserInfo> {
  const res = await fetch(`${BUNDID_BASE}/oidc/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
