export type UserRole = 'admin' | 'foodkiosk' | 'customer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Stall {
  id: string;
  name: string;
  description: string;
  ownerUsername: string;
  ownerPasswordEnc: string; // AES-GCM encrypted password (base64 iv+ciphertext), decrypted client-side
  logoUrl: string;
  bannerColor: string; // Tailwind-like color or hex code
  rating: number;
  active: boolean;
  city: string; // City association for the stall
}

// Stall shape used for the merchant's logged-in session — deliberately omits
// the encrypted password so it never leaves the admin password-management flow.
export type StallSession = Omit<Stall, 'ownerPasswordEnc'>;

export interface MenuItem {
  id: string;
  stallId: string;
  stallName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  prepTime: number; // in minutes
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderLineItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface KioskOrderEntry {
  kioskId: string;
  kioskName: string;
  items: OrderLineItem[];
  subtotal: number;
  status: OrderStatus;
  declineReason?: string;
}

export interface Order {
  id: string;
  customerUid: string;
  customerName: string;
  // Match details (a single checkout is tied to one match)
  matchId?: string;
  matchName?: string;
  matchCity?: string;
  matchDateTime?: string;
  // Delivery details
  stand?: string;
  seatNumber?: string;
  // Per-kiosk breakdown: one order can contain items from multiple kiosks
  kioskIds: string[]; // denormalized for array-contains querying (e.g. collectionGroup by kiosk)
  kioskOrders: Record<string, KioskOrderEntry>; // keyed by kioskId for O(1) partial updates
  totalAmount: number;
  orderTime: string;
  notes?: string;
}

export interface Match {
  id: string;
  name: string;
  sport: string;
  city: string;
  dateTime: string;
  stallIds: string[]; // Stalls present at this match
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'load' | 'purchase' | 'refund';
  description: string;
  timestamp: string;
}

export interface UserWallet {
  uid: string;
  balance: number;
  transactions: WalletTransaction[];
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
}
