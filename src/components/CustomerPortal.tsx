import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { Stall, MenuItem, Order, UserWallet, OrderItem } from '../types';
import { 
  Search, ShoppingBag, Wallet, Plus, Minus, Trash2, Clock, 
  History, Sparkles, ChevronRight, Info, CheckCircle, Store, X
  // LogOut, User, Lock, Mail
} from 'lucide-react';
// import { auth } from '../utils/firebase';
// import { 
//   onAuthStateChanged, signInWithEmailAndPassword, 
//   createUserWithEmailAndPassword, signOut, updateProfile 
// } from 'firebase/auth';

interface CustomerPortalProps {
  onBackToAdmin?: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = () => {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [wallet, setWallet] = useState<UserWallet>({ username: 'Alex Mercer', balance: 0, transactions: [] });
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStallId, setSelectedStallId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart state
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [showCart, setShowCart] = useState(false);

  // Top Up state
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadAmount, setLoadAmount] = useState<number | null>(null);

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{ id: string; total: number } | null>(null);

  // Categories list
  const categories = ['all', 'Burgers', 'Mexican', 'Noodles', 'Rice Bowls', 'Mains', 'Sides', 'Dessert', 'Beverage'];

  // Load database values
  const loadData = async () => {
    try {
      const [fetchedStalls, fetchedItems, fetchedWallet, allOrders] = await Promise.all([
        db.getStalls(),
        db.getMenuItems(),
        db.getWallet(),
        db.getOrders()
      ]);

      setStalls(fetchedStalls);
      setMenuItems(fetchedItems);
      setWallet(fetchedWallet);
      
      const customerName = db.getCustomerName();
      const customerOrders = allOrders.filter(o => o.customerName === customerName);
      setActiveOrders(customerOrders);
    } catch (e) {
      console.error("Failed to load customer hub data:", e);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for order status updates from the Stall Admin side
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart(prevCart => {
      const existing = prevCart.find(c => c.item.id === item.id);
      if (existing) {
        return prevCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prevCart, { item, quantity: 1 }];
    });
    // Open sidebar automatically
    setShowCart(true);
  };

  const updateCartQty = (itemId: string, amount: number) => {
    setCart(prevCart => {
      return prevCart.map(c => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + amount;
          return newQty > 0 ? { ...c, quantity: newQty } : null;
        }
        return c;
      }).filter(Boolean) as { item: MenuItem; quantity: number }[];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(c => c.item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);

  // Top Up Wallet
  const handleTopUp = async (amount: number) => {
    setLoadingFunds(true);
    setLoadAmount(amount);
    
    // Simulate payment processing delay
    setTimeout(async () => {
      const updatedWallet = await db.loadWalletFunds(amount);
      setWallet(updatedWallet);
      setLoadingFunds(false);
      setLoadAmount(null);
    }, 1200);
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (wallet.balance < cartTotal) {
      alert('Insufficient wallet balance! Please add funds to your wallet.');
      return;
    }

    const customerName = db.getCustomerName();
    const orderTime = new Date().toISOString();
    
    // Group cart items by stallId so we place separate orders for each stall
    const itemsByStall: { [stallId: string]: { stallName: string; items: OrderItem[] } } = {};
    
    cart.forEach(({ item, quantity }) => {
      if (!itemsByStall[item.stallId]) {
        itemsByStall[item.stallId] = {
          stallName: item.stallName,
          items: []
        };
      }
      itemsByStall[item.stallId].items.push({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity,
        stallId: item.stallId
      });
    });

    // Create suborders
    const newOrders: Order[] = Object.keys(itemsByStall).map(stallId => {
      const stallData = itemsByStall[stallId];
      const subtotal = stallData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      return {
        id: `ord-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`,
        stallId,
        stallName: stallData.stallName,
        customerName,
        items: stallData.items,
        totalAmount: subtotal,
        status: 'pending',
        orderTime,
        notes: checkoutNotes.trim() || undefined
      };
    });

    // Save orders in database
    await db.addOrders(newOrders);

    // Deduct wallet funds
    const description = `Multi-stall food purchase (${newOrders.map(o => o.stallName).join(', ')})`;
    await db.deductWalletFunds(cartTotal, description);

    // Record last order for success modal
    setLastOrderDetails({
      id: newOrders.map(o => o.id.split('-')[1]).join(', #'),
      total: cartTotal
    });

    // Reset cart states
    setCart([]);
    setCheckoutNotes('');
    setShowCart(false);
    setShowSuccessModal(true);
    
    // Refresh local lists
    await loadData();
  };

  // Filter items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStall = selectedStallId === 'all' || item.stallId === selectedStallId;
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesStall && matchesCategory;
  });

