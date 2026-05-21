/**
 * Dokumenten-Tresor — Client-side AES-256-GCM encryption (S276)
 *
 * Strategy:
 *  - Key is derived from the user's ID + a server-supplied salt via PBKDF2
 *    (100 000 iterations, SHA-256).  The derivation salt can be rotated
 *    independently from the data.
 *  - Each file gets a unique 12-byte random IV.
 *  - The encrypted blob layout: [12 bytes IV][encrypted ciphertext].
 *  - Everything uses the native Web Crypto API — no third-party libs required.
 *
 * NOTE: This is *envelope* encryption suitable for a privacy-by-design
 * architecture.  A production upgrade would split the derived key into a
 * per-user Data Encryption Key (DEK) stored encrypted server-side, so
 * users can rotate keys without re-encrypting all blobs.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_ENV =
  process.env.NEXT_PUBLIC_TRESOR_SALT ??
  "xcare-tresor-default-salt-change-in-production";

/** Import raw key material for PBKDF2 */
async function importKeyMaterial(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(userId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
}

/** Derive AES-256-GCM key from user ID + salt */
async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await importKeyMaterial(userId);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT_ENV),
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
 * Encrypt a File using AES-256-GCM.
 * Returns a new File whose content is [IV (12 bytes)][ciphertext].
 */
export async function encryptFile(file: File, userId: string): Promise<File> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = await file.arrayBuffer();

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  // Prepend IV so we can decrypt later
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return new File([combined], file.name, {
    type: "application/octet-stream",
  });
}

/**
 * Decrypt a blob that was encrypted with encryptFile.
 * Returns the plaintext ArrayBuffer.
 */
export async function decryptBlob(
  encrypted: ArrayBuffer,
  userId: string,
  originalMimeType: string
): Promise<File> {
  const key = await deriveKey(userId);
  const iv = new Uint8Array(encrypted, 0, 12);
  const ciphertext = new Uint8Array(encrypted, 12);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new File([plaintext], "decrypted", { type: originalMimeType });
}
