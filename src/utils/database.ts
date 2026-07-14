import type { Stall, MenuItem, Order, UserWallet, WalletTransaction } from '../types';
import { initialStalls, initialMenuItems, initialOrders, defaultWallet } from '../data/mockData';

const STALLS_KEY = 'foodcourt_stalls';
const MENU_ITEMS_KEY = 'foodcourt_menu_items';
const ORDERS_KEY = 'foodcourt_orders';
const WALLET_KEY = 'foodcourt_wallet';
const ACTIVE_STALL_KEY = 'foodcourt_active_stall'; // For stall admin login session
const CUSTOMER_USER_KEY = 'foodcourt_customer_name'; // For customer session

export const db = {
  initialize: () => {
    const existingStallsStr = localStorage.getItem(STALLS_KEY);
    if (existingStallsStr) {
      try {
        const currentStalls = JSON.parse(existingStallsStr) as Stall[];
        let migrated = false;
        const updatedStalls = currentStalls.map(s => {
          const updatedStall = { ...s };
          // Migrate old usernames
          if (s.ownerUsername === 'taco') { updatedStall.ownerUsername = 'taco_delsol'; migrated = true; }
          else if (s.ownerUsername === 'burger') { updatedStall.ownerUsername = 'burger_junction'; migrated = true; }
          else if (s.ownerUsername === 'wok') { updatedStall.ownerUsername = 'wok_roll'; migrated = true; }
          else if (s.ownerUsername === 'sweet') { updatedStall.ownerUsername = 'sweet_retreat'; migrated = true; }
          
          // Migrate missing passwords
          if (!s.ownerPassword) {
            migrated = true;
            if (updatedStall.ownerUsername === 'taco_delsol') updatedStall.ownerPassword = 'spicy-taco-721';
            else if (updatedStall.ownerUsername === 'burger_junction') updatedStall.ownerPassword = 'crispy-burger-190';
            else if (updatedStall.ownerUsername === 'wok_roll') updatedStall.ownerPassword = 'tasty-wok-384';
            else if (updatedStall.ownerUsername === 'sweet_retreat') updatedStall.ownerPassword = 'sweet-shake-902';
            else updatedStall.ownerPassword = `pass-${s.ownerUsername}`;
          }
          return updatedStall;
        });
        if (migrated) {
          localStorage.setItem(STALLS_KEY, JSON.stringify(updatedStalls));
        }
      } catch (e) {
        localStorage.setItem(STALLS_KEY, JSON.stringify(initialStalls));
      }
    } else {
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
  },

  // Stalls
  getStalls: (): Stall[] => {
    db.initialize();
    return JSON.parse(localStorage.getItem(STALLS_KEY) || '[]');
  },
  saveStalls: (stalls: Stall[]) => {
    localStorage.setItem(STALLS_KEY, JSON.stringify(stalls));
  },
  addStall: (stall: Stall) => {
    const stalls = db.getStalls();
    stalls.push(stall);
    db.saveStalls(stalls);
  },

  // Menu Items
  getMenuItems: (): MenuItem[] => {
    db.initialize();
    return JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
  },
  saveMenuItems: (items: MenuItem[]) => {
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
  },
  addMenuItem: (item: MenuItem) => {
    const items = db.getMenuItems();
    items.push(item);
    db.saveMenuItems(items);
    return item;
  },
  updateMenuItem: (updatedItem: MenuItem) => {
    const items = db.getMenuItems();
    const index = items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      db.saveMenuItems(items);
      return true;
    }
    return false;
  },
  deleteMenuItem: (id: string) => {
    const items = db.getMenuItems();
    const filtered = items.filter(item => item.id !== id);
    db.saveMenuItems(filtered);
  },

  // Orders
  getOrders: (): Order[] => {
    db.initialize();
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  },
  saveOrders: (orders: Order[]) => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  },
  addOrders: (newOrders: Order[]) => {
    const orders = db.getOrders();
    const updated = [...newOrders, ...orders]; // Show newest first
    db.saveOrders(updated);
  },
  updateOrderStatus: (orderId: string, status: Order['status']) => {
    const orders = db.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index].status = status;
      db.saveOrders(orders);
      return true;
    }
    return false;
  },

  // Wallet
  getWallet: (): UserWallet => {
    db.initialize();
    return JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
  },
  saveWallet: (wallet: UserWallet) => {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  },
  loadWalletFunds: (amount: number): UserWallet => {
    const wallet = db.getWallet();
    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}`,
      amount,
      type: 'load',
      description: `Loaded funds via Mock Payment Gateway`,
      timestamp: new Date().toISOString()
    };
    wallet.balance += amount;
    wallet.transactions.unshift(transaction); // Add newest first
    db.saveWallet(wallet);
    return wallet;
  },
  deductWalletFunds: (amount: number, description: string): boolean => {
    const wallet = db.getWallet();
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
    db.saveWallet(wallet);
    return true;
  },
  refundWalletFunds: (amount: number, description: string) => {
    const wallet = db.getWallet();
    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}`,
      amount,
      type: 'refund',
      description,
      timestamp: new Date().toISOString()
    };
    wallet.balance += amount;
    wallet.transactions.unshift(transaction);
    db.saveWallet(wallet);
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
  changeStallPassword: (stallId: string, newPass: string): boolean => {
    const stalls = db.getStalls();
    const index = stalls.findIndex(s => s.id === stallId);
    if (index !== -1) {
      stalls[index].ownerPassword = newPass;
      db.saveStalls(stalls);
      
      // Update active session if it matches
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
    db.initialize();
    return localStorage.getItem(CUSTOMER_USER_KEY) || 'Alex Mercer';
  },
  setCustomerName: (name: string) => {
    localStorage.setItem(CUSTOMER_USER_KEY, name);
  }
};
