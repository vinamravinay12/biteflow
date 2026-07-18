import type { Stall, MenuItem, Order, UserWallet, Match } from '../types';
import { DEFAULT_CUSTOMER_UID, DEFAULT_CUSTOMER_NAME } from '../utils/constants';

export const FIFA_CITIES = [
  'Atlanta',
  'Boston',
  'Dallas',
  'Guadalajara',
  'Houston',
  'Kansas City',
  'Los Angeles',
  'Mexico City',
  'Miami',
  'Monterrey',
  'New York/New Jersey',
  'Philadelphia',
  'San Francisco Bay Area',
  'Seattle',
  'Toronto',
  'Vancouver',
];

// Seed stalls carry a plaintext password that database.ts encrypts (via
// crypto.ts) into `ownerPasswordEnc` at seed time. Plaintext never touches
// Firestore or LocalStorage.
export type SeedStall = Omit<Stall, 'ownerPasswordEnc'> & { ownerPasswordPlain: string };

export const initialStalls: SeedStall[] = [
  {
    id: 'stall-721839',
    name: 'Taco Del Sol',
    description: 'Vibrant street-style Mexican tacos, quesadillas, and fresh guacamole.',
    ownerUsername: 'taco_delsol',
    ownerPasswordPlain: 'spicy-taco-721',
    logoUrl: '🌮',
    bannerColor: '#f59e0b', // Amber
    rating: 4.8,
    active: true,
    city: 'Mexico City',
  },
  {
    id: 'stall-840291',
    name: 'Smash Burgers',
    description: 'Gourmet smashed beef burgers, crispy loaded fries, and signature sauces.',
    ownerUsername: 'smash_burgers',
    ownerPasswordPlain: 'crispy-burger-190',
    logoUrl: '🍔',
    bannerColor: '#ef4444', // Red
    rating: 4.7,
    active: true,
    city: 'Dallas',
  },
  {
    id: 'stall-384729',
    name: 'Wok & Roll',
    description: 'Express stir-fry noodles, dumplings, and flavorful Asian street food.',
    ownerUsername: 'wok_roll',
    ownerPasswordPlain: 'tasty-wok-384',
    logoUrl: '🥢',
    bannerColor: '#10b981', // Emerald
    rating: 4.5,
    active: true,
    city: 'Vancouver',
  },
  {
    id: 'stall-902847',
    name: 'Sweet Retreat',
    description: 'Warm waffles, artisanal gelato, bubble tea, and custom milkshakes.',
    ownerUsername: 'sweet_retreat',
    ownerPasswordPlain: 'sweet-shake-902',
    logoUrl: '🍦',
    bannerColor: '#ec4899', // Pink
    rating: 4.9,
    active: true,
    city: 'Vancouver',
  },
  {
    id: 'stall-842910',
    name: 'Pizza Bella',
    description:
      'Authentic wood-fired Neapolitan pizzas, cheesy garlic bread, and classic tiramisu.',
    ownerUsername: 'pizza_bella',
    ownerPasswordPlain: 'crispy-pizza-842',
    logoUrl: '🍕',
    bannerColor: '#06b6d4', // Cyan
    rating: 4.6,
    active: true,
    city: 'Dallas',
  },
  {
    id: 'stall-401928',
    name: 'Brew & Bake',
    description:
      'Freshly brewed artisan coffees, iced lattes, warm croissants, and sweet pastries.',
    ownerUsername: 'brew_bake',
    ownerPasswordPlain: 'golden-chef-401',
    logoUrl: '☕',
    bannerColor: '#8b5cf6', // Purple
    rating: 4.7,
    active: true,
    city: 'Vancouver',
  },
];

export const initialMatches: Match[] = [];

