import type { Stall, MenuItem, Order, UserWallet } from '../types';

export const initialStalls: Stall[] = [
  {
    id: 'stall-taco',
    name: 'Taco Del Sol',
    description: 'Vibrant street-style Mexican tacos, quesadillas, and fresh guacamole.',
    ownerUsername: 'taco_delsol',
    ownerPassword: 'spicy-taco-721',
    logoUrl: '🌮',
    bannerColor: '#f59e0b', // Amber
    rating: 4.8,
    active: true,
  },
  {
    id: 'stall-burger',
    name: 'Burger Junction',
    description: 'Gourmet smashed beef burgers, crispy loaded fries, and signature sauces.',
    ownerUsername: 'burger_junction',
    ownerPassword: 'crispy-burger-190',
    logoUrl: '🍔',
    bannerColor: '#ef4444', // Red
    rating: 4.7,
    active: true,
  },
  {
    id: 'stall-wok',
    name: 'Wok & Roll',
    description: 'Express stir-fry noodles, dumplings, and flavorful Asian street food.',
    ownerUsername: 'wok_roll',
    ownerPassword: 'tasty-wok-384',
    logoUrl: '🥢',
    bannerColor: '#10b981', // Emerald
    rating: 4.5,
    active: true,
  },
  {
    id: 'stall-sweet',
    name: 'Sweet Retreat',
    description: 'Warm waffles, artisanal gelato, bubble tea, and custom milkshakes.',
    ownerUsername: 'sweet_retreat',
    ownerPassword: 'sweet-shake-902',
    logoUrl: '🍦',
    bannerColor: '#ec4899', // Pink
    rating: 4.9,
    active: true,
  }
];

export const initialMenuItems: MenuItem[] = [
  // Taco Del Sol
  {
    id: 'taco-1',
    stallId: 'stall-taco',
    stallName: 'Taco Del Sol',
    name: 'Birria Beef Tacos (3x)',
    description: 'Slow-cooked shredded beef, melted Monterey Jack cheese, cilantro, onions, with warm consommé for dipping.',
    price: 12.99,
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60',
    category: 'Mexican',
    isAvailable: true,
    prepTime: 8
  },
  {
    id: 'taco-2',
    stallId: 'stall-taco',
    stallName: 'Taco Del Sol',
    name: 'Chipotle Chicken Quesadilla',
    description: 'Grilled chicken breast tossed in chipotle crema, toasted in a flour tortilla with melted cheese.',
    price: 9.99,
    imageUrl: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=500&auto=format&fit=crop&q=60',
    category: 'Mexican',
    isAvailable: true,
    prepTime: 6
  },
  {
    id: 'taco-3',
    stallId: 'stall-taco',
    stallName: 'Taco Del Sol',
    name: 'Loaded Nachos & Guac',
    description: 'Crispy corn tortilla chips topped with warm cheese sauce, black beans, pico de gallo, and fresh guacamole.',
    price: 7.99,
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 5
  },

  // Burger Junction
  {
    id: 'burger-1',
    stallId: 'stall-burger',
    stallName: 'Burger Junction',
    name: 'The Double Smash Burger',
    description: 'Two smashed Angus beef patties, double American cheese, caramelized onions, house pickles, and junction sauce on brioche.',
    price: 11.49,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    category: 'Burgers',
    isAvailable: true,
    prepTime: 10
  },
  {
    id: 'burger-2',
    stallId: 'stall-burger',
    stallName: 'Burger Junction',
    name: 'Crispy Truffle Fries',
    description: 'Golden fries tossed in white truffle oil, grated parmesan, and chopped fresh parsley. Served with garlic aioli.',
    price: 5.99,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 4
  },
  {
    id: 'burger-3',
    stallId: 'stall-burger',
    stallName: 'Burger Junction',
    name: 'Spicy Buffalo Chicken Sandwich',
    description: 'Buttermilk fried chicken breast drenched in buffalo sauce, cool ranch coleslaw, pickles on a toasted bun.',
    price: 10.99,
    imageUrl: 'https://images.unsplash.com/photo-1627662236973-4f8259fa2441?w=500&auto=format&fit=crop&q=60',
    category: 'Burgers',
    isAvailable: true,
    prepTime: 9
  },

  // Wok & Roll
  {
    id: 'wok-1',
    stallId: 'stall-wok',
    stallName: 'Wok & Roll',
    name: 'Classic Pad Thai Noodle',
    description: 'Stir-fried rice noodles in tangy tamarind sauce, bean sprouts, crushed peanuts, egg, and fresh chives with choice of chicken.',
    price: 11.99,
    imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500&auto=format&fit=crop&q=60',
    category: 'Noodles',
    isAvailable: true,
    prepTime: 7
  },
  {
    id: 'wok-2',
    stallId: 'stall-wok',
    stallName: 'Wok & Roll',
    name: 'Pan-Fried Pork Gyoza (6x)',
    description: 'Crispy pan-fried Japanese style dumplings stuffed with seasoned minced pork and cabbage, served with soy dipping sauce.',
    price: 6.49,
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=60',
    category: 'Sides',
    isAvailable: true,
    prepTime: 5
  },
  {
    id: 'wok-3',
    stallId: 'stall-wok',
    stallName: 'Wok & Roll',
    name: 'Teriyaki Salmon Donburi',
    description: 'Grilled Atlantic salmon glazed with sweet teriyaki sauce, served over warm Japanese rice, edamame, and pickled ginger.',
    price: 14.99,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
    category: 'Rice Bowls',
    isAvailable: false,
    prepTime: 12
  },

  // Sweet Retreat
  {
    id: 'sweet-1',
    stallId: 'stall-sweet',
    stallName: 'Sweet Retreat',
    name: 'Strawberry Nutella Waffle',
    description: 'Freshly baked Belgian waffle drizzled with warm Nutella, loaded with fresh strawberries and whipped cream.',
    price: 8.99,
    imageUrl: 'https://images.unsplash.com/photo-1562376502-6f769499c886?w=500&auto=format&fit=crop&q=60',
    category: 'Dessert',
    isAvailable: true,
    prepTime: 6
  },
  {
    id: 'sweet-2',
    stallId: 'stall-sweet',
    stallName: 'Sweet Retreat',
    name: 'Classic Brown Sugar Boba',
    description: 'Rich brown sugar syrup, slow-cooked warm tapioca pearls, cold creamy fresh milk, topped with cheese foam.',
    price: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=60',
    category: 'Beverage',
    isAvailable: true,
    prepTime: 4
  }
];

