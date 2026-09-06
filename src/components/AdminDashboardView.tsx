import React, { useState, useEffect } from 'react';
import { Product, Category, Order, HomepageSection, TechService, AffiliateConfig, AffiliateProfile, OrderFinancials, PayoutRequest, AffiliateCommissionRecord, SellerConfig, SellerPayoutRecord, SecurityAuditLog } from '../types';
import { 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Settings, 
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  MessageSquare,
  Code2,
  Users,
  UserCheck,
  UserPlus,
  X,
  Lock,
  BookOpen,
  FileText,
  Share2,
  Sliders,
  RotateCcw,
  Building2,
  Wallet,
  ShieldAlert,
  History,
  Eye,
  AlertTriangle,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { EbookProductUploadForm } from './EbookProductUploadForm';
import { ImageUploadField } from './ImageUploadField';
import { NexoviraLogo } from './NexoviraLogo';
import { useAuth } from '../context/AuthContext';
import { AdminTechServicesManager } from './tech-services/AdminTechServicesManager';
import { AdminUserManagement } from './admin/AdminUserManagement';
import { AdminScholarshipManager } from './admin/AdminScholarshipManager';
import { 
  getProductsFromFirestore, 
  getCategoriesFromFirestore, 
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveProductToFirestore, 
  deleteProductFromFirestore, 
  uploadProductImage, 
  getOrdersFromFirestore, 
  updateOrderStatusInFirestore, 
  getStoreSettingsFromFirestore, 
  updateStoreSettingsInFirestore,
  getTechServicesFromFirestore,
  saveTechServiceToFirestore,
  deleteTechServiceFromFirestore,
  getEscrowServiceOrdersFromFirestore,
  deleteEscrowServiceOrderFromFirestore,
  getAffiliateConfigFromFirestore,
  saveAffiliateConfigInFirestore,
  getAllAffiliatesFromFirestore,
  getFinancialSnapshotsFromFirestore,
  getPayoutRequestsFromFirestore,
  updatePayoutStatusInFirestore,
  refundOrderAndReverseCommissionsInFirestore,
  getAllCommissionsFromFirestore,
  getSellerConfigFromFirestore,
  saveSellerConfigInFirestore,
  getAllSellerPayoutsFromFirestore,
  updateSellerPayoutStatusInFirestore,
  getAuditLogsFromFirestore,
  fetchBankVerificationProviderStatus,
  fetchSellerBankAccountAuditLogs
} from '../lib/firestoreService';
import { SellerBankAccountAuditLog } from '../types';
import { 
  getLiveExchangeRateInfo, 
  fetchLiveExchangeRate, 
  getLiveExchangeRate, 
  ExchangeRateInfo 
} from '../lib/exchangeRateService';
import { formatCurrency } from '../lib/currency';

interface AdminDashboardViewProps {
  onNavigate?: (path: string) => void;
  homepageSections?: HomepageSection[];
  setHomepageSections?: React.Dispatch<React.SetStateAction<HomepageSection[]>>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { user, userProfile, isAdmin, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'orders' | 'services' | 'scholarships' | 'users' | 'affiliates' | 'seller-payouts' | 'audit-logs' | 'settings'>('overview');

  // Seller Payout State
  const [sellerConfig, setSellerConfig] = useState<SellerConfig>({
    settlementPeriodHours: 24,
    minWithdrawalAmount: 5000,
    autoPayoutEnabled: true,
    platformFeePercent: 5
  });
  const [sellerPayouts, setSellerPayouts] = useState<SellerPayoutRecord[]>([]);
  const [savingSellerConfig, setSavingSellerConfig] = useState(false);
  const [bankProviderStatus, setBankProviderStatus] = useState<{
    configured: boolean;
    provider: string;
    missingCredentials?: string[];
    message: string;
  }>({
    configured: false,
    provider: 'Paystack',
    message: 'Checking provider status...'
  });
  const [sellerBankAuditLogs, setSellerBankAuditLogs] = useState<SellerBankAccountAuditLog[]>([]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [techServices, setTechServices] = useState<TechService[]>([]);
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // Product Deletion State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductError, setDeleteProductError] = useState('');

  // Category Deletion State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Service Deletion State
  const [serviceToDelete, setServiceToDelete] = useState<TechService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Escrow Order Deletion State
  const [escrowOrderToDelete, setEscrowOrderToDelete] = useState<any | null>(null);
  const [isDeletingEscrowOrder, setIsDeletingEscrowOrder] = useState(false);

  // Affiliate State
  const [affiliateConfig, setAffiliateConfig] = useState<AffiliateConfig>({
    minCommissionRate: 1,
    maxCommissionRate: 30,
    attributionWindowDays: 30,
    attributionRule: 'last-click',
    marketplaceCommissionRate: 5,
    settlementPeriodHours: 24,
    minWithdrawalAmount: 1000,
    defaultCommissionRate: 10,
    defaultCommissionType: 'percentage'
  });
  const [affiliateProfiles, setAffiliateProfiles] = useState<AffiliateProfile[]>([]);
  const [orderFinancialsList, setOrderFinancialsList] = useState<OrderFinancials[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [allCommissions, setAllCommissions] = useState<AffiliateCommissionRecord[]>([]);

  const [storeSettings, setStoreSettings] = useState({
    exchangeRate: 1600,
    storePhone: '+234 911 044 3054',
    whatsappPhone: '2348129595134',
    contactEmail: 'nexovirasupport@gmail.com',
    storeAddress: '14 Admiralty Way, Victoria Island, Lagos, Nigeria',
    flashDealBannerText: 'FLASH SALE: Up to 20% OFF NEXOVIRA Smart Inverter ACs & Solar Generators - Fast Lagos Delivery!'
  });

  const [liveRateInfo, setLiveRateInfo] = useState<ExchangeRateInfo>(getLiveExchangeRateInfo());
  const [isSyncingRate, setIsSyncingRate] = useState(false);

  const handleSyncLiveExchangeRate = async () => {
    setIsSyncingRate(true);
    try {
      await fetchLiveExchangeRate(true);
      setLiveRateInfo(getLiveExchangeRateInfo());
      setSaveSuccessMsg('Live online foreign exchange rate refreshed successfully from market API!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e) {
      console.warn('Failed to sync live rate:', e);
    } finally {
      setIsSyncingRate(false);
    }
  };

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productFilterType, setProductFilterType] = useState<'all' | 'physical' | 'ebooks'>('all');

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Tech Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<TechService> | null>(null);
  const [serviceSaving, setServiceSaving] = useState(false);

  // Category Management State (Admin Only)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    group: 'appliances' | 'electronics' | 'smart-home';
    icon: string;
    description: string;
  }>({
    name: '',
    group: 'appliances',
    icon: 'Package',
    description: ''
  });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeletingId, setCategoryDeletingId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryError('Category name is required.');
      return;
    }
    setCategorySaving(true);
    setCategoryError('');
    try {
      await saveCategoryToFirestore({
        name: categoryForm.name.trim(),
        group: categoryForm.group,
        icon: categoryForm.icon.trim() || 'Package',
        description: categoryForm.description.trim()
      });
      setCategorySuccess(`Category "${categoryForm.name}" created successfully.`);
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', group: 'appliances', icon: 'Package', description: '' });
      const updatedCats = await getCategoriesFromFirestore();
      setCategories(updatedCats);
      setTimeout(() => setCategorySuccess(''), 4000);
    } catch (err: any) {
      setCategoryError(err?.message || 'Failed to save category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setCategoryDeletingId(categoryToDelete.id);
    setCategoryError('');
    try {
      const catId = categoryToDelete.id;
      setCategories(prev => prev.filter(c => c.id !== catId));
      await deleteCategoryFromFirestore(catId);
      setCategorySuccess(`Category "${categoryToDelete.name}" deleted successfully.`);
      setCategoryToDelete(null);
      const updatedCats = await getCategoriesFromFirestore();
      setCategories(updatedCats);
      setTimeout(() => setCategorySuccess(''), 4000);
    } catch (err: any) {
      setCategoryError(err?.message || 'Failed to delete category.');
    } finally {
      setCategoryDeletingId(null);
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [prods, cats, ords, settings, servs, escrows, affCfg, affProfs, finSnaps, payouts, comms, selCfg, selPayouts, aLogs, bankProv, bankAudits] = await Promise.all([
        getProductsFromFirestore(),
        getCategoriesFromFirestore(),
        getOrdersFromFirestore(undefined, true),
        getStoreSettingsFromFirestore(),
        getTechServicesFromFirestore(),
        getEscrowServiceOrdersFromFirestore(),
        getAffiliateConfigFromFirestore(),
        getAllAffiliatesFromFirestore(),
        getFinancialSnapshotsFromFirestore(),
        getPayoutRequestsFromFirestore(),
        getAllCommissionsFromFirestore(),
        getSellerConfigFromFirestore(),
        getAllSellerPayoutsFromFirestore(),
        getAuditLogsFromFirestore(),
        fetchBankVerificationProviderStatus(),
        fetchSellerBankAccountAuditLogs()
      ]);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      if (settings) setStoreSettings(settings);
      setTechServices(servs);
      setEscrowOrders(escrows);
      setAffiliateConfig(affCfg);
      setAffiliateProfiles(affProfs);
      setOrderFinancialsList(finSnaps);
      setPayoutRequests(payouts);
      setAllCommissions(comms);
      setSellerConfig(selCfg);
      setSellerPayouts(selPayouts);
      setAuditLogs(aLogs);
      if (bankProv) setBankProviderStatus(bankProv);
      if (bankAudits) setSellerBankAuditLogs(bankAudits);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setServiceSaving(true);
    try {
      await saveTechServiceToFirestore(editingService);
      setSaveSuccessMsg('Service / Verified Expert saved live to Firestore!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      setIsServiceModalOpen(false);
      setEditingService(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save tech service:', err);
    } finally {
      setServiceSaving(false);
    }
  };

  const handleDeleteService = (serviceId: string) => {
    const serv = techServices.find(s => s.id === serviceId);
    if (serv) {
      setServiceToDelete(serv);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    try {
      const sid = serviceToDelete.id;
      setTechServices((prev) => prev.filter((s) => s.id !== sid));
      await deleteTechServiceFromFirestore(sid, 'admin');
      setSaveSuccessMsg(`Service "${serviceToDelete.title}" removed successfully.`);
      setServiceToDelete(null);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      await loadData();
    } catch (err) {
      console.error('Failed to delete tech service:', err);
    } finally {
      setIsDeletingService(false);
    }
  };

  const handleDeleteEscrowOrder = (orderId: string) => {
    const ord = escrowOrders.find(o => o.id === orderId);
    if (ord) {
      setEscrowOrderToDelete(ord);
    }
  };

  const handleConfirmDeleteEscrowOrder = async () => {
    if (!escrowOrderToDelete) return;
    setIsDeletingEscrowOrder(true);
    try {
      const oid = escrowOrderToDelete.id;
      setEscrowOrders((prev) => prev.filter((o) => o.id !== oid));
      await deleteEscrowServiceOrderFromFirestore(oid);
      setSaveSuccessMsg('Escrow order removed.');
      setEscrowOrderToDelete(null);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      await loadData();
    } catch (err) {
      console.error('Failed to delete escrow order:', err);
    } finally {
      setIsDeletingEscrowOrder(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  useEffect(() => {
    const handleRateUpdate = () => {
      setLiveRateInfo(getLiveExchangeRateInfo());
    };
    window.addEventListener('nexovira:exchange-rate-updated', handleRateUpdate);
    fetchLiveExchangeRate().then(() => setLiveRateInfo(getLiveExchangeRateInfo())).catch(() => {});
    return () => window.removeEventListener('nexovira:exchange-rate-updated', handleRateUpdate);
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Verifying authorization...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm">
          You do not have administrative permissions. Please sign in with an owner or admin account.
        </p>
        <button
          onClick={() => onNavigate && onNavigate('/')}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-sm"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  // Live Stats Calculations
  const totalProducts = products.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'Pending Order');
  const todayRevenue = orders
    .filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Handle Save Product
  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setUploadingImage(true);
      await saveProductToFirestore(editingProduct);
      setSaveSuccessMsg('Product saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      console.error('Save product error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    try {
      const prodId = editingProduct?.id || `prod-${Date.now()}`;
      const imageUrl = await uploadProductImage(file, prodId);
      setEditingProduct(prev => {
        const nextImages = [...(prev?.images || []), imageUrl];
        return {
          ...prev,
          id: prodId,
          images: nextImages
        };
      });
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    setDeleteProductError('');
    try {
      await deleteProductFromFirestore(productToDelete.id, { reason: 'admin_dashboard_deletion' });
      setSaveSuccessMsg(`Product "${productToDelete.title}" was safely removed from the active marketplace catalog.`);
      setProductToDelete(null);
      await loadData();
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Failed to delete product as admin:', err);
      setDeleteProductError(err?.message || 'Access Denied: Product deletion failed.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Handle Order Status Update
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    await updateOrderStatusInFirestore(orderId, newStatus);
    await loadData();
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreSettingsInFirestore(storeSettings);
    setSaveSuccessMsg('Store settings updated!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (productFilterType === 'physical') {
      return !p.isDigital && p.productType !== 'digital_ebook';
    }
    if (productFilterType === 'ebooks') {
      return p.isDigital || p.productType === 'digital_ebook';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left text-slate-900 dark:text-slate-100">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <NexoviraLogo size={40} showText={false} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">NEXOVIRA Database Admin Portal</h1>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold">
                Firestore Cloud Database
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage real Firestore products, live order shipments, categories, & store exchange rates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loadingData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh Database
          </button>
          <button
            onClick={async () => {
              await logout();
              onNavigate && onNavigate('/signin');
            }}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            title="Sign Out of Admin Account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Package className="w-4 h-4" /> Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'categories' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <ShoppingBag className="w-4 h-4" /> Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Truck className="w-4 h-4" /> Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Code2 className="w-4 h-4" /> Tech & Digital Services Ecosystem
        </button>
        <button
          onClick={() => setActiveTab('scholarships')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'scholarships' ? 'bg-[#0682F4] text-white font-black shadow-md' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <GraduationCap className="w-4 h-4" /> Nexovira Academy & Scholarships
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Users className="w-4 h-4" /> Users &amp; Roles
        </button>
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'affiliates' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Share2 className="w-4 h-4" /> Affiliates & Financials ({affiliateProfiles.length})
        </button>
        <button
          onClick={() => setActiveTab('seller-payouts')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'seller-payouts' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Wallet className="w-4 h-4" /> Seller NGN Payouts ({sellerPayouts.length})
        </button>
        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'audit-logs' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <History className="w-4 h-4" /> Security & Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          <Settings className="w-4 h-4" /> Store Config
        </button>
      </div>

      {/* Tab 1: Overview Stats */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Catalog Items</span>
              <div className="text-3xl font-black text-white">{totalProducts}</div>
              <p className="text-[11px] text-cyan-400">Live in Firestore Database</p>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Pending Orders</span>
              <div className="text-3xl font-black text-amber-400">{pendingOrders.length}</div>
              <p className="text-[11px] text-slate-400">Awaiting dispatch confirmation</p>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Today's Revenue</span>
              <div className="text-3xl font-black text-emerald-400">
                ₦{Math.round(todayRevenue >= 500 ? todayRevenue : todayRevenue * liveRateInfo.rate).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400">All products settled in Naira (₦)</p>
            </div>
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Automated Online FX Rate</span>
              <div className="text-3xl font-black text-cyan-400">₦{liveRateInfo.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / $1</div>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Live Automated Sync
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Products CRUD */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search catalog by title or brand..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>

              {/* Type Filters */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setProductFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    productFilterType === 'all'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({products.length})
                </button>

                <button
                  type="button"
                  onClick={() => setProductFilterType('physical')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    productFilterType === 'physical'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Physical ({products.filter(p => !p.isDigital && p.productType !== 'digital_ebook').length})
                </button>

                <button
                  type="button"
                  onClick={() => setProductFilterType('ebooks')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    productFilterType === 'ebooks'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                  E-books ({products.filter(p => p.isDigital || p.productType === 'digital_ebook').length})
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingProduct({
                  title: '',
                  brand: 'NEXOVIRA',
                  categoryId: 'air-conditioners',
                  price: 300,
                  stock: 15,
                  description: '',
                  images: [],
                  keyFeatures: [],
                  warranty: '2 Years Warranty'
                });
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create Product Document
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Product / Title</th>
                    <th className="p-4">Type & Category</th>
                    <th className="p-4">Price (₦ NGN)</th>
                    <th className="p-4">USD Value (Live)</th>
                    <th className="p-4">Stock / Delivery</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredProducts.map((p) => {
                    const priceInUSD = p.price >= 500 
                      ? Math.round((p.price / liveRateInfo.rate) * 100) / 100 
                      : p.price;
                    return (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="p-4 flex items-center gap-3">
                        <img src={p.images[0]} alt={p.title} className="w-10 h-12 object-cover rounded-lg shrink-0 border border-slate-800" />
                        <div>
                          <div className="font-bold text-white max-w-xs truncate">{p.title}</div>
                          <div className="text-[10px] text-slate-500">
                            {(p.isDigital || p.productType === 'digital_ebook') 
                              ? `Author: ${p.author || p.brand}` 
                              : `${p.brand} • SKU: ${p.id}`}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {(p.isDigital || p.productType === 'digital_ebook') ? (
                          <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                            <BookOpen className="w-3 h-3 text-purple-400" />
                            Digital E-book
                          </span>
                        ) : (
                          <span className="uppercase font-semibold text-cyan-400">{p.categoryId}</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-emerald-400 text-sm">{formatCurrency(p.price)}</td>
                      <td className="p-4 font-mono text-slate-400">${priceInUSD.toFixed(2)}</td>
                      <td className="p-4 font-bold">
                        {(p.isDigital || p.productType === 'digital_ebook') ? (
                          <span className="text-purple-300 text-[11px] font-mono">Instant PDF</span>
                        ) : (
                          <span>{p.stock} units</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsProductModalOpen(true);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteProductError('');
                            setProductToDelete(p);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Categories (Admin-Only Addition & Deletion) */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl">
            <div>
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">Store Categories ({categories.length})</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Categories are strictly managed by store administrators. Product counts reflect live catalog inventory — categories with no assigned inventory automatically display zero products.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategoryError('');
                setIsCategoryModalOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Feedback Messages */}
          {categorySuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {categorySuccess}
            </div>
          )}

          {categoryError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {categoryError}
            </div>
          )}

          {/* Categories Grid */}
          {categories.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">No Categories Configured</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All categories have been removed. As a store administrator, you can add new product categories anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryError('');
                  setIsCategoryModalOpen(true);
                }}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => {
                const liveCount = products.filter((p) => p.categoryId === c.id).length;
                const isDeleting = categoryDeletingId === c.id;

                return (
                  <div 
                    key={c.id} 
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-white text-sm">{c.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {c.id}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          c.group === 'smart-home' 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : c.group === 'electronics'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {c.group || 'appliances'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {c.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          liveCount > 0 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                        }`}>
                          {liveCount} {liveCount === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c)}
                        disabled={isDeleting}
                        title={`Delete ${c.name} category`}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Category Modal */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Package className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-black text-white">Create New Category</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {categoryError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {categoryError}
                  </div>
                )}

                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Category Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solar Generators & Inverters"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Department / Group
                      </label>
                      <select
                        value={categoryForm.group}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, group: e.target.value as any }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="appliances">Appliances</option>
                        <option value="electronics">Electronics</option>
                        <option value="smart-home">Smart Home & Solar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                        Icon Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Zap, Wind, Tv"
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Brief overview of items contained in this product category..."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={categorySaving}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {categorySaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Category'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No orders recorded in Firestore yet.</div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <span className="font-extrabold text-white text-sm">Order ID: #{ord.id}</span>
                    <p className="text-xs text-slate-400">{ord.customerName} ({ord.customerEmail})</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-cyan-400 text-base">₦{(ord.total * storeSettings.exchangeRate).toLocaleString()}</span>
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value as Order['status'])}
                      className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="Pending Order">Pending Order</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="font-bold text-slate-400 uppercase">Items:</span>
                  <div className="mt-1 space-y-1">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}× {item.product.title}</span>
                        <span className="font-bold">₦{(item.product.price * item.quantity * storeSettings.exchangeRate).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Tech Services & Verified Experts */}
      {activeTab === 'services' && (
        <div className="space-y-8">
          {/* Managed Tech & Digital Services Ecosystem Manager */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                Central Platform Control
              </span>
              <h2 className="text-xl font-black text-white mt-1">TECH & DIGITAL SERVICES ECOSYSTEM</h2>
              <p className="text-xs text-slate-400 mt-1">
                Centralized administration for Client Project Briefs, Gemini 3.8 Flash AI Talent Scoping, Vetted Specialist Network, Dynamic Category Taxonomy, and Email Alerts to <strong className="text-cyan-300">nexoviratech@gmail.com</strong>.
              </p>
            </div>

            <AdminTechServicesManager />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Code2 className="w-4 h-4" />
                <span>Pre-Packaged Catalog Offerings</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">Direct Catalog Service Packages</h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage fixed-scope turnkey packages available for instant escrow checkout.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingService({
                  id: `service-${Date.now()}`,
                  title: '',
                  category: 'Software & Web',
                  providerName: 'NEXOVIRA Verified Expert',
                  providerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                  providerVerified: true,
                  rating: 5.0,
                  reviewCount: 1,
                  startingPrice: 500,
                  image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
                  description: '',
                  location: 'Lagos, Nigeria',
                  packages: [
                    { name: 'Basic', price: 500, deliveryDays: 3, revisions: '3', features: ['Initial Scope', 'Milestone 1'] },
                    { name: 'Pro', price: 1200, deliveryDays: 7, revisions: '5', features: ['Full Development', 'Code Handover'] },
                    { name: 'Enterprise', price: 2500, deliveryDays: 14, revisions: '10', features: ['End-to-End Escrow Delivery', 'Dedicated Support'] }
                  ],
                  keyFeatures: ['100% Escrow Protection', 'Verified Specialist', 'Fast Turnaround']
                });
                setIsServiceModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-lg hover:shadow-cyan-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Verified Expert / Service</span>
            </button>
          </div>

          {/* Active Services List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-400 flex items-center justify-between">
              <span>ACTIVE MARKETPLACE SERVICES ({techServices.length})</span>
              <span className="text-cyan-400">Synced to Firestore Database</span>
            </div>

            <div className="divide-y divide-slate-800">
              {techServices.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No active services found. Click above to add your first expert or service offering.
                </div>
              ) : (
                techServices.map((serv) => (
                  <div key={serv.id} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <img
                        src={serv.image}
                        alt={serv.title}
                        className="w-20 h-16 object-cover rounded-xl border border-slate-800 shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                            {serv.category}
                          </span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Escrow Delivery
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-white">{serv.title}</h3>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>Specialist: <strong className="text-slate-200">{serv.providerName}</strong></span>
                          <span>•</span>
                          <span>Starting from: <strong className="text-cyan-400 font-mono">${serv.startingPrice}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => {
                          setEditingService(serv);
                          setIsServiceModalOpen(true);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1 text-xs font-bold"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteService(serv.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 flex items-center gap-1 text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Managed Service Requests & Expert Network Admin Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Tech & Digital Services Ecosystem — Management & AI Matching</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review technical project briefs submitted by clients, run AI specialist matching with Gemini 3.8 Flash, assign vetted talent, and manage Expert Network applications.
              </p>
            </div>
            <AdminTechServicesManager />
          </div>

          {/* Escrow Orders Received */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Escrow Service Orders & Client Proposals</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live client hire proposals requiring specialist assignment or milestone tracking.
                </p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
                {escrowOrders.length} Escrow Orders
              </span>
            </div>

            {escrowOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No escrow hire orders submitted yet. When customers hire specialists from the frontend, proposals will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {escrowOrders.map((ord, i) => (
                  <div key={ord.id || i} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-sm">{ord.serviceTitle}</div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold uppercase text-[10px]">
                          {ord.status || 'Funds in Escrow'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEscrowOrder(ord.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove escrow order"
                          aria-label="Remove order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>Client: <strong className="text-slate-200">{ord.clientName}</strong></div>
                      <div>Contact: <strong className="text-cyan-400">{ord.clientEmail}</strong></div>
                      <div>Package: <strong className="text-slate-200">{ord.packageName}</strong></div>
                      <div>Amount: <strong className="text-emerald-400 font-mono">${ord.packagePriceUSD}</strong></div>
                    </div>
                    {ord.clientRequirement && (
                      <div className="p-2.5 bg-slate-900 rounded-xl text-slate-300 italic border border-slate-800 text-[11px]">
                        "{ord.clientRequirement}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Nexovira Academy & Scholarships Management */}
      {activeTab === 'scholarships' && (
        <AdminScholarshipManager userRole={userProfile?.role} />
      )}

      {/* Tab: Users & Roles Management */}
      {activeTab === 'users' && (
        <AdminUserManagement />
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-xs">
          <h3 className="text-lg font-bold text-white">Global Store Config</h3>

          {/* Automated Real-Time FX Rate Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white text-sm">Automated Real-Time USD to NGN Rate</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                Online API Feed
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">
                ₦{liveRateInfo.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono text-slate-400">per $1.00 USD</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nexovira automatically retrieves real-time market exchange rates from global foreign exchange APIs. Manual admin rate overrides are strictly disabled to enforce authentic pricing. All product listings and transactions are native to Nigerian Naira (₦ NGN).
            </p>

            <div className="pt-2 border-t border-slate-900 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500">
              <span>Source: <strong className="text-slate-400">{liveRateInfo.source}</strong></span>
              <div className="flex items-center gap-2">
                <span>Updated: <strong className="text-slate-400">{new Date(liveRateInfo.updatedAt).toLocaleTimeString()}</strong></span>
                <button
                  type="button"
                  onClick={handleSyncLiveExchangeRate}
                  disabled={isSyncingRate}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 font-bold transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingRate ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isSyncingRate ? 'Syncing...' : 'Sync Live Rate'}</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Store Phone Number</label>
            <input
              type="text"
              value={storeSettings.storePhone}
              onChange={(e) => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">WhatsApp Support Phone (Digits Only)</label>
            <input
              type="text"
              value={storeSettings.whatsappPhone}
              onChange={(e) => setStoreSettings({ ...storeSettings, whatsappPhone: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase">Flash Deal Banner Announcement</label>
            <input
              type="text"
              value={storeSettings.flashDealBannerText}
              onChange={(e) => setStoreSettings({ ...storeSettings, flashDealBannerText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl text-sm"
          >
            Save Store Settings to Firestore
          </button>
        </form>
      )}

      {/* Tab 7: Affiliates & Financial Management */}
      {activeTab === 'affiliates' && (
        <div className="space-y-8">
          {/* Affiliate System Parameters Config */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-black text-white">Global Affiliate & Attribution System Parameters</h3>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              await saveAffiliateConfigInFirestore(affiliateConfig);
              setSaveSuccessMsg('Affiliate system configuration updated in Firestore!');
              setTimeout(() => setSaveSuccessMsg(''), 4000);
            }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Min Commission Rate (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={affiliateConfig.minCommissionRate}
                  onChange={(e) => setAffiliateConfig({ ...affiliateConfig, minCommissionRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Max Commission Rate (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={affiliateConfig.maxCommissionRate}
                  onChange={(e) => setAffiliateConfig({ ...affiliateConfig, maxCommissionRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Attribution Window (Days)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={365}
                  value={affiliateConfig.attributionWindowDays}
                  onChange={(e) => setAffiliateConfig({ ...affiliateConfig, attributionWindowDays: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Marketplace Platform Fee (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={50}
                  value={affiliateConfig.marketplaceCommissionRate}
                  onChange={(e) => setAffiliateConfig({ ...affiliateConfig, marketplaceCommissionRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-xs"
                >
                  Save Global Affiliate Configuration to Firestore
                </button>
              </div>
            </form>
          </div>

          {/* Registered Affiliates Directory */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-white">Registered Affiliates ({affiliateProfiles.length})</h3>

            {affiliateProfiles.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No registered affiliates yet in Firestore.</p>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-2">Affiliate ID</th>
                      <th className="py-2.5 px-2">User / Email</th>
                      <th className="py-2.5 px-2">Ref Code</th>
                      <th className="py-2.5 px-2">Clicks</th>
                      <th className="py-2.5 px-2">Conversions</th>
                      <th className="py-2.5 px-2">Pending Comm.</th>
                      <th className="py-2.5 px-2">Withdrawable</th>
                      <th className="py-2.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {affiliateProfiles.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono font-bold text-rose-400">{a.id}</td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-white">{a.userName}</div>
                          <div className="text-[10px] text-slate-400">{a.userEmail}</div>
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold text-cyan-400">{a.affiliateCode}</td>
                        <td className="py-2.5 px-2 font-mono">{a.totalClicks || 0}</td>
                        <td className="py-2.5 px-2 font-mono text-emerald-400">{a.totalConversions || 0}</td>
                        <td className="py-2.5 px-2 font-mono text-amber-400">₦{Math.round((a.pendingCommission || 0) * getLiveExchangeRate()).toLocaleString()}</td>
                        <td className="py-2.5 px-2 font-mono text-emerald-400 font-bold">₦{Math.round((a.withdrawableBalance || a.approvedCommission || 0) * getLiveExchangeRate()).toLocaleString()}</td>
                        <td className="py-2.5 px-2 font-bold uppercase text-[10px] text-emerald-400">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout Withdrawal Requests */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-white">Affiliate Payout Requests ({payoutRequests.length})</h3>

            {payoutRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No pending or historical payout requests.</p>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-2">Payout ID</th>
                      <th className="py-2.5 px-2">Affiliate Code</th>
                      <th className="py-2.5 px-2">Amount ($ / ₦)</th>
                      <th className="py-2.5 px-2">Bank Details</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payoutRequests.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono text-slate-400">#{p.id.slice(0, 8)}</td>
                        <td className="py-2.5 px-2 font-mono font-bold text-cyan-400">{p.affiliateCode} ({p.affiliateName})</td>
                        <td className="py-2.5 px-2 font-mono font-black text-emerald-400">
                          ${p.amount} (~₦{Math.round(p.amount * getLiveExchangeRate()).toLocaleString()})
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-white">{p.bankDetails?.bankName} - {p.bankDetails?.accountNumber}</div>
                          <div className="text-[10px] text-slate-400">{p.bankDetails?.accountName}</div>
                        </td>
                        <td className="py-2.5 px-2 font-bold uppercase text-[10px] text-amber-400">{p.status}</td>
                        <td className="py-2.5 px-2 text-right">
                          {p.status === 'PENDING' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={async () => {
                                  await updatePayoutStatusInFirestore(p.id, 'PAID');
                                  await loadData();
                                }}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px]"
                              >
                                Approve Paid
                              </button>
                              <button
                                onClick={async () => {
                                  await updatePayoutStatusInFirestore(p.id, 'REJECTED');
                                  await loadData();
                                }}
                                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-[10px]"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Financial Audit Snapshots Ledger */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-black text-white">Authoritative Order Financial Snapshots ({orderFinancialsList.length})</h3>

            {orderFinancialsList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No order financial snapshots recorded yet.</p>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-2">Order ID</th>
                      <th className="py-2.5 px-2">Affiliate ID / Code</th>
                      <th className="py-2.5 px-2">Price</th>
                      <th className="py-2.5 px-2">Mkt Fee (5%)</th>
                      <th className="py-2.5 px-2">Aff. Comm (%)</th>
                      <th className="py-2.5 px-2">Seller Net</th>
                      <th className="py-2.5 px-2">Self-Referral</th>
                      <th className="py-2.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orderFinancialsList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-2 font-mono font-bold text-white">#{f.orderId.slice(0, 8)}</td>
                        <td className="py-2.5 px-2 font-mono text-cyan-400">{f.affiliateCode || f.affiliateId || 'ORGANIC'}</td>
                        <td className="py-2.5 px-2 font-mono">${f.productPriceSnapshot}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-400">${f.marketplaceCommissionSnapshot?.toFixed(2)}</td>
                        <td className="py-2.5 px-2 font-mono text-rose-400 font-bold">
                          ${f.affiliateCommissionSnapshot?.toFixed(2)} ({f.affiliateRateSnapshot}%)
                        </td>
                        <td className="py-2.5 px-2 font-mono text-emerald-400 font-bold">${f.sellerEarningsSnapshot?.toFixed(2)}</td>
                        <td className="py-2.5 px-2 font-bold text-[10px]">
                          {f.selfReferral ? <span className="text-rose-400">YES (Prohibited)</span> : <span className="text-slate-500">NO</span>}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            onClick={async () => {
                              if (confirm(`Refund order #${f.orderId} and reverse affiliate commissions?`)) {
                                await refundOrderAndReverseCommissionsInFirestore(f.orderId);
                                await loadData();
                              }
                            }}
                            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-[10px] rounded-md flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className="w-3 h-3" /> Refund & Reverse
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: SELLER PAYOUT SYSTEM & WALLET ENGINE (NGN ONLY) */}
      {activeTab === 'seller-payouts' && (
        <div className="space-y-8 text-left">
          {/* Header Banner */}
          <div className="p-6 bg-slate-900 border border-emerald-500/30 rounded-3xl text-white space-y-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                🇳🇬 NGN ONLY SELLER PAYOUT ENGINE
              </span>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                Firestore Settlement Core
              </span>
            </div>
            <h2 className="text-2xl font-black">Seller Wallet & Bank Payout Management</h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              NEXOVIRA supports multi-currency customer checkout, but <strong>all Seller earnings and payouts are managed strictly in Nigerian Naira (₦ NGN)</strong>. Manage automated settlement timers, minimum withdrawal thresholds, marketplace fees, and disburse bank transfers.
            </p>
          </div>

          {/* Seller Payout Config Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-md text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <span>Global Seller Wallet Configuration</span>
                </h3>
                <p className="text-xs text-slate-400">Controls rules for all NEXOVIRA marketplace sellers.</p>
              </div>
              <button
                onClick={async () => {
                  setSavingSellerConfig(true);
                  try {
                    await saveSellerConfigInFirestore(sellerConfig);
                    setSaveSuccessMsg('Seller Wallet & Settlement Configuration updated successfully!');
                    setTimeout(() => setSaveSuccessMsg(''), 4000);
                  } catch (e) {
                    alert('Failed to save Seller Config');
                  } finally {
                    setSavingSellerConfig(false);
                  }
                }}
                disabled={savingSellerConfig}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{savingSellerConfig ? 'Saving Rules...' : 'Save Seller Rules'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold uppercase text-slate-400">Settlement Lock (Hours)</label>
                <input
                  type="number"
                  value={sellerConfig.settlementPeriodHours}
                  onChange={(e) => setSellerConfig({ ...sellerConfig, settlementPeriodHours: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">Duration before pending sale moves to available NGN balance.</p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold uppercase text-slate-400">Min. Withdrawal Threshold (₦ NGN)</label>
                <input
                  type="number"
                  value={sellerConfig.minWithdrawalAmount}
                  onChange={(e) => setSellerConfig({ ...sellerConfig, minWithdrawalAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">Minimum balance required to trigger a bank payout.</p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold uppercase text-slate-400">Marketplace Fee (%)</label>
                <input
                  type="number"
                  value={sellerConfig.platformFeePercent}
                  onChange={(e) => setSellerConfig({ ...sellerConfig, platformFeePercent: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500">Percentage deducted from gross sale in NGN.</p>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold uppercase text-slate-400">Automated Next-Day Payout Engine</label>
                <select
                  value={sellerConfig.autoPayoutEnabled ? 'true' : 'false'}
                  onChange={(e) => setSellerConfig({ ...sellerConfig, autoPayoutEnabled: e.target.value === 'true' })}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="true">ENABLED (Auto-Disburse to Bank)</option>
                  <option value="false">DISABLED (Manual Approval Required)</option>
                </select>
                <p className="text-[10px] text-slate-500">Automatically disburse available balance upon settlement.</p>
              </div>
            </div>
          </div>

          {/* Seller Payout Requests Table */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-md text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm">Seller Bank Payout Requests & Disbursements</h3>
                <p className="text-xs text-slate-400">Review, disburse, or audit seller withdrawals sent to verified Nigerian bank accounts.</p>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Payouts</span>
              </button>
            </div>

            {sellerPayouts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No Seller Payout Records</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When sellers request withdrawals or automated settlements trigger, payout records will appear here for admin auditing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-3">Payout Ref</th>
                      <th className="py-3 px-3">Seller ID</th>
                      <th className="py-3 px-3">Bank & NUBAN Details</th>
                      <th className="py-3 px-3">Amount (NGN)</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Transfer Ref</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {sellerPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">{payout.id}</td>
                        <td className="py-3 px-3 font-bold text-slate-200">{payout.sellerId}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-black text-white text-xs">
                            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{payout.bankDetails.bankName}</span>
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> NUBAN Verified
                            </span>
                          </div>
                          <div className="text-[11px] font-black text-emerald-300 mt-0.5">
                            Official Name: {payout.bankDetails.accountName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            NUBAN: {payout.bankDetails.maskedAccountNumber || payout.bankDetails.accountNumber}
                            {payout.bankDetails.providerReference && (
                              <span className="ml-1 text-[9px] text-cyan-400">({payout.bankDetails.providerReference})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-black text-sm text-emerald-400">
                          ₦{payout.amountNGN.toLocaleString('en-NG')}
                        </td>
                        <td className="py-3 px-3">
                          {payout.status?.toString().toLowerCase() === 'completed' && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold">COMPLETED</span>
                          )}
                          {payout.status?.toString().toLowerCase() === 'pending' && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold">PENDING</span>
                          )}
                          {payout.status?.toString().toLowerCase() === 'failed' && (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold">FAILED</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{payout.transferReference || 'NEXO_NUBAN_DIRECT'}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          {payout.status?.toString().toLowerCase() === 'pending' && (
                            <button
                              onClick={async () => {
                                await updateSellerPayoutStatusInFirestore(payout.id, 'Completed', `NEXO_TX_${Date.now()}`);
                                await loadData();
                              }}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-lg"
                            >
                              Approve & Disburse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seller Bank Verification Provider Health & Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Bank Verification Engine Health */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-xs shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-cyan-400 font-black">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>NUBAN Verification Engine</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  bankProviderStatus.configured 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {bankProviderStatus.configured ? 'ONLINE' : 'CONFIG REQUIRED'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Active Connector:</span>
                  <strong className="text-white">{bankProviderStatus.provider}</strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Backend Status:</span>
                  <strong className={bankProviderStatus.configured ? 'text-emerald-400' : 'text-amber-400'}>
                    {bankProviderStatus.configured ? 'Verified & Connected' : 'Missing API Credentials'}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  {bankProviderStatus.message}
                </p>
              </div>

              {bankProviderStatus.missingCredentials && bankProviderStatus.missingCredentials.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-300">
                  <span className="font-bold text-[10px] uppercase">Missing Environment Secret:</span>
                  <p className="font-mono text-[11px]">{bankProviderStatus.missingCredentials.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Card 2 & 3: Live Seller Bank Audit Trail */}
            <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-xs shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Seller Bank Verification Audit Trail ({sellerBankAuditLogs.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Immutable Interbank Lookup Logs</span>
              </div>

              {sellerBankAuditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  No seller bank verification events recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {sellerBankAuditLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            log.action === 'BANK_ACCOUNT_CONFIRMED' || log.action === 'VERIFICATION_SUCCEEDED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : log.action === 'VERIFICATION_FAILED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-white truncate">
                            {log.sellerName || log.sellerId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {log.bankName} (<span className="font-mono text-cyan-400">{log.accountNumberMasked}</span>)
                          {log.newAccountName && (
                            <span className="ml-1 text-emerald-400 font-mono">
                              — {log.newAccountName}
                            </span>
                          )}
                        </div>
                        {log.providerReference && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ref: {log.providerReference}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleDateString('en-NG')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security & Audit Logs */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-6 text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Security & Authorization Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400">
                Immutable ledger of product deletions, ownership verifications, and administrative actions.
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded Events</span>
              <div className="text-2xl font-black text-white">{auditLogs.length}</div>
              <p className="text-[11px] text-cyan-400 font-medium">Logged securely in Firestore</p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Successful Operations</span>
              <div className="text-2xl font-black text-emerald-400">
                {auditLogs.filter(l => l.result === 'SUCCESS').length}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Verified & executed</p>
            </div>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorization Denials / Blocked</span>
              <div className="text-2xl font-black text-rose-400">
                {auditLogs.filter(l => l.result === 'DENIED' || l.result === 'FAILED').length}
              </div>
              <p className="text-[11px] text-rose-300/80 font-medium">Enforced by security policy</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Audit Log Entries ({auditLogs.length})</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Protected append-only log</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold">No security events logged yet.</p>
                <p className="text-xs text-slate-600">Product deletions, ownership verifications, and admin actions will appear here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold bg-slate-950/50">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Actor / Role</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-bold text-cyan-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[11px] text-white">{log.resourceId}</div>
                          <span className="text-[10px] text-slate-500 uppercase">{log.resourceType}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-semibold text-xs">{log.userEmail || log.userId}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300">
                            {log.userRole}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {log.result === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              <CheckCircle2 className="w-3 h-3" /> SUCCESS
                            </span>
                          ) : log.result === 'DENIED' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              <ShieldAlert className="w-3 h-3" /> DENIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                              <XCircle className="w-3 h-3" /> FAILED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {log.errorMessage ? (
                            <span className="text-rose-400 font-medium">{log.errorMessage}</span>
                          ) : log.metadata?.productTitle ? (
                            <span>{log.metadata.productTitle}</span>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-500">{JSON.stringify(log.metadata || {})}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <EbookProductUploadForm
              initialProduct={editingProduct}
              onSave={async (productData) => {
                const isDigitalFlag = Boolean(productData.isDigital || productData.productType === 'digital_ebook');
                const finalProd: Product = {
                  id: editingProduct?.id || `prod-admin-${Date.now()}`,
                  title: productData.title || 'Untitled Product',
                  brand: productData.brand || 'NEXOVIRA',
                  categoryId: productData.categoryId || (isDigitalFlag ? 'ebooks' : 'air-conditioners'),
                  price: Number(productData.price) || 25000,
                  originalPrice: Number(productData.originalPrice) || Number(productData.price) * 1.25,
                  currency: 'NGN',
                  rating: editingProduct?.rating || 5.0,
                  reviewCount: editingProduct?.reviewCount || 1,
                  stock: isDigitalFlag ? 9999 : (productData.stock ?? 50),
                  sellerId: productData.sellerId || 'nexovira-official',
                  sellerName: productData.sellerName || 'NEXOVIRA Official',
                  sellerVerified: true,
                  images: productData.images && productData.images.length > 0
                    ? productData.images
                    : ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'],
                  productImages: productData.productImages,
                  description: productData.description || '',
                  keyFeatures: productData.keyFeatures || [],
                  specifications: productData.specifications || {},
                  tags: productData.tags || [],
                  warranty: isDigitalFlag ? 'Lifetime Digital License' : (productData.warranty || 'Certified Quality'),
                  createdAt: editingProduct?.createdAt || new Date().toISOString(),

                  // Digital E-book Attributes
                  productType: productData.productType || (isDigitalFlag ? 'digital_ebook' : 'physical'),
                  isDigital: isDigitalFlag,
                  author: productData.author,
                  publisher: productData.publisher,
                  publicationYear: productData.publicationYear,
                  isbn: productData.isbn,
                  pdfUrl: productData.pdfUrl,
                  pdfFileName: productData.pdfFileName,
                  pdfFileSize: productData.pdfFileSize,
                };

                await saveProductToFirestore(finalProd);
                await loadData();
                setSaveSuccessMsg('Product document saved to Firestore successfully!');
                setTimeout(() => setSaveSuccessMsg(''), 4000);
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
              onCancel={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
              sellerId="nexovira-official"
              sellerName="NEXOVIRA Official"
              isAdmin={true}
            />
          </div>
        </div>
      )}

      {/* Edit/Create Tech Service Modal */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 my-8 text-xs text-left relative">
            <button
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Talent Marketplace Management</span>
              <h3 className="text-lg font-bold text-white">
                {editingService.id ? 'Edit Service Offering' : 'Add New Verified Expert / Service'}
              </h3>
            </div>

            <form onSubmit={handleSaveServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={editingService.title || ''}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  placeholder="e.g. Hire Senior Web Developer & React/Next.js Engineer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Publishing Status</label>
                  <select
                    value={editingService.status || 'published'}
                    onChange={(e) => setEditingService({ ...editingService, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="published">Published (Live in Marketplace)</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Starting Price (USD $)</label>
                  <input
                    type="number"
                    required
                    value={editingService.startingPrice || 0}
                    onChange={(e) => setEditingService({ ...editingService, startingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Provider / Specialist Name</label>
                  <input
                    type="text"
                    required
                    value={editingService.providerName || ''}
                    onChange={(e) => setEditingService({ ...editingService, providerName: e.target.value })}
                    placeholder="e.g. Samuel O. (Senior AI Engineer)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Location</label>
                  <input
                    type="text"
                    value={editingService.location || 'Lagos, Nigeria'}
                    onChange={(e) => setEditingService({ ...editingService, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <ImageUploadField
                  value={editingService.image || ''}
                  onChange={(url) => setEditingService({ ...editingService, image: url })}
                  label="Service Cover Banner"
                  helperText="Upload service banner image (16:9 recommended). JPG, PNG, WebP."
                  folder="services/covers"
                  aspectRatio="video"
                  required
                />
              </div>

              <div>
                <ImageUploadField
                  value={editingService.providerAvatar || ''}
                  onChange={(url) => setEditingService({ ...editingService, providerAvatar: url })}
                  label="Provider / Specialist Avatar Photo"
                  helperText="Upload provider headshot photo (square 1:1). JPG, PNG, WebP."
                  folder="services/providers"
                  aspectRatio="square"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Service Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Describe the deliverables, stack, and scope..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl"
                >
                  {serviceSaving ? 'Saving to Firestore...' : 'Publish Service Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Product Deletion Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Are you sure you want to delete this product?
                </h3>
                <p className="text-xs text-slate-400">
                  This action will securely verify ownership, archive the catalog entry, revoke digital licenses, and append an immutable entry in the security audit ledger.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-white line-clamp-1">{productToDelete.title}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Seller: <strong className="text-cyan-400 font-mono">{productToDelete.sellerId}</strong></span>
                <span>Type: <strong className="text-white">{productToDelete.isDigital ? 'Digital E-Book' : 'Physical Item'}</strong></span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">ID: {productToDelete.id}</div>
            </div>

            {deleteProductError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{deleteProductError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteProductError('');
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Deleting...</span>
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

      {/* Admin Category Deletion Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Delete Category
                </h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to remove this category?
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-white">{categoryToDelete.name}</div>
              <div className="text-[11px] text-slate-400">
                Products in this category: {products.filter(p => p.categoryId === categoryToDelete.id).length}
              </div>
            </div>

            {categoryError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {categoryError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={handleConfirmDeleteCategory}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingCategory ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Service Deletion Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Remove Verified Service
                </h3>
                <p className="text-xs text-slate-400">
                  This will immediately remove the service from all customer views.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-white line-clamp-1">{serviceToDelete.title}</div>
              <div className="text-[11px] text-slate-400">
                Provider: {serviceToDelete.providerName} • Category: {serviceToDelete.category}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingService}
                onClick={() => setServiceToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingService}
                onClick={handleConfirmDeleteService}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingService ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Escrow Order Deletion Confirmation Modal */}
      {escrowOrderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">
                  Remove Escrow Order
                </h3>
                <p className="text-xs text-slate-400">
                  Delete this escrow proposal/booking record.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-white line-clamp-1">{escrowOrderToDelete.serviceTitle || 'Escrow Order'}</div>
              <div className="text-[11px] text-slate-400">
                Client: {escrowOrderToDelete.clientName} ({escrowOrderToDelete.clientEmail})
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingEscrowOrder}
                onClick={() => setEscrowOrderToDelete(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingEscrowOrder}
                onClick={handleConfirmDeleteEscrowOrder}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingEscrowOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Remove</span>
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