export const initialMenuItems: MenuItem[] = [
  // Taco Del Sol
  {
    id: 'taco-1',
    stallId: 'stall-721839',
    stallName: 'Taco Del Sol',
    name: 'Birria Beef Tacos (3x)',
    description:
      'Slow-cooked shredded beef, melted Monterey Jack cheese, cilantro, onions, with warm consommé for dipping.',
    price: 12.99,
    imageUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=60',
    category: 'Mexican',
    isAvailable: true,
    prepTime: 8,
  },
  {
    id: 'taco-2',
    stallId: 'stall-721839',
    stallName: 'Taco Del Sol',
    name: 'Chipotle Chicken Quesadilla',
    description:
      'Grilled chicken breast tossed in chipotle crema, toasted in a flour tortilla with melted cheese.',
    price: 9.99,
    imageUrl:
      'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=500&auto=format&fit=crop&q=60',
    category: 'Mexican',
    isAvailable: true,
    prepTime: 6,
  },
  {
    id: 'taco-3',
    stallId: 'stall-721839',
    stallName: 'Taco Del Sol',
    name: 'Loaded Nachos & Guac',
    description:
      'Crispy corn tortilla chips topped with warm cheese sauce, black beans, pico de gallo, and fresh guacamole.',
    price: 7.99,
    imageUrl:
      'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 5,
  },

  // Smash Burgers
  {
    id: 'burger-1',
    stallId: 'stall-840291',
    stallName: 'Smash Burgers',
    name: 'The Double Smash Burger',
    description:
      'Two smashed Angus beef patties, double American cheese, caramelized onions, house pickles, and junction sauce on brioche.',
    price: 11.49,
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    category: 'Burgers',
    isAvailable: true,
    prepTime: 10,
  },
  {
    id: 'burger-2',
    stallId: 'stall-840291',
    stallName: 'Smash Burgers',
    name: 'Crispy Truffle Fries',
    description:
      'Golden fries tossed in white truffle oil, grated parmesan, and chopped fresh parsley. Served with garlic aioli.',
    price: 5.99,
    imageUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 4,
  },
  {
    id: 'burger-3',
    stallId: 'stall-840291',
    stallName: 'Smash Burgers',
    name: 'Spicy Buffalo Chicken Sandwich',
    description:
      'Buttermilk fried chicken breast drenched in buffalo sauce, cool ranch coleslaw, pickles on a toasted bun.',
    price: 10.99,
    imageUrl:
      'https://images.unsplash.com/photo-1627662236973-4f8259fa2441?w=500&auto=format&fit=crop&q=60',
    category: 'Burgers',
    isAvailable: true,
    prepTime: 9,
  },

  // Wok & Roll
  {
    id: 'wok-1',
    stallId: 'stall-384729',
    stallName: 'Wok & Roll',
    name: 'Classic Pad Thai Noodle',
    description:
      'Stir-fried rice noodles in tangy tamarind sauce, bean sprouts, crushed peanuts, egg, and fresh chives with choice of chicken.',
    price: 11.99,
    imageUrl:
      'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&auto=format&fit=crop&q=60',
    category: 'Noodles',
    isAvailable: true,
    prepTime: 7,
  },
  {
    id: 'wok-2',
    stallId: 'stall-384729',
    stallName: 'Wok & Roll',
    name: 'Pan-Fried Pork Gyoza (6x)',
    description:
      'Crispy pan-fried Japanese style dumplings stuffed with seasoned minced pork and cabbage, served with soy dipping sauce.',
    price: 6.49,
    imageUrl:
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 5,
  },
  {
    id: 'wok-3',
    stallId: 'stall-384729',
    stallName: 'Wok & Roll',
    name: 'Teriyaki Salmon Donburi',
    description:
      'Grilled Atlantic salmon glazed with sweet teriyaki sauce, served over warm Japanese rice, edamame, and pickled ginger.',
    price: 14.99,
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
    category: 'Rice Bowls',
    isAvailable: false,
    prepTime: 12,
  },

  // Sweet Retreat
  {
    id: 'sweet-1',
    stallId: 'stall-902847',
    stallName: 'Sweet Retreat',
    name: 'Strawberry Nutella Waffle',
    description:
      'Freshly baked Belgian waffle drizzled with warm Nutella, loaded with fresh strawberries and whipped cream.',
    price: 8.99,
    imageUrl:
      'https://images.unsplash.com/photo-1562376502-6f769499c886?w=500&auto=format&fit=crop&q=60',
    category: 'Dessert',
    isAvailable: true,
    prepTime: 6,
  },
  {
    id: 'sweet-2',
    stallId: 'stall-902847',
    stallName: 'Sweet Retreat',
    name: 'Classic Brown Sugar Boba',
    description:
      'Rich brown sugar syrup, slow-cooked warm tapioca pearls, cold creamy fresh milk, topped with cheese foam.',
    price: 6.5,
    imageUrl:
      'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=60',
    category: 'Beverage',
    isAvailable: true,
    prepTime: 4,
  },

  // Pizza Bella
  {
    id: 'pizza-1',
    stallId: 'stall-842910',
    stallName: 'Pizza Bella',
    name: 'Margherita Pizza (12")',
    description: 'Classic tomato sauce, fresh mozzarella, fresh basil, and extra virgin olive oil.',
    price: 13.99,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
    category: 'Mains',
    isAvailable: true,
    prepTime: 9,
  },
  {
    id: 'pizza-2',
    stallId: 'stall-842910',
    stallName: 'Pizza Bella',
    name: 'Cheesy Garlic Bread',
    description: 'Toasted garlic baguette topped with melted mozzarella cheese and fresh oregano.',
    price: 5.99,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500',
    category: 'Sides',
    isAvailable: true,
    prepTime: 5,
  },

  // Brew & Bake
  {
    id: 'brew-1',
    stallId: 'stall-401928',
    stallName: 'Brew & Bake',
    name: 'Iced Caramel Macchiato',
    description: 'Fresh espresso, cold milk, rich caramel drizzle, and sweet vanilla syrup.',
    price: 5.49,
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500',
    category: 'Beverage',
    isAvailable: true,
    prepTime: 3,
  },
  {
    id: 'brew-2',
    stallId: 'stall-401928',
    stallName: 'Brew & Bake',
    name: 'Warm Butter Croissant',
    description: 'Flaky, golden-brown French pastry served warm with butter and jam.',
    price: 3.99,
    imageUrl: 'https://images.unsplash.com/photo-1562376502-6f769499c886?w=500',
    category: 'Dessert',
    isAvailable: true,
    prepTime: 2,
  },
];

