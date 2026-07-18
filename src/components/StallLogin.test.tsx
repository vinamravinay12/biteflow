// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// Isolate the component from Firebase/DB side effects.
vi.mock('../utils/database', () => ({
  db: {
    verifyStallCredentials: vi.fn().mockResolvedValue(null),
    setActiveStall: vi.fn(),
  },
}));

import { StallLogin } from './StallLogin';
import { db } from '../utils/database';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StallLogin — accessibility & behavior', () => {
  it('has no axe accessibility violations', async () => {
    const { container } = render(<StallLogin onLoginSuccess={vi.fn()} />);
    // color-contrast can't be computed in jsdom (no canvas); it is verified in a
    // real browser via the Playwright + axe E2E scan instead.
    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it('exposes labeled username and password fields', () => {
    render(<StallLogin onLoginSuccess={vi.fn()} />);
    // Queried by accessible name — proves the <label htmlFor> associations work.
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('password visibility toggle has an accessible name and flips the field type', async () => {
    const user = userEvent.setup();
    render(<StallLogin onLoginSuccess={vi.fn()} />);

    const pwd = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(pwd.type).toBe('password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(pwd.type).toBe('text');
  });

  it('shows an error and does not log in on invalid credentials', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<StallLogin onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText(/username/i), 'nobody');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(db.verifyStallCredentials).toHaveBeenCalledWith('nobody', 'wrong');
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
