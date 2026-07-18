// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { CartDrawer, type CartDrawerProps } from './CartDrawer';
import type { CartItem, MenuItem, UserWallet } from '../../types';

expect.extend(axeMatchers);

const makeItem = (over: Partial<MenuItem> & { id: string }): MenuItem => ({
  stallId: 'barn',
  stallName: 'Burger Barn',
  name: 'Classic Burger',
  description: '',
  price: 8,
  imageUrl: '',
  category: 'Burgers',
  isAvailable: true,
  prepTime: 5,
  ...over,
});

const wallet = (balance: number): UserWallet => ({ uid: 'u1', balance, transactions: [] });

const setup = (over: Partial<CartDrawerProps> = {}) => {
  const cart: CartItem[] = over.cart ?? [{ item: makeItem({ id: 'b1' }), quantity: 2 }];
  const props: CartDrawerProps = {
    language: 'en',
    cart,
    cartTotal: 16,
    wallet: wallet(100),
    loadingFunds: false,
    loadAmount: null,
    standName: '',
    seatNumber: '',
    checkoutNotes: '',
    setStandName: vi.fn(),
    setSeatNumber: vi.fn(),
    setCheckoutNotes: vi.fn(),
    updateCartQty: vi.fn(),
    removeFromCart: vi.fn(),
    handleTopUp: vi.fn(),
    handleCheckout: vi.fn(),
    setShowCart: vi.fn(),
    setShowSeatMapModal: vi.fn(),
    setTempStandName: vi.fn(),
    setTempSeatNumber: vi.fn(),
    ...over,
  };
  return { props, ...render(<CartDrawer {...props} />) };
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CartDrawer — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = setup();
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('is a labelled modal dialog', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName();
  });
});

describe('CartDrawer — wallet', () => {
  it('shows the current balance', () => {
    setup({ wallet: wallet(42.5) });
    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('offers the four top-up amounts and reports the chosen one', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    for (const amt of [10, 20, 50, 100]) {
      expect(screen.getByRole('button', { name: `+$${amt}` })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: '+$50' }));
    expect(props.handleTopUp).toHaveBeenCalledWith(50);
  });

  it('disables top-up buttons while a top-up is processing', () => {
    setup({ loadingFunds: true, loadAmount: 20 });
    expect(screen.getByRole('button', { name: '+$20' })).toBeDisabled();
  });
});

describe('CartDrawer — cart contents', () => {
  it('renders an empty state when the cart has no items', () => {
    setup({ cart: [], cartTotal: 0 });
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });

  it('lists the cart items', () => {
    setup({ cart: [{ item: makeItem({ id: 'b1', name: 'Classic Burger' }), quantity: 2 }] });
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();
  });

  it('reports quantity changes and removal', async () => {
    const user = userEvent.setup();
    const { props } = setup({ cart: [{ item: makeItem({ id: 'b1' }), quantity: 2 }] });
    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(props.updateCartQty).toHaveBeenCalledWith('b1', 1);
    await user.click(screen.getByRole('button', { name: /decrease quantity/i }));
    expect(props.updateCartQty).toHaveBeenCalledWith('b1', -1);
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(props.removeFromCart).toHaveBeenCalledWith('b1');
  });
});

describe('CartDrawer — checkout guard', () => {
  it('blocks checkout when the balance is below the cart total', () => {
    setup({ wallet: wallet(5), cartTotal: 16 });
    const dialog = screen.getByRole('dialog');
    const checkout = within(dialog)
      .getAllByRole('button')
      .find((b) => (b as HTMLButtonElement).className.includes('btn-primary'));
    expect(checkout).toBeDisabled();
  });

  it('allows checkout when funds are sufficient', async () => {
    const user = userEvent.setup();
    const { props } = setup({ wallet: wallet(100), cartTotal: 16 });
    const dialog = screen.getByRole('dialog');
    const checkout = within(dialog)
      .getAllByRole('button')
      .find((b) => (b as HTMLButtonElement).className.includes('btn-primary'))!;
    expect(checkout).not.toBeDisabled();
    await user.click(checkout);
    expect(props.handleCheckout).toHaveBeenCalledOnce();
  });
});

describe('CartDrawer — closing', () => {
  it('closes from the header button', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(props.setShowCart).toHaveBeenCalledWith(false);
  });
});
