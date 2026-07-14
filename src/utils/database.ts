import type { Stall, MenuItem, Order, UserWallet, WalletTransaction } from '../types';
import { initialStalls, initialMenuItems, initialOrders, defaultWallet } from '../data/mockData';
import { db as firestoreDb } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, 
  updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';

const STALLS_KEY = 'foodcourt_stalls';
const MENU_ITEMS_KEY = 'foodcourt_menu_items';
const ORDERS_KEY = 'foodcourt_orders';
const WALLET_KEY = 'foodcourt_wallet';
const ACTIVE_STALL_KEY = 'foodcourt_active_stall'; // For stall admin login session
const CUSTOMER_USER_KEY = 'foodcourt_customer_name'; // For customer session

export const db = {
  initialize: async () => {
    // 1. Initialise LocalStorage fallback
    if (!localStorage.getItem(STALLS_KEY)) {
      localStorage.setItem(STALLS_KEY, JSON.stringify(initialStalls));
    }
    if (!localStorage.getItem(MENU_ITEMS_KEY)) {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(initialMenuItems));
    }
    if (!localStorage.getItem(ORDERS_KEY)) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(initialOrders));
    }
    if (!localStorage.getItem(WALLET_KEY)) {
      localStorage.setItem(WALLET_KEY, JSON.stringify(defaultWallet));
    }
    if (!localStorage.getItem(CUSTOMER_USER_KEY)) {
      localStorage.setItem(CUSTOMER_USER_KEY, 'Alex Mercer');
    }

    // 2. Initialise Firestore default collections if configured and empty
    if (firestoreDb) {
      try {
        const stallsRef = collection(firestoreDb, 'stalls');
        const snap = await getDocs(stallsRef);
        if (snap.empty) {
          console.log("Firestore 'stalls' collection is empty. Seeding default data...");
          // Seed stalls
          for (const s of initialStalls) {
            await setDoc(doc(firestoreDb, 'stalls', s.id), s);
          }
          // Seed menu items
          for (const item of initialMenuItems) {
            await setDoc(doc(firestoreDb, 'menu_items', item.id), item);
          }
          // Seed orders
          for (const o of initialOrders) {
            await setDoc(doc(firestoreDb, 'orders', o.id), o);
          }
          // Seed wallet
          await setDoc(doc(firestoreDb, 'wallets', defaultWallet.username), defaultWallet);
        }
      } catch (e) {
        console.error("Failed to seed Firestore collections:", e);
      }
    }
  },

  // Stalls
  getStalls: async (): Promise<Stall[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'stalls'));
        const list: Stall[] = [];
        snap.forEach((d: any) => list.push(d.data() as Stall));
        return list;
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
          await setDoc(doc(firestoreDb, 'stalls', s.id), s);
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
        await setDoc(doc(firestoreDb, 'stalls', stall.id), stall);
        return;
      } catch (e) {
        console.error("Firestore addStall failed, falling back to LocalStorage:", e);
      }
    }
    const stalls = JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
    stalls.push(stall);
    localStorage.setItem(STALLS_KEY, JSON.stringify(stalls));
  },

  // Menu Items
  getMenuItems: async (): Promise<MenuItem[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(collection(firestoreDb, 'menu_items'));
        const list: MenuItem[] = [];
        snap.forEach((d: any) => list.push(d.data() as MenuItem));
        return list;
      } catch (e) {
        console.error("Firestore getMenuItems failed, falling back to LocalStorage:", e);
      }
    }
    return JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
  },

  saveMenuItems: async (items: MenuItem[]): Promise<void> => {
    if (firestoreDb) {
      try {
        for (const item of items) {
          await setDoc(doc(firestoreDb, 'menu_items', item.id), item);
        }
        return;
      } catch (e) {
        console.error("Firestore saveMenuItems failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
  },

  addMenuItem: async (item: MenuItem): Promise<MenuItem> => {
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'menu_items', item.id), item);
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
        await setDoc(doc(firestoreDb, 'menu_items', updatedItem.id), updatedItem);
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

  deleteMenuItem: async (id: string): Promise<void> => {
    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'menu_items', id));
        return;
      } catch (e) {
        console.error("Firestore deleteMenuItem failed, falling back to LocalStorage:", e);
      }
    }
    const items = JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
    const filtered = items.filter((item: any) => item.id !== id);
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(filtered));
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    if (firestoreDb) {
      try {
        const snap = await getDocs(query(collection(firestoreDb, 'orders'), orderBy('orderTime', 'desc')));
        const list: Order[] = [];
        snap.forEach((d: any) => list.push(d.data() as Order));
        return list;
      } catch (e) {
        console.error("Firestore getOrders failed, falling back to LocalStorage:", e);
      }
    }
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  },

  saveOrders: async (orders: Order[]): Promise<void> => {
    if (firestoreDb) {
      try {
        for (const o of orders) {
          await setDoc(doc(firestoreDb, 'orders', o.id), o);
        }
        return;
      } catch (e) {
        console.error("Firestore saveOrders failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  },

  addOrders: async (newOrders: Order[]): Promise<void> => {
    if (firestoreDb) {
      try {
        for (const o of newOrders) {
          await setDoc(doc(firestoreDb, 'orders', o.id), o);
        }
        return;
      } catch (e) {
        console.error("Firestore addOrders failed, falling back to LocalStorage:", e);
      }
    }
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const updated = [...newOrders, ...orders];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  },

  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<boolean> => {
    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'orders', orderId), { status });
        return true;
      } catch (e) {
        console.error("Firestore updateOrderStatus failed, falling back to LocalStorage:", e);
      }
    }
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const index = orders.findIndex((o: any) => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      return true;
    }
    return false;
  },

  // Wallet
  getWallet: async (): Promise<UserWallet> => {
    const customerName = db.getCustomerName();
    if (firestoreDb) {
      try {
        const docRef = doc(firestoreDb, 'wallets', customerName);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as UserWallet;
        } else {
          const wallet: UserWallet = { ...defaultWallet, username: customerName };
          await setDoc(docRef, wallet);
          return wallet;
        }
      } catch (e) {
        console.error("Firestore getWallet failed, falling back to LocalStorage:", e);
      }
    }
    
    // LocalStorage fallback
    const wallet = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
    if (wallet.username === customerName) {
      return wallet;
    }
    return { ...defaultWallet, username: customerName };
  },

  saveWallet: async (wallet: UserWallet): Promise<void> => {
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'wallets', wallet.username), wallet);
        return;
      } catch (e) {
        console.error("Firestore saveWallet failed, falling back to LocalStorage:", e);
      }
    }
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  },

  loadWalletFunds: async (amount: number): Promise<UserWallet> => {
    const wallet = await db.getWallet();
    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}`,
      amount,
      type: 'load',
      description: `Loaded funds via Mock Payment Gateway`,
      timestamp: new Date().toISOString()
    };
    wallet.balance += amount;
    wallet.transactions.unshift(transaction);
    await db.saveWallet(wallet);
    return wallet;
  },

  deductWalletFunds: async (amount: number, description: string): Promise<boolean> => {
    const wallet = await db.getWallet();
    if (wallet.balance < amount) return false;
    
    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}`,
      amount,
      type: 'purchase',
      description,
      timestamp: new Date().toISOString()
    };
    wallet.balance -= amount;
    wallet.transactions.unshift(transaction);
    await db.saveWallet(wallet);
    return true;
  },

  refundWalletFunds: async (amount: number, description: string): Promise<void> => {
    const wallet = await db.getWallet();
    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}`,
      amount,
      type: 'refund',
      description,
      timestamp: new Date().toISOString()
    };
    wallet.balance += amount;
    wallet.transactions.unshift(transaction);
    await db.saveWallet(wallet);
  },

  // Auth / Session Helpers
  getActiveStall: (): Stall | null => {
    const session = localStorage.getItem(ACTIVE_STALL_KEY);
    return session ? JSON.parse(session) : null;
  },

  setActiveStall: (stall: Stall | null) => {
    if (stall) {
      localStorage.setItem(ACTIVE_STALL_KEY, JSON.stringify(stall));
    } else {
      localStorage.removeItem(ACTIVE_STALL_KEY);
    }
  },

  changeStallPassword: async (stallId: string, newPass: string): Promise<boolean> => {
    const stalls = await db.getStalls();
    const index = stalls.findIndex(s => s.id === stallId);
    if (index !== -1) {
      stalls[index].ownerPassword = newPass;
      await db.saveStalls(stalls);
      
      const active = db.getActiveStall();
      if (active && active.id === stallId) {
        active.ownerPassword = newPass;
        db.setActiveStall(active);
      }
      return true;
    }
    return false;
  },

  getCustomerName: (): string => {
    return localStorage.getItem(CUSTOMER_USER_KEY) || 'Alex Mercer';
  },

  setCustomerName: (name: string) => {
    localStorage.setItem(CUSTOMER_USER_KEY, name);
  }
};
