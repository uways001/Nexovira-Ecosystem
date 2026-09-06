import React from 'react';
import { CurrencyCode } from '../types';
import { getCurrencyInfo } from '../lib/currency';

interface CurrencySelectorProps {
  currentCurrency?: CurrencyCode;
  onCurrencyChange?: (code: CurrencyCode) => void;
  className?: string;
  showFullLabel?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  className = '',
  showFullLabel = false,
}) => {
  const currentInfo = getCurrencyInfo('NGN');

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-default select-none shadow-sm ${className}`}
      title="Store currency: Nigerian Naira (₦ NGN)"
    >
      <span className="text-sm">{currentInfo.flag}</span>
      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{currentInfo.code}</span>
      <span className="text-slate-600 dark:text-slate-400 font-medium">({currentInfo.symbol})</span>
      {showFullLabel && <span className="hidden sm:inline text-slate-500 font-normal">Naira</span>}
    </div>
  );
};

