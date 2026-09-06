import React, { useState, useEffect } from 'react';
import { Order, Product, PriceAlert, CurrencyCode, WishlistNotificationPreferences } from '../types';
import { 
  Package, 
  MapPin, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  Truck, 
  Copy, 
  Check, 
  User as UserIcon,
  ShoppingBag,
  CheckCircle2,
  BookOpen,
  Download,
  FileText,
  ExternalLink,
  Eye,
  X,
  Loader2,
  Share2,
  Bell,
  BellRing,
  TrendingDown,
  Trash2,
  Zap,
  ArrowRight,
  Mail,
  Sliders,
  CheckCircle,
  PackageCheck,
  Flame,
  Heart,
  Tag,
  Info,
  Sparkles,
  RefreshCw,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getOrdersFromFirestore, 
  getUserNotificationPreferencesFromFirestore,
  saveUserNotificationPreferencesToFirestore,
  dispatchWishlistAlertSimulation,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getUserWishlistFromFirestore,
  toggleWishlistInFirestore,
  getProductsFromFirestore
} from '../lib/firestoreService';
import { 
  getUserPriceAlertsFromFirestore, 
  deletePriceAlertFromFirestore, 
  simulatePriceDropForProduct 
} from '../lib/priceAlertService';
import { formatCurrency, convertFromUSD } from '../lib/currency';
import { getLiveExchangeRate } from '../lib/exchangeRateService';

interface CustomerAccountViewProps {
  onNavigate?: (path: string) => void;
  currentCurrency?: CurrencyCode;
}

const getOrderProgressStep = (status: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('delivered') || normalized.includes('completed')) return 4;
  if (normalized.includes('shipped') || normalized.includes('dispatch') || normalized.includes('transit')) return 3;
  if (normalized.includes('processing') || normalized.includes('escrow') || normalized.includes('paid')) return 2;
  return 1; // Order Placed / Pending
};

