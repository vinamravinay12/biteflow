import React, { useState, useEffect } from 'react';
import { db } from '../utils/database';
import type { Stall, MenuItem, Order, OrderStatus, OrderLineItem, UserWallet, Match } from '../types';
import { USER_TRANSLATIONS, CUSTOMER_LOCALES, type LanguageCode } from '../utils/translations';
import { parseAiResponse, getMatchingItems } from '../utils/aiActions';
import { computeCartTotal, groupCartByKiosk } from '../utils/cart';
import { useDocumentLanguage } from '../utils/useDocumentLanguage';
import {
  Search, ShoppingBag, Wallet, Plus, Minus, Trash2, Clock,
  History, Sparkles, ChevronRight, Info, CheckCircle, X,
  LogOut, User, Lock, Mail, Calendar, Eye, EyeOff
} from 'lucide-react';
import { auth } from '../utils/firebase';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';

interface CustomerPortalProps {
  onBackToAdmin?: () => void;
}

interface AuthedUser {
  uid: string;
  email: string;
  displayName: string;
}

// This customer's own slice of a (possibly multi-kiosk) order, flattened for display.
interface KioskOrderView {
  orderId: string;
  kioskId: string;
  kioskName: string;
  items: OrderLineItem[];
  subtotal: number;
  status: OrderStatus;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedItems?: MenuItem[];
  showCheckoutAction?: boolean;
}

const TRANSLATIONS = {
  en: {
    greeting: USER_TRANSLATIONS.en.aiGreeting,
    noItems: USER_TRANSLATIONS.en.aiNoItems,
    foundItems: USER_TRANSLATIONS.en.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.en.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.en.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.en.aiHelp,
    invalidQty: USER_TRANSLATIONS.en.aiInvalidQty
  },
  es: {
    greeting: USER_TRANSLATIONS.es.aiGreeting,
    noItems: USER_TRANSLATIONS.es.aiNoItems,
    foundItems: USER_TRANSLATIONS.es.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.es.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.es.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.es.aiHelp,
    invalidQty: USER_TRANSLATIONS.es.aiInvalidQty
  },
  pt: {
    greeting: USER_TRANSLATIONS.pt.aiGreeting,
    noItems: USER_TRANSLATIONS.pt.aiNoItems,
    foundItems: USER_TRANSLATIONS.pt.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.pt.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.pt.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.pt.aiHelp,
    invalidQty: USER_TRANSLATIONS.pt.aiInvalidQty
  },
  fr: {
    greeting: USER_TRANSLATIONS.fr.aiGreeting,
    noItems: USER_TRANSLATIONS.fr.aiNoItems,
    foundItems: USER_TRANSLATIONS.fr.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.fr.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.fr.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.fr.aiHelp,
    invalidQty: USER_TRANSLATIONS.fr.aiInvalidQty
  },
  it: {
    greeting: USER_TRANSLATIONS.it.aiGreeting,
    noItems: USER_TRANSLATIONS.it.aiNoItems,
    foundItems: USER_TRANSLATIONS.it.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.it.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.it.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.it.aiHelp,
    invalidQty: USER_TRANSLATIONS.it.aiInvalidQty
  },
  de: {
    greeting: USER_TRANSLATIONS.de.aiGreeting,
    noItems: USER_TRANSLATIONS.de.aiNoItems,
    foundItems: USER_TRANSLATIONS.de.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.de.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.de.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.de.aiHelp,
    invalidQty: USER_TRANSLATIONS.de.aiInvalidQty
  },
  nl: {
    greeting: USER_TRANSLATIONS.nl.aiGreeting,
    noItems: USER_TRANSLATIONS.nl.aiNoItems,
    foundItems: USER_TRANSLATIONS.nl.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.nl.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.nl.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.nl.aiHelp,
    invalidQty: USER_TRANSLATIONS.nl.aiInvalidQty
  },
  ar: {
    greeting: USER_TRANSLATIONS.ar.aiGreeting,
    noItems: USER_TRANSLATIONS.ar.aiNoItems,
    foundItems: USER_TRANSLATIONS.ar.aiFoundItems,
    askQuantity: (name: string) => `${USER_TRANSLATIONS.ar.aiAskQuantity} ("${name}")`,
    confirmed: (qty: number, name: string) => `${USER_TRANSLATIONS.ar.aiConfirmed} (${qty}x "${name}")`,
    help: USER_TRANSLATIONS.ar.aiHelp,
    invalidQty: USER_TRANSLATIONS.ar.aiInvalidQty
  }
};

const CHAT_FLOW_TRANSLATIONS = {
  en: {
    moreQuestion: USER_TRANSLATIONS.en.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.en.aiAskPayment,
    doneKeywords: ['done', "that's it", 'no more', 'enough', 'checkout', 'pay', 'ready', 'no thank', 'nothing else', 'no', 'finished', 'stop'],
    invalidSeating: USER_TRANSLATIONS.en.aiInvalidSeating
  },
  es: {
    moreQuestion: USER_TRANSLATIONS.es.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.es.aiAskPayment,
    doneKeywords: ['listo', 'ya está', 'suficiente', 'nada más', 'pagar', 'terminar', 'no gracias', 'no', 'nada mas', 'terminado', 'hecho'],
    invalidSeating: USER_TRANSLATIONS.es.aiInvalidSeating
  },
  pt: {
    moreQuestion: USER_TRANSLATIONS.pt.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.pt.aiAskPayment,
    doneKeywords: ['pronto', 'chega', 'suficiente', 'nada mais', 'pagar', 'fechar', 'não obrigado', 'nao', 'não', 'nada mais', 'terminado'],
    invalidSeating: USER_TRANSLATIONS.pt.aiInvalidSeating
  },
  fr: {
    moreQuestion: USER_TRANSLATIONS.fr.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.fr.aiAskPayment,
    doneKeywords: ['fini', "c'est tout", 'assez', 'payer', 'terminer', 'non merci', 'non', 'rien d\'autre', 'payer'],
    invalidSeating: USER_TRANSLATIONS.fr.aiInvalidSeating
  },
  it: {
    moreQuestion: USER_TRANSLATIONS.it.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.it.aiAskPayment,
    doneKeywords: ['finito', 'a posto', 'abbastanza', 'pagare', 'nient\'altro', 'no grazie', 'no', 'niente altro', 'pronto'],
    invalidSeating: USER_TRANSLATIONS.it.aiInvalidSeating
  },
  de: {
    moreQuestion: USER_TRANSLATIONS.de.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.de.aiAskPayment,
    doneKeywords: ['fertig', 'das wars', 'genug', 'bezahlen', 'bestellen', 'nein danke', 'nein', 'fertig', 'stop'],
    invalidSeating: USER_TRANSLATIONS.de.aiInvalidSeating
  },
  nl: {
    moreQuestion: USER_TRANSLATIONS.nl.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.nl.aiAskPayment,
    doneKeywords: ['klaar', 'dat was het', 'niets meer', 'genoeg', 'afrekenen', 'betalen', 'gereed', 'nee bedankt', 'nee', 'klaar', 'stop'],
    invalidSeating: USER_TRANSLATIONS.nl.aiInvalidSeating
  },
  ar: {
    moreQuestion: USER_TRANSLATIONS.ar.aiMoreQuestion,
    askPayment: USER_TRANSLATIONS.ar.aiAskPayment,
    doneKeywords: ['خلاص', 'انتهيت', 'تم', 'يكفي', 'دفع', 'حساب', 'جاهز', 'لا شكرا', 'لا', 'خلصت'],
    invalidSeating: USER_TRANSLATIONS.ar.aiInvalidSeating
  }
};

