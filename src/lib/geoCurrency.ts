import { CurrencyCode, CurrencyInfo } from '../types';
import { SUPPORTED_CURRENCIES, getCurrencyInfo } from './currency';

export interface GeoDetectionResult {
  detectedCurrency: CurrencyCode;
  detectedCountry: string;
  detectedRegion: string;
  source: 'timezone' | 'geoip' | 'locale' | 'fallback';
  isAutoApplied: boolean;
}

const PREFERRED_CURRENCY_KEY = 'nexovira_preferred_currency';
const DETECTED_GEO_KEY = 'nexovira_geo_info';
const NOTIFICATION_DISMISSED_KEY = 'nexovira_currency_toast_dismissed';

/**
 * Timezone to Currency and Country Mapping dictionary
 */
const TIMEZONE_TO_CURRENCY_MAP: Record<string, { currency: CurrencyCode; country: string; region: string }> = {
  // Nigeria & West Africa
  'Africa/Lagos': { currency: 'NGN', country: 'Nigeria', region: 'West Africa' },
  'Africa/Abuja': { currency: 'NGN', country: 'Nigeria', region: 'West Africa' },
  'Africa/Porto-Novo': { currency: 'NGN', country: 'Benin', region: 'West Africa' },
  'Africa/Niamey': { currency: 'NGN', country: 'Niger', region: 'West Africa' },
  
  // Ghana
  'Africa/Accra': { currency: 'GHS', country: 'Ghana', region: 'West Africa' },
  
  // Kenya & East Africa
  'Africa/Nairobi': { currency: 'KES', country: 'Kenya', region: 'East Africa' },
  'Africa/Kampala': { currency: 'KES', country: 'Uganda', region: 'East Africa' },
  'Africa/Dar_es_Salaam': { currency: 'KES', country: 'Tanzania', region: 'East Africa' },
  
  // South Africa
  'Africa/Johannesburg': { currency: 'ZAR', country: 'South Africa', region: 'Southern Africa' },
  'Africa/Maseru': { currency: 'ZAR', country: 'Lesotho', region: 'Southern Africa' },
  'Africa/Mbabane': { currency: 'ZAR', country: 'Eswatini', region: 'Southern Africa' },

  // United Kingdom
  'Europe/London': { currency: 'GBP', country: 'United Kingdom', region: 'Europe' },
  'Europe/Belfast': { currency: 'GBP', country: 'United Kingdom', region: 'Europe' },
  'GB': { currency: 'GBP', country: 'United Kingdom', region: 'Europe' },

  // European Union & Eurozone
  'Europe/Paris': { currency: 'EUR', country: 'France', region: 'Eurozone' },
  'Europe/Berlin': { currency: 'EUR', country: 'Germany', region: 'Eurozone' },
  'Europe/Rome': { currency: 'EUR', country: 'Italy', region: 'Eurozone' },
  'Europe/Madrid': { currency: 'EUR', country: 'Spain', region: 'Eurozone' },
  'Europe/Amsterdam': { currency: 'EUR', country: 'Netherlands', region: 'Eurozone' },
  'Europe/Brussels': { currency: 'EUR', country: 'Belgium', region: 'Eurozone' },
  'Europe/Vienna': { currency: 'EUR', country: 'Austria', region: 'Eurozone' },
  'Europe/Dublin': { currency: 'EUR', country: 'Ireland', region: 'Eurozone' },
  'Europe/Lisbon': { currency: 'EUR', country: 'Portugal', region: 'Eurozone' },
  'Europe/Athens': { currency: 'EUR', country: 'Greece', region: 'Eurozone' },
  'Europe/Helsinki': { currency: 'EUR', country: 'Finland', region: 'Eurozone' },
  'Europe/Warsaw': { currency: 'EUR', country: 'Poland', region: 'Europe' },
  'Europe/Prague': { currency: 'EUR', country: 'Czech Republic', region: 'Europe' },
  'Europe/Stockholm': { currency: 'EUR', country: 'Sweden', region: 'Europe' },
  'Europe/Oslo': { currency: 'EUR', country: 'Norway', region: 'Europe' },

  // United States & Territories
  'America/New_York': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Chicago': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Denver': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Los_Angeles': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Phoenix': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Anchorage': { currency: 'USD', country: 'United States', region: 'North America' },
  'America/Honolulu': { currency: 'USD', country: 'United States', region: 'North America' },

  // Canada
  'America/Toronto': { currency: 'CAD', country: 'Canada', region: 'North America' },
  'America/Vancouver': { currency: 'CAD', country: 'Canada', region: 'North America' },
  'America/Montreal': { currency: 'CAD', country: 'Canada', region: 'North America' },
  'America/Edmonton': { currency: 'CAD', country: 'Canada', region: 'North America' },

  // Australia
  'Australia/Sydney': { currency: 'AUD', country: 'Australia', region: 'Oceania' },
  'Australia/Melbourne': { currency: 'AUD', country: 'Australia', region: 'Oceania' },
  'Australia/Brisbane': { currency: 'AUD', country: 'Australia', region: 'Oceania' },
  'Australia/Perth': { currency: 'AUD', country: 'Australia', region: 'Oceania' },

  // UAE
  'Asia/Dubai': { currency: 'AED', country: 'United Arab Emirates', region: 'Middle East' },
  'Asia/Muscat': { currency: 'AED', country: 'Oman', region: 'Middle East' },
};

