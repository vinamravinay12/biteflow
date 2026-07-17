import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { Stall, Match } from '../types';
import { FIFA_CITIES } from '../data/mockData';
import { encryptText, verifyHash, timingSafeEqual } from '../utils/crypto';
import { ADMIN_USERNAME, ADMIN_PASSWORD_HASH } from '../utils/constants';
import { useDocumentLanguage } from '../utils/useDocumentLanguage';
import { ADMIN_TRANSLATIONS, KIOSK_LOCALES, type KioskLanguageCode } from '../utils/translations';
import { 
  Store, Plus, Lock, Key, Eye, EyeOff, Trash2, 
  Check, RefreshCw, BarChart, UserCheck, AlertCircle, LogOut,
  Calendar, MapPin, Edit
} from 'lucide-react';

export const SuperAdminPortal: React.FC = () => {
  const [language, setLanguage] = useState<KioskLanguageCode>('en');
  useDocumentLanguage(language);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(
    localStorage.getItem('biteflow_super_admin_logged_in') === 'true'
  );
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');

    if (!ADMIN_PASSWORD_HASH) {
      // Fail closed: without a configured password digest there is no way to
      // authenticate, so never fall back to an implicit/hardcoded credential.
      setAdminLoginError(ADMIN_TRANSLATIONS[language].invalidCredentials);
      return;
    }

    setIsAuthenticating(true);
    try {
      const usernameOk = timingSafeEqual(adminUsername.trim().toLowerCase(), ADMIN_USERNAME);
      const passwordOk = await verifyHash(adminPassword.trim(), ADMIN_PASSWORD_HASH);
      if (usernameOk && passwordOk) {
        localStorage.setItem('biteflow_super_admin_logged_in', 'true');
        setIsAdminLoggedIn(true);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setAdminLoginError(ADMIN_TRANSLATIONS[language].invalidCredentials);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('biteflow_super_admin_logged_in');
    setIsAdminLoggedIn(false);
  };

  const [stalls, setStalls] = useState<Stall[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  // Section Toggle
  const [activeSection, setActiveSection] = useState<'stalls' | 'matches'>('stalls');
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingStallId, setEditingStallId] = useState<string | null>(null);

  // Form states
  const [stallName, setStallName] = useState('');
  const [description, setDescription] = useState('');
  const [stallCity, setStallCity] = useState(FIFA_CITIES[0]);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('🍔');
  const [bannerColor, setBannerColor] = useState('#ef4444');
  const [showPasswordMap, setShowPasswordMap] = useState<{ [key: string]: boolean }>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Match creation form states
  const [matchName, setMatchName] = useState('');
  const [matchSport] = useState('Football/Soccer');
  const [matchCity, setMatchCity] = useState(FIFA_CITIES[0]);
  const [matchDateTime, setMatchDateTime] = useState('');
  const [selectedStallIds, setSelectedStallIds] = useState<string[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

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

    const allOrders = await db.getAllOrders();
    setTotalOrders(allOrders.length);

    const allMatches = await db.getMatches();
    setMatches(allMatches);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Autofill username when Stall Name changes
  const handleStallNameChange = (val: string) => {
    setStallName(val);
    
    if (editingStallId) return;
    
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

  const startEditStall = async (stall: Stall) => {
    setEditingStallId(stall.id);
    setStallName(stall.name);
    setDescription(stall.description);
    setStallCity(stall.city || FIFA_CITIES[0]);
    setOwnerUsername(stall.ownerUsername);
    try {
      setOwnerPassword(await db.getStallPlainPassword(stall));
    } catch (e) {
      console.error('Failed to decrypt stall password for editing:', e);
      setOwnerPassword('');
    }
    setLogoEmoji(stall.logoUrl);
    setBannerColor(stall.bannerColor);
    setError('');
    setSuccess('');

    // Smooth scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditStall = () => {
    setEditingStallId(null);
    setStallName('');
    setDescription('');
    setStallCity(FIFA_CITIES[0]);
    setOwnerUsername('');
    setOwnerPassword('');
    setLogoEmoji('🍔');
    setBannerColor('#ef4444');
    setError('');
    setSuccess('');
  };

  const handleRegisterStall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!stallName.trim() || !description.trim() || !ownerUsername.trim() || !ownerPassword.trim() || !stallCity.trim()) {
      setError('All fields are required.');
      return;
    }

    const currentStalls = await db.getStalls();
    const exists = currentStalls.some(
      s => s.id !== editingStallId && s.ownerUsername.toLowerCase() === ownerUsername.trim().toLowerCase()
    );

    if (exists) {
      setError('Username already taken. Please customize the username.');
      return;
    }

    if (editingStallId) {
      // Edit Mode
      const existingStall = currentStalls.find(s => s.id === editingStallId);
      if (existingStall) {
        const updatedStall: Stall = {
          ...existingStall,
          name: stallName.trim(),
          description: description.trim(),
          ownerUsername: ownerUsername.trim().toLowerCase(),
          ownerPasswordEnc: await encryptText(ownerPassword.trim()),
          logoUrl: logoEmoji,
          bannerColor: bannerColor,
          city: stallCity.trim()
        };
        await db.updateStall(updatedStall);
        setDecryptedPasswords(prev => ({ ...prev, [updatedStall.id]: ownerPassword.trim() }));
      }
      setSuccess(`Successfully updated Stall "${stallName}"!`);
      setEditingStallId(null);
    } else {
      // Create Mode
      const newStall = await db.createStall({
        id: `stall-${Date.now()}`,
        name: stallName.trim(),
        description: description.trim(),
        ownerUsername: ownerUsername.trim().toLowerCase(),
        ownerPasswordPlain: ownerPassword.trim(),
        logoUrl: logoEmoji,
        bannerColor: bannerColor,
        rating: 5.0,
        active: true,
        city: stallCity.trim()
      });
      setDecryptedPasswords(prev => ({ ...prev, [newStall.id]: ownerPassword.trim() }));
      setSuccess(`Successfully created Stall "${stallName}"! Username and Password generated.`);
    }

    // Clear form
    setStallName('');
    setDescription('');
    setStallCity(FIFA_CITIES[0]);
    setOwnerUsername('');
    setOwnerPassword('');
    setLogoEmoji('🍔');
    setBannerColor('#ef4444');
    
    await loadData();
  };

  const handleDeleteStall = async (stallId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the stall "${name}"? This will delete all its configuration.`)) {
      await db.deleteStall(stallId);
      await loadData();
    }
  };

  const startEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setMatchName(match.name);
    setMatchCity(match.city);
    setMatchDateTime(match.dateTime);
    setSelectedStallIds(match.stallIds || []);
    setError('');
    setSuccess('');

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditMatch = () => {
    setEditingMatchId(null);
    setMatchName('');
    setMatchCity(FIFA_CITIES[0]);
    setMatchDateTime('');
    setSelectedStallIds([]);
    setError('');
    setSuccess('');
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!matchName.trim() || !matchSport.trim() || !matchCity.trim() || !matchDateTime) {
      setError('All fields are required to create a match.');
      return;
    }

    if (editingMatchId) {
      const updatedMatch: Match = {
        id: editingMatchId,
        name: matchName.trim(),
        sport: matchSport.trim(),
        city: matchCity.trim(),
        dateTime: matchDateTime,
        stallIds: selectedStallIds
      };
      await db.updateMatch(updatedMatch);
      setSuccess(`Successfully updated match "${matchName}"!`);
      setEditingMatchId(null);
    } else {
      const newMatch: Match = {
        id: `match-${Date.now()}`,
        name: matchName.trim(),
        sport: matchSport.trim(),
        city: matchCity.trim(),
        dateTime: matchDateTime,
        stallIds: selectedStallIds
      };
      await db.addMatch(newMatch);
      setSuccess(`Successfully scheduled match "${matchName}"!`);
    }

    // Reset match form
    setMatchName('');
    setMatchCity(FIFA_CITIES[0]);
    setMatchDateTime('');
    setSelectedStallIds([]);

    await loadData();
  };

  const handleDeleteMatch = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to cancel/delete the match "${name}"?`)) {
      await db.deleteMatch(id);
      await loadData();
    }
  };

  const togglePasswordVisibility = async (stall: Stall) => {
    const willShow = !showPasswordMap[stall.id];
    if (willShow && decryptedPasswords[stall.id] === undefined) {
      try {
        const plain = await db.getStallPlainPassword(stall);
        setDecryptedPasswords(prev => ({ ...prev, [stall.id]: plain }));
      } catch (e) {
        console.error('Failed to decrypt stall password:', e);
        return;
      }
    }
    setShowPasswordMap(prev => ({ ...prev, [stall.id]: willShow }));
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
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative' }}>
          
          {/* Language Selector in top right */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.3rem 0.5rem' }}>
              <span style={{ fontSize: '0.8rem' }}>🌐</span>
              <select
                value={language}
                aria-label="Select language"
                onChange={(e) => setLanguage(e.target.value as KioskLanguageCode)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.75rem', cursor: 'pointer' }}
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
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
            <h2 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              Biteflow
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              {ADMIN_TRANSLATIONS[language].loginSubtitle}
            </p>
          </div>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="admin-username-field" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {ADMIN_TRANSLATIONS[language].username}
              </label>
              <input
                id="admin-username-field"
                type="text"
                className="input-field"
                placeholder="admin"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="admin-password-field" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {ADMIN_TRANSLATIONS[language].password}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password-field"
                  type={showAdminPassword ? "text" : "password"}
                  className="input-field"
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showAdminPassword}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showAdminPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {adminLoginError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  ⚠️ {adminLoginError}
                </p>
              )}
            </div>

            <button type="submit" disabled={isAuthenticating} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)', opacity: isAuthenticating ? 0.7 : 1, cursor: isAuthenticating ? 'progress' : 'pointer' }}>
              {isAuthenticating ? ADMIN_TRANSLATIONS[language].authenticating : ADMIN_TRANSLATIONS[language].loginButton}
            </button>
          </form>
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
            {ADMIN_TRANSLATIONS[language].welcome} <span style={{ color: '#a78bfa', fontSize: '0.9rem', background: 'rgba(139,92,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(139,92,246,0.2)' }}>Superuser</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            {ADMIN_TRANSLATIONS[language].welcomeSubtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Admin Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.4rem 0.6rem' }}>
            <span style={{ fontSize: '0.9rem' }}>🌐</span>
            <select
              value={language}
              aria-label="Select language"
              onChange={(e) => setLanguage(e.target.value as KioskLanguageCode)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {Object.entries(KIOSK_LOCALES).map(([code, loc]) => (
                <option key={code} value={code} style={{ color: 'black' }}>
                  {loc.flag} {loc.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> {ADMIN_TRANSLATIONS[language].refreshDirectory}
          </button>
          <button onClick={handleAdminLogout} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={14} /> {ADMIN_TRANSLATIONS[language].logout}
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ADMIN_TRANSLATIONS[language].totalStalls}</span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ADMIN_TRANSLATIONS[language].totalDishes}</span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ADMIN_TRANSLATIONS[language].totalOrders}</span>
            <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
              {totalOrders}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0px', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => {
            setActiveSection('stalls');
            setError('');
            setSuccess('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: activeSection === 'stalls' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.75rem 1.25rem',
            borderBottom: activeSection === 'stalls' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Store size={18} /> {ADMIN_TRANSLATIONS[language].stallsTab}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('matches');
            setError('');
            setSuccess('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: activeSection === 'matches' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.75rem 1.25rem',
            borderBottom: activeSection === 'matches' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={18} /> {ADMIN_TRANSLATIONS[language].matchesTab}
        </button>
      </div>

      {activeSection === 'stalls' ? (
        /* ================= STALLS DIRECTORY SECTION ================= */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'flex-start' }} className="dashboard-grid">
          
          {/* Left Side: Create Stall & Credentials Generator */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingStallId ? <Edit size={18} color="var(--accent-cyan)" /> : <Plus size={18} color="#a78bfa" />}
              {editingStallId ? 'Edit Food Stall' : 'Create Stall & Credentials'}
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

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Stall Location / City
                </label>
                <select
                  className="input-field"
                  value={stallCity}
                  onChange={(e) => setStallCity(e.target.value)}
                >
                  {FIFA_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
                  Generated Merchant Credentials
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Merchant Username (Autofilled)
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '0.75rem',
                    background: editingStallId ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  }}
                >
                  {editingStallId ? 'Update Stall Details' : 'Register Stall & Save Credentials'}
                </button>
                {editingStallId && (
                  <button 
                    type="button" 
                    onClick={cancelEditStall} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.id.split('-')[1]}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={10} /> {s.city || 'Mumbai'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button 
                          onClick={() => toggleStallStatus(s.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: s.active ? 'var(--accent-green)' : 'var(--text-muted)' }}
                        >
                          {s.active ? 'Active' : 'Disabled'}
                        </button>
                        <button 
                          onClick={() => startEditStall(s)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.08)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Edit Stall Details"
                        >
                          <Edit size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteStall(s.id, s.name)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: 'var(--accent-red)' }}
                          title="Delete Stall"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
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
                            {isShowingPass ? (decryptedPasswords[s.id] || 'Decrypting…') : '••••••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(s)}
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
      ) : (
        /* ================= MATCHES & ROSTER MANAGEMENT SECTION ================= */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'flex-start' }} className="dashboard-grid">
          
          {/* Left Column: Create Match & Roster selector */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingMatchId ? <Edit size={18} color="var(--accent-cyan)" /> : <Plus size={18} color="#a78bfa" />}
              {editingMatchId ? 'Edit Match Details' : 'Schedule a Match/Game'}
            </h3>

            <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Match/Game Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. India vs Pakistan"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    City / Venue
                  </label>
                  <select
                    className="input-field"
                    value={matchCity}
                    onChange={(e) => {
                      setMatchCity(e.target.value);
                      setSelectedStallIds([]);
                    }}
                  >
                    {FIFA_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Match Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={matchDateTime}
                    onChange={(e) => setMatchDateTime(e.target.value)}
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Assign Stalls for this Match
                </label>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  Only showing active food stalls located in <strong>{matchCity || 'the specified city'}</strong>:
                </p>

                <div 
                  style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    padding: '0.75rem', 
                    background: 'rgba(0,0,0,0.2)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  {stalls.filter(s => s.active && (s.city || 'Mumbai').trim().toLowerCase() === matchCity.trim().toLowerCase()).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                      No active food stalls registered in "{matchCity}" yet. Add stalls for this city first!
                    </p>
                  ) : (
                    stalls.filter(s => s.active && (s.city || 'Mumbai').trim().toLowerCase() === matchCity.trim().toLowerCase()).map(s => {
                      const isChecked = selectedStallIds.includes(s.id);
                      return (
                        <label 
                          key={s.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem', 
                            padding: '0.4rem 0.6rem', 
                            background: isChecked ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStallIds(prev => [...prev, s.id]);
                              } else {
                                setSelectedStallIds(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '1.25rem' }}>{s.logoUrl}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 500, color: 'white' }}>{s.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{(s.description || '').substring(0, 45)}...</span>
                          </div>
                        </label>
                      );
                    })
                  )}
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '0.75rem',
                    background: editingMatchId ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  }}
                >
                  {editingMatchId ? 'Update Match Details' : 'Schedule Match & Lock Roster'}
                </button>
                {editingMatchId && (
                  <button 
                    type="button" 
                    onClick={cancelEditMatch} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Scheduled Matches Roster */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent-cyan)" /> Scheduled Games & Stalls Roster
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Check match city venues, game details, and verify which food court kiosks are active at each match.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matches.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '3rem 0' }}>
                  No matches scheduled yet.
                </p>
              ) : (
                matches.map(m => {
                  const matchDate = new Date(m.dateTime);
                  const formattedDate = isNaN(matchDate.getTime()) 
                    ? m.dateTime 
                    : matchDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' @ ' + 
                      matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={m.id}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        background: 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="badge badge-info" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>
                            {m.sport}
                          </span>
                          <h4 style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0.35rem 0 0.15rem', color: 'white' }}>{m.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} /> {m.city}</span>
                            <span>•</span>
                            <span>{formattedDate}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button 
                            onClick={() => startEditMatch(m)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.08)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Edit Match Details"
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(m.id, m.name)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                            title="Cancel Match"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                          Available Food Stalls ({m.stallIds?.length || 0}):
                        </span>
                        {(!m.stallIds || m.stallIds.length === 0) ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontStyle: 'italic' }}>
                            No food stalls assigned to this match.
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {m.stallIds.map(sid => {
                              const matchStall = stalls.find(s => s.id === sid);
                              if (!matchStall) return null;
                              return (
                                <span 
                                  key={sid}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                  }}
                                >
                                  <span>{matchStall.logoUrl}</span>
                                  <span>{matchStall.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
