import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  ShoppingCart, 
  User, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ShoppingBag,
  Code2,
  GraduationCap,
  BookOpen,
  Share2,
  Phone,
  Info,
  HelpCircle,
  LogIn,
  LogOut,
  Mic,
  MicOff,
  Layers,
  Compass,
  Briefcase
} from 'lucide-react';
import { NexoviraLogo } from './NexoviraLogo';
import { CATEGORIES } from '../data/mockData';
import { CategoryId, Category, UserRole, CurrencyCode, ActiveEcosystemView } from '../types';
import { CurrencySelector } from './CurrencySelector';
import { WhatsAppSupportButton } from './WhatsAppSupportButton';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeView: ActiveEcosystemView;
  setActiveView: (view: ActiveEcosystemView) => void;
  onNavigate: (path: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAI: (query?: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: CategoryId | 'all';
  setSelectedCategory: (cat: CategoryId | 'all') => void;
  categories?: Category[];
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  currentCurrency: CurrencyCode;
  onCurrencyChange: (code: CurrencyCode) => void;
  whatsappPhone?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  onNavigate,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenAI,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  theme,
  setTheme,
  currentCurrency,
  onCurrencyChange,
  whatsappPhone = '+2348129595134',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const toggleVoiceSearch = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback('Voice search is not supported in this browser.');
      setTimeout(() => setSpeechFeedback(''), 3000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      setSpeechFeedback('');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permissionErr: any) {
          if (permissionErr.name === 'NotAllowedError' || permissionErr.name === 'PermissionDeniedError') {
            setIsListening(false);
            setSpeechFeedback('Microphone access denied in browser.');
            setTimeout(() => setSpeechFeedback(''), 4000);
            return;
          }
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('Listening... Speak product name now');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setSearchQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'aborted') {
          setSpeechFeedback('');
          return;
        }
        if (event.error === 'no-speech') {
          setSpeechFeedback('No speech heard.');
        } else {
          setSpeechFeedback('Speech input closed.');
        }
        setTimeout(() => setSpeechFeedback(''), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      recognitionRef.current = null;
    }
  };

  const { user, userProfile, isAdmin, isSeller, logout } = useAuth();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('/marketplace');
    }
  };

  const navLinkClass = (pathView: string, activeColorClass: string) =>
    `px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors ${
      activeView === pathView
        ? `${activeColorClass} font-black border`
        : 'text-slate-600 dark:text-slate-300 hover:text-cyan-500'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md transition-colors">
      {/* Top Bar: Multi-Currency, WhatsApp & Phone Hotline */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            NEXOVIRA AI Ecosystem — Coming Soon
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <a href="tel:+2349110443054" className="hidden sm:flex items-center gap-1 text-slate-300 hover:text-cyan-400 font-mono text-[11px]">
            <Phone className="w-3 h-3 text-cyan-400" /> +234 911 044 3054
          </a>
          <span className="hidden md:inline text-slate-600">|</span>
          <WhatsAppSupportButton whatsappNumber={whatsappPhone} variant="inline" />
        </div>

        <div className="flex items-center gap-3">
          {/* Currency Selector */}
          <CurrencySelector
            currentCurrency={currentCurrency}
            onCurrencyChange={onCurrencyChange}
            showFullLabel={false}
          />

          {/* Role Status Badge if logged in as Seller or Admin */}
          {userProfile && userProfile.role === 'admin' && (
            <a
              href="/admin"
              onClick={(e) => { e.preventDefault(); onNavigate('/admin'); }}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <span>⚡ Admin Dashboard</span>
            </a>
          )}
          {userProfile && userProfile.role === 'seller' && (
            <a
              href="/seller"
              onClick={(e) => { e.preventDefault(); onNavigate('/seller'); }}
              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <span>🏪 Seller Dashboard</span>
            </a>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo Link */}
        <a 
          href="/"
          onClick={(e) => { e.preventDefault(); onNavigate('/'); }} 
          className="cursor-pointer shrink-0 py-1"
          aria-label="NEXOVIRA Home"
        >
          <NexoviraLogo size={38} showText={true} showTagline={true} taglineClassName="hidden xl:block text-[9px] font-bold text-cyan-500 dark:text-cyan-400" />
        </a>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-xl items-center relative">
          <div className="relative w-full flex items-center bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden focus-within:border-cyan-500 dark:focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
            <select
              value={selectedCategory}
              onChange={(e) => {
                const cat = e.target.value as CategoryId | 'all';
                setSelectedCategory(cat);
                if (cat !== 'all') onNavigate(`/category/${cat}`);
                else onNavigate('/marketplace');
              }}
              className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2.5 border-r border-slate-300 dark:border-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="all">All Items</option>
              {(categories && categories.length > 0 ? categories : CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              placeholder={isListening ? "Listening... Speak now..." : "Search appliances, refrigerators, ACs, solar or ask AI..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />

            {/* Microphone Voice Search Button */}
            <button
              type="button"
              onClick={toggleVoiceSearch}
              className={`p-1.5 rounded-lg transition-all mr-1 shrink-0 flex items-center justify-center ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50'
                  : 'text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'Stop Voice Search' : 'Voice Search (Microphone)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onOpenAI(searchQuery || 'Help me search NEXOVIRA appliances')}
              className="mr-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
              title="Search with NEXOVIRA AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </div>

          {speechFeedback && (
            <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-lg bg-slate-900 text-cyan-300 text-xs text-center border border-slate-800 z-50 shadow-lg">
              {speechFeedback}
            </div>
          )}
        </form>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/ai"
            onClick={(e) => { e.preventDefault(); onNavigate('/ai'); }}
            className="relative group p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-200 animate-spin-slow" />
            <span className="hidden sm:inline">AI Workspace</span>
          </a>

          {/* Price Alerts Notification Dropdown */}
          <NotificationDropdown
            currentCurrency={currentCurrency}
            onNavigate={onNavigate}
          />

          <a
            href="/cart"
            onClick={(e) => { e.preventDefault(); onOpenCart(); }}
            className="relative p-2.5 text-slate-700 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="View Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B0F17]">
                {cartCount}
              </span>
            )}
          </a>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <a
                href={userProfile?.role === 'admin' ? '/admin' : userProfile?.role === 'seller' ? '/seller' : (userProfile?.role === 'affiliate' || userProfile?.isAffiliate) ? '/affiliate' : '/account'}
                onClick={(e) => {
                  e.preventDefault();
                  if (userProfile?.role === 'admin') onNavigate('/admin');
                  else if (userProfile?.role === 'seller') onNavigate('/seller');
                  else if (userProfile?.role === 'affiliate' || userProfile?.isAffiliate) onNavigate('/affiliate');
                  else onNavigate('/account');
                }}
                className="p-1.5 sm:px-3 text-slate-700 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-800"
                title="My Profile & Portal"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black text-xs flex items-center justify-center">
                  {(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden xl:inline text-xs font-bold truncate max-w-[100px]">
                  {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
                {(userProfile?.role === 'affiliate' || userProfile?.isAffiliate) && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    AFFILIATE
                  </span>
                )}
              </a>

              <button
                onClick={async () => {
                  await logout();
                  onNavigate('/signin');
                }}
                className="p-2 sm:px-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold border border-transparent hover:border-rose-500/30 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span className="hidden xl:inline text-rose-400">Sign Out</span>
              </button>
            </div>
          ) : (
            <a
              href="/signin"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/signin');
              }}
              className="p-2 sm:px-3 text-slate-700 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Sign In"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span className="hidden xl:inline">Sign In</span>
            </a>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Six Ecosystem Navigation Tabs Bar */}
      <div className="hidden lg:block bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-bold py-2">
          <div className="flex items-center gap-1 sm:gap-2">
            
            <a
              href="/marketplace"
              onClick={(e) => { e.preventDefault(); onNavigate('/marketplace'); }}
              className={navLinkClass('marketplace', 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30')}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </a>

            <div className="flex items-center">
              <a
                href="/services"
                onClick={(e) => { e.preventDefault(); onNavigate('/services'); }}
                className={navLinkClass(activeView === 'services' ? 'services' : '', 'bg-blue-500/10 text-blue-500 border-blue-500/30')}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Tech Services</span>
              </a>
              <button
                type="button"
                onClick={() => onNavigate('/book-service')}
                className={`ml-1 text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeView === 'book-service'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20'
                }`}
                title="Book an On-Site or Domestic Service in Nigeria (under Tech Services)"
              >
                <Briefcase className="w-3 h-3" />
                <span>Book a Service</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-black">🇳🇬</span>
              </button>
            </div>

            <a
              href="/academy"
              onClick={(e) => { e.preventDefault(); onNavigate('/academy'); }}
              className={navLinkClass('academy', 'bg-amber-500/10 text-amber-500 border-amber-500/30')}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academy</span>
            </a>

            <a
              href="/library"
              onClick={(e) => { e.preventDefault(); onNavigate('/library'); }}
              className={navLinkClass('library', 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30')}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Digital Library</span>
            </a>

            <a
              href="/ai"
              onClick={(e) => { e.preventDefault(); onNavigate('/ai'); }}
              className={navLinkClass('ai', 'bg-purple-500/10 text-purple-500 border-purple-500/30')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEXOVIRA AI</span>
            </a>

            <a
              href="/affiliate"
              onClick={(e) => { e.preventDefault(); onNavigate('/affiliate'); }}
              className={navLinkClass('affiliate', 'bg-rose-500/10 text-rose-500 border-rose-500/30')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Affiliate & Earn</span>
            </a>

            <a
              href="/presentation"
              onClick={(e) => { e.preventDefault(); onNavigate('/presentation'); }}
              className={navLinkClass('presentation', 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30')}
              title="NEXOVIRA Ecosystem Vision Presentation"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Ecosystem Deck</span>
            </a>

            <a
              href="/about"
              onClick={(e) => { e.preventDefault(); onNavigate('/about'); }}
              className={navLinkClass('about', 'bg-slate-500/10 text-slate-300 border-slate-500/30')}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About Us</span>
            </a>

            <a
              href="/contact"
              onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }}
              className={navLinkClass('contact', 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30')}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Contact</span>
            </a>

          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>Lagos Hub • Nationwide Delivery</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F17] px-4 py-4 space-y-4">
          {/* User Account / Sign Out / Sign In Quick Bar */}
          {user ? (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-md">
              <a
                href={userProfile?.role === 'admin' ? '/admin' : userProfile?.role === 'seller' ? '/seller' : (userProfile?.role === 'affiliate' || userProfile?.isAffiliate) ? '/affiliate' : '/account'}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (userProfile?.role === 'admin') onNavigate('/admin');
                  else if (userProfile?.role === 'seller') onNavigate('/seller');
                  else if (userProfile?.role === 'affiliate' || userProfile?.isAffiliate) onNavigate('/affiliate');
                  else onNavigate('/account');
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                  {(userProfile?.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-cyan-400 font-mono capitalize">
                    {userProfile?.role || 'Customer'} Portal →
                  </p>
                </div>
              </a>
              <button
                onClick={async () => {
                  await logout();
                  setMobileMenuOpen(false);
                  onNavigate('/signin');
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                title="Sign Out of Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Welcome to NEXOVIRA</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/signin');
                }}
                className="px-3 py-1.5 bg-cyan-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-cyan-400 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          <div className="p-3 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
            <NexoviraLogo size={32} showText={true} showTagline={true} taglineClassName="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 mt-0.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <div className="col-span-2 p-3 bg-gradient-to-r from-blue-950/40 to-slate-900 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <a
                  href="/services"
                  onClick={(e) => { e.preventDefault(); onNavigate('/services'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 text-blue-400 font-bold hover:text-white"
                >
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <span>Tech Services Ecosystem</span>
                </a>
                <span className="text-[10px] text-slate-400">Hub</span>
              </div>
              <a 
                href="/book-service" 
                onClick={(e) => { e.preventDefault(); onNavigate('/book-service'); setMobileMenuOpen(false); }} 
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-left flex items-center justify-between text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-white" />
                  <span>Book a Service (On-Site Specialists)</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black">🇳🇬 Hub →</span>
              </a>
            </div>

            <a href="/marketplace" onClick={(e) => { e.preventDefault(); onNavigate('/marketplace'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-500" /> Marketplace
            </a>
            <a href="/academy" onClick={(e) => { e.preventDefault(); onNavigate('/academy'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-500" /> Academy
            </a>
            <a href="/library" onClick={(e) => { e.preventDefault(); onNavigate('/library'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" /> Digital Library
            </a>
            <a href="/ai" onClick={(e) => { e.preventDefault(); onNavigate('/ai'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> NEXOVIRA AI
            </a>
            <a href="/affiliate" onClick={(e) => { e.preventDefault(); onNavigate('/affiliate'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Share2 className="w-4 h-4 text-rose-500" /> Affiliate & Earn
            </a>
            <a href="/presentation" onClick={(e) => { e.preventDefault(); onNavigate('/presentation'); setMobileMenuOpen(false); }} className="p-3 bg-cyan-500/10 dark:bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-left flex items-center gap-2 col-span-2">
              <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>NEXOVIRA Ecosystem Deck (Vision • 12 Slides)</span>
            </a>
            <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('/about'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" /> About Us
            </a>
            <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); setMobileMenuOpen(false); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" /> Contact
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
