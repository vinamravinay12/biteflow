// Client-side AES-GCM helpers for stall credential storage.
//
// NOTE: this is not real secrecy. The decryption key ships inside the client
// bundle (there is no backend to hold it server-side), so anyone with the app
// code can decrypt any value. Its purpose is to stop stall passwords from
// sitting as plaintext in Firestore/localStorage and in transit — not to
// resist a determined attacker with access to the source.

const RAW_KEY = import.meta.env.VITE_STALL_SECRET_KEY || 'biteflow-dev-fallback-key';

let cachedKey: Promise<CryptoKey> | null = null;

const getKey = (): Promise<CryptoKey> => {
  if (!cachedKey) {
    cachedKey = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(RAW_KEY))
      .then(hash => crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']));
  }
  return cachedKey;
};

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export const encryptText = async (plainText: string): Promise<string> => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainText));
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return toBase64(combined);
};

export const decryptText = async (encoded: string): Promise<string> => {
  const key = await getKey();
  const combined = fromBase64(encoded);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuf);
};

// One-way SHA-256 hash (lowercase hex). Used for the admin login check so the
// admin password is never stored in plaintext in source, the bundle, or .env —
// only its irreversible digest is. Verify with `verifyHash` below.
export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Length-constant string comparison to avoid leaking match progress via timing.
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

// Hashes `candidate` and compares it (timing-safely) against a stored hex digest.
export const verifyHash = async (candidate: string, expectedHex: string): Promise<boolean> => {
  if (!expectedHex) return false;
  const actual = await sha256Hex(candidate);
  return timingSafeEqual(actual, expectedHex.trim().toLowerCase());
};
