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

import type { Stall, MenuItem, Order, Match } from '../types';
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeStall = (over: Partial<Stall> & { id: string }): Stall => ({
  name: 'Test Stall',
  description: 'desc',
  ownerUsername: 'owner',
  ownerPasswordEnc: '',
  logoUrl: '🍔',
  bannerColor: '#000',
  rating: 5,
  active: true,
  city: 'Dallas',
  ...over,
});

const makeMenuItem = (over: Partial<MenuItem> & { id: string; stallId: string }): MenuItem => ({
  stallName: 'Test Stall',
  name: 'Burger',
  description: '',
  price: 8,
  imageUrl: '',
  category: 'Burgers',
  isAvailable: true,
  prepTime: 5,
  ...over,
});

const makeOrder = (over: Partial<Order> & { id: string; customerUid: string }): Order => ({
  customerName: 'Alex',
  kioskIds: ['k1'],
  kioskOrders: {
    k1: { kioskId: 'k1', kioskName: 'Kiosk One', items: [], subtotal: 10, status: 'pending' },
  },
  totalAmount: 10,
  orderTime: new Date().toISOString(),
  ...over,
});

// ---------------------------------------------------------------------------

describe('stall CRUD (LocalStorage sandbox)', () => {
  it('returns an empty list before anything is stored', async () => {
    expect(await db.getStalls()).toEqual([]);
  });

  it('adds and reads back a stall', async () => {
    await db.addStall(makeStall({ id: 's1', name: 'Taco Loco' }));
    const stalls = await db.getStalls();
    expect(stalls).toHaveLength(1);
    expect(stalls[0].name).toBe('Taco Loco');
  });

  it('saveStalls replaces the whole collection', async () => {
    await db.saveStalls([makeStall({ id: 's1' }), makeStall({ id: 's2' })]);
    expect(await db.getStalls()).toHaveLength(2);
  });

  it('updates an existing stall in place', async () => {
    await db.addStall(makeStall({ id: 's1', name: 'Before' }));
    await db.updateStall(makeStall({ id: 's1', name: 'After' }));
    const stalls = await db.getStalls();
    expect(stalls).toHaveLength(1);
    expect(stalls[0].name).toBe('After');
  });

  it('deleting a stall also removes its menu items', async () => {
    await db.addStall(makeStall({ id: 's1' }));
    await db.addMenuItem(makeMenuItem({ id: 'm1', stallId: 's1' }));
    await db.addMenuItem(makeMenuItem({ id: 'm2', stallId: 's2' }));

    await db.deleteStall('s1');

    expect(await db.getStalls()).toHaveLength(0);
    const remaining = await db.getMenuItems();
    expect(remaining.map((i) => i.id)).toEqual(['m2']);
  });

  it('changes a stall password and re-verifies with the new one', async () => {
    await db.createStall({
      id: 's1',
      name: 'Test Stall',
      description: 'd',
      ownerUsername: 'chef',
      logoUrl: '🍔',
      bannerColor: '#000',
      rating: 5,
      active: true,
      city: 'Dallas',
      ownerPasswordPlain: 'old-pass',
    });

    expect(await db.changeStallPassword('s1', 'new-pass')).toBe(true);
    expect(await db.verifyStallCredentials('chef', 'new-pass')).not.toBeNull();
    expect(await db.verifyStallCredentials('chef', 'old-pass')).toBeNull();
  });

  it('returns false when changing the password of an unknown stall', async () => {
    expect(await db.changeStallPassword('nope', 'x')).toBe(false);
  });

  it('verification is case-insensitive on the username', async () => {
    await db.createStall({
      id: 's1',
      name: 'Test Stall',
      description: 'd',
      ownerUsername: 'chef',
      logoUrl: '🍔',
      bannerColor: '#000',
      rating: 5,
      active: true,
      city: 'Dallas',
      ownerPasswordPlain: 'pw',
    });
    expect(await db.verifyStallCredentials('CHEF', 'pw')).not.toBeNull();
  });

  it('returns null for an unknown username', async () => {
    expect(await db.verifyStallCredentials('ghost', 'pw')).toBeNull();
  });
});

describe('menu item CRUD (LocalStorage sandbox)', () => {
  it('adds items and filters them by stall', async () => {
    await db.addMenuItem(makeMenuItem({ id: 'm1', stallId: 's1' }));
    await db.addMenuItem(makeMenuItem({ id: 'm2', stallId: 's2' }));

    expect(await db.getMenuItems()).toHaveLength(2);
    expect((await db.getMenuItems('s1')).map((i) => i.id)).toEqual(['m1']);
  });

  it('updates an existing item and reports success', async () => {
    await db.addMenuItem(makeMenuItem({ id: 'm1', stallId: 's1', price: 8 }));
    const ok = await db.updateMenuItem(makeMenuItem({ id: 'm1', stallId: 's1', price: 12 }));
    expect(ok).toBe(true);
    expect((await db.getMenuItems())[0].price).toBe(12);
  });

  it('reports failure when updating an item that does not exist', async () => {
    expect(await db.updateMenuItem(makeMenuItem({ id: 'ghost', stallId: 's1' }))).toBe(false);
  });

  it('deletes an item', async () => {
    await db.addMenuItem(makeMenuItem({ id: 'm1', stallId: 's1' }));
    await db.deleteMenuItem('s1', 'm1');
    expect(await db.getMenuItems()).toHaveLength(0);
  });
});

