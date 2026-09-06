import React from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Zap, RefreshCw, Cpu, Award } from 'lucide-react';

interface HeroProps {
  onOpenAI: (query?: string) => void;
  onExploreMarketplace: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAI, onExploreMarketplace }) => {
  const samplePrompts = [
    'I need an air conditioner for a medium-sized room',
    'Find me a smart refrigerator under $1,500',
    'Which washing machine is best for a family of 6?',
    'Show me the best 4K OLED gaming TV',
    'Emergency solar generator for home power backup'
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white pt-8 pb-16 lg:pt-12 lg:pb-20 border-b border-slate-800">
      {/* Background Neon Grid & Ambient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold text-xs tracking-wide">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Grounded Commerce AI • Official Brand Warranty Guaranteed</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Shop Smarter.{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                Live Better.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-cyan-300 font-semibold text-sm sm:text-base italic">
              "Innovation begins with vision. Smart living, better every day."
            </p>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
              The modern marketplace for appliances, smart home equipment, electronics, and consumer tech — powered by intelligent, grounded natural-language discovery.
            </p>

            {/* Natural Language Prompt Interactive Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Ask NEXOVIRA AI Shopping Assistant:</span>
              </div>

              {/* Interactive Quick Prompt Chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOpenAI(prompt)}
                    className="text-left text-xs bg-slate-800/80 hover:bg-cyan-500/20 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 border border-slate-700/80 rounded-xl px-3 py-2 transition-all duration-200 flex items-center gap-1.5"
                  >
                    <span>"{prompt}"</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                  </button>
                ))}
              </div>

              {/* Main CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => onOpenAI()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Ask NEXOVIRA AI Assistant</span>
                </button>

                <button
                  onClick={onExploreMarketplace}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">100% Verified</div>
                <div className="text-xs text-slate-400">Direct Brand Stores</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-cyan-400">Zero Hallucination</div>
                <div className="text-xs text-slate-400">Real Prices & Stock</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">10-Yr Warranty</div>
                <div className="text-xs text-slate-400">On Major Inverters</div>
              </div>
            </div>
          </div>

          {/* Hero Right Media Preview Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-500/10">
              <div className="bg-slate-950 rounded-[22px] overflow-hidden p-4 space-y-4">
                {/* Visual Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-xs font-bold text-slate-200">Featured AI Recommendation</span>
                  </div>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded">
                    Match: 99.4%
                  </span>
                </div>

                {/* Hero Showcase Image */}
                <div className="relative aspect-16/10 rounded-xl overflow-hidden bg-slate-900">
                  <img
                    src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80"
                    alt="NEXOVIRA Pro-Cool AC"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="text-xs font-bold text-white">NEXOVIRA Pro-Cool 2.0 HP Inverter AC</div>
                    <div className="text-[11px] text-cyan-300 font-semibold">$680 (Save $170) • A+++ Energy Rating</div>
                  </div>
                </div>

                {/* AI Grounded Insight Box */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Why NEXOVIRA AI Selected This:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Ideal for 35m² medium-large rooms. Dual inverter compressor cuts power consumption by 70% in eco mode. Verified 10-year compressor warranty.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
