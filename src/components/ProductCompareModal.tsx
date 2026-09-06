import React from 'react';
import { Product } from '../types';
import { X, Sparkles, Check, ArrowRight, ShieldCheck, ShoppingCart } from 'lucide-react';

interface ProductCompareModalProps {
  products: Product[];
  onClose: () => void;
  onRemoveProduct: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onAskAI: (query: string) => void;
}

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  products,
  onClose,
  onRemoveProduct,
  onAddToCart,
  onAskAI,
}) => {
  if (products.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl my-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-left text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Compare with NEXOVIRA AI</h3>
              <p className="text-xs text-slate-400">Side-by-side specification & energy efficiency matrix</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Verdict Summary Banner */}
        <div className="p-4 bg-cyan-500/10 border-b border-slate-800 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-cyan-300 uppercase tracking-wide">NEXOVIRA AI Comparison Verdict:</span>
            <p className="text-slate-300">
              {products.length === 1
                ? 'Add at least one more product to generate a comparative analysis.'
                : `Comparing ${products[0].title} vs ${products[1].title}. ${products[0].price < products[1].price ? products[0].title : products[1].title} offers the best price-to-performance ratio in energy eco mode.`}
            </p>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="p-6 overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="p-3 w-48 text-slate-400 font-bold uppercase tracking-wider">Product Specs</th>
                {products.map((p) => (
                  <th key={p.id} className="p-3 min-w-[220px] max-w-[280px]">
                    <div className="relative bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProduct(p.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Remove from comparison"
                        aria-label="Remove product"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <img src={p.images[0]} alt={p.title} referrerPolicy="no-referrer" className="w-24 h-24 object-cover rounded-xl mx-auto" />
                      <div className="font-bold text-sm text-white line-clamp-2">{p.title}</div>
                      <div className="text-cyan-400 font-black text-base">${p.price.toLocaleString()}</div>
                      
                      <button
                        onClick={() => onAddToCart(p)}
                        className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              <tr>
                <td className="p-3 font-bold text-slate-400">Brand</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 font-semibold text-white">{p.brand}</td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Rating & Reviews</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3">★ {p.rating} ({p.reviewCount} reviews)</td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Energy Rating</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 font-bold text-emerald-400">{p.energyRating || 'N/A'}</td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Capacity / Size</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3">{p.capacity || p.specifications['Screen Size'] || 'Standard'}</td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Warranty</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 text-cyan-300">{p.warranty}</td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Verified Seller</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3">
                    <span className="flex items-center gap-1 text-slate-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      {p.sellerName}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-3 font-bold text-slate-400">Key Features</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 space-y-1">
                    {p.keyFeatures.map((feat, i) => (
                      <div key={i} className="flex items-start gap-1 text-[11px]">
                        <Check className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
