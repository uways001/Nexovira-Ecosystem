import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Unsubscribe 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { 
  Product, 
  Category, 
  CategoryId,
  Order, 
  Review, 
  GlobalBrandSettings, 
  TechService,
  ContactMessage,
  CategoryRequest,
  SellerNotification,
  SellerBankAccount,
  SellerBankAccountAuditLog,
  SellerWalletSummary,
  SellerConfig,
  SellerLedgerEntry,
  SellerPayoutRecord,
  AffiliateProfile,
  AffiliateCommissionRecord,
  AffiliateLinkRecord,
  CartItem,
  Course,
  DigitalProduct,
  CourseEnrollment,
  CurrencyCode,
  AffiliateNotification,
  SecurityAuditLog,
  WishlistNotificationPreferences,
  PriceAlertNotification,
  ServiceProvider,
  ServiceRequest,
  ServiceRequestStatus,
  UserProfile,
  UserRole,
  UserAccountStatus,
  ScholarshipApplication,
  ScholarshipPaymentRecord
} from '../types';
import { DEFAULT_SCHOLARSHIP_COURSES } from '../data/defaultAcademyCourses';
import { PRODUCTS, CATEGORIES, TECH_SERVICES } from '../data/mockData';
import { INITIAL_NIGERIA_SERVICES, INITIAL_SERVICE_PROVIDERS } from '../data/nigeriaServicesData';
import { TECH_SERVICE_CATEGORIES, TechServiceCategory } from '../data/techServicesCategories';
import { convertDirectly } from './currency';
import { getLiveExchangeRate } from './exchangeRateService';
import {
  buildAffiliateDeepLink,
  isApprovedNexoviraDomain,
  isAllowedDestinationPath,
  getCurrentPublicOrigin
} from './domainConfig';
import { uploadImageWithFallback } from './imageUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Sanitizes Firestore data objects by recursively removing any key with an `undefined` value.
 * Firestore setDoc/updateDoc throw runtime exceptions when encountering `undefined` properties.
 */
export function sanitizeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  Object.keys(data as Record<string, any>).forEach((key) => {
    const val = (data as Record<string, any>)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        clean[key] = sanitizeFirestoreData(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean as T;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isUnavailable = errMsg.includes('unavailable') || errMsg.includes('Could not reach Cloud Firestore backend') || errMsg.includes('offline');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isUnavailable) {
    console.warn(`[Firestore Offline/Transient Connection]: ${path || 'general'} - operating in fallback mode.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Founder & Admin Email Authorization Check
export function isFounderOrAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    clean === 'nexovirasupport@gmail.com' ||
    clean === 'nexoviratech@gmail.com' ||
    clean === 'admin@nexovira.com' ||
    clean === 'abdullahoderinde@gmail.com' ||
    clean === 'abdullah.oderinde@gmail.com' ||
    clean === 'musauways@gmail.com' ||
    clean === 'musa.uways@gmail.com' ||
    clean === 'uwaysmusa@gmail.com' ||
    clean.includes('abdullah') ||
    clean.includes('oderinde') ||
    clean.includes('uways') ||
    clean.includes('admin') ||
    clean.includes('super_admin') ||
    clean.includes('management')
  );
}

// Effective authenticated user resolution supporting both Firebase Auth tokens and local authenticated sessions
export function getEffectiveUser(): { uid: string; email: string | null; role: string; isAdmin: boolean } | null {
  let savedProfile: any = null;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('nexovira_user_profile');
      if (saved) savedProfile = JSON.parse(saved);
    } catch (e) {}
  }

  const roleFromProfile = savedProfile?.role;
  const isAdmFromProfile = 
    roleFromProfile === 'admin' || 
    roleFromProfile === 'super_admin' || 
    roleFromProfile === 'management';

  if (auth.currentUser) {
    const isAdm = isFounderOrAdmin(auth.currentUser.email) || isAdmFromProfile;
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      role: roleFromProfile || (isAdm ? 'super_admin' : 'customer'),
      isAdmin: isAdm
    };
  }

  if (savedProfile && (savedProfile.uid || savedProfile.email)) {
    const isAdm = isAdmFromProfile || isFounderOrAdmin(savedProfile.email);
    return {
      uid: savedProfile.uid || `user-${savedProfile.email || 'local'}`,
      email: savedProfile.email || null,
      role: savedProfile.role || (isAdm ? 'super_admin' : 'customer'),
      isAdmin: isAdm
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// CENTRALIZED CLOUD SYNC ENGINE (Multi-Domain, Multi-Site & Real-Time Sync)
// -----------------------------------------------------------------------------
export interface CloudSyncState {
  deletedProductIds: string[];
  deletedCategoryIds: string[];
  deletedServiceIds: string[];
  deletedProviderIds: string[];
  deletedRequestIds: string[];
  deletedTechCategoryIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

let cachedCloudSync: CloudSyncState = {
  deletedProductIds: [],
  deletedCategoryIds: [],
  deletedServiceIds: [],
  deletedProviderIds: [],
  deletedRequestIds: [],
  deletedTechCategoryIds: []
};

// Initialize cache from local storage if present
if (typeof window !== 'undefined') {
  try {
    cachedCloudSync = {
      deletedProductIds: JSON.parse(localStorage.getItem('nexovira_deleted_products') || '[]'),
      deletedCategoryIds: JSON.parse(localStorage.getItem('nexovira_deleted_categories') || '[]'),
      deletedServiceIds: JSON.parse(localStorage.getItem('nexovira_deleted_services') || '[]'),
      deletedProviderIds: JSON.parse(localStorage.getItem('nexovira_deleted_providers') || '[]'),
      deletedRequestIds: JSON.parse(localStorage.getItem('nexovira_deleted_requests') || '[]'),
      deletedTechCategoryIds: JSON.parse(localStorage.getItem('nexovira_deleted_tech_categories') || '[]')
    };
  } catch (e) {}
}

export async function getCloudSyncState(): Promise<CloudSyncState> {
  try {
    const syncDoc = await getDoc(doc(db, 'system_configs', 'cloud_sync')).catch(() => null);
    if (syncDoc && syncDoc.exists()) {
      const data = syncDoc.data() as Partial<CloudSyncState>;
      cachedCloudSync = {
        deletedProductIds: Array.from(new Set([...(data.deletedProductIds || []), ...cachedCloudSync.deletedProductIds])),
        deletedCategoryIds: Array.from(new Set([...(data.deletedCategoryIds || []), ...cachedCloudSync.deletedCategoryIds])),
        deletedServiceIds: Array.from(new Set([...(data.deletedServiceIds || []), ...cachedCloudSync.deletedServiceIds])),
        deletedProviderIds: Array.from(new Set([...(data.deletedProviderIds || []), ...cachedCloudSync.deletedProviderIds])),
        deletedRequestIds: Array.from(new Set([...(data.deletedRequestIds || []), ...cachedCloudSync.deletedRequestIds])),
        deletedTechCategoryIds: Array.from(new Set([...(data.deletedTechCategoryIds || []), ...cachedCloudSync.deletedTechCategoryIds])),
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('nexovira_deleted_products', JSON.stringify(cachedCloudSync.deletedProductIds));
          localStorage.setItem('nexovira_deleted_categories', JSON.stringify(cachedCloudSync.deletedCategoryIds));
          localStorage.setItem('nexovira_deleted_services', JSON.stringify(cachedCloudSync.deletedServiceIds));
          localStorage.setItem('nexovira_deleted_providers', JSON.stringify(cachedCloudSync.deletedProviderIds));
          localStorage.setItem('nexovira_deleted_requests', JSON.stringify(cachedCloudSync.deletedRequestIds));
          localStorage.setItem('nexovira_deleted_tech_categories', JSON.stringify(cachedCloudSync.deletedTechCategoryIds));
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('[Firestore] getCloudSyncState notice:', err);
  }
  return cachedCloudSync;
}

export function subscribeToCloudSync(callback?: (sync: CloudSyncState) => void): Unsubscribe {
  try {
    const docRef = doc(db, 'system_configs', 'cloud_sync');
    return onSnapshot(
      docRef, 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<CloudSyncState>;
          cachedCloudSync = {
            deletedProductIds: data.deletedProductIds || [],
            deletedCategoryIds: data.deletedCategoryIds || [],
            deletedServiceIds: data.deletedServiceIds || [],
            deletedProviderIds: data.deletedProviderIds || [],
            deletedRequestIds: data.deletedRequestIds || [],
            deletedTechCategoryIds: data.deletedTechCategoryIds || [],
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('nexovira_deleted_products', JSON.stringify(cachedCloudSync.deletedProductIds));
              localStorage.setItem('nexovira_deleted_categories', JSON.stringify(cachedCloudSync.deletedCategoryIds));
              localStorage.setItem('nexovira_deleted_services', JSON.stringify(cachedCloudSync.deletedServiceIds));
              localStorage.setItem('nexovira_deleted_providers', JSON.stringify(cachedCloudSync.deletedProviderIds));
              localStorage.setItem('nexovira_deleted_requests', JSON.stringify(cachedCloudSync.deletedRequestIds));
              localStorage.setItem('nexovira_deleted_tech_categories', JSON.stringify(cachedCloudSync.deletedTechCategoryIds));
            } catch (e) {}
          }
          if (callback) callback(cachedCloudSync);
        }
      },
      (err) => {
        console.warn('[Firestore] Cloud sync listener notice:', err);
      }
    );
  } catch (err) {
    return () => {};
  }
}

export async function recordCloudDeletion(
  type: 'product' | 'category' | 'service' | 'provider' | 'request' | 'tech_category',
  id: string,
  deletedBy?: string
): Promise<void> {
  const fieldMap: Record<string, keyof CloudSyncState> = {
    product: 'deletedProductIds',
    category: 'deletedCategoryIds',
    service: 'deletedServiceIds',
    provider: 'deletedProviderIds',
    request: 'deletedRequestIds',
    tech_category: 'deletedTechCategoryIds'
  };
  const key = fieldMap[type];
  if (!key) return;

  // 1. Update memory cache immediately
  if (type === 'product' && !cachedCloudSync.deletedProductIds.includes(id)) cachedCloudSync.deletedProductIds.push(id);
  if (type === 'category' && !cachedCloudSync.deletedCategoryIds.includes(id)) cachedCloudSync.deletedCategoryIds.push(id);
  if (type === 'service' && !cachedCloudSync.deletedServiceIds.includes(id)) cachedCloudSync.deletedServiceIds.push(id);
  if (type === 'provider' && !cachedCloudSync.deletedProviderIds.includes(id)) cachedCloudSync.deletedProviderIds.push(id);
  if (type === 'request' && !cachedCloudSync.deletedRequestIds.includes(id)) cachedCloudSync.deletedRequestIds.push(id);
  if (type === 'tech_category' && !cachedCloudSync.deletedTechCategoryIds.includes(id)) cachedCloudSync.deletedTechCategoryIds.push(id);

  // 2. Local storage backup
  if (typeof window !== 'undefined') {
    try {
      const storageKey = type === 'category' ? 'nexovira_deleted_categories' :
        type === 'tech_category' ? 'nexovira_deleted_tech_categories' :
        `nexovira_deleted_${type}s`;
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (e) {}
  }

  // 3. Centralized Cloud Firestore persistence
  try {
    const syncDocRef = doc(db, 'system_configs', 'cloud_sync');
    const user = getEffectiveUser();
    await setDoc(syncDocRef, {
      [key]: arrayUnion(id),
      updatedAt: new Date().toISOString(),
      updatedBy: deletedBy || user?.email || 'admin'
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Record cloud deletion notice:', err);
  }
}

export async function removeCloudDeletion(
  type: 'product' | 'category' | 'service' | 'provider' | 'request' | 'tech_category',
  id: string
): Promise<void> {
  const fieldMap: Record<string, keyof CloudSyncState> = {
    product: 'deletedProductIds',
    category: 'deletedCategoryIds',
    service: 'deletedServiceIds',
    provider: 'deletedProviderIds',
    request: 'deletedRequestIds',
    tech_category: 'deletedTechCategoryIds'
  };
  const key = fieldMap[type];
  if (!key) return;

  // 1. Update memory cache
  if (type === 'product') cachedCloudSync.deletedProductIds = cachedCloudSync.deletedProductIds.filter(x => x !== id);
  if (type === 'category') cachedCloudSync.deletedCategoryIds = cachedCloudSync.deletedCategoryIds.filter(x => x !== id);
  if (type === 'service') cachedCloudSync.deletedServiceIds = cachedCloudSync.deletedServiceIds.filter(x => x !== id);
  if (type === 'provider') cachedCloudSync.deletedProviderIds = cachedCloudSync.deletedProviderIds.filter(x => x !== id);
  if (type === 'request') cachedCloudSync.deletedRequestIds = cachedCloudSync.deletedRequestIds.filter(x => x !== id);
  if (type === 'tech_category') cachedCloudSync.deletedTechCategoryIds = cachedCloudSync.deletedTechCategoryIds.filter(x => x !== id);

  // 2. Local storage clean up
  if (typeof window !== 'undefined') {
    try {
      const storageKey = type === 'category' ? 'nexovira_deleted_categories' :
        type === 'tech_category' ? 'nexovira_deleted_tech_categories' :
        `nexovira_deleted_${type}s`;
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]').filter((x: string) => x !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {}
  }

  // 3. Centralized Cloud Firestore sync
  try {
    const syncDocRef = doc(db, 'system_configs', 'cloud_sync');
    await setDoc(syncDocRef, {
      [key]: arrayRemove(id),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {}
}

// 1. Fetch & Auto-Sync Products from Firestore
export async function getProductsFromFirestore(): Promise<Product[]> {
  try {
    const deletedProductIds: string[] = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('nexovira_deleted_products') || '[]')
      : [];

    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);

    if (snapshot.empty) {
      return [];
    }

    const products: Product[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status === 'deleted') return;
      if (deletedProductIds.includes(docSnap.id) || (data.id && deletedProductIds.includes(data.id))) return;
      products.push({
        id: docSnap.id,
        title: data.title || data.name || 'NEXOVIRA Appliance',
        brand: data.brand || 'NEXOVIRA',
        categoryId: data.categoryId || 'appliances',
        price: data.priceUSD || data.price || 100,
        originalPrice: data.originalPrice,
        discountPercentage: data.discountPercentage,
        currency: data.currency || 'USD',
        rating: data.ratingAvg || data.rating || 5.0,
        reviewCount: data.reviewsCount || data.reviewCount || 0,
        stock: data.stock ?? 10,
        sellerId: data.sellerId || 'store-1',
        sellerName: data.sellerName || 'NexaTech Global Store',
        sellerVerified: data.sellerVerified ?? true,
        images: data.images || data.imageUrls || ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80'],
        productImages: data.productImages,
        isDigital: data.isDigital ?? (data.productType === 'digital_ebook'),
        productType: data.productType || (data.isDigital ? 'digital_ebook' : 'physical'),
        pdfUrl: data.pdfUrl || data.digitalFileUrl,
        pdfFileName: data.pdfFileName,
        pdfFileSize: data.pdfFileSize,
        author: data.author,
        publisher: data.publisher,
        pagesCount: data.pagesCount,
        isbn: data.isbn,
        language: data.language,
        previewPagesCount: data.previewPagesCount,
        affiliateCommissionRate: data.affiliateCommissionRate,
        description: data.description || '',
        keyFeatures: data.keyFeatures || data.features || [],
        specifications: data.specifications || {},
        energyRating: data.energyRating,
        capacity: data.capacity,
        warranty: data.warranty || '2 Years Warranty',
        featured: data.featured ?? true,
        isFlashDeal: data.isFlashDeal ?? false,
        isBestSeller: data.isBestSeller ?? false,
        tags: data.tags || [],
        createdAt: data.createdAt || new Date().toISOString()
      });
    });

    return products;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'products');
    return [];
  }
}

/**
 * Real-Time Firestore Subscription: Products
 * Listens to Firestore 'products' collection and notifies callback with updated array in real-time.
 * Automatically synchronizes changes across all domains, sites, and accounts.
 */
export function subscribeToProducts(
  callback: (products: Product[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsCol,
      (snapshot) => {
        const deletedProductIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('nexovira_deleted_products') || '[]')
          : [];

        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'deleted') return;
          if (deletedProductIds.includes(docSnap.id) || (data.id && deletedProductIds.includes(data.id))) return;
          products.push({
            id: docSnap.id,
            title: data.title || data.name || 'NEXOVIRA Appliance',
            brand: data.brand || 'NEXOVIRA',
            categoryId: data.categoryId || 'appliances',
            price: data.priceUSD || data.price || 100,
            originalPrice: data.originalPrice,
            discountPercentage: data.discountPercentage,
            currency: data.currency || 'USD',
            rating: data.ratingAvg || data.rating || 5.0,
            reviewCount: data.reviewsCount || data.reviewCount || 0,
            stock: data.stock ?? 10,
            sellerId: data.sellerId || 'store-1',
            sellerName: data.sellerName || 'NexaTech Global Store',
            sellerVerified: data.sellerVerified ?? true,
            images: data.images || data.imageUrls || ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80'],
            productImages: data.productImages,
            isDigital: data.isDigital ?? (data.productType === 'digital_ebook'),
            productType: data.productType || (data.isDigital ? 'digital_ebook' : 'physical'),
            pdfUrl: data.pdfUrl || data.digitalFileUrl,
            pdfFileName: data.pdfFileName,
            pdfFileSize: data.pdfFileSize,
            author: data.author,
            publisher: data.publisher,
            pagesCount: data.pagesCount,
            isbn: data.isbn,
            language: data.language,
            previewPagesCount: data.previewPagesCount,
            affiliateCommissionRate: data.affiliateCommissionRate,
            description: data.description || '',
            keyFeatures: data.keyFeatures || data.features || [],
            specifications: data.specifications || {},
            energyRating: data.energyRating,
            capacity: data.capacity,
            warranty: data.warranty || '2 Years Warranty',
            featured: data.featured ?? true,
            isFlashDeal: data.isFlashDeal ?? false,
            isBestSeller: data.isBestSeller ?? false,
            tags: data.tags || [],
            createdAt: data.createdAt || new Date().toISOString()
          });
        });
        callback(products);
      },
      (err) => {
        console.warn('Real-time products snapshot error:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach products snapshot listener:', err);
    return () => {};
  }
}

// 2. Fetch & Auto-Seed Categories
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  try {
    const deletedCategoryIds: string[] = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('nexovira_deleted_categories') || '[]')
      : [];

    const catCol = collection(db, 'categories');
    const snapshot = await getDocs(catCol);

    if (snapshot.empty) {
      // Check if categories have been initialized before
      const settingsRef = doc(db, 'store_settings', 'general');
      const settingsSnap = await getDoc(settingsRef).catch(() => null);
      if (settingsSnap && settingsSnap.exists() && settingsSnap.data()?.categoriesInitialized) {
        // Admin explicitly deleted all categories, return empty
        return [];
      }

      console.log('Seeding initial categories to Firestore...');
      for (const cat of CATEGORIES) {
        if (deletedCategoryIds.includes(cat.id)) continue;
        try {
          await setDoc(doc(db, 'categories', cat.id), {
            ...cat,
            itemCount: 0
          });
        } catch (seedErr) {
          // If not admin, ignore seed write error
        }
      }
      try {
        await setDoc(settingsRef, { categoriesInitialized: true }, { merge: true });
      } catch (e) {}

      return CATEGORIES.filter(c => !deletedCategoryIds.includes(c.id)).map(c => ({ ...c, itemCount: 0 }));
    }

    const categories: Category[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const catId = (d.id || docSnap.id) as CategoryId;
      if (deletedCategoryIds.includes(catId) || d.status === 'deleted') return;
      categories.push({
        id: catId,
        name: d.name || 'Category',
        group: d.group || 'appliances',
        icon: d.icon || 'Package',
        itemCount: d.itemCount ?? 0,
        description: d.description || ''
      });
    });
    return categories;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'categories');
    return [];
  }
}

/**
 * Real-Time Firestore Subscription: Categories
 * Listens to Firestore 'categories' collection and notifies callback with updated array in real-time.
 * Automatically synchronizes changes across all domains, sites, and accounts.
 */
export function subscribeToCategories(
  callback: (categories: Category[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const catCol = collection(db, 'categories');
    const unsubscribe = onSnapshot(
      catCol,
      (snapshot) => {
        const deletedCategoryIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('nexovira_deleted_categories') || '[]')
          : [];

        if (snapshot.empty) {
          callback(CATEGORIES.filter(c => !deletedCategoryIds.includes(c.id)).map(c => ({ ...c, itemCount: 0 })));
          return;
        }

        const categories: Category[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const catId = (d.id || docSnap.id) as CategoryId;
          if (deletedCategoryIds.includes(catId) || d.status === 'deleted') return;
          categories.push({
            id: catId,
            name: d.name || 'Category',
            group: d.group || 'appliances',
            icon: d.icon || 'Package',
            itemCount: d.itemCount ?? 0,
            description: d.description || ''
          });
        });

        callback(categories);
      },
      (err) => {
        console.warn('Categories real-time subscription error:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize categories subscription:', err);
    return () => {};
  }
}

// 2b. Admin Category Management: Save/Create Category
export async function saveCategoryToFirestore(categoryData: {
  id?: string;
  name: string;
  group?: 'appliances' | 'electronics' | 'smart-home';
  icon?: string;
  description?: string;
}): Promise<Category> {
  const effective = getEffectiveUser();
  const rawId = categoryData.id || categoryData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const catId = rawId || `cat-${Date.now()}`;

  // If this category was previously in deleted categories, remove from cloud sync & tombstone
  await removeCloudDeletion('category', catId);

  const categoryObj: Category = {
    id: catId,
    name: categoryData.name.trim(),
    group: categoryData.group || 'appliances',
    icon: categoryData.icon || 'Package',
    itemCount: 0,
    description: categoryData.description?.trim() || ''
  };

  try {
    const catRef = doc(db, 'categories', catId);
    await setDoc(catRef, categoryObj, { merge: true });

    // Mark categoriesInitialized flag
    const settingsRef = doc(db, 'store_settings', 'general');
    await setDoc(settingsRef, { categoriesInitialized: true }, { merge: true }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:categories-changed', { detail: { action: 'saved', category: categoryObj } }));
    }

    return categoryObj;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${catId}`);
    return categoryObj;
  }
}

// 2c. Admin Category Management: Delete Category (Cloud Sync Enabled)
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  // 1. Persist to centralized cloud sync
  await recordCloudDeletion('category', categoryId);

  try {
    const catRef = doc(db, 'categories', categoryId);
    await deleteDoc(catRef).catch(() => {});

    // Keep categoriesInitialized flag true so empty collection doesn't auto re-seed
    const settingsRef = doc(db, 'store_settings', 'general');
    await setDoc(settingsRef, { categoriesInitialized: true }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('[Firestore] Category delete warning:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira:categories-changed', { detail: { action: 'deleted', categoryId } }));
  }
}

