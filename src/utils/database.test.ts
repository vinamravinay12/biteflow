import { describe, it, expect, beforeEach, vi } from 'vitest';

// Force the LocalStorage-sandbox code path: with Firebase mocked to null, the
// db layer never touches the network and exercises its pure fallback logic.
vi.mock('./firebase', () => ({ db: null, auth: null }));

// Minimal in-memory localStorage so the sandbox path works under Node.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}
vi.stubGlobal('localStorage', new MemoryStorage());

import { db } from './database';

const UID = 'test-customer';

beforeEach(() => {
  localStorage.clear();
});

describe('wallet funds arithmetic (LocalStorage sandbox)', () => {
  it('loads funds and records a credit transaction', async () => {
    const wallet = await db.loadWalletFunds(UID, 50);
    expect(wallet.balance).toBe(50);
    expect(wallet.transactions[0]).toMatchObject({ amount: 50, type: 'load' });
  });

  it('deducts funds when the balance is sufficient', async () => {
    await db.loadWalletFunds(UID, 30);
    const ok = await db.deductWalletFunds(UID, 20, 'Burger combo');
    expect(ok).toBe(true);
    const wallet = await db.getWallet(UID);
    expect(wallet.balance).toBe(10);
    expect(wallet.transactions[0]).toMatchObject({
      amount: 20,
      type: 'purchase',
      description: 'Burger combo',
    });
  });

  it('refuses to deduct more than the available balance (no overdraft)', async () => {
    await db.loadWalletFunds(UID, 10);
    const ok = await db.deductWalletFunds(UID, 25, 'Too expensive');
    expect(ok).toBe(false);
    const wallet = await db.getWallet(UID);
    expect(wallet.balance).toBe(10); // unchanged
  });

  it('refunds funds back to the wallet', async () => {
    await db.loadWalletFunds(UID, 10);
    await db.deductWalletFunds(UID, 10, 'Order');
    await db.refundWalletFunds(UID, 10, 'Order declined');
    const wallet = await db.getWallet(UID);
    expect(wallet.balance).toBe(10);
    expect(wallet.transactions[0]).toMatchObject({ amount: 10, type: 'refund' });
  });
});

describe('stall credential verification (LocalStorage sandbox)', () => {
  it('round-trips an encrypted stall password and verifies the right credentials', async () => {
    await db.createStall({
      id: 'stall-x',
      name: 'Test Stall',
      description: 'desc',
      ownerUsername: 'chef',
      logoUrl: '🍔',
      bannerColor: '#000',
      rating: 5,
      active: true,
      city: 'Dallas',
      ownerPasswordPlain: 'secret-pass',
    });

    const good = await db.verifyStallCredentials('chef', 'secret-pass');
    expect(good?.id).toBe('stall-x');

    const bad = await db.verifyStallCredentials('chef', 'wrong');
    expect(bad).toBeNull();
  });
});