const getConfirmPasswordLabel = (lang: string): string => {
  switch (lang) {
    case 'es': return 'Confirmar Contraseña';
    case 'fr': return 'Confirmer le mot de passe';
    case 'de': return 'Passwort bestätigen';
    case 'it': return 'Conferma Password';
    case 'pt': return 'Confirmar Senha';
    case 'nl': return 'Wachtwoord Bevestigen';
    case 'ar': return 'تأكيد كلمة المرور';
    default: return 'Confirm Password';
  }
};

export const CustomerPortal: React.FC<CustomerPortalProps> = () => {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [wallet, setWallet] = useState<UserWallet>({ uid: '', balance: 0, transactions: [] });
  const [activeOrders, setActiveOrders] = useState<KioskOrderView[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');
  const [language, setLanguage] = useState<LanguageCode>('en');
  useDocumentLanguage(language);

  // Delivery & Match states
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [standName, setStandName] = useState<string>('');
  const [seatNumber, setSeatNumber] = useState<string>('');
  const [hasSubmittedMatchDetails, setHasSubmittedMatchDetails] = useState<boolean>(false);

  // AI Concierge Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{ item: MenuItem; quantity: number; lang: LanguageCode } | null>(null);
  const [showVisualMenu, setShowVisualMenu] = useState(false);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  // Authentication State
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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
      const customerUid = db.getCustomerUid();
      const [fetchedStalls, fetchedItems, fetchedWallet, myOrders, fetchedMatches] = await Promise.all([
        db.getStalls(),
        db.getMenuItems(),
        db.getWallet(customerUid),
        db.getOrders(customerUid),
        db.getMatches()
      ]);

      setStalls(fetchedStalls);
      setMenuItems(fetchedItems);
      setWallet(fetchedWallet);
      setMatches(fetchedMatches);
      setOrders(myOrders);

      // An order can span multiple kiosks; flatten to one card per kiosk slice.
      const kioskViews: KioskOrderView[] = myOrders.flatMap(o =>
        Object.values(o.kioskOrders).map(entry => ({
          orderId: o.id,
          kioskId: entry.kioskId,
          kioskName: entry.kioskName,
          items: entry.items,
          subtotal: entry.subtotal,
          status: entry.status
        }))
      );
      setActiveOrders(kioskViews);
    } catch (e) {
      console.error("Failed to load customer hub data:", e);
    }
  };

  // Persists the resolved identity (uid + name) so every db.* call made
  // elsewhere in this component reads/writes the right customer's data.
  const applyCustomerIdentity = async (uid: string, name: string, email: string) => {
    db.setCustomerUid(uid);
    db.setCustomerName(name);
    await db.ensureUserProfile(uid, 'customer', email, name);
  };
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthError(
        language === 'es' ? 'Las contraseñas no coinciden.' :
        language === 'fr' ? 'Les mots de passe ne correspondent pas.' :
        language === 'de' ? 'Passwörter stimmen nicht überein.' :
        language === 'it' ? 'Le password non coincidono.' :
        language === 'pt' ? 'As senhas não coincidem.' :
        language === 'nl' ? 'Wachtwoorden komen niet overeen.' :
        language === 'ar' ? 'كلمات المرور غير متطابقة.' :
        'Passwords do not match.'
      );
      setAuthLoading(false);
      return;
    }

    if (auth) {
      try {
        if (authMode === 'login') {
          const userCredential = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
          const name = userCredential.user.displayName || userCredential.user.email || 'Customer';
          const email = userCredential.user.email || '';
          await applyCustomerIdentity(userCredential.user.uid, name, email);
          setUser({ uid: userCredential.user.uid, email, displayName: name });
        } else {
          if (!authDisplayName.trim()) {
            setAuthError('Please enter your full name.');
            setAuthLoading(false);
            return;
          }
          const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
          await updateProfile(userCredential.user, { displayName: authDisplayName.trim() });
          const email = userCredential.user.email || '';
          await applyCustomerIdentity(userCredential.user.uid, authDisplayName.trim(), email);
          setUser({ uid: userCredential.user.uid, email, displayName: authDisplayName.trim() });
        }
        await loadData();
      } catch (err: any) {
        console.error("Firebase auth error:", err);
        setAuthError(err.message || 'Authentication failed. Please check your credentials.');
      } finally {
        setAuthLoading(false);
      }
    } else {
      try {
        const users = JSON.parse(localStorage.getItem('foodcourt_sandbox_users') || '[]');
        if (authMode === 'login') {
          const found = users.find((u: any) => u.email.toLowerCase() === authEmail.trim().toLowerCase() && u.password === authPassword);
          if (found) {
            if (!found.uid) {
              found.uid = crypto.randomUUID();
              localStorage.setItem('foodcourt_sandbox_users', JSON.stringify(users));
            }
            localStorage.setItem('sandbox_logged_in_user', JSON.stringify(found));
            await applyCustomerIdentity(found.uid, found.displayName, found.email);
            setUser(found);
            await loadData();
          } else {
            setAuthError('Invalid email or password. Sign up first!');
          }
        } else {
          if (!authDisplayName.trim()) {
            setAuthError('Please enter your full name.');
            setAuthLoading(false);
            return;
          }
          const exists = users.some((u: any) => u.email.toLowerCase() === authEmail.trim().toLowerCase());
          if (exists) {
            setAuthError('Email already registered.');
            setAuthLoading(false);
            return;
          }
          const newUser = {
            uid: crypto.randomUUID(),
            email: authEmail.trim(),
            password: authPassword,
            displayName: authDisplayName.trim()
          };
          users.push(newUser);
          localStorage.setItem('foodcourt_sandbox_users', JSON.stringify(users));
          localStorage.setItem('sandbox_logged_in_user', JSON.stringify(newUser));
          await applyCustomerIdentity(newUser.uid, newUser.displayName, newUser.email);
          setUser(newUser);
          await loadData();
        }
      } catch (err: any) {
        setAuthError('Sandbox authentication failed.');
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (err) {
        console.error("Firebase logout failed:", err);
      }
    } else {
      localStorage.removeItem('sandbox_logged_in_user');
      setUser(null);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (auth) {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
        if (firebaseUser) {
          const name = firebaseUser.displayName || firebaseUser.email || 'Customer';
          const email = firebaseUser.email || '';
          await applyCustomerIdentity(firebaseUser.uid, name, email);
          setUser({ uid: firebaseUser.uid, email, displayName: name });
        } else {
          setUser(null);
        }
      });
    } else {
      const savedUser = localStorage.getItem('sandbox_logged_in_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (!parsed.uid) {
            parsed.uid = crypto.randomUUID();
            localStorage.setItem('sandbox_logged_in_user', JSON.stringify(parsed));
          }
          applyCustomerIdentity(parsed.uid, parsed.displayName, parsed.email);
          setUser(parsed);
        } catch (e) {
          localStorage.removeItem('sandbox_logged_in_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Poll for updates only if user is logged in
  useEffect(() => {
    if (!user) return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Initialize AI chatbot greeting
  useEffect(() => {
    if (hasSubmittedMatchDetails && user) {
      const helloMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: TRANSLATIONS[language].greeting,
        timestamp: new Date().toISOString()
      };
      setChatMessages([helloMsg]);
      setPendingConfirmation(null);
    }
  }, [hasSubmittedMatchDetails, user, language]);

  const addToCart = (item: MenuItem, qty: number = 1) => {
    if (!item.isAvailable) return;
    setCart(prevCart => {
      const existing = prevCart.find(c => c.item.id === item.id);
      if (existing) {
        return prevCart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prevCart, { item, quantity: qty }];
    });
    // Open sidebar automatically is disabled per user request
    // setShowCart(true);
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

  const handleAddFromChatCard = async (item: MenuItem) => {
    addToCart(item, 1);
    setAiTyping(true);

    if (geminiApiKey.trim()) {
      // Use Gemini to confirm in the user's language
      try {
        const confirmPrompt = `The user just added 1x "${item.name}" ($${item.price}) to their cart. Confirm this addition and ask if they want to order more or are done. Keep it short (1-2 sentences). Reply in the SAME language the conversation has been in so far.`;
        const rawResponse = await callGeminiAPI(confirmPrompt, chatMessages, geminiApiKey, language);
        let parsedText = rawResponse.replace(/\[ITEMS:\s*\[[^\]]*\]\]/, '').replace('[SHOW_CHECKOUT]', '').trim();

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: parsedText,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiMsg]);
        setAiTyping(false);
        return;
      } catch (err) {
        console.error('Gemini follow-up failed, using fallback:', err);
      }
    }

    // Fallback for non-Gemini mode
    const lang = language;
    
    setTimeout(() => {
      const confirmText = TRANSLATIONS[lang].confirmed(1, item.name);
      const moreQuestionText = CHAT_FLOW_TRANSLATIONS[lang].moreQuestion;
      
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `${confirmText} ${moreQuestionText}`,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, aiMsg]);
      setAiTyping(false);
    }, 600);
  };

  const callGeminiAPI = async (text: string, history: ChatMessage[], apiKey: string, currentLang: string): Promise<string> => {
    const activeMenuInfo = filteredMenuItems.map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      stallName: i.stallName,
      category: i.category,
      description: i.description
    }));

    const systemInstruction = `You are BiteFlow AI Concierge, a stadium food court assistant.
You help customers browse and order food from kiosks active for their match.
The active kiosks and their menu items are:
${JSON.stringify(activeMenuInfo)}

Rules:
1. You MUST write all your responses, greetings, questions, recommendations, and item addition confirmations in the user's selected language: "${currentLang}", UNLESS the user starts speaking to you in a different language (e.g. if they speak to you in Hindi/Hinglish, you MUST reply in Hindi/Hinglish). Under no circumstances should you reply in English unless "${currentLang}" is "en" or the user speaks to you in English/Hinglish.
2. Recommend matching items. Suggest 1 to 4 items.
3. Once an item is selected/added, ask the user: "Is this enough or would you like to order more?" (translated into the current conversation language).
4. If the user indicates they are done, finished, or want to pay/checkout, reply asking "Should I proceed with the payment?" (translated into the current conversation language) and you MUST append [SHOW_CHECKOUT] at the very end of your response.
5. For suggesting items, you MUST append [ITEMS: ["id1", "id2"]] at the very end of your response.
6. If the user explicitly lists items they want to add to their cart, order, or buy, you MUST automatically add them to their cart by appending [ADD_TO_CART: [{"id": "item_id", "quantity": count}]] at the very end of your response. If they didn't specify quantity, assume 1. Always confirm to the user which items you have added (translated into the current conversation language).`;

    const contents = [];
    const recentHistory = history.slice(-6);
    recentHistory.forEach(h => {
      contents.push({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      });
    });

    contents.push({
      role: 'user',
      parts: [{ text }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput('');
    setAiTyping(true);

    // Check if we can use the live Gemini API
    if (geminiApiKey.trim()) {
      try {
        const rawResponse = await callGeminiAPI(text, chatMessages, geminiApiKey, language);

        // Parse control tags (ADD_TO_CART / ITEMS / SHOW_CHECKOUT) and strip
        // them from the visible text. Only additions that resolve to a real,
        // in-scope menu item are honoured — the model can't inject arbitrary ids.
        const parsed = parseAiResponse(rawResponse, filteredMenuItems);
        parsed.cartAdditions.forEach(add => {
          const item = filteredMenuItems.find(i => i.id === add.id);
          if (item) addToCart(item, add.quantity);
        });

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: parsed.text,
          timestamp: new Date().toISOString(),
          suggestedItems: parsed.suggestedItems.length > 0 ? parsed.suggestedItems : undefined,
          showCheckoutAction: parsed.showCheckout
        };

        setChatMessages(prev => [...prev, aiMsg]);
        setAiTyping(false);
        return;
      } catch (err) {
        console.error('Gemini API call failed, falling back to local simulated response:', err);
      }
    }

    // Local Fallback simulation
    setTimeout(() => {
      const lang = language;
      let aiResponseText = '';
      let suggestedItems: MenuItem[] = [];
      let nextPendingConfirmation = null;
      let shouldShowCheckout = false;

      const lower = text.toLowerCase();
      const isDone = CHAT_FLOW_TRANSLATIONS[lang].doneKeywords.some(keyword => lower.includes(keyword));

      if (isDone) {
        aiResponseText = CHAT_FLOW_TRANSLATIONS[lang].askPayment;
        shouldShowCheckout = true;
      } else if (pendingConfirmation) {
        const isYes = lower.includes('yes') || lower.includes('sí') || lower.includes('si') || lower.includes('sim') || lower.includes('oui') || lower.includes('ok') || lower.includes('confirm');
        const qtyMatch = text.match(/\b\d+\b/);
        
        if (isYes || qtyMatch) {
          const qty = qtyMatch ? parseInt(qtyMatch[0]) : pendingConfirmation.quantity;
          
          addToCart(pendingConfirmation.item, qty);
          const confirmText = TRANSLATIONS[pendingConfirmation.lang].confirmed(qty, pendingConfirmation.item.name);
          const moreQuestionText = CHAT_FLOW_TRANSLATIONS[pendingConfirmation.lang].moreQuestion;
          aiResponseText = `${confirmText} ${moreQuestionText}`;
          setPendingConfirmation(null);
        } else {
          const matches = getMatchingItems(text, filteredMenuItems);
          if (matches.length === 0) {
            aiResponseText = TRANSLATIONS[lang].noItems;
          } else if (matches.length === 1) {
            const item = matches[0];
            aiResponseText = TRANSLATIONS[lang].askQuantity(item.name);
            nextPendingConfirmation = { item, quantity: 1, lang };
            suggestedItems = [item];
          } else {
            aiResponseText = TRANSLATIONS[lang].foundItems;
            suggestedItems = matches;
          }
        }
      } else {
        // Standard search
        const matches = getMatchingItems(text, filteredMenuItems);
        if (matches.length === 0) {
          aiResponseText = TRANSLATIONS[lang].noItems;
        } else if (matches.length === 1) {
          const item = matches[0];
          aiResponseText = TRANSLATIONS[lang].askQuantity(item.name);
          nextPendingConfirmation = { item, quantity: 1, lang };
          suggestedItems = [item];
        } else {
          aiResponseText = TRANSLATIONS[lang].foundItems;
          suggestedItems = matches;
        }
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toISOString(),
        suggestedItems: suggestedItems.length > 0 ? suggestedItems : undefined,
        showCheckoutAction: shouldShowCheckout
      };

      setChatMessages(prev => [...prev, aiMsg]);
      if (nextPendingConfirmation) {
        setPendingConfirmation(nextPendingConfirmation);
      } else {
        setPendingConfirmation(null);
      }
      setAiTyping(false);
    }, 1000);
  };

  const cartTotal = computeCartTotal(cart);

  // Top Up Wallet
  const handleTopUp = async (amount: number) => {
    setLoadingFunds(true);
    setLoadAmount(amount);
    
    // Simulate payment processing delay
    setTimeout(async () => {
      const updatedWallet = await db.loadWalletFunds(db.getCustomerUid(), amount);
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

    if (!standName.trim()) {
      alert('Please specify your Stand / Section in the cart delivery details.');
      return;
    }
    if (!seatNumber.trim()) {
      alert('Please specify your Seat Number in the cart delivery details.');
      return;
    }

    const customerUid = db.getCustomerUid();
    const customerName = db.getCustomerName();
    const orderTime = new Date().toISOString();

    // Group cart items by kiosk (stall) — one order can span multiple kiosks,
    // each tracking its own fulfillment status independently.
    const kioskOrders = groupCartByKiosk(cart);

    const activeMatch = matches.find(m => m.id === selectedMatchId);

    const order: Order = {
      id: `ord-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
      customerUid,
      customerName,
      matchId: selectedMatchId || undefined,
      matchName: activeMatch?.name,
      matchCity: activeMatch?.city,
      matchDateTime: activeMatch?.dateTime,
      stand: standName.trim(),
      seatNumber: seatNumber.trim(),
      kioskIds: Object.keys(kioskOrders),
      kioskOrders,
      totalAmount: cartTotal,
      orderTime,
      notes: checkoutNotes.trim() || undefined
    };

    // Save the order in the database
    await db.placeOrder(order);

    // Deduct wallet funds
    const description = `Multi-kiosk food purchase (${Object.values(kioskOrders).map(k => k.kioskName).join(', ')})`;
    await db.deductWalletFunds(customerUid, cartTotal, description);

    // Record last order for success modal
    setLastOrderDetails({
      id: order.id,
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

  const activeMatch = matches.find(m => m.id === selectedMatchId);
  const activeMatchStallIds = activeMatch ? (activeMatch.stallIds || []) : [];
  const availableStalls = stalls.filter(s => activeMatchStallIds.includes(s.id));

  // Filter items
  const filteredMenuItems = menuItems.filter(item => {
    // Only show items from stalls assigned to the active match
    const isStallInMatch = activeMatchStallIds.includes(item.stallId);
    if (!isStallInMatch) return false;

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStall = selectedStallId === 'all' || item.stallId === selectedStallId;
    const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesStall && matchesCategory;
  });

  // Helper for order progress bar
  const getProgressPercentage = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 25;
      case 'preparing': return 50;
      case 'ready': return 75;
      case 'completed': return 100;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '460px', margin: '4rem auto 2rem', padding: '1.5rem', width: '100%' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="glass-panel-glow" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative' }}>
          
          {/* Language Selector in top right */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.3rem 0.5rem' }}>
              <span style={{ fontSize: '0.8rem' }}>🌐</span>
              <select
                value={language}
                aria-label="Select language"
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                {Object.entries(CUSTOMER_LOCALES).map(([code, loc]) => (
                  <option key={code} value={code} style={{ color: 'black' }}>
                    {loc.flag} {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🍔</span>
            <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'white' }}>
              Biteflow
            </h2>
          </div>

          {/* Tabs for Login / Register */}
          <div style={{ display: 'flex', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.25rem', marginBottom: '1.5rem' }}>
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'login' ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' : 'transparent',
                color: authMode === 'login' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {USER_TRANSLATIONS[language].signInTab}
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? 'linear-gradient(135deg, var(--accent-cyan), #0284c7)' : 'transparent',
                color: authMode === 'register' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {USER_TRANSLATIONS[language].signUpTab}
            </button>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={14} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {authMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{USER_TRANSLATIONS[language].displayNameLabel}</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Mercer"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    style={{ paddingLeft: '2.5rem', width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.5rem', color: 'white' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{USER_TRANSLATIONS[language].emailLabel}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="name@campus.edu"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.5rem', color: 'white' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{USER_TRANSLATIONS[language].passwordLabel}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type={showAuthPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 2.5rem 0.6rem 2.5rem', color: 'white', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  aria-label={showAuthPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showAuthPassword}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showAuthPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {getConfirmPasswordLabel(language)}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 2.5rem 0.6rem 2.5rem', color: 'white', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showConfirmPassword}
                    style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {authLoading ? (
                <span>Loading...</span>
              ) : (
                <span>{authMode === 'login' ? USER_TRANSLATIONS[language].signInTab : USER_TRANSLATIONS[language].signUpTab}</span>
              )}
            </button>
          </form>

          {!auth && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {USER_TRANSLATIONS[language].tipText}
              </p>
            </div>
          )}

        </div>
      </div>
    );
  }

  if (user && !hasSubmittedMatchDetails) {
    return (
      <div style={{ maxWidth: '520px', margin: '4rem auto 2rem', padding: '1.5rem', width: '100%' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="glass-panel-glow" style={{ padding: '2.5rem', borderRadius: '24px', position: 'relative' }}>
          
          {/* Language Selector in top right */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.3rem 0.5rem' }}>
              <span style={{ fontSize: '0.8rem' }}>🌐</span>
              <select
                value={language}
                aria-label="Select language"
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                {Object.entries(CUSTOMER_LOCALES).map(([code, loc]) => (
                  <option key={code} value={code} style={{ color: 'black' }}>
                    {loc.flag} {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>{USER_TRANSLATIONS[language].rosterTitle} 🏟️</span>
            <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'white' }}>
              {USER_TRANSLATIONS[language].selectGameTitle}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {USER_TRANSLATIONS[language].selectGameDesc}
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedMatchId) {
                alert('Please select a match.');
                return;
              }
              setHasSubmittedMatchDetails(true);
            }} 
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {USER_TRANSLATIONS[language].selectMatchLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <select
                  required
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.6rem 0.6rem 2.5rem', color: 'white' }}
                >
                  <option value="" style={{ color: 'black' }}>{USER_TRANSLATIONS[language].selectMatchPlaceholder}</option>
                  {matches.map(m => (
                    <option key={m.id} value={m.id} style={{ color: 'black' }}>
                      {m.name} ({m.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }}
            >
              {USER_TRANSLATIONS[language].enterStadiumButton}
            </button>
          </form>

          {/* Optional Logout Link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button 
              onClick={handleLogout} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            >
              {USER_TRANSLATIONS[language].switchAccountLink}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', animation: 'slide-up 0.4s ease' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
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
            Biteflow <span style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', background: 'rgba(6,182,212,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.2)' }}>{selectedMatchId ? USER_TRANSLATIONS[language].liveDeliveryLabel : USER_TRANSLATIONS[language].simulatorLabel}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {USER_TRANSLATIONS[language].welcomeBack}, <strong>{user?.displayName || db.getCustomerName()}</strong>! {USER_TRANSLATIONS[language].orderDesc}
            <button 
              onClick={handleLogout}
              style={{
                color: 'var(--accent-red)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                marginLeft: '0.5rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={12} /> {USER_TRANSLATIONS[language].logoutButton}
            </button>
          </p>
          
          {selectedMatchId && (
            <div 
              style={{ 
                marginTop: '1.25rem', 
                background: 'rgba(6, 182, 212, 0.08)', 
                border: '1px solid rgba(6, 182, 212, 0.3)', 
                borderRadius: '10px', 
                padding: '0.6rem 1rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🏟️</span>
                <span>
                  {USER_TRANSLATIONS[language].watching}: <strong>{matches.find(m => m.id === selectedMatchId)?.name}</strong> 
                  <span style={{ color: 'var(--text-muted)' }}> | {USER_TRANSLATIONS[language].venue}: <strong>{matches.find(m => m.id === selectedMatchId)?.city}</strong></span>
                  {standName && seatNumber ? (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}> | Stand: <strong>{standName}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}> | Seat: <strong>{seatNumber}</strong></span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--accent-orange)' }}> | ⚠️ {USER_TRANSLATIONS[language].seatingNotSet}</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHasSubmittedMatchDetails(false)}
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {USER_TRANSLATIONS[language].changeGame}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.5rem 0.75rem' }}>
            <span style={{ fontSize: '0.9rem' }}>🌐</span>
            <select
              value={language}
              aria-label="Select language"
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {Object.entries(CUSTOMER_LOCALES).map(([code, loc]) => (
                <option key={code} value={code} style={{ color: 'black' }}>
                  {loc.flag} {loc.name}
                </option>
              ))}
            </select>
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
    </div>

      {/* Tab Navigation */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '1rem', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '0.75rem', 
          marginTop: '1.5rem',
          marginBottom: '1rem' 
        }}
      >
        <button 
          onClick={() => setActiveTab('browse')}
          className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🍔 {USER_TRANSLATIONS[language].browseTab}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📋 {USER_TRANSLATIONS[language].ordersTab}
          {activeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
            <span 
              style={{ 
                background: 'var(--accent-red)', 
                color: 'white', 
                fontSize: '0.7rem', 
                padding: '0.15rem 0.45rem', 
                borderRadius: '8px', 
                fontWeight: 800,
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
              }}
            >
              {activeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}
            </span>
          )}
        </button>
      </div>

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {activeTab === 'browse' ? (
          /* Left side: browsing & active tracker */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Orders Status Tracker */}
          {activeOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
            <div className="glass-panel-glow" style={{ padding: '1.5rem', border: '1px solid var(--border-color-glow)' }}>
              <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="var(--accent-cyan)" /> {USER_TRANSLATIONS[language].trackLiveButton}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeOrders
                  .filter(o => o.status !== 'completed' && o.status !== 'cancelled')
                  .map(order => (
                    <div
                      key={`${order.orderId}-${order.kioskId}`}
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
                          <strong style={{ fontSize: '0.95rem' }}>{order.kioskName}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Order #{order.orderId.split('-')[1]}</span>
                        </div>
                        <span className={`badge ${
                          order.status === 'pending' ? 'badge-warning' :
                          order.status === 'preparing' ? 'badge-info' :
                          'badge-success'
                        }`}>
                          {order.status === 'ready' ? USER_TRANSLATIONS[language].progressStepReady : order.status === 'pending' ? USER_TRANSLATIONS[language].progressStepReceived : USER_TRANSLATIONS[language].progressStepPreparing}
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
                        <span style={{ color: order.status === 'pending' ? 'var(--accent-orange)' : '' }}>{USER_TRANSLATIONS[language].progressStepReceived}</span>
                        <span style={{ color: order.status === 'preparing' ? 'var(--accent-cyan)' : '' }}>{USER_TRANSLATIONS[language].progressStepPreparing}</span>
                        <span style={{ color: order.status === 'ready' ? 'var(--accent-green)' : '' }}>{USER_TRANSLATIONS[language].progressStepReady}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* AI Concierge Chat Console */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Sparkles size={18} color="var(--accent-cyan)" /> BiteFlow AI Concierge
                  <span style={{ fontSize: '0.7rem', color: geminiApiKey ? 'var(--accent-green)' : 'var(--accent-orange)', background: geminiApiKey ? 'rgba(52, 211, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: geminiApiKey ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)' }}>
                    {geminiApiKey ? '🤖 Live Gemini 2.5 Flash' : '⚡ Simulated AI'}
                  </span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                  {USER_TRANSLATIONS[language].askLanguagePromptDesc}
                </p>
              </div>
              
              <button
                onClick={() => setShowVisualMenu(!showVisualMenu)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                {showVisualMenu ? '💬 Show AI Chat Only' : '🍽️ Browse Visual Grid'}
              </button>
            </div>

            {!showVisualMenu ? (
              <>
                {/* Chat Message Thread */}
                <div
                  role="log"
                  aria-live="polite"
                  aria-atomic="false"
                  aria-label={USER_TRANSLATIONS[language].aiConciergeTitle || 'AI Concierge conversation'}
                  style={{
                  flex: 1,
                  maxHeight: '380px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '0.5rem',
                  background: 'rgba(3, 7, 18, 0.2)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      style={{ 
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}
                    >
                      <div 
                        style={{
                          background: msg.sender === 'user' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255, 255, 255, 0.03)',
                          border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                          color: 'white',
                          padding: '0.75rem 1rem',
                          borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      >
                        {msg.text}
                      </div>

                      {/* Attached/Suggested menu items rendered as interactive cards */}
                      {msg.suggestedItems && msg.suggestedItems.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {msg.suggestedItems.map((item) => (
                            <div 
                              key={item.id} 
                              style={{ 
                                display: 'flex', 
                                gap: '0.75rem', 
                                background: 'rgba(3,7,18,0.5)', 
                                border: '1px solid rgba(6, 182, 212, 0.2)', 
                                borderRadius: '10px', 
                                padding: '0.6rem',
                                alignItems: 'center' 
                              }}
                            >
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200';
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h5 style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', margin: 0 }}>{item.name}</h5>
                                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>${item.price.toFixed(2)}</strong>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>from {item.stallName}</span>
                              </div>
                              {(() => {
                                const cartEntry = cart.find(c => c.item.id === item.id);
                                if (cartEntry) {
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <button
                                        onClick={() => {
                                          if (cartEntry.quantity <= 1) {
                                            removeFromCart(item.id);
                                          } else {
                                            updateCartQty(item.id, -1);
                                          }
                                        }}
                                        style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, padding: 0 }}
                                      >
                                        {cartEntry.quantity <= 1 ? '🗑' : '−'}
                                      </button>
                                      <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'white' }}>
                                        {cartEntry.quantity}
                                      </span>
                                      <button
                                        onClick={() => updateCartQty(item.id, 1)}
                                        style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, padding: 0 }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => handleAddFromChatCard(item)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', whiteSpace: 'nowrap' }}
                                  >
                                    <Plus size={10} /> Add
                                  </button>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.showCheckoutAction && cart.length > 0 && (
                        <div 
                          style={{ 
                            marginTop: '0.5rem', 
                            padding: '1.25rem', 
                            background: 'rgba(3, 7, 18, 0.75)', 
                            border: '2px solid var(--accent-cyan)', 
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            boxShadow: '0 8px 32px rgba(6, 182, 212, 0.15)',
                            backdropFilter: 'blur(10px)',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', display: 'block' }}>
                            🛒 Checkout Order Summary
                          </span>
                          
                          {/* Cart items list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {cart.map(({ item, quantity }) => (
                              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                <span>{quantity}x {item.name}</span>
                                <span style={{ fontWeight: 600 }}>${(item.price * quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.5rem', color: 'white' }}>
                            <span>Total:</span>
                            <span style={{ color: 'var(--accent-green)' }}>${cartTotal.toFixed(2)}</span>
                          </div>

                          {/* Seating Form fields directly in the chat bubble */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                                Stand / Section
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. West Stand"
                                value={standName}
                                onChange={(e) => setStandName(e.target.value)}
                                style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'white', fontSize: '0.75rem', boxSizing: 'border-box' }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                                Seat Number
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. C-14"
                                value={seatNumber}
                                onChange={(e) => setSeatNumber(e.target.value)}
                                style={{ width: '100%', background: 'rgba(3,7,18,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.5rem', color: 'white', fontSize: '0.75rem', boxSizing: 'border-box' }}
                              />
                            </div>
                          </div>

                          {wallet.balance < cartTotal && (
                            <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '0.75rem', color: '#f87171' }}>
                              Insufficient wallet balance! Top up in the header widget.
                            </div>
                          )}

                          <button
                            onClick={handleCheckout}
                            disabled={wallet.balance < cartTotal}
                            className="btn btn-primary"
                            style={{ 
                              width: '100%', 
                              padding: '0.6rem', 
                              fontSize: '0.85rem', 
                              fontWeight: 700, 
                              background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)', 
                              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
                              opacity: wallet.balance < cartTotal ? 0.5 : 1,
                              cursor: wallet.balance < cartTotal ? 'not-allowed' : 'pointer'
                            }}
                          >
                            💳 Proceed with Payment (${cartTotal.toFixed(2)})
                          </button>
                        </div>
                      )}

                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  
                  {aiTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.6rem 1rem', borderRadius: '16px 16px 16px 2px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="dot-typing" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.3s infinite alternate' }}></span>
                      <span className="dot-typing" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.3s infinite alternate', animationDelay: '0.2s' }}></span>
                      <span className="dot-typing" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', animation: 'pulse 1.3s infinite alternate', animationDelay: '0.4s' }}></span>
                    </div>
                  )}
                </div>

                {/* Pre-suggested starters row */}
                {chatMessages.length === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Suggested prompts:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => handleSendMessage("I want to order a taco")} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}>🇺🇸 taco</button>
                      <button type="button" onClick={() => handleSendMessage("Quiero una hamburguesa")} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}>🇪🇸 hamburguesa</button>
                      <button type="button" onClick={() => handleSendMessage("Gostaria de ver o cardápio de hambúrguer")} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}>🇵🇹 hambúrguer</button>
                      <button type="button" onClick={() => handleSendMessage("Je veux commander des nouilles")} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}>🇫🇷 nouilles</button>
                      <button type="button" onClick={() => handleSendMessage("Vorrei ordinare un dolce")} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}>🇮🇹 dolce</button>
                    </div>
                  </div>
                )}

                {/* Chat Input row */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', alignItems: 'center' }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask BiteFlow AI Concierge..."
                    aria-label="Ask BiteFlow AI Concierge"
                    className="input-field"
                    style={{ flex: 1, background: 'rgba(3,7,18,0.4)' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCart(true)}
                    aria-label={`${USER_TRANSLATIONS[language].cartTitle || 'Open cart'} (${cart.reduce((s, c) => s + c.quantity, 0)})`}
                    style={{
                      position: 'relative', 
                      padding: '0.6rem', 
                      borderRadius: '10px', 
                      border: cart.length > 0 ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)', 
                      background: cart.length > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.03)', 
                      color: cart.length > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ShoppingBag size={18} />
                    {cart.length > 0 && (
                      <span style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
                        color: 'white', 
                        fontSize: '0.6rem', 
                        fontWeight: 800, 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.4)'
                      }}>
                        {cart.reduce((sum, c) => sum + c.quantity, 0)}
                      </span>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Catalog: Search, Filter, Browse */
              <div>
                {/* Filters Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                      <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="search"
                        className="input-field"
                        placeholder={USER_TRANSLATIONS[language].searchPlaceholder}
                        aria-label={USER_TRANSLATIONS[language].searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                    </div>

                    {/* Stall filter dropdown */}
                    <div style={{ width: '200px' }}>
                      <select
                        className="input-field"
                        aria-label="Filter by food stall"
                        value={selectedStallId}
                        onChange={(e) => setSelectedStallId(e.target.value)}
                      >
                        <option value="all">🏪 All Food Stalls</option>
                        {availableStalls.map(s => (
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
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                            }}
                          />
                          <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(3, 7, 18, 0.8)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                            {item.stallName}
                          </span>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                          <div>
                            <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: '0.65rem', marginBottom: '0.5rem', borderRadius: '4px' }}>{item.category}</span>
                            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.35rem', color: 'white' }}>{item.name}</h4>
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
            )}
          </div>
        </div>
        ) : (
          /* Order tracking tab */
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Clock size={22} color="var(--accent-cyan)" /> Order Tracking Console
              </h2>
              <button 
                onClick={() => setActiveTab('browse')}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                🍕 Back to Menu
              </button>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <ShoppingBag size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{language === 'es' ? 'Aún no se han realizado pedidos' : language === 'fr' ? 'Aucune commande passée pour le moment' : language === 'de' ? 'Noch keine Bestellungen aufgegeben' : language === 'it' ? 'Nessun ordine effettuato' : language === 'pt' ? 'Nenhum pedido feito ainda' : language === 'nl' ? 'Nog geen bestellingen geplaatst' : language === 'ar' ? 'لم يتم تقديم أي طلبات بعد' : 'No orders placed yet'}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {language === 'es' ? '¡Navega por nuestros puestos de comida y realiza tu primer pedido para rastrearlo aquí!' : language === 'fr' ? 'Parcourez nos kiosques alimentaires et passez votre première commande pour la suivre ici!' : language === 'de' ? 'Stöbern Sie in unseren Essenskiosken und geben Sie Ihre erste Bestellung auf, um sie hier zu verfolgen!' : language === 'it' ? 'Sfoglia i nostri chioschi e invia il tuo primo ordine per tracciarlo qui!' : language === 'pt' ? 'Navegue pelos nossos quiosques e faça seu primeiro pedido para rastreá-lo aqui!' : language === 'nl' ? 'Blader door onze eetkiosken en plaats je eerste bestelling om deze hier te volgen!' : language === 'ar' ? 'تصفح أكشاك الطعام لدينا وقدم طلبك الأول لتتبعه هنا!' : 'Browse our food kiosks and place your first order to track it here!'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {orders
                  .slice()
                  .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
                  .map(order => (
                    <div 
                      key={order.id}
                      className="glass-panel-glow"
                      style={{ 
                        padding: '1.5rem', 
                        border: '1px solid var(--border-color-glow)',
                        background: 'rgba(3, 7, 18, 0.45)',
                        borderRadius: '16px'
                      }}
                    >
                      {/* Order Metadata Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{USER_TRANSLATIONS[language].orderIdLabel || 'Order ID'}: #{order.id.split('-')[1] || order.id}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({order.id})</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {language === 'es' ? 'Realizado el' : language === 'fr' ? 'Passée le' : language === 'de' ? 'Aufgegeben am' : language === 'it' ? 'Effettuato il' : language === 'pt' ? 'Feito em' : language === 'nl' ? 'Geplaatst op' : language === 'ar' ? 'تم تقديمه في' : 'Placed on'} {new Date(order.orderTime).toLocaleString()}
                            {order.stand && order.seatNumber && (
                              <span style={{ marginLeft: '0.5rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                📍 {order.stand}, {order.seatNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{language === 'es' ? 'Gran Total' : language === 'fr' ? 'Total global' : language === 'de' ? 'Gesamtsumme' : language === 'it' ? 'Totale complessivo' : language === 'pt' ? 'Total Geral' : language === 'nl' ? 'Eindtotaal' : language === 'ar' ? 'المجموع الكلي' : 'Grand Total'}</div>
                          <strong style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>${order.totalAmount.toFixed(2)}</strong>
                        </div>
                      </div>

                      {/* Kiosk breakdown */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {Object.values(order.kioskOrders).map(kioskOrder => {
                          const logoEmoji = stalls.find(s => s.id === kioskOrder.kioskId)?.logoUrl || '🏪';
                          return (
                            <div 
                              key={kioskOrder.kioskId}
                              style={{ 
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              {/* Kiosk Name & Status Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1.25rem' }}>{logoEmoji}</span>
                                  <strong style={{ fontSize: '1rem', color: 'white' }}>{kioskOrder.kioskName}</strong>
                                </div>
                                <span className={`badge ${
                                  kioskOrder.status === 'pending' ? 'badge-warning' :
                                  kioskOrder.status === 'preparing' ? 'badge-info' :
                                  kioskOrder.status === 'ready' ? 'badge-success' :
                                  kioskOrder.status === 'completed' ? 'badge-secondary' :
                                  'badge-danger'
                                }`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                  {kioskOrder.status === 'ready' ? (USER_TRANSLATIONS[language].progressStepReady + ' 🎉') : kioskOrder.status === 'pending' ? USER_TRANSLATIONS[language].orderStatusPending : kioskOrder.status === 'preparing' ? USER_TRANSLATIONS[language].orderStatusPreparing : kioskOrder.status === 'completed' ? USER_TRANSLATIONS[language].orderStatusCompleted : USER_TRANSLATIONS[language].orderStatusCancelled}
                                </span>
                              </div>

                              {/* Items from this kiosk */}
                              <div style={{ paddingLeft: '0.25rem', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{language === 'es' ? 'Artículos Pedidos' : language === 'fr' ? 'Articles Commandés' : language === 'de' ? 'Bestellte Artikel' : language === 'it' ? 'Articoli Ordinati' : language === 'pt' ? 'Itens Pedidos' : language === 'nl' ? 'Bestelde Items' : language === 'ar' ? 'الأصناف المطلوبة' : 'Items Ordered'}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {kioskOrder.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                      <div>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginRight: '0.5rem' }}>{item.quantity}x</span>
                                        <span>{item.name}</span>
                                      </div>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        status: <strong style={{ 
                                          color: kioskOrder.status === 'pending' ? 'var(--accent-orange)' :
                                                 kioskOrder.status === 'preparing' ? 'var(--accent-cyan)' :
                                                 kioskOrder.status === 'ready' ? 'var(--accent-green)' :
                                                 kioskOrder.status === 'completed' ? 'var(--text-muted)' :
                                                 'var(--accent-red)'
                                        }}>{kioskOrder.status}</strong>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', marginBottom: '0.5rem' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${
                                      kioskOrder.status === 'pending' ? 25 :
                                      kioskOrder.status === 'preparing' ? 60 :
                                      kioskOrder.status === 'ready' ? 100 :
                                      kioskOrder.status === 'completed' ? 100 :
                                      0
                                    }%`, 
                                    background: kioskOrder.status === 'ready' || kioskOrder.status === 'completed' ? 'var(--accent-green)' : kioskOrder.status === 'cancelled' ? 'var(--accent-red)' : 'var(--accent-cyan)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s ease'
                                  }} 
                                />
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                <span style={{ color: kioskOrder.status === 'pending' ? 'var(--accent-orange)' : '' }}>{USER_TRANSLATIONS[language].progressStepReceived}</span>
                                <span style={{ color: kioskOrder.status === 'preparing' ? 'var(--accent-cyan)' : '' }}>{USER_TRANSLATIONS[language].progressStepPreparing}</span>
                                <span style={{ color: kioskOrder.status === 'ready' ? 'var(--accent-green)' : '' }}>{USER_TRANSLATIONS[language].progressStepReady}</span>
                              </div>

                              {kioskOrder.status === 'cancelled' && kioskOrder.declineReason && (
                                <div style={{ 
                                  marginTop: '0.75rem', 
                                  padding: '0.5rem 0.75rem', 
                                  background: 'rgba(239, 68, 68, 0.05)', 
                                  border: '1px solid rgba(239, 68, 68, 0.1)', 
                                  borderRadius: '6px', 
                                  fontSize: '0.75rem', 
                                  color: '#f87171',
                                  textAlign: 'left'
                                }}>
                                  🚫 <strong>{language === 'es' ? 'Rechazado:' : language === 'fr' ? 'Décliné:' : language === 'de' ? 'Abgelehnt:' : language === 'it' ? 'Rifiutato:' : language === 'pt' ? 'Recusado:' : language === 'nl' ? 'Geweigerd:' : language === 'ar' ? 'تم الرفض:' : 'Declined:'}</strong> {kioskOrder.declineReason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {order.notes && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          ✍️ <strong>Delivery Notes:</strong> {order.notes}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

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
          <div onClick={() => setShowCart(false)} aria-hidden="true" style={{ flex: 1 }} />

          <div
            className="glass-panel"
            role="dialog"
            aria-modal="true"
            aria-label={USER_TRANSLATIONS[language].cartTitle || 'Your cart and wallet'}
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
                <ShoppingBag size={18} color="var(--accent-cyan)" /> {language === 'es' ? 'Tu Carrito y Billetera' : language === 'fr' ? 'Votre Panier & Portefeuille' : language === 'de' ? 'Ihr Warenkorb & Wallet' : language === 'it' ? 'Il tuo Carrello e Portafoglio' : language === 'pt' ? 'Seu Carrinho e Carteira' : language === 'nl' ? 'Jouw Winkelwagen & Wallet' : language === 'ar' ? 'حقيبة التسوق والمحفظة' : 'Your Cart & Wallet'}
              </h3>
              <button
                onClick={() => setShowCart(false)}
                aria-label={USER_TRANSLATIONS[language].close || 'Close'}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} aria-hidden="true" />
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
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{USER_TRANSLATIONS[language].walletBalance || 'Wallet Balance'}</span>
                  </div>
                  <strong className="font-display" style={{ fontSize: '1.35rem', color: 'var(--accent-green)' }}>
                    ${wallet.balance.toFixed(2)}
                  </strong>
                </div>

                {/* Quick Add Funds Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'es' ? 'Recargar Saldo:' : language === 'fr' ? 'Recharger le solde:' : language === 'de' ? 'Guthaben aufladen:' : language === 'it' ? 'Ricarica Saldo:' : language === 'pt' ? 'Recarregar Saldo:' : language === 'nl' ? 'Saldo Opwaarderen:' : language === 'ar' ? 'شحن الرصيد:' : 'Top Up Balance:'}</span>
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
                  <span>{language === 'es' ? 'Artículos del Carrito' : language === 'fr' ? 'Articles du panier' : language === 'de' ? 'Warenkorb-Artikel' : language === 'it' ? 'Articoli del Carrello' : language === 'pt' ? 'Itens do Carrinho' : language === 'nl' ? 'Winkelwagen Items' : language === 'ar' ? 'أصناف السلة' : 'Cart Items'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{cart.reduce((s, c) => s + c.quantity, 0)} {language === 'es' ? 'artículos' : language === 'fr' ? 'articles' : language === 'de' ? 'Artikel' : language === 'it' ? 'articoli' : language === 'pt' ? 'itens' : language === 'nl' ? 'items' : language === 'ar' ? 'أصناف' : 'items'}</span>
                </h4>

                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                    <ShoppingBag size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{USER_TRANSLATIONS[language].emptyCart || 'Your cart is empty.'}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{language === 'es' ? 'Selecciona alimentos del catálogo.' : language === 'fr' ? 'Sélectionnez des articles dans le catalogue.' : language === 'de' ? 'Wählen Sie Speisen aus dem Katalog.' : language === 'it' ? 'Seleziona articoli dal catalogo.' : language === 'pt' ? 'Selecione alimentos do catálogo.' : language === 'nl' ? 'Selecteer gerechten uit de catalogus.' : language === 'ar' ? 'اختر أصناف الطعام من القائمة.' : 'Select food items from the catalog.'}</p>
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
                            aria-label={`${USER_TRANSLATIONS[language].decreaseQuantity || 'Decrease quantity'}: ${item.name}`}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Minus size={10} aria-hidden="true" />
                          </button>
                          <span aria-live="polite" style={{ fontSize: '0.85rem', fontWeight: 600, width: '20px', textAlign: 'center' }}>{quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.id, 1)}
                            aria-label={`${USER_TRANSLATIONS[language].increaseQuantity || 'Increase quantity'}: ${item.name}`}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <Plus size={10} aria-hidden="true" />
                          </button>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                            aria-label={`${USER_TRANSLATIONS[language].removeItem || 'Remove'}: ${item.name}`}
                            title="Remove"
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    🏟️ {language === 'es' ? 'Detalles de Entrega en el Estadio' : language === 'fr' ? 'Détails de Livraison au Stade' : language === 'de' ? 'Stadion-Lieferdetails' : language === 'it' ? 'Dettagli di Consegna allo Stadio' : language === 'pt' ? 'Detalhes de Entrega no Estádio' : language === 'nl' ? 'Stadion Bezorgdetails' : language === 'ar' ? 'تفاصيل التوصيل في الملعب' : 'Stadium Delivery Details'}
                  </span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Stand / Section
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. West Stand"
                        value={standName}
                        onChange={(e) => setStandName(e.target.value)}
                        style={{ width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.6rem', color: 'white', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Seat Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. C-14"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(e.target.value)}
                        style={{ width: '100%', background: 'rgba(3,7,18,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem 0.6rem', color: 'white', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Notes (only show if items exist) */}
              {cart.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    {USER_TRANSLATIONS[language].notesLabel || 'Special Notes / Instructions'}
                  </label>
                  <textarea
                    className="input-field"
                    placeholder={USER_TRANSLATIONS[language].notesPlaceholder || 'e.g. Extra sauce, no onions...'}
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
                  <History size={14} /> {language === 'es' ? 'Historial de Transacciones de Billetera' : language === 'fr' ? 'Historique des transactions du portefeuille' : language === 'de' ? 'Wallet-Transaktionsverlauf' : language === 'it' ? 'Cronologia delle transazioni del portafoglio' : language === 'pt' ? 'Histórico de Transações da Carteira' : language === 'nl' ? 'Wallet Transactiegeschiedenis' : language === 'ar' ? 'سجل معاملات المحفظة' : 'Wallet Transaction History'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {wallet.transactions.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{language === 'es' ? 'No se registraron transacciones.' : language === 'fr' ? 'Aucune transaction enregistrée.' : language === 'de' ? 'Keine Transaktionen aufgezeichnet.' : language === 'it' ? 'Nessuna transazione registrata.' : language === 'pt' ? 'Nenhuma transação registrada.' : language === 'nl' ? 'Geen transacties geregistreerd.' : language === 'ar' ? 'لم يتم تسجيل أي معاملات.' : 'No transactions recorded.'}</p>
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
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description.includes('Loaded funds')
                              ? (language === 'es' ? 'Fondos cargados a través de pasarela simulada' : language === 'fr' ? 'Fonds chargés via une passerelle simulée' : language === 'de' ? 'Guthaben über simulierte Schnittstelle aufgeladen' : language === 'it' ? 'Fondi caricati tramite gateway simulato' : language === 'pt' ? 'Saldo carregado via gateway simulado' : language === 'nl' ? 'Geld opgeladen via gesimuleerde gateway' : language === 'ar' ? 'تم شحن الرصيد عبر بوابة الدفع' : tx.description)
                              : tx.description.includes('Multi-kiosk food purchase')
                              ? (language === 'es' ? `Compra en puestos (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'fr' ? `Achat multi-kiosques (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'de' ? `Kauf an mehreren Kiosken (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'it' ? `Acquisto chioschi multipli (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'pt' ? `Compra em quiosques (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'nl' ? `Multi-kiosk aankoop (${tx.description.split('(')[1]?.split(')')[0] || ''})` : language === 'ar' ? `شراء من عدة أكشاك (${tx.description.split('(')[1]?.split(')')[0] || ''})` : tx.description)
                              : tx.description.includes('Refund')
                              ? (language === 'es' ? 'Reembolso por pedido cancelado' : language === 'fr' ? 'Remboursement de commande annulée' : language === 'de' ? 'Rückerstattung für stornierte Bestellung' : language === 'it' ? 'Rimborso per ordine annullato' : language === 'pt' ? 'Reembolso por pedido cancelado' : language === 'nl' ? 'Terugbetaling voor geannuleerde bestelling' : language === 'ar' ? 'استرداد قيمة الطلب الملغى' : tx.description)
                              : tx.description}
                          </p>
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
                  <span style={{ color: 'var(--text-secondary)' }}>{USER_TRANSLATIONS[language].total || 'Total'}:</span>
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
                    <span>{USER_TRANSLATIONS[language].insufficientFunds || 'Insufficient funds! Please top up above.'}</span>
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
                  {language === 'es' ? 'Confirmar y Realizar Pedido' : language === 'fr' ? 'Confirmer & Passer Commande' : language === 'de' ? 'Bestätigen & Bestellen' : language === 'it' ? 'Conferma e Invia Ordine' : language === 'pt' ? 'Confirmar e Fazer Pedido' : language === 'nl' ? 'Bevestigen & Bestellen' : language === 'ar' ? 'تأكيد وتقديم الطلب' : 'Confirm & Place Order'} (${cartTotal.toFixed(2)})
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
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab('orders');
                }}
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