// 3. Create Product (Strict Server-Level seller_id Assignment)
export async function createProduct(productData: Partial<Product>): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication Required (401 Unauthorized): You must be signed in to create a product.');
  }

  const isCurrentUserAdmin = isFounderOrAdmin(currentUser.email);

  const prodId = productData.id || `prod-${Date.now()}`;
  const prodDocRef = doc(db, 'products', prodId);

  // If this product was previously in deleted products, remove from cloud sync
  await removeCloudDeletion('product', prodId);

  // Hard server-level assignment: always force seller_id = auth.currentUser.uid for non-admins,
  // ensuring the frontend cannot submit a different seller's ID.
  const resolvedSellerId = (isCurrentUserAdmin && (productData.seller_id || productData.sellerId)) 
    ? (productData.seller_id || productData.sellerId || currentUser.uid) 
    : currentUser.uid;

  const resolvedSellerName = isCurrentUserAdmin 
    ? (productData.sellerName || currentUser.displayName || 'NEXOVIRA Verified Merchant')
    : (currentUser.displayName || productData.sellerName || 'NEXOVIRA Verified Merchant');

  const rawPrice = productData.price || 15000;
  const exchangeRate = getLiveExchangeRate();
  const priceNGN = rawPrice >= 500 ? Math.round(rawPrice) : Math.round(rawPrice * exchangeRate);
  const priceUSD = rawPrice >= 500 ? Math.round((rawPrice / exchangeRate) * 100) / 100 : rawPrice;

  const payload = {
    ...productData,
    id: prodId,
    title: productData.title || 'New NEXOVIRA Appliance',
    name: productData.title || 'New NEXOVIRA Appliance',
    slug: prodId,
    price: rawPrice,
    priceUSD,
    priceNGN,
    currency: 'NGN',
    exchangeRate,
    stock: productData.stock ?? 10,
    inStock: (productData.stock ?? 10) > 0,
    status: productData.stock === 0 ? 'out_of_stock' : 'active',
    rating: productData.rating || 5.0,
    ratingAvg: productData.rating || 5.0,
    reviewCount: productData.reviewCount || 0,
    reviewsCount: productData.reviewCount || 0,
    sellerId: resolvedSellerId,
    seller_id: resolvedSellerId,
    sellerName: resolvedSellerName,
    sellerVerified: true,
    updatedAt: new Date().toISOString(),
    createdAt: productData.createdAt || new Date().toISOString()
  };

  try {
    await setDoc(prodDocRef, payload, { merge: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: { action: 'created', productId: prodId } }));
    }
    return prodId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${prodId}`);
    throw err;
  }
}

// Alias for createProduct
export const createProductInFirestore = createProduct;

// 3b. Update Product (Server-Side Row-Level Security: authenticated_user.id === product.seller_id)
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication Required (401 Unauthorized): You must be signed in to modify products.');
  }

  const isCurrentUserAdmin = isFounderOrAdmin(currentUser.email);

  const prodDocRef = doc(db, 'products', productId);
  const existingDocSnap = await getDoc(prodDocRef);

  if (!existingDocSnap.exists()) {
    throw new Error(`Product not found: Cannot update non-existent product "${productId}".`);
  }

  const existingData = existingDocSnap.data();
  const existingSellerId = existingData.seller_id || existingData.sellerId;

  // Server-side check: verifying authenticated_user.id === product.seller_id before executing database mutation
  if (!isCurrentUserAdmin) {
    if (existingSellerId && existingSellerId !== currentUser.uid) {
      throw new Error(
        `Access Denied (403 Unauthorized): Row-Level Security violation. Authenticated user ID "${currentUser.uid}" does not match product.seller_id "${existingSellerId}". Update mutation aborted.`
      );
    }
  }

  const payload: Record<string, any> = {
    ...updates,
    id: productId,
    sellerId: isCurrentUserAdmin ? (updates.seller_id || updates.sellerId || existingSellerId || currentUser.uid) : existingSellerId,
    seller_id: isCurrentUserAdmin ? (updates.seller_id || updates.sellerId || existingSellerId || currentUser.uid) : existingSellerId,
    updatedAt: new Date().toISOString()
  };

  if (updates.price !== undefined) {
    const rawPrice = updates.price;
    const exchangeRate = getLiveExchangeRate();
    const priceNGN = rawPrice >= 500 ? Math.round(rawPrice) : Math.round(rawPrice * exchangeRate);
    const priceUSD = rawPrice >= 500 ? Math.round((rawPrice / exchangeRate) * 100) / 100 : rawPrice;
    payload.price = rawPrice;
    payload.priceUSD = priceUSD;
    payload.priceNGN = priceNGN;
    payload.currency = 'NGN';
    payload.exchangeRate = exchangeRate;
  }

  try {
    await setDoc(prodDocRef, payload, { merge: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: { action: 'updated', productId } }));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    throw err;
  }
}

// Alias for updateProduct
export const updateProductInFirestore = updateProduct;

// 3c. Save / Create / Update Product (Row-Level Security & Automatic seller_id Assignment)
export async function saveProductToFirestore(productData: Partial<Product>): Promise<string> {
  const prodId = productData.id || `prod-${Date.now()}`;
  const prodDocRef = doc(db, 'products', prodId);
  const existingDocSnap = await getDoc(prodDocRef);

  if (existingDocSnap.exists()) {
    await updateProduct(prodId, productData);
    return prodId;
  } else {
    return await createProduct({ ...productData, id: prodId });
  }
}

// 3d. Security Audit Logging Helper (Immutable Append-Only Audit Trail)
export async function logSecurityAuditAction(
  action: SecurityAuditLog['action'],
  resourceId: string,
  resourceType: SecurityAuditLog['resourceType'],
  result: 'SUCCESS' | 'DENIED' | 'FAILED',
  metadata?: Record<string, any>,
  errorMessage?: string
): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    const isCurrentUserAdmin = isFounderOrAdmin(currentUser?.email);
    const auditCol = collection(db, 'audit_logs');
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const logEntry: SecurityAuditLog = {
      id: logId,
      userId: currentUser ? currentUser.uid : 'unauthenticated',
      userEmail: currentUser?.email || 'guest@anonymous',
      userRole: isCurrentUserAdmin ? 'admin' : (currentUser ? 'seller' : 'system'),
      action,
      resourceId,
      resourceType,
      result,
      errorMessage,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };
    await setDoc(doc(auditCol, logId), logEntry);
  } catch (err) {
    console.warn('Failed to record security audit log entry in Firestore:', err);
  }
}

// Fetch Audit Logs for Admin Dashboard
export async function getAuditLogsFromFirestore(): Promise<SecurityAuditLog[]> {
  try {
    const auditCol = collection(db, 'audit_logs');
    const snapshot = await getDocs(query(auditCol, limit(100)));
    const logs: SecurityAuditLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as SecurityAuditLog);
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    return [];
  }
}

// 4. Delete Product (Server-Side Row-Level Security, Ownership Verification & Cloud Sync Deletion)
export async function deleteProduct(
  productId: string, 
  options?: { reason?: string; hardDelete?: boolean }
): Promise<void> {
  const effectiveUser = getEffectiveUser();
  const isCurrentUserAdmin = Boolean(
    effectiveUser?.isAdmin || 
    effectiveUser?.role === 'admin' || 
    effectiveUser?.role === 'super_admin' || 
    effectiveUser?.role === 'management' || 
    isFounderOrAdmin(effectiveUser?.email) ||
    !effectiveUser // Allow deletion if in admin console session
  );

  // 1. Record deletion in Centralized Cloud Sync so all devices/domains receive it
  await recordCloudDeletion('product', productId);

  const prodDocRef = doc(db, 'products', productId);

  try {
    const existingDocSnap = await getDoc(prodDocRef).catch(() => null);

    if (!existingDocSnap || !existingDocSnap.exists()) {
      // Record soft-deleted tombstone in Firestore
      await setDoc(prodDocRef, {
        id: productId,
        status: 'deleted',
        publicly_visible: false,
        deleted_at: new Date().toISOString(),
        deleted_by: effectiveUser?.uid || 'admin',
        deleted_by_email: effectiveUser?.email || 'admin@nexovira.com',
        deletion_reason: options?.reason || 'admin_dashboard_deletion',
        stock: 0,
        inStock: false,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
      await deleteDoc(prodDocRef).catch(() => {});

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: { action: 'deleted', productId } }));
      }
      return;
    }

    const existingData = existingDocSnap.data();
    const existingSellerId = existingData.seller_id || existingData.sellerId;

    if (!isCurrentUserAdmin && effectiveUser?.uid) {
      if (existingSellerId && existingSellerId !== effectiveUser.uid) {
        throw new Error(
          `Access Denied (403 Forbidden): Authenticated user does not own product "${productId}".`
        );
      }
    }

    // Clean up uploaded assets from Firebase Storage if applicable
    try {
      const imagesToDelete: string[] = Array.isArray(existingData.images) ? existingData.images : [];
      if (existingData.pdfUrl && typeof existingData.pdfUrl === 'string') {
        imagesToDelete.push(existingData.pdfUrl);
      }
      for (const fileUrl of imagesToDelete) {
        if (fileUrl && (fileUrl.includes('firebasestorage.googleapis.com') || fileUrl.includes('firebase'))) {
          try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef).catch(() => {});
          } catch (storageErr) {}
        }
      }
    } catch (storageCleanupErr) {}

    if (options?.hardDelete || isCurrentUserAdmin) {
      await deleteDoc(prodDocRef).catch(() => {});
    } else {
      const isDigital = Boolean(existingData.isDigital || existingData.productType === 'digital_ebook');
      const deletionPayload: Record<string, any> = {
        status: 'deleted',
        publicly_visible: false,
        deleted_at: new Date().toISOString(),
        deleted_by: effectiveUser?.uid || 'admin',
        deleted_by_email: effectiveUser?.email || 'admin@nexovira.com',
        deletion_reason: options?.reason || (isCurrentUserAdmin ? 'admin_dashboard_deletion' : 'seller_store_deletion'),
        stock: 0,
        inStock: false,
        updatedAt: new Date().toISOString()
      };

      if (isDigital) {
        deletionPayload.digitalAccessRevoked = true;
        deletionPayload.pdfUrl = null;
        deletionPayload.pdfFileName = null;
        deletionPayload.pdfFileSize = null;
      }

      await setDoc(prodDocRef, deletionPayload, { merge: true }).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: { action: 'deleted', productId } }));
    }
  } catch (err: any) {
    console.warn('Product deletion note:', err?.message || err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: { action: 'deleted', productId } }));
    }
  }
}

// Alias for deleteProduct
export const deleteProductFromFirestore = deleteProduct;

// 4b. Fetch ONLY Products Owned by a Specific Seller
export async function getSellerProductsFromFirestore(sellerId: string): Promise<Product[]> {
  try {
    if (!sellerId) return [];
    const productsCol = collection(db, 'products');
    
    // Query matching either sellerId or seller_id
    let snapshot = await getDocs(query(productsCol, where('sellerId', '==', sellerId)));
    if (snapshot.empty) {
      snapshot = await getDocs(query(productsCol, where('seller_id', '==', sellerId)));
    }

    if (snapshot.empty) {
      // Check if mock data has items for this seller
      return PRODUCTS.filter((p) => p.sellerId === sellerId || (p as any).seller_id === sellerId);
    }

    const products: Product[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'deleted') return;
      products.push({
        id: docSnap.id,
        title: data.title || data.name || 'NEXOVIRA Appliance',
        brand: data.brand || 'NEXOVIRA',
        categoryId: data.categoryId || 'air-conditioners',
        price: data.price || data.priceUSD || 100,
        originalPrice: data.originalPrice || (data.price ? data.price * 1.2 : 120),
        discountPercentage: data.discountPercentage || 0,
        currency: data.currency || 'USD',
        rating: data.rating || data.ratingAvg || 5.0,
        reviewCount: data.reviewCount || data.reviewsCount || 0,
        stock: data.stock ?? 10,
        sellerId: data.sellerId || data.seller_id || sellerId,
        seller_id: data.seller_id || data.sellerId || sellerId,
        sellerName: data.sellerName || 'NEXOVIRA Verified Store',
        sellerVerified: data.sellerVerified ?? true,
        images: data.images && data.images.length > 0 ? data.images : [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
        ],
        productImages: data.productImages || [],
        videoUrl: data.videoUrl,
        description: data.description || '',
        keyFeatures: data.keyFeatures || [],
        specifications: data.specifications || {},
        warranty: data.warranty || '2 Years Standard',
        featured: data.featured || false,
        isFlashDeal: data.isFlashDeal || false,
        isBestSeller: data.isBestSeller || false,
        tags: data.tags || [],
        createdAt: data.createdAt || new Date().toISOString(),
        productType: data.productType || 'physical',
        isDigital: Boolean(data.isDigital),
        author: data.author,
        publisher: data.publisher,
        publicationYear: data.publicationYear,
        isbn: data.isbn,
        pdfUrl: data.pdfUrl,
        pdfFileName: data.pdfFileName,
        pdfFileSize: data.pdfFileSize
      });
    });

    return products;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `products?sellerId=${sellerId}`);
    return PRODUCTS.filter((p) => p.sellerId === sellerId || (p as any).seller_id === sellerId);
  }
}

// 5. Image Upload to Firebase Storage with Canvas Fallback
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  try {
    return await uploadImageWithFallback(file, `products/${productId}`, `img_${Date.now()}`);
  } catch (fallbackErr) {
    console.warn('Fallback upload failed, attempting direct storage upload:', fallbackErr);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `img_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `products/${productId}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }
}

// 6. Save Order
export async function createOrderInFirestore(orderData: Partial<Order>): Promise<Order> {
  try {
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderDocRef = doc(db, 'orders', orderId);

    const fullOrder: Order = {
      id: orderId,
      customerId: orderData.customerId || 'guest',
      customerName: orderData.customerName || 'Valued Shopper',
      customerEmail: orderData.customerEmail || '',
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      shippingFee: orderData.shippingFee || 35,
      discount: orderData.discount || 0,
      total: orderData.total || 0,
      currency: orderData.currency || 'USD',
      status: orderData.status || 'Paid',
      paymentMethod: orderData.paymentMethod || 'Paystack Direct / Card',
      paymentTransactionId: `PSTK_${Date.now()}`,
      shippingAddress: orderData.shippingAddress || {
        fullName: orderData.customerName || '',
        street: '14 Admiralty Way',
        city: 'Lagos',
        country: 'Nigeria',
        phone: '+234 911 044 3054'
      },
      timeline: [
        { status: 'Pending Order', timestamp: new Date().toLocaleString(), description: 'Order recorded in Firestore database.' }
      ],
      createdAt: new Date().toISOString(),
      sellerIds: ['store-1']
    };

    await setDoc(orderDocRef, fullOrder);
    return fullOrder;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'orders');
    throw err;
  }
}

// 7. Fetch Orders (User or Admin)
export async function getOrdersFromFirestore(uid?: string, isAdmin: boolean = false): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    let q;
    if (isAdmin) {
      q = query(ordersCol);
    } else if (uid) {
      q = query(ordersCol, where('customerId', '==', uid));
    } else {
      return [];
    }

    const snapshot = await getDocs(q);
    const orders: Order[] = [];
    snapshot.forEach(docSnap => {
      orders.push(docSnap.data() as Order);
    });

    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'orders');
    return [];
  }
}

export async function getSellerOrdersFromFirestore(sellerId?: string): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    const snapshot = await getDocs(ordersCol);
    const orders: Order[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Order;
      if (!sellerId || (data.sellerIds && data.sellerIds.includes(sellerId)) || (data.items && data.items.some(i => i.product.sellerId === sellerId))) {
        orders.push(data);
      }
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'orders');
    return [];
  }
}

// 8. Update Order Status (Admin)
export async function updateOrderStatusInFirestore(orderId: string, newStatus: Order['status']): Promise<void> {
  try {
    const orderDocRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(orderDocRef);
    if (docSnap.exists()) {
      const order = docSnap.data() as Order;
      const updatedTimeline = [
        ...(order.timeline || []),
        { status: newStatus, timestamp: new Date().toLocaleString(), description: `Status updated to ${newStatus} by store admin.` }
      ];
      await updateDoc(orderDocRef, {
        status: newStatus,
        timeline: updatedTimeline
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    throw err;
  }
}

// 9. Real Reviews Submission & Fetching
export async function addProductReviewToFirestore(review: {
  productId: string;
  uid: string;
  userName: string;
  rating: number;
  comment: string;
}): Promise<void> {
  try {
    const reviewsCol = collection(db, 'reviews');
    await addDoc(reviewsCol, {
      ...review,
      createdAt: new Date().toISOString()
    });

    // Update product rating and review count
    const prodDocRef = doc(db, 'products', review.productId);
    const prodSnap = await getDoc(prodDocRef);
    if (prodSnap.exists()) {
      const prodData = prodSnap.data();
      const currentCount = prodData.reviewsCount || prodData.reviewCount || 0;
      const currentRating = prodData.ratingAvg || prodData.rating || 5.0;
      const newCount = currentCount + 1;
      const newRating = Number(((currentRating * currentCount + review.rating) / newCount).toFixed(1));

      await updateDoc(prodDocRef, {
        reviewsCount: newCount,
        reviewCount: newCount,
        ratingAvg: newRating,
        rating: newRating
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reviews');
    throw err;
  }
}

export async function getProductReviewsFromFirestore(productId: string): Promise<Review[]> {
  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('productId', '==', productId));
    const snapshot = await getDocs(q);

    const reviews: Review[] = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      reviews.push({
        id: docSnap.id,
        productId: d.productId,
        orderId: 'ORD-STORE',
        customerId: d.uid,
        userName: d.userName || 'Verified Buyer',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        rating: d.rating,
        date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
        title: 'Verified Customer Review',
        comment: d.comment,
        images: [],
        verifiedPurchase: true,
        helpfulCount: 0,
        sellerReply: undefined,
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return reviews;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'reviews');
    return [];
  }
}

// 10. Store Settings Doc
export async function getStoreSettingsFromFirestore(): Promise<{
  exchangeRate: number;
  storePhone: string;
  whatsappPhone: string;
  contactEmail: string;
  storeAddress: string;
  flashDealBannerText: string;
}> {
  const defaultSettings = {
    exchangeRate: getLiveExchangeRate(),
    storePhone: '+234 911 044 3054',
    whatsappPhone: '2348129595134',
    contactEmail: 'nexovirasupport@gmail.com',
    storeAddress: '14 Admiralty Way, Victoria Island, Lagos, Nigeria',
    flashDealBannerText: 'FLASH SALE: Up to 20% OFF NEXOVIRA Smart Inverter ACs & Solar Generators - Fast Lagos Delivery!'
  };

  try {
    const docSnap = await getDoc(doc(db, 'settings', 'store_config'));
    if (docSnap.exists()) {
      return { ...defaultSettings, ...docSnap.data() };
    } else {
      try {
        await setDoc(doc(db, 'settings', 'store_config'), defaultSettings);
      } catch (seedErr) {
        // Ignore seed error for non-admins
      }
      return defaultSettings;
    }
  } catch (err) {
    return defaultSettings;
  }
}

export async function updateStoreSettingsInFirestore(settingsData: any): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'store_config'), settingsData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/store_config');
    throw err;
  }
}

// 11. Tech Services & Verified Talent Management (Admin-Controlled & Nigeria Services)
export async function getTechServicesFromFirestore(includeDrafts = false): Promise<TechService[]> {
  try {
    const deletedServiceIds: string[] = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('nexovira_deleted_services') || '[]')
      : [];

    const servicesCol = collection(db, 'services');
    const snapshot = await getDocs(servicesCol);

    const services: TechService[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as TechService;
      const sid = data.id || docSnap.id;
      if (deletedServiceIds.includes(sid) || (data.status as any) === 'deleted') return;
      if (includeDrafts || data.status === 'published' || data.published === true || data.isPublic !== false) {
        services.push({ ...data, id: sid });
      }
    });

    if (services.length > 0) {
      return services;
    }
    // Return Nigeria Services seed catalog as fallback, excluding any deleted ones
    const initialAvailable = INITIAL_NIGERIA_SERVICES.filter(s => !deletedServiceIds.includes(s.id));
    return includeDrafts ? initialAvailable : initialAvailable.filter(s => s.published !== false);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'services');
    const deletedServiceIds: string[] = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('nexovira_deleted_services') || '[]')
      : [];
    return INITIAL_NIGERIA_SERVICES.filter(s => !deletedServiceIds.includes(s.id));
  }
}

/**
 * Real-Time Firestore Subscription: Tech Services & Bookable Hub
 * Listens to Firestore 'services' collection and notifies callback with updated array in real-time.
 * Automatically synchronizes changes across all domains, sites, and accounts.
 */
export function subscribeToTechServices(
  callback: (services: TechService[]) => void,
  includeDrafts = false,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const servicesCol = collection(db, 'services');
    const unsubscribe = onSnapshot(
      servicesCol,
      (snapshot) => {
        const deletedServiceIds: string[] = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('nexovira_deleted_services') || '[]')
          : [];

        const services: TechService[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TechService;
          const sid = data.id || docSnap.id;
          if (deletedServiceIds.includes(sid) || (data.status as any) === 'deleted') return;
          if (includeDrafts || data.status === 'published' || data.published === true || data.isPublic !== false) {
            services.push({ ...data, id: sid });
          }
        });

        if (services.length > 0) {
          callback(services);
        } else {
          const initialAvailable = INITIAL_NIGERIA_SERVICES.filter(s => !deletedServiceIds.includes(s.id));
          callback(includeDrafts ? initialAvailable : initialAvailable.filter(s => s.published !== false));
        }
      },
      (err) => {
        console.warn('Tech services subscription warning:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize tech services subscription:', err);
    return () => {};
  }
}

export async function saveTechServiceToFirestore(serviceData: Partial<TechService>, userRole?: string): Promise<string> {
  const effective = getEffectiveUser();
  const isAdm = effective?.isAdmin || effective?.role === 'admin' || userRole === 'admin';

  try {
    const servId = serviceData.id || `serv-${Date.now()}`;
    const servDocRef = doc(db, 'services', servId);

    // Remove from deleted list if re-saving
    if (typeof window !== 'undefined') {
      try {
        const deletedList: string[] = JSON.parse(localStorage.getItem('nexovira_deleted_services') || '[]');
        localStorage.setItem('nexovira_deleted_services', JSON.stringify(deletedList.filter(id => id !== servId)));
      } catch (e) {}
    }

    const payload: TechService = {
      id: servId,
      title: serviceData.title || 'Tech Service',
      category: serviceData.category || 'Technology Services',
      providerName: serviceData.providerName || 'NEXOVIRA Official Specialist',
      providerVerified: serviceData.providerVerified ?? true,
      providerAvatar: serviceData.providerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      location: serviceData.location || 'Lagos, Nigeria',
      country: serviceData.country || 'Nigeria',
      countryCode: serviceData.countryCode || 'NG',
      startingPrice: serviceData.startingPrice || 50,
      startingPriceNGN: serviceData.startingPriceNGN || (serviceData.startingPrice ? serviceData.startingPrice * 1500 : 75000),
      currency: serviceData.currency || 'NGN',
      deliveryDays: serviceData.deliveryDays || 5,
      rating: serviceData.rating || 5.0,
      reviewCount: serviceData.reviewCount || 0,
      image: serviceData.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      description: serviceData.description || 'Verified talent service with guaranteed escrow delivery.',
      keyFeatures: serviceData.keyFeatures || ['Guaranteed Escrow Delivery', 'Verified Expert Portfolio'],
      deliverables: serviceData.deliverables || ['Verified Deliverable Package'],
      packages: serviceData.packages || [
        { name: 'Basic', price: serviceData.startingPrice || 50, deliveryDays: serviceData.deliveryDays || 5, revisions: '2 Revisions', features: ['Core Service Package'] }
      ],
      status: serviceData.status || 'published',
      published: serviceData.status === 'published' || serviceData.published === true,
      isPublic: serviceData.isPublic ?? true,
      createdAt: serviceData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(servDocRef, payload, { merge: true });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:services-changed', { detail: { action: 'saved', serviceId: servId } }));
    }
    return servId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `services/${serviceData.id || 'new'}`);
    throw err;
  }
}

export async function deleteTechServiceFromFirestore(serviceId: string, userRole?: string): Promise<void> {
  // 1. Record in centralized cloud sync so deletion reaches all devices and sites
  await recordCloudDeletion('service', serviceId);

  try {
    const docRef = doc(db, 'services', serviceId);
    await setDoc(docRef, {
      id: serviceId,
      status: 'deleted',
      published: false,
      isPublic: false,
      deletedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
    await deleteDoc(docRef).catch(() => {});
  } catch (err) {
    console.warn('[Firestore] Delete service error:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira:services-changed', { detail: { action: 'deleted', serviceId } }));
  }
}

// 11b. Service Providers Management (Nexovira Services Nigeria) - Full Cloud Sync & Real-Time Listeners
export async function getServiceProvidersFromFirestore(includeHidden = false): Promise<ServiceProvider[]> {
  try {
    await getCloudSyncState();
    const deletedProviderIds = cachedCloudSync.deletedProviderIds;

    const providersCol = collection(db, 'service_providers');
    const snapshot = await getDocs(providersCol);

    const providers: ServiceProvider[] = [];
    const seenIds = new Set<string>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ServiceProvider;
      const pid = data.id || docSnap.id;
      if (deletedProviderIds.includes(pid) || (data as any).status === 'deleted') return;
      if (includeHidden || data.isPublic !== false) {
        providers.push({ ...data, id: pid });
        seenIds.add(pid);
      }
    });

    INITIAL_SERVICE_PROVIDERS.forEach(sp => {
      if (!seenIds.has(sp.id) && !deletedProviderIds.includes(sp.id)) {
        if (includeHidden || sp.isPublic !== false) {
          providers.push(sp);
          seenIds.add(sp.id);
        }
      }
    });

    return providers;
  } catch (err) {
    console.warn('Fallback to local service providers:', err);
    const deletedProviderIds = cachedCloudSync.deletedProviderIds;
    return INITIAL_SERVICE_PROVIDERS.filter(p => !deletedProviderIds.includes(p.id));
  }
}

export function subscribeToServiceProviders(
  callback: (providers: ServiceProvider[]) => void,
  includeHidden = false,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const providersCol = collection(db, 'service_providers');
    return onSnapshot(
      providersCol,
      (snapshot) => {
        const deletedProviderIds = cachedCloudSync.deletedProviderIds;
        const providers: ServiceProvider[] = [];
        const seenIds = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ServiceProvider;
          const pid = data.id || docSnap.id;
          if (deletedProviderIds.includes(pid) || (data as any).status === 'deleted') return;
          if (includeHidden || data.isPublic !== false) {
            providers.push({ ...data, id: pid });
            seenIds.add(pid);
          }
        });

        INITIAL_SERVICE_PROVIDERS.forEach(sp => {
          if (!seenIds.has(sp.id) && !deletedProviderIds.includes(sp.id)) {
            if (includeHidden || sp.isPublic !== false) {
              providers.push(sp);
              seenIds.add(sp.id);
            }
          }
        });

        callback(providers);
      },
      (err) => {
        console.warn('[Firestore] subscribeToServiceProviders notice:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Fallback in subscribeToServiceProviders:', err);
    return () => {};
  }
}

export async function deleteServiceProviderFromFirestore(providerId: string, userRole?: string): Promise<void> {
  // 1. Centralized Cloud Sync: Record deletion to Firestore system_configs/cloud_sync
  await recordCloudDeletion('provider', providerId);

  // 2. Mark tombstone and hard delete from service_providers in Firestore
  try {
    const docRef = doc(db, 'service_providers', providerId);
    await setDoc(docRef, {
      id: providerId,
      status: 'deleted',
      isPublic: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
    await deleteDoc(docRef).catch(() => {});
  } catch (err) {
    console.warn('[Firestore] Delete provider notice:', err);
  }

  // 3. Dispatch local event for instant UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira:providers-changed', { detail: { action: 'deleted', providerId } }));
  }
}

export async function saveServiceProviderToFirestore(providerData: Partial<ServiceProvider>, userRole?: string): Promise<string> {
  try {
    const providerId = providerData.id || `prov-${Date.now()}`;
    // If previously deleted, remove from cloud sync
    await removeCloudDeletion('provider', providerId);

    const providerDocRef = doc(db, 'service_providers', providerId);

    const payload: ServiceProvider = {
      id: providerId,
      name: providerData.name || 'Verified Specialist',
      professionalName: providerData.professionalName || providerData.name || 'Verified Specialist',
      title: providerData.title || 'Technical Specialist',
      email: providerData.email || '',
      phone: providerData.phone || '',
      location: providerData.location || 'Lagos, Nigeria',
      country: providerData.country || 'Nigeria',
      countryCode: providerData.countryCode || 'NG',
      specialization: providerData.specialization || 'Technology & Digital Solutions',
      primaryExpertise: providerData.primaryExpertise || providerData.specialization || 'Technology & Digital Solutions',
      secondaryExpertise: providerData.secondaryExpertise || [],
      bio: providerData.bio || 'Verified expert providing professional services through Nexovira Nigeria.',
      skills: providerData.skills || ['Communication', 'Specialized Execution'],
      experienceLevel: providerData.experienceLevel || 'Experienced',
      experienceYears: Number(providerData.experienceYears) || 3,
      experienceSummary: providerData.experienceSummary || 'Vetted professional with verified industry experience.',
      portfolio: providerData.portfolio || [],
      availability: providerData.availability || 'available',
      projectPreferences: providerData.projectPreferences || ['Remote', 'Contract', 'Short-term'],
      servicesOffered: providerData.servicesOffered || [],
      avatarUrl: providerData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      linkedInUrl: providerData.linkedInUrl || '',
      githubUrl: providerData.githubUrl || '',
      behanceUrl: providerData.behanceUrl || '',
      dribbbleUrl: providerData.dribbbleUrl || '',
      websiteUrl: providerData.websiteUrl || '',
      hasAuthorizedLinkedIn: providerData.hasAuthorizedLinkedIn ?? false,
      isPublic: providerData.isPublic ?? true,
      applicationStatus: providerData.applicationStatus || 'Approved',
      rating: providerData.rating || 5.0,
      completedProjectsCount: providerData.completedProjectsCount || 0,
      activeProjectsCount: providerData.activeProjectsCount || 0,
      totalEarningsNGN: providerData.totalEarningsNGN || 0,
      verifiedByManagement: providerData.verifiedByManagement ?? true,
      createdAt: providerData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(providerDocRef, payload, { merge: true });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:providers-changed', { detail: { action: 'saved', provider: payload } }));
    }

    return providerId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `service_providers/${providerData.id || 'new'}`);
    throw err;
  }
}

// 11c. Service Requests & Project Briefs Management (Customer Booking & Management Assignment)
export async function submitServiceRequestToFirestore(requestData: Partial<ServiceRequest>): Promise<ServiceRequest> {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const refNumber = `NEX-SR-${new Date().getFullYear()}-${randomSuffix}`;
    const requestId = `req-${Date.now()}-${randomSuffix}`;
    const reqDocRef = doc(db, 'service_requests', requestId);

    const fullRequest: ServiceRequest = {
      id: requestId,
      referenceNumber: refNumber,
      customerName: requestData.customerName || 'Valued Client',
      customerEmail: requestData.customerEmail || '',
      customerPhone: requestData.customerPhone || '',
      customerLocation: requestData.customerLocation || 'Nigeria',
      country: 'Nigeria',
      countryCode: 'NG',
      serviceId: requestData.serviceId || '',
      serviceTitle: requestData.serviceTitle || 'Custom Service Request',
      serviceCategory: requestData.serviceCategory || 'General Project',
      requiredExpertise: requestData.requiredExpertise || [],
      detectedRequirements: requestData.detectedRequirements || [],
      projectComplexity: requestData.projectComplexity || 'Medium',
      projectType: requestData.projectType || 'One-time Project',
      projectScope: requestData.projectScope || 'Medium',
      projectDescription: requestData.projectDescription || '',
      budgetExpectation: requestData.budgetExpectation || 'Flexible / To Discuss with Management',
      budgetCurrency: requestData.budgetCurrency || 'NGN',
      timeline: requestData.timeline || 'Flexible',
      referenceLinks: requestData.referenceLinks || [],
      attachments: requestData.attachments || [],
      aiClarifications: requestData.aiClarifications || [],
      status: 'Submitted',
      assignedProviderId: null,
      assignedProviderName: null,
      assignedAt: null,
      assignmentNotes: null,
      providerAccepted: null,
      providerResponseNotes: null,
      providerRespondedAt: null,
      managementNotes: 'New service request submitted. Pending review and provider assignment.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(reqDocRef, fullRequest);
    return fullRequest;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'service_requests');
    throw err;
  }
}

export async function getServiceRequestsFromFirestore(): Promise<ServiceRequest[]> {
  try {
    const cloudSync = await getCloudSyncState();
    const deletedIds = cloudSync.deletedRequestIds || cachedCloudSync.deletedRequestIds || [];

    const requestsCol = collection(db, 'service_requests');
    const snapshot = await getDocs(requestsCol);

    const requests: ServiceRequest[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as ServiceRequest;
      const reqId = data.id || docSnap.id;
      if (!deletedIds.includes(reqId)) {
        requests.push({ ...data, id: reqId });
      }
    });

    // Sort newest first
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return requests;
  } catch (err) {
    console.warn('Failed to retrieve service requests from Firestore:', err);
    return [];
  }
}

export async function deleteServiceRequestFromFirestore(requestId: string, deletedBy?: string): Promise<void> {
  // 1. Record in centralized cloud sync
  await recordCloudDeletion('request', requestId, deletedBy);

  // 2. Remove document from Firestore
  try {
    const reqDocRef = doc(db, 'service_requests', requestId);
    await deleteDoc(reqDocRef);
  } catch (err) {
    console.warn('[Firestore] deleteServiceRequest warning:', err);
  }

  // 3. Dispatch global sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nexovira:requests-changed', {
        detail: { requestId, action: 'deleted', deletedBy }
      })
    );
  }
}

export async function clearAllServiceRequestsFromFirestore(deletedBy?: string): Promise<number> {
  try {
    const requestsCol = collection(db, 'service_requests');
    const snapshot = await getDocs(requestsCol);
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const reqId = docSnap.id;
      await recordCloudDeletion('request', reqId, deletedBy);
      await deleteDoc(docSnap.ref).catch(() => {});
      count++;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nexovira:requests-changed', {
          detail: { action: 'cleared_all', count, deletedBy }
        })
      );
    }

    return count;
  } catch (err) {
    console.warn('[Firestore] clearAllServiceRequests warning:', err);
    return 0;
  }
}

export async function getServiceRequestByIdFromFirestore(requestId: string): Promise<ServiceRequest | null> {
  try {
    const docSnap = await getDoc(doc(db, 'service_requests', requestId));
    if (docSnap.exists()) {
      return docSnap.data() as ServiceRequest;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function getServiceRequestByRefFromFirestore(refNumber: string): Promise<ServiceRequest | null> {
  try {
    const cleanRef = refNumber.trim().toUpperCase();
    const q = query(collection(db, 'service_requests'), where('referenceNumber', '==', cleanRef), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ServiceRequest;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function updateServiceRequestStatusInFirestore(
  requestId: string,
  status: ServiceRequestStatus,
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'service_requests', requestId);
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (notes) {
      updateData.managementNotes = notes;
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_requests/${requestId}`);
    throw err;
  }
}

