import { useState, useEffect } from 'react';
import { db } from './utils/database';
import type { Stall } from './types';
import { CustomerPortal } from './components/CustomerPortal';
import { StallLogin } from './components/StallLogin';
import { StallDashboard } from './components/StallDashboard';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { Store, User, Sparkles, Code, Shield } from 'lucide-react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'admin' | 'merchant' | 'customer'>('admin'); // Default to Platform Admin (Super Admin) as requested
  const [activeStall, setActiveStall] = useState<Stall | null>(null);

  // Initialize DB and load active session on mount
  useEffect(() => {
    db.initialize();
    const sessionStall = db.getActiveStall();
    if (sessionStall) {
      setActiveStall(sessionStall);
    }
  }, []);

  const handleStallLogin = (stall: Stall) => {
    setActiveStall(stall);
  };

  const handleStallLogout = () => {
    db.setActiveStall(null);
    setActiveStall(null);
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Dynamic Global Top Header */}
      <header 
        className="header" 
        style={{ 
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.1rem',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)'
          }}>
            B
          </div>
          <div>
            <h2 className="font-display" style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
              BiteFlow
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '-0.15rem' }}>
              Multi-Stall Food Ordering Hub
            </span>
          </div>
        </div>

        {/* View Segmented Toggle Controls (Three Views) */}
        <div 
          style={{ 
            display: 'flex', 
            background: 'rgba(15, 23, 42, 0.8)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '9999px', 
            padding: '0.25rem',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          <button
            onClick={() => setCurrentView('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: currentView === 'admin' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent', // Purple for super admin
              color: currentView === 'admin' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.5rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: currentView === 'admin' ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none'
            }}
          >
            <Shield size={12} /> Platform Admin
          </button>

          <button
            onClick={() => setCurrentView('merchant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: currentView === 'merchant' ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' : 'transparent', // Cyan for merchant
              color: currentView === 'merchant' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.5rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: currentView === 'merchant' ? '0 2px 8px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            <Store size={12} /> Stall Portal
          </button>
          
          <button
            onClick={() => setCurrentView('customer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: currentView === 'customer' ? 'linear-gradient(135deg, var(--accent-green), #047857)' : 'transparent', // Green for customer ordering
              color: currentView === 'customer' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.5rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: currentView === 'customer' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            <User size={12} /> Customer Hub
          </button>
        </div>

        {/* Challenge Info/Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span 
            className="badge" 
            style={{ 
              background: 'rgba(139, 92, 246, 0.12)', 
              color: '#a78bfa', 
              border: '1px solid rgba(139, 92, 246, 0.3)',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Code size={11} /> Sandbox Database
          </span>
        </div>
      </header>

      {/* Main View Portals */}
      <main className="main-content" style={{ padding: '2rem 1.5rem', flex: 1, maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {currentView === 'admin' ? (
          <SuperAdminPortal />
        ) : currentView === 'merchant' ? (
          activeStall ? (
            <StallDashboard stall={activeStall} onLogout={handleStallLogout} />
          ) : (
            <StallLogin onLoginSuccess={handleStallLogin} />
          )
        ) : (
          <CustomerPortal />
        )}
      </main>

      {/* Modern Footer */}
      <footer 
        style={{ 
          borderTop: '1px solid var(--border-color)', 
          padding: '1.5rem 2rem', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: 'auto',
          background: 'rgba(3, 7, 18, 0.4)'
        }}
      >
        <p>© 2026 BiteFlow Platforms. LocalStorage sandbox database active.</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Interactive Challenge Multi-Console <Sparkles size={12} color="var(--accent-orange)" />
        </p>
      </footer>
    </div>
  );
}

export default App;
