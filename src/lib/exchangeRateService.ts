/**
 * NEXOVIRA AUTOMATED LIVE EXCHANGE RATE ENGINE
 *
 * Automatically fetches current USD to NGN exchange rate from real-time online foreign exchange APIs.
 * Admin manual rate overrides are disabled per platform policy to enforce authentic market pricing.
 * All products on the platform are priced and settled in Nigerian Naira (₦ NGN).
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ExchangeRateInfo {
  rate: number;
  updatedAt: string;
  source: string;
  isLive: boolean;
}

const DEFAULT_FALLBACK_RATE = 1350.0;
const STORAGE_KEY = 'nexovira_live_exchange_rate';
const STORAGE_TIME_KEY = 'nexovira_live_exchange_rate_time';

let cachedRate: number = DEFAULT_FALLBACK_RATE;
let cachedUpdatedAt: string = new Date().toISOString();
let cachedSource: string = 'system_initial';
let isLiveSynced: boolean = false;

// Initialize from local storage if available
if (typeof window !== 'undefined') {
  try {
    const storedRate = localStorage.getItem(STORAGE_KEY);
    const storedTime = localStorage.getItem(STORAGE_TIME_KEY);
    if (storedRate && !isNaN(Number(storedRate))) {
      cachedRate = Number(storedRate);
      if (storedTime) cachedUpdatedAt = storedTime;
      cachedSource = 'cached_local';
    }
  } catch (e) {
    // Ignore storage parse errors
  }
}

/**
 * Returns current cached live exchange rate synchronously (₦ per $1 USD)
 */
export function getLiveExchangeRate(): number {
  return cachedRate;
}

/**
 * Returns comprehensive details about the current exchange rate
 */
export function getLiveExchangeRateInfo(): ExchangeRateInfo {
  return {
    rate: cachedRate,
    updatedAt: cachedUpdatedAt,
    source: cachedSource,
    isLive: isLiveSynced
  };
}

/**
 * Fetches real-time exchange rate from public online APIs
 */
export async function fetchLiveExchangeRate(force = false): Promise<number> {
  // If recently fetched within 10 minutes and not forced, return cached
  if (!force && isLiveSynced && cachedUpdatedAt) {
    const ageMs = Date.now() - new Date(cachedUpdatedAt).getTime();
    if (ageMs < 10 * 60 * 1000) {
      return cachedRate;
    }
  }

  let onlineRate: number | null = null;
  let sourceApi = '';

  // 1. Try primary free online API: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache'
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates.NGN === 'number' && data.rates.NGN > 0) {
        onlineRate = Number(data.rates.NGN);
        sourceApi = 'open.er-api.com (Live Global FX)';
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Primary API fetch failed, trying secondary fallback...', err);
  }

  // 2. Try secondary fallback API if primary failed
  if (!onlineRate) {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && typeof data.rates.NGN === 'number' && data.rates.NGN > 0) {
          onlineRate = Number(data.rates.NGN);
          sourceApi = 'api.exchangerate-api.com (Live)';
        }
      }
    } catch (err) {
      console.warn('[ExchangeRate] Secondary API fetch failed:', err);
    }
  }

  // 3. Try Firestore store_settings if online was unreachable
  if (!onlineRate) {
    try {
      const docSnap = await getDoc(doc(db, 'store_settings', 'general')).catch(() => null);
      if (docSnap && docSnap.exists()) {
        const firestoreRate = docSnap.data()?.exchangeRate;
        if (typeof firestoreRate === 'number' && firestoreRate > 0) {
          onlineRate = firestoreRate;
          sourceApi = 'firestore_store_settings';
        }
      }
    } catch (e) {
      // Ignore Firestore read error
    }
  }

  if (onlineRate && !isNaN(onlineRate)) {
    cachedRate = Math.round(onlineRate * 100) / 100;
    cachedUpdatedAt = new Date().toISOString();
    cachedSource = sourceApi;
    isLiveSynced = true;

    // Cache locally
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, String(cachedRate));
        localStorage.setItem(STORAGE_TIME_KEY, cachedUpdatedAt);
        window.dispatchEvent(
          new CustomEvent('nexovira:exchange-rate-updated', {
            detail: { rate: cachedRate, updatedAt: cachedUpdatedAt, source: cachedSource }
          })
        );
      } catch (e) {}
    }

    // Persist to Firestore store_settings for consistency
    try {
      await setDoc(
        doc(db, 'store_settings', 'general'),
        {
          exchangeRate: cachedRate,
          exchangeRateUpdatedAt: cachedUpdatedAt,
          exchangeRateSource: cachedSource,
          exchangeRateMode: 'automated_online'
        },
        { merge: true }
      ).catch(() => {});
    } catch (e) {}

    return cachedRate;
  }

  return cachedRate;
}

/**
 * Convert USD to NGN using current live rate
 */
export function usdToNgn(amountUSD: number): number {
  return Math.round(amountUSD * cachedRate);
}

/**
 * Convert NGN to USD using current live rate
 */
export function ngnToUsd(amountNGN: number): number {
  if (!cachedRate || cachedRate <= 0) return 0;
  return Math.round((amountNGN / cachedRate) * 100) / 100;
}

/**
 * Format an amount in Nigerian Naira (₦)
 */
export function formatNaira(amountNGN: number): string {
  return '₦' + Math.round(amountNGN).toLocaleString();
}

/**
 * Format currency with Naira as primary
 */
export function formatPriceNGN(amountNGN: number, showUsdEquivalent = false): string {
  const formatted = formatNaira(amountNGN);
  if (showUsdEquivalent && cachedRate > 0) {
    const usd = (amountNGN / cachedRate).toFixed(2);
    return `${formatted} ($${usd})`;
  }
  return formatted;
}

// Automatically trigger initial background fetch on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchLiveExchangeRate().catch(() => {});
  }, 500);
}