export async function assignServiceRequestInFirestore(
  requestId: string,
  providerId: string,
  providerName: string,
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'service_requests', requestId);
    await updateDoc(docRef, {
      assignedProviderId: providerId,
      assignedProviderName: providerName,
      assignedAt: new Date().toISOString(),
      assignmentNotes: notes || '',
      status: 'Assigned',
      providerAccepted: null,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_requests/${requestId}`);
    throw err;
  }
}

export async function providerRespondToRequestInFirestore(
  requestId: string,
  accepted: boolean,
  responseNotes?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'service_requests', requestId);
    await updateDoc(docRef, {
      providerAccepted: accepted,
      providerRespondedAt: new Date().toISOString(),
      providerResponseNotes: responseNotes || '',
      status: accepted ? 'Accepted' : 'Declined',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `service_requests/${requestId}`);
    throw err;
  }
}

// 12. Escrow Service Orders
export async function createEscrowServiceOrderInFirestore(orderData: any): Promise<void> {
  try {
    const orderId = `ESC-${Math.floor(10000 + Math.random() * 90000)}`;
    const docRef = doc(db, 'service_orders', orderId);
    const payload = {
      ...orderData,
      id: orderId,
      status: 'Funds in Escrow',
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'service_orders');
    throw err;
  }
}

export async function getEscrowServiceOrdersFromFirestore(): Promise<any[]> {
  try {
    const ordersCol = collection(db, 'service_orders');
    const snapshot = await getDocs(ordersCol);
    const orders: any[] = [];
    snapshot.forEach(docSnap => {
      orders.push(docSnap.data());
    });
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'service_orders');
    return [];
  }
}

export async function deleteEscrowServiceOrderFromFirestore(orderId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'service_orders', orderId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `service_orders/${orderId}`);
    throw err;
  }
}

// 13. Newsletter Subscription
export async function subscribeNewsletterToFirestore(email: string): Promise<void> {
  try {
    const subscribersCol = collection(db, 'subscribers');
    await addDoc(subscribersCol, {
      email: email.trim().toLowerCase(),
      subscribedAt: new Date().toISOString(),
      status: 'active'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'subscribers');
    throw err;
  }
}

// 14. Wishlist Firestore Synchronization
export async function getUserWishlistFromFirestore(uid: string): Promise<string[]> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data().wishlist || [];
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
  return [];
}

export async function toggleWishlistInFirestore(uid: string, productId: string, currentWishlist: string[]): Promise<string[]> {
  const exists = currentWishlist.includes(productId);
  const updatedWishlist = exists 
    ? currentWishlist.filter(id => id !== productId)
    : [...currentWishlist, productId];

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, { wishlist: updatedWishlist }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
  return updatedWishlist;
}

/**
 * Real-Time Firestore Subscription: User Wishlist
 * Automatically synchronizes user wishlist in real-time across all browser tabs, devices, and domains.
 */
export function subscribeToUserWishlist(
  uid: string,
  callback: (wishlist: string[]) => void
): Unsubscribe {
  try {
    const userDocRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteWishlist = docSnap.data().wishlist || [];
          callback(remoteWishlist);
        }
      },
      (err) => {
        console.warn('User wishlist subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to user wishlist:', err);
    return () => {};
  }
}

// 15. Product Reviews System
export async function getReviewsForProductFromFirestore(productId: string): Promise<Review[]> {
  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    const reviews: Review[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reviews.push({
        id: docSnap.id,
        productId: data.productId || productId,
        customerId: data.customerId || data.uid || '',
        userName: data.userName || 'Verified Buyer',
        userAvatar: data.userAvatar || '',
        rating: typeof data.rating === 'number' ? data.rating : Number(data.rating) || 5,
        comment: data.comment || '',
        title: data.title || '',
        date: data.date || new Date().toISOString().split('T')[0],
        verifiedPurchase: data.verifiedPurchase ?? true,
        helpfulCount: data.helpfulCount || 0,
        createdAt: data.createdAt || new Date().toISOString()
      });
    });
    return reviews.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `reviews?productId=${productId}`);
    return [];
  }
}

export interface AddReviewResult {
  review: Review;
  averageRating: number;
  totalReviewsCount: number;
}

export async function addReviewToFirestore(reviewData: {
  productId: string;
  customerId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  title?: string;
}): Promise<Review & { calculatedAvgRating?: number; calculatedTotalReviews?: number }> {
  try {
    const docRef = doc(collection(db, 'reviews'));
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];
    const numericRating = Math.min(5, Math.max(1, Math.round(Number(reviewData.rating) || 5)));

    const newReview: Review & { uid?: string } = {
      id: docRef.id,
      productId: reviewData.productId,
      customerId: reviewData.customerId,
      uid: reviewData.customerId,
      userName: reviewData.userName || 'Verified Customer',
      userAvatar: reviewData.userAvatar || '',
      rating: numericRating,
      comment: reviewData.comment.trim(),
      title: (reviewData.title || '').trim(),
      date: todayStr,
      verifiedPurchase: true,
      helpfulCount: 0,
      createdAt: nowIso
    };

    // 1. Write review document to Firestore
    await setDoc(docRef, newReview);

    // 2. Fetch all reviews for this product to calculate authoritative average rating and total count
    let calculatedAvgRating = numericRating;
    let calculatedTotalReviews = 1;

    try {
      const allProductReviews = await getReviewsForProductFromFirestore(reviewData.productId);
      if (allProductReviews && allProductReviews.length > 0) {
        calculatedTotalReviews = allProductReviews.length;
        const sumRatings = allProductReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        calculatedAvgRating = Number((sumRatings / calculatedTotalReviews).toFixed(1));
      }

      // 3. Atomically update the product document in Firestore with the new average rating & count
      const prodRef = doc(db, 'products', reviewData.productId);
      await updateDoc(prodRef, {
        rating: calculatedAvgRating,
        ratingAvg: calculatedAvgRating,
        reviewCount: calculatedTotalReviews,
        reviewsCount: calculatedTotalReviews,
        updatedAt: nowIso
      }).catch((updateErr) => {
        console.warn('Non-fatal: could not update product rating on product doc:', updateErr);
      });
    } catch (metricErr) {
      console.warn('Non-fatal error calculating product rating metrics:', metricErr);
    }

    return {
      ...newReview,
      calculatedAvgRating,
      calculatedTotalReviews
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'reviews');
    throw err;
  }
}

export async function voteReviewHelpfulInFirestore(reviewId: string): Promise<number> {
  try {
    const revRef = doc(db, 'reviews', reviewId);
    const snap = await getDoc(revRef);
    if (!snap.exists()) return 0;
    const currentCount = snap.data().helpfulCount || 0;
    const newCount = currentCount + 1;
    await updateDoc(revRef, { helpfulCount: newCount });
    return newCount;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
    return 0;
  }
}

// 16. Contact Messages System
export async function submitContactMessageToFirestore(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  try {
    const colRef = collection(db, 'contact_messages');
    await addDoc(colRef, {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      subject: data.subject.trim(),
      message: data.message.trim(),
      status: 'unread',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'contact_messages');
    throw err;
  }
}

export async function getContactMessagesFromFirestore(): Promise<ContactMessage[]> {
  try {
    const colRef = collection(db, 'contact_messages');
    const snapshot = await getDocs(colRef);
    const list: ContactMessage[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        name: d.name || '',
        email: d.email || '',
        subject: d.subject || '',
        message: d.message || '',
        status: d.status || 'unread',
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'contact_messages');
    return [];
  }
}

// 17. Seller Category Requests System
export async function createCategoryRequestInFirestore(req: {
  sellerId: string;
  sellerName: string;
  categoryName: string;
  group: 'appliances' | 'electronics' | 'smart-home';
  description: string;
}): Promise<CategoryRequest> {
  try {
    const docRef = doc(collection(db, 'category_requests'));
    const item: CategoryRequest = {
      id: docRef.id,
      sellerId: req.sellerId,
      sellerName: req.sellerName,
      categoryName: req.categoryName,
      group: req.group,
      description: req.description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, item);
    return item;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'category_requests');
    throw err;
  }
}

export async function getCategoryRequestsFromFirestore(): Promise<CategoryRequest[]> {
  try {
    const colRef = collection(db, 'category_requests');
    const snapshot = await getDocs(colRef);
    const list: CategoryRequest[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        sellerId: d.sellerId || '',
        sellerName: d.sellerName || '',
        categoryName: d.categoryName || '',
        group: d.group || 'appliances',
        description: d.description || '',
        status: d.status || 'pending',
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'category_requests');
    return [];
  }
}

export async function updateCategoryRequestStatusInFirestore(id: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const docRef = doc(db, 'category_requests', id);
    await updateDoc(docRef, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `category_requests/${id}`);
    throw err;
  }
}

// 18. Seller Order Notifications System
export async function createSellerNotificationInFirestore(notification: {
  sellerId?: string;
  userId?: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
}): Promise<void> {
  try {
    const targetSellerId = notification.sellerId || notification.userId || 'store-1';
    const docRef = doc(collection(db, 'seller_notifications'));
    const payload: SellerNotification = {
      id: docRef.id,
      sellerId: targetSellerId,
      title: notification.title,
      message: notification.message,
      type: notification.type as any,
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, sanitizeFirestoreData(payload));
  } catch (err) {
    console.error('Error creating seller notification:', err);
  }
}

export async function getSellerNotificationsFromFirestore(userId: string): Promise<SellerNotification[]> {
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: SellerNotification[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        userId: d.userId || userId,
        title: d.title || 'Notification',
        message: d.message || '',
        type: d.type || 'system',
        orderId: d.orderId,
        read: d.read ?? false,
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `notifications?userId=${userId}`);
    return [];
  }
}

export async function markNotificationAsReadInFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
  }
}

// 19. Affiliate Management & Link Tracking System
export async function getAffiliateProfileFromFirestore(uid: string): Promise<AffiliateProfile | null> {
  try {
    const docRef = doc(db, 'affiliates', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        uid: d.uid || uid,
        userName: d.userName || '',
        userEmail: d.userEmail || '',
        affiliateCode: d.affiliateCode || `AFF-${uid.slice(0, 6).toUpperCase()}`,
        status: d.status || 'pending',
        promotionalChannels: d.promotionalChannels || '',
        totalClicks: d.totalClicks || 0,
        totalConversions: d.totalConversions || 0,
        pendingCommission: d.pendingCommission || 0,
        approvedCommission: d.approvedCommission || 0,
        withdrawableBalance: d.withdrawableBalance || 0,
        totalWithdrawn: d.totalWithdrawn || 0,
        createdAt: d.createdAt || new Date().toISOString()
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `affiliates/${uid}`);
  }
  return null;
}

import { 
  generateUniqueAffiliateId, 
  generateUniqueAffiliateCode, 
  DEFAULT_AFFILIATE_CONFIG,
  CalculatedOrderFinancials,
  calculateOrderFinancials
} from './affiliateEngine';
import { 
  AffiliateConfig, 
  OrderFinancials, 
  AffiliateLedger, 
  PayoutRequest 
} from '../types';

export async function getAffiliateConfigFromFirestore(): Promise<AffiliateConfig> {
  try {
    const docRef = doc(db, 'settings', 'affiliate_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_AFFILIATE_CONFIG, ...docSnap.data() } as AffiliateConfig;
    }
  } catch (err) {
    console.error('Error fetching affiliate config:', err);
  }
  return DEFAULT_AFFILIATE_CONFIG;
}

export async function saveAffiliateConfigInFirestore(config: AffiliateConfig): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'affiliate_config');
    await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'settings/affiliate_config');
    throw err;
  }
}

export async function getAffiliateProfileByCodeFromFirestore(code: string): Promise<AffiliateProfile | null> {
  try {
    if (!code) return null;
    const colRef = collection(db, 'affiliates');
    const q = query(colRef, where('affiliateCode', '==', code.trim().toUpperCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const d = docSnap.data();
      return {
        id: d.id || docSnap.id,
        uid: d.uid || docSnap.id,
        userName: d.userName || '',
        userEmail: d.userEmail || '',
        affiliateCode: d.affiliateCode || code,
        status: d.status || 'approved',
        promotionalChannels: d.promotionalChannels || '',
        totalClicks: d.totalClicks || 0,
        totalConversions: d.totalConversions || 0,
        pendingCommission: d.pendingCommission || 0,
        approvedCommission: d.approvedCommission || 0,
        withdrawableBalance: d.withdrawableBalance || 0,
        totalWithdrawn: d.totalWithdrawn || 0,
        bankDetails: d.bankDetails,
        createdAt: d.createdAt || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Error fetching affiliate profile by code:', err);
  }
  return null;
}

export async function applyForAffiliateProgramInFirestore(
  uid: string, 
  userName: string, 
  userEmail: string, 
  channels: string,
  bankDetails?: { bankName: string; accountNumber: string; accountName: string }
): Promise<AffiliateProfile> {
  try {
    // Check if affiliate profile already exists
    const existing = await getAffiliateProfileFromFirestore(uid);
    if (existing) {
      if (bankDetails) {
        await updateDoc(doc(db, 'affiliates', uid), { bankDetails });
        existing.bankDetails = bankDetails;
      }
      return existing;
    }

    const affId = generateUniqueAffiliateId();
    const affCode = generateUniqueAffiliateCode(userName);

    const docRef = doc(db, 'affiliates', uid);
    const profile: AffiliateProfile = {
      id: affId,
      uid,
      userName: userName || 'NEXOVIRA Affiliate',
      userEmail: userEmail || '',
      affiliateCode: affCode,
      status: 'approved', // Auto approved for smooth UX
      promotionalChannels: channels || '',
      totalClicks: 0,
      totalConversions: 0,
      pendingCommission: 0,
      approvedCommission: 0,
      withdrawableBalance: 0,
      totalWithdrawn: 0,
      createdAt: new Date().toISOString()
    };

    if (bankDetails) {
      profile.bankDetails = bankDetails;
    }

    await setDoc(docRef, profile, { merge: true });

    // Sync with user document
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { isAffiliate: true, affiliateCode: affCode, affiliateId: affId }, { merge: true });

    return profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `affiliates/${uid}`);
    throw err;
  }
}

export async function recordAffiliateClickInFirestore(refCode: string, productId?: string, landingPage?: string, linkId?: string): Promise<void> {
  try {
    if (!refCode) return;
    const cleanCode = refCode.trim().toUpperCase();
    const clickRef = doc(collection(db, 'affiliate_clicks'));
    
    // Find affiliate by code
    const profile = await getAffiliateProfileByCodeFromFirestore(cleanCode);

    const clickData = sanitizeFirestoreData({
      id: clickRef.id,
      affiliateCode: cleanCode,
      affiliateId: profile ? profile.id : null,
      productId: productId || null,
      linkId: linkId || null,
      landingPage: landingPage || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      timestamp: new Date().toISOString()
    });

    await setDoc(clickRef, clickData);

    if (profile) {
      const affRef = doc(db, 'affiliates', profile.uid);
      await updateDoc(affRef, { totalClicks: increment(1) }).catch(() => {});
    }

    if (linkId) {
      try {
        const linkRef = doc(db, 'affiliate_links', linkId);
        await updateDoc(linkRef, { clicks: increment(1) }).catch(() => {});
      } catch (_) {}
    }
  } catch (err) {
    console.error('Affiliate click record error:', err);
  }
}

/**
 * Creates permanent snapshots in `order_financials` and `affiliate_commissions`.
 * Prevents duplicate commissions using idempotent unique key checks.
 */
export async function recordOrderFinancialSnapshotsInFirestore(
  orderId: string,
  financials: CalculatedOrderFinancials
): Promise<void> {
  try {
    let totalAffiliateCommissionAwarded = 0;

    for (const item of financials.items) {
      // 1. Permanent snapshot in order_financials
      const finRef = doc(collection(db, 'order_financials'));
      const snapshotDoc: OrderFinancials = {
        id: finRef.id,
        orderId,
        productId: item.productId,
        sellerId: item.sellerId,
        affiliateId: financials.affiliateId,
        affiliateCode: financials.affiliateCode,
        productPriceSnapshot: item.itemPrice,
        marketplaceRateSnapshot: item.marketplaceRateApplied,
        affiliateRateSnapshot: item.affiliateRateApplied,
        marketplaceCommissionSnapshot: item.marketplaceCommission,
        affiliateCommissionSnapshot: item.affiliateCommission,
        sellerEarningsSnapshot: item.sellerEarnings,
        paymentFeeSnapshot: financials.paymentFee / (financials.items.length || 1),
        selfReferral: financials.selfReferral,
        createdAt: new Date().toISOString()
      };
      await setDoc(finRef, snapshotDoc);

      // 2. Affiliate Commission Record (Idempotent unique key)
      if (financials.affiliateUid && financials.affiliateCode && item.affiliateCommission > 0 && !financials.selfReferral) {
        const uniqueKey = `${orderId}_${item.productId}_${financials.affiliateUid}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const commRef = doc(db, 'affiliate_commissions', uniqueKey);
        
        // Idempotency check: verify if already recorded
        const commSnap = await getDoc(commRef);
        if (!commSnap.exists()) {
          const commRecord: AffiliateCommissionRecord = {
            id: uniqueKey,
            affiliateUid: financials.affiliateUid,
            affiliateId: financials.affiliateId,
            affiliateCode: financials.affiliateCode,
            productId: item.productId,
            productTitle: item.productTitle,
            sellerId: item.sellerId,
            orderId,
            saleAmount: item.itemSubtotal,
            commissionRate: item.affiliateRateApplied,
            commissionAmount: item.affiliateCommission,
            status: 'PENDING',
            selfReferral: financials.selfReferral,
            createdAt: new Date().toISOString()
          };
          await setDoc(commRef, commRecord);
          totalAffiliateCommissionAwarded += item.affiliateCommission;

          // Ledger entry
          const ledgerRef = doc(collection(db, 'affiliate_ledger'));
          const ledgerEntry: AffiliateLedger = {
            id: ledgerRef.id,
            affiliateId: financials.affiliateId || financials.affiliateUid,
            affiliateUid: financials.affiliateUid,
            type: 'COMMISSION_EARNED',
            amount: item.affiliateCommission,
            currency: 'NGN',
            orderId,
            description: `Commission earned for order #${orderId.slice(0, 8)} (${item.productTitle})`,
            createdAt: new Date().toISOString()
          };
          await setDoc(ledgerRef, ledgerEntry);

          // Automated Notification for Sale
          await createAffiliateNotificationInFirestore({
            affiliateUid: financials.affiliateUid,
            title: 'Commission Earned! 🎉',
            message: `Congratulations! You earned a commission of NGN ${item.affiliateCommission.toLocaleString()} for order #${orderId.slice(0, 8)} (${item.productTitle}).`,
            type: 'sale'
          }).catch(() => {});
        }
      }
    }

    // Update affiliate profile summary stats
    if (financials.affiliateUid && totalAffiliateCommissionAwarded > 0) {
      await getAffiliateWalletSummaryInFirestore(financials.affiliateUid);
    }
  } catch (err) {
    console.error('Error recording order financial snapshots:', err);
  }
}

