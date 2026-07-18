import React from 'react';
import { ShoppingBag, Wallet, Plus, Minus, Trash2, History, Info, X } from 'lucide-react';
import { USER_TRANSLATIONS, type LanguageCode } from '../../utils/translations';
import type { CartItem, UserWallet } from '../../types';

export interface CartDrawerProps {
  language: LanguageCode;
  /** Cart lines and their pre-computed total. */
  cart: CartItem[];
  cartTotal: number;
  wallet: UserWallet;
  /** Wallet top-up in flight, and the amount being added. */
  loadingFunds: boolean;
  loadAmount: number | null;
  /** Seat-delivery details captured at checkout. */
  standName: string;
  seatNumber: string;
  checkoutNotes: string;
  setStandName: (v: string) => void;
  setSeatNumber: (v: string) => void;
  setCheckoutNotes: (v: string) => void;
  /** Cart mutations. */
  updateCartQty: (itemId: string, delta: number) => void;
  removeFromCart: (itemId: string) => void;
  /** Actions. */
  handleTopUp: (amount: number) => void;
  handleCheckout: () => void;
  setShowCart: (open: boolean) => void;
  /** Opens the seat-map picker, seeded with the current selection. */
  setShowSeatMapModal: (open: boolean) => void;
  setTempStandName: (v: string) => void;
  setTempSeatNumber: (v: string) => void;
}

/**
 * Slide-over cart and wallet panel.
 *
 * Owns no state of its own — every value and mutation is supplied by the
 * customer portal, which keeps this component a pure rendering surface that
 * can be exercised in isolation. Presented as a labelled modal dialog.
 */
