import React from 'react';
import { Search, Home, ShoppingBag, ArrowRight } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (path: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center space-y-6">
      <div className="relative">
        <span className="text-8xl sm:text-9xl font-black text-slate-200 dark:text-slate-800 tracking-widest select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm sm:text-base font-extrabold text-cyan-500 uppercase tracking-widest bg-white dark:bg-[#0B0F17] px-4 py-1 rounded-full border border-cyan-500/30">
            Page Not Found
          </span>
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          The requested route does not exist
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          The page you are trying to access might have been moved or updated. Explore our home appliances or ask NEXOVIRA AI for guidance.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <button
          onClick={() => onNavigate('/')}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 hover:shadow-lg shadow-cyan-500/20"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </button>
        <button
          onClick={() => onNavigate('/marketplace')}
          className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          <ShoppingBag className="w-4 h-4 text-cyan-400" />
          Browse Marketplace Catalog
        </button>
      </div>
    </div>
  );
};