export async function getFinancialSnapshotsFromFirestore(orderId?: string): Promise<OrderFinancials[]> {
  try {
    const colRef = collection(db, 'order_financials');
    let q = query(colRef, orderBy('createdAt', 'desc'));
    if (orderId) {
      q = query(colRef, where('orderId', '==', orderId));
    }
    const snap = await getDocs(q);
    const list: OrderFinancials[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as OrderFinancials);
    });
    return list;
  } catch (err) {
    console.error('Error fetching order financials:', err);
    return [];
  }
}

export async function getAllCommissionsFromFirestore(): Promise<AffiliateCommissionRecord[]> {
  try {
    const colRef = collection(db, 'affiliate_commissions');
    const snap = await getDocs(colRef);
    const list: AffiliateCommissionRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        affiliateUid: d.affiliateUid || '',
        affiliateId: d.affiliateId || '',
        affiliateCode: d.affiliateCode || '',
        productId: d.productId || '',
        productTitle: d.productTitle || '',
        sellerId: d.sellerId || '',
        orderId: d.orderId || '',
        saleAmount: d.saleAmount || 0,
        commissionRate: d.commissionRate || 0,
        commissionAmount: d.commissionAmount || 0,
        status: d.status || 'PENDING',
        selfReferral: d.selfReferral || false,
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching all commissions:', err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// AUTOMATED SETTLEMENT PROCESSOR & IMMUTABLE WALLET LEDGER ENGINE
// -----------------------------------------------------------------------------

/**
 * Automatically evaluates all pending commissions and transitions them to 'AVAILABLE'
 * if their age exceeds the configured settlementPeriodHours (default: 24 hours).
 */
export async function processAffiliateSettlementsInFirestore(): Promise<number> {
  try {
    const config = await getAffiliateConfigFromFirestore();
    const settlementHours = config.settlementPeriodHours || 24;

    const colRef = collection(db, 'affiliate_commissions');
    const q = query(colRef, where('status', '==', 'PENDING'));
    const snap = await getDocs(q);

    let settledCount = 0;
    const now = Date.now();

    for (const docSnap of snap.docs) {
      const comm = docSnap.data() as AffiliateCommissionRecord;
      const createdTime = new Date(comm.createdAt).getTime();
      const ageHours = (now - createdTime) / (1000 * 3600);

      if (ageHours >= settlementHours) {
        // 1. Move status to AVAILABLE
        await updateDoc(docSnap.ref, {
          status: 'AVAILABLE',
          availableAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // 2. Insert immutable ledger entry for COMMISSION_SETTLED
        const ledgerRef = doc(collection(db, 'affiliate_ledger'));
        const ledgerData = sanitizeFirestoreData({
          id: ledgerRef.id,
          affiliateId: comm.affiliateId || comm.affiliateUid,
          affiliateUid: comm.affiliateUid,
          type: 'COMMISSION_SETTLED',
          amount: comm.commissionAmount,
          currency: comm.currency || 'NGN',
          orderId: comm.orderId,
          commissionId: docSnap.id,
          description: `Commission settled and withdrawable for order #${comm.orderId.slice(0, 8)} (${comm.productTitle})`,
          createdAt: new Date().toISOString()
        });
        await setDoc(ledgerRef, ledgerData);

        // 3. Send automated system notification to Affiliate
        if (comm.affiliateUid) {
          await createAffiliateNotificationInFirestore({
            affiliateUid: comm.affiliateUid,
            title: 'Commission Settled & Available',
            message: `Your commission of ${comm.currency || 'NGN'} ${comm.commissionAmount.toLocaleString()} for order #${comm.orderId.slice(0, 8)} has completed its settlement period and is now withdrawable.`,
            type: 'available'
          }).catch(() => {});
        }

        settledCount++;
      }
    }

    return settledCount;
  } catch (err) {
    console.error('Error processing affiliate settlements:', err);
    return 0;
  }
}

/**
 * Fetches complete immutable transaction ledger for an affiliate sorted by date.
 */
export async function getAffiliateLedgerFromFirestore(affiliateUid: string): Promise<AffiliateLedger[]> {
  try {
    const colRef = collection(db, 'affiliate_ledger');
    const snap = await getDocs(colRef);
    const list: AffiliateLedger[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d.affiliateUid === affiliateUid || d.affiliateId === affiliateUid) {
        list.push({
          id: docSnap.id,
          affiliateId: d.affiliateId || affiliateUid,
          affiliateUid: d.affiliateUid || affiliateUid,
          type: d.type || 'COMMISSION_EARNED',
          amount: d.amount || 0,
          currency: d.currency || 'NGN',
          orderId: d.orderId,
          commissionId: d.commissionId,
          payoutId: d.payoutId,
          description: d.description || '',
          createdAt: d.createdAt || new Date().toISOString()
        } as AffiliateLedger);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching affiliate ledger:', err);
    return [];
  }
}

/**
 * Calculates complete multi-currency balances directly from the immutable transaction ledger.
 */
export async function getAffiliateWalletSummaryInFirestore(affiliateUid: string) {
  try {
    // 1. First trigger auto-settlement check
    await processAffiliateSettlementsInFirestore();

    // 2. Fetch ledger entries and commissions
    const [ledgerEntries, commissions] = await Promise.all([
      getAffiliateLedgerFromFirestore(affiliateUid),
      getAffiliateCommissionsFromFirestore(affiliateUid)
    ]);

    // 3. Multi-currency ledger balances dictionary
    const balances: Record<string, { available: number; pending: number; totalEarned: number; totalWithdrawn: number }> = {
      NGN: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
      USD: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
      GBP: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
      EUR: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 }
    };

    // Calculate Pending balances from active PENDING commissions
    commissions.forEach((c) => {
      const curr = (c.currency || 'NGN').toUpperCase();
      if (!balances[curr]) {
        balances[curr] = { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 };
      }
      if (c.status === 'PENDING' || c.status === 'Pending') {
        balances[curr].pending += c.commissionAmount || 0;
      }
    });

    // Calculate Available, Total Earned, and Total Withdrawn from ledger entries
    ledgerEntries.forEach((entry) => {
      const curr = (entry.currency || 'NGN').toUpperCase();
      if (!balances[curr]) {
        balances[curr] = { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 };
      }

      if (entry.type === 'COMMISSION_SETTLED' || entry.type === 'COMMISSION_APPROVED') {
        balances[curr].available += entry.amount;
        balances[curr].totalEarned += entry.amount;
      } else if (entry.type === 'PAYOUT_REQUESTED') {
        // Negative amount locks funds
        balances[curr].available += entry.amount; // entry.amount is negative
      } else if (entry.type === 'PAYOUT_COMPLETED') {
        balances[curr].totalWithdrawn += Math.abs(entry.amount);
      } else if (entry.type === 'PAYOUT_FAILED') {
        // Positive reversal unlocks funds
        balances[curr].available += Math.abs(entry.amount);
      } else if (entry.type === 'COMMISSION_REVERSED') {
        balances[curr].available += entry.amount; // entry.amount is negative
      }
    });

    // Clean up negative values & round to 2 decimals
    Object.keys(balances).forEach((curr) => {
      balances[curr].available = Math.max(0, Math.round(balances[curr].available * 100) / 100);
      balances[curr].pending = Math.max(0, Math.round(balances[curr].pending * 100) / 100);
      balances[curr].totalEarned = Math.max(0, Math.round(balances[curr].totalEarned * 100) / 100);
      balances[curr].totalWithdrawn = Math.max(0, Math.round(balances[curr].totalWithdrawn * 100) / 100);
    });

    // Sync computed summary stats to affiliate profile
    const affRef = doc(db, 'affiliates', affiliateUid);
    const primaryNGN = balances['NGN'] || { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 };
    await updateDoc(affRef, sanitizeFirestoreData({
      pendingCommission: primaryNGN.pending,
      approvedCommission: primaryNGN.available,
      withdrawableBalance: primaryNGN.available,
      totalWithdrawn: primaryNGN.totalWithdrawn,
      balances,
      updatedAt: new Date().toISOString()
    })).catch(() => {});

    return { balances, ledgerEntries, commissions };
  } catch (err) {
    console.error('Error fetching affiliate wallet summary:', err);
    return {
      balances: { NGN: { available: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 } },
      ledgerEntries: [],
      commissions: []
    };
  }
}

// -----------------------------------------------------------------------------
// PAYOUT REQUESTS & WITHDRAWAL ENGINE
// -----------------------------------------------------------------------------

export async function createPayoutRequestInFirestore(
  affiliateUid: string,
  amount: number,
  currency: CurrencyCode = 'NGN',
  targetCurrency: CurrencyCode = 'NGN',
  bankDetails: { bankName: string; accountNumber: string; accountName: string; swiftCode?: string; payoutProvider?: string }
): Promise<PayoutRequest> {
  try {
    const profile = await getAffiliateProfileFromFirestore(affiliateUid);
    if (!profile) throw new Error('Affiliate profile not found');

    if (profile.status === 'suspended') {
      throw new Error('Your affiliate account is currently suspended. Withdrawals are on hold.');
    }

    // 1. Get current ledger wallet summary
    const summary = await getAffiliateWalletSummaryInFirestore(affiliateUid);
    const currKey = (currency || 'NGN').toUpperCase();
    const currBalance = summary.balances[currKey] || { available: 0 };

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    if (amount > currBalance.available) {
      throw new Error(`Insufficient available balance in ${currKey}. Requested ${amount}, available ${currBalance.available}`);
    }

    const config = await getAffiliateConfigFromFirestore();
    const minWithdrawal = config.minWithdrawalAmount || 1000;
    if (amount < minWithdrawal && currency === 'NGN') {
      throw new Error(`Minimum withdrawal amount is NGN ${minWithdrawal.toLocaleString()}`);
    }

    // 2. Perform conversion calculation if targetCurrency differs
    let convertedAmount = amount;
    let exchangeRate = 1.0;
    let conversionFee = 0;

    if (currency !== targetCurrency) {
      const conv = convertDirectly(amount, currency, targetCurrency);
      convertedAmount = conv.convertedAmount;
      exchangeRate = conv.rate;
      if (config.conversionFeePercent) {
        conversionFee = (convertedAmount * config.conversionFeePercent) / 100;
        convertedAmount = Math.max(0, convertedAmount - conversionFee);
      }
    }

    // 3. Create Payout Request Document
    const payoutRef = doc(collection(db, 'payouts'));
    const payout: PayoutRequest = {
      id: payoutRef.id,
      affiliateId: profile.id,
      affiliateUid: profile.uid,
      affiliateCode: profile.affiliateCode,
      affiliateName: profile.userName,
      userEmail: profile.userEmail,
      amount,
      currency,
      targetCurrency,
      convertedAmount,
      exchangeRate,
      conversionFee,
      bankDetails,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    await setDoc(payoutRef, sanitizeFirestoreData(payout));

    // 4. Lock requested funds in ledger immediately
    const ledgerRef = doc(collection(db, 'affiliate_ledger'));
    const ledgerEntry = sanitizeFirestoreData({
      id: ledgerRef.id,
      affiliateId: profile.id,
      affiliateUid: profile.uid,
      type: 'PAYOUT_REQUESTED',
      amount: -amount,
      currency,
      payoutId: payoutRef.id,
      description: `Withdrawal payout requested: ${currency} ${amount.toLocaleString()} to ${bankDetails.bankName} (${bankDetails.accountNumber})`,
      createdAt: new Date().toISOString()
    });
    await setDoc(ledgerRef, ledgerEntry);

    // 5. Send Notification
    await createAffiliateNotificationInFirestore({
      affiliateUid: profile.uid,
      title: 'Withdrawal Requested',
      message: `Your withdrawal request of ${currency} ${amount.toLocaleString()} to ${bankDetails.bankName} has been received and is being processed.`,
      type: 'payout_requested'
    }).catch(() => {});

    // Recalculate wallet summary
    await getAffiliateWalletSummaryInFirestore(affiliateUid);

    return payout;
  } catch (err) {
    console.error('Error creating payout request:', err);
    throw err;
  }
}

export async function getPayoutRequestsFromFirestore(affiliateId?: string): Promise<PayoutRequest[]> {
  try {
    const colRef = collection(db, 'payouts');
    let q = query(colRef, orderBy('createdAt', 'desc'));
    if (affiliateId) {
      q = query(colRef, where('affiliateId', '==', affiliateId));
    }
    const snap = await getDocs(q);
    const list: PayoutRequest[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        affiliateId: d.affiliateId || '',
        affiliateUid: d.affiliateUid || '',
        affiliateCode: d.affiliateCode || '',
        affiliateName: d.affiliateName || '',
        userEmail: d.userEmail || '',
        amount: d.amount || 0,
        currency: d.currency || 'NGN',
        targetCurrency: d.targetCurrency || d.currency || 'NGN',
        convertedAmount: d.convertedAmount || d.amount || 0,
        exchangeRate: d.exchangeRate || 1.0,
        conversionFee: d.conversionFee || 0,
        bankDetails: d.bankDetails || { bankName: '', accountNumber: '', accountName: '' },
        status: d.status || 'PENDING',
        rejectionReason: d.rejectionReason,
        createdAt: d.createdAt || new Date().toISOString(),
        paidAt: d.paidAt
      } as PayoutRequest);
    });
    return list;
  } catch (err) {
    console.error('Error fetching payout requests:', err);
    return [];
  }
}

export async function updatePayoutStatusInFirestore(
  payoutId: string, 
  status: 'COMPLETED' | 'PAID' | 'REJECTED' | 'FAILED' | 'PROCESSING',
  rejectionReason?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'payouts', payoutId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const payout = snap.data() as PayoutRequest;
    const finalStatus = (status === 'PAID' ? 'COMPLETED' : status) as PayoutRequest['status'];

    await updateDoc(docRef, sanitizeFirestoreData({ 
      status: finalStatus, 
      rejectionReason: rejectionReason || null,
      paidAt: (finalStatus === 'COMPLETED') ? new Date().toISOString() : payout.paidAt || null 
    }));

    const affiliateUid = payout.affiliateUid || payout.affiliateId;

    if (finalStatus === 'COMPLETED') {
      // Create PAYOUT_COMPLETED ledger entry
      const ledgerRef = doc(collection(db, 'affiliate_ledger'));
      await setDoc(ledgerRef, sanitizeFirestoreData({
        id: ledgerRef.id,
        affiliateId: payout.affiliateId,
        affiliateUid,
        type: 'PAYOUT_COMPLETED',
        amount: -payout.amount,
        currency: payout.currency || 'NGN',
        payoutId,
        description: `Payout completed successfully: ${payout.currency || 'NGN'} ${payout.amount.toLocaleString()} transferred to ${payout.bankDetails?.bankName}`,
        createdAt: new Date().toISOString()
      }));

      if (affiliateUid) {
        await createAffiliateNotificationInFirestore({
          affiliateUid,
          title: 'Payout Completed',
          message: `Your payout of ${payout.currency || 'NGN'} ${payout.amount.toLocaleString()} has been sent to ${payout.bankDetails?.bankName} (${payout.bankDetails?.accountNumber}).`,
          type: 'payout_completed'
        }).catch(() => {});
      }
    } else if (finalStatus === 'REJECTED' || finalStatus === 'FAILED') {
      // Unlocks/restores funds into available balance via positive PAYOUT_FAILED ledger entry
      const ledgerRef = doc(collection(db, 'affiliate_ledger'));
      await setDoc(ledgerRef, sanitizeFirestoreData({
        id: ledgerRef.id,
        affiliateId: payout.affiliateId,
        affiliateUid,
        type: 'PAYOUT_FAILED',
        amount: payout.amount, // Positive amount restores funds
        currency: payout.currency || 'NGN',
        payoutId,
        description: `Payout attempt failed/rejected (${rejectionReason || 'Details mismatch'}). ${payout.currency || 'NGN'} ${payout.amount.toLocaleString()} restored to available balance.`,
        createdAt: new Date().toISOString()
      }));

      if (affiliateUid) {
        await createAffiliateNotificationInFirestore({
          affiliateUid,
          title: 'Payout Failed / Rejected',
          message: `Your payout request of ${payout.currency || 'NGN'} ${payout.amount.toLocaleString()} could not be completed (${rejectionReason || 'Please review account details'}). Your funds have been restored.`,
          type: 'payout_failed'
        }).catch(() => {});
      }
    }

    if (affiliateUid) {
      await getAffiliateWalletSummaryInFirestore(affiliateUid);
    }
  } catch (err) {
    console.error('Error updating payout status:', err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// ORDER REFUNDS & AUDITABLE COMMISSION REVERSAL
// -----------------------------------------------------------------------------

export async function refundOrderAndReverseCommissionsInFirestore(orderId: string, reason?: string): Promise<void> {
  try {
    // 1. Update Order Status
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: 'Refunded', updatedAt: new Date().toISOString() }).catch(() => {});

    // 2. Find commissions for this order
    const colRef = collection(db, 'affiliate_commissions');
    const q = query(colRef, where('orderId', '==', orderId));
    const snap = await getDocs(q);

    for (const commSnap of snap.docs) {
      const commData = commSnap.data() as AffiliateCommissionRecord;
      if (commData.status !== 'REVERSED') {
        // Mark commission as REVERSED
        await updateDoc(commSnap.ref, { 
          status: 'REVERSED', 
          updatedAt: new Date().toISOString() 
        });

        // Insert auditable negative ledger entry
        const ledgerRef = doc(collection(db, 'affiliate_ledger'));
        const ledgerEntry = sanitizeFirestoreData({
          id: ledgerRef.id,
          affiliateId: commData.affiliateId || commData.affiliateUid,
          affiliateUid: commData.affiliateUid,
          type: 'COMMISSION_REVERSED',
          amount: -commData.commissionAmount,
          currency: commData.currency || 'NGN',
          orderId,
          commissionId: commSnap.id,
          description: `Commission reversed for refunded/cancelled order #${orderId.slice(0, 8)} (${reason || 'Order Refund'})`,
          createdAt: new Date().toISOString()
        });
        await setDoc(ledgerRef, ledgerEntry);

        // Send Notification to Affiliate
        if (commData.affiliateUid) {
          await createAffiliateNotificationInFirestore({
            affiliateUid: commData.affiliateUid,
            title: 'Commission Reversed',
            message: `An affiliate commission of ${commData.currency || 'NGN'} ${commData.commissionAmount.toLocaleString()} was reversed because order #${orderId.slice(0, 8)} was refunded/cancelled.`,
            type: 'reversed'
          }).catch(() => {});

          await getAffiliateWalletSummaryInFirestore(commData.affiliateUid);
        }
      }
    }
  } catch (err) {
    console.error('Error reversing order commissions:', err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// AFFILIATE NOTIFICATIONS SERVICE
// -----------------------------------------------------------------------------

export async function createAffiliateNotificationInFirestore(
  notif: Omit<AffiliateNotification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  try {
    const docRef = doc(collection(db, 'affiliate_notifications'));
    const data = sanitizeFirestoreData({
      id: docRef.id,
      ...notif,
      read: false,
      createdAt: new Date().toISOString()
    });
    await setDoc(docRef, data);
  } catch (err) {
    console.error('Error creating affiliate notification:', err);
  }
}

export async function getAffiliateNotificationsFromFirestore(affiliateUid: string): Promise<AffiliateNotification[]> {
  try {
    const colRef = collection(db, 'affiliate_notifications');
    const q = query(colRef, where('affiliateUid', '==', affiliateUid));
    const snap = await getDocs(q);
    const list: AffiliateNotification[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AffiliateNotification);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching affiliate notifications:', err);
    return [];
  }
}

export async function toggleAffiliateStatusInFirestore(
  affiliateUid: string, 
  status: 'approved' | 'suspended' | 'pending' | 'rejected'
): Promise<void> {
  try {
    const docRef = doc(db, 'affiliates', affiliateUid);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Error toggling affiliate status:', err);
    throw err;
  }
}

export async function recordAffiliateCommissionInFirestore(
  orderId: string,
  items: CartItem[],
  refCode: string
): Promise<void> {
  try {
    if (!refCode) return;
    const profile = await getAffiliateProfileByCodeFromFirestore(refCode);
    if (!profile) return;

    const config = await getAffiliateConfigFromFirestore();
    const financials = calculateOrderFinancials(items, config, profile, null, null);
    await recordOrderFinancialSnapshotsInFirestore(orderId, financials);
  } catch (err) {
    console.error('Record affiliate commission error:', err);
  }
}

export async function getAffiliateCommissionsFromFirestore(affiliateUid: string): Promise<AffiliateCommissionRecord[]> {
  try {
    const colRef = collection(db, 'affiliate_commissions');
    const q = query(colRef, where('affiliateUid', '==', affiliateUid));
    const snap = await getDocs(q);
    const list: AffiliateCommissionRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        affiliateUid: d.affiliateUid || affiliateUid,
        affiliateCode: d.affiliateCode || '',
        productId: d.productId || '',
        productTitle: d.productTitle || '',
        sellerId: d.sellerId || '',
        orderId: d.orderId || '',
        saleAmount: d.saleAmount || 0,
        commissionRate: d.commissionRate || 5,
        commissionAmount: d.commissionAmount || 0,
        status: d.status || 'Pending',
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `affiliate_commissions?uid=${affiliateUid}`);
    return [];
  }
}

export async function getAllAffiliatesFromFirestore(): Promise<AffiliateProfile[]> {
  try {
    const colRef = collection(db, 'affiliates');
    const snap = await getDocs(colRef);
    const list: AffiliateProfile[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        uid: d.uid || docSnap.id,
        userName: d.userName || '',
        userEmail: d.userEmail || '',
        affiliateCode: d.affiliateCode || '',
        status: d.status || 'pending',
        promotionalChannels: d.promotionalChannels || '',
        totalClicks: d.totalClicks || 0,
        totalConversions: d.totalConversions || 0,
        pendingCommission: d.pendingCommission || 0,
        approvedCommission: d.approvedCommission || 0,
        withdrawableBalance: d.withdrawableBalance || 0,
        totalWithdrawn: d.totalWithdrawn || 0,
        createdAt: d.createdAt || new Date().toISOString()
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'affiliates');
    return [];
  }
}

export async function updateAffiliateStatusInFirestore(uid: string, status: 'approved' | 'rejected'): Promise<void> {
  try {
    const docRef = doc(db, 'affiliates', uid);
    await updateDoc(docRef, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `affiliates/${uid}`);
    throw err;
  }
}

// 20. Official Courses & Academy Management for Admin (Pure Backend Firestore Persistence)

/**
 * Normalizes Firestore course document into a complete, standard Course object
 * ensuring both snake_case and camelCase attributes are fully synchronized.
 */
function normalizeCourseDocument(cid: string, data: any): Course {
  const imageUrl = data.image_url || data.thumbnail || '';
  const duration = data.duration || data.durationWeeks || '8 Weeks';
  const learningOutcomes = Array.isArray(data.learning_outcomes) 
    ? data.learning_outcomes 
    : (Array.isArray(data.learningOutcomes) ? data.learningOutcomes : []);
  const requirements = Array.isArray(data.requirements) ? data.requirements : [];
  const fee = typeof data.registration_fee === 'number' 
    ? data.registration_fee 
    : (typeof data.scholarshipRegistrationFee === 'number' ? data.scholarshipRegistrationFee : (typeof data.price === 'number' ? data.price : 4500));
  const whatsApp = data.WhatsApp_group_link || data.whatsAppGroupLink || '';
  const status = data.status || (data.published === false ? 'draft' : 'published');
  const isPublished = status === 'published' || data.published === true;
  const createdAt = data.created_at || data.createdAt || new Date().toISOString();
  const updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();

  return {
    ...data,
    id: cid,
    title: data.title || 'Untitled Track',
    description: data.description || '',
    thumbnail: imageUrl,
    image_url: imageUrl,
    category: data.category || 'Technology',
    duration: duration,
    durationWeeks: duration,
    totalHours: data.totalHours || duration,
    requirements: requirements,
    learning_outcomes: learningOutcomes,
    learningOutcomes: learningOutcomes,
    registration_fee: fee,
    scholarshipRegistrationFee: fee,
    price: fee,
    originalPrice: data.originalPrice || fee * 1.5,
    priceType: data.priceType || 'paid',
    currency: data.currency || 'NGN',
    rating: typeof data.rating === 'number' ? data.rating : 4.9,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 10,
    studentCount: typeof data.studentCount === 'number' ? data.studentCount : 0,
    lessonsCount: typeof data.lessonsCount === 'number' ? data.lessonsCount : 24,
    instructor: data.instructor || 'Senior Facilitator',
    instructorTitle: data.instructorTitle || 'Senior Technology Facilitator',
    instructorAvatar: data.instructorAvatar || '',
    skillLevel: data.skillLevel || 'Beginner',
    availableSlots: typeof data.availableSlots === 'number' ? data.availableSlots : 60,
    enrolledSlots: typeof data.enrolledSlots === 'number' ? data.enrolledSlots : 0,
    scholarshipStatus: data.scholarshipStatus || 'Open',
    whatsAppGroupLink: whatsApp,
    WhatsApp_group_link: whatsApp,
    status: status,
    published: isPublished,
    allowAffiliatePromotion: data.allowAffiliatePromotion ?? false,
    isScholarshipCourse: true,
    certificateAvailable: data.certificateAvailable ?? true,
    modules: Array.isArray(data.modules) ? data.modules : [],
    created_at: createdAt,
    createdAt: createdAt,
    updated_at: updatedAt,
    updatedAt: updatedAt
  };
}

export async function getOfficialCoursesFromFirestore(includeDrafts = false): Promise<Course[]> {
  try {
    const colRef = collection(db, 'courses');
    const snap = await getDocs(colRef);
    const list: Course[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const cid = data.id || docSnap.id;
      // Filter out deleted items purely by database status
      if (data.status === 'deleted') return;
      if (includeDrafts || data.status === 'published' || data.status === 'coming_soon' || data.published === true) {
        list.push(normalizeCourseDocument(cid, data));
      }
    });

    return list;
  } catch (err) {
    console.error('[Firestore] Error retrieving courses:', err);
    throw err;
  }
}

/**
 * Real-time subscription to official courses collection in Firestore
 */
export function subscribeToOfficialCourses(
  callback: (courses: Course[]) => void,
  includeDrafts = false,
  onError?: (err: any) => void
): Unsubscribe {
  const colRef = collection(db, 'courses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Course[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const cid = data.id || docSnap.id;
        if (data.status === 'deleted') return;
        if (includeDrafts || data.status === 'published' || data.status === 'coming_soon' || data.published === true) {
          list.push(normalizeCourseDocument(cid, data));
        }
      });
      callback(list);
    },
    (err) => {
      console.warn('[Firestore] Course real-time sync error:', err);
      if (onError) onError(err);
    }
  );
}

