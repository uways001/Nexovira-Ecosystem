import React, { useState, useEffect } from 'react';
import { CurrencyCode } from '../types';
import { MapPin, X, Check, Globe, ArrowRight } from 'lucide-react';
import { GeoDetectionResult, getSavedCurrencyPreference, saveCurrencyPreference } from '../lib/geoCurrency';
import { getCurrencyInfo } from '../lib/currency';

interface GeoCurrencyBannerProps {
  currentCurrency: CurrencyCode;
  geoInfo: GeoDetectionResult | null;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export const GeoCurrencyBanner: React.FC<GeoCurrencyBannerProps> = ({
  currentCurrency,
  geoInfo,
  onCurrencyChange,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    // Only show if user hasn't explicitly dismissed the toast or manually set preference in a previous session
    if (geoInfo && geoInfo.isAutoApplied) {
      const isDismissed = sessionStorage.getItem('nexovira_geo_toast_dismissed');
      if (!isDismissed) {
        setDismissed(false);
      }
    }
  }, [geoInfo]);

  if (dismissed || !geoInfo) return null;

  const info = getCurrencyInfo(currentCurrency);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('nexovira_geo_toast_dismissed', 'true');
  };

  const handleConfirm = () => {
    saveCurrencyPreference(currentCurrency);
    handleDismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300 p-1">
      <div className="bg-slate-900/95 text-white border border-slate-700/80 backdrop-blur-xl p-4 rounded-2xl shadow-2xl space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                <span>Region Detected</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {geoInfo.detectedCountry}
                </span>
              </h5>
              <p className="text-[11px] text-slate-300">
                Marketplace prices set to <strong className="text-cyan-400 font-mono">{info.symbol} {currentCurrency}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Keep {currentCurrency}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Open currency selector dropdown or cycle currency
              const nextCurrency: CurrencyCode = currentCurrency === 'NGN' ? 'USD' : currentCurrency === 'USD' ? 'GBP' : currentCurrency === 'GBP' ? 'EUR' : 'NGN';
              onCurrencyChange(nextCurrency);
            }}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors border border-slate-700"
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
};
