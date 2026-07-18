import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { db } from '../utils/database';
import type { Stall, StallSession } from '../types';
import { KIOSK_TRANSLATIONS, KIOSK_LOCALES, type KioskLanguageCode } from '../utils/translations';
import { useDocumentLanguage } from '../utils/useDocumentLanguage';

interface StallLoginProps {
  onLoginSuccess: (stall: StallSession) => void;
}

const toSession = (stall: Stall): StallSession => {
  const { ownerPasswordEnc: _omit, ...session } = stall;
  return session;
};

export const StallLogin: React.FC<StallLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [language, setLanguage] = useState<KioskLanguageCode>('en');
  useDocumentLanguage(language);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!username.trim() || !password.trim()) {
      setLoginError(KIOSK_TRANSLATIONS[language].requiredError);
      return;
    }

    const stall = await db.verifyStallCredentials(username.trim(), password.trim());

    if (stall) {
      const session = toSession(stall);
      db.setActiveStall(session);
      onLoginSuccess(session);
    } else {
      setLoginError(KIOSK_TRANSLATIONS[language].invalidCredentialsError);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '4rem auto 2rem', padding: '1.5rem' }}>
      <div
        className="glass-panel"
        style={{
          padding: '2.5rem',
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
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
              aria-label={KIOSK_TRANSLATIONS[language].selectLanguage}
              onChange={(e) => setLanguage(e.target.value as KioskLanguageCode)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                outline: 'none',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {Object.entries(KIOSK_LOCALES).map(([code, loc]) => (
                <option key={code} value={code} style={{ color: 'black' }}>
                  {loc.flag} {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.5rem' }}>🏪</span>
          <h2
            className="font-display"
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
            }}
          >
            {KIOSK_TRANSLATIONS[language].merchantPortalTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {KIOSK_TRANSLATIONS[language].merchantPortalSubtitle}
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <div>
            <label
              htmlFor="kiosk-username-field"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              {KIOSK_TRANSLATIONS[language].usernameLabel}
            </label>
            <input
              id="kiosk-username-field"
              type="text"
              className="input-field"
              placeholder={KIOSK_TRANSLATIONS[language].usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ textTransform: 'lowercase' }}
            />
          </div>

          <div>
            <label
              htmlFor="kiosk-password-field"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              {KIOSK_TRANSLATIONS[language].passwordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="kiosk-password-field"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? KIOSK_TRANSLATIONS[language].hidePassword
                    : KIOSK_TRANSLATIONS[language].showPassword
                }
                aria-pressed={showPassword}
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
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            {loginError && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                ⚠️ {loginError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {KIOSK_TRANSLATIONS[language].loginButton}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            marginTop: '1.5rem',
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {KIOSK_TRANSLATIONS[language].merchantTip}
          </p>
        </div>
      </div>
    </div>
  );
};