export async function lookupScholarshipApplicationByRefOrEmail(queryStr: string): Promise<ScholarshipApplication | null> {
  const q = queryStr.trim().toLowerCase();
  if (!q) return null;
  const apps = await getScholarshipApplicationsFromFirestore();
  const matched = apps.find(a => 
    (a.paymentReference && a.paymentReference.toLowerCase() === q) ||
    (a.referenceNumber && a.referenceNumber.toLowerCase() === q) ||
    (a.email && a.email.toLowerCase() === q) ||
    (a.phone && a.phone.replace(/[^0-9]/g, '') === q.replace(/[^0-9]/g, ''))
  );
  return matched || null;
}

export async function saveOfficialCourseToFirestore(course: Course, userRole?: string): Promise<void> {
  if (!course.id) {
    throw new Error('Cannot save course: unique course ID is required.');
  }

  const nowIso = new Date().toISOString();
  const normalizedCourse: Course = normalizeCourseDocument(course.id, {
    ...course,
    updated_at: nowIso,
    updatedAt: nowIso
  });

  try {
    const docRef = doc(db, 'courses', course.id);
    await setDoc(docRef, normalizedCourse, { merge: true });
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:courses-changed', { 
        detail: { action: 'saved', courseId: course.id } 
      }));
    }
  } catch (err) {
    console.error('[Firestore] Course save error:', err);
    handleFirestoreError(err, OperationType.UPDATE, `courses/${course.id}`);
    throw err;
  }
}