export const initialOrders: Order[] = [
  {
    id: 'ord-101',
    stallId: 'stall-taco',
    stallName: 'Taco Del Sol',
    customerName: 'Alex Mercer',
    items: [
      {
        menuItemId: 'taco-1',
        name: 'Birria Beef Tacos (3x)',
        price: 12.99,
        quantity: 1,
        stallId: 'stall-taco'
      },
      {
        menuItemId: 'taco-3',
        name: 'Loaded Nachos & Guac',
        price: 7.99,
        quantity: 1,
        stallId: 'stall-taco'
      }
    ],
    totalAmount: 20.98,
    status: 'completed',
    orderTime: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    notes: 'Extra lime wedges please!'
  },
  {
    id: 'ord-102',
    stallId: 'stall-burger',
    stallName: 'Burger Junction',
    customerName: 'Sarah Connor',
    items: [
      {
        menuItemId: 'burger-1',
        name: 'The Double Smash Burger',
        price: 11.49,
        quantity: 2,
        stallId: 'stall-burger'
      },
      {
        menuItemId: 'burger-2',
        name: 'Crispy Truffle Fries',
        price: 5.99,
        quantity: 1,
        stallId: 'stall-burger'
      }
    ],
    totalAmount: 28.97,
    status: 'preparing',
    orderTime: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    notes: 'No pickles on one burger.'
  },
  {
    id: 'ord-103',
    stallId: 'stall-wok',
    stallName: 'Wok & Roll',
    customerName: 'David Kim',
    items: [
      {
        menuItemId: 'wok-1',
        name: 'Classic Pad Thai Noodle',
        price: 11.99,
        quantity: 1,
        stallId: 'stall-wok'
      },
      {
        menuItemId: 'wok-2',
        name: 'Pan-Fried Pork Gyoza (6x)',
        price: 6.49,
        quantity: 1,
        stallId: 'stall-wok'
      }
    ],
    totalAmount: 18.48,
    status: 'pending',
    orderTime: new Date(Date.now() - 180000).toISOString(), // 3 mins ago
  },
  {
    id: 'ord-104',
    stallId: 'stall-sweet',
    stallName: 'Sweet Retreat',
    customerName: 'Alex Mercer',
    items: [
      {
        menuItemId: 'sweet-2',
        name: 'Classic Brown Sugar Boba',
        price: 6.50,
        quantity: 2,
        stallId: 'stall-sweet'
      }
    ],
    totalAmount: 13.00,
    status: 'ready',
    orderTime: new Date(Date.now() - 900000).toISOString(), // 15 mins ago
  }
];

export const defaultWallet: UserWallet = {
  username: 'Alex Mercer',
  balance: 125.50,
  transactions: [
    {
      id: 'tx-001',
      amount: 150.00,
      type: 'load',
      description: 'Loaded funds via Credit Card',
      timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'tx-002',
      amount: 20.98,
      type: 'purchase',
      description: 'Purchase at Taco Del Sol (Order #ord-101)',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
    },
    {
      id: 'tx-003',
      amount: 3.52,
      type: 'load',
      description: 'Cashback promotion reward',
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ]
};
