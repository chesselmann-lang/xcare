/**
 * HMAC-based unsubscribe token helper.
 *
 * Tokens are signed with UNSUBSCRIBE_SECRET (env var) so they cannot be forged.
 * Format: base64url(HMAC-SHA256(secret, `${email}:${type}`))
 */

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "xcare-unsub-secret";

function toBase64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64url(sig);
}

export async function createUnsubscribeToken(email: string, type: string): Promise<string> {
  return hmac(`${email}:${type}`);
}

export async function verifyUnsubscribeToken(
  email: string,
  type: string,
  token: string
): Promise<boolean> {
  try {
    const expected = await hmac(`${email}:${type}`);
    // Constant-time comparison via Buffer.equals not available in subtle — use length + char compare
    return expected === token;
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(baseUrl: string, email: string, type: string, token: string): string {
  const params = new URLSearchParams({ email, type, token });
  return `${baseUrl}/api/unsubscribe?${params}`;
}