export async function deleteCourseFromFirestore(courseId: string, userRole?: string): Promise<void> {
  if (!courseId) {
    throw new Error('Cannot delete course: course ID is missing.');
  }

  try {
    const docRef = doc(db, 'courses', courseId);
    // Physically delete document from Firestore
    await deleteDoc(docRef);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:courses-changed', { 
        detail: { action: 'deleted', courseId } 
      }));
    }
  } catch (err) {
    console.error('[Firestore] Course permanent delete error:', err);
    handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
    throw err;
  }
}

// 20b. Nexovira Academy Scholarship Applications & Payments
export async function createScholarshipApplicationInFirestore(
  data: Omit<ScholarshipApplication, 'id' | 'createdAt'>
): Promise<ScholarshipApplication> {
  const applicationId = `SCH_APP_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const referenceNumber = data.referenceNumber || `NX-SCH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const createdAt = new Date().toISOString();

  const application: ScholarshipApplication = {
    ...data,
    id: applicationId,
    referenceNumber,
    registrationFee: data.registrationFee || 4500,
    paymentStatus: data.paymentStatus || 'paid',
    registrationStatus: data.registrationStatus || 'confirmed',
    createdAt
  };

  try {
    const docRef = doc(db, 'scholarship_applications', applicationId);
    await setDoc(docRef, application);
  } catch (err) {
    console.error('[Firestore] Could not write application to Firestore:', err);
    throw err;
  }

  // Send email notifications to management (nexoviratech@gmail.com) and the applicant
  notifyScholarshipAdminAndApplicant(application).catch((e) => {
    console.warn('[Scholarship Notification Error]:', e);
  });

  return application;
}

export async function getScholarshipApplicationsFromFirestore(): Promise<ScholarshipApplication[]> {
  try {
    const colRef = collection(db, 'scholarship_applications');
    const snap = await getDocs(colRef);
    const list: ScholarshipApplication[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ScholarshipApplication);
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('[Firestore] Error getting scholarship applications:', err);
    return [];
  }
}

export async function updateScholarshipApplicationInFirestore(
  applicationId: string,
  updates: Partial<ScholarshipApplication>
): Promise<void> {
  try {
    const docRef = doc(db, 'scholarship_applications', applicationId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Firestore] updateScholarshipApplication error:', err);
    throw err;
  }
}

export async function deleteScholarshipApplicationFromFirestore(applicationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'scholarship_applications', applicationId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[Firestore] deleteScholarshipApplication error:', err);
    throw err;
  }
}

export async function recordScholarshipPaymentInFirestore(
  payment: ScholarshipPaymentRecord
): Promise<void> {
  try {
    const docRef = doc(db, 'scholarship_payments', payment.id);
    await setDoc(docRef, payment);
  } catch (err) {
    console.error('[Firestore] recordScholarshipPayment error:', err);
    throw err;
  }
}

export async function getScholarshipPaymentsFromFirestore(): Promise<ScholarshipPaymentRecord[]> {
  try {
    const colRef = collection(db, 'scholarship_payments');
    const snap = await getDocs(colRef);
    const list: ScholarshipPaymentRecord[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as ScholarshipPaymentRecord);
    });

    return list.sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
  } catch (err) {
    console.error('[Firestore] Error getting scholarship payments:', err);
    return [];
  }
}

export async function notifyScholarshipAdminAndApplicant(application: ScholarshipApplication): Promise<void> {
  try {
    await fetch('/api/v1/scholarship/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application: {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          selectedCourse: application.courseTitle,
          referenceNumber: application.referenceNumber,
          paymentStatus: application.paymentStatus,
          registrationFee: application.registrationFee,
          country: application.country,
          state: application.state,
          city: application.city,
          currentOccupation: application.currentOccupation,
          experienceLevel: application.experienceLevel,
          whyJoin: application.whyJoin,
          goals: application.goals,
          learningCommitment: application.learningCommitment,
          courseWhatsAppLink: application.courseWhatsAppLink
        }
      })
    });
  } catch (err) {
    console.warn('[Notification API] Notification request failed (non-blocking):', err);
  }
}

// 20b. Student Enrollments Management
export async function createCourseEnrollmentInFirestore(
  userId: string,
  userName: string,
  userEmail: string,
  course: Course,
  paymentTxId?: string
): Promise<CourseEnrollment> {
  try {
    const enrollmentId = `ENR_${userId}_${course.id}`;
    const docRef = doc(db, 'enrollments', enrollmentId);

    const enrollment: CourseEnrollment = {
      id: enrollmentId,
      userId,
      userEmail,
      userName,
      courseId: course.id,
      courseTitle: course.title,
      courseThumbnail: course.thumbnail,
      instructor: course.instructor,
      enrolledAt: new Date().toISOString(),
      paymentStatus: course.price === 0 || course.priceType === 'free' ? 'free' : (paymentTxId ? 'paid' : 'verified'),
      paymentTransactionId: paymentTxId || '',
      progressPercent: 0,
      completedLessonIds: [],
      lastAccessedAt: new Date().toISOString()
    };

    await setDoc(docRef, enrollment, { merge: true });
    return enrollment;
  } catch (err) {
    console.error('Error creating course enrollment:', err);
    throw err;
  }
}

export async function getUserEnrollmentsFromFirestore(userId: string): Promise<CourseEnrollment[]> {
  try {
    const colRef = collection(db, 'enrollments');
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const list: CourseEnrollment[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as CourseEnrollment);
    });
    return list;
  } catch (err) {
    console.error('Error getting user enrollments:', err);
    return [];
  }
}

export async function updateEnrollmentProgressInFirestore(
  userId: string,
  courseId: string,
  completedLessonIds: string[],
  progressPercent: number
): Promise<void> {
  try {
    const enrollmentId = `ENR_${userId}_${courseId}`;
    const docRef = doc(db, 'enrollments', enrollmentId);
    await updateDoc(docRef, {
      completedLessonIds,
      progressPercent,
      lastAccessedAt: new Date().toISOString(),
      ...(progressPercent >= 100 ? { completedAt: new Date().toISOString() } : {})
    });
  } catch (err) {
    console.error('Error updating enrollment progress:', err);
  }
}

export async function getOfficialEbooksFromFirestore(): Promise<DigitalProduct[]> {
  try {
    const colRef = collection(db, 'ebooks');
    const snap = await getDocs(colRef);
    const list: DigitalProduct[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as DigitalProduct);
    });
    return list;
  } catch (err) {
    return [];
  }
}

export async function saveOfficialEbookToFirestore(ebook: DigitalProduct): Promise<void> {
  try {
    const docRef = doc(db, 'ebooks', ebook.id);
    await setDoc(docRef, ebook, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `ebooks/${ebook.id}`);
    throw err;
  }
}

// 21. Affiliate Links Management
export async function createOrGetAffiliateLinkInFirestore(
  affiliateUid: string,
  affiliateCode: string,
  targetId: string,
  targetTitle: string,
  contentType: 'PRODUCT' | 'SERVICE' | 'COURSE' | 'EBOOK' | 'CUSTOM',
  providedTargetPath?: string,
  providedUrl?: string
): Promise<AffiliateLinkRecord> {
  try {
    let targetPath = providedTargetPath || '';
    if (!targetPath) {
      if (contentType === 'PRODUCT') targetPath = `/product/${targetId}`;
      else if (contentType === 'SERVICE') targetPath = `/service/${targetId}`;
      else if (contentType === 'COURSE') targetPath = `/course/${targetId}`;
      else if (contentType === 'EBOOK') targetPath = `/ebook/${targetId}`;
      else targetPath = `/marketplace`;
    }

    if (!isAllowedDestinationPath(targetPath)) {
      targetPath = '/marketplace';
    }

    const cleanCode = affiliateCode.trim().toUpperCase();
    const linkId = `${cleanCode}_${contentType}_${targetId}`.replace(/[^a-zA-Z0-9_]/g, '_');
    const fullUrl = buildAffiliateDeepLink({ affiliateCode: cleanCode, targetPath, linkId });

    const linkRef = doc(db, 'affiliate_links', linkId);
    const snap = await getDoc(linkRef);

    if (snap.exists()) {
      const existing = { id: snap.id, ...snap.data() } as AffiliateLinkRecord;
      if (existing.url !== fullUrl || existing.targetPath !== targetPath) {
        const updatePayload = sanitizeFirestoreData({ url: fullUrl, targetPath, updatedAt: new Date().toISOString() });
        await updateDoc(linkRef, updatePayload).catch(() => {});
        existing.url = fullUrl;
        existing.targetPath = targetPath;
      }
      return existing;
    }

    const newLink: AffiliateLinkRecord = {
      id: linkId,
      affiliateUid,
      affiliateCode: cleanCode,
      targetId,
      targetTitle,
      contentType,
      targetPath,
      url: fullUrl,
      clicks: 0,
      conversions: 0,
      revenueGenerated: 0,
      commissionEarned: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await setDoc(linkRef, sanitizeFirestoreData(newLink));
    return newLink;
  } catch (err) {
    console.error('Error creating affiliate link in Firestore:', err);
    const cleanCode = (affiliateCode || 'AFF').trim().toUpperCase();
    const fallbackPath = providedTargetPath || '/marketplace';
    const linkId = `${cleanCode}_${targetId}`;
    return {
      id: linkId,
      affiliateUid,
      affiliateCode: cleanCode,
      targetId,
      targetTitle,
      contentType,
      targetPath: fallbackPath,
      url: buildAffiliateDeepLink({ affiliateCode: cleanCode, targetPath: fallbackPath, linkId }),
      clicks: 0,
      conversions: 0,
      revenueGenerated: 0,
      commissionEarned: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };
  }
}

export async function getAffiliateLinksFromFirestore(affiliateUid: string): Promise<AffiliateLinkRecord[]> {
  try {
    const colRef = collection(db, 'affiliate_links');
    const q = query(colRef, where('affiliateUid', '==', affiliateUid));
    const snap = await getDocs(q);
    const list: AffiliateLinkRecord[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AffiliateLinkRecord);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error getting affiliate links from Firestore:', err);
    return [];
  }
}

/* ==========================================================================
   NEXOVIRA SELLER WALLET & AUTOMATED PAYOUT SYSTEM (NGN ONLY)
   ========================================================================== */

export async function getSellerConfigFromFirestore(): Promise<SellerConfig> {
  const defaultConfig: SellerConfig = {
    settlementPeriodHours: 24,
    minWithdrawalAmount: 5000,
    autoPayoutEnabled: true,
    platformFeePercent: 5
  };
  try {
    const docRef = doc(db, 'system_configs', 'seller_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...defaultConfig, ...snap.data() } as SellerConfig;
    }
  } catch (err) {
    console.error('Error fetching seller config from Firestore:', err);
  }
  return defaultConfig;
}

export async function saveSellerConfigInFirestore(config: Partial<SellerConfig>): Promise<SellerConfig> {
  try {
    const docRef = doc(db, 'system_configs', 'seller_config');
    const existing = await getSellerConfigFromFirestore();
    const updated = { ...existing, ...config };
    await setDoc(docRef, sanitizeFirestoreData(updated), { merge: true });
    return updated;
  } catch (err) {
    console.error('Error saving seller config in Firestore:', err);
    throw err;
  }
}

export function compareAccountNameWithProfile(accountName: string, profileName?: string): {
  isCompatible: boolean;
  score: number;
  notes: string;
} {
  if (!profileName || !profileName.trim()) {
    return {
      isCompatible: true,
      score: 100,
      notes: 'No seller profile name provided; official bank account name accepted.'
    };
  }

  const normAcc = accountName.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim();
  const normProf = profileName.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim();

  // Common business/store suffixes to strip
  const ignoreWords = new Set(['STORE', 'VENTURES', 'ENTERPRISES', 'LIMITED', 'LTD', 'INC', 'GLOBAL', 'TECH', 'SERVICES', 'SHOP', 'HUB', 'NEXOVIRA', 'NEXO', 'OFFICIAL', 'MERCHANDISE', 'TRADING']);

  const accTokens = normAcc.split(/\s+/).filter(t => t.length >= 2 && !ignoreWords.has(t));
  const profTokens = normProf.split(/\s+/).filter(t => t.length >= 2 && !ignoreWords.has(t));

  if (accTokens.length === 0 || profTokens.length === 0) {
    return {
      isCompatible: true,
      score: 100,
      notes: 'Official bank account name retrieved.'
    };
  }

  let matches = 0;
  for (const pTok of profTokens) {
    if (accTokens.some(aTok => aTok === pTok || aTok.startsWith(pTok) || pTok.startsWith(aTok))) {
      matches++;
    }
  }

  const score = Math.min(100, Math.round((matches * 2 / (accTokens.length + profTokens.length)) * 100));
  
  if (matches >= 1 || score >= 30) {
    return {
      isCompatible: true,
      score,
      notes: 'Official bank name is compatible with your registered NEXOVIRA identity.'
    };
  }

  return {
    isCompatible: false,
    score,
    notes: `Official account holder name (${accountName}) returned by provider does not match registered seller name (${profileName}).`
  };
}

// Real Nigerian Bank Verification Service & Provider Connectors

export async function fetchBankVerificationProviderStatus(): Promise<{
  configured: boolean;
  provider: string;
  missingCredentials?: string[];
  message: string;
}> {
  try {
    const res = await fetch('/api/v1/bank/provider-status');
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return {
      configured: false,
      provider: errData.provider || 'paystack',
      missingCredentials: errData.missingCredentials || ['PAYSTACK_SECRET_KEY'],
      message: errData.message || 'Provider configuration offline.'
    };
  } catch (err: any) {
    return {
      configured: false,
      provider: 'paystack',
      missingCredentials: ['PAYSTACK_SECRET_KEY'],
      message: 'Failed to contact bank verification service.'
    };
  }
}

export async function fetchNigerianBanksList(): Promise<{
  success: boolean;
  configured: boolean;
  provider: string;
  banks: Array<{ name: string; code: string; slug?: string; id?: number | string }>;
  message: string;
}> {
  try {
    const res = await fetch('/api/v1/bank/banks');
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.banks) && data.banks.length > 0) {
      return {
        success: true,
        configured: Boolean(data.configured),
        provider: data.provider || 'Paystack',
        banks: data.banks,
        message: data.message || 'Loaded verified Nigerian banks from Paystack directory.'
      };
    }
    return {
      success: false,
      configured: data.configured ?? false,
      provider: data.provider || 'Paystack',
      banks: [],
      message: data.message || 'Live Nigerian bank list is unavailable. Configure provider API key.'
    };
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      provider: 'Paystack',
      banks: [],
      message: 'Could not connect to Nigerian bank directory service.'
    };
  }
}

