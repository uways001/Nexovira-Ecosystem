import React, { useState, useEffect, useMemo } from 'react';
import { 
  AffiliateProfile, 
  AffiliateCommissionRecord, 
  AffiliateLinkRecord, 
  CurrencyCode, 
  Product, 
  TechService, 
  Course, 
  DigitalProduct,
  AffiliateLedger,
  AffiliateNotification,
  AffiliateConfig,
  PayoutRequest
} from '../types';
import { formatCurrency, formatNativeCurrency, convertDirectly } from '../lib/currency';
import { getLiveExchangeRate } from '../lib/exchangeRateService';
import { useAuth } from '../context/AuthContext';
import { NexoviraLogo } from './NexoviraLogo';
import { 
  getAffiliateProfileFromFirestore, 
  applyForAffiliateProgramInFirestore, 
  getAffiliateCommissionsFromFirestore,
  getProductsFromFirestore,
  getTechServicesFromFirestore,
  getOfficialCoursesFromFirestore,
  getOfficialEbooksFromFirestore,
  createPayoutRequestInFirestore,
  createOrGetAffiliateLinkInFirestore,
  getAffiliateLinksFromFirestore,
  getAffiliateWalletSummaryInFirestore,
  getAffiliateNotificationsFromFirestore,
  getAffiliateConfigFromFirestore,
  getPayoutRequestsFromFirestore,
  fetchNigerianBanksList,
  verifyNigerianBankAccount
} from '../lib/firestoreService';
import { COURSES, DIGITAL_PRODUCTS } from '../data/mockData';
import { copyToClipboard, buildAffiliateDeepLink, getCurrentPublicOrigin } from '../lib/domainConfig';
import { 
  Share2, 
  Link as LinkIcon, 
  QrCode, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  CreditCard,
  UserCheck,
  AlertCircle,
  Store,
  ShoppingBag,
  Wrench,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Wallet,
  User,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  RotateCcw,
  Loader2,
  Bell,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  LogIn,
  UserPlus,
  LogOut
} from 'lucide-react';

interface AffiliatePortalViewProps {
  currentCurrency: CurrencyCode;
  onNavigate?: (path: string) => void;
}

export type MarketplaceContentType = 'ALL' | 'PRODUCT' | 'SERVICE' | 'COURSE' | 'EBOOK';

export interface StandardMarketplaceItem {
  id: string;
  title: string;
  contentType: 'PRODUCT' | 'SERVICE' | 'COURSE' | 'EBOOK';
  category: string;
  price: number;
  image: string;
  sellerOrProvider: string;
  commissionRate: number; // e.g. 10%
  description: string;
  affiliateEnabled: boolean;
  targetPath: string; // e.g. /product/prod-1
}

