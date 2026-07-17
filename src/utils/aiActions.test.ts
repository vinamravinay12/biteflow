import { describe, it, expect } from 'vitest';
import { parseAiResponse, getMatchingItems } from './aiActions';
import type { MenuItem } from '../types';

// Minimal MenuItem factory so tests declare only the fields they care about.
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

const MENU: MenuItem[] = [
  makeItem({ id: 'burger-1', name: 'Classic Burger', stallName: 'Burger Barn', category: 'Burgers', price: 8 }),
  makeItem({ id: 'taco-1', name: 'Street Taco', stallName: 'Taco Loco', category: 'Mexican', price: 4 }),
  makeItem({ id: 'gelato-1', name: 'Vanilla Gelato', stallName: 'Sweet Retreat', category: 'Dessert', price: 3 }),
];

describe('parseAiResponse — control-tag parsing', () => {
  it('strips all control tags from user-facing text', () => {
    const raw = 'Added your food! [ADD_TO_CART: [{"id":"burger-1","quantity":2}]] [SHOW_CHECKOUT]';
    const { text } = parseAiResponse(raw, MENU);
    expect(text).toBe('Added your food!');
    expect(text).not.toMatch(/ADD_TO_CART|SHOW_CHECKOUT|ITEMS/);
  });

  it('extracts valid cart additions that resolve to real menu items', () => {
    const raw = 'Done [ADD_TO_CART: [{"id":"burger-1","quantity":2},{"id":"taco-1","quantity":1}]]';
    const { cartAdditions } = parseAiResponse(raw, MENU);
    expect(cartAdditions).toEqual([
      { id: 'burger-1', quantity: 2 },
      { id: 'taco-1', quantity: 1 },
    ]);
  });

  it('drops additions referencing unknown item ids (no injection)', () => {
    const raw = '[ADD_TO_CART: [{"id":"burger-1","quantity":1},{"id":"HACKED","quantity":99}]]';
    const { cartAdditions } = parseAiResponse(raw, MENU);
    expect(cartAdditions).toEqual([{ id: 'burger-1', quantity: 1 }]);
  });

  it('defaults missing/invalid quantity to 1 and floors/guards bad numbers', () => {
    const raw = '[ADD_TO_CART: [{"id":"burger-1"},{"id":"taco-1","quantity":0},{"id":"gelato-1","quantity":2.9}]]';
    const { cartAdditions } = parseAiResponse(raw, MENU);
    expect(cartAdditions).toEqual([
      { id: 'burger-1', quantity: 1 },
      { id: 'taco-1', quantity: 1 },
      { id: 'gelato-1', quantity: 2 },
    ]);
  });

  it('resolves [ITEMS: ...] tags to suggestion cards', () => {
    const raw = 'Here are options [ITEMS: ["burger-1","gelato-1"]]';
    const { suggestedItems, text } = parseAiResponse(raw, MENU);
    expect(suggestedItems.map(i => i.id)).toEqual(['burger-1', 'gelato-1']);
    expect(text).toBe('Here are options');
  });

  it('detects [SHOW_CHECKOUT] and removes it', () => {
    const { showCheckout } = parseAiResponse('Ready to pay? [SHOW_CHECKOUT]', MENU);
    expect(showCheckout).toBe(true);
  });

  it('returns no actions when there are no tags', () => {
    const { cartAdditions, suggestedItems, showCheckout, text } = parseAiResponse('Just chatting.', MENU);
    expect(cartAdditions).toEqual([]);
    expect(suggestedItems).toEqual([]);
    expect(showCheckout).toBe(false);
    expect(text).toBe('Just chatting.');
  });

  it('never throws on malformed JSON in a tag; degrades to no additions', () => {
    const raw = 'oops [ADD_TO_CART: [{"id": burger-1 broken]]';
    expect(() => parseAiResponse(raw, MENU)).not.toThrow();
    expect(parseAiResponse(raw, MENU).cartAdditions).toEqual([]);
  });

  it('handles empty / nullish input safely', () => {
    expect(parseAiResponse('', MENU).text).toBe('');
    // @ts-expect-error exercising defensive runtime path
    expect(() => parseAiResponse(undefined, MENU)).not.toThrow();
  });
});

describe('getMatchingItems — offline fallback NLU', () => {
  it('matches burgers by keyword', () => {
    const res = getMatchingItems('I want a burger', MENU);
    expect(res.map(i => i.id)).toContain('burger-1');
  });

  it('matches tacos via the Mexican category', () => {
    const res = getMatchingItems('any tacos?', MENU);
    expect(res.map(i => i.id)).toContain('taco-1');
  });

  it('matches desserts by sweet keywords', () => {
    const res = getMatchingItems('something sweet like gelato', MENU);
    expect(res.map(i => i.id)).toContain('gelato-1');
  });

  it('returns empty for non-food gibberish', () => {
    expect(getMatchingItems('zzzqqq', MENU)).toEqual([]);
  });
});
