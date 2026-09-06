import { CurrencyCode, CurrencyInfo } from '../types';
import { getLiveExchangeRate, fetchLiveExchangeRate } from './exchangeRateService';

export { getLiveExchangeRate, fetchLiveExchangeRate };

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', rateToUSD: getLiveExchangeRate(), region: 'Nigeria' },
];

export function getCurrencyInfo(_code?: CurrencyCode): CurrencyInfo {
  const rate = getLiveExchangeRate();
  return {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    flag: '🇳🇬',
    rateToUSD: rate,
    region: 'Nigeria'
  };
}

export function convertFromUSD(amountInUSD: number, _targetCurrency?: CurrencyCode): number {
  const rate = getLiveExchangeRate();
  return Math.round(amountInUSD * rate);
}

/**
 * Formats any product price into Nigerian Naira (₦ NGN).
 * - If amount is >= 500, it is already a direct Naira value (e.g. ₦1,500, ₦25,000).
 * - If amount is < 500, it converts from USD using the automated live exchange rate fetched online.
 */
export function formatCurrency(
  amount: number,
  _currencyCode: CurrencyCode = 'NGN'
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₦0';
  }
  let nairaAmount: number;
  if (amount >= 500) {
    nairaAmount = Math.round(amount);
  } else {
    const liveRate = getLiveExchangeRate();
    nairaAmount = Math.round(amount * liveRate);
  }
  return `₦${nairaAmount.toLocaleString('en-NG')}`;
}

export function formatNativeCurrency(
  amount: number,
  _currencyCode: CurrencyCode = 'NGN'
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₦0';
  }
  const rounded = Math.round(amount);
  return `₦${rounded.toLocaleString('en-NG')}`;
}

export function convertDirectly(
  amount: number,
  _fromCode?: CurrencyCode,
  _toCode?: CurrencyCode
): { convertedAmount: number; rate: number } {
  return { convertedAmount: amount, rate: 1.0 };
}

