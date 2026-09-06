import React, { useState } from 'react';
import { Product, CurrencyCode } from '../types';
import { formatCurrency } from '../lib/currency';
import { 
  Star, 
  ShieldCheck, 
  ShoppingCart, 
  MessageSquare, 
  ArrowLeft, 
  Check, 
  Zap, 
  Truck, 
  RotateCcw, 
  Award,
  Sparkles,
  ZoomIn,
  BookOpen,
  Bell
} from 'lucide-react';
import { WhatsAppSupportButton } from './WhatsAppSupportButton';
import { EbookLightboxModal } from './EbookLightboxModal';
import { SetPriceAlertModal } from './SetPriceAlertModal';

interface ProductDetailViewProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, e?: React.MouseEvent) => void;
  onNavigate: (path: string) => void;
  currentCurrency?: CurrencyCode;
  onAskAI?: (product: Product) => void;
  relatedProducts?: Product[];
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onAddToCart,
  onNavigate,
  currentCurrency = 'NGN',
  onAskAI,
  relatedProducts = [],
}) => {
  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);

  const isDigital = Boolean(product.isDigital || product.productType === 'digital_ebook');

  const handleAdd = (e: React.MouseEvent) => {
    onAddToCart(product, quantity, e);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const whatsappMsg = `Hello NEXOVIRA, I want to inquire/order: ${product.title} (${product.id}) - Price: ${formatCurrency(product.price, currency)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-left space-y-12">
      {/* Top Breadcrumb & Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(isDigital ? '/ebooks' : '/marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {isDigital ? 'E-Book Library' : 'Marketplace Catalog'}
        </button>

        <span className="text-xs text-slate-400 font-medium">SKU: <span className="font-mono text-cyan-400">{product.id}</span></span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
            <img
              src={product.images[selectedImage] || product.images[0]}
              alt={product.title}
              referrerPolicy="no-referrer"
              onClick={() => setShowLightbox(true)}
              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
            />

            {/* Lightbox / Zoom trigger */}
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              className="absolute bottom-4 right-4 p-2.5 bg-slate-950/80 hover:bg-purple-600 text-white rounded-xl border border-slate-800 backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
              <span>Fullscreen Gallery ({product.images.length})</span>
            </button>

            {isDigital && (
              <span className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs uppercase px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                <BookOpen className="w-3.5 h-3.5" /> Digital E-Book
              </span>
            )}

            {product.isFlashDeal && !isDigital && (
              <span className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-xs uppercase px-3 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                <Zap className="w-3.5 h-3.5 fill-current" /> Flash Deal
              </span>
            )}
            {product.energyRating && (
              <span className="absolute top-4 right-4 bg-emerald-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-lg shadow">
                Energy Rating {product.energyRating}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative ${
                    selectedImage === idx ? 'border-purple-500 scale-95 ring-2 ring-purple-500/30' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-purple-600/90 text-white text-[8px] font-black text-center py-0.5">
                      COVER
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-500 font-bold uppercase tracking-wider mb-1">
              <span>{product.brand}</span>
              <span>•</span>
              <span>{product.sellerName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Rating & Stock */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
              <Star className="w-4 h-4 fill-amber-400 mr-1" />
              <span>{product.rating ? Number(product.rating).toFixed(1) : '5.0'} / 5.0 Rating</span>
              <span className="text-slate-400 font-normal ml-1">({product.reviewCount ?? 0} reviews)</span>
            </div>

            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Stock Status: <span className="text-emerald-500 font-bold">{product.stock > 0 ? `${product.stock} Units Available in Lagos` : 'Out of Stock'}</span>
            </span>

            {product.warranty && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-cyan-400" /> {product.warranty}
              </span>
            )}
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {formatCurrency(product.price, currency)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-slate-400 line-through">
                  {formatCurrency(product.originalPrice, currency)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Includes VAT & Official Lagos Hub Manufacturer Warranty Protection.
            </div>
          </div>

          {/* Key Features List */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Key Highlights</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              {product.keyFeatures.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quantity & CTA Row */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-slate-500 hover:text-white font-bold"
                >
                  -
                </button>
                <span className="px-4 py-2 font-mono font-bold text-sm text-slate-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-slate-500 hover:text-white font-bold"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAdd}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-sm rounded-xl hover:shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{added ? 'Added to Cart!' : 'Add to Cart'}</span>
              </button>

              {/* Set Price Alert Button */}
              <button
                type="button"
                onClick={() => setShowPriceAlertModal(true)}
                className="py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-extrabold text-xs flex items-center gap-1.5 transition-all"
                title="Set Target Price Drop Alert"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Price Alert</span>
              </button>
            </div>

            {/* Direct WhatsApp Order CTA */}
            <WhatsAppSupportButton
              whatsappNumber="+2348129595134"
              defaultMessage={whatsappMsg}
              variant="inline"
            />
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 text-[11px] pt-4 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              <span>Express Lagos & Regional Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>7-Day Return Policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">Technical Specifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
          {Object.entries(product.specifications).map(([key, val]) => (
            <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{key}</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Related Products in Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onNavigate(`/product/${rel.id}`)}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-3"
              >
                <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img src={rel.images[0]} alt="" className="w-full h-full object-cover" />
                </div>
                <h4 className="font-bold text-xs line-clamp-2 text-slate-900 dark:text-white">{rel.title}</h4>
                <div className="font-mono font-bold text-sm text-cyan-500">{formatCurrency(rel.price, currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <EbookLightboxModal
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        images={product.images || []}
        currentIndex={selectedImage}
        onNavigate={(idx) => setSelectedImage(idx)}
        title={isDigital ? 'E-Book Previews & Cover' : 'Product Gallery'}
      />

      {/* Target Price Alert Setup Modal */}
      {showPriceAlertModal && (
        <SetPriceAlertModal
          isOpen={showPriceAlertModal}
          onClose={() => setShowPriceAlertModal(false)}
          product={product}
          currentCurrency={currency}
          onSignInRequired={() => onNavigate('/signin')}
        />
      )}
    </div>
  );
};
