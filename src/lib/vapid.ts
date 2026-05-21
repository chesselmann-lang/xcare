/**
 * Minimal VAPID JWT signer using Node.js built-in `crypto.subtle`.
 * No external dependencies — works in Node 18+ (Next.js 15 edge/server runtime).
 *
 * VAPID spec: RFC 8292  — https://www.rfc-editor.org/rfc/rfc8292
 * JWT signing: ES256 (ECDSA + P-256 + SHA-256)
 *
 * Setup (run once to generate VAPID keys):
 *   node -e "
 *     const { webcrypto } = require('crypto');
 *     webcrypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-256' }, true, ['sign','verify'])
 *       .then(async k => {
 *         const pub = Buffer.from(await webcrypto.subtle.exportKey('raw', k.publicKey)).toString('base64url');
 *         const prv = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', k.privateKey)).toString('base64url');
 *         console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + pub);
 *         console.log('VAPID_PRIVATE_KEY=' + prv);
 *       });
 *   "
 */

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return Buffer.from(bytes).toString("base64url");
}

function jsonToBase64url(obj: object): string {
  return base64urlEncode(Buffer.from(JSON.stringify(obj)));
}

/**
 * Build a VAPID Authorization header value.
 * @param pushEndpoint  The full push endpoint URL (from PushSubscription.endpoint)
 * @param subject       Contact URI, e.g. "mailto:admin@xcare.de"
 * @param publicKeyB64  NEXT_PUBLIC_VAPID_PUBLIC_KEY  (raw P-256 public key, base64url)
 * @param privateKeyB64 VAPID_PRIVATE_KEY              (PKCS8 private key, base64url)
 */
export async function buildVapidAuthHeader(
  pushEndpoint: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<string> {
  // Derive audience (scheme + host only)
  const { protocol, host } = new URL(pushEndpoint);
  const audience = `${protocol}//${host}`;

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + 12 * 3600; // 12-hour token validity

  const headerB64 = jsonToBase64url({ typ: "JWT", alg: "ES256" });
  const payloadB64 = jsonToBase64url({ aud: audience, exp: expSec, sub: subject });
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the PKCS8 private key
  const pkcs8Bytes = Buffer.from(privateKeyB64, "base64url");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign with ECDSA P-256 + SHA-256 → produces 64-byte raw (r || s) signature
  const sigRaw = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    Buffer.from(signingInput, "utf8")
  );

  const jwt = `${signingInput}.${base64urlEncode(sigRaw)}`;

  // VAPID Authorization header:  vapid t=<jwt>,k=<publicKey>
  return `vapid t=${jwt},k=${publicKeyB64}`;
}
