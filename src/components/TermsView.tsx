import React from 'react';
import { FileCheck, Shield, Scale } from 'lucide-react';

export const TermsView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-left space-y-8 text-slate-800 dark:text-slate-200">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
          <Scale className="w-3.5 h-3.5" /> Legal Terms
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Terms of Service</h1>
        <p className="text-xs text-slate-500">Effective Date: January 1, 2026 • NEXOVIRA Marketplace Platform</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" /> 1. Marketplace Purchases & Fulfillment
          </h2>
          <p>
            By placing an order for home appliances, electronics, or smart energy hardware on NEXOVIRA, you agree to provide accurate delivery details. Orders are fulfilled via our Lagos Hub or authorized store partners with manufacturer warranty protection.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" /> 2. Multi-Currency Pricing
          </h2>
          <p>
            Prices are listed primarily in Nigerian Naira (₦) and converted for display in supported international currencies (USD, GBP, EUR, CAD, GHS, KES, ZAR, AED). Final settlement amounts are displayed clearly at checkout before payment authorization.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Digital Library & Academy Access</h2>
          <p>
            E-books and digital assets downloaded from NEXOVIRA Digital Library are protected for authorized personal use. Course certificates issued by NEXOVIRA Academy verify successful completion of training modules.
          </p>
        </section>
      </div>
    </div>
  );
};
