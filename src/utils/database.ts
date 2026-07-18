import type {
  Stall, StallSession, MenuItem, Order, OrderStatus, UserWallet, Match, AppUser, UserRole
} from '../types';
import { initialStalls, initialMenuItems, initialOrdersFor, defaultWallet, initialMatches, type SeedStall } from '../data/mockData';
import { ADMIN_UID, DEFAULT_CUSTOMER_UID, DEFAULT_CUSTOMER_NAME } from './constants';
import { encryptText, decryptText, timingSafeEqual } from './crypto';
import { db as firestoreDb } from './firebase';
import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, query, orderBy
} from 'firebase/firestore';

// Firestore layout:
//   users/{uid}                                    -- admin, foodkiosk, and customer profiles
//   users/{ADMIN_UID}/stalls/{stallId}              -- the single admin owns every stall configuration
//   users/{kioskUid}/menu_items/{itemId}           -- kiosk user contains menu_items subcollection
//   users/{customerUid}/orders/{orderId}           -- customer user contains orders subcollection
//   users/{customerUid}/wallet/main                -- customer user contains wallet main document
//   matches/{matchId}                               -- top-level, referenced by admin + customers

const STALLS_KEY = 'foodcourt_stalls';
const MENU_ITEMS_KEY = 'foodcourt_menu_items';
const MATCHES_KEY = 'foodcourt_matches';
const ACTIVE_STALL_KEY = 'foodcourt_active_stall';
const CUSTOMER_UID_KEY = 'foodcourt_customer_uid';
const CUSTOMER_NAME_KEY = 'foodcourt_customer_name';
const ORDERS_KEY_PREFIX = 'foodcourt_orders_';
const WALLET_KEY_PREFIX = 'foodcourt_wallet_';

const ordersKey = (uid: string) => `${ORDERS_KEY_PREFIX}${uid}`;
const walletKey = (uid: string) => `${WALLET_KEY_PREFIX}${uid}`;

const stallsColRef = () => collection(firestoreDb!, 'users', ADMIN_UID, 'stalls');
const stallDocRef = (stallId: string) => doc(firestoreDb!, 'users', ADMIN_UID, 'stalls', stallId);
const menuItemsColRef = (stallId: string) => collection(firestoreDb!, 'users', stallId, 'menu_items');
const menuItemDocRef = (stallId: string, itemId: string) => doc(firestoreDb!, 'users', stallId, 'menu_items', itemId);
const userOrdersRef = (uid: string) => collection(firestoreDb!, 'users', uid, 'orders');
const orderDocRef = (uid: string, orderId: string) => doc(firestoreDb!, 'users', uid, 'orders', orderId);
const walletDocRef = (uid: string) => doc(firestoreDb!, 'users', uid, 'wallet', 'main');
const userDocRef = (uid: string) => doc(firestoreDb!, 'users', uid);

const localOrdersForUid = (uid: string): Order[] => JSON.parse(localStorage.getItem(ordersKey(uid)) || '[]');

const seedStallToStall = async (s: SeedStall): Promise<Stall> => {
  const { ownerPasswordPlain, ...rest } = s;
  return { ...rest, ownerPasswordEnc: await encryptText(ownerPasswordPlain) };
};

// A brand-new customer's starter wallet. Every customer (anonymous guest or
// registered) gets demo funds so the ordering flow is usable immediately,
// while the wallet stays owner-locked to their own uid by the security rules.
const starterWalletFor = (uid: string): UserWallet => ({
  uid,
  balance: defaultWallet.balance,
  transactions: [
    {
      id: `tx-welcome-${Date.now()}`,
      amount: defaultWallet.balance,
      type: 'load',
      description: 'Welcome bonus (demo funds)',
      timestamp: new Date().toISOString(),
    },
  ],
});