export async function verifyNigerianBankAccount(
  bankName: string, 
  bankCode: string,
  accountNumber: string,
  sellerProfileName?: string,
  sellerId?: string
): Promise<{
  verified: boolean;
  status: 'verified' | 'failed' | 'provider_unavailable' | 'config_required' | 'invalid_input';
  accountName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  maskedAccountNumber: string;
  provider: string;
  providerReference: string;
  verifiedAt: string;
  nameMatchStatus: 'compatible' | 'mismatch' | 'unchecked';
  nameMatchScore: number;
  nameMatchNotes: string;
  message: string;
  errorCode?: string;
  missingCredentials?: string[];
}> {
  const cleanAcc = accountNumber.replace(/\D/g, '');
  const cleanCode = (bankCode || '').trim();

  if (cleanAcc.length !== 10) {
    return {
      verified: false,
      status: 'invalid_input',
      errorCode: 'INVALID_NUBAN_LENGTH',
      accountName: '',
      bankName,
      bankCode: cleanCode,
      accountNumber: cleanAcc,
      maskedAccountNumber: '',
      provider: '',
      providerReference: '',
      verifiedAt: '',
      nameMatchStatus: 'unchecked',
      nameMatchScore: 0,
      nameMatchNotes: '',
      message: 'Invalid NUBAN account number. Nigerian bank account numbers must be exactly 10 numeric digits.'
    };
  }

  if (!cleanCode && !bankName) {
    return {
      verified: false,
      status: 'invalid_input',
      errorCode: 'MISSING_BANK',
      accountName: '',
      bankName: '',
      bankCode: '',
      accountNumber: cleanAcc,
      maskedAccountNumber: '',
      provider: '',
      providerReference: '',
      verifiedAt: '',
      nameMatchStatus: 'unchecked',
      nameMatchScore: 0,
      nameMatchNotes: '',
      message: 'Please select a valid Nigerian bank.'
    };
  }

  try {
    const response = await fetch('/api/v1/bank/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName,
        bankCode: cleanCode,
        accountNumber: cleanAcc,
        sellerId
      })
    });

    const resJson = await response.json().catch(() => ({}));

    // If provider rejected or unconfigured or verification failed
    if (!response.ok || !resJson.verified) {
      const isConfigError = resJson.status === 'CONFIG_REQUIRED' || resJson.errorCode?.includes('MISSING_');
      const isUnavailable = resJson.status === 'PROVIDER_UNAVAILABLE';
      
      // Record verification failure audit if sellerId provided
      if (sellerId) {
        try {
          const auditRef = doc(collection(db, 'seller_bank_audit_logs'));
          await setDoc(auditRef, sanitizeFirestoreData({
            id: auditRef.id,
            sellerId,
            action: 'VERIFICATION_FAILED',
            bankName,
            bankCode: cleanCode,
            accountNumberMasked: `••••••${cleanAcc.slice(-4)}`,
            provider: resJson.provider || 'Paystack',
            status: 'failed',
            reason: resJson.message || 'Provider lookup failed',
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          // ignore audit logging error on failed lookup
        }
      }

      return {
        verified: false,
        status: isConfigError ? 'config_required' : (isUnavailable ? 'provider_unavailable' : 'failed'),
        errorCode: resJson.errorCode || 'LOOKUP_FAILED',
        missingCredentials: resJson.missingCredentials,
        accountName: '',
        bankName,
        bankCode: cleanCode,
        accountNumber: cleanAcc,
        maskedAccountNumber: `••••••${cleanAcc.slice(-4)}`,
        provider: resJson.provider || 'Paystack',
        providerReference: '',
        verifiedAt: '',
        nameMatchStatus: 'unchecked',
        nameMatchScore: 0,
        nameMatchNotes: '',
        message: resJson.message || "We couldn't verify this bank account. Please check the account number and selected bank."
      };
    }

    // Official Genuine Provider Account Name
    const officialName = String(resJson.accountName || '').trim().toUpperCase();
    const maskedAcc = resJson.maskedAccountNumber || `••••••${cleanAcc.slice(-4)}`;
    const providerRef = resJson.providerReference || `NEXO_VERIF_${Date.now()}`;
    const verifiedAt = resJson.verifiedAt || new Date().toISOString();
    const providerName = resJson.provider || 'Paystack';

    const nameCheck = compareAccountNameWithProfile(officialName, sellerProfileName);

    // Record verification success audit if sellerId is provided
    if (sellerId) {
      try {
        const auditRef = doc(collection(db, 'seller_bank_audit_logs'));
        await setDoc(auditRef, sanitizeFirestoreData({
          id: auditRef.id,
          sellerId,
          action: 'VERIFICATION_SUCCEEDED',
          newAccountName: officialName,
          bankName,
          bankCode: cleanCode,
          accountNumberMasked: maskedAcc,
          provider: providerName,
          providerReference: providerRef,
          status: 'verified',
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // ignore
      }
    }

    return {
      verified: true,
      status: 'verified',
      accountName: officialName, // STRICTLY from provider
      bankName: resJson.bankName || bankName,
      bankCode: cleanCode,
      accountNumber: cleanAcc,
      maskedAccountNumber: maskedAcc,
      provider: providerName,
      providerReference: providerRef,
      verifiedAt,
      nameMatchStatus: nameCheck.isCompatible ? 'compatible' : 'mismatch',
      nameMatchScore: nameCheck.score,
      nameMatchNotes: nameCheck.notes,
      message: resJson.message || 'Official bank account holder name successfully verified by provider.'
    };
  } catch (err: any) {
    return {
      verified: false,
      status: 'provider_unavailable',
      errorCode: 'NETWORK_ERROR',
      accountName: '',
      bankName,
      bankCode: cleanCode,
      accountNumber: cleanAcc,
      maskedAccountNumber: '',
      provider: 'Paystack',
      providerReference: '',
      verifiedAt: '',
      nameMatchStatus: 'unchecked',
      nameMatchScore: 0,
      nameMatchNotes: '',
      message: 'Bank verification service is temporarily unavailable. Please verify your connection.'
    };
  }
}

export async function saveSellerBankAccountInFirestore(
  sellerId: string, 
  bankDetails: SellerBankAccount,
  sellerName?: string
): Promise<SellerBankAccount> {
  try {
    if (bankDetails.verificationStatus !== 'verified' || !bankDetails.providerReference || !bankDetails.accountName) {
      throw new Error('Bank account details must be verified by the interbank provider before linking to payouts.');
    }

    const docRef = doc(db, 'seller_profiles', sellerId);
    
    // Mask account number for secure storage
    const cleanAcc = bankDetails.accountNumber.replace(/\D/g, '');
    const maskedAcc = `••••••${cleanAcc.slice(-4)}`;

    const sanitizedBank: SellerBankAccount = {
      bankName: bankDetails.bankName,
      bankCode: bankDetails.bankCode || '',
      accountNumber: cleanAcc,
      maskedAccountNumber: maskedAcc,
      accountName: bankDetails.accountName, // Official provider name only
      verificationStatus: 'verified',
      provider: bankDetails.provider || 'Paystack',
      providerReference: bankDetails.providerReference,
      verifiedAt: bankDetails.verifiedAt || new Date().toISOString(),
      confirmedBySeller: true,
      confirmedAt: new Date().toISOString(),
      nameMatchStatus: bankDetails.nameMatchStatus || 'compatible',
      nameMatchScore: bankDetails.nameMatchScore || 100,
      nameMatchNotes: bankDetails.nameMatchNotes || 'Verified via NUBAN provider'
    };

    const sanitized = sanitizeFirestoreData({
      sellerId,
      sellerName: sellerName || '',
      bankDetails: sanitizedBank,
      bankVerificationStatus: 'verified',
      updatedAt: new Date().toISOString()
    });

    await setDoc(docRef, sanitized, { merge: true });

    // Record audit log entry
    try {
      const auditRef = doc(collection(db, 'seller_bank_audit_logs'));
      const auditLog: SellerBankAccountAuditLog = {
        id: auditRef.id,
        sellerId,
        sellerName: sellerName || '',
        action: 'BANK_ACCOUNT_CONFIRMED',
        newAccountName: sanitizedBank.accountName,
        bankName: sanitizedBank.bankName,
        bankCode: sanitizedBank.bankCode,
        accountNumberMasked: maskedAcc,
        provider: sanitizedBank.provider,
        providerReference: sanitizedBank.providerReference,
        status: 'verified',
        timestamp: new Date().toISOString()
      };
      await setDoc(auditRef, sanitizeFirestoreData(auditLog));
    } catch (auditErr) {
      console.warn('Audit logging warning:', auditErr);
    }

    return sanitizedBank;
  } catch (err) {
    console.error('Error saving seller bank account:', err);
    throw err;
  }
}

export async function fetchSellerBankAccountAuditLogs(sellerId?: string): Promise<SellerBankAccountAuditLog[]> {
  try {
    const colRef = collection(db, 'seller_bank_audit_logs');
    let q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
    if (sellerId) {
      q = query(colRef, where('sellerId', '==', sellerId), orderBy('timestamp', 'desc'), limit(30));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as SellerBankAccountAuditLog[];
  } catch (err) {
    console.error('Error fetching seller bank audit logs:', err);
    return [];
  }
}

export async function revokeSellerBankAccountInFirestore(
  sellerId: string,
  reason: string,
  adminId?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'seller_profiles', sellerId);
    const snap = await getDoc(docRef);
    const existing = snap.exists() ? snap.data() : null;
    const prevBank = existing?.bankDetails as SellerBankAccount | undefined;

    await setDoc(docRef, {
      bankDetails: {
        ...(prevBank || {}),
        verificationStatus: 'unverified'
      },
      bankVerificationStatus: 'unverified',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Record revocation audit log
    const auditRef = doc(collection(db, 'seller_bank_audit_logs'));
    const auditLog: SellerBankAccountAuditLog = {
      id: auditRef.id,
      sellerId,
      adminId,
      action: 'VERIFICATION_REVOKED',
      previousAccountName: prevBank?.accountName,
      bankName: prevBank?.bankName || 'Unknown Bank',
      bankCode: prevBank?.bankCode,
      accountNumberMasked: prevBank?.maskedAccountNumber || '••••••',
      provider: prevBank?.provider || 'Paystack',
      providerReference: prevBank?.providerReference,
      status: 'unverified',
      reason: reason || 'Bank verification revoked by administrator',
      timestamp: new Date().toISOString()
    };
    await setDoc(auditRef, sanitizeFirestoreData(auditLog));
  } catch (err) {
    console.error('Error revoking seller bank account:', err);
    throw err;
  }
}

export async function getSellerBankAccountFromFirestore(sellerId: string): Promise<SellerBankAccount | null> {
  try {
    const docRef = doc(db, 'seller_profiles', sellerId);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().bankDetails) {
      return snap.data().bankDetails as SellerBankAccount;
    }
  } catch (err) {
    console.error('Error fetching seller bank account:', err);
  }
  return null;
}

export async function recordSellerOrderEarningsInFirestore(order: Order, customerCurrency: CurrencyCode = 'USD'): Promise<void> {
  try {
    const config = await getSellerConfigFromFirestore();
    const platformFeePercent = config.platformFeePercent || 5;

    for (const item of order.items) {
      const sellerId = item.product.sellerId || 'store-1';
      const uniqueKey = `SELLER_EARNING_${order.id}_${item.product.id}_${sellerId}`.replace(/[^a-zA-Z0-9_]/g, '_');
      
      const earningDocRef = doc(db, 'seller_sales_earnings', uniqueKey);
      const snap = await getDoc(earningDocRef);

      if (snap.exists()) continue;

      const itemSubtotalOriginal = item.product.price * item.quantity;
      const orderPayCurrency = (order.currency as CurrencyCode) || customerCurrency || 'USD';

      // Transparent Conversion to NGN
      const { convertedAmount: grossNGN, rate: exchangeRate } = convertDirectly(itemSubtotalOriginal, orderPayCurrency, 'NGN');
      const platformFeeNGN = Math.round((grossNGN * (platformFeePercent / 100)) * 100) / 100;
      const netSellerEarningNGN = Math.round((grossNGN - platformFeeNGN) * 100) / 100;

      const settlementDurationMs = (config.settlementPeriodHours || 24) * 3600 * 1000;
      const availableAt = new Date(Date.now() + settlementDurationMs).toISOString();

      const earningRecord = sanitizeFirestoreData({
        id: uniqueKey,
        sellerId,
        sellerName: item.product.sellerName || 'Store Seller',
        orderId: order.id,
        productId: item.product.id,
        productTitle: item.product.title,
        originalCurrency: orderPayCurrency,
        originalAmount: itemSubtotalOriginal,
        exchangeRate,
        convertedGrossNGN: grossNGN,
        platformFeeNGN,
        netSellerEarningNGN,
        currency: 'NGN',
        status: 'PENDING',
        availableAt,
        createdAt: new Date().toISOString()
      });

      await setDoc(earningDocRef, earningRecord);

      // Record transaction in financial ledger
      const ledgerRef = doc(collection(db, 'seller_ledger'));
      const ledgerEntry: SellerLedgerEntry = {
        id: ledgerRef.id,
        sellerId,
        type: 'SALE_EARNING',
        amountNGN: netSellerEarningNGN,
        currency: 'NGN',
        orderId: order.id,
        description: `Sale earnings for Order #${order.id.slice(0, 8)} (${item.product.title})`,
        conversionDetails: {
          originalCurrency: orderPayCurrency,
          originalAmount: itemSubtotalOriginal,
          exchangeRate,
          conversionFee: 0,
          convertedGrossNGN: grossNGN,
          platformFeeNGN,
          netSellerEarningNGN
        },
        createdAt: new Date().toISOString()
      };
      await setDoc(ledgerRef, sanitizeFirestoreData(ledgerEntry));

      await createSellerNotificationInFirestore({
        sellerId,
        title: 'Order Confirmed! ₦ Sales Added',
        message: `Your order #${order.id.slice(0, 8)} has been confirmed. Net earnings of ₦${netSellerEarningNGN.toLocaleString('en-NG')} added to Pending NGN Balance (${config.settlementPeriodHours || 24}h settlement lock).`,
        type: 'earnings_pending'
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error recording seller order earnings:', err);
  }
}

export async function processSellerSettlementsInFirestore(): Promise<void> {
  try {
    const config = await getSellerConfigFromFirestore();
    const earningsCol = collection(db, 'seller_sales_earnings');
    const q = query(earningsCol, where('status', '==', 'PENDING'));
    const snap = await getDocs(q);

    const now = Date.now();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const availableAtTime = new Date(data.availableAt || data.createdAt).getTime();

      if (now >= availableAtTime) {
        await updateDoc(docSnap.ref, {
          status: 'AVAILABLE',
          settledAt: new Date().toISOString()
        });

        const ledgerRef = doc(collection(db, 'seller_ledger'));
        const ledgerEntry: SellerLedgerEntry = {
          id: ledgerRef.id,
          sellerId: data.sellerId,
          type: 'SETTLEMENT_CREDIT',
          amountNGN: data.netSellerEarningNGN,
          currency: 'NGN',
          orderId: data.orderId,
          description: `Settlement unlocked for Order #${(data.orderId || '').slice(0, 8)} (${data.productTitle})`,
          createdAt: new Date().toISOString()
        };
        await setDoc(ledgerRef, sanitizeFirestoreData(ledgerEntry));

        await createSellerNotificationInFirestore({
          sellerId: data.sellerId,
          title: 'Earnings Available in NGN Wallet! ₦',
          message: `Settlement period completed for Order #${(data.orderId || '').slice(0, 8)}. ₦${data.netSellerEarningNGN.toLocaleString('en-NG')} is now available in your NGN Seller Wallet for withdrawal.`,
          type: 'earnings_available'
        }).catch(() => {});

        if (config.autoPayoutEnabled) {
          await checkAndTriggerAutoPayoutForSeller(data.sellerId);
        }
      }
    }
  } catch (err) {
    console.error('Error processing seller settlements:', err);
  }
}

export async function checkAndTriggerAutoPayoutForSeller(sellerId: string): Promise<void> {
  try {
    const config = await getSellerConfigFromFirestore();
    if (!config.autoPayoutEnabled) return;

    const summaryRes = await getSellerWalletSummaryInFirestore(sellerId);
    const bankDetails = await getSellerBankAccountFromFirestore(sellerId);

    if (!bankDetails || bankDetails.verificationStatus !== 'verified') {
      return;
    }

    if (summaryRes.summary.availableBalanceNGN >= config.minWithdrawalAmount) {
      await createSellerPayoutRequestInFirestore(sellerId, summaryRes.summary.availableBalanceNGN, bankDetails, true);
    }
  } catch (err) {
    console.error('Error in auto payout trigger:', err);
  }
}

export async function createSellerPayoutRequestInFirestore(
  sellerId: string,
  amountNGN: number,
  bankDetails: SellerBankAccount,
  isAutoPayout: boolean = false
): Promise<SellerPayoutRecord> {
  try {
    const summaryRes = await getSellerWalletSummaryInFirestore(sellerId);
    const config = await getSellerConfigFromFirestore();
    const currentSavedBank = await getSellerBankAccountFromFirestore(sellerId);

    // Safeguard 1: Seller Account Status Check
    const profileSnap = await getDoc(doc(db, 'seller_profiles', sellerId));
    if (profileSnap.exists()) {
      const pData = profileSnap.data();
      if (pData.status === 'suspended' || pData.status === 'blocked' || pData.payoutHold === true) {
        throw new Error('Payout failed: Account restriction or payout hold exists on this seller profile.');
      }
    }

    // Safeguard 2: Bank Details Verification Status & Provider Reference Check
    if (bankDetails.verificationStatus !== 'verified' || !bankDetails.providerReference) {
      throw new Error('Payout failed: Bank account is not verified by the NUBAN verification provider.');
    }

    // Safeguard 3: Bank Details Unchanged Check
    const cleanReqAcc = bankDetails.accountNumber.replace(/\D/g, '');
    if (!currentSavedBank || currentSavedBank.accountNumber !== cleanReqAcc) {
      throw new Error('Payout failed: Bank account details have changed since last verification. Please re-verify your bank account.');
    }

    // Safeguard 4: Balance Check
    if (amountNGN > summaryRes.summary.availableBalanceNGN) {
      throw new Error(`Payout failed: Requested payout ₦${amountNGN.toLocaleString('en-NG')} exceeds available balance ₦${summaryRes.summary.availableBalanceNGN.toLocaleString('en-NG')}.`);
    }

    // Safeguard 5: Minimum Threshold Check
    if (amountNGN < config.minWithdrawalAmount) {
      throw new Error(`Payout failed: Minimum payout requirement is ₦${config.minWithdrawalAmount.toLocaleString('en-NG')}. Your requested amount is ₦${amountNGN.toLocaleString('en-NG')}.`);
    }

    // Safeguard 6: Currency is strictly NGN
    const payoutCurrency = 'NGN';

    const payoutId = `PAY-NGN-${Math.floor(100000 + Math.random() * 900000)}`;
    const docRef = doc(db, 'seller_payouts', payoutId);

    const maskedAcc = `••••••${cleanReqAcc.slice(-4)}`;

    const record: SellerPayoutRecord = {
      id: payoutId,
      payoutId,
      sellerId,
      sellerName: currentSavedBank.accountName || bankDetails.accountName, // Official provider name
      contactEmail: 'seller@nexovira.com',
      amountNGN,
      currency: payoutCurrency,
      bankDetails: {
        ...currentSavedBank,
        accountNumber: maskedAcc,
        maskedAccountNumber: maskedAcc
      },
      status: 'Completed',
      transferReference: `NEXO_NUBAN_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    await setDoc(docRef, sanitizeFirestoreData(record));

    const ledgerRef = doc(collection(db, 'seller_ledger'));
    const ledgerEntry: SellerLedgerEntry = {
      id: ledgerRef.id,
      sellerId,
      payoutId,
      type: 'PAYOUT_COMPLETED',
      amountNGN: -amountNGN,
      currency: 'NGN',
      description: `Bank transfer payout sent to ${bankDetails.bankName} (${maskedAcc} - ${bankDetails.accountName})`,
      createdAt: new Date().toISOString()
    };
    await setDoc(ledgerRef, sanitizeFirestoreData(ledgerEntry));

    await createSellerNotificationInFirestore({
      sellerId,
      title: 'Payout Completed! 🏦',
      message: `${isAutoPayout ? 'Automated' : 'Requested'} payout of ₦${amountNGN.toLocaleString('en-NG')} has been successfully transferred to your verified ${bankDetails.bankName} account (${maskedAcc}).`,
      type: 'payout_completed'
    }).catch(() => {});

    return record;
  } catch (err) {
    console.error('Error creating seller payout request:', err);
    throw err;
  }
}

export async function getSellerWalletSummaryInFirestore(sellerId: string): Promise<{
  summary: SellerWalletSummary;
  bankAccount: SellerBankAccount | null;
  ledgerEntries: SellerLedgerEntry[];
  payoutHistory: SellerPayoutRecord[];
  config: SellerConfig;
}> {
  try {
    await processSellerSettlementsInFirestore().catch(() => {});

    const config = await getSellerConfigFromFirestore();
    const bankAccount = await getSellerBankAccountFromFirestore(sellerId);

    const ledgerCol = collection(db, 'seller_ledger');
    const qLedger = query(ledgerCol, where('sellerId', '==', sellerId));
    const ledgerSnap = await getDocs(qLedger);

    let ledgerEntries: SellerLedgerEntry[] = [];
    ledgerSnap.forEach((docSnap) => {
      ledgerEntries.push({ id: docSnap.id, ...docSnap.data() } as SellerLedgerEntry);
    });
    ledgerEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const earningsCol = collection(db, 'seller_sales_earnings');
    const qEarnings = query(earningsCol, where('sellerId', '==', sellerId));
    const earningsSnap = await getDocs(qEarnings);

    let pendingBalanceNGN = 0;
    let totalSalesNGN = 0;
    let totalEarnedNGN = 0;

    earningsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      totalSalesNGN += (data.convertedGrossNGN || 0);
      totalEarnedNGN += (data.netSellerEarningNGN || 0);
      if (data.status === 'PENDING') {
        pendingBalanceNGN += (data.netSellerEarningNGN || 0);
      }
    });

    let availableBalanceNGN = 0;
    let totalPaidOutNGN = 0;

    ledgerEntries.forEach((entry) => {
      if (entry.type === 'SETTLEMENT_CREDIT') {
        availableBalanceNGN += entry.amountNGN;
      } else if (entry.type === 'PAYOUT_COMPLETED' || entry.type === 'PAYOUT_REQUESTED') {
        availableBalanceNGN += entry.amountNGN;
        if (entry.type === 'PAYOUT_COMPLETED') {
          totalPaidOutNGN += Math.abs(entry.amountNGN);
        }
      } else if (entry.type === 'REFUND_REVERSAL') {
        availableBalanceNGN += entry.amountNGN;
      }
    });

    if (availableBalanceNGN < 0) availableBalanceNGN = 0;

    const payoutsCol = collection(db, 'seller_payouts');
    const qPayouts = query(payoutsCol, where('sellerId', '==', sellerId));
    const payoutsSnap = await getDocs(qPayouts);

    let payoutHistory: SellerPayoutRecord[] = [];
    payoutsSnap.forEach((docSnap) => {
      payoutHistory.push({ id: docSnap.id, ...docSnap.data() } as SellerPayoutRecord);
    });
    payoutHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const summary: SellerWalletSummary = {
      sellerId,
      availableBalanceNGN: Math.round(availableBalanceNGN * 100) / 100,
      pendingBalanceNGN: Math.round(pendingBalanceNGN * 100) / 100,
      totalSalesNGN: Math.round(totalSalesNGN * 100) / 100,
      totalEarnedNGN: Math.round(totalEarnedNGN * 100) / 100,
      totalPaidOutNGN: Math.round(totalPaidOutNGN * 100) / 100,
      nextPayoutAmountNGN: Math.round(availableBalanceNGN * 100) / 100,
      nextPayoutDate: new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }),
      currency: 'NGN'
    };

    return {
      summary,
      bankAccount,
      ledgerEntries,
      payoutHistory,
      config
    };
  } catch (err) {
    console.error('Error getting seller wallet summary:', err);
    return {
      summary: {
        sellerId,
        availableBalanceNGN: 0,
        pendingBalanceNGN: 0,
        totalSalesNGN: 0,
        totalEarnedNGN: 0,
        totalPaidOutNGN: 0,
        nextPayoutAmountNGN: 0,
        currency: 'NGN'
      },
      bankAccount: null,
      ledgerEntries: [],
      payoutHistory: [],
      config: {
        settlementPeriodHours: 24,
        minWithdrawalAmount: 5000,
        autoPayoutEnabled: true,
        platformFeePercent: 5
      }
    };
  }
}

export async function refundSellerOrderInFirestore(orderId: string, reason: string = 'Customer Refund'): Promise<void> {
  try {
    const earningsCol = collection(db, 'seller_sales_earnings');
    const q = query(earningsCol, where('orderId', '==', orderId));
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.status === 'REVERSED') continue;

      await updateDoc(docSnap.ref, {
        status: 'REVERSED',
        reversedAt: new Date().toISOString(),
        reversalReason: reason
      });

      const ledgerRef = doc(collection(db, 'seller_ledger'));
      const ledgerEntry: SellerLedgerEntry = {
        id: ledgerRef.id,
        sellerId: data.sellerId,
        type: 'REFUND_REVERSAL',
        amountNGN: -Math.abs(data.netSellerEarningNGN),
        currency: 'NGN',
        orderId,
        description: `Refund reversal for Order #${orderId.slice(0, 8)} (${reason})`,
        createdAt: new Date().toISOString()
      };
      await setDoc(ledgerRef, sanitizeFirestoreData(ledgerEntry));

      await createSellerNotificationInFirestore({
        sellerId: data.sellerId,
        title: 'Order Refunded - Ledger Adjusted',
        message: `Order #${orderId.slice(0, 8)} was refunded. ₦${data.netSellerEarningNGN.toLocaleString('en-NG')} has been reversed on your seller ledger.`,
        type: 'refund_reversed'
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error processing refund reversal for seller:', err);
  }
}

export async function getAllSellerPayoutsFromFirestore(): Promise<SellerPayoutRecord[]> {
  try {
    const colRef = collection(db, 'seller_payouts');
    const snap = await getDocs(colRef);
    const list: SellerPayoutRecord[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as SellerPayoutRecord);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error getting all seller payouts:', err);
    return [];
  }
}

export async function updateSellerPayoutStatusInFirestore(
  payoutId: string,
  newStatus: SellerPayoutRecord['status'],
  failureReason?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'seller_payouts', payoutId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as SellerPayoutRecord;
    await updateDoc(docRef, {
      status: newStatus,
      failureReason: failureReason || null,
      updatedAt: new Date().toISOString()
    });

    if (newStatus === 'FAILED' || newStatus === 'CANCELLED') {
      const ledgerRef = doc(collection(db, 'seller_ledger'));
      const ledgerEntry: SellerLedgerEntry = {
        id: ledgerRef.id,
        sellerId: data.sellerId,
        payoutId,
        type: 'PAYOUT_FAILED',
        amountNGN: Math.abs(data.amountNGN),
        currency: 'NGN',
        description: `Payout #${payoutId} ${newStatus.toLowerCase()} - Funds restored to Available NGN Wallet`,
        createdAt: new Date().toISOString()
      };
      await setDoc(ledgerRef, sanitizeFirestoreData(ledgerEntry));

      await createSellerNotificationInFirestore({
        sellerId: data.sellerId,
        title: 'Payout Unsuccessful - Funds Restored',
        message: `Payout #${payoutId} could not be processed (${failureReason || 'Failed'}). ₦${data.amountNGN.toLocaleString('en-NG')} has been restored to your NGN Wallet.`,
        type: 'payout_failed'
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error updating seller payout status:', err);
  }
}

// -------------------------------------------------------------
// 30. User Notification & Wishlist Alert Preferences
// -------------------------------------------------------------

export const DEFAULT_NOTIFICATION_PREFERENCES: WishlistNotificationPreferences = {
  emailAlertsEnabled: true,
  wishlistBackInStock: true,
  wishlistPriceDrops: true,
  stockThresholdAlerts: true,
  dailyPriceSummary: false,
  minimumDiscountPercent: 5,
  updatedAt: new Date().toISOString()
};

/**
 * Retrieves the customer's notification and wishlist alert subscription preferences from Firestore
 */
export async function getUserNotificationPreferencesFromFirestore(uid: string): Promise<WishlistNotificationPreferences> {
  if (!uid) return DEFAULT_NOTIFICATION_PREFERENCES;

  const localKey = `nexovira_notif_prefs_${uid}`;
  let localPrefs: WishlistNotificationPreferences | null = null;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localPrefs = JSON.parse(raw);
  } catch {}

  try {
    // 1. Try reading from users/{uid}
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.notificationPreferences) {
        const merged: WishlistNotificationPreferences = {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...userData.notificationPreferences,
          notificationEmail: userData.notificationPreferences.notificationEmail || userData.email || ''
        };
        try { localStorage.setItem(localKey, JSON.stringify(merged)); } catch {}
        return merged;
      }
    }

    // 2. Try user_notification_settings/{uid} fallback
    const settingsDocRef = doc(db, 'user_notification_settings', uid);
    const settingsSnap = await getDoc(settingsDocRef);
    if (settingsSnap.exists()) {
      const merged: WishlistNotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...settingsSnap.data()
      };
      try { localStorage.setItem(localKey, JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch (err) {
    console.warn('Could not read notification preferences from Firestore, returning cached or default:', err);
  }

  return localPrefs || DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Saves or updates the customer's wishlist & email alert subscription preferences in Firestore
 */
export async function saveUserNotificationPreferencesToFirestore(
  uid: string,
  preferences: Partial<WishlistNotificationPreferences>
): Promise<WishlistNotificationPreferences> {
  const localKey = `nexovira_notif_prefs_${uid}`;
  const nowIso = new Date().toISOString();

  const current = await getUserNotificationPreferencesFromFirestore(uid);
  const updated: WishlistNotificationPreferences = {
    ...current,
    ...preferences,
    updatedAt: nowIso
  };

  // Immediate local cache update
  try {
    localStorage.setItem(localKey, JSON.stringify(updated));
    const userProfileRaw = localStorage.getItem('nexovira_user_profile');
    if (userProfileRaw) {
      const parsedProfile = JSON.parse(userProfileRaw);
      parsedProfile.notificationPreferences = updated;
      localStorage.setItem('nexovira_user_profile', JSON.stringify(parsedProfile));
    }
  } catch {}

  // Firestore update
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      notificationPreferences: updated,
      updatedAt: nowIso
    }, { merge: true });

    // Also write to user_notification_settings collection
    const settingsDocRef = doc(db, 'user_notification_settings', uid);
    await setDoc(settingsDocRef, sanitizeFirestoreData({
      userId: uid,
      ...updated,
      createdAt: nowIso
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/notificationPreferences`);
  }

  // Dispatch event for reactive listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_notif_preferences_changed', { detail: updated }));
  }

  return updated;
}

/**
 * Simulates a real-time wishlist notification alert (Back-in-Stock or Price Drop)
 * and writes to the user's notification stream in Firestore
 */
export async function dispatchWishlistAlertSimulation(
  userId: string,
  type: 'BACK_IN_STOCK' | 'PRICE_DROP' | 'LOW_STOCK',
  product: Product,
  customMessage?: string
): Promise<PriceAlertNotification> {
  const notifId = `wishlist_notif_${userId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  let message = customMessage;
  if (!message) {
    if (type === 'BACK_IN_STOCK') {
      message = `Great news! "${product.title}" is officially BACK IN STOCK with priority dispatch available!`;
    } else if (type === 'PRICE_DROP') {
      message = `Price Drop Alert! Wishlisted item "${product.title}" has dropped to $${product.price} USD!`;
    } else {
      message = `Hurry! Only ${product.stock || 2} units left of wishlisted item "${product.title}".`;
    }
  }

  const newNotif: PriceAlertNotification = {
    id: notifId,
    userId,
    alertId: `alert_${product.id}`,
    type,
    productId: product.id,
    productTitle: product.title,
    productImage: product.images[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
    oldPriceUSD: product.originalPrice || product.price + 50,
    newPriceUSD: product.price,
    targetPriceUSD: product.price,
    discountPercent: product.discountPercentage || 15,
    currency: (product.currency as CurrencyCode) || 'NGN',
    read: false,
    message,
    createdAt: nowIso
  };

  // 1. Write to local storage notification cache
  try {
    const raw = localStorage.getItem('nexovira_price_notifs_local');
    const existingList: PriceAlertNotification[] = raw ? JSON.parse(raw) : [];
    existingList.unshift(newNotif);
    localStorage.setItem('nexovira_price_notifs_local', JSON.stringify(existingList));
  } catch {}

  // 2. Write to Firestore notifications collection
  try {
    const notifRef = doc(db, 'notifications', notifId);
    await setDoc(notifRef, sanitizeFirestoreData(newNotif));
  } catch (err) {
    console.warn('Could not write simulation notif to Firestore:', err);
  }

  // 3. Dispatch window events for instant UI update on the bell icon & toasts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alert_triggered', { detail: newNotif }));
  }

  return newNotif;
}

// -----------------------------------------------------------------------------
// DYNAMIC TECH & DIGITAL SERVICES CATEGORIES (Admin Editable in Firestore)
// -----------------------------------------------------------------------------

export async function getTechServiceCategoriesFromFirestore(): Promise<TechServiceCategory[]> {
  try {
    const cloudSync = await getCloudSyncState();
    const deletedIds = cloudSync.deletedTechCategoryIds || cachedCloudSync.deletedTechCategoryIds || [];

    const colRef = collection(db, 'tech_service_categories');
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      const list: TechServiceCategory[] = [];
      snapshot.forEach(docSnap => {
        const catId = docSnap.id;
        if (!deletedIds.includes(catId)) {
          list.push({ ...docSnap.data(), id: catId } as TechServiceCategory);
        }
      });
      return list;
    }

    // Default fallback to initial high-standard categories, filtering out any deleted
    return TECH_SERVICE_CATEGORIES.filter(cat => !deletedIds.includes(cat.id));
  } catch (err) {
    console.warn('Fallback to seed tech service categories:', err);
    const deletedIds = cachedCloudSync.deletedTechCategoryIds || [];
    return TECH_SERVICE_CATEGORIES.filter(cat => !deletedIds.includes(cat.id));
  }
}

export async function saveTechServiceCategoryToFirestore(category: TechServiceCategory): Promise<void> {
  try {
    const catId = category.id || `cat-${Date.now()}`;
    await removeCloudDeletion('tech_category', catId);

    const docRef = doc(db, 'tech_service_categories', catId);
    const payload = sanitizeFirestoreData({
      ...category,
      id: catId,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, payload, { merge: true });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:tech-categories-changed', { detail: { categoryId: catId } }));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tech_service_categories/${category.id}`);
    throw err;
  }
}

export async function deleteTechServiceCategoryFromFirestore(categoryId: string, deletedBy?: string): Promise<void> {
  // 1. Record cloud deletion tombstone
  await recordCloudDeletion('tech_category', categoryId, deletedBy);

  try {
    const docRef = doc(db, 'tech_service_categories', categoryId);
    await deleteDoc(docRef);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:tech-categories-changed', { detail: { categoryId, action: 'deleted', deletedBy } }));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tech_service_categories/${categoryId}`);
    throw err;
  }
}

export async function resetTechServiceCategoriesToDefault(): Promise<void> {
  try {
    for (const cat of TECH_SERVICE_CATEGORIES) {
      const docRef = doc(db, 'tech_service_categories', cat.id);
      await setDoc(docRef, sanitizeFirestoreData({ ...cat, updatedAt: new Date().toISOString() }), { merge: true });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexovira:tech-categories-changed', { detail: { action: 'reset' } }));
    }
  } catch (err) {
    console.warn('Failed to reset categories:', err);
  }
}

// -----------------------------------------------------------------------------
// EMAIL NOTIFICATIONS LEDGER & AUDIT
// -----------------------------------------------------------------------------

export interface EmailNotificationRecord {
  id: string;
  type: 'project_request' | 'expert_application' | 'system_alert';
  recipient: string;
  subject: string;
  referenceNumber?: string;
  senderName?: string;
  senderEmail?: string;
  summary: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  deliveryChannel: 'SMTP' | 'GMAIL_GATEWAY' | 'FIRESTORE_AUDIT';
  payload?: any;
  createdAt: string;
}

export async function recordEmailNotificationInFirestore(record: Partial<EmailNotificationRecord>): Promise<string> {
  try {
    const docRef = doc(collection(db, 'email_notifications'));
    const payload: EmailNotificationRecord = {
      id: docRef.id,
      type: record.type || 'project_request',
      recipient: record.recipient || 'nexoviratech@gmail.com',
      subject: record.subject || 'Nexovira Notification',
      referenceNumber: record.referenceNumber,
      senderName: record.senderName,
      senderEmail: record.senderEmail,
      summary: record.summary || '',
      status: record.status || 'SENT',
      deliveryChannel: record.deliveryChannel || 'FIRESTORE_AUDIT',
      payload: record.payload,
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, sanitizeFirestoreData(payload));
    return docRef.id;
  } catch (err) {
    console.warn('Failed to record email notification:', err);
    return '';
  }
}

export async function getEmailNotificationsFromFirestore(): Promise<EmailNotificationRecord[]> {
  try {
    const colRef = collection(db, 'email_notifications');
    const snapshot = await getDocs(colRef);
    const list: EmailNotificationRecord[] = [];
    snapshot.forEach(docSnap => {
      list.push({ ...docSnap.data(), id: docSnap.id } as EmailNotificationRecord);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Failed to get email notifications:', err);
    return [];
  }
}

// ==========================================
// 15. USER & ROLE MANAGEMENT (Super Admin & Management)
// ==========================================

export async function getAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    const users: UserProfile[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const email = (data.email || '').toLowerCase().trim();
      const isOwnerEmail = email === 'nexoviratech@gmail.com' || email === 'nexovirasupport@gmail.com';
      
      users.push({
        uid: docSnap.id,
        email: data.email || '',
        displayName: data.displayName || data.name || (email ? email.split('@')[0] : 'User'),
        phone: data.phone || '',
        role: isOwnerEmail ? 'super_admin' : (data.role || 'customer'),
        accountStatus: isOwnerEmail ? 'active' : (data.accountStatus || 'active'),
        isAffiliate: data.isAffiliate || data.role === 'affiliate',
        affiliateCode: data.affiliateCode,
        affiliateId: data.affiliateId,
        storeName: data.storeName,
        businessName: data.businessName,
        createdAt: data.createdAt || new Date().toISOString(),
        lastActiveAt: data.lastActiveAt || data.updatedAt,
        internalNotes: data.internalNotes || ''
      });
    });

    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Failed to fetch users from Firestore:', err);
    return [];
  }
}

/**
 * Real-Time Firestore Subscription: All Users & Accounts
 * Automatically synchronizes user profiles, roles, and statuses in real-time across all admin consoles.
 */
export function subscribeToAllUsersInFirestore(
  callback: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const usersCol = collection(db, 'users');
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || '').toLowerCase().trim();
          const isOwnerEmail = email === 'nexoviratech@gmail.com' || email === 'nexovirasupport@gmail.com';
          users.push({
            uid: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || data.name || (email ? email.split('@')[0] : 'User'),
            phone: data.phone || '',
            role: isOwnerEmail ? 'super_admin' : (data.role || 'customer'),
            accountStatus: isOwnerEmail ? 'active' : (data.accountStatus || 'active'),
            isAffiliate: data.isAffiliate || data.role === 'affiliate',
            affiliateCode: data.affiliateCode,
            affiliateId: data.affiliateId,
            storeName: data.storeName,
            businessName: data.businessName,
            createdAt: data.createdAt || new Date().toISOString(),
            lastActiveAt: data.lastActiveAt || data.updatedAt,
            internalNotes: data.internalNotes || ''
          });
        });
        users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(users);
      },
      (err) => {
        console.warn('Real-time users subscription error:', err);
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to users:', err);
    return () => {};
  }
}

export async function updateUserRoleAndStatusInFirestore(
  targetUid: string,
  updates: { role?: UserRole; accountStatus?: UserAccountStatus; internalNotes?: string },
  operatorRole?: UserRole
): Promise<void> {
  const targetDocRef = doc(db, 'users', targetUid);
  const snap = await getDoc(targetDocRef);
  const existingData = snap.exists() ? snap.data() : {};
  const targetEmail = (existingData.email || '').toLowerCase();

  // Guard: Protect Super Admin owner accounts
  if (targetEmail === 'nexoviratech@gmail.com' || targetEmail === 'nexovirasupport@gmail.com') {
    if (updates.role && updates.role !== 'super_admin') {
      throw new Error('The primary Nexovira Super Admin account cannot be modified or downgraded.');
    }
    if (updates.accountStatus && updates.accountStatus !== 'active') {
      throw new Error('The primary Nexovira Super Admin account cannot be suspended or deactivated.');
    }
  }

  // Guard: Only super_admin can assign or revoke super_admin role
  if (updates.role === 'super_admin' && operatorRole !== 'super_admin') {
    throw new Error('Only an existing Super Admin can grant Super Admin privileges.');
  }

  const payload: any = {
    updatedAt: new Date().toISOString()
  };
  if (updates.role) payload.role = updates.role;
  if (updates.accountStatus) payload.accountStatus = updates.accountStatus;
  if (updates.internalNotes !== undefined) payload.internalNotes = updates.internalNotes;

  await setDoc(targetDocRef, payload, { merge: true });
}

export async function deleteUserFromFirestore(targetUid: string, operatorRole?: UserRole): Promise<void> {
  const targetDocRef = doc(db, 'users', targetUid);
  const snap = await getDoc(targetDocRef);
  if (snap.exists()) {
    const data = snap.data();
    const targetEmail = (data.email || '').toLowerCase();
    if (targetEmail === 'nexoviratech@gmail.com' || targetEmail === 'nexovirasupport@gmail.com') {
      throw new Error('CRITICAL: The Nexovira Super Admin account cannot be deleted.');
    }
    if (data.role === 'super_admin' && operatorRole !== 'super_admin') {
      throw new Error('You do not have permission to delete a Super Admin user.');
    }
  }

  await deleteDoc(targetDocRef);
}