export const AffiliatePortalView: React.FC<AffiliatePortalViewProps> = ({ currentCurrency, onNavigate }) => {
  const { user, userProfile, logout, loading: authLoading } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'marketplace' | 'wallet' | 'links' | 'account'>('marketplace');

  // Core Data States
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommissionRecord[]>([]);
  const [links, setLinks] = useState<AffiliateLinkRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<AffiliateLedger[]>([]);
  const [notifications, setNotifications] = useState<AffiliateNotification[]>([]);
  const [config, setConfig] = useState<AffiliateConfig | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-Currency Wallet Balances State
  const [walletBalances, setWalletBalances] = useState<Record<string, { available: number; pending: number; totalEarned: number; totalWithdrawn: number }>>({
    NGN: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
    USD: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
    GBP: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
    EUR: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 }
  });
  const [selectedWalletCurrency, setSelectedWalletCurrency] = useState<CurrencyCode>('NGN');

  // Content Items
  const [products, setProducts] = useState<Product[]>([]);
  const [techServices, setTechServices] = useState<TechService[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [ebooks, setEbooks] = useState<DigitalProduct[]>([]);

  // Search & Filters
  const [selectedContentType, setSelectedContentType] = useState<MarketplaceContentType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [minCommission, setMinCommission] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'commission_desc' | 'price_asc' | 'price_desc' | 'title'>('commission_desc');

  // Application / Account Form State
  const [promotionalChannels, setPromotionalChannels] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [payoutProvider, setPayoutProvider] = useState('Bank Transfer');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [accountSaveSuccess, setAccountSaveSuccess] = useState(false);

  // Paystack Bank Verification States
  const [banksList, setBanksList] = useState<Array<{ name: string; code: string; slug?: string }>>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerificationError, setBankVerificationError] = useState('');
  const [bankVerificationSuccess, setBankVerificationSuccess] = useState('');
  const [isBankVerified, setIsBankVerified] = useState(false);

  // Sharing & Notifications States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<string | null>(null);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutCurrency, setPayoutCurrency] = useState<CurrencyCode>('NGN');
  const [payoutTargetCurrency, setPayoutTargetCurrency] = useState<CurrencyCode>('NGN');
  const [payoutStatusMsg, setPayoutStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      loadAffiliateData();
    }
  }, [user?.uid, userProfile?.role, userProfile?.isAffiliate, authLoading]);

  const loadAffiliateData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Catalog Items across all 4 Content Types
      const [prodsData, servsData, coursesData, ebooksData] = await Promise.all([
        getProductsFromFirestore(),
        getTechServicesFromFirestore(),
        getOfficialCoursesFromFirestore(),
        getOfficialEbooksFromFirestore()
      ]);

      setProducts(prodsData);
      setTechServices(servsData);
      setCourses(coursesData.length > 0 ? coursesData : COURSES);
      setEbooks(ebooksData.length > 0 ? ebooksData : DIGITAL_PRODUCTS);

      if (user?.uid) {
        // 2. Fetch or Auto-create Affiliate Profile
        let affProf = await getAffiliateProfileFromFirestore(user.uid);
        
        if (!affProf && (userProfile?.role === 'affiliate' || userProfile?.isAffiliate)) {
          try {
            affProf = await applyForAffiliateProgramInFirestore(
              user.uid,
              user.displayName || userProfile?.displayName || 'NEXOVIRA Affiliate',
              user.email || userProfile?.email || 'affiliate@nexovira.com',
              'Direct Login'
            );
          } catch (e) {
            console.error('Error auto-creating affiliate profile:', e);
          }
        }

        if (affProf) {
          setProfile(affProf);
          setPromotionalChannels(affProf.promotionalChannels || '');
          if (affProf.bankDetails) {
            setBankName(affProf.bankDetails.bankName || '');
            setAccountNumber(affProf.bankDetails.accountNumber || '');
            setAccountName(affProf.bankDetails.accountName || '');
            setSwiftCode(affProf.bankDetails.swiftCode || '');
            setPayoutProvider(affProf.bankDetails.payoutProvider || 'Bank Transfer');
          }

          // 3. Fetch Wallet Summary, Ledger, Notifications, Config, and Payout History
          const [walletRes, linksData, notifsData, configData, payoutsData] = await Promise.all([
            getAffiliateWalletSummaryInFirestore(user.uid),
            getAffiliateLinksFromFirestore(user.uid),
            getAffiliateNotificationsFromFirestore(user.uid),
            getAffiliateConfigFromFirestore(),
            getPayoutRequestsFromFirestore(user.uid)
          ]);

          setWalletBalances(walletRes.balances);
          setLedgerEntries(walletRes.ledgerEntries);
          setCommissions(walletRes.commissions);
          setLinks(linksData);
          setNotifications(notifsData);
          setConfig(configData);
          setPayoutHistory(payoutsData);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error loading affiliate data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Verified Nigerian Bank Directory from Paystack Provider
  useEffect(() => {
    let active = true;
    setLoadingBanks(true);
    fetchNigerianBanksList()
      .then((res) => {
        if (active && res.banks && res.banks.length > 0) {
          setBanksList(res.banks);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingBanks(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleVerifyBankWithPaystack = async () => {
    if (!bankName) {
      setBankVerificationError('Please select your Nigerian bank first.');
      return;
    }
    const clean = accountNumber.replace(/\D/g, '');
    if (clean.length !== 10) {
      setBankVerificationError('Please enter a valid 10-digit NUBAN account number.');
      return;
    }

    setIsVerifyingBank(true);
    setBankVerificationError('');
    setBankVerificationSuccess('');

    try {
      const res = await verifyNigerianBankAccount(
        bankName,
        bankCode,
        clean,
        profile?.userName || user?.displayName || '',
        user?.uid
      );

      if (res.verified && res.accountName) {
        setAccountName(res.accountName);
        setIsBankVerified(true);
        setBankVerificationSuccess(`Verified via Paystack: ${res.accountName}`);
      } else {
        setBankVerificationError(res.message || 'Bank verification failed. Please check your account number and selected bank.');
      }
    } catch (err: any) {
      setBankVerificationError(err?.message || 'Verification service error. Please try again.');
    } finally {
      setIsVerifyingBank(false);
    }
  };

  const handleApplyOrUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmittingApp(true);
    setAccountSaveSuccess(false);
    try {
      const bankDetails = (bankName && accountNumber && accountName) 
        ? { bankName, accountNumber, accountName } 
        : undefined;

      const updatedProfile = await applyForAffiliateProgramInFirestore(
        user.uid,
        user.displayName || 'NEXOVIRA Affiliate',
        user.email || 'affiliate@nexovira.com',
        promotionalChannels,
        bankDetails
      );
      setProfile(updatedProfile);
      setAccountSaveSuccess(true);
      setTimeout(() => setAccountSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating affiliate account:', err);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Convert all items into a unified StandardMarketplaceItem list
  const allMarketplaceItems = useMemo<StandardMarketplaceItem[]>(() => {
    const list: StandardMarketplaceItem[] = [];

    // 1. Physical Products
    products.forEach((p) => {
      // Exclude digital_ebooks if handled under ebooks, or include if physical/standard
      if (p.affiliateEnabled !== false) {
        list.push({
          id: p.id,
          title: p.title,
          contentType: p.productType === 'digital_ebook' ? 'EBOOK' : 'PRODUCT',
          category: p.categoryId || 'Appliances',
          price: p.price,
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80',
          sellerOrProvider: p.sellerName || 'NEXOVIRA Direct',
          commissionRate: p.affiliateCommissionRate ?? 10,
          description: p.description || '',
          affiliateEnabled: true,
          targetPath: p.productType === 'digital_ebook' ? `/ebook/${p.id}` : `/product/${p.id}`
        });
      }
    });

    // 2. Tech Services
    techServices.forEach((s) => {
      list.push({
        id: s.id,
        title: s.title,
        contentType: 'SERVICE',
        category: s.category || 'Tech Services',
        price: s.startingPrice || 150,
        image: s.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        sellerOrProvider: s.providerName || 'NEXOVIRA Verified Expert',
        commissionRate: 12, // Standard 12% for Tech Services
        description: s.description || '',
        affiliateEnabled: true,
        targetPath: `/service/${s.id}`
      });
    });

    // 3. Courses
    courses.forEach((c) => {
      list.push({
        id: c.id,
        title: c.title,
        contentType: 'COURSE',
        category: c.category || 'Academy',
        price: c.price,
        image: c.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
        sellerOrProvider: c.instructor || 'NEXOVIRA Academy',
        commissionRate: 20, // Standard 20% for Courses
        description: c.description || '',
        affiliateEnabled: true,
        targetPath: `/course/${c.id}`
      });
    });

    // 4. Digital E-books
    ebooks.forEach((eb) => {
      list.push({
        id: eb.id,
        title: eb.title,
        contentType: 'EBOOK',
        category: eb.category || 'Digital E-books',
        price: eb.price,
        image: eb.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
        sellerOrProvider: eb.author || 'NEXOVIRA Press',
        commissionRate: 25, // Standard 25% for Digital E-books
        description: eb.description || '',
        affiliateEnabled: true,
        targetPath: `/ebook/${eb.id}`
      });
    });

    return list;
  }, [products, techServices, courses, ebooks]);

  // Filtered Items for Marketplace
  const filteredItems = useMemo(() => {
    return allMarketplaceItems.filter((item) => {
      // Content Type Filter
      if (selectedContentType !== 'ALL' && item.contentType !== selectedContentType) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesProvider = item.sellerOrProvider.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProvider && !matchesCat) return false;
      }
      // Category Filter
      if (selectedCategory !== 'ALL' && item.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Min Commission Filter
      if (item.commissionRate < minCommission) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'commission_desc') return b.commissionRate - a.commissionRate;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
  }, [allMarketplaceItems, selectedContentType, searchQuery, selectedCategory, minCommission, sortBy]);

  // Unique Categories
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    allMarketplaceItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [allMarketplaceItems]);

  const generateAndCopyLink = async (item: StandardMarketplaceItem) => {
    if (!profile) return;
    const cleanCode = (profile.affiliateCode || 'AFF').trim().toUpperCase();
    const linkId = `${cleanCode}_${item.contentType}_${item.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const refUrl = buildAffiliateDeepLink({
      affiliateCode: cleanCode,
      targetPath: item.targetPath,
      linkId
    });
    
    // Save/Update in Firestore
    try {
      const linkRecord = await createOrGetAffiliateLinkInFirestore(
        profile.uid,
        cleanCode,
        item.id,
        item.title,
        item.contentType,
        item.targetPath
      );
      setLinks((prev) => {
        const filtered = prev.filter((l) => l.id !== linkRecord.id);
        return [linkRecord, ...filtered];
      });
    } catch (err) {
      console.error('Error saving affiliate link:', err);
    }

    await copyToClipboard(refUrl);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getItemReferralUrl = (item: StandardMarketplaceItem) => {
    if (!profile) return '';
    const cleanCode = (profile.affiliateCode || 'AFF').trim().toUpperCase();
    const linkId = `${cleanCode}_${item.contentType}_${item.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
    return buildAffiliateDeepLink({
      affiliateCode: cleanCode,
      targetPath: item.targetPath,
      linkId
    });
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSubmittingPayout(true);
    setPayoutStatusMsg(null);
    try {
      await createPayoutRequestInFirestore(
        user.uid, 
        payoutAmount, 
        payoutCurrency,
        payoutTargetCurrency,
        {
          bankName: bankName || 'Standard Bank',
          accountNumber: accountNumber || '0000000000',
          accountName: accountName || profile.userName,
          swiftCode,
          payoutProvider
        }
      );
      setPayoutStatusMsg({ type: 'success', text: `Payout request submitted successfully! Funds reserved in wallet ledger.` });
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutStatusMsg(null);
      }, 2000);
      loadAffiliateData();
    } catch (err: any) {
      setPayoutStatusMsg({ type: 'error', text: err.message || 'Failed to submit payout request' });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const mainReferralLink = profile 
    ? `${window.location.origin}/ref/${profile.affiliateCode}`
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border border-rose-900/40 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 relative z-10 max-w-3xl">
          <NexoviraLogo size={54} showText={false} />
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Share2 className="w-3.5 h-3.5" />
              <span>NEXOVIRA Official Affiliate Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Affiliate Partner Portal</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Promote appliances, tech services, academy courses, and digital e-books. Track real-time clicks, conversions, and receive automated bank payouts.
            </p>
          </div>
        </div>
        {user && (
          <button
            onClick={async () => {
              await logout();
              onNavigate && onNavigate('/signin');
            }}
            className="self-start md:self-center px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 z-10"
            title="Sign Out of Affiliate Portal"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {authLoading || (loading && user) ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl max-w-lg mx-auto">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Loading authentication...</h3>
          <p className="text-xs text-slate-500">Verifying session and loading your Affiliate Portal data.</p>
        </div>
      ) : !user || !userProfile ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-5 shadow-2xl max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sign In to Access Your Affiliate Portal</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Please sign in with your Affiliate credentials or register a new Affiliate account to access your unique referral ID, generate trackable product links, and view your automated earnings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate?.('/signin')}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Account</span>
            </button>
            <button
              onClick={() => onNavigate?.('/signup')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Affiliate Account</span>
            </button>
          </div>
        </div>
      ) : !profile ? (
        /* Account Activation Screen */
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-2xl mx-auto">
          <div className="space-y-2 text-center">
            <Sparkles className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Activate Your Affiliate Partner Account</h2>
            <p className="text-xs text-slate-500">
              An Affiliate ID and unique referral code will be generated automatically for your profile.
            </p>
          </div>

          <form onSubmit={handleApplyOrUpdateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Promotional Channels & Traffic Sources
              </label>
              <textarea
                required
                rows={3}
                placeholder="Where will you share links? (e.g. WhatsApp groups, Instagram page, YouTube channel, Blog...)"
                value={promotionalChannels}
                onChange={(e) => setPromotionalChannels(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-500" />
                Bank Account Details for Automated Payouts
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Bank Name (e.g. GTBank, Zenith, Access)"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Account Number (10 Digits)"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="Account Name (Must match bank record)"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingApp}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmittingApp ? 'Activating Affiliate Profile...' : 'Activate Affiliate Account Now'}
            </button>
          </form>
        </div>
      ) : (
        /* Active Affiliate Portal Interface */
        <div className="space-y-6">

          {/* Master Referral Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Master Referral Code:</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {profile.affiliateCode}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {profile.id}</span>
              </div>
              <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 break-all">{mainReferralLink}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mainReferralLink);
                  setCopiedId('master-link');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                {copiedId === 'master-link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === 'master-link' ? 'Copied Master Link!' : 'Copy Master Link'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(mainReferralLink)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                title="View QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Affiliate Marketplace</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 font-mono">
                {allMarketplaceItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'wallet'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet & Earnings</span>
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'links'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>My Tracked Links</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {links.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Bank & Profile</span>
            </button>
          </div>

          {/* TAB 1: AFFILIATE MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="space-y-6">
              
              {/* Content Type Selector Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { type: 'ALL', label: 'All Content', icon: Store, count: allMarketplaceItems.length },
                  { type: 'PRODUCT', label: 'Physical Products', icon: ShoppingBag, count: allMarketplaceItems.filter(i => i.contentType === 'PRODUCT').length },
                  { type: 'SERVICE', label: 'Tech Services', icon: Wrench, count: allMarketplaceItems.filter(i => i.contentType === 'SERVICE').length },
                  { type: 'COURSE', label: 'Academy Courses', icon: GraduationCap, count: allMarketplaceItems.filter(i => i.contentType === 'COURSE').length },
                  { type: 'EBOOK', label: 'Digital E-books', icon: BookOpen, count: allMarketplaceItems.filter(i => i.contentType === 'EBOOK').length },
                ].map((pill) => {
                  const Icon = pill.icon;
                  const isSelected = selectedContentType === pill.type;
                  return (
                    <button
                      key={pill.type}
                      onClick={() => setSelectedContentType(pill.type as MarketplaceContentType)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pill.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Filter Controls Panel */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search title, brand, or instructor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                        title="Clear Search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
                    >
                      <option value="ALL">All Categories ({uniqueCategories.length})</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} ({allMarketplaceItems.filter(i => i.category === cat).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min Commission Filter */}
                  <div>
                    <select
                      value={minCommission}
                      onChange={(e) => setMinCommission(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer font-medium"
                    >
                      <option value={0}>Any Commission %</option>
                      <option value={5}>Min 5% Commission</option>
                      <option value={10}>Min 10% High Yield</option>
                      <option value={15}>Min 15% Premium Earners</option>
                      <option value={20}>Min 20% Super Earners</option>
                      <option value={25}>Min 25% Maximum Yield</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer font-medium"
                    >
                      <option value="commission_desc">Highest Commission Rate %</option>
                      <option value="price_desc">Highest Price First</option>
                      <option value="price_asc">Lowest Price First</option>
                      <option value="title">Alphabetical (A-Z)</option>
                    </select>
                  </div>

                </div>

                {/* Quick Commission Percentage Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-rose-500" />
                    Quick Commission Rate:
                  </span>
                  {[
                    { rate: 0, label: 'All Rates' },
                    { rate: 5, label: '5%+ Standard' },
                    { rate: 10, label: '10%+ High' },
                    { rate: 15, label: '15%+ Premium' },
                    { rate: 20, label: '20%+ Super' },
                    { rate: 25, label: '25%+ Max' },
                  ].map((preset) => (
                    <button
                      key={preset.rate}
                      onClick={() => setMinCommission(preset.rate)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        minCommission === preset.rate
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Active Filters Summary & Result Count */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-medium">
                      Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredItems.length}</strong> of {allMarketplaceItems.length} items
                    </span>

                    {/* Filter Badges */}
                    {selectedContentType !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                        Type: {selectedContentType}
                        <button onClick={() => setSelectedContentType('ALL')} className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {selectedCategory !== 'ALL' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                        Category: {selectedCategory}
                        <button onClick={() => setSelectedCategory('ALL')} className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {minCommission > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                        Commission: ≥{minCommission}%
                        <button onClick={() => setMinCommission(0)} className="hover:text-rose-700">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {searchQuery.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                        Query: "{searchQuery}"
                        <button onClick={() => setSearchQuery('')} className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Reset All Filters Button */}
                  {(selectedContentType !== 'ALL' || selectedCategory !== 'ALL' || minCommission > 0 || searchQuery.trim()) && (
                    <button
                      onClick={() => {
                        setSelectedContentType('ALL');
                        setSelectedCategory('ALL');
                        setMinCommission(0);
                        setSearchQuery('');
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Items Grid */}
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-md">
                  <Store className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Eligible Content Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No products match your active search filters or selected commission rate threshold.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedContentType('ALL');
                      setSelectedCategory('ALL');
                      setMinCommission(0);
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear All Search & Filters</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredItems.map((item) => {
                    const currentLiveRate = getLiveExchangeRate();
                    const estimatedCommissionNGN = Math.round(item.price * currentLiveRate * (item.commissionRate / 100));
                    const isCopied = copiedId === item.id;
                    const refUrl = getItemReferralUrl(item);

                    return (
                      <div 
                        key={item.id} 
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Image & Type Badge */}
                          <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            
                            {/* Type Badge */}
                            <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-md ${
                              item.contentType === 'PRODUCT' ? 'bg-cyan-600' :
                              item.contentType === 'SERVICE' ? 'bg-amber-600' :
                              item.contentType === 'COURSE' ? 'bg-purple-600' : 'bg-emerald-600'
                            }`}>
                              {item.contentType}
                            </span>

                            {/* Commission Badge */}
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-600 text-white shadow-md font-mono">
                              {item.commissionRate}% Commission
                            </span>
                          </div>

                          {/* Item Details */}
                          <div className="p-4 space-y-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category} • {item.sellerOrProvider}</div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug">{item.title}</h3>
                            
                            {/* Price & Est Earnings */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Retail Price</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                  ₦{Math.round(item.price * currentLiveRate).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-rose-500 font-bold block">You Earn</span>
                                <span className="text-xs font-black text-emerald-500 font-mono">
                                  ~₦{estimatedCommissionNGN.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Link Actions */}
                        <div className="p-4 pt-0 space-y-2">
                          <button
                            onClick={() => generateAndCopyLink(item)}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span>{isCopied ? 'Copied Affiliate Link!' : 'Generate & Copy Link'}</span>
                          </button>

                          {/* One-click Social Sharing */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Check out ${item.title} on NEXOVIRA: ${refUrl}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>

                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refUrl)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Facebook</span>
                            </a>

                            <button
                              onClick={() => setShowQrModal(refUrl)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                              title="QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: WALLET & COMMISSIONS */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              
              {/* Multi-Currency Balance Bar */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-rose-500" />
                      <h3 className="text-base font-black tracking-tight">NEXOVIRA Automated Wallet Ledger</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Commissions settle automatically after the <span className="text-amber-400 font-bold">{config?.settlementPeriodHours || 24}-hour</span> verification period.
                    </p>
                  </div>

                  {/* Multi-Currency Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-2xl border border-slate-700">
                    {(['NGN', 'USD', 'GBP', 'EUR'] as CurrencyCode[]).map((c) => {
                      const isActive = selectedWalletCurrency === c;
                      const flag = c === 'NGN' ? '🇳🇬' : c === 'USD' ? '🇺🇸' : c === 'GBP' ? '🇬🇧' : '🇪🇺';
                      return (
                        <button
                          key={c}
                          onClick={() => setSelectedWalletCurrency(c)}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                            isActive ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{flag}</span>
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Active Currency Cards */}
                {(() => {
                  const currData = walletBalances[selectedWalletCurrency] || { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 };
                  const minThreshold = config?.minWithdrawalAmount || 1000;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Available Balance */}
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-2 relative overflow-hidden">
                        <div className="absolute -right-2 -bottom-2 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>Available Balance</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px]">Withdrawable</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">
                          {formatNativeCurrency(currData.available, selectedWalletCurrency)}
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">Min: {formatNativeCurrency(minThreshold, 'NGN')}</span>
                          <button
                            onClick={() => {
                              setPayoutCurrency(selectedWalletCurrency);
                              setPayoutTargetCurrency(selectedWalletCurrency);
                              setPayoutAmount(currData.available);
                              setShowPayoutModal(true);
                            }}
                            disabled={currData.available <= 0}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg flex items-center gap-1"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Withdraw</span>
                          </button>
                        </div>
                      </div>

                      {/* Pending Balance */}
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>Pending Settlement</span>
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px]">
                            {config?.settlementPeriodHours || 24}h Lock
                          </span>
                        </div>
                        <div className="text-2xl font-black text-amber-400 font-mono">
                          {formatNativeCurrency(currData.pending, selectedWalletCurrency)}
                        </div>
                        <p className="text-[10px] text-slate-400">Auto-moves to Available upon order settlement.</p>
                      </div>

                      {/* Total Earned */}
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                        <div className="text-xs font-bold text-slate-400">Total Confirmed Earnings</div>
                        <div className="text-2xl font-black text-white font-mono">
                          {formatNativeCurrency(currData.totalEarned, selectedWalletCurrency)}
                        </div>
                        <p className="text-[10px] text-slate-400">Lifetime confirmed affiliate commissions.</p>
                      </div>

                      {/* Total Withdrawn */}
                      <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                        <div className="text-xs font-bold text-slate-400">Total Withdrawn</div>
                        <div className="text-2xl font-black text-cyan-400 font-mono">
                          {formatNativeCurrency(currData.totalWithdrawn, selectedWalletCurrency)}
                        </div>
                        <p className="text-[10px] text-slate-400">Transferred to payout bank account.</p>
                      </div>
                    </div>
                  );
                })()}

                {/* WhatsApp Payout Support Banner */}
                <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">Have Questions Regarding Your Payouts or Wallet?</h4>
                      <p className="text-[11px] text-slate-400">Contact NEXOVIRA Financial Desk directly via WhatsApp for instant assistance.</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/2348129595134?text=${encodeURIComponent(`Hello NEXOVIRA Finance Desk, I am Affiliate ${profile.userName} (${profile.affiliateCode}). I have a query regarding my affiliate wallet payouts.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Finance Support</span>
                  </a>
                </div>

              </div>

              {/* Immutable Transaction Ledger Table */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Immutable Ledger History</h3>
                    <p className="text-xs text-slate-500">Audit trail of all commission accruals, settlements, reversals, and withdrawal entries.</p>
                  </div>
                  <button 
                    onClick={loadAffiliateData}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
                    title="Refresh Ledger"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {ledgerEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 py-12 text-center">No transactions recorded in ledger yet. Share your affiliate links to begin earning!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-3 px-2">Type</th>
                          <th className="py-3 px-2">Description</th>
                          <th className="py-3 px-2">Order ID</th>
                          <th className="py-3 px-2 text-right">Amount</th>
                          <th className="py-3 px-2 text-right">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ledgerEntries.map((e) => {
                          const isPositive = e.amount > 0;
                          return (
                            <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.type === 'COMMISSION_SETTLED' ? 'bg-emerald-500/10 text-emerald-500' :
                                  e.type === 'COMMISSION_EARNED' ? 'bg-amber-500/10 text-amber-500' :
                                  e.type === 'PAYOUT_COMPLETED' ? 'bg-cyan-500/10 text-cyan-500' :
                                  e.type === 'PAYOUT_REQUESTED' ? 'bg-blue-500/10 text-blue-500' :
                                  e.type === 'COMMISSION_REVERSED' ? 'bg-rose-500/10 text-rose-500' :
                                  'bg-slate-500/10 text-slate-400'
                                }`}>
                                  {e.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300 max-w-sm truncate">
                                {e.description}
                              </td>
                              <td className="py-3 px-2 font-mono font-bold text-slate-900 dark:text-white">
                                {e.orderId ? `#${e.orderId.slice(0, 8)}` : '-'}
                              </td>
                              <td className={`py-3 px-2 text-right font-mono font-black ${
                                isPositive ? 'text-emerald-500' : 'text-rose-500'
                              }`}>
                                {isPositive ? '+' : ''}{formatNativeCurrency(e.amount, e.currency || 'NGN')}
                              </td>
                              <td className="py-3 px-2 text-right text-slate-400 font-mono text-[10px]">
                                {new Date(e.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: MY TRACKED LINKS */}
          {activeTab === 'links' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Generated Affiliate Links Performance</h3>
                  <p className="text-xs text-slate-500">Real-time deep-link click, conversion, revenue and commission metrics recorded by NEXOVIRA.</p>
                </div>
              </div>

              {links.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <LinkIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">You haven't generated any deep links yet. Visit the Promote Marketplace Items tab to pick products, services, courses, or e-books!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-2">Target Item & Type</th>
                        <th className="py-3 px-2">Destination</th>
                        <th className="py-3 px-2">Affiliate Link URL</th>
                        <th className="py-3 px-2 text-center">Clicks</th>
                        <th className="py-3 px-2 text-center">Orders</th>
                        <th className="py-3 px-2 text-center">Conv. Rate</th>
                        <th className="py-3 px-2 text-right">Commission Earned</th>
                        <th className="py-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {links.map((link) => {
                        const convRate = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0';
                        const isCopied = copiedId === link.id;

                        return (
                          <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-2 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-mono mr-1.5 font-bold">
                                {link.contentType}
                              </span>
                              {link.targetTitle}
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-400 text-[11px]">
                              {link.targetPath || `/product/${link.targetId}`}
                            </td>
                            <td className="py-3 px-2 max-w-xs">
                              <input
                                type="text"
                                readOnly
                                value={link.url}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{link.clicks || 0}</td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-emerald-500">{link.conversions || 0}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-500">{convRate}%</td>
                            <td className="py-3 px-2 text-right font-mono font-black text-rose-500">
                              {formatCurrency(link.commissionEarned || 0, currentCurrency)}
                            </td>
                            <td className="py-3 px-2 text-right space-x-1.5">
                              <button
                                onClick={async () => {
                                  await copyToClipboard(link.url);
                                  setCopiedId(link.id);
                                  setTimeout(() => setCopiedId(null), 2500);
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer ${
                                  isCopied ? 'bg-emerald-600 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                                }`}
                              >
                                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Link Copied ✓' : 'Copy Link'}</span>
                              </button>
                              <button
                                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Open & Test Link"
                              >
                                <ExternalLink className="w-3 h-3 text-rose-400" />
                                <span>Open</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BANK ACCOUNT & PROFILE */}
          {activeTab === 'account' && (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl mx-auto space-y-6 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Affiliate Profile & Bank Details</h3>
                <p className="text-xs text-slate-500">Update your promotional channels and direct bank payout records.</p>
              </div>

              {accountSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Affiliate profile and bank details saved successfully!</span>
                </div>
              )}

              <form onSubmit={handleApplyOrUpdateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promotional Traffic Channels
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={promotionalChannels}
                    onChange={(e) => setPromotionalChannels(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-500" />
                      Bank Account Details for Direct Withdrawals
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      Powered by Paystack
                    </span>
                  </div>

                  {bankVerificationError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">{bankVerificationError}</span>
                    </div>
                  )}

                  {bankVerificationSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold">{bankVerificationSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Select Nigerian Bank {loadingBanks && '(Loading Paystack directory...)'}
                      </label>
                      {banksList.length > 0 ? (
                        <select
                          value={bankCode}
                          onChange={(e) => {
                            const code = e.target.value;
                            setBankCode(code);
                            const found = banksList.find((b) => b.code === code);
                            if (found) setBankName(found.name);
                            setIsBankVerified(false);
                            setBankVerificationError('');
                            setBankVerificationSuccess('');
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                        >
                          <option value="">-- Select Bank --</option>
                          {banksList.map((b) => (
                            <option key={`${b.code}-${b.name}`} value={b.code}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Bank Name (e.g. GTBank)"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Account Number</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="10-Digit NUBAN Number"
                          value={accountNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setAccountNumber(val);
                            setIsBankVerified(false);
                            setBankVerificationError('');
                            setBankVerificationSuccess('');
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyBankWithPaystack}
                          disabled={isVerifyingBank || accountNumber.length !== 10 || !bankName}
                          className="px-3.5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors shrink-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {isVerifyingBank ? (
                            <span>Verifying...</span>
                          ) : (
                            <span>Verify with Paystack</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                      <span>Official Account Name</span>
                      {isBankVerified && (
                        <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Paystack Verified NUBAN
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Verified Bank Account Holder Name"
                      value={accountName}
                      readOnly={isBankVerified}
                      onChange={(e) => setAccountName(e.target.value)}
                      className={`w-full border rounded-xl p-3 text-xs focus:outline-none ${
                        isBankVerified 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingApp ? 'Saving Details...' : 'Save Profile & Bank Details'}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && profile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Request Commission Withdrawal</h3>
                <p className="text-xs text-slate-500">Funds are locked in ledger immediately upon submission.</p>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              
              {/* Currency Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Source Wallet Currency</label>
                  <select
                    value={payoutCurrency}
                    onChange={(e) => {
                      const c = e.target.value as CurrencyCode;
                      setPayoutCurrency(c);
                      const avail = walletBalances[c]?.available || 0;
                      if (payoutAmount > avail) setPayoutAmount(avail);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  >
                    <option value="NGN">NGN (🇳🇬 Nigerian Naira)</option>
                    <option value="USD">USD (🇺🇸 US Dollar)</option>
                    <option value="GBP">GBP (🇬🇧 British Pound)</option>
                    <option value="EUR">EUR (🇪🇺 Euro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payout Target Currency</label>
                  <select
                    value={payoutTargetCurrency}
                    onChange={(e) => setPayoutTargetCurrency(e.target.value as CurrencyCode)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  >
                    <option value="NGN">NGN (Local NUBAN Transfer)</option>
                    <option value="USD">USD (International Wire / Swift)</option>
                    <option value="GBP">GBP (UK FPS Wire)</option>
                    <option value="EUR">EUR (SEPA Transfer)</option>
                  </select>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Withdrawal Amount ({payoutCurrency})
                  </label>
                  <span className="text-[10px] text-emerald-500 font-bold font-mono">
                    Avail: {formatNativeCurrency(walletBalances[payoutCurrency]?.available || 0, payoutCurrency)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={walletBalances[payoutCurrency]?.available || 0}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-mono font-black focus:outline-none"
                />
              </div>

              {/* Conversion Preview if Currencies differ */}
              {payoutCurrency !== payoutTargetCurrency && payoutAmount > 0 && (() => {
                const conv = convertDirectly(payoutAmount, payoutCurrency, payoutTargetCurrency);
                return (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-rose-500">
                      <span>Live Multi-Currency Conversion:</span>
                      <span>Rate: 1 {payoutCurrency} = {conv.rate.toFixed(4)} {payoutTargetCurrency}</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-mono font-bold text-sm">
                      Estimated Bank Payout: {formatNativeCurrency(conv.convertedAmount, payoutTargetCurrency)}
                    </div>
                  </div>
                );
              })()}

              {/* Bank Details Verification Card */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Verified Destination Bank Account:</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300 font-mono">
                  {bankName || 'GTBank'} - {accountNumber || '0000000000'} ({accountName || profile.userName})
                </div>
                {payoutTargetCurrency !== 'NGN' && (
                  <div className="text-[10px] text-amber-500 font-mono">
                    Swift/IBAN Code: {swiftCode || 'Not provided (Will use bank fallback)'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowPayoutModal(false);
                    setActiveTab('account');
                  }}
                  className="text-[10px] text-rose-500 underline font-bold hover:text-rose-400 block"
                >
                  Edit Bank Account Info
                </button>
              </div>

              {payoutStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  payoutStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {payoutStatusMsg.text}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayout || payoutAmount <= 0 || payoutAmount > (walletBalances[payoutCurrency]?.available || 0)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingPayout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm & Withdraw</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">Referral QR Code</span>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Scan to Open Referral Link</h4>

            <div className="p-4 bg-white rounded-2xl inline-block border-2 border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(showQrModal)}`}
                alt="Affiliate QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all">{showQrModal}</p>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