describe('orders (LocalStorage sandbox)', () => {
  it('places an order and reads it back for that customer', async () => {
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: UID }));
    const orders = await db.getOrders(UID);
    expect(orders.map((o) => o.id)).toEqual(['o1']);
  });

  it('returns newest orders first', async () => {
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: UID }));
    await db.placeOrder(makeOrder({ id: 'o2', customerUid: UID }));
    expect((await db.getOrders(UID)).map((o) => o.id)).toEqual(['o2', 'o1']);
  });

  it('getAllOrders spans every customer', async () => {
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: 'cust-a' }));
    await db.placeOrder(makeOrder({ id: 'o2', customerUid: 'cust-b' }));
    expect((await db.getAllOrders()).map((o) => o.id).sort()).toEqual(['o1', 'o2']);
  });

  it('getOrdersForKiosk returns only orders containing that kiosk', async () => {
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: 'cust-a', kioskIds: ['k1'] }));
    await db.placeOrder(makeOrder({ id: 'o2', customerUid: 'cust-b', kioskIds: ['k2'] }));
    expect((await db.getOrdersForKiosk('k1')).map((o) => o.id)).toEqual(['o1']);
  });

  it('updates one kiosk status without touching the others', async () => {
    await db.placeOrder(
      makeOrder({
        id: 'o1',
        customerUid: UID,
        kioskIds: ['k1', 'k2'],
        kioskOrders: {
          k1: { kioskId: 'k1', kioskName: 'One', items: [], subtotal: 5, status: 'pending' },
          k2: { kioskId: 'k2', kioskName: 'Two', items: [], subtotal: 5, status: 'pending' },
        },
      })
    );

    const ok = await db.updateKioskOrderStatus(UID, 'o1', 'k1', 'ready');
    expect(ok).toBe(true);

    const [order] = await db.getOrders(UID);
    expect(order.kioskOrders.k1.status).toBe('ready');
    expect(order.kioskOrders.k2.status).toBe('pending');
  });

  it('records a decline reason when one is supplied', async () => {
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: UID }));
    await db.updateKioskOrderStatus(UID, 'o1', 'k1', 'cancelled', 'Out of stock');
    const [order] = await db.getOrders(UID);
    expect(order.kioskOrders.k1.declineReason).toBe('Out of stock');
  });

  it('returns false for an unknown order or kiosk', async () => {
    expect(await db.updateKioskOrderStatus(UID, 'ghost', 'k1', 'ready')).toBe(false);
    await db.placeOrder(makeOrder({ id: 'o1', customerUid: UID }));
    expect(await db.updateKioskOrderStatus(UID, 'o1', 'unknown-kiosk', 'ready')).toBe(false);
  });
});

describe('matches (LocalStorage sandbox)', () => {
  const match = (id: string, name = 'Match'): Match => ({
    id,
    name,
    sport: 'Football/Soccer',
    city: 'Dallas',
    dateTime: new Date().toISOString(),
    stallIds: [],
  });

  it('adds and lists matches', async () => {
    await db.addMatch(match('m1'));
    expect((await db.getMatches()).map((m) => m.id)).toEqual(['m1']);
  });

  it('saveMatches replaces the collection', async () => {
    await db.saveMatches([match('m1'), match('m2')]);
    expect(await db.getMatches()).toHaveLength(2);
  });

  it('updates a match in place', async () => {
    await db.addMatch(match('m1', 'Before'));
    await db.updateMatch(match('m1', 'After'));
    const all = await db.getMatches();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('After');
  });

  it('deletes a match', async () => {
    await db.addMatch(match('m1'));
    await db.deleteMatch('m1');
    expect(await db.getMatches()).toEqual([]);
  });
});

describe('session helpers (LocalStorage sandbox)', () => {
  it('round-trips the active stall and strips the encrypted password', () => {
    db.setActiveStall(makeStall({ id: 's1', ownerPasswordEnc: 'SECRET-CIPHERTEXT' }));
    const session = db.getActiveStall();
    expect(session?.id).toBe('s1');
    // The session type deliberately omits the credential.
    expect((session as unknown as Record<string, unknown>).ownerPasswordEnc).toBeUndefined();
  });

  it('clears the active stall on logout', () => {
    db.setActiveStall(makeStall({ id: 's1' }));
    db.setActiveStall(null);
    expect(db.getActiveStall()).toBeNull();
  });

  it('round-trips the customer name and uid, with defaults when unset', () => {
    expect(db.getCustomerName()).toBeTruthy();
    expect(db.getCustomerUid()).toBeTruthy();

    db.setCustomerName('Jordan');
    db.setCustomerUid('uid-123');
    expect(db.getCustomerName()).toBe('Jordan');
    expect(db.getCustomerUid()).toBe('uid-123');
  });
});

describe('wallet persistence (LocalStorage sandbox)', () => {
  it('saveWallet persists an explicit balance', async () => {
    await db.saveWallet({ uid: UID, balance: 77, transactions: [] });
    expect((await db.getWallet(UID)).balance).toBe(77);
  });

  it('ensureUserProfile is a no-op without Firestore', async () => {
    await expect(
      db.ensureUserProfile('u1', 'customer', 'u1@test.local', 'User One')
    ).resolves.toBeUndefined();
  });

  it('initialize seeds the sandbox collections', async () => {
    await db.initialize();
    expect((await db.getStalls()).length).toBeGreaterThan(0);
    expect((await db.getMenuItems()).length).toBeGreaterThan(0);
  });
});
