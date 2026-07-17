import { describe, it, expect } from 'vitest';
import { encryptText, decryptText } from './crypto';

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
