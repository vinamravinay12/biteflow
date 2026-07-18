import React from 'react';
import { X } from 'lucide-react';
import { USER_TRANSLATIONS, type LanguageCode } from '../../utils/translations';

/** Stand sections, in the order they are drawn around the pitch. */
const STANDS = [
  {
    id: 'North Stand',
    labelKey: 'northStand',
    shortKey: 'northShort',
    d: 'M 100 100 L 20 20 A 113.14 113.14 0 0 1 180 20 Z',
    activeFill: 'rgba(6, 182, 212, 0.25)',
    activeStroke: 'var(--accent-cyan)',
    position: { top: '10px' },
    dot: '🔵',
  },
  {
    id: 'East Stand',
    labelKey: 'eastStand',
    shortKey: 'eastShort',
    d: 'M 100 100 L 180 20 A 113.14 113.14 0 0 1 180 180 Z',
    activeFill: 'rgba(16, 185, 129, 0.2)',
    activeStroke: 'var(--accent-green)',
    position: { right: '10px' },
    dot: '🟢',
  },
  {
    id: 'South Stand',
    labelKey: 'southStand',
    shortKey: 'southShort',
    d: 'M 100 100 L 180 180 A 113.14 113.14 0 0 1 20 180 Z',
    activeFill: 'rgba(249, 115, 22, 0.2)',
    activeStroke: 'var(--accent-orange)',
    position: { bottom: '10px' },
    dot: '🟡',
  },
  {
    id: 'West Stand',
    labelKey: 'westStand',
    shortKey: 'westShort',
    d: 'M 100 100 L 20 180 A 113.14 113.14 0 0 1 20 20 Z',
    activeFill: 'rgba(139, 92, 246, 0.2)',
    activeStroke: 'var(--accent-purple)',
    position: { left: '10px' },
    dot: '🟣',
  },
] as const;

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'] as const;
const SEAT_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export interface SeatMapModalProps {
  /** Active UI language, used for every visible string. */
  language: LanguageCode;
  /** Stand currently highlighted inside the modal (not yet confirmed). */
  tempStandName: string;
  /** Seat currently highlighted inside the modal (not yet confirmed). */
  tempSeatNumber: string;
  onSelectStand: (stand: string) => void;
  onSelectSeat: (seat: string) => void;
  /** Commit the temporary selection to the order. */
  onConfirm: () => void;
  /** Dismiss without committing. */
  onClose: () => void;
}

/**
 * Interactive stadium seat picker.
 *
 * Accessibility notes:
 * - The SVG wedges are exposed as a `radiogroup` of `radio`s so the map is
 *   fully keyboard-operable (Tab to reach, Enter/Space to select) — an SVG
 *   `<path onClick>` alone is mouse-only and invisible to assistive tech.
 * - The compass overlay duplicates those labels visually, so it is
 *   `aria-hidden` to avoid announcing each stand twice.
 * - The dialog is labelled by its heading and closes on Escape (owned by the
 *   parent, which knows when the modal is open).
 */
export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  language,
  tempStandName,
  tempSeatNumber,
  onSelectStand,
  onSelectSeat,
  onConfirm,
  onClose,
}) => {
  const t = USER_TRANSLATIONS[language];

  /** Enter/Space activation for the SVG wedges. */
  const handleStandKey = (e: React.KeyboardEvent, stand: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectStand(stand);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-map-title"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2rem',
          borderRadius: '24px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          border: '1px solid var(--border-color-glow)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3
            id="seat-map-title"
            className="font-display"
            style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🏟️ {t.seatMapTitle}
          </h3>
          <button
            onClick={onClose}
            aria-label={t.closeSeatMap}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {t.seatMapInstruction}
        </p>

        {/* Stadium ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', position: 'relative' }}>
          <svg
            width="180"
            height="180"
            viewBox="0 0 200 200"
            style={{ transform: 'rotate(-45deg)' }}
            role="radiogroup"
            aria-label={t.stadiumStands}
          >
            {/* Pitch — decorative */}
            <rect x="75" y="75" width="50" height="50" fill="rgba(16, 185, 129, 0.15)" stroke="var(--accent-green)" strokeWidth="2" rx="4" aria-hidden="true" />
            <circle cx="100" cy="100" r="12" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" aria-hidden="true" />

            {STANDS.map((stand) => {
              const active = tempStandName === stand.id;
              return (
                <path
                  key={stand.id}
                  d={stand.d}
                  fill={active ? stand.activeFill : 'rgba(255,255,255,0.03)'}
                  stroke={active ? stand.activeStroke : 'var(--border-color)'}
                  strokeWidth="2"
                  cursor="pointer"
                  role="radio"
                  tabIndex={0}
                  aria-label={t[stand.labelKey]}
                  aria-checked={active}
                  onClick={() => onSelectStand(stand.id)}
                  onKeyDown={(e) => handleStandKey(e, stand.id)}
                  style={{ transition: 'all 0.2s' }}
                />
              );
            })}
          </svg>

          {/* Visual compass — duplicates the radio labels, so hidden from AT */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            {STANDS.map((stand) => (
              <span key={stand.id} style={{ position: 'absolute', ...stand.position }}>
                {t[stand.shortKey]} {stand.dot}
              </span>
            ))}
          </div>
        </div>

        {/* Active stand */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'inline-block', marginBottom: '1.25rem' }}>
          {t.seatMapActiveSector} <strong style={{ color: 'var(--accent-cyan)' }}>{tempStandName}</strong>
        </div>

        {/* Seat grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {SEAT_ROWS.map((row) => (
            <div key={row} style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
              <span aria-hidden="true" style={{ width: '20px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {row}
              </span>
              {SEAT_NUMBERS.map((num) => {
                const seatId = `${row}-${num}`;
                const isSelected = tempSeatNumber === seatId;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onSelectSeat(seatId)}
                    aria-label={`${t.seatAria} ${seatId}`}
                    aria-pressed={isSelected}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.1s',
                    }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Current selection */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{t.seatMapSelected}</span>
          <strong style={{ color: 'white' }}>
            {tempStandName} ({tempSeatNumber})
          </strong>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem 1rem' }}>
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.6rem 1rem', background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }}
          >
            {t.confirmSeat}
          </button>
        </div>
      </div>
    </div>
  );
};
