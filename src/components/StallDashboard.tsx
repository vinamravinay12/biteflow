import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { StallSession, MenuItem, OrderStatus, OrderLineItem, DashboardStats } from '../types';
import { KIOSK_TRANSLATIONS, KIOSK_LOCALES, type KioskLanguageCode } from '../utils/translations';
import { useDocumentLanguage } from '../utils/useDocumentLanguage';
import {
  Store, Plus, Trash2, Edit, Check, X, Clock,
  TrendingUp, DollarSign, ShoppingBag, LogOut,
  Sparkles, AlertCircle, RefreshCw, Lock
} from 'lucide-react';

interface StallDashboardProps {
  stall: StallSession;
  onLogout: () => void;
}

// This kiosk's own slice of a (possibly multi-kiosk) order, flattened for display.
interface KioskOrderView {
  orderId: string;
  customerUid: string;
  customerName: string;
  matchName?: string;
  stand?: string;
  seatNumber?: string;
  orderTime: string;
  notes?: string;
  items: OrderLineItem[];
  subtotal: number;
  status: OrderStatus;
}

const DASHBOARD_LOCALES = {
  en: {
    emptyQueueAll: "Your stall hasn't received any orders yet.",
    emptyQueueFilter: (status: string) => `No orders with status "${status}".`,
    placedOn: "Placed on",
    stadiumDelivery: "Stadium Delivery",
    match: "Match",
    location: "Location",
    orderFinalized: "Order finalized",
    reasonStock: "Finished / Out of Stock",
    reasonNotAvailable: "Not Available",
    reasonBusy: "Kiosk Too Busy",
    reasonTechnical: "Technical Issues"
  },
  es: {
    emptyQueueAll: "Tu puesto aún no ha recibido ningún pedido.",
    emptyQueueFilter: (status: string) => `No hay pedidos con el estado "${status}".`,
    placedOn: "Realizado el",
    stadiumDelivery: "Entrega en el Estadio",
    match: "Partido",
    location: "Ubicación",
    orderFinalized: "Pedido finalizado",
    reasonStock: "Agotado / Sin stock",
    reasonNotAvailable: "No disponible",
    reasonBusy: "Puesto muy ocupado",
    reasonTechnical: "Problemas técnicos"
  },
  nl: {
    emptyQueueAll: "Jouw kraam heeft nog geen bestellingen ontvangen.",
    emptyQueueFilter: (status: string) => `Geen bestellingen met status "${status}".`,
    placedOn: "Geplaatst op",
    stadiumDelivery: "Stadion Bezorging",
    match: "Wedstrijd",
    location: "Locatie",
    orderFinalized: "Bestelling afgerond",
    reasonStock: "Uitverkocht / Geen voorraad",
    reasonNotAvailable: "Niet beschikbaar",
    reasonBusy: "Kraam te druk",
    reasonTechnical: "Technische problemen"
  },
  ar: {
    emptyQueueAll: "لم يتلق كشكك أي طلبات بعد.",
    emptyQueueFilter: (status: string) => `لا توجد طلبات بالحالة "${status}".`,
    placedOn: "تم تقديمه في",
    stadiumDelivery: "التوصيل في الملعب",
    match: "المباراة",
    location: "الموقع",
    orderFinalized: "تم إنهاء الطلب",
    reasonStock: "نفاد الكمية / غير متوفر",
    reasonNotAvailable: "غير متاح",
    reasonBusy: "الكشك مزدحم للغاية",
    reasonTechnical: "مشاكل تقنية"
  }
};

