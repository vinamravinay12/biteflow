import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { Stall } from '../types';
import { 
  Store, Plus, Lock, Key, Eye, EyeOff, Trash2, 
  Check, RefreshCw, BarChart, UserCheck, AlertCircle, LogOut
} from 'lucide-react';

export const SuperAdminPortal: React.FC = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    localStorage.getItem('biteflow_super_admin_logged_in') === 'true'
  );
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');

    if (adminUsername.trim().toLowerCase() === 'admin' && adminPassword.trim() === 'biteflow-admin-2026') {
      localStorage.setItem('biteflow_super_admin_logged_in', 'true');
      setIsAdminLoggedIn(true);
      setAdminUsername('');
      setAdminPassword('');
    } else {
      setAdminLoginError('Invalid Platform Admin credentials.');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('biteflow_super_admin_logged_in');
    setIsAdminLoggedIn(false);
  };

  const [stalls, setStalls] = useState<Stall[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  // Form states
  const [stallName, setStallName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('🍔');
  const [bannerColor, setBannerColor] = useState('#ef4444');
  const [showPasswordMap, setShowPasswordMap] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
  ];

  const emojis = ['🍔', '🍕', '🌮', '🥢', '🍦', '🍩', '🥗', '☕', '🥤', '🍛', '🥞', '🥐'];

  const loadData = async () => {
    const allStalls = await db.getStalls();
    setStalls(allStalls);

    const allItems = await db.getMenuItems();
    setTotalItems(allItems.length);

    const allOrders = await db.getOrders();
    setTotalOrders(allOrders.length);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Autofill username when Stall Name changes
  const handleStallNameChange = (val: string) => {
    setStallName(val);
    
    const words = val
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.toLowerCase());
    
    if (words.length === 0) {
      setOwnerUsername('');
    } else if (words.length === 1) {
      setOwnerUsername(words[0]);
    } else if (words.length === 2) {
      setOwnerUsername(`${words[0]}_${words[1]}`);
    } else {
      // 3 or more words -> firstword_remainingwords
      const firstWord = words[0];
      const remainingWordsCombined = words.slice(1).join('');
      setOwnerUsername(`${firstWord}_${remainingWordsCombined}`);
    }
  };

  // Generate a random readable password
  const generatePassword = () => {
    const adjectives = ['crispy', 'spicy', 'tasty', 'sweet', 'flaming', 'golden', 'fresh', 'smoky'];
    const nouns = ['kitchen', 'grill', 'wok', 'bite', 'bowl', 'slice', 'chef', 'spot'];
    const num = Math.floor(100 + Math.random() * 900);
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    setOwnerPassword(`${adj}-${noun}-${num}`);
  };

  const handleRegisterStall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!stallName.trim() || !description.trim() || !ownerUsername.trim() || !ownerPassword.trim()) {
      setError('All fields are required.');
      return;
    }

    const currentStalls = await db.getStalls();
    const exists = currentStalls.some(
      s => s.ownerUsername.toLowerCase() === ownerUsername.trim().toLowerCase()
    );

    if (exists) {
      setError('Username already taken. Please customize the username.');
      return;
    }

    const newStall: Stall = {
      id: `stall-${Date.now()}`,
      name: stallName.trim(),
      description: description.trim(),
      ownerUsername: ownerUsername.trim().toLowerCase(),
      ownerPassword: ownerPassword.trim(),
      logoUrl: logoEmoji,
      bannerColor: bannerColor,
      rating: 5.0,
      active: true
    };

    await db.addStall(newStall);
    setSuccess(`Successfully created Stall "${stallName}"! Username and Password generated.`);
    
    // Clear form
    setStallName('');
    setDescription('');
    setOwnerUsername('');
    setOwnerPassword('');
    
    await loadData();
  };

  const handleDeleteStall = async (stallId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the stall "${name}"? This will delete all its configuration.`)) {
      const allStalls = await db.getStalls();
      const updated = allStalls.filter(s => s.id !== stallId);
      await db.saveStalls(updated);
      await loadData();
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleStallStatus = async (stallId: string) => {
    const allStalls = await db.getStalls();
    const updated = allStalls.map(s => {
      if (s.id === stallId) {
        return { ...s, active: !s.active };
      }
      return s;
    });
    await db.saveStalls(updated);
    await loadData();
  };

  if (!isAdminLoggedIn) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto 2rem', padding: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
            <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              Platform Admin Login
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Authorize to access platform stats, stalls credentials directory, and configure merchants.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Admin Username
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="admin"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Admin Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              {adminLoginError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  ⚠️ {adminLoginError}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}>
              Sign In as Superuser
            </button>
          </form>

          <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sandbox Credentials</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Username:</span> <code style={{ color: '#a78bfa', fontWeight: 600 }}>admin</code></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Password:</span> <code style={{ color: 'var(--text-primary)' }}>biteflow-admin-2026</code></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', animation: 'slide-up 0.4s ease' }}>
      
      {/* Top Welcome Panel */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.05))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '20px',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div>
          <span style={{ fontSize: '2.5rem' }}>🛡️</span>
          <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Platform Admin Console <span style={{ color: '#a78bfa', fontSize: '0.9rem', background: 'rgba(139,92,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.2)' }}>Superuser</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Create food stalls, generate credentials, and manage merchants.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Refresh Directory
          </button>
          <button onClick={handleAdminLogout} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Platform Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
            <Store size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Food Stalls</span>
            <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {stalls.length}
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
            <BarChart size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total System Menu Items</span>
            <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {totalItems}
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>System Orders Tracked</span>
            <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {totalOrders}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Core Layout: Register on left, Directory list on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'flex-start' }} className="dashboard-grid">
        
        {/* Left Side: Create Stall & Credentials Generator */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} color="#a78bfa" /> Create Stall & Credentials
          </h3>

          <form onSubmit={handleRegisterStall} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Food Stall Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Waffle Wonders"
                value={stallName}
                onChange={(e) => handleStallNameChange(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Description
              </label>
              <textarea
                className="input-field"
                placeholder="Brief description of food offerings..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Logo Emoji
                </label>
                <select
                  className="input-field"
                  value={logoEmoji}
                  onChange={(e) => setLogoEmoji(e.target.value)}
                  style={{ fontSize: '1.2rem', padding: '0.55rem' }}
                >
                  {emojis.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Branding Color
                </label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setBannerColor(c.value)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: bannerColor === c.value ? '2px solid white' : 'none',
                        cursor: 'pointer',
                        boxShadow: bannerColor === c.value ? '0 0 8px ' + c.value : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Credentials Section */}
            <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔑 Credentials Generator
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Generated Stall Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="waffle-wonders"
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value.toLowerCase())}
                      style={{ paddingLeft: '2.25rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Merchant Password
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Lock size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Click Generate ➜"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        style={{ paddingLeft: '2.25rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={generatePassword}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      Generate Pass
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.85rem', alignItems: 'center' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--accent-green)', fontSize: '0.85rem', alignItems: 'center' }}>
                <Check size={14} />
                <span>{success}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Register Stall & Save Credentials
            </button>
          </form>
        </div>

        {/* Right Side: Directory and Credentials Sharing Center */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={18} color="var(--accent-cyan)" /> Stalls Credentials & Status Directory
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Review merchant accounts, copy generated passwords to share with stall owners, or manage activation status.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stalls.map(s => {
              const isShowingPass = showPasswordMap[s.id] || false;
              return (
                <div 
                  key={s.id} 
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    padding: '1rem',
                    background: s.active ? 'rgba(255,255,255,0.01)' : 'rgba(239, 68, 68, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {/* Top line details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2rem' }}>{s.logoUrl}</span>
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{s.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.id.split('-')[1]}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        onClick={() => toggleStallStatus(s.id)}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '0.25rem 0.5rem', 
                          fontSize: '0.7rem', 
                          color: s.active ? 'var(--accent-green)' : 'var(--accent-red)',
                          borderColor: s.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px'
                        }}
                      >
                        {s.active ? 'Active' : 'Suspended'}
                      </button>
                      <button 
                        onClick={() => handleDeleteStall(s.id, s.name)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                        title="Delete Stall"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
                    {s.description}
                  </p>

                  {/* Credentials details boxes */}
                  <div 
                    style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(15, 23, 42, 0.6)', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Stall Username:</span>
                      <code style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontFamily: 'monospace' }}>{s.ownerUsername}</code>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Merchant Password:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {isShowingPass ? s.ownerPassword : '••••••••••••'}
                        </code>
                        <button 
                          type="button"
                          onClick={() => togglePasswordVisibility(s.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem', display: 'flex' }}
                          title={isShowingPass ? 'Hide password' : 'Show password'}
                        >
                          {isShowingPass ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
