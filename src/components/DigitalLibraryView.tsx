import React, { useState } from 'react';
import { DigitalProduct, CurrencyCode } from '../types';
import { DIGITAL_PRODUCTS } from '../data/mockData';
import { formatCurrency } from '../lib/currency';
import { 
  BookOpen, 
  Download, 
  ShieldCheck, 
  FileText, 
  Star, 
  CheckCircle2, 
  X, 
  Lock,
  Eye
} from 'lucide-react';

interface DigitalLibraryViewProps {
  currentCurrency: CurrencyCode;
}

export const DigitalLibraryView: React.FC<DigitalLibraryViewProps> = ({ currentCurrency }) => {
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [purchasedTokens, setPurchasedTokens] = useState<string[]>([]);
  const [downloadModal, setDownloadModal] = useState<DigitalProduct | null>(null);

  const handlePurchase = (product: DigitalProduct) => {
    if (!purchasedTokens.includes(product.secureToken)) {
      setPurchasedTokens([...purchasedTokens, product.secureToken]);
    }
    setDownloadModal(product);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left space-y-8">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-900/40 text-white relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>NEXOVIRA Digital Publishing & Library</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">Books, Strategy Guides, Manuals & Code Templates</h1>
          <p className="text-xs text-emerald-300 font-semibold italic">"Innovation begins with vision. Smart living, better every day."</p>
          <p className="text-xs sm:text-sm text-slate-300">
            Access protected digital publications, technical engineering schematics, and SaaS boilerplate code with instant tokenized secure downloads.
          </p>
        </div>
      </div>

      {/* Grid or Empty State */}
      {DIGITAL_PRODUCTS.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Digital Publications Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            New engineering handbooks, technical manuals, and digital blueprints will appear here as soon as they are published to the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {DIGITAL_PRODUCTS.map((prod) => {
          const isOwned = purchasedTokens.includes(prod.secureToken);
          return (
            <div
              key={prod.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-lg hover:shadow-2xl transition-all flex flex-col md:flex-row gap-6 justify-between"
            >
              <div className="w-full md:w-44 h-60 shrink-0 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/80 relative shadow-md">
                <img
                  src={prod.coverImage}
                  alt={prod.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {prod.format}
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-[11px] font-bold text-emerald-500 uppercase">{prod.category}</div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug mt-1">
                    {prod.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">By {prod.author}</div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                    {prod.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono mt-3">
                    {prod.pageCount && <span>{prod.pageCount} Pages</span>}
                    <span>{prod.fileSize}</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{prod.rating}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrency(prod.price, currentCurrency)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProduct(prod)}
                      className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                      title="Preview Excerpt"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePurchase(prod)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      {isOwned ? (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download PDF</span>
                        </>
                      ) : (
                        <>
                          <span>Buy & Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Preview Excerpt Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Sample Excerpt Reader</span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedProduct.title}</h3>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 space-y-2 max-h-60 overflow-y-auto">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Sample Excerpt:</div>
              <p className="whitespace-pre-line leading-relaxed">{selectedProduct.sampleExcerpt}</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  const prod = selectedProduct;
                  setSelectedProduct(null);
                  handlePurchase(prod);
                }}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                Get Full Publication ({formatCurrency(selectedProduct.price, currentCurrency)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Download Modal */}
      {downloadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-6 text-center">
            <button
              onClick={() => setDownloadModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                TOKENIZED SECURE DELIVERY
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{downloadModal.title}</h3>
              <p className="text-xs text-slate-500">
                Access token verified for <span className="font-mono text-emerald-400 font-bold">{downloadModal.secureToken}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 text-xs font-mono text-slate-300">
              <div className="text-[10px] text-slate-500 uppercase">Download Authorization Token</div>
              <div className="text-emerald-400 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                https://nexovira.com/api/v1/library/download/{downloadModal.secureToken}?exp=2026-08-08T23:59:59Z
              </div>
            </div>

            <button
              onClick={() => {
                alert(`Starting secure download for ${downloadModal.title} (${downloadModal.format})`);
                setDownloadModal(null);
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Download File Now ({downloadModal.format})</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
