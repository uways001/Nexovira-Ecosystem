import { 
  AffiliateProfile, 
  AffiliateConfig, 
  OrderFinancials, 
  AffiliateCommissionRecord, 
  CartItem,
  Order 
} from '../types';

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  minCommissionRate: 1, // 1%
  maxCommissionRate: 50, // 50%
  attributionWindowDays: 30, // 30 days
  attributionRule: 'last-click',
  marketplaceCommissionRate: 5, // 5%
  settlementPeriodHours: 24, // 24 hours default
  minWithdrawalAmount: 1000, // NGN 1,000 or $10
  defaultCommissionRate: 10, // 10% default
  defaultCommissionType: 'percentage',
  conversionFeePercent: 0
};

/**
 * Automatically generate a unique affiliate ID and affiliate referral code.
 * Example:
 * User: John Doe
 * Affiliate ID: AFF-8K4P2M
 * Affiliate Code: JOHN8K4P2M
 */
export function generateUniqueAffiliateId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AFF-${rand}`;
}

export function generateUniqueAffiliateCode(userName: string): string {
  const cleanName = (userName || 'USER')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4) || 'NEXO';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanName}${rand}`;
}

export interface CalculatedItemFinancial {
  productId: string;
  productTitle: string;
  sellerId: string;
  quantity: number;
  itemPrice: number;
  itemSubtotal: number;
  affiliateEnabled: boolean;
  affiliateRateApplied: number;
  marketplaceRateApplied: number;
  affiliateCommission: number;
  marketplaceCommission: number;
  sellerEarnings: number;
}

export interface CalculatedOrderFinancials {
  subtotal: number;
  shippingFee: number;
  discount: number;
  paymentFee: number;
  totalPayable: number;
  totalMarketplaceCommission: number;
  totalAffiliateCommission: number;
  totalSellerEarnings: number;
  affiliateId?: string;
  affiliateCode?: string;
  affiliateUid?: string;
  selfReferral: boolean;
  selfReferralReason?: string;
  items: CalculatedItemFinancial[];
}

/**
 * Authoritative financial calculation engine.
 * Never trust frontend financial amounts.
 */
export function calculateOrderFinancials(
  items: CartItem[],
  config: AffiliateConfig,
  affiliateProfile: AffiliateProfile | null,
  customerUid: string | null,
  customerEmail: string | null,
  shippingFee: number = 0,
  discount: number = 0,
  paymentFeeRate: number = 0.015 // 1.5% payment fee
): CalculatedOrderFinancials {
  const effectiveConfig = { ...DEFAULT_AFFILIATE_CONFIG, ...config };
  
  let subtotal = 0;
  let totalMarketplaceCommission = 0;
  let totalAffiliateCommission = 0;
  let totalSellerEarnings = 0;

  // Check self-referral rule
  let isSelfReferral = false;
  let selfReferralReason = '';

  if (affiliateProfile) {
    if (customerUid && affiliateProfile.uid === customerUid) {
      isSelfReferral = true;
      selfReferralReason = 'Customer UID matches Affiliate UID (Self-referral prohibited)';
    } else if (
      customerEmail && 
      affiliateProfile.userEmail && 
      customerEmail.toLowerCase().trim() === affiliateProfile.userEmail.toLowerCase().trim()
    ) {
      isSelfReferral = true;
      selfReferralReason = 'Customer email matches Affiliate email (Self-referral prohibited)';
    }
  }

  const calculatedItems: CalculatedItemFinancial[] = items.map((cartItem) => {
    const p = cartItem.product;
    const qty = cartItem.quantity;
    const price = p.price;
    const itemSubtotal = price * qty;
    subtotal += itemSubtotal;

    const isAffiliateEnabled = p.affiliateEnabled !== false; // Default true
    
    // Clamp seller's requested rate within Admin min/max bounds
    let requestedRate = p.affiliateCommissionRate !== undefined ? p.affiliateCommissionRate : 10;
    if (requestedRate < effectiveConfig.minCommissionRate) {
      requestedRate = effectiveConfig.minCommissionRate;
    }
    if (requestedRate > effectiveConfig.maxCommissionRate) {
      requestedRate = effectiveConfig.maxCommissionRate;
    }

    const effectiveAffiliateRate = (isAffiliateEnabled && affiliateProfile && !isSelfReferral) ? requestedRate : 0;
    const effectiveMarketplaceRate = effectiveConfig.marketplaceCommissionRate || 5;

    const affiliateCommission = (itemSubtotal * effectiveAffiliateRate) / 100;
    const marketplaceCommission = (itemSubtotal * effectiveMarketplaceRate) / 100;
    const sellerEarnings = itemSubtotal - marketplaceCommission - affiliateCommission;

    totalMarketplaceCommission += marketplaceCommission;
    totalAffiliateCommission += affiliateCommission;
    totalSellerEarnings += sellerEarnings;

    return {
      productId: p.id,
      productTitle: p.title,
      sellerId: p.sellerId || 'nexovira-admin',
      quantity: qty,
      itemPrice: price,
      itemSubtotal,
      affiliateEnabled: isAffiliateEnabled,
      affiliateRateApplied: effectiveAffiliateRate,
      marketplaceRateApplied: effectiveMarketplaceRate,
      affiliateCommission,
      marketplaceCommission,
      sellerEarnings
    };
  });

  const totalPayable = subtotal + shippingFee - discount;
  const paymentFee = totalPayable * paymentFeeRate;

  return {
    subtotal,
    shippingFee,
    discount,
    paymentFee,
    totalPayable,
    totalMarketplaceCommission,
    totalAffiliateCommission,
    totalSellerEarnings,
    affiliateId: affiliateProfile ? affiliateProfile.id : undefined,
    affiliateCode: affiliateProfile ? affiliateProfile.affiliateCode : undefined,
    affiliateUid: affiliateProfile ? affiliateProfile.uid : undefined,
    selfReferral: isSelfReferral,
    selfReferralReason,
    items: calculatedItems
  };
}