export const CartDrawer: React.FC<CartDrawerProps> = ({
  language,
  cart,
  cartTotal,
  wallet,
  loadingFunds,
  loadAmount,
  standName,
  seatNumber,
  checkoutNotes,
  setStandName,
  setSeatNumber,
  setCheckoutNotes,
  updateCartQty,
  removeFromCart,
  handleTopUp,
  handleCheckout,
  setShowCart,
  setShowSeatMapModal,
  setTempStandName,
  setTempSeatNumber,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 90,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Overlay click to close */}
      <div onClick={() => setShowCart(false)} aria-hidden="true" style={{ flex: 1 }} />

      <div
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={USER_TRANSLATIONS[language].cartTitle}
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
          overflow: 'hidden',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(3, 7, 18, 0.4)',
          }}
        >
          <h3
            className="font-display"
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShoppingBag size={18} color="var(--accent-cyan)" />{' '}
            {language === 'es'
              ? 'Tu Carrito y Billetera'
              : language === 'fr'
                ? 'Votre Panier & Portefeuille'
                : language === 'de'
                  ? 'Ihr Warenkorb & Wallet'
                  : language === 'it'
                    ? 'Il tuo Carrello e Portafoglio'
                    : language === 'pt'
                      ? 'Seu Carrinho e Carteira'
                      : language === 'nl'
                        ? 'Jouw Winkelwagen & Wallet'
                        : language === 'ar'
                          ? 'حقيبة التسوق والمحفظة'
                          : 'Your Cart & Wallet'}
          </h3>
          <button
            onClick={() => setShowCart(false)}
            aria-label={USER_TRANSLATIONS[language].close}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Wallet Section */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.03)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={16} color="var(--accent-cyan)" />
                <span
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  {USER_TRANSLATIONS[language].walletBalance || 'Wallet Balance'}
                </span>
              </div>
              <strong
                className="font-display"
                style={{ fontSize: '1.35rem', color: 'var(--accent-green)' }}
              >
                ${wallet.balance.toFixed(2)}
              </strong>
            </div>

            {/* Quick Add Funds Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {language === 'es'
                  ? 'Recargar Saldo:'
                  : language === 'fr'
                    ? 'Recharger le solde:'
                    : language === 'de'
                      ? 'Guthaben aufladen:'
                      : language === 'it'
                        ? 'Ricarica Saldo:'
                        : language === 'pt'
                          ? 'Recarregar Saldo:'
                          : language === 'nl'
                            ? 'Saldo Opwaarderen:'
                            : language === 'ar'
                              ? 'شحن الرصيد:'
                              : 'Top Up Balance:'}
              </span>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.35rem' }}
              >
                {[10, 20, 50, 100].map((amt) => (
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--accent-cyan)',
                    marginTop: '0.25rem',
                  }}
                >
                  <span
                    className="pulse-glow"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent-cyan)',
                    }}
                  />
                  <span>Processing top-up of ${loadAmount}...</span>
                </div>
              )}
            </div>
          </div>

          {/* Items List */}
          <div>
            <h4
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {language === 'es'
                  ? 'Artículos del Carrito'
                  : language === 'fr'
                    ? 'Articles du panier'
                    : language === 'de'
                      ? 'Warenkorb-Artikel'
                      : language === 'it'
                        ? 'Articoli del Carrello'
                        : language === 'pt'
                          ? 'Itens do Carrinho'
                          : language === 'nl'
                            ? 'Winkelwagen Items'
                            : language === 'ar'
                              ? 'أصناف السلة'
                              : 'Cart Items'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {cart.reduce((s, c) => s + c.quantity, 0)}{' '}
                {language === 'es'
                  ? 'artículos'
                  : language === 'fr'
                    ? 'articles'
                    : language === 'de'
                      ? 'Artikel'
                      : language === 'it'
                        ? 'articoli'
                        : language === 'pt'
                          ? 'itens'
                          : language === 'nl'
                            ? 'items'
                            : language === 'ar'
                              ? 'أصناف'
                              : 'items'}
              </span>
            </h4>

            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-color)',
                }}
              >
                <ShoppingBag
                  size={32}
                  style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '0.5rem' }}
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {USER_TRANSLATIONS[language].emptyCart || 'Your cart is empty.'}
                </p>
                <p
                  style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}
                >
                  {language === 'es'
                    ? 'Selecciona alimentos del catálogo.'
                    : language === 'fr'
                      ? 'Sélectionnez des articles dans le catalogue.'
                      : language === 'de'
                        ? 'Wählen Sie Speisen aus dem Katalog.'
                        : language === 'it'
                          ? 'Seleziona articoli dal catalogo.'
                          : language === 'pt'
                            ? 'Selecione alimentos do catálogo.'
                            : language === 'nl'
                              ? 'Selecteer gerechten uit de catalogus.'
                              : language === 'ar'
                                ? 'اختر أصناف الطعام من القائمة.'
                                : 'Select food items from the catalog.'}
                </p>
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
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.stallName} • ${item.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        aria-label={`${USER_TRANSLATIONS[language].decreaseQuantity}: ${item.name}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)',
                          border: 'none',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Minus size={10} aria-hidden="true" />
                      </button>
                      <span
                        aria-live="polite"
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          width: '20px',
                          textAlign: 'center',
                        }}
                      >
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        aria-label={`${USER_TRANSLATIONS[language].increaseQuantity}: ${item.name}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)',
                          border: 'none',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={10} aria-hidden="true" />
                      </button>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          marginLeft: '0.5rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-red)',
                          cursor: 'pointer',
                        }}
                        aria-label={`${USER_TRANSLATIONS[language].removeItem}: ${item.name}`}
                        title={USER_TRANSLATIONS[language].removeItem}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Seating Details */}
          {cart.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                padding: '0.85rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                🏟️{' '}
                {language === 'es'
                  ? 'Detalles de Entrega en el Estadio'
                  : language === 'fr'
                    ? 'Détails de Livraison au Stade'
                    : language === 'de'
                      ? 'Stadion-Lieferdetails'
                      : language === 'it'
                        ? 'Dettagli di Consegna allo Stadio'
                        : language === 'pt'
                          ? 'Detalhes de Entrega no Estádio'
                          : language === 'nl'
                            ? 'Stadion Bezorgdetails'
                            : language === 'ar'
                              ? 'تفاصيل التوصيل في الملعب'
                              : 'Stadium Delivery Details'}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label
                    htmlFor="cart-stand-input"
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Stand / Section
                  </label>
                  <input
                    id="cart-stand-input"
                    type="text"
                    required
                    placeholder={USER_TRANSLATIONS[language].standPlaceholder}
                    value={standName}
                    onChange={(e) => setStandName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(3,7,18,0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.6rem',
                      color: 'white',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="cart-seat-input"
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Seat Number
                  </label>
                  <input
                    id="cart-seat-input"
                    type="text"
                    required
                    placeholder={USER_TRANSLATIONS[language].seatPlaceholder}
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(3,7,18,0.4)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.6rem',
                      color: 'white',
                      fontSize: '0.8rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTempStandName(standName || 'West Stand');
                  setTempSeatNumber(seatNumber || 'A-1');
                  setShowSeatMapModal(true);
                }}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  marginTop: '0.4rem',
                }}
              >
                🗺️{' '}
                {language === 'es'
                  ? 'Seleccionar Asiento en el Mapa'
                  : language === 'fr'
                    ? 'Choisir sur le plan'
                    : language === 'de'
                      ? 'Sitzplan öffnen'
                      : language === 'it'
                        ? 'Mappa dei posti'
                        : language === 'pt'
                          ? 'Ver no mapa'
                          : language === 'nl'
                            ? 'Sitzplan openen'
                            : language === 'ar'
                              ? 'اختر مقعدك على الخريطة'
                              : 'Select Seat on Map'}
              </button>
            </div>
          )}

          {/* Order Notes (only show if items exist) */}
          {cart.length > 0 && (
            <div>
              <label
                htmlFor="cart-notes-input"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                }}
              >
                {USER_TRANSLATIONS[language].notesLabel || 'Special Notes / Instructions'}
              </label>
              <textarea
                id="cart-notes-input"
                className="input-field"
                placeholder={
                  USER_TRANSLATIONS[language].notesPlaceholder || 'e.g. Extra sauce, no onions...'
                }
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                rows={2}
                style={{ resize: 'none', fontFamily: 'inherit', fontSize: '0.8rem' }}
              />
            </div>
          )}

          {/* Wallet Transactions History List */}
          <div>
            <h4
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <History size={14} />{' '}
              {language === 'es'
                ? 'Historial de Transacciones de Billetera'
                : language === 'fr'
                  ? 'Historique des transactions du portefeuille'
                  : language === 'de'
                    ? 'Wallet-Transaktionsverlauf'
                    : language === 'it'
                      ? 'Cronologia delle transazioni del portafoglio'
                      : language === 'pt'
                        ? 'Histórico de Transações da Carteira'
                        : language === 'nl'
                          ? 'Wallet Transactiegeschiedenis'
                          : language === 'ar'
                            ? 'سجل معاملات المحفظة'
                            : 'Wallet Transaction History'}
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '180px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {wallet.transactions.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {language === 'es'
                    ? 'No se registraron transacciones.'
                    : language === 'fr'
                      ? 'Aucune transaction enregistrée.'
                      : language === 'de'
                        ? 'Keine Transaktionen aufgezeichnet.'
                        : language === 'it'
                          ? 'Nessuna transazione registrata.'
                          : language === 'pt'
                            ? 'Nenhuma transação registrada.'
                            : language === 'nl'
                              ? 'Geen transacties geregistreerd.'
                              : language === 'ar'
                                ? 'لم يتم تسجيل أي معاملات.'
                                : 'No transactions recorded.'}
                </p>
              ) : (
                wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      padding: '0.5rem',
                      background: 'rgba(3,7,18,0.2)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                      <p
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tx.description.includes('Loaded funds')
                          ? language === 'es'
                            ? 'Fondos cargados a través de pasarela simulada'
                            : language === 'fr'
                              ? 'Fonds chargés via une passerelle simulée'
                              : language === 'de'
                                ? 'Guthaben über simulierte Schnittstelle aufgeladen'
                                : language === 'it'
                                  ? 'Fondi caricati tramite gateway simulato'
                                  : language === 'pt'
                                    ? 'Saldo carregado via gateway simulado'
                                    : language === 'nl'
                                      ? 'Geld opgeladen via gesimuleerde gateway'
                                      : language === 'ar'
                                        ? 'تم شحن الرصيد عبر بوابة الدفع'
                                        : tx.description
                          : tx.description.includes('Multi-kiosk food purchase')
                            ? language === 'es'
                              ? `Compra en puestos (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                              : language === 'fr'
                                ? `Achat multi-kiosques (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                : language === 'de'
                                  ? `Kauf an mehreren Kiosken (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                  : language === 'it'
                                    ? `Acquisto chioschi multipli (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                    : language === 'pt'
                                      ? `Compra em quiosques (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                      : language === 'nl'
                                        ? `Multi-kiosk aankoop (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                        : language === 'ar'
                                          ? `شراء من عدة أكشاك (${tx.description.split('(')[1]?.split(')')[0] || ''})`
                                          : tx.description
                            : tx.description.includes('Refund')
                              ? language === 'es'
                                ? 'Reembolso por pedido cancelado'
                                : language === 'fr'
                                  ? 'Remboursement de commande annulée'
                                  : language === 'de'
                                    ? 'Rückerstattung für stornierte Bestellung'
                                    : language === 'it'
                                      ? 'Rimborso per ordine annullato'
                                      : language === 'pt'
                                        ? 'Reembolso por pedido cancelado'
                                        : language === 'nl'
                                          ? 'Terugbetaling voor geannuleerde bestelling'
                                          : language === 'ar'
                                            ? 'استرداد قيمة الطلب الملغى'
                                            : tx.description
                              : tx.description}
                      </p>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                        {new Date(tx.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <strong
                      style={{
                        color: tx.type === 'load' || tx.type === 'refund' ? '#34d399' : '#f87171',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tx.type === 'load' || tx.type === 'refund' ? '+' : '-'}$
                      {tx.amount.toFixed(2)}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Checkout Footer */}
        {cart.length > 0 && (
          <div
            style={{
              padding: '1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'rgba(3, 7, 18, 0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                fontSize: '0.95rem',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                {USER_TRANSLATIONS[language].total || 'Total'}:
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>
                ${cartTotal.toFixed(2)}
              </strong>
            </div>

            {wallet.balance < cartTotal && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Info size={14} />
                <span>
                  {USER_TRANSLATIONS[language].insufficientFunds ||
                    'Insufficient funds! Please top up above.'}
                </span>
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
                cursor: wallet.balance < cartTotal ? 'not-allowed' : 'pointer',
              }}
            >
              {language === 'es'
                ? 'Confirmar y Realizar Pedido'
                : language === 'fr'
                  ? 'Confirmer & Passer Commande'
                  : language === 'de'
                    ? 'Bestätigen & Bestellen'
                    : language === 'it'
                      ? 'Conferma e Invia Ordine'
                      : language === 'pt'
                        ? 'Confirmar e Fazer Pedido'
                        : language === 'nl'
                          ? 'Bevestigen & Bestellen'
                          : language === 'ar'
                            ? 'تأكيد وتقديم الطلب'
                            : 'Confirm & Place Order'}{' '}
              (${cartTotal.toFixed(2)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