  // Helper for order progress bar
  const getProgressPercentage = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 25;
      case 'preparing': return 50;
      case 'ready': return 75;
      case 'completed': return 100;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', animation: 'slide-up 0.4s ease' }}>
      
      {/* Top Welcome Panel */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.05))',
          border: '1px solid var(--border-color-glow)',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)',
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
          <span style={{ fontSize: '2.5rem' }}>🍔🌮🍟</span>
          <h1 className="font-display" style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Campus Food Court <span style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', background: 'rgba(6,182,212,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>Simulator</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Welcome back, <strong>{wallet.username}</strong>! Order from multiple food stalls in a single transaction.
          </p>
        </div>

        {/* Quick Wallet Summary widget */}
        <button 
          onClick={() => setShowCart(true)} 
          className="glass-panel" 
          style={{ 
            padding: '1rem 1.5rem', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem',
            textAlign: 'left',
            cursor: 'pointer',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(3, 7, 18, 0.6)'
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
            <Wallet size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Wallet</span>
            <p className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>
              ${wallet.balance.toFixed(2)}
            </p>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Left side: browsing & active tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Orders Status Tracker */}
          {activeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
            <div className="glass-panel-glow" style={{ padding: '1.5rem', border: '1px solid var(--border-color-glow)' }}>
              <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--accent-cyan)" /> Live Order Progress
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeOrders
                  .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
                  .map(order => (
                    <div 
                      key={order.id} 
                      style={{ 
                        background: 'rgba(3, 7, 18, 0.4)', 
                        padding: '1.25rem', 
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        animation: 'pulse-soft 5s infinite ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{order.stallName}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Order #{order.id.split('-')[1]}</span>
                        </div>
                        <span className={`badge ${
                          order.status === 'pending' ? 'badge-warning' :
                          order.status === 'preparing' ? 'badge-info' :
                          'badge-success'
                        }`}>
                          {order.status === 'ready' ? 'ready for pickup 🎉' : order.status}
                        </span>
                      </div>

                      {/* Items details */}
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>

                      {/* Progress visual bar */}
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', marginBottom: '0.5rem' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${getProgressPercentage(order.status)}%`, 
                            background: order.status === 'ready' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: order.status === 'pending' ? 'var(--accent-orange)' : '' }}>Received</span>
                        <span style={{ color: order.status === 'preparing' ? 'var(--accent-cyan)' : '' }}>Kitchen</span>
                        <span style={{ color: order.status === 'ready' ? 'var(--accent-green)' : '' }}>Ready for Pickup</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Catalog: Search, Filter, Browse */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            
            {/* Filters Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search dishes, stalls, or categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>

                {/* Stall filter dropdown */}
                <div style={{ width: '200px' }}>
                  <select
                    className="input-field"
                    value={selectedStallId}
                    onChange={(e) => setSelectedStallId(e.target.value)}
                  >
                    <option value="all">🏪 All Food Stalls</option>
                    {stalls.map(s => (
                      <option key={s.id} value={s.id}>{s.logoUrl} {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      padding: '0.35rem 0.85rem', 
                      fontSize: '0.8rem',
                      textTransform: 'capitalize',
                      borderRadius: '20px'
                    }}
                  >
                    {cat === 'all' ? '🍽️ All categories' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            {filteredMenuItems.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Info size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>No dishes found</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Try refining your search text or removing the filters.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredMenuItems.map(item => (
                  <div 
                    key={item.id} 
                    className="glass-panel list-item-hover"
                    style={{ 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      border: '1px solid var(--border-color)',
                      opacity: item.isAvailable ? 1 : 0.6
                    }}
                  >
                    {/* Item Image */}
                    <div style={{ height: '150px', position: 'relative' }}>
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                        }}
                      />
                      <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        <span className="badge badge-info" style={{ background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(4px)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {item.category}
                        </span>
                      </div>
                      
                      <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          background: 'rgba(3, 7, 18, 0.85)', 
                          color: 'var(--text-primary)', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backdropFilter: 'blur(4px)'
                        }}>
                          <Store size={10} /> {item.stallName}
                        </span>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                          {item.name}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4, height: '56px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '0.75rem' }}>
                          {item.description}
                        </p>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                            ${item.price.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={11} /> {item.prepTime} min
                          </span>
                        </div>

                        {item.isAvailable ? (
                          <button 
                            onClick={() => addToCart(item)}
                            className="btn btn-primary" 
                            style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                          >
                            <Plus size={14} /> Add to Cart
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                            disabled
                          >
                            Out of Stock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ================= FLOATING CART & WALLET SIDEBAR OVERLAY ================= */}
      {showCart && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 90,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          {/* Overlay click to close */}
          <div onClick={() => setShowCart(false)} style={{ flex: 1 }} />
          
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '100%',
              borderRadius: '0',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              animation: 'slide-up 0.25s ease-out',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Sidebar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(3, 7, 18, 0.4)' }}>
              <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} color="var(--accent-cyan)" /> Your Cart & Wallet
              </h3>
              <button 
                onClick={() => setShowCart(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Wallet Section */}
              <div 
                style={{ 
                  background: 'rgba(6, 182, 212, 0.03)', 
                  border: '1px solid rgba(6, 182, 212, 0.2)', 
                  borderRadius: '12px', 
                  padding: '1.25rem' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wallet size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Wallet Balance</span>
                  </div>
                  <strong className="font-display" style={{ fontSize: '1.35rem', color: 'var(--accent-green)' }}>
                    ${wallet.balance.toFixed(2)}
                  </strong>
                </div>

                {/* Quick Add Funds Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top Up Balance:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.35rem' }}>
                    {[10, 20, 50, 100].map(amt => (
                      <button
                        key={amt}
                        onClick={() => handleTopUp(amt)}
                        disabled={loadingFunds}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>
                  {loadingFunds && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                      <span className="pulse-glow" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                      <span>Processing top-up of ${loadAmount}...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cart Items</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{cart.reduce((s, c) => s + c.quantity, 0)} items</span>
                </h4>

                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    <ShoppingBag size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Your cart is empty.</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Select food items from the catalog.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cart.map(({ item, quantity }) => (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          gap: '0.75rem', 
                          background: 'rgba(255,255,255,0.02)', 
                          padding: '0.75rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)',
                          alignItems: 'center'
                        }}
                      >
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h5>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.stallName} • ${item.price.toFixed(2)}</span>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button 
                            onClick={() => updateCartQty(item.id, -1)}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Minus size={10} />
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '20px', textAlign: 'center' }}>{quantity}</span>
                          <button 
                            onClick={() => updateCartQty(item.id, 1)}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Plus size={10} />
                          </button>
                          
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Notes (only show if items exist) */}
              {cart.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Special Instructions (Cooking Notes)
                  </label>
                  <textarea
                    className="input-field"
                    placeholder="e.g. No jalapeños, extra spicy, sauce on the side..."
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    rows={2}
                    style={{ resize: 'none', fontFamily: 'inherit', fontSize: '0.8rem' }}
                  />
                </div>
              )}

              {/* Wallet Transactions History List */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <History size={14} /> Wallet Transaction History
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {wallet.transactions.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions recorded.</p>
                  ) : (
                    wallet.transactions.map(tx => (
                      <div 
                        key={tx.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.75rem', 
                          padding: '0.5rem', 
                          background: 'rgba(3,7,18,0.2)', 
                          border: '1px solid rgba(255,255,255,0.02)', 
                          borderRadius: '6px' 
                        }}
                      >
                        <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <strong style={{ 
                          color: tx.type === 'load' || tx.type === 'refund' ? '#34d399' : '#f87171',
                          whiteSpace: 'nowrap' 
                        }}>
                          {tx.type === 'load' || tx.type === 'refund' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Sidebar Checkout Footer */}
            {cart.length > 0 && (
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(3, 7, 18, 0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Amount:</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>${cartTotal.toFixed(2)}</strong>
                </div>

                {wallet.balance < cartTotal && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Info size={14} />
                    <span>Insufficient funds! Please top up above.</span>
                  </div>
                )}

                <button 
                  onClick={handleCheckout}
                  disabled={wallet.balance < cartTotal}
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    fontWeight: 600,
                    opacity: wallet.balance < cartTotal ? 0.5 : 1,
                    cursor: wallet.balance < cartTotal ? 'not-allowed' : 'pointer'
                  }}
                >
                  Confirm & Place Order (${cartTotal.toFixed(2)})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CHECKOUT SUCCESS MODAL ================= */}
      {showSuccessModal && lastOrderDetails && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '460px', 
              width: '100%', 
              padding: '2.5rem', 
              borderRadius: '24px', 
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              border: '1px solid var(--border-color-glow)'
            }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={36} />
            </div>

            <h3 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
              Order Placed Successfully!
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Your order has been split and sent directly to the food stalls for preparation.
            </p>

            <div 
              style={{ 
                background: 'rgba(3, 7, 18, 0.4)', 
                borderRadius: '12px', 
                padding: '1rem', 
                border: '1px solid var(--border-color)',
                marginBottom: '2rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Order ID(s):</span>
                <strong style={{ color: 'var(--text-primary)' }}>#{lastOrderDetails.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Paid:</span>
                <strong style={{ color: 'var(--accent-green)' }}>${lastOrderDetails.total.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>Simulated Wallet Balance</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Track Live Progress
              </button>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <Sparkles size={12} color="var(--accent-orange)" /> Tip: Switch to Stall Admin view to see your orders in real-time!
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