/**
 * Country Code to Supported Currency mapping
 */
const COUNTRY_CODE_TO_CURRENCY: Record<string, { currency: CurrencyCode; country: string; region: string }> = {
  NG: { currency: 'NGN', country: 'Nigeria', region: 'West Africa' },
  GB: { currency: 'GBP', country: 'United Kingdom', region: 'Europe' },
  US: { currency: 'USD', country: 'United States', region: 'North America' },
  CA: { currency: 'CAD', country: 'Canada', region: 'North America' },
  AU: { currency: 'AUD', country: 'Australia', region: 'Oceania' },
  GH: { currency: 'GHS', country: 'Ghana', region: 'West Africa' },
  KE: { currency: 'KES', country: 'Kenya', region: 'East Africa' },
  ZA: { currency: 'ZAR', country: 'South Africa', region: 'Southern Africa' },
  AE: { currency: 'AED', country: 'United Arab Emirates', region: 'Middle East' },
  // Eurozone countries
  DE: { currency: 'EUR', country: 'Germany', region: 'Eurozone' },
  FR: { currency: 'EUR', country: 'France', region: 'Eurozone' },
  IT: { currency: 'EUR', country: 'Italy', region: 'Eurozone' },
  ES: { currency: 'EUR', country: 'Spain', region: 'Eurozone' },
  NL: { currency: 'EUR', country: 'Netherlands', region: 'Eurozone' },
  IE: { currency: 'EUR', country: 'Ireland', region: 'Eurozone' },
  BE: { currency: 'EUR', country: 'Belgium', region: 'Eurozone' },
  AT: { currency: 'EUR', country: 'Austria', region: 'Eurozone' },
  PT: { currency: 'EUR', country: 'Portugal', region: 'Eurozone' },
  GR: { currency: 'EUR', country: 'Greece', region: 'Eurozone' },
  FI: { currency: 'EUR', country: 'Finland', region: 'Eurozone' },
};

/**
 * Detects user region and auto-suggests currency based on time zone and locale
 */