// initialOrders is seed data keyed per-customer: users/{customerUid}/orders/{id}.
// ord-101 demonstrates the multi-kiosk-in-one-order case (Taco Del Sol + Sweet Retreat);
// each kiosk tracks its own fulfillment status independently within the same order.
export const initialOrders: Record<string, Order[]> = {
  [DEFAULT_CUSTOMER_UID]: [
    {
      id: 'ord-101',
      customerUid: DEFAULT_CUSTOMER_UID,
      customerName: DEFAULT_CUSTOMER_NAME,
      stand: 'Section 114',
      seatNumber: 'Row F, Seat 12',
      kioskIds: ['stall-721839', 'stall-902847'],
      kioskOrders: {
        'stall-721839': {
          kioskId: 'stall-721839',
          kioskName: 'Taco Del Sol',
          items: [
            { menuItemId: 'taco-1', name: 'Birria Beef Tacos (3x)', price: 12.99, quantity: 1 },
            { menuItemId: 'taco-3', name: 'Loaded Nachos & Guac', price: 7.99, quantity: 1 },
          ],
          subtotal: 20.98,
          status: 'completed',
        },
        'stall-902847': {
          kioskId: 'stall-902847',
          kioskName: 'Sweet Retreat',
          items: [
            { menuItemId: 'sweet-2', name: 'Classic Brown Sugar Boba', price: 6.5, quantity: 2 },
          ],
          subtotal: 13.0,
          status: 'ready',
        },
      },
      totalAmount: 33.98,
      orderTime: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      notes: 'Extra lime wedges please!',
    },
    {
      id: 'ord-103',
      customerUid: DEFAULT_CUSTOMER_UID,
      customerName: DEFAULT_CUSTOMER_NAME,
      stand: 'Section 220',
      seatNumber: 'Row A, Seat 3',
      kioskIds: ['stall-384729'],
      kioskOrders: {
        'stall-384729': {
          kioskId: 'stall-384729',
          kioskName: 'Wok & Roll',
          items: [
            { menuItemId: 'wok-1', name: 'Classic Pad Thai Noodle', price: 11.99, quantity: 1 },
            { menuItemId: 'wok-2', name: 'Pan-Fried Pork Gyoza (6x)', price: 6.49, quantity: 1 },
          ],
          subtotal: 18.48,
          status: 'pending',
        },
      },
      totalAmount: 18.48,
      orderTime: new Date(Date.now() - 180000).toISOString(), // 3 mins ago
    },
  ],
};

export const initialOrdersFor = (customerUid: string): Order[] => initialOrders[customerUid] || [];

export const defaultWallet: UserWallet = {
  uid: DEFAULT_CUSTOMER_UID,
  balance: 125.5,
  transactions: [
    {
      id: 'tx-001',
      amount: 150.0,
      type: 'load',
      description: 'Loaded funds via Credit Card',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 'tx-002',
      amount: 33.98,
      type: 'purchase',
      description: 'Purchase at Taco Del Sol, Sweet Retreat (Order #ord-101)',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'tx-003',
      amount: 3.52,
      type: 'load',
      description: 'Cashback promotion reward',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  ],
};
