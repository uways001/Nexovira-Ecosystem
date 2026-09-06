import React from 'react';
import { Product, CurrencyCode } from '../types';
import { Star, ShieldCheck, ShoppingCart, Check, Zap, Heart, BookOpen, FileText, Bell } from 'lucide-react';
import { formatCurrency } from '../lib/currency';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onAskAI: (product: Product, e: React.MouseEvent) => void;
  onToggleCompare?: (product: Product, e: React.MouseEvent) => void;
  onToggleWishlist?: (product: Product, e: React.MouseEvent) => void;
  onSetPriceAlert?: (product: Product, e: React.MouseEvent) => void;
  isCompared?: boolean;
  isInWishlist?: boolean;
  hasPriceAlert?: boolean;
  currentCurrency?: CurrencyCode;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onAskAI,
  onToggleCompare,
  onToggleWishlist,
  onSetPriceAlert,
  isCompared = false,
  isInWishlist = false,
  hasPriceAlert = false,
  currentCurrency = 'NGN',
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group relative bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer text-left"
    >
      {/* Badges & Media Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 items-start">
          {(product.isDigital || product.productType === 'digital_ebook') && (
            <span className="bg-purple-600 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
              <BookOpen className="w-3 h-3 fill-current" />
              DIGITAL E-BOOK
            </span>
          )}
          {product.isFlashDeal && (
            <span className="bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" />
              Flash Deal
            </span>
          )}
          {product.energyRating && (
            <span className="bg-emerald-500/90 backdrop-blur-sm text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md shadow">
              Energy {product.energyRating}
            </span>
          )}
        </div>

        {/* Multi-Image Preview Badge */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2.5 right-2.5 z-10 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-800 shadow">
            +{product.images.length - 1} photos
          </div>
        )}

        {/* Top Right Wishlist, Price Alert & Compare buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {onSetPriceAlert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetPriceAlert(product, e);
              }}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
                hasPriceAlert
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 scale-105 shadow-amber-500/30'
                  : 'bg-slate-900/70 text-slate-200 hover:bg-slate-900 hover:text-amber-400'
              }`}
              title={hasPriceAlert ? 'Target Price Alert Active' : 'Set Target Price Alert'}
            >
              <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${hasPriceAlert ? 'fill-current' : ''}`} />
            </button>
          )}

          {onToggleWishlist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product, e);
              }}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold backdrop-blur-md transition-all shadow-md ${
                isInWishlist
                  ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105'
                  : 'bg-slate-900/70 text-slate-200 hover:bg-slate-900 hover:text-rose-400'
              }`}
              title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isInWishlist ? 'fill-current text-white' : ''}`} />
            </button>
          )}

          {onToggleCompare && (
            <button
              onClick={(e) => onToggleCompare(product, e)}
              className={`p-1.5 rounded-lg text-xs font-semibold backdrop-blur-md transition-all ${
                isCompared
                  ? 'bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-300'
                  : 'bg-slate-900/60 text-slate-200 hover:bg-slate-900/90 hover:text-cyan-400'
              }`}
              title="Compare with NEXOVIRA AI"
            >
              {isCompared ? <Check className="w-3.5 h-3.5" /> : 'Compare'}
            </button>
          )}
        </div>

        {/* Seller Verification Pill */}
        {product.sellerVerified && (
          <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-cyan-300 border border-cyan-500/30 font-medium text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lagos Hub Verified</span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Capacity Header */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <span className="uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold truncate max-w-[130px]">
              {(product.isDigital || product.productType === 'digital_ebook') 
                ? (product.author ? `By ${product.author}` : product.brand)
                : product.brand}
            </span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400 font-medium">
              {(product.isDigital || product.productType === 'digital_ebook') ? 'PDF • Digital' : (product.capacity || 'In Stock')}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {product.title}
          </h3>

          {/* Ratings & Reviews Count */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-1">
                {product.rating ? Number(product.rating).toFixed(1) : '5.0'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium ml-1">
                ({product.reviewCount ?? 0})
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">• Authentic Warranty</span>
          </div>

          {/* Key Specification snippet */}
          <div className="mt-2 flex flex-wrap gap-1">
            {product.keyFeatures.slice(0, 2).map((feature, i) => (
              <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded truncate max-w-full">
                • {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatCurrency(product.originalPrice, currency)}
                </span>
              )}
            </div>

            {product.discountPercentage && (
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                -{product.discountPercentage}%
              </span>
            )}
          </div>

          {/* Action Button Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => onAddToCart(product, e)}
              className="w-full py-2 px-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 dark:hover:bg-cyan-500 dark:hover:text-slate-950 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950" />
              <span>Add Cart</span>
            </button>

            <button
              onClick={(e) => onAskAI(product, e)}
              className="w-full py-2 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-cyan-500/30"
            >
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
