import { describe, it, expect } from 'vitest';
import { encryptText, decryptText, sha256Hex, verifyHash, timingSafeEqual } from './crypto';

describe('AES-GCM Encryption / Decryption Helpers', () => {
  it('should encrypt a plaintext string and successfully decrypt it back', async () => {
    const secretMessage = 'biteflow-secure-stall-password-2026';
    const encrypted = await encryptText(secretMessage);

    // Encrypted string should be base64-encoded and not equal to plaintext
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(secretMessage);
    expect(typeof encrypted).toBe('string');

    const decrypted = await decryptText(encrypted);
    expect(decrypted).toEqual(secretMessage);
  });

  it('should generate distinct ciphertexts for identical plaintexts (IV randomness)', async () => {
    const message = 'same-message';
    const cipher1 = await encryptText(message);
    const cipher2 = await encryptText(message);

    expect(cipher1).not.toEqual(cipher2);

    const dec1 = await decryptText(cipher1);
    const dec2 = await decryptText(cipher2);
    expect(dec1).toEqual(message);
    expect(dec2).toEqual(message);
  });
});

describe('sha256Hex — one-way password digest', () => {
  it('matches the known SHA-256 vector for "abc"', async () => {
    // NIST test vector.
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('is deterministic and returns 64 lowercase hex chars', async () => {
    const a = await sha256Hex('biteflow');
    const b = await sha256Hex('biteflow');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is not reversible to plaintext (differs from input)', async () => {
    const digest = await sha256Hex('super-secret');
    expect(digest).not.toContain('super-secret');
  });
});

describe('timingSafeEqual', () => {
  it('returns true only for identical strings', () => {
    expect(timingSafeEqual('admin', 'admin')).toBe(true);
    expect(timingSafeEqual('admin', 'Admin')).toBe(false);
    expect(timingSafeEqual('admin', 'admins')).toBe(false);
  });
});

describe('verifyHash — admin login check', () => {
  it('accepts the correct password against its stored digest', async () => {
    const stored = await sha256Hex('correct horse battery staple');
    expect(await verifyHash('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await sha256Hex('correct horse battery staple');
    expect(await verifyHash('wrong password', stored)).toBe(false);
  });

  it('fails closed when no digest is configured', async () => {
    expect(await verifyHash('anything', '')).toBe(false);
  });

  it('tolerates surrounding whitespace / casing in the stored digest', async () => {
    const stored = (await sha256Hex('pw')).toUpperCase();
    expect(await verifyHash('pw', `  ${stored}  `)).toBe(true);
  });
});
