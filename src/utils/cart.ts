// Pure cart math, extracted from CustomerPortal so checkout arithmetic and the
// multi-kiosk grouping can be unit-tested without rendering React.

import type { CartItem, KioskOrderEntry } from '../types';

/** Total price of every line in the cart. */
export function computeCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);
}

/** Number of physical units in the cart (sum of quantities). */
export function computeCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, { quantity }) => sum + quantity, 0);
}

/**
 * Group cart lines by the kiosk (stall) that fulfills them. One checkout can
 * span multiple kiosks; each entry tracks its own items, subtotal, and
 * fulfillment status so kiosks accept/decline independently.
 */
export function groupCartByKiosk(cart: CartItem[]): Record<string, KioskOrderEntry> {
  const kioskOrders: Record<string, KioskOrderEntry> = {};

  cart.forEach(({ item, quantity }) => {
    if (!kioskOrders[item.stallId]) {
      kioskOrders[item.stallId] = {
        kioskId: item.stallId,
        kioskName: item.stallName,
        items: [],
        subtotal: 0,
        status: 'pending',
      };
    }
    kioskOrders[item.stallId].items.push({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
    });
  });

  Object.values(kioskOrders).forEach((k) => {
    k.subtotal = k.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  });

  return kioskOrders;
}

/**
 * Merge an item into an existing cart, incrementing quantity if already present.
 * Returns a new array (does not mutate the input) — safe for React state.
 */
export function addItemToCart(cart: CartItem[], item: CartItem['item'], qty = 1): CartItem[] {
  const existing = cart.find((c) => c.item.id === item.id);
  if (existing) {
    return cart.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + qty } : c));
  }
  return [...cart, { item, quantity: qty }];
}
