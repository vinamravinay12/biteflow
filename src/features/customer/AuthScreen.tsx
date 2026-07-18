import React from 'react';
import { Eye, EyeOff, Info, Lock, Mail, User } from 'lucide-react';
import { USER_TRANSLATIONS, CUSTOMER_LOCALES, type LanguageCode } from '../../utils/translations';
import { auth } from '../../utils/firebase';

export interface AuthScreenProps {
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  /** 'login' shows the sign-in form, 'register' the sign-up form. */
  authMode: 'login' | 'register';
  setAuthMode: (m: 'login' | 'register') => void;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  authConfirmPassword: string;
  setAuthConfirmPassword: (v: string) => void;
  authDisplayName: string;
  setAuthDisplayName: (v: string) => void;
  /** Localized validation/auth failure message, empty when there is none. */
  authError: string;
  setAuthError: (v: string) => void;
  authLoading: boolean;
  showAuthPassword: boolean;
  setShowAuthPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  handleAuthSubmit: (e: React.FormEvent) => void;
}

/**
 * Unauthenticated entry point for the customer hub: sign-in / sign-up plus the
 * language switcher, so a visitor can pick their language before they have an
 * account. Purely presentational — all state and submission live in the parent.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
  language,
  setLanguage,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authConfirmPassword,
  setAuthConfirmPassword,
  authDisplayName,
  setAuthDisplayName,
  authError,
  setAuthError,
  authLoading,
  showAuthPassword,
  setShowAuthPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  handleAuthSubmit,
}) => {
  return (
    <div
      style={{ maxWidth: '460px', margin: '4rem auto 2rem', padding: '1.5rem', width: '100%' }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className="glass-panel-glow"
        style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative' }}
      >
        {/* Language Selector in top right */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(3,7,18,0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.3rem 0.5rem',
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>🌐</span>
            <select
              value={language}
              aria-label={USER_TRANSLATIONS[language].selectLanguage}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                outline: 'none',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {Object.entries(CUSTOMER_LOCALES).map(([code, loc]) => (
                <option key={code} value={code} style={{ color: 'black' }}>
                  {loc.flag} {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🍔</span>
          <h2
            className="font-display"
            style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'white' }}
          >
            Biteflow
          </h2>
        </div>

        {/* Tabs for Login / Register */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(3,7,18,0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            onClick={() => {
              setAuthMode('login');
              setAuthError('');
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background:
                authMode === 'login'
                  ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)'
                  : 'transparent',
              color: authMode === 'login' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {USER_TRANSLATIONS[language].signInTab}
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setAuthError('');
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background:
                authMode === 'register'
                  ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)'
                  : 'transparent',
              color: authMode === 'register' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {USER_TRANSLATIONS[language].signUpTab}
          </button>
        </div>

        {authError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Info size={14} />
            <span>{authError}</span>
          </div>
        )}

        <form
          onSubmit={handleAuthSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {authMode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label
                htmlFor="auth-display-name"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {USER_TRANSLATIONS[language].displayNameLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '12px',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  placeholder={USER_TRANSLATIONS[language].namePlaceholder}
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  style={{
                    paddingLeft: '2.5rem',
                    width: '100%',
                    background: 'rgba(3,7,18,0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.6rem 0.6rem 2.5rem',
                    color: 'white',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="auth-email"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {USER_TRANSLATIONS[language].emailLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="name@campus.edu"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={{
                  paddingLeft: '2.5rem',
                  width: '100%',
                  background: 'rgba(3,7,18,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.6rem 0.6rem 2.5rem',
                  color: 'white',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label
              htmlFor="auth-password"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {USER_TRANSLATIONS[language].passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="auth-password"
                type={showAuthPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={{
                  paddingLeft: '2.5rem',
                  paddingRight: '2.5rem',
                  width: '100%',
                  background: 'rgba(3,7,18,0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 2.5rem 0.6rem 2.5rem',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowAuthPassword(!showAuthPassword)}
                aria-label={
                  showAuthPassword
                    ? USER_TRANSLATIONS[language].hidePassword
                    : USER_TRANSLATIONS[language].showPassword
                }
                aria-pressed={showAuthPassword}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // WCAG 2.5.8: interactive targets need >=24x24 CSS px.
                  minWidth: '24px',
                  minHeight: '24px',
                }}
              >
                {showAuthPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {authMode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label
                htmlFor="auth-confirm-password"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {USER_TRANSLATIONS[language].confirmPasswordLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '12px',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  style={{
                    paddingLeft: '2.5rem',
                    paddingRight: '2.5rem',
                    width: '100%',
                    background: 'rgba(3,7,18,0.4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.6rem 2.5rem 0.6rem 2.5rem',
                    color: 'white',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? USER_TRANSLATIONS[language].hidePassword
                      : USER_TRANSLATIONS[language].showPassword
                  }
                  aria-pressed={showConfirmPassword}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // WCAG 2.5.8: interactive targets need >=24x24 CSS px.
                    minWidth: '24px',
                    minHeight: '24px',
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontWeight: 600,
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {authLoading ? (
              <span>{USER_TRANSLATIONS[language].loading}</span>
            ) : (
              <span>
                {authMode === 'login'
                  ? USER_TRANSLATIONS[language].signInTab
                  : USER_TRANSLATIONS[language].signUpTab}
              </span>
            )}
          </button>
        </form>

        {!auth && (
          <div
            style={{
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {USER_TRANSLATIONS[language].tipText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
