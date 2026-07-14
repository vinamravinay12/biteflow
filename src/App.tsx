import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { db } from './utils/database';
import type { Stall } from './types';
import { CustomerPortal } from './components/CustomerPortal';
import { StallLogin } from './components/StallLogin';
import { StallDashboard } from './components/StallDashboard';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import './App.css';

function App() {
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
    <Router>
      <div className="app-container" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
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
      </div>
    </Router>
  );
}

export default App;
