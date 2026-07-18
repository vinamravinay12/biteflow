import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db } from './utils/database';
import { ensureFirebaseAuth } from './utils/firebase';
import type { StallSession } from './types';
import { CustomerPortal } from './components/CustomerPortal';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

/**
 * Wraps a dynamic import so a failed chunk fetch self-heals.
 *
 * After a deploy, a browser holding a cached index.html requests asset chunks by
 * their OLD content hash — filenames that no longer exist — and the lazy route
 * would otherwise crash with "Failed to fetch dynamically imported module".
 * On the first such failure we force one hard reload to pick up the new
 * index.html (guarded by sessionStorage so we can never reload-loop).
 */
// Mirrors React.lazy's own signature (including its `any`) so the wrapper is a
// drop-in replacement and each component's prop types are preserved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      const key = 'biteflow_chunk_reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        // Never resolves — the reload takes over.
        return new Promise<{ default: T }>(() => {});
      }
      throw error; // already retried once; let the ErrorBoundary handle it
    })
  );
}

// The admin and merchant portals are separate routes that customers (the
// default landing) never open, so they are code-split into their own chunks
// and only fetched on demand — keeping the initial customer bundle smaller.
const StallLogin = lazyWithReload(() =>
  import('./components/StallLogin').then((m) => ({ default: m.StallLogin }))
);
const StallDashboard = lazyWithReload(() =>
  import('./components/StallDashboard').then((m) => ({ default: m.StallDashboard }))
);
const SuperAdminPortal = lazyWithReload(() =>
  import('./components/SuperAdminPortal').then((m) => ({ default: m.SuperAdminPortal }))
);

const RouteFallback = () => (
  <div
    role="status"
    aria-live="polite"
    style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
  >
    Loading…
  </div>
);

function App() {
  const [activeStall, setActiveStall] = useState<StallSession | null>(null);

  // Initialize DB and load active session on mount. In Firebase mode we must
  // establish an authenticated session first, because the Firestore rules deny
  // every unauthenticated read/write (including the initial seeding).
  useEffect(() => {
    (async () => {
      await ensureFirebaseAuth();
      await db.initialize();
    })();

    const sessionStall = db.getActiveStall();
    if (sessionStall) {
      setActiveStall(sessionStall);
    }
  }, []);

  const handleStallLogin = (stall: StallSession) => {
    setActiveStall(stall);
  };

  const handleStallLogout = () => {
    db.setActiveStall(null);
    setActiveStall(null);
  };

  return (
    <ErrorBoundary>
    <Router>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <main id="main-content">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Customer Portal (Default path /) */}
              <Route path="/" element={<CustomerPortal />} />

              {/* Super Admin Portal (Path /admin) */}
              <Route path="/admin" element={<SuperAdminPortal />} />

              {/* Stall Merchant Portal (Path /foodkiosk) */}
              <Route
                path="/foodkiosk"
                element={
                  activeStall ? (
                    <StallDashboard stall={activeStall} onLogout={handleStallLogout} />
                  ) : (
                    <StallLogin onLoginSuccess={handleStallLogin} />
                  )
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