export const db = {
  initialize: async () => {
    // 1. LocalStorage sandbox seeding
    if (!localStorage.getItem(STALLS_KEY)) {
      const encryptedStalls = await Promise.all(initialStalls.map(seedStallToStall));
      localStorage.setItem(STALLS_KEY, JSON.stringify(encryptedStalls));
    }
    if (!localStorage.getItem(MENU_ITEMS_KEY)) {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(initialMenuItems));
    }
    if (!localStorage.getItem(MATCHES_KEY)) {
      localStorage.setItem(MATCHES_KEY, JSON.stringify(initialMatches));
    }
    if (!localStorage.getItem(ordersKey(DEFAULT_CUSTOMER_UID))) {
      localStorage.setItem(ordersKey(DEFAULT_CUSTOMER_UID), JSON.stringify(initialOrdersFor(DEFAULT_CUSTOMER_UID)));
    }
    if (!localStorage.getItem(walletKey(DEFAULT_CUSTOMER_UID))) {
      localStorage.setItem(walletKey(DEFAULT_CUSTOMER_UID), JSON.stringify(defaultWallet));
    }
    if (!localStorage.getItem(CUSTOMER_NAME_KEY)) {
      localStorage.setItem(CUSTOMER_NAME_KEY, DEFAULT_CUSTOMER_NAME);
    }
    if (!localStorage.getItem(CUSTOMER_UID_KEY)) {
      localStorage.setItem(CUSTOMER_UID_KEY, DEFAULT_CUSTOMER_UID);
    }

    // 2. Firestore seeding (only if configured and empty)
    if (firestoreDb) {
      try {
        const adminSnap = await getDoc(userDocRef(ADMIN_UID));
        if (!adminSnap.exists()) {
          const adminProfile: AppUser = {
            uid: ADMIN_UID,
            email: 'admin@biteflow.app',
            displayName: 'BiteFlow Admin',
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef(ADMIN_UID), adminProfile);
        }

        // Seed default stalls + menu items individually if they don't exist in Firestore
        for (const s of initialStalls) {
          const ref = stallDocRef(s.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            console.log(`Seeding missing stall: ${s.name}...`);
            const stall = await seedStallToStall(s);
            await setDoc(ref, stall);
          }
        }
        for (const item of initialMenuItems) {
          const ref = menuItemDocRef(item.stallId, item.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, item);
          }
        }

        // Post-seeding: Ensure all registered stalls have a kiosk user profile in Firestore
        const currentStalls = await db.getStalls();
        for (const stall of currentStalls) {
          await db.ensureUserProfile(stall.id, 'foodkiosk', `${stall.ownerUsername}@biteflow.app`, stall.name);
        }

        // NOTE: a one-time backfill that copied legacy orders into each kiosk's
        // subcollection used to run here. It was removed deliberately: it ran on
        // EVERY page load for EVERY visitor, performing a full cross-customer
        // scan of the orders collection group (reading other customers' names
        // and seat numbers) and re-writing documents. `placeOrder` already writes
        // each new order to both the customer's and every involved kiosk's
        // subcollection, so no backfill is needed for current data. A historical
        // migration belongs in a one-off admin script, not in app startup.

        const matchesSnap = await getDocs(collection(firestoreDb, 'matches'));
        if (matchesSnap.empty && initialMatches.length > 0) {
          for (const m of initialMatches) {
            await setDoc(doc(firestoreDb, 'matches', m.id), m);
          }
        }

        // NOTE: we intentionally do NOT seed orders/wallet for the fixed
        // DEFAULT_CUSTOMER_UID in Firebase mode. Under the auth-required rules,
        // customer identity is the Firebase Auth uid (anonymous or registered),
        // so each real customer gets their own starter wallet on first access
        // (see getWallet). The fixed sandbox-customer demo orders/wallet only
        // apply to LocalStorage sandbox mode.
      } catch (e) {
        console.error("Failed to seed Firestore collections:", e);
      }
    }
  },

  // Users
  ensureUserProfile: async (uid: string, role: UserRole, email: string, displayName: string): Promise<void> => {
    if (!firestoreDb) return;
    try {
      const ref = userDocRef(uid);
      const snap = await getDoc(ref);
      if (!snap.exists() || (snap.data() as AppUser).role !== role) {
        const profile: AppUser = { uid, email, displayName, role, createdAt: new Date().toISOString() };
        await setDoc(ref, profile);
      }
    } catch (e) {
      console.error("Failed to ensure user profile:", e);
    }
  },

  // Stalls (nested under the single admin: users/{ADMIN_UID}/stalls)
  getStalls: async (): Promise<Stall[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(stallsColRef());
        return snap.docs.map((d: any) => d.data() as Stall);
      } catch (e) {
        console.error("Firestore getStalls failed, falling back to LocalStorage:", e);
      }
    }
    return JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
  },

  saveStalls: async (stalls: Stall[]): Promise<void> => {
    if (firestoreDb) {
      try {
        for (const s of stalls) {
          await setDoc(stallDocRef(s.id), s);
          await db.ensureUserProfile(s.id, 'foodkiosk', `${s.ownerUsername}@biteflow.app`, s.name);
        }
        return;
      } catch (e) {
        console.error("Firestore saveStalls failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(STALLS_KEY, JSON.stringify(stalls));
  },

  addStall: async (stall: Stall): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(stallDocRef(stall.id), stall);
        await db.ensureUserProfile(stall.id, 'foodkiosk', `${stall.ownerUsername}@biteflow.app`, stall.name);
        return;
      } catch (e) {
        console.error("Firestore addStall failed, falling back to LocalStorage:", e);
      }
    }
    const stalls = JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
    stalls.push(stall);
    localStorage.setItem(STALLS_KEY, JSON.stringify(stalls));
  },

  // Ergonomic wrapper so callers (the admin UI) never handle crypto directly.
  createStall: async (input: Omit<Stall, 'ownerPasswordEnc'> & { ownerPasswordPlain: string }): Promise<Stall> => {
    const { ownerPasswordPlain, ...rest } = input;
    const stall: Stall = { ...rest, ownerPasswordEnc: await encryptText(ownerPasswordPlain) };
    await db.addStall(stall);
    return stall;
  },

  updateStall: async (stall: Stall): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(stallDocRef(stall.id), stall);
        await db.ensureUserProfile(stall.id, 'foodkiosk', `${stall.ownerUsername}@biteflow.app`, stall.name);
        await updateDoc(userDocRef(stall.id), { displayName: stall.name, email: `${stall.ownerUsername}@biteflow.app` });
        return;
      } catch (e) {
        console.error("Firestore updateStall failed:", e);
      }
    }
    const stalls = JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
    const updated = stalls.map((s: any) => s.id === stall.id ? stall : s);
    localStorage.setItem(STALLS_KEY, JSON.stringify(updated));
  },

  deleteStall: async (stallId: string): Promise<void> => {
    if (firestoreDb) {
      try {
        const itemsSnap = await getDocs(menuItemsColRef(stallId));
        for (const docSnap of itemsSnap.docs) await deleteDoc(docSnap.ref);
        await deleteDoc(stallDocRef(stallId));
        await deleteDoc(userDocRef(stallId));
        return;
      } catch (e) {
        console.error("Firestore deleteStall failed:", e);
      }
    }
    const stalls = JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
    localStorage.setItem(STALLS_KEY, JSON.stringify(stalls.filter((s: any) => s.id !== stallId)));

    const items = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items.filter((item: any) => item.stallId !== stallId)));
  },

  // Decrypt a stall's password for display (admin quick-login list) or login verification.
  getStallPlainPassword: async (stall: Stall): Promise<string> => decryptText(stall.ownerPasswordEnc),

  changeStallPassword: async (stallId: string, newPlainPassword: string): Promise<boolean> => {
    const stalls = await db.getStalls();
    const index = stalls.findIndex(s => s.id === stallId);
    if (index === -1) return false;
    stalls[index].ownerPasswordEnc = await encryptText(newPlainPassword);
    await db.updateStall(stalls[index]);
    return true;
  },

  verifyStallCredentials: async (username: string, password: string): Promise<Stall | null> => {
    const stalls = await db.getStalls();
    const stall = stalls.find(s => s.ownerUsername.toLowerCase() === username.trim().toLowerCase());
    if (!stall) return null;
    try {
      const plain = await db.getStallPlainPassword(stall);
      return timingSafeEqual(plain, password) ? stall : null;
    } catch (e) {
      console.error("Failed to verify stall credentials:", e);
      return null;
    }
  },

  // Menu Items (nested under their stall). Omit stallId to fetch across every stall.
  getMenuItems: async (stallId?: string): Promise<MenuItem[]> => {
    if (firestoreDb) {
      try {
        if (stallId) {
          const snap = await getDocs(menuItemsColRef(stallId));
          return snap.docs.map((d: any) => d.data() as MenuItem);
        }
        const snap = await getDocs(collectionGroup(firestoreDb, 'menu_items'));
        return snap.docs.map((d: any) => d.data() as MenuItem);
      } catch (e) {
        console.error("Firestore getMenuItems failed, falling back to LocalStorage:", e);
      }
    }
    const items: MenuItem[] = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    return stallId ? items.filter(i => i.stallId === stallId) : items;
  },

  addMenuItem: async (item: MenuItem): Promise<MenuItem> => {
    if (firestoreDb) {
      try {
        await setDoc(menuItemDocRef(item.stallId, item.id), item);
        return item;
      } catch (e) {
        console.error("Firestore addMenuItem failed, falling back to LocalStorage:", e);
      }
    }
    const items = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    items.push(item);
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
    return item;
  },

  updateMenuItem: async (updatedItem: MenuItem): Promise<boolean> => {
    if (firestoreDb) {
      try {
        await setDoc(menuItemDocRef(updatedItem.stallId, updatedItem.id), updatedItem);
        return true;
      } catch (e) {
        console.error("Firestore updateMenuItem failed, falling back to LocalStorage:", e);
      }
    }
    const items = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    const index = items.findIndex((item: any) => item.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
      return true;
    }
    return false;
  },

  deleteMenuItem: async (stallId: string, id: string): Promise<void> => {
    if (firestoreDb) {
      try {
        await deleteDoc(menuItemDocRef(stallId, id));
        return;
      } catch (e) {
        console.error("Firestore deleteMenuItem failed, falling back to LocalStorage:", e);
      }
    }
    const items = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items.filter((item: any) => item.id !== id)));
  },

  // Orders (nested under the customer who placed them: users/{customerUid}/orders)
  getOrders: async (customerUid: string): Promise<Order[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(query(userOrdersRef(customerUid), orderBy('orderTime', 'desc')));
        return snap.docs.map((d: any) => d.data() as Order);
      } catch (e) {
        console.error("Firestore getOrders failed, falling back to LocalStorage:", e);
      }
    }
    return localOrdersForUid(customerUid);
  },

  // Every order platform-wide, for admin-level stats.
  //
  // NOTE: the security rules deliberately DENY `collectionGroup('orders')` so no
  // signed-in session can enumerate other customers' orders (names, seat numbers).
  // A permission-denied here is therefore the EXPECTED, designed behaviour — not a
  // fault — so it degrades quietly to locally-known orders. A true platform-wide
  // count needs role-based custom claims or a server-maintained aggregate.
  // See SECURITY.md and firestore.rules.
  getAllOrders: async (): Promise<Order[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collectionGroup(firestoreDb, 'orders'));
        return snap.docs.map((d: any) => d.data() as Order);
      } catch (e: any) {
        if (e?.code === 'permission-denied') {
          console.info(
            'Platform-wide order stats unavailable by design (cross-customer reads are denied); using locally-known orders.'
          );
        } else {
          console.error('Firestore getAllOrders failed, falling back to LocalStorage:', e);
        }
      }
    }
    const results: Order[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ORDERS_KEY_PREFIX)) {
        results.push(...JSON.parse(localStorage.getItem(key) || '[]'));
      }
    }
    return results;
  },

  // Every order (across all customers) that includes items from a given kiosk.
  getOrdersForKiosk: async (kioskId: string): Promise<Order[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'users', kioskId, 'orders'));
        return snap.docs.map((d: any) => d.data() as Order);
      } catch (e) {
        console.error("Firestore getOrdersForKiosk failed, falling back to LocalStorage:", e);
      }
    }
    const results: Order[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ORDERS_KEY_PREFIX)) {
        const orders: Order[] = JSON.parse(localStorage.getItem(key) || '[]');
        results.push(...orders.filter(o => o.kioskIds.includes(kioskId)));
      }
    }
    return results.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
  },

  placeOrder: async (order: Order): Promise<void> => {
    if (firestoreDb) {
      try {
        // Save under customer orders subcollection
        await setDoc(orderDocRef(order.customerUid, order.id), order);
        
        // Save under each involved kiosk's orders subcollection
        for (const kId of order.kioskIds) {
          await setDoc(doc(firestoreDb, 'users', kId, 'orders', order.id), order);
        }
        return;
      } catch (e) {
        console.error("Firestore placeOrder failed, falling back to LocalStorage:", e);
      }
    }
    const orders = localOrdersForUid(order.customerUid);
    orders.unshift(order);
    localStorage.setItem(ordersKey(order.customerUid), JSON.stringify(orders));
  },

  // Updates just one kiosk's status within an order, leaving other kiosks' entries untouched.
  updateKioskOrderStatus: async (customerUid: string, orderId: string, kioskId: string, status: OrderStatus, declineReason?: string): Promise<boolean> => {
    if (firestoreDb) {
      try {
        const updateData: any = {
          [`kioskOrders.${kioskId}.status`]: status
        };
        if (declineReason) {
          updateData[`kioskOrders.${kioskId}.declineReason`] = declineReason;
        }

        // Update customer copy
        await updateDoc(orderDocRef(customerUid, orderId), updateData);
        // Update kiosk copy
        await updateDoc(doc(firestoreDb, 'users', kioskId, 'orders', orderId), updateData);
        return true;
      } catch (e) {
        console.error("Firestore updateKioskOrderStatus failed, falling back to LocalStorage:", e);
      }
    }
    const orders = localOrdersForUid(customerUid);
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1 && orders[index].kioskOrders[kioskId]) {
      orders[index].kioskOrders[kioskId].status = status;
      if (declineReason) {
        orders[index].kioskOrders[kioskId].declineReason = declineReason;
      }
      localStorage.setItem(ordersKey(customerUid), JSON.stringify(orders));
      return true;
    }
    return false;
  },

  // Wallet (nested under the customer: users/{customerUid}/wallet/main)
  getWallet: async (uid: string): Promise<UserWallet> => {
    if (firestoreDb) {
      try {
        const snap = await getDoc(walletDocRef(uid));
        if (snap.exists()) return snap.data() as UserWallet;
        const wallet = starterWalletFor(uid);
        await setDoc(walletDocRef(uid), wallet);
        return wallet;
      } catch (e) {
        console.error("Firestore getWallet failed, falling back to LocalStorage:", e);
      }
    }
    const raw = localStorage.getItem(walletKey(uid));
    if (raw) return JSON.parse(raw);
    const wallet: UserWallet = uid === DEFAULT_CUSTOMER_UID ? defaultWallet : { uid, balance: 0, transactions: [] };
    localStorage.setItem(walletKey(uid), JSON.stringify(wallet));
    return wallet;
  },

  saveWallet: async (wallet: UserWallet): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(walletDocRef(wallet.uid), wallet);
        return;
      } catch (e) {
        console.error("Firestore saveWallet failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(walletKey(wallet.uid), JSON.stringify(wallet));
  },

  loadWalletFunds: async (uid: string, amount: number): Promise<UserWallet> => {
    const wallet = await db.getWallet(uid);
    wallet.balance += amount;
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      amount,
      type: 'load',
      description: `Loaded funds via Mock Payment Gateway`,
      timestamp: new Date().toISOString()
    });
    await db.saveWallet(wallet);
    return wallet;
  },

  deductWalletFunds: async (uid: string, amount: number, description: string): Promise<boolean> => {
    const wallet = await db.getWallet(uid);
    if (wallet.balance < amount) return false;
    wallet.balance -= amount;
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      amount,
      type: 'purchase',
      description,
      timestamp: new Date().toISOString()
    });
    await db.saveWallet(wallet);
    return true;
  },

  refundWalletFunds: async (uid: string, amount: number, description: string): Promise<void> => {
    const wallet = await db.getWallet(uid);
    wallet.balance += amount;
    wallet.transactions.unshift({
      id: `tx-${Date.now()}`,
      amount,
      type: 'refund',
      description,
      timestamp: new Date().toISOString()
    });
    await db.saveWallet(wallet);
  },

  // Auth / Session Helpers
  getActiveStall: (): StallSession | null => {
    const session = localStorage.getItem(ACTIVE_STALL_KEY);
    return session ? JSON.parse(session) : null;
  },

  setActiveStall: (stall: Stall | StallSession | null) => {
    if (stall) {
      const { ownerPasswordEnc: _omit, ...session } = stall as Stall;
      localStorage.setItem(ACTIVE_STALL_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_STALL_KEY);
    }
  },

  getCustomerName: (): string => {
    return localStorage.getItem(CUSTOMER_NAME_KEY) || DEFAULT_CUSTOMER_NAME;
  },

  setCustomerName: (name: string) => {
    localStorage.setItem(CUSTOMER_NAME_KEY, name);
  },

  getCustomerUid: (): string => {
    return localStorage.getItem(CUSTOMER_UID_KEY) || DEFAULT_CUSTOMER_UID;
  },

  setCustomerUid: (uid: string) => {
    localStorage.setItem(CUSTOMER_UID_KEY, uid);
  },

  // Matches (top-level, referenced by both admin and customers)
  getMatches: async (): Promise<Match[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'matches'));
        return snap.docs.map((d: any) => d.data() as Match);
      } catch (e) {
        console.error("Firestore getMatches failed, falling back to LocalStorage:", e);
      }
    }
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
  },

  saveMatches: async (matches: Match[]): Promise<void> => {
    if (firestoreDb) {
      try {
        for (const m of matches) await setDoc(doc(firestoreDb, 'matches', m.id), m);
        return;
      } catch (e) {
        console.error("Firestore saveMatches failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  },

  addMatch: async (match: Match): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'matches', match.id), match);
        return;
      } catch (e) {
        console.error("Firestore addMatch failed, falling back to LocalStorage:", e);
      }
    }
    const matches = JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
    matches.push(match);
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  },

  updateMatch: async (match: Match): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'matches', match.id), match);
        return;
      } catch (e) {
        console.error("Firestore updateMatch failed:", e);
      }
    }
    const matches = JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
    const updated = matches.map((m: any) => m.id === match.id ? match : m);
    localStorage.setItem(MATCHES_KEY, JSON.stringify(updated));
  },

  deleteMatch: async (id: string): Promise<void> => {
    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'matches', id));
        return;
      } catch (e) {
        console.error("Firestore deleteMatch failed, falling back to LocalStorage:", e);
      }
    }
    const matches = JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]');
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches.filter((m: any) => m.id !== id)));
  }
};
