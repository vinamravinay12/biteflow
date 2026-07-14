export interface Stall {
  id: string;
  name: string;
  description: string;
  ownerUsername: string;
  ownerPassword: string; // Added password for merchant login
  logoUrl: string;
  bannerColor: string; // Tailwind-like color or hex code
  rating: number;
  active: boolean;
}

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

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  stallId: string;
}

export interface Order {
  id: string;
  stallId: string;
  stallName: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  orderTime: string;
  notes?: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'load' | 'purchase' | 'refund';
  description: string;
  timestamp: string;
}

export interface UserWallet {
  username: string;
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
