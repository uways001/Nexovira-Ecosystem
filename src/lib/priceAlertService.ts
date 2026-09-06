import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { PriceAlert, PriceAlertNotification, Product, CurrencyCode } from '../types';
import { sanitizeFirestoreData } from './firestoreService';
import { convertFromUSD, formatCurrency } from './currency';

const LOCAL_STORAGE_ALERTS_KEY = 'nexovira_price_alerts_local';
const LOCAL_STORAGE_NOTIFS_KEY = 'nexovira_price_notifs_local';

/**
 * Get local alerts fallback
 */
function getLocalPriceAlerts(userId: string): PriceAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    if (!raw) return [];
    const all: PriceAlert[] = JSON.parse(raw);
    return all.filter(a => a.userId === userId);
  } catch {
    return [];
  }
}

/**
 * Save to local alerts fallback
 */
function saveLocalPriceAlert(alert: PriceAlert): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    const all: PriceAlert[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex(a => a.id === alert.id);
    if (index >= 0) {
      all[index] = alert;
    } else {
      all.unshift(alert);
    }
    localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('[PriceAlert] Error writing local alert:', e);
  }
}

/**
 * Delete from local alerts
 */
function deleteLocalPriceAlert(alertId: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    if (!raw) return;
    const all: PriceAlert[] = JSON.parse(raw);
    const filtered = all.filter(a => a.id !== alertId);
    localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(filtered));
  } catch (_) {}
}

/**
 * Creates or updates a Target Price Alert in Firestore and local storage
 */
