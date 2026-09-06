import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Category,
  CategoryId, 
  UserRole, 
  CartItem, 
  Order, 
  HomepageSection,
  ActiveEcosystemView,
  CurrencyCode 
} from './types';
import { 
  PRODUCTS, 
  CATEGORIES, 
  STORES, 
  DEFAULT_HOMEPAGE_SECTIONS,
  INITIAL_BRAND_SETTINGS 
} from './data/mockData';
import { Header } from './components/Header';
import { HeroAISearch } from './components/HeroAISearch';
import { EcosystemCards } from './components/EcosystemCards';
import { TechServicesView } from './components/TechServicesView';
import { NigeriaServicesView } from './components/NigeriaServicesView';
import { AcademyView } from './components/AcademyView';
import { DigitalLibraryView } from './components/DigitalLibraryView';
import { NexoAIWorkspace } from './components/NexoAIWorkspace';
import { AffiliatePortalView } from './components/AffiliatePortalView';
import { ProductCard } from './components/ProductCard';
import { AIAssistantModal } from './components/AIAssistantModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductCompareModal } from './components/ProductCompareModal';
import { SellerDashboardView } from './components/SellerDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CustomerAccountView } from './components/CustomerAccountView';
import { SignInView } from './components/SignInView';
import { SignUpView } from './components/SignUpView';
import { 
  getProductsFromFirestore, 
  getCategoriesFromFirestore,
  getUserWishlistFromFirestore, 
  toggleWishlistInFirestore,
  recordAffiliateClickInFirestore,
  subscribeToProducts,
  subscribeToCategories,
  subscribeToUserWishlist
} from './lib/firestoreService';
import { isAllowedDestinationPath } from './lib/domainConfig';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { ContactView } from './components/ContactView';
import { EcosystemPresentationView } from './components/EcosystemPresentationView';
import { AuthDebugDiagnostics } from './components/AuthDebugDiagnostics';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WhatsAppSupportButton } from './components/WhatsAppSupportButton';
import { Footer } from './components/Footer';
import { formatCurrency } from './lib/currency';
import { 
  detectUserRegionAndCurrencySync, 
  detectUserRegionAndCurrencyAsync, 
  getSavedCurrencyPreference, 
  saveCurrencyPreference, 
  GeoDetectionResult 
} from './lib/geoCurrency';
import { SetPriceAlertModal } from './components/SetPriceAlertModal';
import { GeoCurrencyBanner } from './components/GeoCurrencyBanner';
import { evaluatePriceAlertsAgainstProducts } from './lib/priceAlertService';
import { useAuth } from './context/AuthContext';
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Filter, 
  Clock,
  Flame,
  ShieldAlert,
  Lock
} from 'lucide-react';