const ORDER_STEPS = [
  { step: 1, label: 'Order Placed' },
  { step: 2, label: 'Escrow Verified' },
  { step: 3, label: 'In Transit' },
  { step: 4, label: 'Delivered' }
];

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({ 
  onNavigate,
  currentCurrency = 'NGN'
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const { user, userProfile, isAdmin, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'alerts' | 'notifications' | 'library' | 'profile' | 'addresses'>('orders');
  const [alertsSubTab, setAlertsSubTab] = useState<'preferences' | 'price_alerts' | 'wishlist_inventory'>('preferences');
  const [orders, setOrders] = useState<Order[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<WishlistNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [allCatalogProducts, setAllCatalogProducts] = useState<Product[]>([]);
  
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(true);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [readingPdf, setReadingPdf] = useState<{ title: string; author?: string; pdfUrl?: string; pdfFileName?: string } | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simulatingType, setSimulatingType] = useState<'stock' | 'price' | null>(null);
  const [testAlertToast, setTestAlertToast] = useState<{ message: string; type: 'stock' | 'price' } | null>(null);

  const fetchAlerts = async () => {
    if (user) {
      setLoadingAlerts(true);
      try {
        const res = await getUserPriceAlertsFromFirestore(user.uid);
        setPriceAlerts(res);
      } finally {
        setLoadingAlerts(false);
      }
    }
  };

  const fetchNotificationPreferences = async () => {
    if (user) {
      setLoadingPrefs(true);
      try {
        const prefs = await getUserNotificationPreferencesFromFirestore(user.uid);
        setNotificationPrefs(prefs);
      } finally {
        setLoadingPrefs(false);
      }
    }
  };

  const fetchWishlist = async () => {
    if (user) {
      try {
        const ids = await getUserWishlistFromFirestore(user.uid);
        setWishlistIds(ids);
      } catch {
        const local = localStorage.getItem('nexovira_wishlist');
        if (local) try { setWishlistIds(JSON.parse(local)); } catch {}
      }
    }
  };

  useEffect(() => {
    // Load products from firestore if available
    getProductsFromFirestore().then(prods => {
      setAllCatalogProducts(prods || []);
    }).catch(() => {
      setAllCatalogProducts([]);
    });

    if (user) {
      setLoadingOrders(true);
      getOrdersFromFirestore(user.uid, false)
        .then(res => setOrders(res))
        .catch(console.error)
        .finally(() => setLoadingOrders(false));

      fetchAlerts();
      fetchNotificationPreferences();
      fetchWishlist();

      const handleAlertsChanged = () => fetchAlerts();
      const handlePrefsChanged = (e: Event) => {
        const customEvent = e as CustomEvent<WishlistNotificationPreferences>;
        if (customEvent.detail) setNotificationPrefs(customEvent.detail);
      };
      const handleWishlistChanged = () => fetchWishlist();

      window.addEventListener('nexovira_price_alerts_changed', handleAlertsChanged);
      window.addEventListener('nexovira_notif_preferences_changed', handlePrefsChanged);
      window.addEventListener('nexovira_wishlist_changed', handleWishlistChanged);

      return () => {
        window.removeEventListener('nexovira_price_alerts_changed', handleAlertsChanged);
        window.removeEventListener('nexovira_notif_preferences_changed', handlePrefsChanged);
        window.removeEventListener('nexovira_wishlist_changed', handleWishlistChanged);
      };
    }
  }, [user]);

  const handleTogglePref = async (key: keyof WishlistNotificationPreferences, valueOverride?: any) => {
    if (!user) return;
    const newValue = valueOverride !== undefined ? valueOverride : !notificationPrefs[key];
    const updated = {
      ...notificationPrefs,
      [key]: newValue,
      notificationEmail: user.email || notificationPrefs.notificationEmail || ''
    };

    setNotificationPrefs(updated);
    setSavingPrefs(true);
    try {
      await saveUserNotificationPreferencesToFirestore(user.uid, updated);
      setPrefsSuccessMsg('Notification preferences updated & synced to Firestore');
      setTimeout(() => setPrefsSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSimulateWishlistAlert = async (type: 'BACK_IN_STOCK' | 'PRICE_DROP') => {
    if (!user) return;
    setSimulatingType(type === 'BACK_IN_STOCK' ? 'stock' : 'price');
    try {
      // Find a wishlisted item or fallback to first product
      let targetProduct = allCatalogProducts.find(p => wishlistIds.includes(p.id));
      if (!targetProduct) targetProduct = allCatalogProducts[0];
      if (!targetProduct) {
        setTestAlertToast({ message: 'No active products in catalog to simulate alerts.', type: 'price' });
        setTimeout(() => setTestAlertToast(null), 4000);
        return;
      }

      await dispatchWishlistAlertSimulation(user.uid, type, targetProduct);

      const msg = type === 'BACK_IN_STOCK'
        ? `Back-in-stock alert dispatched for "${targetProduct.title}"! Checked inbox & bell notification.`
        : `Price drop alert dispatched for "${targetProduct.title}" with discount notification!`;

      setTestAlertToast({ message: msg, type: type === 'BACK_IN_STOCK' ? 'stock' : 'price' });
      setTimeout(() => setTestAlertToast(null), 5000);
    } finally {
      setSimulatingType(null);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    if (!user) return;
    await toggleWishlistInFirestore(user.uid, productId, wishlistIds);
    setWishlistIds(prev => prev.filter(id => id !== productId));
  };

  // Wishlist products matching current ids
  const wishlistProducts = React.useMemo(() => {
    return allCatalogProducts.filter(p => wishlistIds.includes(p.id));
  }, [allCatalogProducts, wishlistIds]);

  const primaryLink = `https://nexovira.name.ng/marketplace?ref=${user?.uid || 'NEXO-USER'}`;

  // Extract all purchased digital e-books from user orders
  const purchasedEbooks = React.useMemo(() => {
    const list: Array<{
      orderId: string;
      orderDate: string;
      product: Product;
    }> = [];

    orders.forEach((ord) => {
      const isOrderValid = !ord.status || !ord.status.toLowerCase().includes('cancelled');
      if (isOrderValid && ord.items) {
        ord.items.forEach((item) => {
          if (item.product && (item.product.isDigital || item.product.productType === 'digital_ebook')) {
            list.push({
              orderId: ord.id,
              orderDate: ord.createdAt,
              product: item.product,
            });
          }
        });
      }
    });

    return list;
  }, [orders]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(primaryLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    if (onNavigate) onNavigate('/signin');
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white">Checking your session...</h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Validating authentication credentials and user profile...
        </p>
      </div>
    );
  }

  if (!user && !userProfile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Sign In Required</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Please sign in or create an account to view your order history, delivery addresses, and account preferences.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onNavigate && onNavigate('/signin')}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-sm cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate && onNavigate('/signup')}
            className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-sm border border-slate-700 cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const initials = (userProfile?.displayName || user.displayName || user.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const isAffiliateAccount = userProfile?.role === 'affiliate' || userProfile?.isAffiliate === true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left text-slate-900 dark:text-slate-100">
      
      {/* Affiliate Active Role Banner */}
      {isAffiliateAccount && (
        <div className="p-6 bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase border border-rose-500/30">
                  Affiliate Account Active
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">NEXOVIRA Affiliate Partner Portal</h3>
              <p className="text-xs text-slate-300">
                You are authenticated as an official Affiliate. Manage links, track conversions, and request payouts.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('/affiliate')}
            className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all shrink-0 cursor-pointer flex items-center gap-2"
          >
            <span>Open Affiliate Marketplace</span>
            <span>→</span>
          </button>
        </div>
      )}
      
      {/* Account Profile Header */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{userProfile?.displayName || user.displayName || 'Valued Shopper'}</h1>
              {isAdmin && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email} • {userProfile?.phone || '+234 Verified'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Account
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              onClick={() => onNavigate && onNavigate('/admin')}
              className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold rounded-xl text-xs flex items-center gap-2"
            >
              Admin Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-xl text-xs flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500'}`}
        >
          <Package className="w-4 h-4" />
          My Orders ({orders.length})
        </button>
        <button
          onClick={() => { setActiveTab('alerts'); setAlertsSubTab('preferences'); }}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'alerts' || activeTab === 'notifications' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500'}`}
        >
          <BellRing className="w-4 h-4 text-amber-400" />
          Price & Stock Alerts ({priceAlerts.length})
        </button>
        <button
          onClick={() => { setActiveTab('notifications'); setAlertsSubTab('preferences'); }}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'notifications' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500'}`}
        >
          <Mail className="w-4 h-4 text-cyan-400" />
          Email Alert Preferences
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'library' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500'}`}
        >
          <BookOpen className="w-4 h-4 text-purple-400" />
          My Digital Library ({purchasedEbooks.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500'}`}
        >
          <UserIcon className="w-4 h-4" />
          Account Profile
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'addresses' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500'}`}
        >
          <MapPin className="w-4 h-4" />
          Delivery Addresses
        </button>
      </div>

      {/* Floating Alert Test Toast */}
      {testAlertToast && (
        <div className="p-4 bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs text-white animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-amber-300">
                {testAlertToast.type === 'stock' ? 'Back-in-Stock Alert Simulated' : 'Price Drop Alert Simulated'}
              </p>
              <p className="text-slate-300 text-[11px]">{testAlertToast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setTestAlertToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading order records from Firestore...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Orders Placed Yet</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Explore our catalog of flagship refrigerators, inverter ACs, washing machines, and solar power stations.
              </p>
              <button
                onClick={() => onNavigate && onNavigate('/marketplace')}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-sm"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 text-xs">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">Order #{ord.id}</span>
                    <p className="text-slate-400">Placed on {new Date(ord.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 font-bold px-3 py-1 rounded-full uppercase">
                      {ord.status}
                    </span>
                    <div className="font-black text-base text-slate-900 dark:text-white mt-1">₦{Math.round(ord.total * getLiveExchangeRate()).toLocaleString()} (approx ${ord.total})</div>
                  </div>
                </div>

                {/* Real-time Order Visual Progress Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" /> Real-time Firestore Status Tracker
                    </span>
                    <span className="text-cyan-400 font-mono font-extrabold uppercase">{ord.status}</span>
                  </div>

                  <div className="relative flex items-center justify-between my-3 px-2">
                    {/* Background Progress Track */}
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0" />
                    
                    {/* Active Filled Progress Track */}
                    <div 
                      className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 z-0"
                      style={{ 
                        width: `calc(${((getOrderProgressStep(ord.status) - 1) / (ORDER_STEPS.length - 1)) * 100}% - 3rem)` 
                      }}
                    />

                    {ORDER_STEPS.map((s) => {
                      const currentStep = getOrderProgressStep(ord.status);
                      const isCompleted = s.step <= currentStep;
                      const isCurrent = s.step === currentStep;

                      return (
                        <div key={s.step} className="relative z-10 flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isCompleted 
                              ? 'bg-cyan-500 text-slate-950 shadow-md ring-4 ring-cyan-500/20' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                          </div>
                          <span className={`text-[10px] font-bold mt-1.5 hidden sm:block ${
                            isCurrent ? 'text-cyan-400 font-extrabold' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase">Items Purchased</h4>
                    <div className="space-y-2">
                      {ord.items.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                          <img src={item.product.images[0]} alt={item.product.title} className="w-10 h-10 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate text-slate-900 dark:text-white">{item.product.title}</p>
                            <p className="text-slate-500">Qty: {item.quantity} × ₦{Math.round(item.product.price * getLiveExchangeRate()).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase">Delivery Details</h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <p className="font-bold text-white">{ord.shippingAddress?.fullName || ord.customerName}</p>
                      <p className="text-slate-400">{ord.shippingAddress?.street}, {ord.shippingAddress?.city}, {ord.shippingAddress?.country}</p>
                      <p className="text-slate-400">Phone: {ord.shippingAddress?.phone}</p>
                      <p className="text-cyan-400 font-medium mt-2">Payment: {ord.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Price & Stock Alerts / Notification Preferences */}
      {(activeTab === 'alerts' || activeTab === 'notifications') && (
        <div className="space-y-6">
          {/* Sub-Navigation Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAlertsSubTab('preferences')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  alertsSubTab === 'preferences'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Wishlist Email Subscriptions</span>
              </button>

              <button
                type="button"
                onClick={() => setAlertsSubTab('price_alerts')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  alertsSubTab === 'price_alerts'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Target Price Watchlist ({priceAlerts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAlertsSubTab('wishlist_inventory')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  alertsSubTab === 'wishlist_inventory'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Wishlist Stock Monitor ({wishlistProducts.length})</span>
              </button>
            </div>

            {prefsSuccessMsg && (
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{prefsSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* SUB-VIEW 1: Wishlist Notification Subscriptions & Email Toggles */}
          {alertsSubTab === 'preferences' && (
            <div className="space-y-6">
              {/* Master Email Alerts Hero Card */}
              <div className="p-6 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <BellRing className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-white">Wishlist & Price Drop Notification Service</h3>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Firestore Synced
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Dispatching alerts to <span className="font-bold text-amber-400 underline">{user?.email}</span> when wishlisted products drop in price or return to stock.
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle */}
                  <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
                    <span className="text-xs font-bold text-slate-300">Master Email Alerts:</span>
                    <button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => handleTogglePref('emailAlertsEnabled')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        notificationPrefs.emailAlertsEnabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 font-bold transition-transform ${
                          notificationPrefs.emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual Subscription Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Back In Stock Email Alerts */}
                <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  notificationPrefs.wishlistBackInStock && notificationPrefs.emailAlertsEnabled
                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <PackageCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Back-in-Stock Instant Alerts</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            notificationPrefs.wishlistBackInStock && notificationPrefs.emailAlertsEnabled
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {notificationPrefs.wishlistBackInStock && notificationPrefs.emailAlertsEnabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Receive priority email notifications the instant an out-of-stock item on your Wishlist is restocked by verified sellers.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => handleTogglePref('wishlistBackInStock')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        notificationPrefs.wishlistBackInStock && notificationPrefs.emailAlertsEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          notificationPrefs.wishlistBackInStock && notificationPrefs.emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Monitored Out-of-Stock Items:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {wishlistProducts.filter(p => (p.stock || 0) <= 0).length} Items Watched
                    </span>
                  </div>
                </div>

                {/* 2. Price Drop & Flash Sale Alerts */}
                <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  notificationPrefs.wishlistPriceDrops && notificationPrefs.emailAlertsEnabled
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Wishlist Price Drop Alerts</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            notificationPrefs.wishlistPriceDrops && notificationPrefs.emailAlertsEnabled
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {notificationPrefs.wishlistPriceDrops && notificationPrefs.emailAlertsEnabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Receive automatic email alerts when any wishlisted product drops in price or enters an exclusive Flash Deal.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => handleTogglePref('wishlistPriceDrops')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        notificationPrefs.wishlistPriceDrops && notificationPrefs.emailAlertsEnabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          notificationPrefs.wishlistPriceDrops && notificationPrefs.emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Minimum Discount Threshold */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trigger Alert Threshold:</span>
                      <span className="text-amber-400 font-bold">
                        {notificationPrefs.minimumDiscountPercent ? `${notificationPrefs.minimumDiscountPercent}% or more` : 'Any Price Drop'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[0, 5, 10, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleTogglePref('minimumDiscountPercent', pct)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                            (notificationPrefs.minimumDiscountPercent || 0) === pct
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {pct === 0 ? 'Any Drop' : `${pct}%+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Low Stock Urgency Warnings */}
                <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  notificationPrefs.stockThresholdAlerts && notificationPrefs.emailAlertsEnabled
                    ? 'bg-slate-900/90 border-rose-500/40 shadow-lg shadow-rose-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Low Stock Warnings</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            notificationPrefs.stockThresholdAlerts && notificationPrefs.emailAlertsEnabled
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {notificationPrefs.stockThresholdAlerts && notificationPrefs.emailAlertsEnabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Receive urgency warnings before high-demand wishlisted items have fewer than 5 units left in warehouse inventory.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => handleTogglePref('stockThresholdAlerts')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        notificationPrefs.stockThresholdAlerts && notificationPrefs.emailAlertsEnabled ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          notificationPrefs.stockThresholdAlerts && notificationPrefs.emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 4. Daily Wishlist Digest */}
                <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
                  notificationPrefs.dailyPriceSummary && notificationPrefs.emailAlertsEnabled
                    ? 'bg-slate-900/90 border-purple-500/40 shadow-lg shadow-purple-500/5'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Daily Wishlist Digest</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            notificationPrefs.dailyPriceSummary && notificationPrefs.emailAlertsEnabled
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {notificationPrefs.dailyPriceSummary && notificationPrefs.emailAlertsEnabled ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Receive a clean daily summary email of all price movements and restock updates across your Wishlist.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => handleTogglePref('dailyPriceSummary')}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        notificationPrefs.dailyPriceSummary && notificationPrefs.emailAlertsEnabled ? 'bg-purple-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                          notificationPrefs.dailyPriceSummary && notificationPrefs.emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Test & Simulation Alert Dispatcher Box */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Test Live Alert Dispatch Pipeline
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify how instant Back-in-Stock and Price Drop notifications appear in real-time.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={simulatingType !== null}
                      onClick={() => handleSimulateWishlistAlert('BACK_IN_STOCK')}
                      className="px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {simulatingType === 'stock' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PackageCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Test Back-in-Stock Alert</span>
                    </button>

                    <button
                      type="button"
                      disabled={simulatingType !== null}
                      onClick={() => handleSimulateWishlistAlert('PRICE_DROP')}
                      className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {simulatingType === 'price' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>Test Price Drop Alert</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: Active Target Price Drop Watchlist */}
          {alertsSubTab === 'price_alerts' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Active Specific Target Price Alerts</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      When products drop to your target price threshold, an instant notification is triggered automatically.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('/marketplace')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Add More Alerts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingAlerts ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading your saved price alerts...</span>
                </div>
              ) : priceAlerts.length === 0 ? (
                <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">No Price Threshold Alerts Created Yet</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">
                    Browse our marketplace and tap the bell icon on any product to set your preferred target price threshold!
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('/marketplace')}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20"
                  >
                    Browse Marketplace Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {priceAlerts.map((alert) => {
                    const liveProd = allCatalogProducts.find(p => p.id === alert.productId);
                    const currentPriceUSD = liveProd?.price || alert.initialPriceUSD;
                    const isTriggered = alert.status === 'TRIGGERED' || currentPriceUSD <= alert.targetPriceUSD;
                    const dropPercentage = Math.round(((alert.initialPriceUSD - alert.targetPriceUSD) / alert.initialPriceUSD) * 100);

                    return (
                      <div
                        key={alert.id}
                        className={`p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between ${
                          isTriggered
                            ? 'bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={alert.productImage}
                            alt={alert.productTitle}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isTriggered
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}>
                                <TrendingDown className="w-3 h-3" />
                                {isTriggered ? 'Target Price Reached!' : `Alert Active (-${dropPercentage}%)`}
                              </span>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm('Delete this price drop alert?')) {
                                    await deletePriceAlertFromFirestore(alert.id);
                                    fetchAlerts();
                                  }
                                }}
                                className="text-slate-400 hover:text-red-400 p-1 rounded-lg transition-colors"
                                title="Remove Alert"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate mt-1">
                              {alert.productTitle}
                            </h4>

                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Set on {new Date(alert.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </p>
                          </div>
                        </div>

                        {/* Price Status Progress Comparison */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Initial</span>
                            <span className="font-bold text-slate-400 line-through font-mono">
                              {formatCurrency(alert.initialPriceUSD, currency)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-amber-500 uppercase font-extrabold block">Target Goal</span>
                            <span className="font-black text-amber-400 font-mono">
                              {formatCurrency(alert.targetPriceUSD, currency)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-cyan-400 uppercase font-bold block">Current Live</span>
                            <span className={`font-black font-mono ${isTriggered ? 'text-emerald-400' : 'text-cyan-400'}`}>
                              {formatCurrency(currentPriceUSD, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate(`/product/${alert.productId}`)}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Product</span>
                          </button>

                          {/* Simulation Test Trigger button */}
                          <button
                            type="button"
                            disabled={simulatingId === alert.id}
                            onClick={async () => {
                              setSimulatingId(alert.id);
                              try {
                                const newPrice = Math.max(10, alert.targetPriceUSD - 5);
                                await simulatePriceDropForProduct(alert.productId, newPrice);
                                await fetchAlerts();
                              } finally {
                                setSimulatingId(null);
                              }
                            }}
                            className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="Simulate Flash Sale price drop below target"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{simulatingId === alert.id ? 'Simulating...' : 'Test Drop'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 3: Live Wishlist Stock Monitor Grid */}
          {alertsSubTab === 'wishlist_inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/30 rounded-3xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Wishlist Inventory Stock & Alert Watcher</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      All wishlisted products are actively monitored for replenishment and price reductions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('/marketplace')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Your Wishlist is Empty</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto">
                    Save items to your wishlist while browsing to automatically monitor inventory availability and receive instant back-in-stock notifications.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('/marketplace')}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-cyan-500/20"
                  >
                    Explore Marketplace Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {wishlistProducts.map((prod) => {
                    const isOutOfStock = (prod.stock || 0) <= 0;
                    const isLowStock = !isOutOfStock && (prod.stock || 0) <= 4;

                    return (
                      <div
                        key={prod.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <img
                            src={prod.images[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'}
                            alt={prod.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 rounded-2xl object-cover border border-slate-800 bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isOutOfStock
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : isLowStock
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low Stock (${prod.stock} left)` : 'In Stock'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveFromWishlist(prod.id)}
                                className="text-slate-400 hover:text-red-400 p-1 rounded-lg transition-colors"
                                title="Remove from Wishlist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate mt-1">
                              {prod.title}
                            </h4>
                            <p className="text-xs font-bold text-cyan-400 mt-0.5">
                              {formatCurrency(prod.price, currency)}
                            </p>
                          </div>
                        </div>

                        {/* Stock & Notification Status Card */}
                        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Back-in-Stock Alert:</span>
                            <span className={`font-bold ${notificationPrefs.wishlistBackInStock ? 'text-cyan-400' : 'text-slate-500'}`}>
                              {notificationPrefs.wishlistBackInStock ? '✓ Subscribed' : 'Paused'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Price Drop Alert:</span>
                            <span className={`font-bold ${notificationPrefs.wishlistPriceDrops ? 'text-amber-400' : 'text-slate-500'}`}>
                              {notificationPrefs.wishlistPriceDrops ? '✓ Subscribed' : 'Paused'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate(`/product/${prod.id}`)}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Product</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSimulateWishlistAlert(isOutOfStock ? 'BACK_IN_STOCK' : 'PRICE_DROP')}
                            className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            title="Send simulated test notification"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Test</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Digital E-book Library */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {purchasedEbooks.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Your E-book Library is Empty</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                When you purchase digital e-books on NEXOVIRA, your instant PDF access links and in-browser reading licenses will be securely saved here.
              </p>
              <button
                onClick={() => onNavigate && onNavigate('/marketplace')}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-500/20"
              >
                Browse E-book Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchasedEbooks.map((item, idx) => {
                const prod = item.product;
                const pdfData = prod.pdfUrl || 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCA1ND4+CnN0cmVhbQpCVAovRjEgMjQgVGYKMTA0IDcyMCBUZAkKKE5FWE9WSVJBIERJR0lUQUwgRS1CT09LIFZFUklGSUVEKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDA0MDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY4IDA0MDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDA0MDAwMDAyMTkgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDUvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozMTQKJSVFT0Y=';

                return (
                  <div key={`${item.orderId}-${idx}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row gap-5 shadow-sm">
                    <img
                      src={prod.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'}
                      alt={prod.title}
                      className="w-full sm:w-28 h-40 object-cover rounded-2xl shrink-0 border border-slate-800 shadow-md"
                    />

                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-purple-400" /> Digital License Active
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {prod.title}
                        </h4>
                        <p className="text-xs text-purple-400 font-medium mt-1">
                          Author: {prod.author || prod.brand || 'NEXOVIRA Press'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Order Ref: #{item.orderId.slice(0, 8)} • Purchased {new Date(item.orderDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => setReadingPdf({
                            title: prod.title,
                            author: prod.author || prod.brand,
                            pdfUrl: pdfData,
                            pdfFileName: prod.pdfFileName || `${prod.title.replace(/\s+/g, '_')}.pdf`
                          })}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Read Online
                        </button>

                        <a
                          href={pdfData}
                          download={prod.pdfFileName || `${prod.title.replace(/\s+/g, '_')}.pdf`}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profile Details */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-6">
            <h3 className="text-lg font-bold text-white">Profile Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white">
                  {userProfile?.displayName || user.displayName || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email Address</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white">
                  {user.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Phone Number</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white">
                  {userProfile?.phone || user.phoneNumber || '+234 911 044 3054'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">User Role</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-bold text-cyan-400 uppercase">
                  {isAdmin ? 'Store Admin' : 'Verified Customer'}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notification Preferences in Profile */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Wishlist & Price Drop Email Subscriptions</h3>
                  <p className="text-xs text-slate-400">Manage instant alerts sent to {user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setActiveTab('alerts'); setAlertsSubTab('preferences'); }}
                className="text-xs text-amber-400 font-bold hover:underline"
              >
                Full Alert Center →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Back-in-Stock Alerts</p>
                  <p className="text-[11px] text-slate-400">Restock emails for wishlist items</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('wishlistBackInStock')}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    notificationPrefs.wishlistBackInStock ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                      notificationPrefs.wishlistBackInStock ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Price Drop Alerts</p>
                  <p className="text-[11px] text-slate-400">Flash deals & price reductions</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePref('wishlistPriceDrops')}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    notificationPrefs.wishlistPriceDrops ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                      notificationPrefs.wishlistPriceDrops ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Saved Delivery Addresses */}
      {activeTab === 'addresses' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <h3 className="text-lg font-bold text-white">Default Shipping Address</h3>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white text-sm">{userProfile?.displayName || 'Chief Customer'}</span>
              <span className="bg-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded text-[10px]">DEFAULT</span>
            </div>
            <p className="text-slate-400">14 Admiralty Way, Victoria Island, Lagos, Nigeria</p>
            <p className="text-slate-400">Contact: {userProfile?.phone || '+234 911 044 3054'}</p>
          </div>
        </div>
      )}

      {/* PDF E-book Reader Modal */}
      {readingPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-hidden">
          <div className="max-w-5xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="text-base font-extrabold text-white truncate">{readingPdf.title}</h3>
                  <p className="text-xs text-purple-400">{readingPdf.author || 'NEXOVIRA Verified Author'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {readingPdf.pdfUrl && (
                  <a
                    href={readingPdf.pdfUrl}
                    download={readingPdf.pdfFileName || 'ebook.pdf'}
                    className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                )}
                <button
                  onClick={() => setReadingPdf(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF Viewer Frame */}
            <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
              {readingPdf.pdfUrl ? (
                <iframe
                  src={readingPdf.pdfUrl}
                  title={readingPdf.title}
                  className="w-full h-full rounded-2xl border border-slate-800 bg-white"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  PDF document content unavailable.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