export function detectUserRegionAndCurrencySync(): GeoDetectionResult {
  try {
    // 1. Check if user already manually selected a preferred currency
    const savedManual = localStorage.getItem(PREFERRED_CURRENCY_KEY);
    if (savedManual && SUPPORTED_CURRENCIES.some(c => c.code === savedManual)) {
      return {
        detectedCurrency: savedManual as CurrencyCode,
        detectedCountry: 'User Selection',
        detectedRegion: 'Saved Preference',
        source: 'fallback',
        isAutoApplied: false,
      };
    }

    // 2. High-speed local timezone matching (instant, no network request)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone && TIMEZONE_TO_CURRENCY_MAP[timeZone]) {
      const match = TIMEZONE_TO_CURRENCY_MAP[timeZone];
      return {
        detectedCurrency: match.currency,
        detectedCountry: match.country,
        detectedRegion: match.region,
        source: 'timezone',
        isAutoApplied: true,
      };
    }

    // Partial matching on time zone continent / city
    if (timeZone) {
      if (timeZone.startsWith('Africa/')) {
        return { detectedCurrency: 'NGN', detectedCountry: 'West Africa Region', detectedRegion: 'Africa', source: 'timezone', isAutoApplied: true };
      }
      if (timeZone.startsWith('Europe/')) {
        if (timeZone.includes('London') || timeZone.includes('Belfast')) {
          return { detectedCurrency: 'GBP', detectedCountry: 'United Kingdom', detectedRegion: 'Europe', source: 'timezone', isAutoApplied: true };
        }
        return { detectedCurrency: 'EUR', detectedCountry: 'European Region', detectedRegion: 'Europe', source: 'timezone', isAutoApplied: true };
      }
      if (timeZone.startsWith('America/')) {
        return { detectedCurrency: 'USD', detectedCountry: 'Americas', detectedRegion: 'North America', source: 'timezone', isAutoApplied: true };
      }
      if (timeZone.startsWith('Australia/')) {
        return { detectedCurrency: 'AUD', detectedCountry: 'Australia', detectedRegion: 'Oceania', source: 'timezone', isAutoApplied: true };
      }
      if (timeZone.startsWith('Asia/Dubai') || timeZone.startsWith('Asia/Riyadh')) {
        return { detectedCurrency: 'AED', detectedCountry: 'UAE / Gulf', detectedRegion: 'Middle East', source: 'timezone', isAutoApplied: true };
      }
    }

    // 3. Fallback to browser languages / locale
    const languages = navigator.languages || [navigator.language || 'en-US'];
    for (const lang of languages) {
      const parts = lang.split('-');
      if (parts.length > 1) {
        const countryCode = parts[1].toUpperCase();
        if (COUNTRY_CODE_TO_CURRENCY[countryCode]) {
          const match = COUNTRY_CODE_TO_CURRENCY[countryCode];
          return {
            detectedCurrency: match.currency,
            detectedCountry: match.country,
            detectedRegion: match.region,
            source: 'locale',
            isAutoApplied: true,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[GeoCurrency] Error during sync detection:', err);
  }

  // Default fallback for NEXOVIRA Primary Hub
  return {
    detectedCurrency: 'NGN',
    detectedCountry: 'Nigeria',
    detectedRegion: 'West Africa',
    source: 'fallback',
    isAutoApplied: true,
  };
}

/**
 * Optional asynchronous GeoIP check to refine country detection if available
 */
export async function detectUserRegionAndCurrencyAsync(): Promise<GeoDetectionResult> {
  const syncResult = detectUserRegionAndCurrencySync();
  
  // If user already picked manually, don't override
  const savedManual = localStorage.getItem(PREFERRED_CURRENCY_KEY);
  if (savedManual) {
    return syncResult;
  }

  try {
    // Quick, non-blocking GeoIP check with 2-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://api.country.is/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const countryCode = (data?.country || '').toUpperCase();
      if (countryCode && COUNTRY_CODE_TO_CURRENCY[countryCode]) {
        const match = COUNTRY_CODE_TO_CURRENCY[countryCode];
        const result: GeoDetectionResult = {
          detectedCurrency: match.currency,
          detectedCountry: match.country,
          detectedRegion: match.region,
          source: 'geoip',
          isAutoApplied: true,
        };
        localStorage.setItem(DETECTED_GEO_KEY, JSON.stringify(result));
        return result;
      }
    }
  } catch (_) {
    // Fall back quietly to sync timezone result
  }

  return syncResult;
}

/**
 * Saves explicit user currency preference
 */
export function saveCurrencyPreference(currency: CurrencyCode): void {
  try {
    localStorage.setItem(PREFERRED_CURRENCY_KEY, currency);
  } catch (_) {}
}

/**
 * Gets saved preference if any
 */
export function getSavedCurrencyPreference(): CurrencyCode | null {
  try {
    return (localStorage.getItem(PREFERRED_CURRENCY_KEY) as CurrencyCode) || null;
  } catch {
    return null;
  }
}
