// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { SeatMapModal, type SeatMapModalProps } from './SeatMapModal';

expect.extend(axeMatchers);

const setup = (over: Partial<SeatMapModalProps> = {}) => {
  const props: SeatMapModalProps = {
    language: 'en',
    tempStandName: 'West Stand',
    tempSeatNumber: 'A-1',
    onSelectStand: vi.fn(),
    onSelectSeat: vi.fn(),
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  return { props, ...render(<SeatMapModal {...props} />) };
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SeatMapModal — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = setup();
    // color-contrast needs a real browser; verified separately.
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('is a labelled modal dialog', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('🏟️ Stadium Seating Map');
  });

  it('exposes the four stands as radios, with the active one checked', () => {
    setup({ tempStandName: 'North Stand' });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'North Stand' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'West Stand' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('marks the selected seat with aria-pressed', () => {
    setup({ tempSeatNumber: 'C-3' });
    expect(screen.getByRole('button', { name: 'Seat C-3' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Seat A-1' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});

describe('SeatMapModal — keyboard operability', () => {
  it('selects a stand with Enter (SVG paths are not natively focusable)', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    screen.getByRole('radio', { name: 'North Stand' }).focus();
    await user.keyboard('{Enter}');
    expect(props.onSelectStand).toHaveBeenCalledWith('North Stand');
  });

  it('selects a stand with Space', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    screen.getByRole('radio', { name: 'East Stand' }).focus();
    await user.keyboard(' ');
    expect(props.onSelectStand).toHaveBeenCalledWith('East Stand');
  });

  it('every stand is reachable by keyboard', () => {
    setup();
    for (const r of screen.getAllByRole('radio')) {
      expect(r).toHaveAttribute('tabindex', '0');
    }
  });
});

describe('SeatMapModal — interaction', () => {
  it('reports seat selection', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    await user.click(screen.getByRole('button', { name: 'Seat B-4' }));
    expect(props.onSelectSeat).toHaveBeenCalledWith('B-4');
  });

  it('confirms and closes via the action buttons', async () => {
    const user = userEvent.setup();
    const { props } = setup();
    await user.click(screen.getByRole('button', { name: 'Confirm Seat' }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('renders a 5x6 seat grid', () => {
    setup();
    // 30 seats + Cancel + Confirm + Close
    expect(screen.getAllByRole('button', { name: /^Seat / })).toHaveLength(30);
  });
});

describe('SeatMapModal — localization', () => {
  it('renders Spanish strings when language is es', () => {
    setup({ language: 'es' });
    expect(screen.getByRole('button', { name: 'Confirmar Asiento' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tribuna Norte' })).toBeInTheDocument();
  });

  it('renders Arabic strings when language is ar', () => {
    setup({ language: 'ar' });
    expect(screen.getByRole('radio', { name: 'المدرج الشمالي' })).toBeInTheDocument();
  });
});