export default function App() {
  const { user, userProfile, isAdmin, isSeller } = useAuth();

  // Navigation & Ecosystem State
  const [activeView, setActiveView] = useState<ActiveEcosystemView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/affiliate') return 'affiliate';
      if (path === '/seller') return 'seller';
      if (path === '/admin') return 'admin';
      if (path === '/account') return 'account';
      if (path === '/signin') return 'signin';
      if (path === '/signup') return 'signup';
      if (path === '/book-service' || path === '/services/nigeria' || path === '/services-nigeria') return 'book-service';
      if (path === '/services' || path.startsWith('/service/')) return 'services';
      if (path === '/academy' || path.startsWith('/course/')) return 'academy';
      if (path === '/library' || path.startsWith('/ebook/')) return 'library';
      if (path === '/ai') return 'ai';
      if (path === '/about') return 'about';
      if (path === '/privacy') return 'privacy';
      if (path === '/terms') return 'terms';
      if (path === '/contact') return 'contact';
      if (path === '/presentation' || path === '/deck' || path === '/vision' || path === '/ecosystem') return 'presentation';
    }
    return 'home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/affiliate') setActiveView('affiliate');
      else if (path === '/seller') setActiveView('seller');
      else if (path === '/admin') setActiveView('admin');
      else if (path === '/account') setActiveView('account');
      else if (path === '/signin') setActiveView('signin');
      else if (path === '/signup') setActiveView('signup');
      else if (path === '/book-service' || path === '/services/nigeria' || path === '/services-nigeria') setActiveView('book-service');
      else if (path === '/services' || path.startsWith('/service/')) setActiveView('services');
      else if (path === '/academy' || path.startsWith('/course/')) setActiveView('academy');
      else if (path === '/library' || path.startsWith('/ebook/')) setActiveView('library');
      else if (path === '/ai') setActiveView('ai');
      else if (path === '/about') setActiveView('about');
      else if (path === '/privacy') setActiveView('privacy');
      else if (path === '/terms') setActiveView('terms');
      else if (path === '/contact') setActiveView('contact');
      else if (path === '/presentation' || path === '/deck' || path === '/vision' || path === '/ecosystem') setActiveView('presentation');
      else setActiveView('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Geolocation & Multi-Currency State
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(() => {
    const saved = getSavedCurrencyPreference();
    if (saved) return saved;
    const syncGeo = detectUserRegionAndCurrencySync();
    return syncGeo.detectedCurrency;
  });
  const [geoInfo, setGeoInfo] = useState<GeoDetectionResult | null>(null);

  // Price Alert Modal State
  const [priceAlertModalProduct, setPriceAlertModalProduct] = useState<Product | null>(null);

  // Auto-Detect User Region and Currency on Mount
  useEffect(() => {
    detectUserRegionAndCurrencyAsync().then((result) => {
      setGeoInfo(result);
      if (result.isAutoApplied && !getSavedCurrencyPreference()) {
        setCurrentCurrency(result.detectedCurrency);
      }
    });
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrentCurrency(newCurrency);
    saveCurrencyPreference(newCurrency);
  };

  const currentRole = userProfile?.role || 'customer';

  // Products Data State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<number>(3000);

  // Modals & Prompts
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialQuery, setAiInitialQuery] = useState('');

  // Wishlist State & Sync
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Capture Affiliate Ref Code & Deep Links from URL with 30-Day Expiration & Security Validation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let ref = urlParams.get('ref') || urlParams.get('aff');
    const linkId = urlParams.get('linkId') || undefined;
    const target = urlParams.get('target');
    const pathname = window.location.pathname;

    if (pathname.startsWith('/ref/')) {
      const parts = pathname.replace('/ref/', '').split('/');
      ref = parts[0].split('?')[0];
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      const now = Date.now();
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 Days

      sessionStorage.setItem('nexovira_ref_code', cleanRef);
      localStorage.setItem('nexovira_ref_code', cleanRef);
      localStorage.setItem('nexovira_ref_expires_at', expiresAt.toString());
      if (linkId) {
        sessionStorage.setItem('nexovira_ref_link_id', linkId);
        localStorage.setItem('nexovira_ref_link_id', linkId);
      }
      document.cookie = `nexovira_ref_code=${cleanRef}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;

      recordAffiliateClickInFirestore(cleanRef, undefined, target || pathname, linkId).catch(console.error);

      // Validate target path before redirecting (prevent open redirect attacks)
      if (target && isAllowedDestinationPath(target)) {
        handleNavigate(target);
      }
    }
  }, []);

  // Load Wishlist from localStorage and Firestore
  useEffect(() => {
    const savedWishlist = localStorage.getItem('nexovira_wishlist');
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      // Subscribe to user's remote wishlist in real-time
      const unsubscribe = subscribeToUserWishlist(user.uid, (remoteWishlist) => {
        if (remoteWishlist) {
          setWishlist(remoteWishlist);
          localStorage.setItem('nexovira_wishlist', JSON.stringify(remoteWishlist));
        }
      });
      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const handleToggleWishlist = async (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const exists = wishlist.includes(product.id);
    const updated = exists 
      ? wishlist.filter(id => id !== product.id)
      : [...wishlist, product.id];
    
    setWishlist(updated);
    localStorage.setItem('nexovira_wishlist', JSON.stringify(updated));

    if (user?.uid) {
      try {
        await toggleWishlistInFirestore(user.uid, product.id, wishlist);
      } catch (err) {
        console.error('Wishlist sync error:', err);
      }
    }
  };

  // Product Comparison Matrix
  const [comparedProducts, setComparedProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Cart & Checkout
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Homepage Builder Layout
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);

  // Real-time synchronization across all domains, sites, and accounts
  useEffect(() => {
    // 1. Subscribe to Firestore products in real-time
    const unsubProducts = subscribeToProducts((liveProds) => {
      if (liveProds) {
        setAllProducts(liveProds);
        evaluatePriceAlertsAgainstProducts(liveProds).catch(console.error);
      }
    });

    // 2. Subscribe to Firestore categories in real-time
    const unsubCategories = subscribeToCategories((liveCats) => {
      if (liveCats) {
        setCategories(liveCats);
      }
    });

    // 3. Fallback/Optimistic event listener for fast local actions
    const handleProductsChanged = async () => {
      try {
        const [liveProds, liveCats] = await Promise.all([
          getProductsFromFirestore(),
          getCategoriesFromFirestore()
        ]);
        if (liveProds) setAllProducts(liveProds);
        if (liveCats) setCategories(liveCats);
      } catch (err) {
        console.error('Sync refresh error:', err);
      }
    };
    window.addEventListener('nexovira:products-changed', handleProductsChanged);

    // 4. Cross-tab & Multi-domain Storage Synchronization (cart, wishlist, currencies)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nexovira_cart' && e.newValue) {
        try {
          setCartItems(JSON.parse(e.newValue));
        } catch (err) {}
      }
      if (e.key === 'nexovira_wishlist' && e.newValue) {
        try {
          setWishlist(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const savedCart = localStorage.getItem('nexovira_cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {}
    }

    return () => {
      unsubProducts();
      unsubCategories();
      window.removeEventListener('nexovira:products-changed', handleProductsChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save Cart to localStorage
  useEffect(() => {
    localStorage.setItem('nexovira_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Theme Syncing
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Remove handleRoleChange as portal switcher is removed

  // Route Navigation Handler
  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    const cleanPath = path.toLowerCase();
    if (cleanPath.startsWith('/category/')) {
      const cat = cleanPath.replace('/category/', '');
      setSelectedCategory(cat as CategoryId);
      setActiveView('marketplace');
    } else if (cleanPath.startsWith('/product/')) {
      const pId = path.split('/product/')[1];
      const found = allProducts.find(p => p.id === pId);
      if (found) setSelectedProduct(found);
      setActiveView('marketplace');
    } else if (cleanPath === '/book-service' || cleanPath === '/services/nigeria' || cleanPath === '/services-nigeria') {
      setActiveView('book-service');
    } else if (cleanPath === '/services' || cleanPath.startsWith('/service/')) {
      setActiveView('services');
    } else if (cleanPath === '/academy' || cleanPath.startsWith('/course/')) {
      setActiveView('academy');
    } else if (cleanPath === '/library' || cleanPath.startsWith('/ebook/')) {
      setActiveView('library');
    } else if (cleanPath === '/ai') {
      setActiveView('ai');
    } else if (cleanPath === '/affiliate') {
      setActiveView('affiliate');
    } else if (cleanPath === '/about') {
      setActiveView('about');
    } else if (cleanPath === '/privacy') {
      setActiveView('privacy');
    } else if (cleanPath === '/terms') {
      setActiveView('terms');
    } else if (cleanPath === '/contact') {
      setActiveView('contact');
    } else if (cleanPath === '/seller') {
      setActiveView('seller');
    } else if (cleanPath === '/admin') {
      setActiveView('admin');
    } else if (cleanPath === '/account') {
      setActiveView('account');
    } else if (cleanPath === '/signin') {
      setActiveView('signin');
    } else if (cleanPath === '/signup') {
      setActiveView('signup');
    } else {
      setActiveView('marketplace');
    }
  };

  // Cart Actions
  const handleAddToCart = (product: Product, quantity: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Compare Actions
  const handleToggleCompare = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 products at a time.');
        return prev;
      }
      return [...prev, product];
    });
  };

  const handleOpenAIWithQuery = (queryText?: string) => {
    if (queryText) {
      setAiInitialQuery(queryText);
      setActiveView('ai');
    } else {
      setIsAIModalOpen(true);
    }
  };

  // Filtered Products List
  const filteredProducts = allProducts.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = p.price <= priceFilter;
    return matchesCategory && matchesSearch && matchesPrice;
  });

  const flashDeals = allProducts.filter((p) => p.isFlashDeal);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Global Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        onNavigate={handleNavigate}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        wishlistCount={0}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAI={handleOpenAIWithQuery}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        theme={theme}
        setTheme={setTheme}
        currentCurrency={currentCurrency}
        onCurrencyChange={handleCurrencyChange}
        whatsappPhone={INITIAL_BRAND_SETTINGS.whatsappPhone}
      />

      {/* Main Content View Switcher across 6 Ecosystems */}
      <main className="flex-1">
        {activeView === 'book-service' ? (
          <TechServicesView 
            currentCurrency={currentCurrency} 
            initialTab="book-service"
            onNavigateToNigeriaHub={() => handleNavigate('/book-service')}
            onNavigateToAdminDashboard={() => handleNavigate('/admin')}
            onNavigateHome={() => handleNavigate('/')}
          />
        ) : activeView === 'services' ? (
          <TechServicesView 
            currentCurrency={currentCurrency} 
            initialTab="overview"
            onNavigateToNigeriaHub={() => handleNavigate('/book-service')}
            onNavigateToAdminDashboard={() => handleNavigate('/admin')}
            onNavigateHome={() => handleNavigate('/')}
          />
        ) : activeView === 'academy' ? (
          <AcademyView currentCurrency={currentCurrency} />
        ) : activeView === 'library' ? (
          <DigitalLibraryView currentCurrency={currentCurrency} />
        ) : activeView === 'ai' ? (
          <NexoAIWorkspace
            initialPrompt={aiInitialQuery}
            currentCurrency={currentCurrency}
            onAddToCart={handleAddToCart}
            onNavigateToView={(v: any) => setActiveView(v)}
          />
        ) : activeView === 'affiliate' ? (
          <AffiliatePortalView currentCurrency={currentCurrency} onNavigate={handleNavigate} />
        ) : activeView === 'seller' ? (
          /* Role Protected Seller Studio */
          (userProfile?.role === 'seller' || userProfile?.role === 'admin' || isSeller || isAdmin) ? (
            <SellerDashboardView
              onAddProduct={(newProd) => setAllProducts([newProd, ...allProducts])}
              sellerId={userProfile?.uid || user?.uid}
              sellerName={userProfile?.displayName || (userProfile as any)?.storeName || user?.displayName}
              onNavigate={handleNavigate}
            />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#0B0F17]">
              <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">Seller Studio Access Restricted</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Seller Studio is reserved for registered merchant stores on NEXOVIRA. Your current account role is <span className="text-cyan-400 font-bold uppercase">{userProfile?.role || 'Guest'}</span>.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleNavigate('/signup')}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Register Store as Seller
                  </button>
                  <button
                    onClick={() => handleNavigate('/')}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Return to Marketplace
                  </button>
                </div>
              </div>
            </div>
          )
        ) : activeView === 'admin' ? (
          /* Role Protected Admin Center */
          (userProfile?.role === 'admin' || isAdmin) ? (
            <AdminDashboardView
              homepageSections={homepageSections}
              setHomepageSections={setHomepageSections}
            />
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#0B0F17]">
              <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-white">Admin Command Access Restricted</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Platform Administration is strictly restricted to authorized platform owners. You cannot access this portal without an Administrator account.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleNavigate('/signin')}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Sign In with Admin Account
                  </button>
                  <button
                    onClick={() => handleNavigate('/')}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Return to Marketplace
                  </button>
                </div>
              </div>
            </div>
          )
        ) : activeView === 'account' ? (
          <CustomerAccountView onNavigate={handleNavigate} currentCurrency={currentCurrency} />
        ) : activeView === 'signin' ? (
          <SignInView onNavigate={handleNavigate} />
        ) : activeView === 'signup' ? (
          <SignUpView onNavigate={handleNavigate} />
        ) : activeView === 'about' ? (
          <AboutView onNavigate={handleNavigate} />
        ) : activeView === 'privacy' ? (
          <PrivacyView />
        ) : activeView === 'terms' ? (
          <TermsView />
        ) : activeView === 'contact' ? (
          <ContactView />
        ) : activeView === 'presentation' ? (
          <EcosystemPresentationView onNavigate={handleNavigate} onOpenMarketplace={() => handleNavigate('/marketplace')} />
        ) : (
          /* Home & Marketplace Ecosystem View */
          <div className="space-y-8 pb-16">
            
            {/* Hero AI Search Section */}
            {homepageSections.find((s) => s.type === 'hero')?.enabled && (
              <HeroAISearch
                onOpenAI={handleOpenAIWithQuery}
                onNavigate={setActiveView}
                currentCurrency={currentCurrency}
                whatsappPhone={INITIAL_BRAND_SETTINGS.whatsappPhone}
              />
            )}

            {/* Six Ecosystem Visual Cards */}
            {homepageSections.find((s) => s.type === 'ecosystem-cards')?.enabled && (
              <EcosystemCards onNavigate={setActiveView} />
            )}

            {/* Category Grid */}
            {homepageSections.find((s) => s.type === 'categories')?.enabled && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Appliance & Electronics Categories
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Direct manufacturer inventory categorized for smart homes
                    </p>
                  </div>

                  <button
                    onClick={() => { setSelectedCategory('all'); setActiveView('marketplace'); }}
                    className="text-xs font-bold text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>View All Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {(categories.length > 0 ? categories : CATEGORIES).map((cat) => {
                    const count = allProducts.filter((p) => p.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setActiveView('marketplace');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 group ${
                          selectedCategory === cat.id
                            ? 'bg-cyan-500/10 border-cyan-500 shadow-md ring-2 ring-cyan-500/30'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                          {cat.name}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          {count} {count === 1 ? 'Product' : 'Products'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Flash Deals Carousel */}
            {homepageSections.find((s) => s.type === 'flash-deals')?.enabled && flashDeals.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border border-red-900/50 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-600 rounded-2xl text-white shadow-lg">
                        <Flame className="w-6 h-6 fill-current animate-bounce" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-black text-white">NEXOVIRA Flash Deals</h2>
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Limited Stock
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Up to 25% off inverter air conditioners & 4K OLED displays</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-900/80 px-4 py-2 rounded-xl border border-red-900/40 text-red-400 shrink-0">
                      <Clock className="w-4 h-4 text-red-500 animate-spin-slow" />
                      <span>Ends in 08h : 42m : 19s</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashDeals.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onSelectProduct={(p) => setSelectedProduct(p)}
                        onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                        onAskAI={(p, e) => {
                          e.stopPropagation();
                          handleOpenAIWithQuery(`Explain specifications for ${p.title}`);
                        }}
                        onToggleCompare={handleToggleCompare}
                        onToggleWishlist={handleToggleWishlist}
                        isCompared={comparedProducts.some((cp) => cp.id === prod.id)}
                        isInWishlist={wishlist.includes(prod.id)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Main Featured Marketplace Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Verified Marketplace Catalog
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Showing {filteredProducts.length} grounded products with official manufacturer warranties
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 text-xs">
                  <Filter className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Max Price:</span>
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="100"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(Number(e.target.value))}
                    className="w-28 accent-cyan-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-cyan-500">{formatCurrency(priceFilter, currentCurrency)}</span>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-2xl mx-auto shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                    <Filter className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedCategory !== 'all' 
                        ? `No products available in ${(categories.find(c => c.id === selectedCategory) || CATEGORIES.find(c => c.id === selectedCategory))?.name || selectedCategory}`
                        : 'No products match your search or price criteria'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Our NEXOVIRA merchant stores and Lagos hub stock new inventory daily. You can request custom procurement or ask NexoAI for recommendations.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                        setPriceFilter(3000);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Reset All Filters
                    </button>
                    <button
                      onClick={() => handleNavigate('/contact')}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs rounded-xl transition-colors"
                    >
                      Request Custom Product
                    </button>
                    <button
                      onClick={() => handleOpenAIWithQuery(`Recommend products similar to ${selectedCategory}`)}
                      className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold text-xs rounded-xl hover:bg-cyan-500/20 transition-colors"
                    >
                      Ask NexoAI
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={(p) => setSelectedProduct(p)}
                      onAddToCart={(p, e) => handleAddToCart(p, 1, e)}
                      onAskAI={(p, e) => {
                        e.stopPropagation();
                        handleOpenAIWithQuery(`Is ${p.title} good for my needs?`);
                      }}
                      onToggleCompare={handleToggleCompare}
                      onToggleWishlist={handleToggleWishlist}
                      onSetPriceAlert={(p) => setPriceAlertModalProduct(p)}
                      currentCurrency={currentCurrency}
                      isCompared={comparedProducts.some((cp) => cp.id === prod.id)}
                      isInWishlist={wishlist.includes(prod.id)}
                    />
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* Floating WhatsApp Support Widget */}
      <WhatsAppSupportButton whatsappNumber={INITIAL_BRAND_SETTINGS.whatsappPhone} variant="floating" />

      {/* Geolocation Auto-Detection Currency Toast / Banner */}
      <GeoCurrencyBanner
        currentCurrency={currentCurrency}
        geoInfo={geoInfo}
        onCurrencyChange={handleCurrencyChange}
      />

      {/* Global Footer */}
      <Footer
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setActiveView('marketplace');
        }}
        onOpenAI={() => handleOpenAIWithQuery()}
        onNavigate={handleNavigate}
        currentCurrency={currentCurrency}
      />

      {/* Modals & Drawers */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialQuery={aiInitialQuery}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onCompareProduct={(p) => handleToggleCompare(p)}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, qty) => handleAddToCart(p, qty)}
        onAskAI={(q) => handleOpenAIWithQuery(q)}
        onCompare={(p) => handleToggleCompare(p)}
        onToggleWishlist={handleToggleWishlist}
        onSetPriceAlert={(p) => setPriceAlertModalProduct(p)}
        onProductUpdated={(updatedProd) => {
          setAllProducts((prev) =>
            prev.map((p) => (p.id === updatedProd.id ? { ...p, rating: updatedProd.rating, reviewCount: updatedProd.reviewCount } : p))
          );
          if (selectedProduct?.id === updatedProd.id) {
            setSelectedProduct((prev) => (prev ? { ...prev, rating: updatedProd.rating, reviewCount: updatedProd.reviewCount } : null));
          }
        }}
        onSignInRequested={() => {
          setSelectedProduct(null);
          handleNavigate('/signin');
        }}
        currentCurrency={currentCurrency}
        isInWishlist={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
      />

      {/* Target Price Alert Setup Modal */}
      {priceAlertModalProduct && (
        <SetPriceAlertModal
          isOpen={Boolean(priceAlertModalProduct)}
          onClose={() => setPriceAlertModalProduct(null)}
          product={priceAlertModalProduct}
          currentCurrency={currentCurrency}
          onSignInRequired={() => {
            setPriceAlertModalProduct(null);
            handleNavigate('/signin');
          }}
        />
      )}

      <ProductCompareModal
        products={comparedProducts}
        onClose={() => setIsCompareModalOpen(false)}
        onRemoveProduct={(id) => setComparedProducts((prev) => prev.filter((p) => p.id !== id))}
        onAddToCart={(p) => handleAddToCart(p, 1)}
        onAskAI={(q) => handleOpenAIWithQuery(q)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        currentCurrency={currentCurrency}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        currentCurrency={currentCurrency}
        onOrderSuccess={(ord) => {
          setCartItems([]);
          setActiveView('account');
        }}
      />

      {/* Live Auth State Inspector Diagnostics */}
      <AuthDebugDiagnostics activeView={activeView} />

    </div>
  );
}
