import React from 'react';
import { ShieldCheck, MapPin, Phone, MessageSquare, Award, Zap, Cpu, Sparkles } from 'lucide-react';
import { NexoviraLogo } from './NexoviraLogo';

interface AboutViewProps {
  onNavigate: (path: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 text-left space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto flex flex-col items-center">
        <NexoviraLogo size={56} showText={false} />

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> About NEXOVIRA Marketplace
        </span>
        
        {/* Tagline Motto Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 text-center space-y-1">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Official Brand Tagline</div>
          <p className="text-lg sm:text-2xl font-black bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent italic">
            "Innovation begins with vision. Smart living, better every day."
          </p>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Pioneering AI-Powered Appliance Commerce in Nigeria
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          NEXOVIRA is an integrated digital ecosystem connecting homeowners, businesses, and technology creators across Nigeria and globally to verified home appliances, solar energy systems, tech services, certified courses, and grounded AI search intelligence.
        </p>
      </div>

      {/* Core Ecosystem Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Smart Home Appliances</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Inverter split air conditioners, energy-efficient french door refrigerators, smart front-load washing machines, dual-fuel gas cookers, and solar power inverters verified for local power standards.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">NEXOVIRA Grounded AI</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Our search engine parses natural queries like "refrigerator under ₦500,000" or "1.5HP inverter AC for a master bedroom", cross-referencing real inventory, power specs, and price limits accurately.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Lagos Hub Operations</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Headquartered in Victoria Island, Lagos, we oversee nationwide fulfillment, verified seller onboarding, instant express shipping, and dedicated WhatsApp order desk assistance.
          </p>
        </div>
      </div>

      {/* Executive Leadership & Founders */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">Visionary Leadership</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Meet the Founders of NEXOVIRA
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Founded by Abdullah Oderinde & Musa Uways, NEXOVIRA was established to pioneer verified, AI-grounded smart appliance commerce and clean technology distribution across Nigeria and global digital markets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20">
                AO
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Abdullah Oderinde</h3>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Co-Founder & Chief Technology Officer</p>
                <p className="text-[11px] text-slate-500">Lagos, Nigeria</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spearheading NEXOVIRA’s enterprise architecture, secure banking integrations, real-time multi-tenant marketplace systems, and AI-grounded catalog search intelligence. Dedicated to engineering robust, resilient platforms that empower African consumers and merchants.
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Platform Engineering & Systems Security</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/20">
                MU
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Musa Uways</h3>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Co-Founder & Chief Executive Officer</p>
                <p className="text-[11px] text-slate-500">Lagos, Nigeria</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guiding corporate strategy, international merchant partnerships, supply chain fulfillment logistics, and customer trust initiatives. Focused on scaling smart living hardware, sustainable energy solutions, and high-impact digital products across the continent.
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Strategic Operations & Business Growth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Corporate Contact Info */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-8 rounded-3xl border border-slate-800 text-white space-y-6">
        <h2 className="text-xl font-bold text-cyan-400">Official Hub & Contact Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-200">Headquarters Address</div>
              <div className="text-slate-400 mt-1">14 Admiralty Way, Victoria Island, Lagos, Nigeria</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-200">Phone Hotline</div>
              <div className="text-slate-400 mt-1">+234 911 044 3054</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-200">WhatsApp Desk</div>
              <div className="text-emerald-400 mt-1 font-mono">+234 812 959 5134</div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-400">
          <span>Official Domain: <a href="https://nexovira.name.ng" className="text-cyan-400 hover:underline font-mono">nexovira.name.ng</a></span>
          <button
            onClick={() => onNavigate('/marketplace')}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-extrabold rounded-xl hover:bg-cyan-400 transition-colors"
          >
            Explore Marketplace Catalog
          </button>
        </div>
      </div>
    </div>
  );
};
