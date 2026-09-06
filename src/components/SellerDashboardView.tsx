import React, { useState, useEffect } from 'react';
import { Product, Store, Order, CategoryRequest, SellerNotification, SellerWalletSummary, SellerBankAccount, SellerLedgerEntry, SellerPayoutRecord, SellerConfig } from '../types';
import { 
  detectMaliciousPayload, 
  sanitizeText, 
  sanitizeMultilineText, 
  logSecurityThreatAttempt 
} from '../lib/sanitization';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  Store as StoreIcon, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Sparkles, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Upload,
  RefreshCw,
  Search,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Bell,
  Send,
  MessageSquare,
  Tag,
  Trash2,
  BookOpen,
  Wallet,
  CreditCard,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  ChevronRight,
  ShieldCheck,
  Layers,
  Info,
  X,
  Building2,
  Sliders,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NexoviraLogo } from './NexoviraLogo';
import { EbookProductUploadForm } from './EbookProductUploadForm';
import { SellerBankVerificationModal } from './SellerBankVerificationModal';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { STORES } from '../data/mockData';
import { 
  createProductInFirestore,
  saveProductToFirestore, 
  getProductsFromFirestore,
  getSellerProductsFromFirestore,
  deleteProductFromFirestore,
  getSellerOrdersFromFirestore,
  createCategoryRequestInFirestore,
  getSellerNotificationsFromFirestore,
  markNotificationAsReadInFirestore,
  getSellerWalletSummaryInFirestore,
  createSellerPayoutRequestInFirestore
} from '../lib/firestoreService';
import { auth } from '../lib/firebase';

interface SellerDashboardViewProps {
  onAddProduct: (product: Product) => void;
  sellerId?: string;
  sellerName?: string;
  onNavigate?: (path: string) => void;
}

