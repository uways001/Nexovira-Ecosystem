import React from 'react';
import { ShieldCheck, Lock, Eye, FileText } from 'lucide-react';

export const PrivacyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-left space-y-8 text-slate-800 dark:text-slate-200">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Data Security & Compliance
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">NEXOVIRA Privacy Policy</h1>
        <p className="text-xs text-slate-500">Effective Date: January 1, 2026 • Last Updated: August 2026</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" /> 1. Information We Collect
          </h2>
          <p>
            When you browse NEXOVIRA, register an account, purchase appliances, or request services, we collect necessary information including your full name, shipping address in Nigeria or abroad, phone number, email address, and order history.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" /> 2. Payment Security & Processing
          </h2>
          <p>
            NEXOVIRA never stores full credit/debit card numbers on our servers. All online transactions are processed through PCIDSS-compliant payment gateways such as Paystack and Flutterwave with 256-bit TLS encryption.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" /> 3. Grounded AI Interaction Logs
          </h2>
          <p>
            Search queries entered into NEXOVIRA AI are processed securely to match product specifications, course curricula, and service offerings. No sensitive personal credentials or banking information are shared with AI language models.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Contact & Data Protection Officer</h2>
          <p>
            For privacy inquiries or data removal requests, contact our privacy desk in Lagos at <span className="font-mono text-cyan-400">nexovirasupport@gmail.com</span> or phone <span className="font-mono text-cyan-400">+234 911 044 3054</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
