/**
 * Dokumenten-Tresor — AES-256-GCM encryption for text documents (S276)
 *
 * API:
 *   encryptDocument(plaintext, key)  → base64url string: [12-byte IV][ciphertext]
 *   decryptDocument(ciphertext, key) → plaintext string
 *   deriveKey(password, salt)        → CryptoKey via PBKDF2 (310 000 iters, SHA-256)
 *   generateSalt()                   → 16 random bytes
 *
 * Uses the native Web Crypto API — no third-party dependencies.
 * Works in browser, Node ≥ 19, and Vercel Edge Runtime.
 */

const IV_BYTES = 12; // AES-GCM standard IV length
const PBKDF2_ITERATIONS = 310_000; // OWASP 2023 recommendation for PBKDF2-SHA-256

// ── Helpers ──────────────────────────────────────────────────────────────────

function toBase64Url(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(base64, "base64"));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-random 16-byte salt for key derivation.
 * Store alongside the encrypted data; it is not secret.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Derive an AES-256-GCM CryptoKey from a password + salt using PBKDF2.
 *
 * @param password  User-supplied secret (e.g. user ID + server secret)
 * @param salt      16-byte random value from generateSalt()
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 *
 * @returns base64url string encoding [12-byte random IV | ciphertext + auth-tag]
 */
export async function encryptDocument(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  // Prepend IV so the decryptor can reconstruct it without separate storage
  const combined = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_BYTES);

  return toBase64Url(combined.buffer);
}

/**
 * Decrypt a base64url string produced by encryptDocument.
 *
 * @throws DOMException if the key is wrong or the data is tampered
 */
export async function decryptDocument(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const combined = fromBase64Url(ciphertext);

  if (combined.byteLength <= IV_BYTES) {
    throw new Error("Invalid ciphertext: too short to contain IV");
  }

  const iv = combined.slice(0, IV_BYTES);
  const data = combined.slice(IV_BYTES);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return new TextDecoder().decode(plaintext);
}
