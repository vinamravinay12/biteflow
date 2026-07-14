import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { Stall, MenuItem, Order, DashboardStats } from '../types';
import { 
  Store, Plus, Trash2, Edit, Check, X, Clock, 
  TrendingUp, DollarSign, ShoppingBag, LogOut, 
  Sparkles, AlertCircle, RefreshCw, Lock
} from 'lucide-react';

interface StallDashboardProps {
  stall: Stall;
  onLogout: () => void;
}

export const StallDashboard: React.FC<StallDashboardProps> = ({ stall, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'analytics'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    completedOrdersCount: 0,
    cancelledOrdersCount: 0
  });

  // Filter for orders
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'>('all');

  // Menu form modal state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Menu form fields
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemCategory, setItemCategory] = useState('Burgers');
  const [itemPrepTime, setItemPrepTime] = useState('10');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [formError, setFormError] = useState('');

  // Change Password state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Sample food images presets
  const imagePresets = [
    { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500' },
    { label: 'Taco', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500' },
    { label: 'Fries', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
    { label: 'Noodles', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500' },
    { label: 'Boba Tea', url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500' },
    { label: 'Dessert', url: 'https://images.unsplash.com/photo-1562376502-6f769499c886?w=500' },
    { label: 'Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500' },
  ];

  // Load data
  const loadData = async () => {
    // Load menu items for this stall
    const allItems = await db.getMenuItems();
    const stallItems = allItems.filter(item => item.stallId === stall.id);
    setMenuItems(stallItems);

    // Load orders for this stall
    const allOrders = await db.getOrders();
    const stallOrders = allOrders.filter(order => order.stallId === stall.id);
    setOrders(stallOrders);

    // Calculate statistics
    const completed = stallOrders.filter(o => o.status === 'completed');
    const cancelled = stallOrders.filter(o => o.status === 'cancelled');
    const totalRev = completed.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgVal = completed.length > 0 ? totalRev / completed.length : 0;

    setStats({
      totalRevenue: totalRev,
      totalOrders: stallOrders.length,
      averageOrderValue: avgVal,
      completedOrdersCount: completed.length,
      cancelledOrdersCount: cancelled.length
    });
  };

  useEffect(() => {
    loadData();
    // Set up auto-refresh timer to poll for new orders placed in Customer view
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [stall.id]);

  // Order status actions
  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    const success = await db.updateOrderStatus(orderId, newStatus);
    if (success) {
      // If we are cancelling, refund customer
      if (newStatus === 'cancelled') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await db.refundWalletFunds(
            order.totalAmount,
            `Refund: Order #${order.id} cancelled by ${stall.name}`
          );
        }
      }
      await loadData();
    }
  };
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      setPassError('All fields are required.');
      return;
    }

    if (currentPasswordInput !== stall.ownerPassword) {
      setPassError('Incorrect current password.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPassError('New passwords do not match.');
      return;
    }

    if (newPasswordInput.length < 4) {
      setPassError('Password must be at least 4 characters.');
      return;
    }

    const success = await db.changeStallPassword(stall.id, newPasswordInput);
    if (success) {
      setPassSuccess('Password updated successfully!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => {
        setIsPassModalOpen(false);
        setPassSuccess('');
      }, 1500);
    } else {
      setPassError('Failed to update password.');
    }
  };

  // Open modal for editing or adding
  const openMenuModal = (item: MenuItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDescription(item.description);
      setItemPrice(item.price.toString());
      setItemImage(item.imageUrl);
      setItemCategory(item.category);
      setItemPrepTime(item.prepTime.toString());
      setItemAvailable(item.isAvailable);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemImage(imagePresets[0].url);
      setItemCategory('Burgers');
      setItemPrepTime('10');
      setItemAvailable(true);
    }
    setFormError('');
    setIsMenuModalOpen(true);
  };

  // Handle submit menu item
  const handleSubmitMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!itemName.trim() || !itemDescription.trim() || !itemPrice.trim() || !itemImage.trim()) {
      setFormError('All fields are required.');
      return;
    }

    const parsedPrice = parseFloat(itemPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Price must be a valid positive number.');
      return;
    }

    const parsedPrep = parseInt(itemPrepTime);
    if (isNaN(parsedPrep) || parsedPrep <= 0) {
      setFormError('Prep time must be a positive integer.');
      return;
    }

    if (editingItem) {
      // Update
      const updated: MenuItem = {
        ...editingItem,
        name: itemName.trim(),
        description: itemDescription.trim(),
        price: parsedPrice,
        imageUrl: itemImage.trim(),
        category: itemCategory,
        prepTime: parsedPrep,
        isAvailable: itemAvailable
      };
      
      const success = await db.updateMenuItem(updated);
      if (success) {
        setIsMenuModalOpen(false);
        await loadData();
      } else {
        setFormError('Failed to update menu item.');
      }
    } else {
      // Add
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        stallId: stall.id,
        stallName: stall.name,
        name: itemName.trim(),
        description: itemDescription.trim(),
        price: parsedPrice,
        imageUrl: itemImage.trim(),
        category: itemCategory,
        prepTime: parsedPrep,
        isAvailable: itemAvailable
      };

      await db.addMenuItem(newItem);
      setIsMenuModalOpen(false);
      await loadData();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      await db.deleteMenuItem(itemId);
      await loadData();
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    await db.updateMenuItem(updated);
    await loadData();
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  return (
    <div style={{ animation: 'slide-up 0.4s ease' }}>
      {/* Stall Banner Header */}
      <div 
        style={{ 
          background: `linear-gradient(135deg, ${stall.bannerColor}, rgba(3, 7, 18, 0.95))`,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: `0 10px 30px rgba(0,0,0,0.3)`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>{stall.logoUrl}</span>
          <div>
            <h1 className="font-display" style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: 'white' }}>
              {stall.name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '500px', marginTop: '0.25rem', fontSize: '0.95rem' }}>
              {stall.description}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <span className="badge badge-success" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                ★ {stall.rating.toFixed(1)} Rating
              </span>
              <span className="badge badge-info" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
                Username: {stall.ownerUsername}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setIsPassModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={15} /> Change Password
          </button>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh data">
            <RefreshCw size={18} />
          </button>
          <button onClick={onLogout} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border-color)', 
          gap: '1.5rem', 
          marginBottom: '2rem', 
          paddingBottom: '0.25rem' 
        }}
      >
        <button 
          onClick={() => setActiveTab('orders')} 
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'orders' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'orders' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <ShoppingBag size={18} /> Orders Queue
          {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length > 0 && (
            <span style={{
              background: 'var(--accent-cyan)',
              color: 'var(--bg-dark)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: '9999px',
              marginLeft: '0.25rem'
            }}>
              {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('menu')} 
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'menu' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'menu' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Store size={18} /> Manage Menu
        </button>

        <button 
          onClick={() => setActiveTab('analytics')} 
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'analytics' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '1rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <TrendingUp size={18} /> Analytics & Sales
        </button>
      </div>

      {/* ================= TAB 1: ORDERS QUEUE ================= */}
      {activeTab === 'orders' && (
        <div>
          {/* Order Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
            {(['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(f => {
              const count = f === 'all' ? orders.length : orders.filter(o => o.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`btn ${orderFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    padding: '0.4rem 0.9rem', 
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {f} 
                  <span style={{ 
                    opacity: 0.7, 
                    fontSize: '0.75rem',
                    background: orderFilter === f ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    padding: '0.05rem 0.3rem',
                    borderRadius: '4px'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
              <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>No orders found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {orderFilter === 'all' ? 'Your stall hasn\'t received any orders yet.' : `No orders with status "${orderFilter}".`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              {filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  className={`glass-panel ${order.status === 'pending' ? 'pulse-glow' : ''}`}
                  style={{ 
                    padding: '1.5rem', 
                    borderLeft: order.status === 'pending' ? '4px solid var(--accent-orange)' : 
                                 order.status === 'preparing' ? '4px solid var(--accent-cyan)' :
                                 order.status === 'ready' ? '4px solid var(--accent-lime)' :
                                 order.status === 'completed' ? '4px solid var(--accent-green)' :
                                 '4px solid var(--accent-red)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Order #{order.id}</span>
                        <span className={`badge ${
                          order.status === 'pending' ? 'badge-warning' :
                          order.status === 'preparing' ? 'badge-info' :
                          order.status === 'ready' ? 'badge-success' : // customized coloring
                          order.status === 'completed' ? 'badge-success' :
                          'badge-danger'
                        }`}>
                          {order.status === 'ready' ? 'ready for pickup' : order.status}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Placed on {new Date(order.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(order.orderTime).toLocaleDateString()})
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customer</span>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{order.customerName}</p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-primary)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.quantity}x</span>
                            <span>{item.name}</span>
                          </div>
                          <span style={{ color: 'var(--text-secondary)' }}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        background: 'rgba(249, 115, 22, 0.05)', 
                        border: '1px dashed rgba(249, 115, 22, 0.2)', 
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#fb923c',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}>
                        <AlertCircle size={14} />
                        <span><strong>Notes:</strong> {order.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Total & Status Controls */}
                  <div style={{ 
                    borderTop: '1px solid var(--border-color)', 
                    paddingTop: '1rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total:</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>${order.totalAmount.toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <X size={14} /> Cancel & Refund
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.5rem 1.25rem', 
                              fontSize: '0.85rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.35rem',
                              background: 'linear-gradient(135deg, var(--accent-orange), #ea580c)'
                            }}
                          >
                            <Check size={14} /> Accept Order
                          </button>
                        </>
                      )}

                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'ready')}
                          className="btn btn-primary"
                          style={{ 
                            padding: '0.5rem 1.25rem', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem',
                            background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)'
                          }}
                        >
                          <Clock size={14} /> Mark as Ready
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          className="btn btn-primary"
                          style={{ 
                            padding: '0.5rem 1.25rem', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem',
                            background: 'linear-gradient(135deg, var(--accent-green), #047857)'
                          }}
                        >
                          <Check size={14} /> Mark as Completed
                        </button>
                      )}

                      {(order.status === 'completed' || order.status === 'cancelled') && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          Order finalized
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MANAGE MENU ================= */}
      {activeTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Menu Offerings</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Add or edit items details and manage stock availability.</p>
            </div>
            <button onClick={() => openMenuModal(null)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Add Food Item
            </button>
          </div>

          {menuItems.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed' }}>
              <Store size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Your menu is empty</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Add delicious food items to your menu so customers can order them.
              </p>
              <button onClick={() => openMenuModal(null)} className="btn btn-primary">
                <Plus size={16} /> Add Your First Item
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {menuItems.map(item => (
                <div 
                  key={item.id} 
                  className="glass-panel" 
                  style={{ 
                    overflow: 'hidden', 
                    display: 'flex', 
                    flexDirection: 'column',
                    opacity: item.isAvailable ? 1 : 0.75,
                    border: item.isAvailable ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback image
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className="badge badge-info" style={{ background: 'rgba(3, 7, 18, 0.75)', backdropFilter: 'blur(4px)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {item.category}
                      </span>
                    </div>
                    {!item.isAvailable && (
                      <div style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        background: 'rgba(3, 7, 18, 0.7)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.name}
                        </h3>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: '1rem' }}>
                        {item.description}
                      </p>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        <Clock size={12} />
                        <span>Prep Time: ~{item.prepTime} mins</span>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Toggle switch */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox" 
                            checked={item.isAvailable}
                            onChange={() => toggleItemAvailability(item)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--accent-cyan)' }}
                          />
                          In Stock
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => openMenuModal(item)} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', borderRadius: '6px' }}
                            title="Edit Item"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            title="Delete Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: ANALYTICS ================= */}
      {activeTab === 'analytics' && (
        <div>
          {/* Key Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Revenue</span>
                <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                  ${stats.totalRevenue.toFixed(2)}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                <ShoppingBag size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Orders</span>
                <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                  {stats.totalOrders}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg. Order Value</span>
                <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                  ${stats.averageOrderValue.toFixed(2)}
                </h3>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
                <X size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cancellations</span>
                <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                  {stats.cancelledOrdersCount}
                </h3>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* Visual Chart - Pure CSS & SVG Bar Chart */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--accent-cyan)" /> Hourly Order Frequency (Simulated)
              </h3>
              <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '4.5%', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', paddingBottom: '0.5rem', position: 'relative' }}>
                {[
                  { hour: '11 AM', count: 4, height: '35%', color: 'var(--accent-cyan)' },
                  { hour: '12 PM', count: 12, height: '80%', color: 'var(--accent-green)' },
                  { hour: '1 PM', count: 9, height: '60%', color: 'var(--accent-green)' },
                  { hour: '2 PM', count: 3, height: '25%', color: 'var(--accent-cyan)' },
                  { hour: '3 PM', count: 2, height: '15%', color: 'var(--accent-cyan)' },
                  { hour: '4 PM', count: 5, height: '40%', color: 'var(--accent-cyan)' },
                  { hour: '5 PM', count: 14, height: '95%', color: 'var(--accent-pink)' },
                  { hour: '6 PM', count: 11, height: '75%', color: 'var(--accent-green)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {item.count}
                    </span>
                    <div 
                      style={{ 
                        width: '100%', 
                        height: item.height, 
                        background: `linear-gradient(to top, ${item.color}, rgba(255,255,255,0.1))`, 
                        borderRadius: '4px 4px 0 0',
                        boxShadow: `0 0 10px rgba(0, 0, 0, 0.2)`
                      }} 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', whiteSpace: 'nowrap' }}>
                      {item.hour}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Items */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--accent-orange)" /> Popular Items Sales
              </h3>

              {menuItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No menu items to display.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {menuItems.slice(0, 4).map((item, index) => {
                    // Generate mock sales count
                    const mockSalesCount = Math.floor((4.9 - (index * 0.4)) * (stats.completedOrdersCount + 3));
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {mockSalesCount} sold
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(100, (mockSalesCount / (stats.completedOrdersCount * 5 + 10)) * 100)}%`, 
                                background: index === 0 ? 'var(--accent-orange)' : 
                                            index === 1 ? 'var(--accent-cyan)' : 
                                            'var(--accent-purple)',
                                borderRadius: '3px'
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT MENU ITEM ================= */}
      {isMenuModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '540px', 
              width: '100%', 
              padding: '2rem', 
              borderRadius: '20px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h3>
              <button 
                onClick={() => setIsMenuModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitMenu} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Item Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Bacon Avocado Burger"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  className="input-field"
                  placeholder="Describe details, ingredients, or allergens..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="9.99"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="10"
                    value={itemPrepTime}
                    onChange={(e) => setItemPrepTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Category
                </label>
                <select
                  className="input-field"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                >
                  <option value="Burgers">Burgers</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Noodles">Noodles</option>
                  <option value="Rice Bowls">Rice Bowls</option>
                  <option value="Mains">Mains</option>
                  <option value="Sides">Sides</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Food Image URL
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://images.unsplash.com/..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
                
                {/* Image Presets Selector */}
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Photo Presets:</span>
                  <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.25rem 0', marginTop: '0.15rem' }}>
                    {imagePresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setItemImage(preset.url)}
                        className={`btn ${itemImage.startsWith(preset.url.split('?')[0]) ? 'btn-outline' : 'btn-secondary'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {editingItem && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                      type="checkbox" 
                      checked={itemAvailable}
                      onChange={(e) => setItemAvailable(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Item is in-stock and available for purchase
                  </label>
                </div>
              )}

              {formError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>
                  ⚠️ {formError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsMenuModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPassModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '440px', 
              width: '100%', 
              padding: '2rem', 
              borderRadius: '20px', 
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="var(--accent-cyan)" /> Change Stall Password
              </h3>
              <button 
                onClick={() => setIsPassModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Current Merchant Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Minimum 4 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                />
              </div>

              {passError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>
                  ⚠️ {passError}
                </p>
              )}

              {passSuccess && (
                <p style={{ color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✓ {passSuccess}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPassModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
