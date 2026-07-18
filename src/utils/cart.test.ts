import { describe, it, expect } from 'vitest';
import { computeCartTotal, computeCartCount, groupCartByKiosk, addItemToCart } from './cart';
import type { CartItem, MenuItem } from '../types';

const makeItem = (over: Partial<MenuItem> & { id: string }): MenuItem => ({
  stallId: 'stall-1',
  stallName: 'Burger Barn',
  name: 'Item',
  description: '',
  price: 5,
  imageUrl: '',
  category: 'Burgers',
  isAvailable: true,
  prepTime: 5,
  ...over,
});

const burger = makeItem({
  id: 'b1',
  name: 'Burger',
  price: 8,
  stallId: 'barn',
  stallName: 'Burger Barn',
});
const fries = makeItem({
  id: 'f1',
  name: 'Fries',
  price: 3.5,
  stallId: 'barn',
  stallName: 'Burger Barn',
});
const taco = makeItem({
  id: 't1',
  name: 'Taco',
  price: 4,
  stallId: 'loco',
  stallName: 'Taco Loco',
});

describe('computeCartTotal', () => {
  it('sums price * quantity across lines', () => {
    const cart: CartItem[] = [
      { item: burger, quantity: 2 }, // 16
      { item: fries, quantity: 1 }, // 3.5
    ];
    expect(computeCartTotal(cart)).toBe(19.5);
  });

  it('is 0 for an empty cart', () => {
    expect(computeCartTotal([])).toBe(0);
  });
});

describe('computeCartCount', () => {
  it('sums quantities', () => {
    expect(
      computeCartCount([
        { item: burger, quantity: 2 },
        { item: taco, quantity: 3 },
      ])
    ).toBe(5);
  });
});

describe('groupCartByKiosk', () => {
  it('splits a multi-kiosk cart into per-kiosk entries with correct subtotals', () => {
    const cart: CartItem[] = [
      { item: burger, quantity: 2 }, // barn: 16
      { item: fries, quantity: 2 }, // barn: 7  -> barn subtotal 23
      { item: taco, quantity: 1 }, // loco: 4
    ];
    const grouped = groupCartByKiosk(cart);
    expect(Object.keys(grouped).sort()).toEqual(['barn', 'loco']);
    expect(grouped.barn.subtotal).toBe(23);
    expect(grouped.barn.items).toHaveLength(2);
    expect(grouped.loco.subtotal).toBe(4);
    expect(grouped.barn.status).toBe('pending');
  });

  it('sum of kiosk subtotals equals the cart total', () => {
    const cart: CartItem[] = [
      { item: burger, quantity: 1 },
      { item: taco, quantity: 2 },
    ];
    const grouped = groupCartByKiosk(cart);
    const sum = Object.values(grouped).reduce((s, k) => s + k.subtotal, 0);
    expect(sum).toBe(computeCartTotal(cart));
  });
});

describe('addItemToCart', () => {
  it('appends a new item', () => {
    const next = addItemToCart([], burger, 1);
    expect(next).toEqual([{ item: burger, quantity: 1 }]);
  });

  it('increments quantity when the item already exists', () => {
    const start: CartItem[] = [{ item: burger, quantity: 1 }];
    const next = addItemToCart(start, burger, 2);
    expect(next).toEqual([{ item: burger, quantity: 3 }]);
  });

  it('does not mutate the original cart array', () => {
    const start: CartItem[] = [{ item: burger, quantity: 1 }];
    addItemToCart(start, burger, 1);
    expect(start[0].quantity).toBe(1);
  });
});