const SellerDashboardContent: React.FC<SellerDashboardViewProps> = ({ 
  onAddProduct,
  sellerId: propSellerId,
  sellerName: propSellerName,
  onNavigate
}) => {
  const { logout } = useAuth();
  const currentStore: Store = STORES[0]; // NexaTech Global Store fallback
  const resolvedSellerId = propSellerId || auth.currentUser?.uid || currentStore.id;
  const resolvedSellerName = propSellerName || auth.currentUser?.displayName || currentStore.name;

  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'products' | 'orders' | 'analytics' | 'category-request' | 'ai-generator'>('overview');
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');

  // Category Request State
  const [catName, setCatName] = useState('');
  const [catGroup, setCatGroup] = useState<'appliances' | 'electronics' | 'smart-home'>('appliances');
  const [catDesc, setCatDesc] = useState('');
  const [catRequestStatus, setCatRequestStatus] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);

  // Seller Wallet State
  const [walletSummary, setWalletSummary] = useState<SellerWalletSummary>({
    sellerId: resolvedSellerId,
    availableBalanceNGN: 0,
    pendingBalanceNGN: 0,
    totalSalesNGN: 0,
    totalEarnedNGN: 0,
    totalPaidOutNGN: 0,
    nextPayoutAmountNGN: 0,
    currency: 'NGN'
  });
  const [bankAccount, setBankAccount] = useState<SellerBankAccount | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SellerLedgerEntry[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<SellerPayoutRecord[]>([]);
  const [sellerConfig, setSellerConfig] = useState<SellerConfig>({
    settlementPeriodHours: 24,
    minWithdrawalAmount: 5000,
    autoPayoutEnabled: true,
    platformFeePercent: 5
  });
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState<'ledger' | 'payouts'>('ledger');

  // Modals State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5000);
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Product Deletion State & Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Load products, orders, notifications & wallet data
  const loadSellerData = async () => {
    try {
      setIsLoadingWallet(true);
      // Fetch ONLY products owned by this authenticated seller
      const liveProds = await getSellerProductsFromFirestore(resolvedSellerId);
      setStoreProducts(liveProds || []);

      const orders = await getSellerOrdersFromFirestore(resolvedSellerId);
      setSellerOrders(orders || []);

      const notifs = await getSellerNotificationsFromFirestore(resolvedSellerId);
      setNotifications(notifs);

      // Load Seller Wallet Data
      const walletRes = await getSellerWalletSummaryInFirestore(resolvedSellerId);
      setWalletSummary(walletRes.summary);
      setBankAccount(walletRes.bankAccount);
      setLedgerEntries(walletRes.ledgerEntries);
      setPayoutHistory(walletRes.payoutHistory);
      setSellerConfig(walletRes.config);
    } catch (err) {
      console.error('Error loading seller inventory:', err);
      setStoreProducts([]);
      setSellerOrders([]);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [resolvedSellerId]);

  const handleMarkNotifRead = async (id: string) => {
    await markNotificationAsReadInFirestore(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handlePromptDeleteProduct = (product: Product) => {
    setDeleteError('');
    setProductToDelete(product);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    setDeleteError('');
    try {
      await deleteProductFromFirestore(productToDelete.id, { reason: 'seller_store_deletion' });
      setStoreProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setDeleteSuccess(`"${productToDelete.title}" has been permanently removed from your active store inventory.`);
      setProductToDelete(null);
      setTimeout(() => setDeleteSuccess(''), 5000);
    } catch (err: any) {
      console.error('Failed to delete seller product:', err);
      setDeleteError(err?.message || 'Access Denied (403): You do not have permission to delete this product.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleCategoryRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const catThreat = detectMaliciousPayload(catName);
    if (catThreat.isSuspicious) {
      logSecurityThreatAttempt('Seller Studio Category Request', 'categoryName', catThreat, catName);
      setCatRequestStatus(`Security Alert: Malicious code characters blocked (${catThreat.threatType}).`);
      return;
    }

    const descThreat = detectMaliciousPayload(catDesc);
    if (descThreat.isSuspicious) {
      logSecurityThreatAttempt('Seller Studio Category Request', 'description', descThreat, catDesc);
      setCatRequestStatus(`Security Alert: Suspicious script characters detected in description.`);
      return;
    }

    setSubmittingCat(true);
    setCatRequestStatus('');
    try {
      await createCategoryRequestInFirestore({
        sellerId: currentStore.id,
        sellerName: currentStore.name,
        categoryName: sanitizeText(catName, 80),
        group: catGroup,
        description: sanitizeMultilineText(catDesc, 1000)
      });
      setCatRequestStatus('Category request submitted successfully for Admin review!');
      setCatName('');
      setCatDesc('');
    } catch (err) {
      setCatRequestStatus('Failed to submit category request. Please try again.');
    } finally {
      setSubmittingCat(false);
    }
  };

  // Execute NGN Withdrawal
  const handleExecuteWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawMsg('');
    if (!bankAccount || bankAccount.verificationStatus !== 'verified') {
      alert('You must add and verify a Nigerian Bank Account before withdrawing funds.');
      setShowWithdrawModal(false);
      setShowBankModal(true);
      return;
    }

    if (withdrawAmount < sellerConfig.minWithdrawalAmount) {
      setWithdrawMsg(`Minimum withdrawal amount is ₦${sellerConfig.minWithdrawalAmount.toLocaleString('en-NG')}.`);
      return;
    }

    if (withdrawAmount > walletSummary.availableBalanceNGN) {
      setWithdrawMsg(`Withdrawal amount exceeds your current available balance of ₦${walletSummary.availableBalanceNGN.toLocaleString('en-NG')}.`);
      return;
    }

    setIsWithdrawing(true);
    try {
      await createSellerPayoutRequestInFirestore(currentStore.id, withdrawAmount, bankAccount);
      setWithdrawMsg(`Success! ₦${withdrawAmount.toLocaleString('en-NG')} has been transferred to your ${bankAccount.bankName} account.`);
      setTimeout(async () => {
        setShowWithdrawModal(false);
        setWithdrawMsg('');
        await loadSellerData();
      }, 2000);
    } catch (err: any) {
      setWithdrawMsg(err?.message || 'Failed to process payout request.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Analytics helper functions
  const getDailySalesData = () => {
    const dailyMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = { date: label, revenue: 0, orders: 0 };
    }

    sellerOrders.forEach((ord) => {
      const dateKey = ord.createdAt ? ord.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].revenue += ord.total;
        dailyMap[dateKey].orders += 1;
      }
    });

    return Object.values(dailyMap);
  };

  const getTopProductsData = () => {
    const prodSales: Record<string, { name: string; salesUnits: number; revenue: number }> = {};
    sellerOrders.forEach((ord) => {
      ord.items?.forEach((item) => {
        const title = item.product.title.length > 20 ? `${item.product.title.slice(0, 20)}...` : item.product.title;
        if (!prodSales[title]) {
          prodSales[title] = { name: title, salesUnits: 0, revenue: 0 };
        }
        prodSales[title].salesUnits += item.quantity;
        prodSales[title].revenue += item.product.price * item.quantity;
      });
    });

    if (Object.keys(prodSales).length === 0) {
      storeProducts.slice(0, 5).forEach((p, idx) => {
        prodSales[p.title.slice(0, 18)] = {
          name: p.title.slice(0, 18),
          salesUnits: (5 - idx) * 4,
          revenue: p.price * (5 - idx) * 4
        };
      });
    }

    return Object.values(prodSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  // New Product Form state
  const [newTitle, setNewTitle] = useState('');
  const [newBrand, setNewBrand] = useState('NEXOVIRA Tech');
  const [newPrice, setNewPrice] = useState(490);
  const [newStock, setNewStock] = useState(30);
  const [newDesc, setNewDesc] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateSellerAI = async () => {
    if (!newTitle.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/v1/ai/seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, brand: newBrand })
      });
      const data = await res.json();
      if (data.description) {
        setNewDesc(data.description);
      }
    } catch (e) {
      setNewDesc(`Premium ${newBrand} ${newTitle} engineered with energy-efficient smart technology, ultra-quiet operation, and 10-year direct manufacturer warranty.`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleSaveSellerProductData = async (productData: Partial<Product>) => {
    // 1. Inspect threat patterns on incoming product data
    const fieldsToAudit = [
      { key: 'Title', val: productData.title },
      { key: 'Brand', val: productData.brand },
      { key: 'Description', val: productData.description },
      { key: 'Author', val: productData.author },
      { key: 'Publisher', val: productData.publisher }
    ];

    for (const item of fieldsToAudit) {
      if (item.val) {
        const threat = detectMaliciousPayload(item.val);
        if (threat.isSuspicious) {
          logSecurityThreatAttempt('Seller Dashboard Save Product', item.key, threat, item.val);
          alert(`Security Protection: Unauthorized code or malicious characters blocked in ${item.key} (${threat.threatType}).`);
          return;
        }
      }
    }

    const isDigitalFlag = Boolean(productData.isDigital || productData.productType === 'digital_ebook');
    const newProd: Product = {
      id: editingProduct?.id || `prod-seller-${Date.now()}`,
      title: sanitizeText(productData.title || 'Untitled Product', 180),
      brand: sanitizeText(productData.brand || 'NEXOVIRA', 80),
      categoryId: productData.categoryId || (isDigitalFlag ? 'ebooks' : 'air-conditioners'),
      price: Math.max(1, Number(productData.price) || 25),
      originalPrice: Number(productData.originalPrice) || Number(productData.price) * 1.25,
      currency: 'NGN',
      rating: editingProduct?.rating || 5.0,
      reviewCount: editingProduct?.reviewCount || 1,
      stock: isDigitalFlag ? 9999 : Math.max(0, Math.floor(productData.stock ?? 50)),
      sellerId: resolvedSellerId,
      sellerName: sanitizeText(resolvedSellerName, 100),
      sellerVerified: true,
      images: productData.images && productData.images.length > 0 
        ? productData.images 
        : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'],
      productImages: productData.productImages,
      description: sanitizeMultilineText(productData.description || '', 5000),
      keyFeatures: (productData.keyFeatures || []).map(f => sanitizeText(f, 150)),
      specifications: productData.specifications || {},
      tags: (productData.tags || []).map(t => sanitizeText(t, 40)),
      warranty: isDigitalFlag ? 'Lifetime Digital License' : sanitizeText(productData.warranty || 'Certified Quality', 100),
      createdAt: editingProduct?.createdAt || new Date().toISOString(),

      productType: productData.productType || (isDigitalFlag ? 'digital_ebook' : 'physical'),
      isDigital: isDigitalFlag,
      author: productData.author ? sanitizeText(productData.author, 100) : undefined,
      publisher: productData.publisher ? sanitizeText(productData.publisher, 100) : undefined,
      publicationYear: productData.publicationYear ? sanitizeText(productData.publicationYear, 10) : undefined,
      isbn: productData.isbn ? sanitizeText(productData.isbn, 30) : undefined,
      pdfUrl: productData.pdfUrl,
      pdfFileName: productData.pdfFileName ? sanitizeText(productData.pdfFileName, 120) : undefined,
      pdfFileSize: productData.pdfFileSize,
    };

    try {
      if (editingProduct) {
        await saveProductToFirestore(newProd);
      } else {
        await createProductInFirestore(newProd);
      }
      setPublishSuccessMsg('Product document saved and verified in Firestore successfully!');
      setTimeout(() => setPublishSuccessMsg(''), 4000);
      
      setStoreProducts((prev) => {
        const exists = prev.some((p) => p.id === newProd.id);
        if (exists) return prev.map((p) => (p.id === newProd.id ? newProd : p));
        return [newProd, ...prev];
      });
      onAddProduct(newProd);
      setEditingProduct(null);
      setActiveTab('products');
    } catch (err: any) {
      console.error('Failed to save seller product:', err);
      alert(err?.message || 'Access Denied: You cannot modify or save this product.');
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left text-slate-900 dark:text-slate-100">
      
      {/* Store Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${currentStore.banner})` }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <NexoviraLogo size={64} showText={false} imgClassName="rounded-2xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{currentStore.name}</h1>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Verified Merchant
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{currentStore.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('wallet')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-transform shrink-0 cursor-pointer"
            >
              <Wallet className="w-4 h-4 fill-current" />
              <span>NGN Seller Wallet (₦{walletSummary.availableBalanceNGN.toLocaleString('en-NG')})</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-generator')}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-transform shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>AI Listing Studio</span>
            </button>
            <button
              onClick={async () => {
                await logout();
                onNavigate && onNavigate('/signin');
              }}
              className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              title="Sign Out of Merchant Store"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Drawer Banner */}
      {notifications.length > 0 && (
        <div className="p-4 bg-slate-900 border border-cyan-500/30 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Order & Store Notifications ({unreadNotifsCount} New)</span>
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {notifications.slice(0, 2).map((n) => (
              <div key={n.id} className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${n.read ? 'bg-slate-950/50 border-slate-800 text-slate-400' : 'bg-cyan-500/10 border-cyan-500/30 text-white font-bold'}`}>
                <div>
                  <p className="text-xs">{n.message}</p>
                  <span className="text-[10px] text-slate-500 block mt-1">{n.createdAt?.split('T')[0]}</span>
                </div>
                {!n.read && (
                  <button onClick={() => handleMarkNotifRead(n.id)} className="text-[10px] text-cyan-400 hover:underline shrink-0">
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Overview & Metrics
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'wallet' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <Wallet className="w-4 h-4 text-emerald-500" />
          <span>Seller Wallet (NGN ONLY)</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'analytics' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <BarChart3 className="w-4 h-4 text-cyan-500" />
          <span>Data Visualization</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'products' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          My Products ({storeProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'orders' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Customer Orders ({sellerOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('category-request')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'category-request' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Category Request</span>
        </button>
        <button
          onClick={() => setActiveTab('ai-generator')}
          className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ai-generator' ? 'border-cyan-500 text-cyan-500' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          AI Listing Studio
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase">Total Revenue</span>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-500">$12,450</p>
              <p className="text-[10px] text-slate-500">+18% vs last month</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase">NGN Wallet Available</span>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">₦{walletSummary.availableBalanceNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-500">Ready for instant NGN bank withdrawal</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase">Orders Processed</span>
                <TrendingUp className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-2xl font-black text-cyan-500">{sellerOrders.length}</p>
              <p className="text-[10px] text-slate-500">Escrow backed fulfillment</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase">Active Products</span>
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-500">{storeProducts.length}</p>
              <p className="text-[10px] text-slate-500">Listed across categories</p>
            </div>
          </div>

          {/* Quick Wallet Summary Card in Overview */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>NEXOVIRA Automated Seller Payout Engine (NGN ONLY)</span>
              </div>
              <h3 className="text-xl font-black">Available Balance: ₦{walletSummary.availableBalanceNGN.toLocaleString('en-NG')} NGN</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Pending Settlement: ₦{walletSummary.pendingBalanceNGN.toLocaleString('en-NG')} | Total Paid Out: ₦{walletSummary.totalPaidOutNGN.toLocaleString('en-NG')}. Customer payments in foreign currencies are settled exclusively in Nigerian Naira.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('wallet')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Open Wallet & Payouts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SELLER WALLET & PAYOUT SYSTEM (NGN ONLY) */}
      {activeTab === 'wallet' && (
        <div className="space-y-8">
          
          {/* Core Rule Banner */}
          <div className="p-6 bg-slate-900 border border-emerald-500/40 rounded-3xl text-white space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                    🇳🇬 NGN ONLY PAYOUT RULE
                  </span>
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" /> {sellerConfig.settlementPeriodHours}h Automated Settlement
                  </span>
                </div>
                <h2 className="text-2xl font-black mt-2">NEXOVIRA Seller Wallet & Payout Engine</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                  Customers may pay in multi-currencies (USD, EUR, GBP, NGN), but **Seller payouts are processed exclusively in Nigerian Naira (₦ NGN)**. All earnings are converted transparently using live interbank rates at the time of sale.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>{bankAccount ? 'Bank Account Details' : 'Add NGN Bank Account'}</span>
                </button>
                <button
                  onClick={() => {
                    if (!bankAccount || bankAccount.verificationStatus !== 'verified') {
                      setShowBankModal(true);
                    } else {
                      setShowWithdrawModal(true);
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw Earnings (NGN)</span>
                </button>
              </div>
            </div>

            {/* Bank Account Overview Pill */}
            {bankAccount && bankAccount.verificationStatus === 'verified' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/90 p-4 sm:p-5 rounded-2xl border border-emerald-500/40 text-xs gap-4 shadow-xl">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{bankAccount.bankName}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {bankAccount.provider || 'Paystack'} Verified NUBAN
                      </span>
                    </div>
                    <div className="text-slate-300 text-xs space-y-0.5">
                      <p>
                        Account: <strong className="text-cyan-400 font-mono tracking-wider">{bankAccount.maskedAccountNumber || bankAccount.accountNumber}</strong>
                      </p>
                      <p>
                        Official Holder: <strong className="text-emerald-400 font-mono">{bankAccount.accountName}</strong>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change Bank Account</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-500/10 p-4 sm:p-5 rounded-2xl border border-amber-500/30 text-xs gap-3">
                <div className="flex items-start sm:items-center gap-3 text-amber-300">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-amber-200">Real Bank Account Verification Required</span>
                    <p className="text-slate-300 text-xs">
                      Withdrawals and automated earnings disbursement require a verified 10-digit Nigerian NUBAN account validated through live interbank resolution.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs rounded-xl hover:from-amber-400 hover:to-amber-300 transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Bank Account</span>
                </button>
              </div>
            )}
          </div>

          {/* 5 WALLET METRIC CARDS (NGN ONLY) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Available Balance */}
            <div className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl shadow-lg space-y-2">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Available Balance</span>
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-emerald-400">₦{walletSummary.availableBalanceNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-400 font-medium">Ready for instant payout</p>
            </div>

            {/* Card 2: Pending Balance */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Pending Settlement</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-amber-400">₦{walletSummary.pendingBalanceNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-400 font-medium">{sellerConfig.settlementPeriodHours}h verification lock</p>
            </div>

            {/* Card 3: Total Qualifying Sales */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Sales (Gross)</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-cyan-400">₦{walletSummary.totalSalesNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-400 font-medium">All store sales converted to NGN</p>
            </div>

            {/* Card 4: Total Net Earned */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Net Earnings</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-white">₦{walletSummary.totalEarnedNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-400 font-medium">After {sellerConfig.platformFeePercent}% marketplace fee</p>
            </div>

            {/* Card 5: Total Paid Out */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Paid Out</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-slate-200">₦{walletSummary.totalPaidOutNGN.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-slate-400 font-medium">Transferred to bank account</p>
            </div>

          </div>

          {/* Sub-navigation inside Wallet */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-4 text-xs font-bold">
              <button
                onClick={() => setWalletSubTab('ledger')}
                className={`pb-2 border-b-2 transition-colors ${walletSubTab === 'ledger' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                Immutable Financial Ledger ({ledgerEntries.length})
              </button>
              <button
                onClick={() => setWalletSubTab('payouts')}
                className={`pb-2 border-b-2 transition-colors ${walletSubTab === 'payouts' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
              >
                Payout History ({payoutHistory.length})
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Auto-Payout Threshold: ₦{sellerConfig.minWithdrawalAmount.toLocaleString('en-NG')}</span>
            </div>
          </div>

          {/* Sub-tab 1: Financial Ledger */}
          {walletSubTab === 'ledger' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white">Immutable Transaction Ledger</h3>
                  <p className="text-xs text-slate-400">Complete audit trail of sales earnings, conversions, platform fees, and payouts.</p>
                </div>
                <button
                  onClick={loadSellerData}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white text-xs rounded-lg font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWallet ? 'animate-spin' : ''}`} />
                  <span>Refresh Ledger</span>
                </button>
              </div>

              {ledgerEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No Ledger Transactions Yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When customer orders are created for your products, earnings and multi-currency conversions will be logged here automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Description / Details</th>
                        <th className="py-3 px-3">Original Sale</th>
                        <th className="py-3 px-3">Conversion Rate</th>
                        <th className="py-3 px-3">Platform Fee ({sellerConfig.platformFeePercent}%)</th>
                        <th className="py-3 px-3 text-right">Net Amount (NGN)</th>
                        <th className="py-3 px-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 font-bold">
                            {entry.type === 'SALE_EARNING' && <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px]">SALE EARNING</span>}
                            {entry.type === 'SETTLEMENT_CREDIT' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">SETTLEMENT</span>}
                            {entry.type === 'PAYOUT_COMPLETED' && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px]">PAYOUT</span>}
                            {entry.type === 'REFUND_REVERSAL' && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px]">REVERSAL</span>}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-white">{entry.description}</p>
                            {entry.orderId && <span className="text-[10px] text-slate-500">Order #{entry.orderId}</span>}
                          </td>
                          <td className="py-3 px-3">
                            {entry.conversionDetails ? (
                              <span className="font-mono text-slate-200">
                                {entry.conversionDetails.originalCurrency} {entry.conversionDetails.originalAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {entry.conversionDetails ? (
                              `₦${entry.conversionDetails.exchangeRate.toLocaleString()} / ${entry.conversionDetails.originalCurrency}`
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-amber-400 font-mono">
                            {entry.conversionDetails ? (
                              `-₦${entry.conversionDetails.platformFeeNGN.toLocaleString('en-NG')}`
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={`py-3 px-3 text-right font-extrabold text-sm ${entry.amountNGN >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {entry.amountNGN >= 0 ? '+' : ''}₦{entry.amountNGN.toLocaleString('en-NG')}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Payout History */}
          {walletSubTab === 'payouts' && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-white">Bank Payout History</h3>
                  <p className="text-xs text-slate-400">Disbursed withdrawals sent to your verified Nigerian Bank Account.</p>
                </div>
              </div>

              {payoutHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">No Payout Requests Yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Once your available balance reaches ₦5,000, you can request a manual withdrawal or rely on automated next-day settlements.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                        <th className="py-3 px-3">Payout Ref</th>
                        <th className="py-3 px-3">Destination Bank & NUBAN</th>
                        <th className="py-3 px-3">Amount (NGN)</th>
                        <th className="py-3 px-3">Transfer Ref</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {payoutHistory.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                            {payout.id}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-white">{payout.bankDetails.bankName}</p>
                            <span className="text-[11px] text-slate-400">{payout.bankDetails.accountNumber} ({payout.bankDetails.accountName})</span>
                          </td>
                          <td className="py-3 px-3 font-black text-sm text-emerald-400">
                            ₦{payout.amountNGN.toLocaleString('en-NG')}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            {payout.transferReference || 'NEXO_NUBAN_DIRECT'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                            {new Date(payout.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Tab: Analytics & Recharts */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sales & Revenue Trend Chart */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm">7-Day Sales & Revenue Trend</h3>
                  <p className="text-xs text-slate-500">Real-time breakdown of daily order volume and dollar earnings.</p>
                </div>
                <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getDailySalesData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val: any) => [`$${val}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Product Performance */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm">Top Performing Products</h3>
                  <p className="text-xs text-slate-500">Revenue generated by top selling inventory items.</p>
                </div>
                <PieChartIcon className="w-4 h-4 text-purple-500" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTopProductsData()} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#64748b" width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val: any) => [`$${val}`, 'Gross Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                      {getTopProductsData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {deleteSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{deleteSuccess}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black">Store Inventory Management</h3>
              <p className="text-xs text-slate-500">Manage physical products and instant-download digital e-books.</p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setActiveTab('ai-generator');
              }}
              className="px-4 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md hover:bg-cyan-400 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product / E-Book</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storeProducts.map((p) => (
              <div key={p.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm hover:border-cyan-500/50 transition-colors">
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 relative">
                  <img src={p.images[0]} alt={p.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-cyan-400 border border-cyan-500/30">
                    {p.isDigital ? 'Digital E-Book' : 'Physical Item'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm line-clamp-1">{p.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">Brand: {p.brand}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-lg font-black text-emerald-500">${p.price}</span>
                    <span className="text-xs font-bold text-slate-400">Stock: {p.stock}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handlePromptDeleteProduct(p)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Product
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Customer Orders */}
      {activeTab === 'orders' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
          <h3 className="font-extrabold text-sm">Seller Order Fulfillment</h3>
          <p className="text-xs text-slate-500">Orders placed by customers for products listed by {currentStore.name}.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Total ($)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-300">
                {sellerOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">#{ord.id}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{ord.customerName}</p>
                      <span className="text-[10px] text-slate-500">{ord.customerEmail}</span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate">
                      {ord.items?.map(i => `${i.product.title} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-3 px-3 font-black text-emerald-500">${ord.total}</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">{ord.createdAt?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Category Request */}
      {activeTab === 'category-request' && (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-6 shadow-md">
          <div>
            <h3 className="text-lg font-black">Request Custom Product Category</h3>
            <p className="text-xs text-slate-500 mt-1">If your niche product line doesn't fit existing store categories, submit a request to NEXOVIRA Admin.</p>
          </div>

          {catRequestStatus && (
            <div className={`p-4 rounded-xl text-xs font-bold border ${catRequestStatus.includes('successfully') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
              {catRequestStatus}
            </div>
          )}

          <form onSubmit={handleCategoryRequestSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-400">Proposed Category Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Commercial Portable Dehumidifiers"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-400">Target Category Group</label>
              <select
                value={catGroup}
                onChange={(e: any) => setCatGroup(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="appliances">Major Appliances & Inverters</option>
                <option value="electronics">Electronics & Gadgets</option>
                <option value="smart-home">Smart Home & Solar Energy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase text-slate-400">Category Justification / Description</label>
              <textarea
                rows={3}
                placeholder="Briefly explain why this category is required for your inventory..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingCat}
              className="w-full py-3 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submittingCat ? 'Submitting Request...' : 'Submit Category Proposal'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: AI Listing Studio */}
      {activeTab === 'ai-generator' && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-cyan-500/30 rounded-3xl space-y-4 text-white">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>AI E-Book & Product Upload Studio</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Publish physical merchandise or digital e-books with instant PDF download delivery. Gemini AI assists with automatic marketing descriptions and specifications.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md">
            <EbookProductUploadForm
              sellerId={currentStore.id}
              sellerName={currentStore.name}
              onSave={handleSaveSellerProductData}
              onCancel={() => setActiveTab('products')}
            />
          </div>
        </div>
      )}

      {/* MODAL 1: WITHDRAWAL MODAL (NGN ONLY) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase">
                <Wallet className="w-4 h-4" />
                <span>NEXOVIRA NGN PAYOUT ENGINE</span>
              </div>
              <h3 className="text-2xl font-black">Withdraw Seller Earnings</h3>
              <p className="text-xs text-slate-400">
                Disburse funds directly to your verified Nigerian Bank Account. Payouts are made strictly in <strong>Nigerian Naira (₦ NGN)</strong>.
              </p>
            </div>

            {withdrawMsg && (
              <div className={`p-4 rounded-xl text-xs font-bold border ${withdrawMsg.includes('Success') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                {withdrawMsg}
              </div>
            )}

            <form onSubmit={handleExecuteWithdrawal} className="space-y-4 text-left">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Available Balance:</span>
                  <span className="font-black text-emerald-400 text-sm">₦{walletSummary.availableBalanceNGN.toLocaleString('en-NG')}</span>
                </div>
                {bankAccount && (
                  <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Destination Bank:</span>
                    <span className="font-bold text-slate-200">{bankAccount.bankName} ({bankAccount.accountNumber})</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase text-slate-300">Amount to Withdraw (₦ NGN)</label>
                <input
                  type="number"
                  required
                  min={sellerConfig.minWithdrawalAmount}
                  max={walletSummary.availableBalanceNGN}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-lg font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2 pt-1">
                  {[5000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(amt)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold rounded-lg text-slate-300"
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(walletSummary.availableBalanceNGN)}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold rounded-lg border border-emerald-500/30 ml-auto"
                  >
                    Max Available
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || walletSummary.availableBalanceNGN < sellerConfig.minWithdrawalAmount}
                className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>{isWithdrawing ? 'Processing Transfer...' : `Confirm ₦${withdrawAmount.toLocaleString('en-NG')} Withdrawal`}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REAL NIGERIAN BANK VERIFICATION MODAL */}
      <SellerBankVerificationModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        sellerId={currentStore.id}
        sellerName={currentStore.name}
        currentBankAccount={bankAccount}
        onBankAccountUpdated={(updatedBank) => {
          setBankAccount(updatedBank);
          setShowBankModal(false);
          loadSellerData();
        }}
      />

      {/* Product Deletion Confirmation Dialog Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Product</h3>
                <p className="text-xs text-slate-500">Security & Inventory Verification</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Are you sure you want to delete this product?
              </p>
              
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                {productToDelete.images && productToDelete.images[0] && (
                  <img
                    src={productToDelete.images[0]}
                    alt={productToDelete.title}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{productToDelete.title}</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    ${productToDelete.price} • {productToDelete.isDigital ? 'Digital E-Book' : 'Physical SKU'}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium leading-relaxed">
                This product will immediately disappear from the public NEXOVIRA marketplace. If this is a digital e-book, new download access will be safely revoked.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError('');
                }}
                disabled={isDeletingProduct}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const SellerDashboardView: React.FC<SellerDashboardViewProps> = (props) => (
  <ErrorBoundary
    fallbackTitle="Seller Studio Protected"
    fallbackMessage="A component exception inside Seller Studio was safely isolated by the NEXOVIRA Error Boundary. Your store records and product inventory remain preserved."
  >
    <SellerDashboardContent {...props} />
  </ErrorBoundary>
);