export const StallDashboard: React.FC<StallDashboardProps> = ({ stall, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'analytics'>('orders');
  const [language, setLanguage] = useState<KioskLanguageCode>('en');
  useDocumentLanguage(language);
  const [orders, setOrders] = useState<KioskOrderView[]>([]);
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

  // Declining comments states
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');

  // Menu form modal state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Menu form fields
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [presetImage, setPresetImage] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState('');
  const [itemCategory, setItemCategory] = useState('Burgers');
  const [itemPrepTime, setItemPrepTime] = useState('10');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [formError, setFormError] = useState('');
  const [imageSource, setImageSource] = useState<'presets' | 'url' | 'upload'>('presets');

  const detectImageSource = (url: string): 'presets' | 'url' | 'upload' => {
    if (!url) return 'presets';
    if (url.startsWith('data:')) return 'upload';
    if (imagePresets.some(preset => url.startsWith(preset.url.split('?')[0]))) return 'presets';
    return 'url';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Image file is too large (max 2MB).');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedImage(reader.result);
          setFormError('');
        }
      };
      reader.onerror = () => {
        setFormError('Failed to read file.');
      };
      reader.readAsDataURL(file);
    }
  };

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
    { label: 'Taco', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500' },
    { label: 'Fries', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
    { label: 'Noodles', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500' },
    { label: 'Boba Tea', url: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500' },
    { label: 'Dessert', url: 'https://images.unsplash.com/photo-1562376502-6f769499c886?w=500' },
    { label: 'Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500' },
  ];

  // Load data
  const loadData = async () => {
    // Load menu items for this stall
    const stallItems = await db.getMenuItems(stall.id);
    setMenuItems(stallItems);

    // Load orders that include this kiosk (an order can span multiple kiosks;
    // we only ever look at our own slice of it).
    const matchingOrders = await db.getOrdersForKiosk(stall.id);
    const stallOrders: KioskOrderView[] = matchingOrders
      .map(o => {
        const entry = o.kioskOrders[stall.id];
        return {
          orderId: o.id,
          customerUid: o.customerUid,
          customerName: o.customerName,
          matchName: o.matchName,
          stand: o.stand,
          seatNumber: o.seatNumber,
          orderTime: o.orderTime,
          notes: o.notes,
          items: entry.items,
          subtotal: entry.subtotal,
          status: entry.status
        };
      })
      .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
    setOrders(stallOrders);

    // Calculate statistics
    const completed = stallOrders.filter(o => o.status === 'completed');
    const cancelled = stallOrders.filter(o => o.status === 'cancelled');
    const totalRev = completed.reduce((sum, o) => sum + o.subtotal, 0);
    const avgVal = completed.length > 0 ? totalRev / completed.length : 0;

    setStats({
      totalRevenue: totalRev,
      totalOrders: stallOrders.length,
      averageOrderValue: avgVal,
      completedOrdersCount: completed.length,
      cancelledOrdersCount: cancelled.length
    });
  };

  // `loadData` is a stable closure over `stall`; the effect intentionally keys
  // only on stall.id and polls on an interval, so exhaustive-deps is suppressed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
    // Set up auto-refresh timer to poll for new orders placed in Customer view.
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [stall.id]);

  // Order status actions
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const success = await db.updateKioskOrderStatus(order.customerUid, orderId, stall.id, newStatus, reason);
    if (success) {
      // If we are cancelling, refund only this kiosk's portion of the order —
      // other kiosks in the same order are unaffected.
      if (newStatus === 'cancelled') {
        const refundNote = reason 
          ? `Refund: Order #${order.orderId} declined by ${stall.name} (${reason})` 
          : `Refund: Order #${order.orderId} (${stall.name}) cancelled`;
        await db.refundWalletFunds(
          order.customerUid,
          order.subtotal,
          refundNote
        );
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

    const verified = await db.verifyStallCredentials(stall.ownerUsername, currentPasswordInput);
    if (!verified) {
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
      
      const source = detectImageSource(item.imageUrl);
      setImageSource(source);
      if (source === 'presets') {
        setPresetImage(item.imageUrl);
        setCustomImageUrl('');
        setUploadedImage('');
      } else if (source === 'url') {
        setPresetImage(imagePresets[0].url);
        setCustomImageUrl(item.imageUrl);
        setUploadedImage('');
      } else {
        setPresetImage(imagePresets[0].url);
        setCustomImageUrl('');
        setUploadedImage(item.imageUrl);
      }
      
      setItemCategory(item.category);
      setItemPrepTime(item.prepTime.toString());
      setItemAvailable(item.isAvailable);
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setPresetImage(imagePresets[0].url);
      setCustomImageUrl('');
      setUploadedImage('');
      setItemCategory('Burgers');
      setItemPrepTime('10');
      setItemAvailable(true);
      setImageSource('presets');
    }
    setFormError('');
    setIsMenuModalOpen(true);
  };

  // Handle submit menu item
  const handleSubmitMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    let finalImageUrl = '';
    if (imageSource === 'presets') {
      finalImageUrl = presetImage;
    } else if (imageSource === 'url') {
      finalImageUrl = customImageUrl.trim();
    } else if (imageSource === 'upload') {
      finalImageUrl = uploadedImage;
    }

    if (!itemName.trim() || !itemDescription.trim() || !itemPrice.trim() || !finalImageUrl) {
      setFormError('All fields are required, including an image selection/upload.');
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
        imageUrl: finalImageUrl,
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
        imageUrl: finalImageUrl,
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
      await db.deleteMenuItem(stall.id, itemId);
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Kiosk Language Selector */}
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

          <button onClick={() => setIsPassModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={15} /> {KIOSK_TRANSLATIONS[language].changePassButton}
          </button>
          <button onClick={loadData} className="btn btn-secondary" title="Refresh data" aria-label="Refresh data">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
          <button onClick={onLogout} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={16} /> {KIOSK_TRANSLATIONS[language].logout}
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
          <ShoppingBag size={18} /> {KIOSK_TRANSLATIONS[language].ordersTab}
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
          <Store size={18} /> {KIOSK_TRANSLATIONS[language].menuTab}
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
          <TrendingUp size={18} /> {KIOSK_TRANSLATIONS[language].analyticsTab}
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
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{KIOSK_TRANSLATIONS[language].noOrders}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {orderFilter === 'all' ? DASHBOARD_LOCALES[language].emptyQueueAll : DASHBOARD_LOCALES[language].emptyQueueFilter(orderFilter)}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              {filteredOrders.map(order => (
                <div 
                  key={order.orderId} 
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
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Order #{order.orderId}</span>
                        <span className={`badge ${
                          order.status === 'pending' ? 'badge-warning' :
                          order.status === 'preparing' ? 'badge-info' :
                          order.status === 'ready' ? 'badge-success' : // customized coloring
                          order.status === 'completed' ? 'badge-success' :
                          'badge-danger'
                        }`}>
                          {order.status === 'ready' ? KIOSK_TRANSLATIONS[language].statusReady : order.status === 'pending' ? KIOSK_TRANSLATIONS[language].statusPending : order.status === 'preparing' ? KIOSK_TRANSLATIONS[language].statusPreparing : order.status === 'completed' ? KIOSK_TRANSLATIONS[language].statusCompleted : KIOSK_TRANSLATIONS[language].statusCancelled}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        {DASHBOARD_LOCALES[language].placedOn} {new Date(order.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(order.orderTime).toLocaleDateString()})
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{KIOSK_TRANSLATIONS[language].customerLabel}</span>
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
                        <span><strong>{KIOSK_TRANSLATIONS[language].orderNotes}:</strong> {order.notes}</span>
                      </div>
                    )}
                    {order.seatNumber && (
                      <div style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        background: 'rgba(6, 182, 212, 0.08)', 
                        border: '1px solid rgba(6, 182, 212, 0.3)', 
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>🏟️</span>
                          <span><strong>{DASHBOARD_LOCALES[language].stadiumDelivery}:</strong></span>
                        </div>
                        <div style={{ marginLeft: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          <div>{DASHBOARD_LOCALES[language].match}: <strong style={{ color: 'white' }}>{order.matchName}</strong></div>
                          <div>{DASHBOARD_LOCALES[language].location}: <strong style={{ color: 'white' }}>{order.stand} ({KIOSK_TRANSLATIONS[language].seatLabel} {order.seatNumber})</strong></div>
                        </div>
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
                      <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>${order.subtotal.toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', width: decliningOrderId === order.orderId ? '100%' : 'auto', justifyContent: 'flex-end' }}>
                      {order.status === 'pending' && (
                        decliningOrderId === order.orderId ? (
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            width: '100%',
                            maxWidth: '400px'
                          }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-red)', display: 'block', textAlign: 'left' }}>
                              {KIOSK_TRANSLATIONS[language].selectReason}:
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {['Finished / Out of Stock', 'Not Available', 'Kiosk Too Busy', 'Technical Issues'].map(reason => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setDeclineReason(reason)}
                                  className="btn"
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    background: declineReason === reason ? 'var(--accent-red)' : 'rgba(255,255,255,0.05)',
                                    color: declineReason === reason ? 'white' : 'var(--text-secondary)',
                                    border: '1px solid ' + (declineReason === reason ? 'var(--accent-red)' : 'var(--border-color)'),
                                    cursor: 'pointer'
                                  }}
                                >
                                  {reason === 'Finished / Out of Stock' ? DASHBOARD_LOCALES[language].reasonStock : reason === 'Not Available' ? DASHBOARD_LOCALES[language].reasonNotAvailable : reason === 'Kiosk Too Busy' ? DASHBOARD_LOCALES[language].reasonBusy : DASHBOARD_LOCALES[language].reasonTechnical}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="input-field"
                              placeholder={KIOSK_TRANSLATIONS[language].declineReasonPlaceholder}
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'rgba(3,7,18,0.5)' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDecliningOrderId(null);
                                  setDeclineReason('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                {KIOSK_TRANSLATIONS[language].cancelButton}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const finalReason = declineReason.trim() || 'Not Available';
                                  await handleUpdateStatus(order.orderId, 'cancelled', finalReason);
                                  setDecliningOrderId(null);
                                  setDeclineReason('');
                                }}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--accent-red)' }}
                              >
                                {KIOSK_TRANSLATIONS[language].cancelConfirmButton}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                setDecliningOrderId(order.orderId);
                                setDeclineReason('');
                              }}
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <X size={14} /> {KIOSK_TRANSLATIONS[language].declineButton}
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(order.orderId, 'preparing')}
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
                              <Check size={14} /> {KIOSK_TRANSLATIONS[language].acceptButton}
                            </button>
                          </>
                        )
                      )}

                      {order.status === 'preparing' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.orderId, 'ready')}
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
                          <Clock size={14} /> {KIOSK_TRANSLATIONS[language].readyButton}
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.orderId, 'completed')}
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
                          <Check size={14} /> {KIOSK_TRANSLATIONS[language].completeButton}
                        </button>
                      )}

                      {(order.status === 'completed' || order.status === 'cancelled') && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          {DASHBOARD_LOCALES[language].orderFinalized}
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
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            title="Delete Item"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
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
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitMenu} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="menu-item-name" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Item Name
                </label>
                <input
                  id="menu-item-name"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Bacon Avocado Burger"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="menu-item-desc" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <textarea
                  id="menu-item-desc"
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
                  <label htmlFor="menu-item-price" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Price ($)
                  </label>
                  <input
                    id="menu-item-price"
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="9.99"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="menu-item-prep" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Prep Time (mins)
                  </label>
                  <input
                    id="menu-item-prep"
                    type="number"
                    className="input-field"
                    placeholder="10"
                    value={itemPrepTime}
                    onChange={(e) => setItemPrepTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="menu-item-category" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Category
                </label>
                <select
                  id="menu-item-category"
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
                <span style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Food Image
                </span>
                
                {/* Tab selector */}
                <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setImageSource('presets')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      fontSize: '0.75rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: imageSource === 'presets' ? 'var(--accent-cyan)' : 'transparent',
                      color: imageSource === 'presets' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Preset Library
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource('url')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      fontSize: '0.75rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: imageSource === 'url' ? 'var(--accent-cyan)' : 'transparent',
                      color: imageSource === 'url' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSource('upload')}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      fontSize: '0.75rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: imageSource === 'upload' ? 'var(--accent-cyan)' : 'transparent',
                      color: imageSource === 'upload' ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Upload Image
                  </button>
                </div>

                {/* Tab content */}
                {imageSource === 'presets' && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose a Photo Preset:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.25rem' }}>
                      {imagePresets.map(preset => {
                        const isSelected = presetImage === preset.url;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setPresetImage(preset.url)}
                            style={{
                              padding: '0.5rem 0.25rem',
                              fontSize: '0.75rem',
                              background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(31, 41, 55, 0.4)',
                              border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                              borderRadius: '6px',
                              color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            <img 
                              src={preset.url} 
                              alt={preset.label} 
                              style={{ width: '100%', height: '36px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.25rem' }} 
                            />
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {imageSource === 'url' && (
                  <div>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                    
                    {/* Instructions helper */}
                    <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      💡 <strong>Tip for Unsplash:</strong> Right-click the photo on Unsplash, select <strong>"Copy image address"</strong> (or "Copy image link"), and paste that direct link here.
                    </p>

                    {/* Warning if they paste a webpage URL */}
                    {customImageUrl && customImageUrl.includes('unsplash.com/photos/') && !customImageUrl.includes('images.unsplash.com/') && (
                      <p style={{ color: 'var(--accent-orange)', fontSize: '0.75rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
                        ⚠️ <strong>This is an Unsplash webpage URL, not a direct image URL.</strong> The browser will fail to load it. Please follow the tip above to copy the direct link.
                      </p>
                    )}

                    {customImageUrl && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <img 
                          src={customImageUrl} 
                          alt="Preview" 
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Image Preview</span>
                      </div>
                    )}
                  </div>
                )}

                {imageSource === 'upload' && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        background: 'rgba(31, 41, 55, 0.4)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Max file size: 2MB. Supports PNG, JPG, GIF.
                    </p>
                    {uploadedImage && uploadedImage.startsWith('data:') && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <img 
                          src={uploadedImage} 
                          alt="Uploaded Preview" 
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Successfully loaded!</span>
                          <button
                            type="button"
                            onClick={() => setUploadedImage('')}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '0.7rem', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                          >
                            Remove photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label htmlFor="merchant-current-password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Current Merchant Password
                </label>
                <input
                  id="merchant-current-password"
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="merchant-new-password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <input
                  id="merchant-new-password"
                  type="password"
                  className="input-field"
                  placeholder="Minimum 4 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="merchant-confirm-password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <input
                  id="merchant-confirm-password"
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