export async function createPriceAlertInFirestore(alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceAlert> {
  const alertId = `alert_${alertData.userId}_${alertData.productId}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newAlert: PriceAlert = {
    ...alertData,
    id: alertId,
    status: 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Always save to local storage immediately
  saveLocalPriceAlert(newAlert);

  try {
    const docRef = doc(db, 'price_alerts', alertId);
    await setDoc(docRef, sanitizeFirestoreData({
      ...newAlert,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  } catch (err) {
    console.warn('[PriceAlert] Firestore write failed, using local storage cache:', err);
  }

  // Dispatch custom event to notify active UI listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alerts_changed', { detail: newAlert }));
  }

  return newAlert;
}

/**
 * Retrieves all price alerts for a given user
 */
export async function getUserPriceAlertsFromFirestore(userId: string): Promise<PriceAlert[]> {
  if (!userId) return [];

  const localAlerts = getLocalPriceAlerts(userId);

  try {
    const q = query(
      collection(db, 'price_alerts'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteAlerts: PriceAlert[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        remoteAlerts.push({
          id: docSnap.id,
          userId: d.userId,
          userEmail: d.userEmail,
          userName: d.userName,
          productId: d.productId,
          productTitle: d.productTitle,
          productImage: d.productImage,
          productCategory: d.productCategory,
          initialPriceUSD: Number(d.initialPriceUSD || 0),
          targetPriceUSD: Number(d.targetPriceUSD || 0),
          currency: (d.currency as CurrencyCode) || 'NGN',
          targetPriceNative: Number(d.targetPriceNative || 0),
          status: d.status || 'ACTIVE',
          triggeredAt: d.triggeredAt || undefined,
          triggeredPriceUSD: d.triggeredPriceUSD ? Number(d.triggeredPriceUSD) : undefined,
          currentProductPriceUSD: d.currentProductPriceUSD ? Number(d.currentProductPriceUSD) : undefined,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt || new Date().toISOString(),
          notes: d.notes || '',
        });
      });

      // Merge and update local storage
      remoteAlerts.forEach(ra => saveLocalPriceAlert(ra));
      return remoteAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('[PriceAlert] Firestore get failed, returning local storage fallback:', err);
  }

  return localAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Deletes a target price alert
 */
export async function deletePriceAlertFromFirestore(alertId: string): Promise<void> {
  deleteLocalPriceAlert(alertId);

  try {
    await deleteDoc(doc(db, 'price_alerts', alertId));
  } catch (err) {
    console.warn('[PriceAlert] Firestore delete failed:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alerts_changed', { detail: { deletedId: alertId } }));
  }
}

/**
 * Updates a price alert threshold
 */
export async function updatePriceAlertThreshold(
  alertId: string, 
  newTargetPriceUSD: number, 
  newTargetPriceNative: number,
  currency: CurrencyCode
): Promise<void> {
  const nowIso = new Date().toISOString();

  // Update local
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
    if (raw) {
      const all: PriceAlert[] = JSON.parse(raw);
      const target = all.find(a => a.id === alertId);
      if (target) {
        target.targetPriceUSD = newTargetPriceUSD;
        target.targetPriceNative = newTargetPriceNative;
        target.currency = currency;
        target.status = 'ACTIVE';
        target.updatedAt = nowIso;
        localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(all));
      }
    }
  } catch (_) {}

  try {
    const docRef = doc(db, 'price_alerts', alertId);
    await updateDoc(docRef, sanitizeFirestoreData({
      targetPriceUSD: newTargetPriceUSD,
      targetPriceNative: newTargetPriceNative,
      currency,
      status: 'ACTIVE',
      updatedAt: serverTimestamp(),
    }));
  } catch (err) {
    console.warn('[PriceAlert] Firestore update failed:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alerts_changed', { detail: { alertId } }));
  }
}

/**
 * Checks all active price alerts against current product prices.
 * Triggers in-app notifications if a product's price dropped at or below target threshold.
 */
export async function evaluatePriceAlertsAgainstProducts(
  products: Product[],
  userId?: string,
  userEmail?: string
): Promise<PriceAlertNotification[]> {
  if (!products.length) return [];

  let alerts: PriceAlert[] = [];
  if (userId) {
    alerts = await getUserPriceAlertsFromFirestore(userId);
  } else {
    // Check all local storage alerts if no specific userId provided
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
      if (raw) alerts = JSON.parse(raw);
    } catch (_) {}
  }

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const newlyTriggeredNotifs: PriceAlertNotification[] = [];

  for (const alert of activeAlerts) {
    const matchedProduct = products.find(p => p.id === alert.productId);
    if (!matchedProduct) continue;

    // Check if current product price is <= target price threshold
    if (matchedProduct.price <= alert.targetPriceUSD) {
      const discountPercent = alert.initialPriceUSD > 0
        ? Math.round(((alert.initialPriceUSD - matchedProduct.price) / alert.initialPriceUSD) * 100)
        : 0;

      const notifId = `pnotif_${alert.id}_${Date.now()}`;
      const nowIso = new Date().toISOString();

      const notif: PriceAlertNotification = {
        id: notifId,
        userId: alert.userId || userId || 'guest',
        alertId: alert.id,
        productId: matchedProduct.id,
        productTitle: matchedProduct.title || alert.productTitle,
        productImage: (matchedProduct.images && matchedProduct.images[0]) || alert.productImage,
        oldPriceUSD: alert.initialPriceUSD,
        newPriceUSD: matchedProduct.price,
        targetPriceUSD: alert.targetPriceUSD,
        discountPercent: Math.max(1, discountPercent),
        currency: alert.currency || 'NGN',
        read: false,
        createdAt: nowIso,
      };

      // 1. Mark alert as TRIGGERED
      alert.status = 'TRIGGERED';
      alert.triggeredAt = nowIso;
      alert.triggeredPriceUSD = matchedProduct.price;
      saveLocalPriceAlert(alert);

      try {
        await updateDoc(doc(db, 'price_alerts', alert.id), sanitizeFirestoreData({
          status: 'TRIGGERED',
          triggeredAt: serverTimestamp(),
          triggeredPriceUSD: matchedProduct.price,
          updatedAt: serverTimestamp(),
        }));
      } catch (_) {}

      // 2. Save Notification to Firestore & Local
      saveLocalPriceNotification(notif);

      try {
        await setDoc(doc(db, 'price_alert_notifications', notifId), sanitizeFirestoreData({
          ...notif,
          createdAt: serverTimestamp(),
        }));
      } catch (_) {}

      newlyTriggeredNotifs.push(notif);
    }
  }

  if (newlyTriggeredNotifs.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alert_triggered', { 
      detail: { notifications: newlyTriggeredNotifs } 
    }));
    window.dispatchEvent(new CustomEvent('nexovira_price_alerts_changed', { 
      detail: { newlyTriggered: newlyTriggeredNotifs } 
    }));
  }

  return newlyTriggeredNotifs;
}

/**
 * Local storage for Price Drop Notifications
 */
export function getLocalPriceNotifications(userId: string): PriceAlertNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (!raw) return [];
    const all: PriceAlertNotification[] = JSON.parse(raw);
    return all.filter(n => n.userId === userId);
  } catch {
    return [];
  }
}

export function saveLocalPriceNotification(notif: PriceAlertNotification): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    const all: PriceAlertNotification[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(n => n.id === notif.id);
    if (idx >= 0) {
      all[idx] = notif;
    } else {
      all.unshift(notif);
    }
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(all));
  } catch (_) {}
}

export async function getUserPriceNotificationsFromFirestore(userId: string): Promise<PriceAlertNotification[]> {
  if (!userId) return [];
  const localNotifs = getLocalPriceNotifications(userId);

  try {
    const q = query(
      collection(db, 'price_alert_notifications'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteNotifs: PriceAlertNotification[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        remoteNotifs.push({
          id: docSnap.id,
          userId: d.userId,
          alertId: d.alertId,
          productId: d.productId,
          productTitle: d.productTitle,
          productImage: d.productImage,
          oldPriceUSD: Number(d.oldPriceUSD || 0),
          newPriceUSD: Number(d.newPriceUSD || 0),
          targetPriceUSD: Number(d.targetPriceUSD || 0),
          discountPercent: Number(d.discountPercent || 0),
          currency: (d.currency as CurrencyCode) || 'NGN',
          read: Boolean(d.read),
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
        });
      });
      remoteNotifs.forEach(rn => saveLocalPriceNotification(rn));
      return remoteNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('[PriceAlert] Notification get failed, using local fallback:', err);
  }

  return localNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markPriceNotificationAsRead(notifId: string): Promise<void> {
  // Update local
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (raw) {
      const all: PriceAlertNotification[] = JSON.parse(raw);
      const target = all.find(n => n.id === notifId);
      if (target) {
        target.read = true;
        localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(all));
      }
    }
  } catch (_) {}

  try {
    await updateDoc(doc(db, 'price_alert_notifications', notifId), {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexovira_price_alerts_changed', { detail: { markedRead: notifId } }));
  }
}

/**
 * Interactive Simulation Helper:
 * Drops a product's price to trigger all active alerts and fire notifications in real time.
 */
export async function simulatePriceDropForProduct(
  productOrId: Product | string,
  dropPercentageOrPrice: number = 20,
  userId?: string,
  userEmail?: string
): Promise<{ triggered: boolean; newPriceUSD: number; notifs: PriceAlertNotification[] }> {
  let targetProduct: Product;

  if (typeof productOrId === 'string') {
    const rawAlerts = getLocalPriceAlerts(userId || '');
    const foundAlert = rawAlerts.find(a => a.productId === productOrId);
    
    targetProduct = {
      id: productOrId,
      title: foundAlert?.productTitle || 'Simulated Appliance',
      price: dropPercentageOrPrice,
      originalPrice: (foundAlert?.initialPriceUSD) || (dropPercentageOrPrice + 50),
      currency: 'USD',
      rating: 4.8,
      reviewCount: 142,
      images: [foundAlert?.productImage || 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500&q=80'],
      categoryId: (foundAlert?.productCategory as any) || 'refrigerators',
      brand: 'NEXOVIRA ECO',
      sellerId: 'seller-1',
      sellerName: 'NEXOVIRA Official',
      sellerVerified: true,
      stock: 25,
      description: 'NEXOVIRA energy-efficient smart appliance',
      keyFeatures: ['Energy efficient', 'Smart inverter'],
      specifications: {},
      warranty: '2 Years Manufacturer Warranty',
      tags: ['appliance', 'smart'],
      createdAt: new Date().toISOString(),
    };
  } else {
    const dropPercentage = dropPercentageOrPrice;
    const simulatedLowerPrice = Math.max(1, Math.round(productOrId.price * (1 - dropPercentage / 100)));
    targetProduct = {
      ...productOrId,
      price: simulatedLowerPrice,
      originalPrice: productOrId.price,
      discountPercentage: dropPercentage,
    };
  }

  const notifs = await evaluatePriceAlertsAgainstProducts([targetProduct], userId, userEmail);
  return {
    triggered: notifs.length > 0,
    newPriceUSD: targetProduct.price,
    notifs,
  };
}
